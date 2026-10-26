import{r as Nl,e as io,A as Oi,t as Ml,f as Bi,a as zl,p as Ll,b as Pl,u as Il,s as za,o as Tl,n as Rl,c as Zt,j as xe,L as Ol}from"./index-BS-Mu3z8.js";import{u as Al}from"./usePageRuntime-MkYbw7r5.js";import"./modulepreload-polyfill-B5Qt9EMX.js";var Fl=Nl();const ql=`\r
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
<input type="file" id="picker" style="display:none">`,Dl=`@scope (body[data-chouka-page="canvas"]) {\r
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
}`,Bl=`@scope (body[data-chouka-page="canvas"]) {\r
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
}`,Ul=["image","audio","video"],Pa=[{id:"480P",label:"480P",val:480},{id:"720P",label:"720P",val:720},{id:"1080P",label:"1080P",val:1080},{id:"1440P",label:"1440P",val:1440},{id:"2K",label:"2K",val:2048}],ao=[["1:1",1,1],["1:2",1,2],["2:1",2,1],["9:16",9,16],["16:9",16,9],["3:4",3,4],["4:3",4,3],["3:2",3,2],["2:3",2,3],["5:4",5,4],["4:5",4,5],["21:9",21,9],["9:21",9,21]];function Ui(b){return(b&&b.options||[]).map(k=>{const I=/^(\d+)x(\d+)\s+\(([^)]+)\)$/.exec(String(k));if(!I)return null;const R=parseInt(I[1],10),W=parseInt(I[2],10);return{value:k,width:R,height:W,ratio:I[3],short:Math.min(R,W)}}).filter(Boolean)}function Hl(b,k){return Ui(b).find(I=>I.value===k)||null}function Ia(b,k){const I=k.imageControls,R=b.params.image_ratio,W=b.params.image_clarity;return{ratio:ao.some(Y=>Y[0]===R)||I.mode==="i2i"&&R==="original"?R:I.defaultRatio,clarity:Pa.some(Y=>Y.id===W)?W:I.defaultClarity}}function Hi(b,k,I,R){if(I&&R&&I.id!==R.id&&(I.imageControls||R.imageControls)){const W=d=>[...new Set(d.inputs.filter(A=>!Ul.includes(A.type)&&A.type!=="textarea"&&A.type!=="seed").map(A=>A.key))],Y=b.params._imageModelParams||={};Y[I.id]=Object.fromEntries(W(I).filter(d=>b.params[d]!=null).map(d=>[d,b.params[d]]));const ne=b.params._imageRatios||={};I.imageControls&&(ne[I.imageControls.mode]=Ia(b,I).ratio);for(const d of new Set([...W(I),...W(R)]))delete b.params[d];Object.assign(b.params,Y[R.id]||{}),R.imageControls&&I.imageControls?.mode!==R.imageControls.mode&&(b.params.image_ratio=ne[R.imageControls.mode]||R.imageControls.defaultRatio)}b.cap=k}function Wl({document:b,getCapability:k,getCapabilityById:I,getRunCapability:R,getProject:W,isIF:Y,normalizeIFDuration:ne,api:d,save:A,onReferenceChange:H,ratioWH:K,multiple:Pe}){function Be(S,Z,L){const E=Ia(S,Z),V=b.createElement("div");V.className="cpick image-size-controls";const ve=b.createElement("div");ve.className="ctitle",ve.textContent="画面比例";const Se=b.createElement("div");Se.className="cgrid";const Ee=Z.imageControls.mode==="i2i"?[["original",1,1],...ao]:ao;for(const[le,re,_]of Ee){const C=b.createElement("button"),G=le==="original"?"原图":le;C.className=le===E.ratio?"on":"",C.innerHTML=`<i style="--ratio:${re/_}"></i><span>${G}</span>`,C.title=`画面比例 ${G}`,C.onclick=()=>{S.params.image_ratio=le,A(),L()},Se.appendChild(C)}const Ie=b.createElement("div");Ie.className="ctitle",Ie.textContent="清晰度";const ye=b.createElement("div");ye.className="cgrid k";for(const le of Pa){const re=b.createElement("button");re.className=le.id===E.clarity?"on":"",re.textContent=le.label,re.title=`目标短边 ${le.val}px，实际尺寸按模型要求对齐`,re.onclick=()=>{S.params.image_clarity=le.id,A(),L()},ye.appendChild(re)}const et=b.createElement("div");return et.className="image-size-hint",et.textContent=Z.imageControls.mode==="i2i"?"清晰度按短边计算；默认保持原图比例。指定比例时，模型可能裁切主图以适配画布。":"清晰度按短边计算；实际尺寸按模型要求对齐。高分辨率会增加显存占用。",V.append(ve,Se,Ie,ye,et),V}const it=S=>S?.kind==="gen"&&S.outputType==="video"&&(S.execution==="if_studio"||S.id.startsWith("minimax_h3_")&&S.inputs.some(Z=>Z.type==="video")),st=(S,Z)=>it(Z)?(Y(S)?k(S):Z).inputs.filter(L=>L.type==="video").map(L=>S.assets?.[L.key]).find(L=>L?.ref):null,Re=S=>S&&[S.width,S.height,S.duration].every(Z=>Number.isFinite(+Z)&&+Z>0),Oe=new WeakMap;async function Xe(S,Z=R(S)){const L=st(S,Z);if(!L||Re(L))return;if(Oe.has(L))return Oe.get(L).promise;const E=W(),V={};return Oe.set(L,V),V.promise=d("/api/media?ref="+encodeURIComponent(L.ref)+"&project="+encodeURIComponent(E.id)).then(ve=>{if(!Re(ve))throw new Error("无法读取参考视频的比例和时长，请重新导入视频");W()!==E||!E.cards.includes(S)||st(S,Z)!==L||(Object.assign(L,ve),A())}).catch(ve=>{throw V.error=ve.message,ve}),V.promise}function rt(S,Z=R(S)){const L=st(S,Z);if(!L)return delete S._referenceParameters,delete S.params._reference_video,Promise.resolve();const E=JSON.stringify([Z.id,L.ref]);if(S.params._reference_video===E)return Promise.resolve();const V=S._referenceParameters;if(V?.identity===E&&V.source===L)return V.promise;const ve=W(),Se=S.params,Ee={...Se},Ie={identity:E,source:L,before:Ee};S._referenceParameters=Ie;const ye=()=>{if(W()!==ve||!ve.cards.includes(S)||S.params!==Se||S._referenceParameters!==Ie||R(S)!==Z||st(S,Z)!==L||!Re(L))return;const et=G=>G.every(pe=>Se[pe]===Ee[pe]),le=Z.inputs.find(G=>G.key==="aspect_ratio"),re=+L.width/+L.height;if(le&&et(["aspect_ratio"]))Se.aspect_ratio=le.options.reduce((G,pe)=>Math.abs(K[pe][0]/K[pe][1]-re)<Math.abs(K[G][0]/K[G][1]-re)?pe:G);else if(!le&&et(["width","height","_ratio"])){const G=ao.reduce((q,D)=>Math.abs(D[1]/D[2]-re)<Math.abs(q[1]/q[2]-re)?D:q),pe=q=>Se[q]??Z.inputs.find(D=>D.key===q)?.default,T=Math.min(+pe("width"),+pe("height"));Se._ratio=G[0],Se.width=G[1]>=G[2]?Math.round(T*G[1]/G[2]/Pe)*Pe:T,Se.height=G[1]>=G[2]?T:Math.round(T*G[2]/G[1]/Pe)*Pe}const _=Z.inputs.some(G=>G.key==="preview_seconds"),C=_?"preview_seconds":"duration";et([C])&&(Se[C]=_?0:Math.max(1,Math.round(+L.duration)),Y(S)&&ne(S)),Se._reference_video=E,A()};return Ie.promise=Re(L)?Promise.resolve(ye()):Xe(S,Z).then(ye),Ie.promise}function dt(S){rt(S).catch(()=>{}).finally(()=>H(S))}function O(S,Z){const L=st(S,Z);if(!L||Re(L))return null;const E=b.createElement("div");if(E.className="knobnote",E.setAttribute("role","status"),E.textContent=Oe.get(L)?.error||"正在读取参考视频的比例和时长…",Oe.get(L)?.error){const V=b.createElement("button");V.type="button",V.textContent="重新读取",V.onclick=()=>{Oe.delete(L),delete S._referenceParameters,dt(S),H(S)},E.appendChild(V)}return E}return{imageClarityPicker:Be,supportsVideoReference:it,referenceVideo:st,videoMetadataReady:Re,ensureReferenceMetadata:Xe,syncReferenceParameters:rt,refreshVideoParameters:dt,videoReferenceStatus:O,switchImageCapability:(S,Z)=>Hi(S,Z,k(S),I(Z))}}const Jl={CLARITY_STEPS:Pa,RATIO_GRID:ao,resolutionPresets:Ui,resolutionPreset:Hl,imageSettings:Ia,switchImageCapability:Hi,applyInputPresets:Xl,create:Wl};function Xl(b,k){for(const I of(b.inputs||[]).filter(R=>R.presets)){const R=k[I.key]!=null?k[I.key]:I.default,W=I.presets[R];if(!W)throw new Error(`${I.label}无效：${R}`);k[I.key]=R,Object.assign(k,W)}}const so={"1:1 (Square)":[1,1],"2:3 (Portrait Photo)":[2,3],"3:2 (Photo)":[3,2],"3:4 (Portrait Standard)":[3,4],"4:3 (Standard)":[4,3],"9:16 (Portrait Widescreen)":[9,16],"16:9 (Widescreen)":[16,9],"21:9 (Ultrawide)":[21,9]},pr=[480,544,640,768],Wi={480:832,544:960,640:1152,768:1344},On=32,Fo=new Set(["megapixels","width","height","aspect_ratio","resolution","scale_to_length","output_1080p"]),Ji=[{id:"1080p",short:1080},{id:"2K",short:1440},{id:"4K",short:2160}],Ai=["3:4",3,4],gt=(b,k)=>b.inputs.find(I=>I.key===k);function Tr(b){return b===null||typeof b=="string"||typeof b=="number"||typeof b=="boolean"?b:void 0}const Ct=(b,k)=>k?Tr(b.params[k.key])??k.default:void 0,dr=b=>typeof b=="string"?b:"",Rn=b=>typeof b=="number"||typeof b=="string"?Number(b):NaN,Fi=b=>Number.parseFloat(String(Tr(b)));function Ta(b){return so[dr(b)]??[1,1]}function cr(b,k){const[I,R]=Ta(b),W=Math.sqrt(k*1024*1024/(I*R));return[Math.round(I*W/On)*On,Math.round(R*W/On)*On]}function Xi(b,k){const[I,R]=Ta(b),W=k/Math.min(I,R),Y=Math.round(W*W*I*R/(1024*1024)*100)/100;for(const ne of[0,1,-1,2,-2,3,-3]){const d=Math.round((Y+ne*.01)*100)/100;if(d>0&&Math.min(...cr(b,d))===k)return d}return Y}const qi=b=>Math.round(b*9/16/On)*On;function Yi(b){return b.id==="minimax_h3_ref_2pass_bf16"?gt(b,"output_1080p"):void 0}function Do(b,k){const[I,R]=Ta(b);return{width:Math.round(k*Math.max(1,I/R)/2)*2,height:Math.round(k*Math.max(1,R/I)/2)*2}}function Di(b,k){const I=Yi(k);return!I||Ct(b,I)!=="on"?null:Do(Ct(b,gt(k,"aspect_ratio")),1080)}function La(b,k){if(k.execution!=="if_studio"||k.outputType!=="video")return null;const I=Ji.find(R=>R.id===b.params.if_video_resolution);return I?{label:I.id,...Do(Ct(b,gt(k,"aspect_ratio")),I.short)}:null}function Yl(b){const{document:k,save:I,ratioGrid:R,claritySteps:W,resolutionPresets:Y,resolutionPreset:ne}=b,d=O=>{I(),O?.()},A=O=>O.outputType==="video"?pr.map(S=>({id:`${S}p`,label:`${S}p`,val:S})):W;function H(O){let S=null,Z=1/0;for(const[L,[E,V]]of Object.entries(so)){const ve=Math.abs(O[1]/O[2]-E/V);ve<Z-1e-9&&(Z=ve,S=L)}return S}function K(O){const S=so[dr(O)];return S?R.find(Z=>Z[1]===S[0]&&Z[2]===S[1]):void 0}function Pe(O,S){let Z="3:4",L=1/0;for(const E of R){const V=Math.abs(O/S-E[1]/E[2]);V<L&&(L=V,Z=E[0])}return Z}function Be(O,S){const Z=A(O),L=Z.find(Ee=>Ee.id===S.params._clarity);if(L)return L;const E=Rn(Ct(S,gt(O,"width"))),V=Rn(Ct(S,gt(O,"height")));if(!E||!V)return null;let ve=null,Se=1/0;for(const Ee of Z){const Ie=Math.abs(Ee.val-Math.min(E,V));Ie<Se&&(Se=Ie,ve=Ee)}return ve}function it(O){const S=k.createElement("div");return S.className="ctitle",S.textContent=O,S}function st(O=!1){const S=k.createElement("div");return S.className=O?"cgrid k":"cgrid",S}function Re(O,S,Z,L){const E=k.createElement("button");return E.type="button",E.textContent=O,E.className=S?"on":"",E.title=Z,E.setAttribute("aria-pressed",String(S)),E.onclick=L,E}function Oe(O,S,Z,L){const E=Re("",S,Z,L),V=k.createElement("i");V.style.setProperty("--ratio",String(O[1]/O[2]));const ve=k.createElement("span");return ve.textContent=O[0],E.append(V,ve),E}function Xe(O,S,Z){if(S.imageControls)return b.imageClarityPicker(O,S,Z);const L=gt(S,"aspect_ratio"),E=gt(S,"megapixels"),V=gt(S,"resolution"),ve=gt(S,"width")&&gt(S,"height"),Se=gt(S,"scale_to_length"),Ee=k.createElement("div");if(Ee.className="cpick",V){const re=Y(V),_=ne(V,Ct(O,V))??re[0];if(!_)return Ee;const C=st();for(const pe of new Set(re.map(T=>T.ratio))){const[T=1,q=1]=pe.split(":").map(Number);C.appendChild(Oe([pe,T,q],pe===_.ratio,`画面比例 ${pe}`,()=>{const l=re.filter(M=>M.ratio===pe).reduce((M,Te)=>Math.abs(Te.short-_.short)<Math.abs(M.short-_.short)?Te:M);O.params.resolution=l.value,d(Z)}))}const G=st(!0);for(const pe of re.filter(T=>T.ratio===_.ratio))G.appendChild(Re(`${pe.width}×${pe.height}`,pe.value===_.value,"",()=>{O.params.resolution=pe.value,d(Z)}));return Ee.append(it("画面比例"),C,it("分辨率"),G),Ee}if(Se&&!L){const re=k.createElement("input");re.type="number";const _=Se.min||512,C=Se.max||1344,G=Se.step||32;re.min=String(_),re.max=String(C),re.step=String(G),re.value=String(Ct(O,Se)??""),re.style.cssText="width:100%;padding:8px;font-size:14px;border:1px solid #3a3a44;border-radius:4px;background:#1a1a22;color:#fff";const pe=()=>{const D=Number.parseInt(re.value,10);Number.isNaN(D)||(O.params.scale_to_length=Math.max(_,Math.min(C,D)),d(Z))};re.oninput=pe;const T=st(!0);for(const D of pr){const l=Wi[D];if(l===void 0)continue;const M=Re(`${D}p`,Number(re.value)===l,`16:9 素材约 ${D}p；最长边 ${l}px，实际短边随素材比例变化`,()=>{re.value=String(l),pe()});M.disabled=l<_||l>C,T.appendChild(M)}const q=k.createElement("div");return q.style.cssText="font-size:12px;color:#8a8a94;margin-top:4px",q.textContent=`档位按 16:9 素材标注，实际短边随素材比例变化。最长边范围：${_} ~ ${C}，步进 ${G}`,Ee.append(it("分辨率（最长边）"),T,re,q),Ee}const Ie=!L&&ve,ye=()=>{const re=Rn(Tr(O.params.width)??ve?.default),_=Rn(Ct(O,gt(S,"height")));return re&&_?Pe(re,_):"3:4"};function et(re){const _=Be(S,O)??A(S)[1];if(!_)return;const[,C,G]=re,pe=S.outputType==="video"?On:16;O.params.width=C>=G?Math.round(_.val*C/G/pe)*pe:_.val,O.params.height=C>=G?_.val:Math.round(_.val*G/C/pe)*pe}if(L||Ie){const re=L?Ct(O,L):dr(O.params._ratio)||ye(),_=L?K(re):void 0,C=st();for(const G of R){const pe=!!Ie&&(G[0]===re||!O.params._ratio&&G[0]===R.find(l=>Math.abs(Rn(O.params.width)/Rn(O.params.height)-l[1]/l[2])<.02)?.[0]),T=L?G===_:pe,q=H(G),D=Oe(G,T,`画面比例 ${G[0]}`+(L&&q!==re?`（工作流档位：${q}）`:"（当前）"),()=>{L?O.params.aspect_ratio=q:(O.params._ratio=G[0],et(G)),d(Z)});L&&!T&&q===re&&(D.className="near"),C.appendChild(D)}Ee.append(it("画面比例"),C)}const le=E?Tr(O.params.aspect_ratio)??gt(S,"aspect_ratio")?.default??"16:9 (Widescreen)":null;if(E||ve){const re=E?pr.flatMap(q=>{const D=Xi(le,q);return D>(E.max??1.1)+.01?[]:[{id:`${q}p`,label:`${q}p`,val:D,p:q}]}):[...A(S)],_=st(!0),C=Be(S,O),G=Yi(S),pe=Di(O,S),T=La(O,S);for(const q of re){const D=E?Fi(Ct(O,E)):C?.val,l=!pe&&!T&&(E?Number.isFinite(D)&&Math.min(...cr(le,Number(D)))===q.p:D!=null&&Math.abs(D-q.val)<40),M=R.find($=>$[0]===(O.params._ratio||"3:4"))??Ai,Te=S.outputType==="video"?On:16,De=E?cr(le,q.val).join("×"):M[1]>=M[2]?`${Math.round(q.val*M[1]/M[2]/Te)*Te} × ${q.val}`:`${q.val} × ${Math.round(q.val*M[2]/M[1]/Te)*Te}`;_.appendChild(Re(q.label,l,De,()=>{if(G&&(O.params.output_1080p="off"),delete O.params.if_video_resolution,E)O.params.megapixels=q.val;else{O.params._clarity=q.id;let $=dr(O.params._ratio);if(!$){$=ye();const oe=Rn(Tr(O.params.width)??ve?.default),B=Rn(Ct(O,gt(S,"height")));oe&&B&&(O.params._ratio=$)}et(R.find(oe=>oe[0]===$)??Ai)}d(Z)}))}if(G){const q=Do(Ct(O,gt(S,"aspect_ratio")),1080);_.appendChild(Re("1080p",!!pe,`${q.width}×${q.height}`,()=>{O.params.output_1080p="on",d(Z)}))}if(S.execution==="if_studio"&&S.outputType==="video")for(const q of Ji){const D=Do(Ct(O,gt(S,"aspect_ratio")),q.short);_.appendChild(Re(q.id,T?.label===q.id,`${D.width}×${D.height}`,()=>{O.params.if_video_resolution=q.id,d(Z)}))}if(Ee.append(it("清晰度"),_),G?.hint){const q=k.createElement("div");q.className="knobnote",q.textContent=G.hint.replace("开启后","1080p 档位").replace("关闭保留原有行为。","其他清晰度档位保留原有行为。"),Ee.appendChild(q)}}return Ee}function rt(O,S){if(!S)return null;if(S.imageControls){const le=b.imageSettings(O,S);return`${le.ratio==="original"?"原图":le.ratio} · ${le.clarity}`}const Z=gt(S,"aspect_ratio"),L=gt(S,"megapixels"),E=gt(S,"resolution"),V=gt(S,"width"),ve=gt(S,"scale_to_length"),Se=S.inputs.find(le=>le.presets&&le.appearance!=="switch"),Ee=gt(S,"duration"),Ie=gt(S,"preview_seconds");if(!Z&&!L&&!E&&!V&&!ve&&!Se&&!Ee&&!Ie)return null;const ye=[];if(ve&&!Z)return`${Ct(O,ve)}px`;if(E){const le=ne(E,Ct(O,E));le&&ye.push(le.ratio,`${le.width}×${le.height}`)}else if(Z){const le=Ct(O,Z);ye.push(K(le)?.[0]??dr(le).split(" ")[0]??"")}else V&&O.params._ratio&&ye.push(dr(O.params._ratio));const et=Di(O,S);if(et)ye.push("1080p",`${et.width}×${et.height}`);else if(L){const le=Fi(Ct(O,L)),re=Tr(O.params.aspect_ratio)??Z?.default??"16:9 (Widescreen)",_=Number.isFinite(le)?Math.min(...cr(re,le)):null;ye.push(La(O,S)?.label??(_?`${_}p`:"?"))}else if(V){const le=Be(S,O);le&&ye.push(le.label)}if(Se){const le=Ct(O,Se),re=Se.options?.find(C=>(C&&typeof C=="object"?C.value:C)===le),_=re&&typeof re=="object"?re.label:dr(re);_&&ye.unshift(_.replace(/（.*$/,""))}if(Ee&&ye.push(`${Ct(O,Ee)}秒${Ie?"/段":""}`),Ie){const le=Ct(O,Ie);Rn(le)>0&&ye.push(`试前${le}秒`)}return ye.join(" · ")}function dt(O,S){const Z=O.cap!==S;Z&&delete O.params.output_1080p,b.switchImageCapability(O,S),Z&&delete O.params.output_1080p}return{clarityPicker:Xe,paramsBrief:rt,switchImageCapability:dt}}const qo=b=>b instanceof Oi?b:new Oi(io(b),b&&typeof b=="object"&&"status"in b&&typeof b.status=="number"?b.status:0,b);function Vl(b){const k=b.setTimeout||globalThis.setTimeout,I=b.clearTimeout||(L=>{L!==null&&globalThis.clearTimeout(L)});let R=null,W=null,Y=!1,ne=0,d=0,A=0,H=null,K=null;const Pe=new Set;let Be=Promise.resolve(),it=Promise.resolve();function st(L){Pe.add(L);const E=()=>{Pe.delete(L),b.flushPendingProjectSync()};return L.then(E,V=>{K=qo(V),E()}),L}function Re(){if(b.nodeEditor||!b.isAuthenticated()||!b.getProject())return;I(W);const L=b.getProject()?.id;L&&(W=k(()=>{W=null;const E=b.getView(),V={x:E.x,y:E.y,k:E.k};it=it.then(async()=>{if(b.isAuthenticated())try{await b.jput(`/api/projects/${encodeURIComponent(L)}/view`,V)}catch(ve){b.getProject()?.id===L&&b.showError("视图保存失败："+io(ve))}})},400))}function Oe(L=!0){L&&b.recordCanvasEdit();const E=b.getProject();if(!b.canSave()||!E||E.locked)return;I(R);const V=E.id;R=k(()=>{R=null,Xe(V)},700)}function Xe(L=b.getProject()?.id){d++;const E=Be.catch(()=>{}).then(()=>dt(L)).finally(()=>{d--,b.flushPendingProjectSync()});return Be=E,E}async function rt(L,E){const V=await b.api(`/api/projects/${encodeURIComponent(L)}`);if(b.getProject()?.id!==L||V.rev!==E.rev)return null;const ve=new Set(V.cards.map(ye=>ye.id)),Se=E.cards.filter(ye=>ye&&typeof ye=="object"&&!Array.isArray(ye)&&!ve.has(String(ye.id)));if(!Se.length)return null;let Ee=V;for(const ye of Se){const et=await b.jpost(`/api/projects/${encodeURIComponent(L)}/cards`,{card:ye,rev:Ee.rev}),le=b.getProject();if(le?.id!==L)throw new Error("恢复节点期间画布已切换");if(Ee=et.project,ye&&typeof ye=="object"&&!Array.isArray(ye)){const re=et.card||Ee.cards.find(C=>C.id===ye.id),_=le.cards.find(C=>C.id===ye.id);if(re&&_)for(const C of["created_by","created_by_name","created_at"])re[C]!==void 0&&(_[C]=re[C],ye[C]=re[C])}}E.rev=Ee.rev;const Ie=b.getProject();if(Ie?.id!==L)throw new Error("恢复节点期间画布已切换");return Ie.rev=Math.max(Ie.rev,E.rev),b.jput(`/api/projects/${encodeURIComponent(L)}`,E)}async function dt(L=b.getProject()?.id){const E=b.getProject();if(!b.canSave()||!E||E.id!==L)return{ok:!1,error:new Error("画布不可保存或已切换")};if(b.nodeEditor&&!b.editorCard())return{ok:!1,error:new Error("此节点已删除或不可访问")};if(b.nodeEditor&&H?.status===409)return{ok:!1,error:H};const V=E.id,ve={rev:E.rev||0,name:E.name,cards:E.cards.map(b.plain),edges:E.edges,groups:E.groups||[]};Y=!0;try{const Se=await b.jput(`/api/projects/${encodeURIComponent(V)}`,ve),Ee=b.getProject();return Ee?.id!==V?{ok:!1,error:new Error("保存期间画布已切换")}:(Ee.rev=Math.max(Ee.rev||0,Se.rev||0),H=null,{ok:!0})}catch(Se){let Ee=qo(Se);if(Ee.status===409&&b.getProject()?.id===V&&!b.nodeEditor&&!A)try{const Ie=await rt(V,ve);if(Ie){const ye=b.getProject();return ye?.id!==V?{ok:!1,error:new Error("保存期间画布已切换")}:(ye.rev=Math.max(ye.rev||0,Ie.rev||0),H=null,{ok:!0})}}catch(Ie){Ee=qo(Ie)}return b.getProject()?.id===V&&(H=Ee),Ee.status===409&&b.getProject()?.id===V&&!b.nodeEditor&&!A?(b.toast("画布在别处被改过，已重新加载"),await b.openProject(V)):b.showError("保存失败："+Ee.message),{ok:!1,error:Ee}}finally{Y=!1,b.flushPendingProjectSync()}}async function O(L=b.getProject()?.id,E=!1){A++;try{for(b.flushFocusedControl();;){const V=Be;if(await V,await Promise.all([...Pe]),b.getProject()?.id!==L)throw new Error("画布已关闭或切换");if(K)throw K;if(H&&[403,404,409].includes(H.status))throw H;if(V!==Be||Pe.size||ne)continue;if(!b.canSave()){if(E&&!H&&!d&&R===null)return;throw new Error("此画布只读或已锁定，不能保存")}if(b.nodeEditor&&!b.editorCard())throw new Error("此节点已删除，不能保存或重新创建");I(R),R=null;const ve=await Xe(L);if(!ve.ok)throw ve.error;if(K)throw K;if(!Pe.size&&!ne&&!d&&R===null)return}}catch(V){throw V===K&&(K=null),V}finally{A--,b.flushPendingProjectSync()}}function S(){I(R),R=null}function Z(L){ne++;const E=Be.catch(()=>{}).then(L).finally(()=>{ne--,b.flushPendingProjectSync()});return Be=E,E}return{saveView:Re,save:Oe,enqueueSave:Xe,flushLocalChanges:O,trackNodeWork:st,enqueueCardCreate:Z,cancelContentSave:S,cancelTimers(){S(),I(W),W=null},resetFailures(){H=null,K=null},markWorkFailure(L){K=qo(L)},beginFlush(){A++},endFlush(){A--,b.flushPendingProjectSync()},get pendingChain(){return Be},get busy(){return R!==null||Y||d>0||ne>0||Pe.size>0||A>0||!!(b.nodeEditor&&H)},get status(){return Object.freeze({contentSaving:Y,pendingCardCreates:ne,pendingContentSaves:d,localFlushes:A,pendingNodeWork:Pe.size,saveScheduled:R!==null,saveFailure:H,workFailure:K})}}}const Kl={create:Vl};function Vi(b){let k=b;const I=new Set;return{getSnapshot:()=>k,subscribe:R=>(I.add(R),()=>{I.delete(R)}),set:R=>{k=R,I.forEach(W=>W())}}}function Gl(b){const k=Vi([]);let I=null,R=0,W=0;function Y(H){k.set(H),b.onChange()}function ne(){W++,I=null}function d(){if(I)return I;const H=R,K=W,Pe=(async()=>{let Be;try{Be=await b.list()}catch{return}H!==R||K!==W||(Y(Be),!(H!==R||K!==W)&&await b.onJobsChanged(Be))})().finally(()=>{I===Pe&&(I=null)});return I=Pe,Pe}async function A(H){if(H=k.getSnapshot().find(st=>st.id===H.id)??H,!b.canTask(H))return;const K=R,Pe=await b.remove(H);if(K!==R)return;const Be=Ml.parse(Pe);ne();const it=k.getSnapshot().find(st=>st.id===H.id)??H;Be.ok===!0&&!Be.pending&&b.canTask(it)&&await b.onTaskDeleted?.(H),K===R&&d()}return{...k,setJobs:Y,pollJobs:d,deleteTask:A,reset(){R++,ne(),Y([])},retainProjects(H){R++,ne(),Y(k.getSnapshot().filter(K=>K.project&&H.includes(K.project)))},renameProject(H,K){Y(k.getSnapshot().map(Pe=>Pe.project===H?{...Pe,projectName:K}:Pe))}}}function Zl(b){return async function(I,{deleted:R=!1}={}){const W=b.getProject();if(!W||!b.canOperate())return;const Y=W.cards.filter(d=>d.job&&!b.isIF(d)&&(d.status==="queued"||d.status==="running"||d.status==="canceled")).map(d=>({card:d,job:d.job,status:d.status}));let ne=!1;for(const{card:d,job:A,status:H}of Y){if(b.getProject()!==W||!b.canOperate())return;if(!W.cards.includes(d)||d.job!==A||d.status!==H)continue;const K=I.find(Pe=>Pe.id===A);if(K&&!(!b.canTask(K)||K.project&&K.project!==W.id||K.card&&K.card!==d.id)){if(R){d.status="canceled",d.step="",d.job=null,b.paint(d),ne=!0,b.refreshPanel(d);continue}d.status=K.status,d.progress=K.progress,d.error=K.error,d.queue_remaining=K.queue_remaining,d.queue_ahead=K.queue_ahead,d.queue_order=K.queue_order,d.queue_wait_seconds=K.queue_wait_seconds,d.step=K.step||"",K.seed!=null&&(d.seed=K.seed),K.started&&K.ended&&(d.ms=Math.round((K.ended-K.started)*1e3)),K.outputs?.length&&(d.outputs=K.outputs),b.paint(d),H!==d.status&&(ne=!0,b.refreshPanel(d),d.status==="done"&&(b.pushHistory(d,K),b.refreshHistory(d),await b.propagateCardOutputs(d)),d.status==="error"&&b.showError(`「${b.titleOf(d)}」生成失败：${d.error||"未知错误"}`))}}ne&&b.getProject()===W&&b.canOperate()&&b.save(!1)}}function Ql({document:b,panel:k,button:I,getViewport:R,getUser:W,canTask:Y,api:ne,jpost:d,jobProjName:A,fmtEla:H,histTime:K,toast:Pe,showError:Be,confirm:it,onFocusTask:st,onJobsChanged:Re,onTaskDeleted:Oe=()=>{}}){const Xe=Gl({list:async()=>zl.parse(await ne("/api/jobs")).jobs,remove:_=>ne(`/api/job/${_.id}`,{method:"DELETE"}),canTask:Y,onChange(){Z(),k.style.display!=="none"&&Se()},onJobsChanged:Re,onTaskDeleted:Oe}),rt=Xe.pollJobs,dt={queued:"等待中",running:"运行中",done:"已完成",error:"失败",canceled:"已取消"},O=_=>_.status==="queued"||_.status==="running",S=_=>_.status==="running"?"run":_.status==="queued"?"wait":_.status==="done"?"done":_.status==="error"?"bad":"gone";function Z(){const _=Xe.getSnapshot().filter(O),C=_.find(q=>q.status==="running"),G=I,pe=`${_.length}|${C?Math.round((C.progress||0)*100):-1}`;if(G._sig===pe)return;G._sig=pe,G.classList.toggle("run",!!C),G.classList.toggle("wait",!C&&_.length>0),G.innerHTML=`任务<span class="n">(${_.length})</span>`;const T=C?`运行中 ${Math.round((C.progress||0)*100)}%`:_.length?"等待中":"";if(T){const q=b.createElement("span");q.className="s",q.textContent=T,G.appendChild(q)}G.title=_.length?`${_.length} 个任务没跑完，点开可以看详情、停止或删除`:"现在没有任务在跑，点开看历史"}function L(){k.style.display==="none"?(k.style.display="",I.classList.add("open"),Se(),V(),rt()):E()}function E(){k.style.display="none",k.innerHTML="",k._sig=null,I.classList.remove("open")}function V(){if(k.style.display==="none")return;const _=8,C=I.getBoundingClientRect();k.style.maxHeight=R().height-C.bottom-_*2+"px";const G=k.offsetWidth;k.style.top=C.bottom+_+"px",k.style.left=Math.max(_,Math.min(C.right-G,R().width-G-_))+"px"}const ve=()=>JSON.stringify(Xe.getSnapshot().map(_=>[_.id,_.status,!!_.error,A(_),_.cardName,_.name,_.submitter_display_name,_.submitter_username]));function Se(){const _=ve();if(k._sig===_){for(const M of k.querySelectorAll(".jrow")){const Te=Xe.getSnapshot().find(De=>De.id===M._id);Te&&Ie(M,Te)}return}k._sig=_;const C=k.querySelector(".jlist"),G=C?C.scrollTop:0;k.innerHTML="";const pe=b.createElement("div");pe.className="jhd";const T=b.createElement("b"),q=Xe.getSnapshot().filter(O).length;if(T.textContent=q?`任务 · ${q} 个没跑完`:"任务",pe.appendChild(T),Xe.getSnapshot().some(M=>!O(M))){const M=b.createElement("button");M.className="lnk",M.textContent="清空已结束",M.title="只清列表里的记录，已经出好的产物还在节点上",M.onclick=re,pe.appendChild(M)}const D=b.createElement("button");D.className="x",D.textContent="✕",D.title="关闭",D.onclick=E,pe.appendChild(D);const l=b.createElement("div");if(l.className="jlist",!Xe.getSnapshot().length){const M=b.createElement("div");M.className="jempty",M.textContent="还没有任务。在节点上点「生成」，任务就会出现在这里。",l.appendChild(M)}for(const M of Xe.getSnapshot())l.appendChild(Ee(M));k.append(pe,l),l.scrollTop=G}function Ee(_){const C=b.createElement("div");C.className="jrow "+S(_),C._id=_.id;const G=W()?.role==="admin"?_.submitter_display_name?.trim()||_.submitter_username||"未记录提交人":"";if(G){const $=b.createElement("div");$.className="jowner",$.textContent=G,C.append($)}const pe=b.createElement("div");pe.className="r1";const T=b.createElement("span");T.className="nm";const q=_.cardName||_.name,D=A(_);if(D){const $=b.createElement("i");$.className="pj",$.textContent=D+" - ",T.appendChild($)}const l=b.createElement("span");l.className="cn",l.textContent=q,T.appendChild(l),T.title=(G?`${G} - `:"")+(D?`${D} - `:"")+(q!==_.name?`${q}（${_.name}）`:_.name),C._st=b.createElement("span"),C._st.className="st",pe.append(T,C._st);const M=b.createElement("div");M.className="r2",C._sp=b.createElement("span"),C._sp.className="sp",C._tm=b.createElement("span"),M.append(C._sp,C._tm);const Te=b.createElement("div");if(Te.className="r3",C._node=b.createElement("span"),C._node.className="node",C._step=b.createElement("span"),C._step.className="step",Te.append(C._node,C._step),C.append(pe,M,Te),O(_)){const $=b.createElement("div");$.className="bar",C._bar=b.createElement("i"),$.appendChild(C._bar),C.appendChild($)}if(_.error){const $=b.createElement("div");$.className="msg",$.textContent=_.error,C.appendChild($)}const De=b.createElement("div");return De.className="acts",O(_)&&De.appendChild(ye("停止",()=>et(_))),De.appendChild(ye("删除",()=>le(_),!0)),_.project&&_.card&&De.appendChild(ye("看节点",()=>st(_))),C.appendChild(De),Ie(C,_),C}function Ie(_,C){const G=Math.round((C.progress||0)*100);_._st.textContent=C.status==="running"?`运行中 ${G}%`:C.status==="queued"?Bi(C):dt[C.status]||C.status,_._st.title=C.status==="queued"&&C.queue_order||"";const pe=`${C.name} · ${C.modelName||C.capability}`;_._sp.textContent!==pe&&(_._sp.textContent=_._sp.title=pe);const T=`执行节点：${C.nodeName||"等待分配"}`;_._node.textContent!==T&&(_._node.textContent=_._node.title=T);const q=C.step?`当前：${C.step}`:"";_._step.textContent!==q&&(_._step.textContent=_._step.title=q);const D=C.started?H(((C.ended||Date.now()/1e3)-C.started)*1e3):"";_._tm.textContent=K(C.created*1e3)+(D?` · ${D}`:""),_._bar&&(_._bar.style.width=G+"%")}function ye(_,C,G){const pe=b.createElement("button");return G&&(pe.className="danger"),pe.textContent=_,pe.onclick=C,pe}async function et(_){if(_=Xe.getSnapshot().find(C=>C.id===_.id)||_,!Y(_))return Pe("此任务关联的画布为只读，不能停止");try{await d(`/api/job/${_.id}/cancel`)}catch(C){return Be(C.message)}rt()}async function le(_){if(_=Xe.getSnapshot().find(C=>C.id===_.id)||_,!Y(_))return Pe("此任务关联的画布为只读，不能删除");if(!(O(_)&&!it("这个任务还没跑完，删除会先把它停掉。继续？")))try{await Xe.deleteTask(_)}catch(C){return Be(C.message)}}async function re(){try{await d("/api/jobs/clear")}catch(_){return Be(_.message)}rt()}return{pollJobs:rt,paintJobsBtn:Z,toggleJobs:L,closeJobs:E,placeJobs:V,renderJobs:Se,stopTask:et,delTask:le,clearDoneJobs:re,getJobs:Xe.getSnapshot,reset:Xe.reset,retainProjects:Xe.retainProjects,renameProject:Xe.renameProject}}const ed={create:Ql,createCanvasUpdater:Zl};function td(b,k,I,R,W,Y){const{window:ne,document:d,addEventListener:A,setTimeout:H,clearTimeout:K,setInterval:Pe,clearInterval:Be,requestAnimationFrame:it,cancelAnimationFrame:st,ResizeObserver:Re,MutationObserver:Oe,IntersectionObserver:Xe,URL:rt}=b,dt=W.mediaFetch,O=W.WebSocket,S=Kl,Z=ed,L=Jl;ne.ChoukaImageComposer=Y;const E=(e,t=d)=>t.querySelector(e),V=268,ve=180,Se=900,Ee=90,Ie=900,ye=.1,et=5,le=e=>e.w||V,re="http://www.w3.org/2000/svg",_=new URLSearchParams(location.search),C=_.get("editor")==="1",G=_.get("project"),pe=_.get("card");C&&d.body.classList.add("node-editor"),d.addEventListener("contextmenu",e=>e.preventDefault());let T=[],q={},D={},l=null,M=[],Te=[],De="personal",$={x:60,y:70,k:1},oe=null,B=new Set,St=null,ot=null,Sn=null,dn=null,$t=new Map,Qt=-1,Ft=null,An=null,_t=0,qt=null,Dt=!1;const m={side:E("#side"),plist:E("#plist"),dot:E("#dot"),spaceSelect:E("#space-select"),spaceLabel:E("#space-label"),spaceStatus:E("#space-status"),ptitle:E("#ptitle"),hint:E("#hint"),fit:E("#fit"),presenceUsers:E("#presence-users"),stage:E("#stage"),world:E("#world"),wires:E("#wires"),groups:E("#groups"),presenceLayer:E("#presence-layer"),lasso:E("#lasso"),selbar:E("#selbar"),dock:E("#dock"),empty:E("#empty"),panel:E("#panel"),hist:E("#hist"),menu:E("#menu"),tip:E("#tip"),toast:E("#toast"),picker:E("#picker"),jobsbtn:E("#jobsbtn"),jobs:E("#jobs"),view:E("#view"),vbox:E("#view .vbox"),respop:E("#respop"),minimapBtn:E("#minimap-btn"),wiresToggle:E("#wires-toggle"),zoomMenu:E("#zoom-menu"),minimap:E("#minimap"),minimapCanvas:E("#minimap-canvas"),minimapViewport:E("#minimap-viewport"),zoomPercent:E("#zoom-percent")},Ue=S.create({setTimeout:H,clearTimeout:K,getProject:()=>l,getView:()=>$,isAuthenticated:()=>k.active,canSave:()=>on(),nodeEditor:C,editorCard:()=>Br(),plain:e=>Ko(e),api:(...e)=>vt(...e),jpost:(...e)=>Vt(...e),jput:(...e)=>lt(...e),recordCanvasEdit:()=>xo(),flushPendingProjectSync:()=>ea(),openProject:e=>vr(e),toast:e=>ee(e),showError:e=>$e(e),flushFocusedControl:()=>{d.activeElement?.closest?.("#panel, #respop")&&d.activeElement.blur()}}),{saveView:en,save:X,enqueueSave:ur,flushLocalChanges:Yn,trackNodeWork:F}=Ue,Fe=Z.createCanvasUpdater({getProject:()=>l,canOperate:()=>he(),isIF:e=>Ve(e),canTask:e=>fr(e),paint:e=>Qe(e),refreshPanel:e=>{m.panel._id===e.id&&Ce(e.id)},pushHistory:(e,t)=>Mr(e,t),refreshHistory:e=>{m.hist._id===e.id&&zr(e.id)},propagateCardOutputs:e=>Ti(e),titleOf:e=>fe(e),showError:e=>$e(e),save:e=>X(e)}),at=Z.create({document:d,panel:m.jobs,button:m.jobsbtn,getViewport:()=>({width:innerWidth,height:innerHeight}),getUser:()=>k.user,canTask:e=>fr(e),api:(...e)=>vt(...e),jpost:(...e)=>Vt(...e),jobProjName:e=>$l(e),fmtEla:e=>sr(e),histTime:e=>_a(e),toast:e=>ee(e),showError:e=>$e(e),confirm:e=>confirm(e),onFocusTask:e=>Ri(e),onJobsChanged:e=>Fe(e),onTaskDeleted:e=>Fe([e],{deleted:!0})}),{pollJobs:pt,paintJobsBtn:pn,toggleJobs:Vn,closeJobs:$n,placeJobs:Pt,renderJobs:jn}=at,he=(e=l)=>k.active&&e?.permission==="operate",on=()=>he()&&!l.locked,fr=e=>k.active&&e?.permission==="operate",Le=()=>he()?!0:(ee("此画布只读，不能修改或运行"),!1),mr=()=>{if(!l?.id)throw new Error("请先打开可操作画布");return`/api/upload?project=${encodeURIComponent(l.id)}`},It=async(e,t=!1)=>{if(!Le())throw new Error("此画布只读");const n=l,o=new FormData;o.append("file",e,e.name);const r=mr()+(t?"&local_only=1":""),a=await vt(r,{method:"POST",body:o});if(l!==n||!he())throw new Error("画布已切换或权限已变化，上传已取消");const i=a.files?.[0]||a;if(!i?.url||!i?.ref)throw new Error("上传接口未返回素材");return i};async function vt(e,t={}){const n=(t.method||"GET").toUpperCase();if(!["GET","HEAD"].includes(n)){const o=new rt(e,location.href);if(/^\/api\/(upload|generate|text|rewrite)$/.test(o.pathname)&&!he())throw new Error("此画布只读");const r=o.pathname.match(/^\/api\/projects\/([^/]+)(?:\/(rename|copy))?$/);if(r){const a=M.find(i=>i.id===decodeURIComponent(r[1]))||(l?.id===decodeURIComponent(r[1])?l:null);if(!he(a)||a.locked&&r[2]!=="copy")throw new Error("此画布不可修改")}}return W.request(e,t)}function Fn(){Ue.cancelTimers(),wo(),l=null,oe=null,B.clear(),qt=null,Go(),rn(),Xn(),Xr(),Cn(),$n(),Pn(),m.groups.replaceChildren(),m.selbar.style.display="none",gs(),C&&Cr()}function cn(){if(d.body.classList.toggle("project-readonly",!!l&&!he()),he()||(Ue.cancelContentSave(),Cn(),Pn()),m.dock.style.display=he()?"":"none",l){m.ptitle.textContent=l.name;const e=d.createElement("span");e.className="ro",e.textContent=he()?l.locked?"试玩画布 · 刷新还原":"":"只读",m.ptitle.append(e)}}ne.addEventListener("h3auth:expired",()=>{Wn=null,at.reset(),M=[],Fn(),ho()});let yn=!1;ne.addEventListener("h3auth:denied",async({detail:e})=>{if(!(yn||!k.active||!/^\/api\/(projects|job|upload|generate|text|rewrite|media|thumbnail)/.test(e.path))){yn=!0,l&&e.path!=="/api/thumbnail"&&(l.permission="read",cn());try{await wr(),await pt()}finally{yn=!1}}});const Vt=(e,t)=>vt(e,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t||{})}),lt=(e,t)=>vt(e,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)}),$e=e=>I.error(e);let hr=null;function ee(e){m.toast.textContent=e,m.toast.style.display="block",K(hr),hr=H(()=>m.toast.style.display="none",Math.min(2600+Math.max(0,String(e).length-20)*70,9e3))}const Bt=()=>Math.random().toString(36).slice(2,10),un=e=>T.find(t=>t.id===e)||T[0],kt=["image","audio","video"],He={image:"图片",video:"视频",audio:"音频"},Nn=(e,t)=>e.id===t||!!(e.ladder&&Object.values(e.ladder).includes(t))||!!(e.route&&Object.values(e.route).some(n=>n.cap===t))||!!(e.modelSwitch&&Object.values(e.modelSwitch).includes(t)),jt=(e,t)=>e?t&&e.modelSwitch&&e.modelSwitch[t]?e.modelSwitch[t]:e.route?e.route[Object.keys(e.route)[0]].cap:e.id:null,Et=e=>{const t=T.find(n=>n.id===e.type);return t&&t.modes.some(n=>Nn(n,e.cap))?t:T.find(n=>n.modes.some(o=>Nn(o,e.cap)))||un(e.type)},ct=e=>{const t=Et(e);return t&&t.modes.find(n=>Nn(n,e.cap))},an=e=>Object.entries((ct(e)||{}).modelSwitch||{}).find(([,t])=>t===e.cap)?.[0],Kn={zimage:"Z-Image",krea2:"Krea2",qwen2511:"Qwen Image Edit 2511",qwen2512:"Qwen Image 2512（双阶段）",qwen21:"Qwen Image 2.1",da3:"Depth Anything 3",depthcrafter:"DepthCrafter"},Tt=W.localBridge.baseURL;let fn=[],mn=null,lo=!1,Gn="",Rr=!1,Mn=!1;const Ve=e=>ge(e)?.execution==="if_studio";async function sn(e,t={}){return W.localBridge.request(e,t)}function zn(e){switch(e.quota_status){case"limited":return`剩余 ${e.remaining} 次免费`;case"exhausted":return"剩余 0 次 · 免费次数已用完";case"unavailable":return"剩余 0 次 · 未开通";case"free":return"免费使用";case"paid":return"已开通 · 按预算使用";default:return e.quota_status?"次数未知":"次数未知 · 请更新桥接器"}}function Ln(e=!0){return mn||(lo=!0,mn=(async()=>{const t=await sn("/status");if(!t.ready)throw new Error("请先在本机登录 IF CLI");return Rr=t.reference_reuse===!0,Mn=t.request_recovery===!0,fn=(await sn("/models")).models,Gn="",fn})().catch(t=>{throw Gn=t.message,t}).finally(()=>{mn=null,e&&m.panel._id&&Ce(m.panel._id)}),mn)}function Or(e,t){const n="chouka:if-references:v1:"+JSON.stringify([k.user?.id,t,e.id]);if(e._ifReferences?.key===n)return e._ifReferences;let o;try{o=JSON.parse(sessionStorage.getItem(n))}catch{}const r={key:n,entries:Array.isArray(o?.entries)?o.entries.slice(0,40):[],pending:Array.isArray(o?.pending)?o.pending.slice(0,40):[],job:o?.job||null};return e._ifReferences=r,r}function Ut(e){try{sessionStorage.setItem(e.key,JSON.stringify({entries:e.entries,pending:e.pending,job:e.job}))}catch{}}function Zn(e){try{const n=new rt(e?.canvas_url);if(n.origin==="https://ifs.alibaba-inc.com"&&!n.username&&!n.password&&n.pathname==="/"&&/^#\/canvas\/c_[A-Za-z0-9_-]+$/.test(n.hash))return n.href}catch{}const t=e?.canvas_id;return typeof t=="string"&&/^c_[A-Za-z0-9_-]+$/.test(t)?`https://ifs.alibaba-inc.com/#/canvas/${t}`:""}function gr(e){if(!Ve(e)||e.status!=="error")return null;const t=Zn({canvas_url:e.if_canvas_url});if(!t)return null;const n=d.createElement("a");n.className="if-canvas-link",n.textContent="打开 IF 画布",n.href=t,n.target="_blank",n.rel="noopener noreferrer",n.title="在新标签页查看 IF 生成失败原因";for(const o of["pointerdown","mousedown","click","dblclick"])n.addEventListener(o,r=>r.stopPropagation());return n}function br(e){if(!Ve(e)||e.status!=="error"||!(e.job||e.if_request_id)||!he())return null;const t=d.createElement("button");t.type="button",t.className="if-recover-button",t.textContent=e._ifRestoring?"正在查询原产物…":"查询原产物",t.disabled=!!e._ifRestoring,t.title="由发起人在原电脑查询原任务，不会重新提交生成";for(const n of["pointerdown","mousedown","dblclick"])t.addEventListener(n,o=>o.stopPropagation());return t.onclick=n=>{n.stopPropagation(),xr(e)},t}async function xr(e){const t=l;if(!t||!t.cards.includes(e)||!he()||!Ve(e)||e.status!=="error"||!(e.job||e.if_request_id)||e._ifRestoring||e._ifPolling||!confirm(`请由任务发起人在原电脑操作。
只查询本机桥接器中的原任务并取回产物，不会重新生成。
若桥接器已重启，原记录可能无法恢复。继续查询？`))return;const n={cap:e.cap,job:e.job,request:e.if_request_id,started:e.if_started},o=()=>l===t&&t.cards.includes(e)&&he()&&e.status==="error"&&e.cap===n.cap&&e.job===n.job&&e.if_request_id===n.request&&e.if_started===n.started;e._ifRestoring=!0,m.panel._id===e.id&&Ce(e.id);try{const r=n.job||(await sn(`/requests/${encodeURIComponent(n.request)}`)).id;if(!o())return;if(!r)throw new Error("本机桥接器未返回原任务编号");const a=await sn(`/runs/${encodeURIComponent(r)}`);if(!o())return;if(a.state==="error")throw new Error("原任务在 IF 中仍为失败："+(a.error||"请打开 IF 画布查看原因"));if(!["starting","running","done"].includes(a.state))throw new Error("原任务状态无法识别，请在 IF 查看");const i={...e,job:r,status:"running",error:null,progress:null,if_started:Number.isFinite(e.if_started)?e.if_started:Date.now(),step:"正在查询原任务并恢复产物"};if(!Rt(i,t.id,"running"))throw new Error("无法保存恢复记录，请检查浏览器存储权限");Object.assign(e,{job:i.job,status:i.status,error:null,progress:null,if_started:i.if_started,step:i.step}),Qe(e),m.panel._id===e.id&&Ce(e.id),await hn(e,t.id),await oo(e,t.id,a)}catch(r){$e(r.status===404?"本机未找到原任务，请由发起人在原电脑查询；若桥接器已重启，请到 IF 下载原产物。未重新提交生成。":"查询原产物未完成："+r.message+"；未重新提交生成。")}finally{e._ifRestoring=!1,l===t&&t.cards.includes(e)&&m.panel._id===e.id&&Ce(e.id)}}function qn(e,t){return"chouka:if-task:v1:"+JSON.stringify([k.user?.id,t,e.id])}function wn(e,t){let n;try{n=JSON.parse(sessionStorage.getItem(qn(e,t)))}catch{}return!!(n&&n.cap===e.cap&&Number.isFinite(e.if_started)&&n.if_started===e.if_started&&(e.if_request_id?n.if_request_id===e.if_request_id:e.job&&n.job===e.job)&&(!e.job||!n.job||e.job===n.job))}function Rt(e,t,n){const o={phase:n,cap:e.cap,job:e.job,status:e.status,step:e.step,error:e.error,if_started:e.if_started,if_job_cap:e.if_job_cap,if_canvas_url:e.if_canvas_url,ms:e.ms,outputs:e.outputs||[],if_request_id:e.if_request_id,if_submitted_at:e.if_submitted_at,if_pending_prompts:e.if_pending_prompts,inputs:n==="preparing"?{params:e.params,assets:e.assets}:null,entry:e.job?e.history?.find(r=>r.job===e.job):null};try{return sessionStorage.setItem(qn(e,t),JSON.stringify(o)),!0}catch{return!1}}function Qn(e,t){if(!Ve(e))return!1;const n=qn(e,t);let o;try{o=JSON.parse(sessionStorage.getItem(n))}catch{}if(!o||o.cap!==e.cap||!Number.isFinite(o.if_started)||!["preparing","submitting","running","done","error"].includes(o.phase))return!1;const r=o.phase==="submitting"&&o.if_request_id&&o.if_request_id===e.if_request_id&&!o.job&&!e.job&&e.status==="error",a=o.phase==="done"&&o.status==="done"&&o.job&&o.job===e.job&&e.status==="error"&&o.outputs?.length;if((e.if_started||0)>o.if_started||e.if_started===o.if_started&&(e.job&&e.job!==o.job||e.if_request_id&&o.if_request_id&&e.if_request_id!==o.if_request_id||!r&&!a&&e.job===o.job&&["done","error"].includes(e.status))){try{sessionStorage.removeItem(n)}catch{}return!1}for(const i of["job","status","step","error","if_started","if_job_cap","if_canvas_url","ms","outputs","if_request_id","if_submitted_at","if_pending_prompts"])e[i]=o[i];if(e.progress=null,o.entry&&o.entry.job===e.job){e.history||=[];const i=e.history.findIndex(s=>s.job===e.job);i<0?e.history.unshift(o.entry):e.history[i]=o.entry}return o.phase==="preparing"&&o.if_request_id&&o.inputs?(e.params=o.inputs.params,e.assets=o.inputs.assets,e.status="queued",e.error=null,e.step="正在恢复 IF 素材准备",e._ifResumePreparing=!0):o.phase==="submitting"&&o.if_request_id?(e.status="running",e.error=null,e.step="正在向本机 IF 确认原请求"):(o.phase==="preparing"||o.phase==="submitting")&&(e.status="error",e.step="",e.error=o.phase==="preparing"?"上次素材准备因页面离开而中断，尚未提交 IF；请确认后重试":"上次 IF 提交结果尚未确认，请先在 IF 查看是否已创建任务，避免重复生成",Rt(e,t,"error")),!0}async function hn(e,t){const n=e.if_started,o=e.job,r=e.status,a=qn(e,t),i=await ur(t);if(i.ok&&["done","error"].includes(r))try{const s=JSON.parse(sessionStorage.getItem(a));s?.if_started===n&&s.job===o&&s.phase===r&&sessionStorage.removeItem(a)}catch{}return i}function Ar(e){try{const t=new rt(e);return t.protocol==="https:"&&t.hostname==="ant.alicdn.com"&&!t.port&&!t.username&&!t.password&&t.pathname.startsWith("/bio/img/")}catch{return!1}}function Kt(e,t,n){const o=Or(e,n);if(o.job===e.job){for(const r of t?.reference_urls||[]){const a=o.pending[r.index];!Number.isInteger(r.index)||!a||a.kind!==r.kind||!Ar(r.url)||(o.entries=o.entries.filter(i=>i.source!==a.source),o.entries.push({...a,url:r.url}))}for(const r of t?.invalid_reference_indices||[]){const a=o.pending[r];a&&(o.entries=o.entries.filter(i=>i.source!==a.source||i.version!==a.version))}Ut(o)}}async function po(e,t){const n=await dt(`/api/if-reference?${new URLSearchParams({url:e.pathname+e.search,type:t})}`,{method:"HEAD",credentials:"same-origin",cache:"no-store"});if(!n.ok)throw new Error(`无法检查引用素材（${n.status}），请确认素材仍存在且有访问权限`);const o=n.headers.get("ETag");if(!o||!/^"[a-f0-9]{64}"$/.test(o))throw new Error("抽卡服务尚不支持引用复用，请更新服务后重试");return o}const fe=e=>{const t=ge(e),n=ct(e);return ft(e)?e.name||"素材节点":e.name||(n&&(n.ladder||n.route)?n.name:t?t.name:n?n.name:e.cap)},ht=e=>!!e&&(Et(e)||{}).kind==="style",er="@style",Dn="@text",Ke=e=>String(e.slot||"").startsWith("@"),Ht=e=>!!e&&(Et(e)||{}).kind==="text",ut=e=>ht(e)||Ht(e),ft=e=>!!e&&(Et(e)||{}).kind==="asset",gn=e=>ft(e)&&(e.outputs||[])[0]||null,tn=e=>e?ht(e)?String((e.params||{}).style||"").trim():String((e.params||{}).text||"").trim():"",v=e=>((e||{}).params||{}).op||"",z=e=>(l?l.edges:[]).filter(t=>t.to===e.id&&t.slot===Dn).map(t=>tt(t.from)).filter(t=>t&&ut(t)).map(t=>({id:t.id,name:fe(t),text:tn(t)})),N=e=>(e&&e.inputs||[]).filter(t=>t.type==="textarea"&&t.key!=="negative_prompt"&&!t.template&&!t.advanced),ae=e=>(l?l.edges:[]).filter(t=>t.to===e.id&&t.slot===er).map(t=>l.cards.find(n=>n.id===t.from)).filter(t=>t&&ut(t)&&tn(t));function de(e,t=new Set){if(!e||t.has(e.id))return[];t.add(e.id);const n=[],o=new Set;for(const r of(l?l.edges:[]).filter(a=>a.to===e.id&&!Ke(a))){const a=l.cards.find(i=>i.id===r.from);if(!(!a||ut(a)))for(const i of ce(a,t))o.has(i.id)||(o.add(i.id),n.push(i))}return n}function ce(e,t=new Set){if(!e)return[];const n=ae(e);return n.length?n:de(e,t)}function Me(e){return(l?l.cards:[]).filter(t=>!ut(t)&&!ae(t).some(n=>n.id===e.id)&&ce(t).some(n=>n.id===e.id))}const nt=e=>ce(e).map(tn),Ot=()=>(l?l.cards:[]).filter(ut).forEach(e=>Qe(e)),nn="{提示词}",Fr=(e,t)=>{const n=e.opt&&e.opt[t];return n&&String(n).trim()?String(n):null},qr=(e,t)=>e.optUse&&e.optUse[t]?Fr(e,t):null,Dr=/^(?:For the target video, at [\d.]+ seconds|How the reference pictures align)[^\n]*\n/;function co(e,t){let n=String(e??"");for(const o of t){if(o.includes(nn)){n=o.split(nn).join(n);continue}if(!n.trim()){n=o;continue}const r=n.match(Dr);n=r?n.slice(0,r[0].length)+`
`+o+`

`+n.slice(r[0].length).replace(/^\s+/,""):o+`

`+n}return n}const yr=e=>Object.keys(e.assets||{}).filter(t=>t.startsWith("images[")&&e.assets[t]).length;function Wt(e){const t=ct(e);if(!t||!t.ladder)return e.cap;const n=Object.keys(t.ladder).map(Number).sort((r,a)=>r-a),o=Math.max(yr(e),n[0]);return t.ladder[String(n.filter(r=>r<=o).pop())]||e.cap}function Bo(e,t){const n=D[e];return n?.type===t?n:{type:t,api:{image:null,video:null,audio:null},bridge:{image:t==="video"?6:3,video:t==="video"?1:0,audio:0},reference_fallback:!0,note:"该模型引用规格尚未核实，使用画布兜底数量。"}}const ge=e=>{const t=q[e.cap];if(!t||t.execution!=="if_studio")return t||null;const n=fn.filter(s=>s.type===t.outputType),o=e.params?.if_model||n[0]?.display_name,r=Bo(o,t.outputType),a=r.bridge,i=t.inputs.filter(s=>s.key!=="if_reference"||a?.image||a?.video).map(s=>s.key==="if_reference"?{...s,label:`参考${a?.image?"图片":""}${a?.image&&a?.video?"／":""}${a?.video?"视频":""} HTTPS 地址（可选）`}:s.key==="duration"?{...s,min:r?.duration?.min??1,max:r?.duration?.max??null,type:r?.duration?.max!=null?"slider":"number",step:1,default:r?.duration?.default??s.default,showHint:!0,hint:r?.duration?.max!=null?`当前模型时长：${r.duration.min}–${r.duration.max} 秒（整数）。`:"当前模型时长范围未核实；请输入正整数秒，不套用其他模型上限。"}:s);for(let s=0;s<(a?.image||0);s++)i.push({key:`images[${s}]`,label:"参考图片",type:"image"});for(let s=0;s<(a?.video||0);s++)i.push({key:`video[${s}]`,label:"参考视频",type:"video"});for(const[s,c]of Object.entries(e.assets||{}))c&&(/^images\[\d+\]$/.test(s)&&c.kind==="image"||/^video\[\d+\]$/.test(s)&&c.kind==="video")&&!i.some(u=>u.key===s)&&i.push({key:s,label:c.kind==="image"?"已保留的参考图片":"已保留的参考视频",type:c.kind});return{...t,inputs:i,slotLimits:{image:{max:a?.image||0},video:{max:a?.video||0},audio:{max:0}}}};function Uo(e){const t=ge(e)?.inputs.find(o=>o.key==="duration");if(!t)return;const n=Number(e.params.duration??t.default);e.params.duration=Math.min(t.max??1/0,Math.max(t.min,Number.isFinite(n)?Math.round(n):t.default))}function Ho(e,t){const n=ct(e),o=n&&n.route&&n.route[t];return o&&o.cap!==e.cap?o:null}function Ki(e,t,n){const o=n&&n.kind?Ho(e,n.kind):null;o&&(Hn(l.edges.filter(i=>i.to===e.id)),e.cap=o.cap,e.assets={},t={key:o.slot},Gt(e),Ge(),Ot());const r=Et(e);let a=!1;return r&&r.id==="card_image"&&n&&n.kind==="image"&&(e.cap==="zimage_t2i"?(tr(e,"zimage_i2i"),e._model||(e._model="zimage"),a=!0):e.cap==="krea2_t2i"&&(tr(e,"krea2_i2i"),e._model||(e._model="krea2"),a=!0),a&&(Gt(e),Ge(),Ot(),H(()=>Ce(e.id),50))),!o&&ei(e.id,t.key)&&(Ge(),Ot()),e.assets[t.key]=n,Bn(e),Mt(e),t}const{CLARITY_STEPS:Wo,RATIO_GRID:Gi,resolutionPresets:Zi,resolutionPreset:Qi,imageSettings:Jo,applyInputPresets:es}=L,Ra=L.create({document:d,getCapability:e=>ge(e),getCapabilityById:e=>q[e],getRunCapability:e=>q[Wt(e)]||ge(e),getProject:()=>l,isIF:e=>Ve(e),normalizeIFDuration:e=>Uo(e),api:(...e)=>vt(...e),save:()=>X(),onReferenceChange:e=>Oa(e),ratioWH:so,multiple:On}),{imageClarityPicker:ts,referenceVideo:ns,syncReferenceParameters:Xo,refreshVideoParameters:Bn,videoReferenceStatus:rs}=Ra,{clarityPicker:os,paramsBrief:Yo,switchImageCapability:tr}=Yl({document:d,save:()=>X(),claritySteps:Wo,ratioGrid:Gi,imageClarityPicker:ts,imageSettings:Jo,resolutionPresets:Zi,resolutionPreset:Qi,switchImageCapability:(e,t)=>Ra.switchImageCapability(e,t)});function Oa(e){if(!l?.cards.includes(e)||m.panel._id!==e.id)return;const t=Ve(e)?ge(e):q[Wt(e)]||ge(e),n=m.panel.querySelector('button[title^="点开弹窗"]');n&&(n.textContent=`⚙ ${Yo(e,t)||"参数"}`),m.respop._card===e&&m.respop.style.display!=="none"&&(m.respop._cap!==t.id?Pn():m.respop._refill())}const as=e=>(e&&e.inputs||[]).filter(t=>!Fo.has(t.key)&&!kt.includes(t.type)&&t.type!=="textarea"&&(t.type==="seed"||!t.advanced)&&!t.mirror&&!t.rangeOf);function is(e,t){const n=Ve(e)?ge(e):q[Wt(e)]||ge(e),o=n&&(n.imageControls||n.inputs.some(u=>Fo.has(u.key))),r=n?.imageControls?["steps","seed"].map(u=>n.inputs.find(f=>f.key===u&&!f.mirror)).filter(Boolean).map(u=>({...u,label:u.key==="steps"?"采样步数":"种子"})):as(n);if(!o&&!r.length)return ee("这个模式没有可调参数");const a=()=>{if(m.panel._id!==e.id)return;const u=m.panel.querySelectorAll(".foot .tcap"),f=u[u.length-1];if(!f||!f.textContent.startsWith("⚙"))return;const p=Yo(e,n);f.textContent=p?`⚙ ${p}`:"⚙ 参数"};let i=!1;const s=()=>{const u=m.respop.contains(d.activeElement)?d.activeElement.id:null;m.respop.innerHTML="";const f=rs(e,n);if(f&&m.respop.appendChild(f),o&&m.respop.appendChild(os(e,n,s)),r.length){const g=d.createElement("div");g.className=n.imageControls?"pwrap image-basic":"pwrap",o&&(g.style.marginTop="12px");for(const h of r){const x=To(e,h);for(const w of x.querySelectorAll("input, select"))w.addEventListener("input",a),w.addEventListener("change",a);g.appendChild(x)}m.respop.appendChild(g)}if(n.imageControls){const g=n.inputs.filter(h=>!kt.includes(h.type)&&h.type!=="textarea"&&h.type!=="seed"&&h.key!=="steps"&&!Fo.has(h.key)&&!h.mirror&&!h.rangeOf&&!(n.imageControls.mode==="t2i"&&h.key==="encode_resolution")&&!(Ve(e)&&h.key==="if_reference"));if(g.length){const h=d.createElement("details");h.className="image-advanced",h.open=i;const x=d.createElement("summary");x.textContent="模型专属参数",h.appendChild(x),h.addEventListener("toggle",()=>{!h.isConnected||h.open===i||(i=h.open,c())});for(const w of g)h.appendChild(To(e,w));m.respop.appendChild(h)}}const p=d.createElement("button");p.className="x",p.textContent="✕",p.title="关闭 (Esc)",p.onclick=Pn,m.respop.appendChild(p),a(),u&&d.getElementById(u)?.focus({preventScroll:!0})};m.respop._card=e,m.respop._cap=n.id,m.respop._refill=()=>{s();const u=m.respop.getBoundingClientRect();(u.top<8||u.bottom>innerHeight-8)&&c()},s(),m.respop.style.display="",Bn(e);function c(){if(m.respop.style.display==="none"||!t.isConnected)return;const u=t.getBoundingClientRect(),f=u.top-64,p=innerHeight-u.bottom-16;m.respop.style.maxHeight=Math.max(160,Math.max(f,p))+"px";const g=m.respop.offsetWidth,h=m.respop.offsetHeight,x=Math.max(8,Math.min(u.left+u.width/2-g/2,innerWidth-g-8));let w=u.top-h-8;w<56&&(w=Math.max(8,Math.min(u.bottom+8,innerHeight-h-8))),m.respop.style.left=x+"px",m.respop.style.top=w+"px"}c()}const Pn=()=>{m.respop.style.display="none",m.respop._card=null,m.respop._refill=null},ss={image:"图片 (png)",video:"视频 (mp4，含音轨)",audio:"音频"},ls={4:"四宫格",6:"六宫格",9:"九宫格",12:"十二宫格",16:"十六宫格"};function Aa(e){const t=e&&e.grid;if(!t)return"";const n=t[0]*t[1];return ls[n]||`${n}格`}function ln(e,t=null){const n=Aa(e);if(kt.includes(e.type)){const r=t&&ge(t),i=(r?r.inputs.filter(f=>f.type===e.type&&(t.assets||{})[f.key]):[]).findIndex(f=>f.key===e.key),s=+(String(e.key).match(/\[(\d+)\]/)||[0,0])[1],c=i>=0?i+1:s+1,u=`${He[e.type]||e.type}${c}`;return n?`${u}（${n}）`:u}const o=String(e.label||"").trim();return n?`${o}（${n}）`:o}function ds(e){const t=p=>e.inputs.filter(g=>g.type===p),n=[...new Set(e.inputs.filter(p=>kt.includes(p.type)).map(p=>p.type))],o=t("textarea"),r=e.inputs.find(p=>p.key==="duration"),a=e.inputs.filter(p=>p.key==="width"||p.key==="height"),i=e.inputs.find(p=>p.key==="aspect_ratio"),s=e.inputs.find(p=>p.key==="megapixels"),c=e.inputs.find(p=>p.key==="scale_to_length"),u=[],f=[];for(const p of n){const g=t(p),h=g.filter(y=>y.required),x=g.filter(y=>!y.required),w=He[p]||p;h.length&&u.push(`${w} ×${h.length}：${h.map(y=>ln(y)).join(" / ")}`),x.length&&f.push(`可引用${w}（上限 ${Jn(e,p)}）`)}return n.length||u.push("不需要素材，纯提示词驱动"),o.length&&u.push(o.length>1?`提示词 ×${o.length}`:"提示词"),r&&f.push(r.max==null?"时长范围未核实（正整数秒）":`时长 ${r.min}–${r.max} 秒`),e.imageControls?(f.push(`清晰度 ${Wo.map(p=>p.label).join(" / ")}（短边）`),f.push(e.imageControls.mode==="i2i"?"默认原图比例，也可另选画面比例":"画面比例（13 档）")):(a.length&&f.push("画面宽高"),i&&f.push(`画面比例（${i.options.length} 档，默认 ${i.default}）`),s&&f.push(`分辨率 ${pr[0]}p–${pr[pr.length-1]}p（短边，768p 为 H3 原生）`),c&&f.push(`分辨率长边 ${c.min}–${c.max}，画面比例跟随原图`)),e.inputs.some(p=>p.type==="seed")&&f.push("种子"),{need:u,opt:f,out:ss[e.outputType]||e.outputType,file:e.file||e.id}}function ps(e,t){const n=ds(e),o=d.createElement("div"),r=d.createElement("b");if(r.textContent=t||e.name,o.appendChild(r),e.note){const s=d.createElement("div");s.className="note",s.textContent=e.note,o.appendChild(s)}const a=(s,c)=>{const u=d.createElement("div");u.className="io";const f=d.createElement("i");f.textContent=s;const p=d.createElement("span");p.textContent=c,u.append(f,p),o.appendChild(u)};a("输入",n.need.join("　·　")),n.opt.length&&a("可调",n.opt.join("　·　")),a("产出",n.out);const i=d.createElement("div");return i.className="fn",i.textContent=n.file,o.appendChild(i),o}function uo(e,t,n){const o=d.createElement("div"),r=d.createElement("b");r.textContent=e;const a=d.createElement("div");a.className="note",a.textContent=t,o.append(r,a);for(const[i,s]of n){const c=d.createElement("div");c.className="io";const u=d.createElement("i");u.textContent=i;const f=d.createElement("span");f.textContent=s,c.append(u,f),o.appendChild(c)}return o}function fo(e,t,n){if(!t)return null;const o=Nn(t,e.cap),r=o?t.ladder?Wt(e):e.cap:jt(t),a=q[r]||q[jt(t)];if(!a)return uo(n||t.name,"这个模式当前不可用。",[]);const i=ps(a,n||t.name);let s="";if(t.route?s=(t.entry&&t.entry.hint?t.entry.hint:"根据放入的素材类型自动选择工作流。")+(o?`当前会运行「${a.name}」。`:""):t.ladder&&(s="按图片数量自动选择："+Object.keys(t.ladder).map(Number).sort((c,u)=>c-u).map(c=>`${c} 张 → ${(q[t.ladder[c]]||{}).name||t.ladder[c]}`).join("；")+(o?`。当前 ${yr(e)} 张，会运行「${a.name}」。`:"。")),s){const c=d.createElement("div");c.className="note",c.textContent=s,i.insertBefore(c,i.children[1]||null)}return i}function cs(e){const t=Et(e);return ht(e)?uo(fe(e),`这个节点保存一段可复用的风格描述，不会单独生成产物。连接到生成节点后会并入提示词，并沿产物连线向下游继承；下游节点自己挂风格时会从那里开始覆盖继承。使用 ${nn} 可以指定原提示词插入位置。这里只写画风、色调、光线和镜头质感，具体画面内容留在生成节点。`,[["输入","风格、色调、光线和镜头质感"],["产出","可复用的风格文字"]]):Ht(e)?uo(fe(e),"这个节点保存和加工文字。可以连接到生成节点并入提示词，也可以连接到其他文本节点作为加工输入；加工结果会写回节点。",[["输入","节点文字或上游文本"],["产出","可继续连接的文字"]]):ft(e)?uo(fe(e),"这个节点保存一份上传素材，不会单独运行。它可以同时连接到多个节点，让同一份图片、视频或音频重复使用；原文件不会被处理。",[["输入","图片、视频或音频"],["产出","可复用的原始素材"]]):fo(e,ct(e),fe(e)||t&&t.name)}function us(e,t){m.tip.innerHTML="",m.tip.appendChild(e),m.tip.style.display="",m.tip.style.left=m.tip.style.top="0px";const n=8,o=52,r=m.stage.getBoundingClientRect(),a=r.left+n,i=r.right-n,s=m.tip.offsetWidth,c=m.tip.offsetHeight;let f=(g=>Math.max(a,Math.min(g,i-s)))(t.left),p=t.bottom+n;p+c>innerHeight-n&&(t.top-n-c>=o?p=t.top-n-c:(p=Math.max(o,innerHeight-n-c),i-(t.right+n)>=s?f=t.right+n:t.left-n-a>=s&&(f=t.left-n-s))),m.tip.style.left=f+"px",m.tip.style.top=p+"px"}const Jt=()=>m.tip.style.display="none";function mo(e,t){let n=null;e.addEventListener("mouseenter",()=>{K(n),n=H(()=>{const o=t();o&&e.matches(":hover")&&us(o,e.getBoundingClientRect())},280)}),e.addEventListener("mouseleave",()=>{K(n),Jt()}),e.addEventListener("mousedown",()=>{K(n),Jt()})}function fs(){if(!k.user?.id)return null;try{const e=localStorage.getItem(`chouka:last-project:${k.user.id}`);return M.find(t=>t.id===e)||null}catch{return null}}function ms(e){if(!(C||!k.active||!k.user?.id))try{localStorage.setItem(`chouka:last-project:${k.user.id}`,e)}catch{}}const Fa=(async function(){try{await k.requireUser(),k.mountAccount(d.getElementById("account"));const r=await vt("/api/cards",{cache:"no-store"});T=r.cards,q=r.capabilities,D=r.if_model_limits||{},m.dot.classList.toggle("on",!!r.comfy_online)}catch(r){if($e("后端未就绪："+r.message),!k.active)return}if(b.disposed||(await wr(),b.disposed))return;Ts();const t=new URLSearchParams(location.search),n=t.get("project"),o=t.get("card");if(n)await vr(n),C?Cr():o&&l?.id===n&&await Ri({project:n,card:o});else if(C)Cr();else{const r=fs();if(r&&await vr(r.id),!l){const a=M.find(i=>i.locked);a&&await vr(a.id)}}await qa(),k.every(qa,5e3),k.every(wr,5e3),pt(),k.every(pt,700)})();async function qa(){try{const e=await vt("/api/health");m.dot.classList.toggle("on",!!e.comfy_online),e.mode==="controller"&&k.user?.role==="admin"?(m.dot.href=W.adminURL("/controller"),m.dot.title="打开运行面板",m.dot.setAttribute("aria-label","打开运行面板")):(m.dot.removeAttribute("href"),m.dot.title="ComfyUI 连接状态",m.dot.setAttribute("aria-label","ComfyUI 连接状态"))}catch{m.dot.classList.remove("on")}}function Da(e){return W.projectSpaces(e,k.user?.id,Te)}function ho(){R.update({projects:M,teams:Te,selectedSpace:De,selectedId:l?.id||null,user:k.user})}async function wr(){if(!(!k.active||b.disposed)){try{const e=await W.projects.list();if(b.disposed)return;M=e.projects,Te=e.teams}catch{return}if(l){const e=M.find(t=>t.id===l.id);if(!e)Fn(),at.retainProjects(M.map(t=>t.id));else{const t=l.permission!==e.permission;Object.assign(l,{permission:e.permission,owner_id:e.owner_id,owner_display_name:e.owner_display_name,team_id:e.team_id,team_name:e.team_name,share_count:e.share_count,shared_team_ids:e.shared_team_ids,shared_personally:e.shared_personally,name:e.name,locked:e.locked}),t&&(rn(),Xn(),nr())}}cn(),ho()}}const hs=()=>R.create();let Vo=0;async function vr(e){if(l&&l.id!==e&&on()&&Ue.busy)try{await Yn(l.id)}catch(r){$e("切换前保存失败，已保留当前画布："+r.message);return}Ue.cancelTimers(),wo();const t=++Vo;try{const r=await W.projects.get(e);if(t!==Vo||!k.active)return;l=r}catch(r){return $e(r.message)}const n=Da(l);n.includes(De)||(De=n[0]||"personal"),ho(),qt=null,Ue.resetFailures(),Dt=!1,l.cards=l.cards||[],l.edges=l.edges||[],l.groups=l.groups||[];const o=[];for(const r of l.cards){const a=ct(r);if(a&&!a.route&&a.id!==r.cap&&!(a.modelSwitch&&Object.values(a.modelSwitch).includes(r.cap))&&(r.cap=a.id),a&&a.modelSwitch){const i=Object.entries(a.modelSwitch).find(([,s])=>s===r.cap);i&&(r._model=i[0])}Qn(r,l.id)&&o.push(r),!Ve(r)&&!ut(r)&&!ft(r)&&r.status==="queued"&&!r.job&&!r._ifResumePreparing&&(r.status="error",r.error="上次提交未取得任务编号，请先检查任务列表，确认后再重试"),Mo(r)}for(const r of l.cards)Ht(r)&&(r.cap!=="text"&&(r.cap="text"),!String((r.params||{}).text||"").trim()&&String(r.out||"").trim()&&(r.params=r.params||{},r.params.text=r.out));if(Go(),$=Object.assign({x:60,y:70,k:1},l.view||{}),oe=null,B.clear(),rn(),m.empty.style.display="none",m.dock.style.display="",m.fit.style.display="",m.ptitle.textContent=l.name,d.getElementById("directorbtn").href=`/director?project=${encodeURIComponent(l.id)}`,l.locked){const r=d.createElement("span");r.className="ro",r.textContent="试玩画布 · 刷新还原",r.title="这张画布是示例：参数怎么改、节点怎么拖、重跑几遍都随便，改动只在这一次里有效，刷新就回到原样。想留下自己的东西就「＋ 新建项目」",m.ptitle.appendChild(r)}nr();for(const r of l.cards)Pi(r,l.id);if(o.length&&on()&&!l.locked)for(const r of o)hn(r,l.id);ms(l.id),Ya(l.id),wr()}function gs(){ka(),m.empty.style.display="",m.world.innerHTML="",m.wires.innerHTML="",rr?.disconnect(),vo.clear(),m.wires.classList.remove("has-flow"),m.ptitle.textContent="",m.dock.style.display="none",m.fit.style.display="none",m.hint.textContent=""}const Ko=W.plainCard,Ba=["type","cap","name","x","y","w","h","params","assets","opt"];let Un=[],go=[],kr=null,bo=null;function Go(){Un=[],go=[],kr=null,bo=null}function Ua(){return{cards:l.cards.map(e=>JSON.parse(JSON.stringify(Ko(e)))),edges:JSON.parse(JSON.stringify(l.edges)),groups:JSON.parse(JSON.stringify(l.groups||[]))}}function Ha(e){return JSON.stringify({cards:e.cards.map(t=>{const n=Object.fromEntries(Ba.filter(o=>t[o]!==void 0).map(o=>[o,t[o]]));return n.id=t.id,t.type==="card_asset"&&(n.outputs=t.outputs),n}),edges:e.edges,groups:e.groups})}function Zo(e="action"){!l||!he()||C||kr||(kr=Ua(),bo=e)}function xo(){if(!kr||!l)return;const e=Ua(),t=kr,n=bo;if(kr=null,bo=null,Ha(t)===Ha(e))return;const o=Un[Un.length-1];n==="typing"&&o?.kind==="typing"&&Date.now()-o.at<1e3?o.after=e:(Un.push({before:t,after:e,kind:n,at:Date.now()}),Un.length>80&&Un.shift()),go=[]}function bs(e){const t=new Map(l.cards.map(n=>[n.id,n]));l.cards=e.cards.map(n=>{const o=t.get(n.id);if(!o)return JSON.parse(JSON.stringify(n));const r=o;for(const a of Ba)a in n?r[a]=JSON.parse(JSON.stringify(n[a])):delete r[a];return n.type==="card_asset"&&(r.outputs=JSON.parse(JSON.stringify(n.outputs||[]))),r}),l.edges=JSON.parse(JSON.stringify(e.edges)),l.groups=JSON.parse(JSON.stringify(e.groups)),Xt=null,B=new Set([...B].filter(n=>l.cards.some(o=>o.id===n))),oe&&!l.cards.some(n=>n.id===oe)&&(oe=null,rn()),nr(),oe&&Ce(oe),X()}function xs(e=!1){if(!l||!he()||C)return;xo();const t=e?go:Un,n=e?Un:go,o=t.pop();o&&(n.push(o),bs(e?o.after:o.before))}for(const e of["pointerdown","keydown","beforeinput","paste","drop","change"])d.addEventListener(e,t=>{t.target.closest?.("[data-image-composer]")||!l||C||!he()||t.type==="keydown"&&(t.ctrlKey||t.metaKey)&&/^(z|y)$/i.test(t.key)||Zo(t.type==="beforeinput"?"typing":"action")},!0);function Br(){return!Dt&&l?.id===G?l.cards.find(e=>e.id===pe):null}function Cr(){if(!C)return;const e=Br();B.clear(),e?(oe=e.id,B.add(e.id),e._el?.classList.add("sel"),Ce(e.id)):(oe=null,m.panel.replaceChildren(Lo("此节点已删除或不可访问；不会重新创建。请返回导演台刷新项目。")),m.panel._id=null,m.panel.style.display="",bt())}C&&(ne.ChoukaNodeEditor={async flush(){if(await Fa,!Br())throw new Error("此节点已删除或不可访问");await Yn(G)},payload(){const e=Br();if(!e)throw new Error("此节点已删除或不可访问");return Na(e)}});const Wa=["#00e5ff","#ff5da2","#9b7bff","#55e68a","#ffb84d","#58a6ff","#f778ba","#d2e75b"];function Ja(e){let t=0;for(const n of String(e||""))t=t*31+n.codePointAt(0)>>>0;return Wa[t%Wa.length]}function ys(){if(!m.presenceUsers)return;const e=new Map;for(const n of $t.values())e.has(n.user_id)||e.set(n.user_id,n);if(m.presenceUsers.replaceChildren(),m.presenceUsers.classList.toggle("on",e.size>0),!e.size)return;const t=d.createElement("span");t.className="presence-count",t.textContent=`${e.size} 人使用中`,m.presenceUsers.appendChild(t);for(const n of e.values()){const o=d.createElement("span");o.className="presence-avatar";const r=Ja(n.user_id);o.style.background=r,o.style.boxShadow=`0 0 0 1px ${r}`,o.textContent=String(n.name||"协").trim().slice(0,1).toUpperCase(),o.title=`${n.name||"协作者"} · 正在此画布`,m.presenceUsers.appendChild(o)}}function ws(e){if(!m.presenceLayer||e.connection_id===Sn)return null;let t=e._el;if(t?.isConnected)return t;t=d.createElement("div"),t.className="collab-cursor";const n=Ja(e.user_id);t.style.color=n;const o=d.createElement("div");o.className="pointer";const r=d.createElement("div");r.className="label",r.style.backgroundColor=n;const a=d.createElement("span");return a.textContent=e.name||"协作者",r.appendChild(a),t.append(o,r),m.presenceLayer.appendChild(t),e._el=t,t}function Xa(e){if(e.connection_id===Sn){e._el?.remove(),e._el=null;return}const t=ws(e);t&&(t.classList.toggle("hidden",!e.visible),e.visible&&Number.isFinite(e.x)&&Number.isFinite(e.y)&&(t.style.transform=`translate(${e.x}px,${e.y}px) scale(${1/$.k})`))}function Qo(){for(const e of $t.values())Xa(e)}function vs(e,t,n){if(Number.isFinite(n)&&n<Qt)return;Number.isFinite(n)&&(Qt=n),Sn=t||Sn;const o=new Map;for(const r of e||[]){const a=$t.get(r.connection_id);o.set(r.connection_id,Object.assign(a||{},r))}for(const[r,a]of $t)o.has(r)||a._el?.remove();$t=o,ys(),Qo()}function ks(e,t){!l||l.id!==e||t<=(l.rev||0)||vt(`/api/projects/${encodeURIComponent(e)}`).then(n=>yo(n)).catch(()=>{})}function yo(e){if(!l||e.id!==l.id||(e.rev||0)<=(l.rev||0))return;if(C&&!(e.cards||[]).some(r=>r.id===pe)&&(Dt=!0,Ue.cancelContentSave(),Cr()),Ue.busy||_t){(!qt||(e.rev||0)>(qt.rev||0))&&(qt=e);return}const t=m.panel.style.display!=="none",n=[],o=new Map(l.cards.filter(r=>Ve(r)&&wn(r,l.id)&&["queued","running"].includes(r.status)&&Number.isFinite(r.if_started)).map(r=>[r.id,r]));l.name=e.name,l.cards=(e.cards||[]).map(r=>{const a=o.get(r.id),i=a&&r.if_started===a.if_started&&r.job===a.job;if(a&&r.cap===a.cap&&(r.if_started||0)<=a.if_started&&!(r.if_started===a.if_started&&r.job&&a.job&&r.job!==a.job)&&!(r.if_started===a.if_started&&r.if_request_id&&a.if_request_id&&r.if_request_id!==a.if_request_id)&&!(i&&["done","error"].includes(r.status))){const s=Object.fromEntries(["params","assets","job","status","step","error","progress","if_started","if_job_cap","if_canvas_url","if_request_id","if_submitted_at","if_pending_prompts","ms","outputs","history","_ifPolling","_ifRecovering","_ifResumePreparing"].map(c=>[c,a[c]]));return Object.assign(a,r,s)}return Qn(r,e.id)&&n.push(r),r}),l.edges=e.edges||[],l.groups=e.groups||[],l.rev=e.rev,l.updated=e.updated,l.director=e.director,Go();for(const r of l.cards)Mo(r);oe&&!l.cards.some(r=>r.id===oe)&&(oe=null),B=new Set([...B].filter(r=>l.cards.some(a=>a.id===r))),m.ptitle.textContent=l.name,nr();for(const r of l.cards)o.get(r.id)!==r&&Pi(r,l.id);if(n.length&&on()&&!l.locked)for(const r of n)hn(r,l.id);C||(t&&oe?Ce(oe):oe||rn())}function ea(){if(!qt||Ue.busy||_t)return;const e=qt;qt=null,yo(e)}function wo(){if(K(dn),dn=null,K(An),An=null,Ft=null,ot=null,Sn=null,Qt=-1,St){const e=St;St=null;try{e.close(1e3,"leave canvas")}catch{}}for(const e of $t.values())e._el?.remove();$t.clear(),m.presenceLayer?.replaceChildren(),m.presenceUsers?.replaceChildren(),m.presenceUsers?.classList.remove("on")}function Ya(e){wo(),ot=e;const t=W.presence(e);St=t,t.onopen=()=>ks(e,1/0),t.onmessage=n=>{if(t!==St||ot!==e)return;let o;try{o=W.parsePresence(n.data)}catch{return}if(o.type==="presence")vs(o.members,o.self,o.version);else if(o.type==="cursor"){const r=$t.get(o.connection_id);if(!r)return;Object.assign(r,o),Xa(r)}else o.type==="card-added"?pa(o.card,o.rev):o.type==="project-changed"?yo(o.project):o.type==="project-deleted"&&(ee("这张画布已被删除"),Fn(),wr())},t.onclose=()=>{t===St&&(St=null,ot===e&&l?.id===e&&k.active&&(dn=H(()=>Ya(e),1500)))}}function Va(e,t,n=!0){Ft={type:"cursor",x:e,y:t,visible:n},An===null&&(An=H(()=>{An=null,St?.readyState===O.OPEN&&Ft&&St.send(W.serializeCursor(Ft)),Ft=null},50))}function In(){m.world.style.transform=`translate(${$.x}px,${$.y}px) scale(${$.k})`,m.wires.style.transform=m.world.style.transform,m.groups.style.transform=m.world.style.transform,m.presenceLayer&&(m.presenceLayer.style.transform=m.world.style.transform),typeof Qo=="function"&&Qo(),m.wires.setAttribute("width",1),m.wires.setAttribute("height",1),kn(),Ur(),Cs(),va()}function Cs(){m.zoomPercent&&(m.zoomPercent.textContent=Math.round($.k*100)+"%")}function vn(e,t){const n=m.stage.getBoundingClientRect();return{x:(e-n.left-$.x)/$.k,y:(t-n.top-$.y)/$.k}}let _r=!1;function Ur(){if(!_r||!l||!l.cards.length)return;const e=m.minimapCanvas,t=e.getContext("2d"),n=200,o=150;e.width=n,e.height=o;let r=1/0,a=1/0,i=-1/0,s=-1/0;for(const j of l.cards){const J=le(j),We=j._el?j._el.offsetHeight:200;r=Math.min(r,j.x),a=Math.min(a,j.y),i=Math.max(i,j.x+J),s=Math.max(s,j.y+We)}const c=50;r-=c,a-=c,i+=c,s+=c;const u=i-r,f=s-a,p=Math.min(n/u,o/f);t.fillStyle="#070707",t.fillRect(0,0,n,o),t.fillStyle="#f3f4f6",t.strokeStyle="#f3f4f6",t.lineWidth=1;for(const j of l.cards){const J=(j.x-r)*p,We=(j.y-a)*p,mt=le(j)*p,Je=(j._el?j._el.offsetHeight:200)*p;t.fillRect(J,We,mt,Je),t.strokeRect(J,We,mt,Je)}const g=m.stage.getBoundingClientRect(),h=(-$.x/$.k-r)*p,x=(-$.y/$.k-a)*p,w=g.width/$.k*p,y=g.height/$.k*p;m.minimapViewport.style.left=h+"px",m.minimapViewport.style.top=x+"px",m.minimapViewport.style.width=w+"px",m.minimapViewport.style.height=y+"px",m.minimap._scale=p,m.minimap._minX=r,m.minimap._minY=a}function _s(){_r=!_r,m.minimap.style.display=_r?"":"none",m.minimapBtn.classList.toggle("active",_r),_r&&Ur()}function Es(){let e=!1;const t=(n,o)=>{if(!e)return;const r=m.minimap.getBoundingClientRect(),a=n-r.left,i=o-r.top,s=m.minimap._scale||1,c=m.minimap._minX||0,u=m.minimap._minY||0,f=a/s+c,p=i/s+u,g=m.stage.getBoundingClientRect();$.x=-f*$.k+g.width/2,$.y=-p*$.k+g.height/2,In(),bt(),en()};m.minimapViewport.addEventListener("mousedown",n=>{n.preventDefault(),e=!0}),m.minimap.addEventListener("mousedown",n=>{n.target!==m.minimapViewport&&(n.preventDefault(),e=!0,t(n.clientX,n.clientY))}),A("mousemove",n=>{e&&t(n.clientX,n.clientY)}),A("mouseup",()=>{e=!1})}function nr(){ka(),m.world.innerHTML="";const e=d.createDocumentFragment();for(const t of l.cards)e.appendChild(ta(t));m.world.appendChild(e),In(),Ge(),$r(),m.hint.textContent=`${l.cards.length} 个节点`,Ur(),C&&Cr()}const Ka=e=>(q[Wt(e)]||ge(e)||Et(e)||{}).outputType||"image",Ga=e=>{const t=ct(e);return!!(t&&t.route)&&!Object.values(e.assets||{}).some(Boolean)};function Er(e){return ht(e)?'<span class="ph">🎨</span>':Ht(e)?'<span class="ph">✍</span>':ft(e)?'<span class="ph">📎</span>':`<span class="ph">${Ga(e)?"🖼🎬":Ka(e)==="video"?"🎬":"🖼"}</span>`}const Ss="button,input,textarea,select,audio,.vprog,.cmp,.rz,.port,.inport";function ta(e){const t=Et(e),n=d.createElement("div");n.className="card"+(oe===e.id?" sel":""),n.dataset.id=e.id,n.style.left=e.x+"px",n.style.top=e.y+"px",n.innerHTML=`
    <div class="ch"><span>${t?t.icon:"▪"}</span><span class="t"></span><button class="x" type="button" title="删除" aria-label="删除节点">✕</button></div>
    <div class="body">${Er(e)}</div>
    <div class="bar"><i></i></div>
    <div class="cf"><span class="kt"></span><span class="st"></span><span class="meta" style="margin-left:auto"></span></div>
    <div class="rz tl" title="拖动改大小（按住 Shift 只改宽）"></div>
    <div class="rz br" title="拖动改大小（按住 Shift 只改宽）"></div>
    <div class="inport"></div>
    <div class="port" title="${ft(e)?"拖到别的节点上 → 这份素材就进它的格子":"拖到空白处 → 用本节点产物新建下游节点"}"></div>`,e._el=n,Tn(e),Gt(e);const o=n.querySelector(".ch .x");return o.onmousedown=r=>r.stopPropagation(),o.onclick=r=>{r.stopPropagation(),gi(e)},n.querySelector(".rz.tl").onmousedown=r=>li(r,e,n,-1),n.querySelector(".rz.br").onmousedown=r=>li(r,e,n,1),n.querySelector(".port").onmousedown=r=>Is(r,e),n.onmousedown=r=>{if(!(r.button===1||r.button===0&&r.shiftKey)){if(r.button===0&&!r.target.closest(Ss))return Ps(r,e);r.stopPropagation(),!(r.button===2&&B.has(e.id)&&l.cards.filter(a=>B.has(a.id)).length>1)&&At(e.id)}},n.oncontextmenu=r=>{r.stopPropagation(),r.preventDefault(),Jt(),!(B.has(e.id)&&oi(r.clientX,r.clientY))&&(At(e.id),qs(r.clientX,r.clientY,e))},n.ondblclick=r=>{const a=r.target.closest(".body");if(!(!a||ut(e))&&!(ft(e)&&!gn(e))&&!r.target.closest(".vprog")){if(r.target.matches("audio")){const i=r.target.getBoundingClientRect();if(r.clientY>i.bottom-34*$.k)return}for(const i of a.querySelectorAll("video"))ir(i),i.pause();Yr(e,+(r.target.dataset.i||0))}},$s(n.querySelector(".body")),Ns(n.querySelector(".body"),e),mo(n,()=>cs(e)),n.onclick=r=>{!ft(e)||gn(e)||r.target.closest(".body")&&Io(e)},Qe(e),n}let Sr=null;d.addEventListener("play",e=>{if(!(e.target.paused||!e.target.isConnected)){for(const t of d.querySelectorAll("video, audio"))t!==e.target&&(ir(t),t.pause());Sr=e.target}},!0),d.addEventListener("pause",e=>{Sr===e.target&&(Sr=null)},!0),d.addEventListener("mousedown",e=>{for(const n of d.querySelectorAll("video"))n._playRequest&&!n.closest(".body, .vbox")?.contains(e.target)&&ir(n);if(!Sr)return;const t=Sr.closest(".body, .vbox, .arange");(!t||!t.contains(e.target))&&Sr.pause()},!0);function $s(e){const t=(n,o,r)=>{if(!isFinite(n.duration)||!n.duration)return;const a=r.getBoundingClientRect();n.currentTime=Math.min(Math.max((o-a.left)/a.width,0),1)*n.duration};e.onmousedown=n=>{if(n.button!==0)return;const o=n.target.closest(".vprog");if(o){const c=e.querySelector("video");if(!c)return;n.stopPropagation(),n.preventDefault();const u=!c.paused;c.pause(),t(c,n.clientX,o);const f=g=>t(c,g.clientX,o),p=()=>{d.removeEventListener("mousemove",f),d.removeEventListener("mouseup",p),u&&c.play().catch(()=>{})};d.addEventListener("mousemove",f),d.addEventListener("mouseup",p);return}const r=n.target.closest("video");if(!r)return;const a=n.clientX,i=n.clientY,s=c=>{d.removeEventListener("mouseup",s),!(Math.abs(c.clientX-a)+Math.abs(c.clientY-i)>=4)&&(r._previewController?ir(r):r.paused?Qs(r):(ir(r),r.pause()))};d.addEventListener("mouseup",s)},e.addEventListener("timeupdate",n=>{const o=e.querySelector(".vprog i"),r=n.target;!o||!isFinite(r.duration)||!r.duration||(o.style.width=r.currentTime/r.duration*100+"%")},!0)}function Tn(e){const t=e._el;if(!t)return;t.style.width=le(e)+"px";const n=t.querySelector(".body");n.style.height=e.h&&!n.classList.contains("grid")?e.h+"px":""}function Hr(e){const t=e._el;if(!t)return;let n=t.querySelector(".composite-inputs");if(e.cap!=="image_composite"){n?.remove();return}const o=(ge(e)?.inputs||[]).filter(u=>u.type==="image"),r=new Set((l?.edges||[]).filter(u=>u.to===e.id&&!Ke(u)).flatMap(bn)),a=o.filter(u=>e.assets?.[u.key]||r.has(u.key)),i=JSON.stringify(a.map(u=>[u.key,e.assets?.[u.key],r.has(u.key)]));if(n?.dataset.signature===i)return;n||(n=d.createElement("div"),n.className="composite-inputs",t.querySelector(".body").after(n)),n.dataset.signature=i,n.replaceChildren();const s=d.createElement("div");if(s.className="composite-input-label",s.textContent=`引用图片 · ${a.length}/${o.length}`,n.append(s),!a.length){const u=d.createElement("div");u.className="composite-input-hint",u.textContent="从图片节点连线，或在编辑器中上传图片",n.append(u);return}const c=d.createElement("div");c.className="composite-input-list",n.append(c);for(const u of a){const f=e.assets?.[u.key],p=d.createElement("button");if(p.type="button",p.dataset.compositeReference=u.key,p.title=`${u.label} · ${f?.origin||f?.filename||(f?"查看引用图片":"正在导入")}`,p.setAttribute("aria-label",p.title),p.disabled=!f?.url,f?.url){const h=d.createElement("img");h.src=Ci(f.url)||f.url,h.alt=u.label,h.loading="lazy",h.draggable=!1,p.append(h),p.onmousedown=x=>x.stopPropagation(),p.onclick=x=>{x.stopPropagation(),eo(f)}}const g=d.createElement("span");g.textContent=f?u.label:"导入中",p.append(g),c.append(p)}}function Qe(e){const t=e._el;if(!t)return;Hr(e);const n=t.querySelector(".body"),o=t.querySelector(".st"),r=t.querySelector(".meta"),a=t.querySelector(".bar i");if(ht(e)){const h=String((e.params||{}).style||"").trim();if(n.classList.remove("grid"),n.classList.add("sbody"),Tn(e),n.textContent="",h){const j=d.createElement("div");j.className="stx",j.textContent=h,n.appendChild(j)}else n.innerHTML=Er(e)+'<div class="sempty">在旁边的面板里写一段风格，再把出口拖到生图/生视频节点上</div>';const x=t.querySelector(".port");x&&(x.title="拖到生图/生视频节点上 → 那个节点套用这段风格（拖到空白处会列出所有能挂的玩法）");const w=(l?l.edges:[]).filter(j=>j.from===e.id&&Ke(j)).length,y=Me(e).length;o.className="st",o.textContent=h?"":"还没写",r.textContent=w?`挂了 ${w} 个节点`+(y?` · 连带下游 ${y} 张`:""):"还没挂节点",a.style.width="0%";return}if(Ht(e)){const h=e.status==="running";n.classList.remove("grid"),n.classList.add("sbody"),Tn(e),n.textContent="";const x=d.createElement("textarea");if(x.className="ttxt",x.spellcheck=!1,x.value=String((e.params||{}).text||""),x.placeholder=h?"正在加工，稍等…":"在这里写字；选好加工方式点「↑ 运行」，加工结果就落在这个框里 —— 可以直接改",x.disabled=h,x.oninput=()=>{e.params=e.params||{},e.params.text=x.value;const w=d.querySelector("#panel"),y=w?w.querySelector("textarea"):null;y&&y.placeholder==="在这里写字或直接在节点上写"&&(y.value=x.value),na(e),X()},n.appendChild(x),h){const w=d.createElement("div");w.className="load cover",n.appendChild(w)}na(e);return}const i=e.outputs||[],s=i[0],c=js(e),u=i.map(h=>h.url).join("|")+(c?"|<"+c:""),f=e.status==="queued"||e.status==="running";if(f&&n.dataset.url!=="busy"?(n.dataset.url="busy",n.classList.remove("grid"),Tn(e),n.innerHTML='<div class="load"></div>'):!f&&!i.length&&n.dataset.url==="busy"?(n.dataset.url="",n.innerHTML=Er(e)):ft(e)&&!i.length&&n.dataset.url&&(n.dataset.url="",n.classList.remove("grid"),n.innerHTML=Er(e)),!f&&i.length&&n.dataset.url!==u&&(n.dataset.url=u,n.classList.toggle("grid",i.length>1),Tn(e),i.length>1?(n.style.setProperty("--cols",i.length<=4?2:i.length<=9?3:4),n.innerHTML=i.map((h,x)=>h.kind==="video"?`<video data-video-url="" data-i="${x}" loop preload="none" draggable="false"></video>`:`<img data-i="${x}" alt="" draggable="false">`).join("")):n.innerHTML=s.kind==="video"?'<video data-video-url="" data-i="0" loop preload="none" draggable="false"></video><div class="vprog" title="按住左右拖 → 定位进度（画面上按住是挪节点）"><i></i></div>':s.kind==="audio"?'<audio preload="none" controls style="width:92%"></audio>':c?'<div class="cmp" title="按住左右拖：跟原图对比，看边缘抠干净了没有"><img class="new" alt="" draggable="false" data-i="0"><img class="old" alt="" draggable="false"><div class="cmpx"><i>⇔</i></div><div class="cmptip">按住往右拖 → 回到原图</div></div>':'<img data-i="0" alt="" draggable="false">',Zs(n,i,c),c&&Za(e),!ut(e)&&!ft(e)))for(let h=0;h<i.length;h++){const x=i[h];if(x.kind==="image"&&!x.width){const w=n.querySelector(`img[data-i="${h}"]`)||n.querySelector("img");if(w&&!w.dataset.thumbnail){const y=()=>{!t.isConnected||e._el!==t||!l?.cards.includes(e)||e.outputs?.[h]!==x||!w.naturalWidth||(x.width=w.naturalWidth,x.height=w.naturalHeight,Mt(e),X())};w.complete&&w.naturalWidth?y():w.onload=y}}else if(x.kind==="video"&&!x.width){const w=n.querySelector(`video[data-i="${h}"]`)||n.querySelector("video");w&&w.readyState>=1?(x.width=w.videoWidth,x.height=w.videoHeight,Mt(e),X()):w&&(w.onloadedmetadata=()=>{!t.isConnected||e._el!==t||!l?.cards.includes(e)||e.outputs?.[h]!==x||(x.width=w.videoWidth,x.height=w.videoHeight,Mt(e),X())})}}if(ft(e)){o.className="st"+(s?" done":""),o.textContent=s?"已就绪":"点节点选文件",o.title=s?"把右边的出口拖到别的节点 → 这份素材就进那个节点的格子里":o.textContent,a.style.width="0%",r.textContent=s?String(s.filename||s.origin||s.url||"").split(/[\\/]/).pop().slice(-22):"",r.title=s&&s.origin||"";return}const p=e.status;o.className="st"+(p==="running"||p==="queued"?" run":p==="done"?" done":p==="error"?" err":""),o.textContent=p==="queued"?Ve(e)&&e.step?e.step:e.job?Bi(e):"正在提交…":p==="running"?(Ve(e)&&!(e.progress>0)?"生成中":`生成中 ${Math.round((e.progress||0)*100)}%`)+(e.step?` · ${e.step}`:""):p==="done"?sr(e.ms)?`已完成 · ${sr(e.ms)}`:"已完成":p==="error"?"失败":p==="canceled"?"已取消":e.cap==="image_composite"?"待合成":"待生成",o.title=o.textContent,a.style.width=(p==="running"||p==="queued"?Ve(e)&&!(e.progress>0)?0:(e.progress||.02)*100:p==="done"?100:0)+"%",r.textContent=e.error?String(e.error).slice(0,40):i.length>1?`${i.length} 张`:s?String(s.filename||s.origin||s.url||"").split(/[\\/]/).pop().slice(-22):"",r.title=e.error||"";const g=gr(e);g&&r.replaceChildren(g)}function na(e){const t=e._el;if(!t)return;const n=t.querySelector(".st"),o=t.querySelector(".meta"),r=t.querySelector(".bar i"),a=v(e),i=e.status==="running",s=tn(e),c=t.querySelector(".port");c&&(c.title="拖到生成节点上 → 并进它的提示词；拖到另一个文本节点上 → 当那段加工的输入（拖到空白处会列出能接的地方）");const u=(l?l.edges:[]).filter(g=>g.from===e.id&&Ke(g)).length,f=z(e).length;n.className="st"+(i?" run":e.status==="error"?" err":a&&e.status==="done"?" done":""),i?n.textContent="处理中…":a?n.textContent=e.status==="error"?"失败":e.status==="done"?sr(e.ms)?`已完成 · ${sr(e.ms)}`:"已完成":"待运行":n.textContent=s?"":"还没写",n.title=n.textContent;const p=[];a&&p.push(`输入 ${f} 段`),u&&p.push(`连 ${u} 个节点`),o.textContent=p.join(" · "),o.title=e.error||"",r.style.width=i?"40%":e.status==="done"?"100%":"0%"}function js(e){const t=q[Wt(e)];if(!t||!t.compare||t.card==="image")return null;const n=e.outputs||[];if(n.length!==1||n[0].kind!=="image")return null;const o=(t.inputs||[]).find(a=>a.type==="image"),r=o&&(e.assets||{})[o.key];return r&&r.kind==="image"?r.url:null}function Za(e){const t=e._el&&e._el.querySelector(".cmp");if(!t)return;const n=e._cmp==null?0:e._cmp;t.style.setProperty("--x",n*100+"%"),t.classList.toggle("dragged",e._cmp!=null)}function Ns(e,t){e.addEventListener("mousedown",n=>{if(n.button!==0)return;const o=n.target.closest(".cmp");if(!o)return;n.preventDefault();const r=s=>{const c=o.getBoundingClientRect();t._cmp=Math.min(Math.max((s-c.left)/c.width,0),1),Za(t)};r(n.clientX);const a=s=>r(s.clientX),i=()=>{d.removeEventListener("mousemove",a),d.removeEventListener("mouseup",i)};d.addEventListener("mousemove",a),d.addEventListener("mouseup",i)})}const tt=e=>(l?l.cards:[]).find(t=>t.id===e)||null;function Qa(e,t,n,o=!0){if(!t||!n||n.length<=1)return t?[t]:[];const r=/^(\w+)\[(\d+)\]$/.exec(t),a=e&&ge(e);if(!r||!a)return[t];const i=r[1],s=+r[2],c=n[0]&&n[0].kind,u=o?new Set((l?.edges||[]).filter(p=>p.to===e.id&&!Ke(p)).flatMap(bn)):null,f=(a.inputs||[]).filter(p=>{const g=new RegExp(`^${i}\\[(\\d+)\\]$`).exec(p.key);return g&&+g[1]>=s&&(!c||p.type===c)&&(!o||!(e.assets||{})[p.key]&&!u.has(p.key))}).sort((p,g)=>parseInt(/\[(\d+)\]/.exec(p.key)[1],10)-parseInt(/\[(\d+)\]/.exec(g.key)[1],10)).slice(0,n.length).map(p=>p.key);return f.length?f:[t]}function bn(e){if(!e||Ke(e))return[];if(Array.isArray(e.slots))return[...new Set(e.slots.filter(Boolean))];const t=tt(e.from),n=tt(e.to),o=t&&t.outputs||[],r=t&&t.history&&t.history[0]&&t.history[0].outputs||[];return Qa(n,e.slot,o.length?o:r,!1)}function ra(e){const t=tt(e&&e.to);if(!t||!t.assets)return!1;let n=!1;for(const o of bn(e))o in t.assets&&(delete t.assets[o],n=!0);return n&&(Bn(t),Mt(t)),n}function Hn(e,t=!0){const n=new Set(e||[]);if(!n.size)return!1;if(t)for(const o of n)ra(o);l.edges=l.edges.filter(o=>!n.has(o));for(const o of new Set([...n].map(r=>r.to))){const r=tt(o);r&&Hr(r)}return!0}function ei(e,t){const n=[];let o=!1;for(const r of l.edges){if(r.to!==e||Ke(r))continue;const a=bn(r);if(!a.includes(t))continue;const i=a.filter(s=>s!==t);o=!0,i.length?(r.slots=i,r.slot===t&&(r.slot=i[0])):n.push(r)}return Hn(n,!1),o}function oa(e){const t=tt(e);if(!t)return null;const n=t._el?t._el.offsetHeight:230;return{x:t.x,y:t.y,w:le(t),h:n}}let Xt=null,rr=null;const vo=new Map;function Ms(e,t){const n=new Set(e.cards.map(i=>i.id)),o=new Map,r=new Map;for(const i of e.edges)!n.has(i.from)||!n.has(i.to)||(o.has(i.to)||o.set(i.to,[]),r.has(i.from)||r.set(i.from,[]),o.get(i.to).push(i),r.get(i.from).push(i));const a=(i,s)=>{const c=new Set,u=new Set,f=[...t].filter(p=>n.has(p));for(;f.length;){const p=f.pop();if(!u.has(p)){u.add(p);for(const g of i.get(p)||[])c.add(g),f.push(g[s])}}return c};return{upstream:a(o,"from"),downstream:a(r,"to")}}function ti(e){if(Ke(e))return!1;const t=tt(e.from),n=tt(e.to);return!!(t&&n&&!ut(t)&&ce(t).length&&!ae(n).length)}function aa(e){const t=tt(e.from),n=tt(e.to),o=r=>r?fe(r):"?";return Ke(e)?e.slot===Dn?`文本：${o(t)} → ${o(n)}`:`风格：${o(t)} → ${o(n)}`:`${o(t)} → ${o(n)}${e.version?`（固定分镜版本 · ${e.version.job} · 第 ${e.version.index+1} 张）`:""}`}function ni(){rr?.disconnect();const e=Xt||C?[]:B.size?[...B]:oe?[oe]:[],{upstream:t,downstream:n}=l&&e.length?Ms(l,e):{upstream:new Set,downstream:new Set};m.wires.classList.toggle("has-flow",!!(t.size||n.size));const o=t.size||n.size;if(o||m.wires.querySelector("defs")?.remove(),o&&!m.wires.querySelector("defs")){const r=d.createElementNS(re,"defs");for(const a of["up","down","both"]){const i=d.createElementNS(re,"marker");for(const[c,u]of Object.entries({id:`wire-arrow-${a}`,class:`flow-${a}`,viewBox:"0 0 10 8",refX:9,refY:4,markerWidth:10,markerHeight:8,markerUnits:"userSpaceOnUse",orient:"auto"}))i.setAttribute(c,u);const s=d.createElementNS(re,"polygon");s.setAttribute("points","0,0 9,4 0,8 2.5,4"),i.append(s),r.append(i)}m.wires.append(r),rr||(rr=new Xe(a=>{for(const i of a)i.target.classList.toggle("in-view",i.isIntersecting)},{root:m.stage,rootMargin:"80px"}))}for(const[r,a]of vo){const i=t.has(r)?n.has(r)?"both":"up":n.has(r)?"down":"";if(a.line.classList.toggle("sel",r===Xt),a.line.classList.toggle("related",!!i),a.carry?.classList.toggle("related",!!i),!i){a.flow?.remove(),a.flow=null;continue}a.flow||(a.flow=d.createElementNS(re,"path"),a.flow.setAttribute("d",a.line.getAttribute("d")),a.flow.setAttribute("aria-hidden","true"),a.flow.classList.add("flow"),m.wires.append(a.flow)),a.flow.classList.remove("flow-up","flow-down","flow-both"),a.flow.classList.add(`flow-${i}`),a.flow.setAttribute("marker-end",`url(#wire-arrow-${i})`),rr.observe(a.flow)}}function Ge(e=!0){if(!e){ni(),kn();return}if(rr?.disconnect(),vo.clear(),m.wires.innerHTML="",!l){m.wires.classList.remove("has-flow"),kn();return}for(const t of l.edges){const n=oa(t.from),o=oa(t.to);if(!n||!o)continue;const r=n.x+n.w,a=n.y+n.h/2,i=o.x,s=o.y+o.h/2,c=Math.max(50,Math.abs(i-r)*.5),u=`M${r},${a} C${r+c},${a} ${i-c},${s} ${i},${s}`,f=w=>{const y=d.createElementNS(re,"path");return w&&y.setAttribute("class",w),y.setAttribute("d",u),m.wires.appendChild(y),y},p=f("hit"),g=d.createElementNS(re,"title");g.textContent=aa(t)+(ti(t)?"（风格也顺着这根线往下传）":"")+"　点一下选中，Delete 删除",p.appendChild(g),p.addEventListener("mousedown",w=>{w.stopPropagation(),si(t)}),p.addEventListener("contextmenu",w=>{w.preventDefault(),w.stopPropagation(),si(t),Ls(w.clientX,w.clientY,t)});const h=f(Ke(t)?"txt":""),x=ti(t)?f("carry"):null;vo.set(t,{line:h,carry:x,flow:null})}ni(),kn(),$r()}function ko(e){return{x:e.x,y:e.y,w:le(e),h:e._el?e._el.offsetHeight:230}}function ia(e=V,t=230){const n=m.stage.getBoundingClientRect(),o=vn((n.left+n.right)/2,(n.top+n.bottom)/2),r=o.x-e/2,a=o.y-t/2,i=24,s=(l?l.cards:[]).map(ko),c=(f,p)=>!s.some(g=>f<g.x+g.w+i&&f+e+i>g.x&&p<g.y+g.h+i&&p+t+i>g.y);if(c(r,a))return{x:Math.round(r),y:Math.round(a)};const u=64;for(let f=1;f<=24;f++)for(const[p,g]of[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const h=r+p*f*u,x=a+g*f*u;if(c(h,x))return{x:Math.round(h),y:Math.round(x)}}return{x:Math.round(r),y:Math.round(a)}}function ri(e){let t=1/0,n=1/0,o=-1/0,r=-1/0;for(const a of e){const i=tt(a);if(!i)continue;const s=ko(i);t=Math.min(t,s.x),n=Math.min(n,s.y),o=Math.max(o,s.x+s.w),r=Math.max(r,s.y+s.h)}return t===1/0?null:{x:t,y:n,w:o-t,h:r-n}}function zs(e){if(!l||!Le()||!["left","right","top","bottom","center"].includes(e))return;const t=l.cards.filter(y=>B.has(y.id)).map((y,j)=>({c:y,index:j,...ko(y)}));if(t.length<2)return;const n=Math.min(...t.map(y=>y.x)),o=Math.min(...t.map(y=>y.y)),r=Math.max(...t.map(y=>y.x+y.w)),a=Math.max(...t.map(y=>y.y+y.h)),i=e==="left"||e==="right"||e==="center",s=new Map(t.map(y=>[y.c.id,y])),c=new Map(t.map(y=>[y.c.id,new Set])),u=new Map(t.map(y=>[y.c.id,new Set])),f=new Map(t.map(y=>[y.c.id,0]));for(const y of l.edges)y.from===y.to||!s.has(y.from)||!s.has(y.to)||(c.get(y.from).add(y.to),c.get(y.to).add(y.from),u.get(y.from).has(y.to)||(u.get(y.from).add(y.to),f.set(y.to,f.get(y.to)+1)));const p=new Set,g=[],h=(y,j)=>y.x-j.x||y.y-j.y||y.index-j.index;for(const y of t){if(p.has(y.c.id))continue;const j=[],J=[y.c.id];p.add(y.c.id);for(let Je=0;Je<J.length;Je++){const Ne=J[Je];j.push(s.get(Ne));for(const xt of c.get(Ne))p.has(xt)||(p.add(xt),J.push(xt))}const We=new Set(j),mt=[];for(;We.size;){const Je=[...We].filter(xt=>f.get(xt.c.id)===0),Ne=(Je.length?Je:[...We]).sort(h)[0];We.delete(Ne),mt.push(Ne);for(const xt of u.get(Ne.c.id))f.set(xt,f.get(xt)-1)}g.push({items:mt,x:Math.min(...j.map(Je=>Je.x)),y:Math.min(...j.map(Je=>Je.y)),w:j.reduce((Je,Ne)=>Je+Ne.w,0)+24*(j.length-1),h:Math.max(...j.map(Je=>Je.h))})}g.sort((y,j)=>i?y.y-j.y||y.x-j.x:y.x-j.x||y.y-j.y);let x=i?o:n;const w=[];for(const y of g){let j=i?e==="left"?n:e==="right"?r-y.w:(n+r-y.w)/2:x;const J=i?x:e==="top"?o:a-y.h;for(const We of y.items)w.push({...We,nx:j,ny:e==="bottom"?J+y.h-We.h:J}),j+=We.w+24;x+=(i?y.h:y.w)+24}if(w.some(y=>Math.abs(y.nx-y.x)>1e-7||Math.abs(y.ny-y.y)>1e-7)){for(const{c:y,nx:j,ny:J}of w)y.x=j,y.y=J,y._el&&(y._el.style.left=j+"px",y._el.style.top=J+"px");Ge(),bt(),Ur(),X()}}function oi(e,t){if(!he()||!l)return!1;const n=l.cards.filter(a=>B.has(a.id));if(n.length<2)return!1;const o=l,r=[["left","左对齐"],["right","右对齐"],["top","顶部对齐"],["bottom","底部对齐"],["center","垂直居中对齐"]].map(([a,i])=>({text:i,run:()=>{l===o&&zs(a)}}));return Nt(e,t,"选中节点",[{text:"对齐方式",children:r},{text:`复制选中节点（${n.length} 个）`,run:()=>{l===o&&or()}},{text:`批量重命名（${n.length} 个节点）`,run:()=>{if(l!==o||!he())return;const a=l.cards.filter(i=>B.has(i.id));a.length>1&&da(a[0])}},{text:`批量删除（${n.length} 个节点）`,danger:!0,run:()=>{l!==o||!he()||l.cards.filter(a=>B.has(a.id)).length>1&&sa()}}]),!0}function kn(){if(!m.groups)return;let e=m.groups.querySelector(".selbox");if(!B.size){e&&e.remove(),m.selbar.style.display="none";return}const t=ri(B);if(!t)return B.clear(),kn();if(e||(e=d.createElement("div"),e.className="selbox",m.groups.appendChild(e)),e.style.left=t.x-8+"px",e.style.top=t.y-8+"px",e.style.width=t.w+16+"px",e.style.height=t.h+16+"px",B.size<2){m.selbar.style.display="none";return}m.selbar.style.display="";const n=m.stage.getBoundingClientRect(),o=$.x+t.x*$.k,r=$.y+t.y*$.k;m.selbar.style.left=Math.max(4,Math.min(o,n.width-m.selbar.offsetWidth-4))+"px",m.selbar.style.top=Math.max(50,r-m.selbar.offsetHeight-10)+"px"}function $r(){if(m.groups&&(m.groups.querySelectorAll(".ggroup").forEach(e=>e.remove()),!!l))for(const e of l.groups||[]){const t=ri(e.cards);if(!t)continue;const n=12,o=28,r=d.createElement("div");r.className="ggroup",r.style.left=t.x-n+"px",r.style.top=t.y-o+"px",r.style.width=t.w+n*2+"px",r.style.height=t.h+n+o+"px";const a=d.createElement("div");a.className="gglabel",a.textContent=`${e.name}（${e.cards.length}）`,r.appendChild(a),r.onmousedown=i=>{i.button===0&&(i.stopPropagation(),i.preventDefault(),B=new Set(e.cards),Xt=null,Ge(!1),ii(i,[...e.cards].map(tt).filter(Boolean)))},a.ondblclick=i=>{i.stopPropagation(),ai(e)},r.oncontextmenu=i=>{i.preventDefault(),i.stopPropagation(),Nt(i.clientX,i.clientY,e.name,[{icon:"✎",text:"重命名",run:()=>ai(e)},{icon:"✕",text:"删除组（节点保留）",danger:!0,run:()=>{Le()&&(l.groups=l.groups.filter(s=>s!==e),$r(),X())}}])},m.groups.appendChild(r)}}function ai(e){if(!Le())return;const t=prompt("组名",e.name);t!==null&&(e.name=t.trim().slice(0,30)||e.name,$r(),X())}function ii(e,t,n){if(!he()||e.button!==0||!t.length)return;e.stopPropagation(),e.preventDefault(),Jt();const o={mx:e.clientX,my:e.clientY,pos:t.map(s=>({c:s,x:s.x,y:s.y}))};let r=!1;const a=s=>{if(!r&&Math.abs(s.clientX-o.mx)+Math.abs(s.clientY-o.my)<4)return;r||(r=!0);const c=(s.clientX-o.mx)/$.k,u=(s.clientY-o.my)/$.k;for(const f of o.pos)f.c.x=Math.round(f.x+c),f.c.y=Math.round(f.y+u),f.c._el&&(f.c._el.style.left=f.c.x+"px",f.c._el.style.top=f.c.y+"px");Ge(),bt()},i=()=>{d.removeEventListener("mousemove",a),d.removeEventListener("mouseup",i),r?(bt(),X()):n&&n()};d.addEventListener("mousemove",a),d.addEventListener("mouseup",i)}function sa(){if(!Le())return;const e=l,t=[...B].map(tt).filter(Boolean);if(!t.length)return;const n=t.filter(r=>(r.history||[]).length||(r.outputs||[]).length).length;if(!confirm(`删除选中的 ${t.length} 个节点？
`+(n?`其中 ${n} 个节点有历史记录或产物。
`:"")+"相关连线和节点内记录会一并移除，此操作不能撤销；不会删除素材文件。")||l!==e||!he())return;const o=hi(t.map(r=>r.id));o&&ee(`已删除 ${o} 个节点`)}function si(e){Xt=e,oe=null,Cn(),Jt(),rn();for(const t of l.cards)t._el&&t._el.classList.remove("sel");Ge(),ee(aa(e)+" · Delete 删除")}function Ls(e,t,n){const o=tt(n.from),r=tt(n.to);Nt(e,t,aa(n),[...o?[{icon:"◧",text:`选中上游「${fe(o)}」`,run:()=>At(o.id)}]:[],...r?[{icon:"◨",text:`选中下游「${fe(r)}」`,run:()=>At(r.id)}]:[],{icon:"✕",text:n.slot===Dn?"断开这段文本":Ke(n)?"解除这个风格节点":"删除连线",danger:!0,run:()=>Wr(n)}])}function Wr(e){if(!Le())return;const t=!Ke(e)&&ra(e);Hn([e],!1),Xt===e&&(Xt=null),Ge(),Ot(),oe&&Ce(oe),X(),ee(e.slot===Dn?"已断开这段文本输入":Ke(e)?"已解除风格":t?"已删除连线，并清除下游引用":"已删除连线")}function At(e){oe=e,B.clear(),Xt=null,Ge(!1);for(const t of l.cards)t._el&&t._el.classList.toggle("sel",t.id===e);zr(e),Ce(e)}function Ps(e,t,n){if(!he()){e.stopPropagation(),At(t.id);return}if(e.button!==0)return;const o=B.has(t.id)&&l.cards.filter(a=>B.has(a.id)).length>1;let r=o?[...B]:null;if(!r){const a=new Set;for(const i of l.groups||[])i.cards.includes(t.id)&&i.cards.forEach(s=>a.add(s));a.size>1&&(r=[...a])}o?Cn():At(t.id),ii(e,r?r.map(tt).filter(Boolean):[t],o?()=>At(t.id):void 0)}function li(e,t,n,o){if(!Le()||e.button!==0)return;e.stopPropagation(),e.preventDefault(),Jt(),At(t.id);const r=n.querySelector(".body"),a={mx:e.clientX,my:e.clientY,x:t.x,y:t.y,w:le(t),h:t.h||r.offsetHeight,ch:n.offsetHeight},i=(f,p,g)=>Math.max(p,Math.min(g,Math.round(f)));let s=!1;const c=f=>{!s&&Math.abs(f.clientX-a.mx)+Math.abs(f.clientY-a.my)<3||(s||(s=!0),t.w=i(a.w+(f.clientX-a.mx)/$.k*o,ve,Se),f.shiftKey||(t.h=i(a.h+(f.clientY-a.my)/$.k*o,Ee,Ie)),Tn(t),o<0&&(t.x=a.x+(a.w-t.w),t.y=a.y+(a.ch-n.offsetHeight),n.style.left=t.x+"px",n.style.top=t.y+"px"),Ge(),bt())},u=()=>{d.removeEventListener("mousemove",c),d.removeEventListener("mouseup",u),s&&(bt(),X())};d.addEventListener("mousemove",c),d.addEventListener("mouseup",u)}function Is(e,t){if(e.button!==0||!Le())return;e.stopPropagation(),e.preventDefault(),Jt();const n=oa(t.id),o=d.createElementNS(re,"path");o.setAttribute("class","tmp"),m.wires.appendChild(o);const r=n.x+n.w,a=n.y+n.h/2;m.world.classList.add("wiring");let i=null;const s=u=>{const f=vn(u.clientX,u.clientY);i=f;const p=Math.max(50,Math.abs(f.x-r)*.5);o.setAttribute("d",`M${r},${a} C${r+p},${a} ${f.x-p},${f.y} ${f.x},${f.y}`)},c=u=>{d.removeEventListener("mousemove",s),d.removeEventListener("mouseup",c),o.remove(),m.world.classList.remove("wiring");const f=u.target.closest&&u.target.closest(".card");f&&f.dataset.id!==t.id?vi(t,l.cards.find(p=>p.id===f.dataset.id)):i&&Vs(t,i,u.clientX,u.clientY)};d.addEventListener("mousemove",s),d.addEventListener("mouseup",c)}function Ts(){for(const r of["beforeinput","input","change","paste","drop","dragover","click","mousedown"])d.addEventListener(r,a=>{if(he()||!l)return;const i=a.target,s=i.closest?.("#panel, #respop, #dock, #selbar"),c=i.closest?.("#world input, #world textarea, #world select, #world [contenteditable]"),u=["paste","drop","dragover"].includes(r)&&i.closest?.("#stage");(s||c||u)&&(a.preventDefault(),a.stopImmediatePropagation())},!0);matchMedia("(max-width: 760px)").matches&&d.body.classList.add("collapsed"),E("#toggle").setAttribute("aria-expanded",String(!d.body.classList.contains("collapsed"))),E("#toggle").onclick=()=>{const r=d.body.classList.toggle("collapsed");E("#toggle").setAttribute("aria-expanded",String(!r))},E("#createHere").onclick=hs,Rs(),m.fit.onclick=()=>{$={x:60,y:70,k:1},In(),bt(),en()},m.jobsbtn.onclick=Vn,m.selbar.innerHTML="";const e=d.createElement("button");e.className="mkgroup",e.textContent="▦ 打组",e.title="把选中的节点圈成一个组：拖分组框整体移动；双击组名改名，右键框删组（节点保留）",e.onclick=()=>{if(!he()||B.size<2)return;if(l.groups=l.groups||[],l.groups.find(a=>a.cards.length===B.size&&a.cards.every(i=>B.has(i))))return ee("这几张已经是同一组了");l.groups.push({id:Bt(),name:`组 ${l.groups.length+1}`,cards:[...B]}),kn(),$r(),X(),ee("已打组：拖组里的节点或分组框 = 整组一起动；双击组名改名，右键框删组")};const t=d.createElement("button");t.className="renamecards act",t.textContent="批量重命名",t.title="一次填写所有选中节点的新名称，统一确认；留空恢复默认名称",t.onclick=()=>{B.size>1&&da(tt([...B][0]))};const n=d.createElement("button");n.className="deletecards act danger",n.textContent="批量删除",n.title="删除框选的所有节点（Delete / Backspace），操作前统一确认",n.onclick=sa,m.selbar.append(e,t,n),m.selbar.onmousedown=r=>r.stopPropagation(),A("resize",()=>{el(),bt(),Pt(),kn()}),m.stage.addEventListener("mousemove",r=>{jr=vn(r.clientX,r.clientY),Va(jr.x,jr.y)}),m.stage.addEventListener("mouseleave",()=>{jr=null,Va(0,0,!1)}),m.stage.addEventListener("mousedown",r=>{if(C||r.target.closest("#selbar")||r.target.closest("#panel"))return;if(r.button===1||r.button===0&&r.shiftKey){r.preventDefault();const u={mx:r.clientX,my:r.clientY,x:$.x,y:$.y};m.stage.classList.add("panning");let f=!1;const p=h=>{f||(f=!0,$i(!0)),$.x=u.x+h.clientX-u.mx,$.y=u.y+h.clientY-u.my,In()},g=()=>{if(m.stage.classList.remove("panning"),d.removeEventListener("mousemove",p),d.removeEventListener("mouseup",g),f&&r.button===0){const h=x=>{x.preventDefault(),x.stopImmediatePropagation()};d.addEventListener("click",h,{capture:!0,once:!0}),H(()=>d.removeEventListener("click",h,!0),0)}f&&($i(!1),bt(),en())};d.addEventListener("mousemove",p),d.addEventListener("mouseup",g);return}if(r.button!==0)return;r.preventDefault(),Cn(),$n(),oe=null,rn(),Xt=null;for(const u of l?l.cards:[])u._el&&u._el.classList.remove("sel");B.clear(),Ge(!1);const a={mx:r.clientX,my:r.clientY};let i=!1;const s=u=>{if(!i&&Math.abs(u.clientX-a.mx)+Math.abs(u.clientY-a.my)<4)return;i=!0;const f=Math.min(a.mx,u.clientX),p=Math.min(a.my,u.clientY),g=Math.max(a.mx,u.clientX),h=Math.max(a.my,u.clientY),x=m.stage.getBoundingClientRect();m.lasso.style.display="",m.lasso.style.left=f-x.left+"px",m.lasso.style.top=p-x.top+"px",m.lasso.style.width=g-f+"px",m.lasso.style.height=h-p+"px";const w=vn(f,p),y=vn(g,h);if(B.clear(),l)for(const j of l.cards){const J=ko(j);J.x<y.x&&J.x+J.w>w.x&&J.y<y.y&&J.y+J.h>w.y&&B.add(j.id)}kn()},c=()=>{if(d.removeEventListener("mousemove",s),d.removeEventListener("mouseup",c),m.lasso.style.display="none",!!i)if(B.size===1){const u=[...B][0];B.clear(),At(u)}else Ge(!1),B.size&&ee(`选中 ${B.size} 个节点：拖动整体移动 · 右键对齐 / 批量删除 · Delete 全删 · 上方按钮打组 / 批量重命名 / 批量删除`)};d.addEventListener("mousemove",s),d.addEventListener("mouseup",c)}),m.stage.addEventListener("wheel",r=>{if(C||!l)return;r.preventDefault();const a=vn(r.clientX,r.clientY),i=Math.min(et,Math.max(ye,$.k*(r.deltaY<0?1.1:1/1.1))),s=m.stage.getBoundingClientRect();$.x=r.clientX-s.left-a.x*i,$.y=r.clientY-s.top-a.y*i,$.k=i,In(),typeof en=="function"?en():X()},{passive:!1}),m.stage.addEventListener("contextmenu",r=>{if(r.preventDefault(),C||!he()||r.target.closest(".card, #panel, #selbar, #dock, #respop")||(Jt(),oi(r.clientX,r.clientY)))return;const a=vn(r.clientX,r.clientY),i=[];i.push({group:"生成节点"});const s=T.find(f=>f.kind==="text");s&&i.push({icon:s.icon||"✍",text:"文本",run:()=>{xn(s.id,a.x,a.y,s.modes[0]?jt(s.modes[0]):null)}}),T.filter(f=>f.kind==="gen").forEach(f=>{let p=f.name;p==="生图"?p="图片":p==="生视频"&&(p="视频"),i.push({icon:f.icon||"◻",text:p,run:()=>{xn(f.id,a.x,a.y,f.modes[0]?jt(f.modes[0]):null)}})});const u=T.find(f=>f.id==="card_tools");u&&(i.push({group:"工具"}),i.push({icon:u.icon||"◻",text:"工具",run:()=>xn(u.id,a.x,a.y)})),i.push({group:"其他"}),i.push({icon:"📎",text:"上传素材",run:()=>{const f=d.createElement("input");f.type="file",f.accept="image/*,video/*,audio/*",f.onchange=async p=>{const g=p.target.files[0];if(g)try{const h=await It(g),x=T.find(y=>y.kind==="asset");if(!x)return $e("找不到素材节点定义");const w=xn(x.id,a.x,a.y,x.modes[0].id);if(!w)return;await ro(w,h),ee("已上传："+h.origin)}catch(h){$e("上传失败："+h.message)}},f.click()}}),Wn&&i.push({icon:"⧉",text:"粘贴刚复制的节点（Ctrl+V）",run:()=>{jr=a,fa()}}),i.length>0&&Nt(r.clientX,r.clientY,"画布",i)}),m.stage.addEventListener("dragover",r=>{C||!he()||(r.preventDefault(),r.dataTransfer.dropEffect="copy")}),m.stage.addEventListener("drop",async r=>{if(C||!he())return;if(r.preventDefault(),[...r.dataTransfer?.types||[]].includes(Ea)){r.stopPropagation();const u=to;if(to=null,!u||l!==u.project||r.dataTransfer.getData(Ea)!==u.token)return;const f=vn(r.clientX,r.clientY);try{const p=await ya(u.output);if(!await mi(u.project,p,Math.round(f.x-134),Math.round(f.y-84)))return;ee(`已建素材节点：${p.origin||u.output.filename||"历史产物"}`)}catch(p){l===u.project&&$e("导入历史产物失败："+p.message)}return}const a=[...r.dataTransfer?.files||[]];if(!a.length)return;const i=a.filter(u=>u.type.startsWith("image/")||u.type.startsWith("video/")||u.type.startsWith("audio/"));if(!i.length)return ee("只支持图片、视频、音频文件");const s=vn(r.clientX,r.clientY),c=l;for(const u of i){if(l!==c||!he())return;try{const f=await It(u),p={x:Math.round(s.x-134),y:Math.round(s.y-84)};if(!await mi(c,f,p.x,p.y))return;ee(`已建素材节点：${f.origin||u.name}`),s.x+=50,s.y+=50}catch(f){l===c&&$e(`上传失败 ${u.name}：${f.message}`)}}}),m.view.addEventListener("mousedown",r=>{r.target===m.view&&Xr()}),A("mousedown",r=>{m.respop.style.display!=="none"&&(m.respop.contains(r.target)||Pn())},!0),A("mousedown",r=>{m.menu.style.display!=="none"&&!m.menu.contains(r.target)&&!r.target.closest(".tcap")&&Cn()},!0),d.addEventListener("paste",Xs),d.addEventListener("keydown",r=>{if(d.querySelector("dialog[data-image-composer][open]"))return;if(m.view.style.display!=="none"&&(r.key==="ArrowLeft"||r.key==="ArrowRight")){r.preventDefault(),pi(r.key==="ArrowRight"?1:-1);return}const a=r.target,i=(a.tagName||"").toLowerCase(),s=i==="input"||i==="textarea"||i==="select"||a.isContentEditable;if(l&&!C&&!s&&m.view.style.display==="none"){if((/Mac/i.test(navigator.platform)?r.metaKey&&!r.ctrlKey:r.ctrlKey&&!r.metaKey)&&!r.altKey&&["z","y"].includes(r.key.toLowerCase())){r.preventDefault(),xs(r.key.toLowerCase()==="y"||r.shiftKey);return}const u=tt(oe);if(!he()&&(["Delete","Backspace"].includes(r.key)||(r.ctrlKey||r.metaKey)&&r.key.toLowerCase()==="v")){r.preventDefault();return}if(r.key==="Delete"||r.key==="Backspace"){if(Xt){r.preventDefault(),Wr(Xt);return}if(B.size>1){r.preventDefault(),sa();return}if(u){r.preventDefault(),gi(u);return}}if((r.ctrlKey||r.metaKey)&&!r.shiftKey&&!r.altKey){const f=r.key.toLowerCase();if(f==="c"&&(u||B.size)){r.preventDefault(),or(u);return}if(f==="v"){if(ba())return;r.preventDefault(),fa();return}}if(r.key.toLowerCase()==="h"&&u&&!r.ctrlKey&&!r.metaKey&&!r.shiftKey&&!r.altKey){r.preventDefault();const f=m.stage.getBoundingClientRect(),p=f.top+f.height*.3,g=f.left+f.width*.5,h=u.x+(u._el?u._el.offsetWidth/2:V/2),x=u.y+(u._el?u._el.offsetHeight/2:168/2);$.x=g-h*$.k,$.y=p-x*$.k,In(),bt(),en();return}}if(r.key==="Escape"){if(m.respop.style.display!=="none"){Pn();return}if(m.view.style.display!=="none"){Xr();return}if(m.jobs.style.display!=="none"){$n();return}if(Cn(),Jt(),!C){oe=null,rn(),Xt=null,B.clear(),Ge(!1);for(const c of l?l.cards:[])c._el&&c._el.classList.remove("sel")}}}),m.minimapBtn.onclick=_s,Es();let o=!0;m.wiresToggle.onclick=()=>{o=!o,m.wires.style.display=o?"":"none",m.wiresToggle.classList.toggle("active",!o),d.querySelectorAll(".card .inp, .card .out").forEach(r=>{r.style.display=o?"":"none"})},m.zoomMenu.onclick=r=>{const a=()=>{typeof en=="function"?en():X()},i=c=>{const u=m.stage.getBoundingClientRect(),f=vn(u.left+u.width/2,u.top+u.height/2);$.x=u.width/2-f.x*c,$.y=u.height/2-f.y*c,$.k=c,In(),bt(),a()},s=[...[500,300,200,125,100,75,50,25,10].map(c=>({icon:c>100?"+":c===100?"1:1":"−",text:`${c>100?"放大":c===100?"重置":"缩小"} (${c}%)`,run:()=>i(c/100)})),{icon:"□",text:"适应画布",run:()=>{$={x:60,y:70,k:1},In(),bt(),a()}}];Nt(r.clientX,r.clientY-200,"缩放",s)}}let Co=0;function Nt(e,t,n,o){Co++,m.menu.innerHTML="";const r=d.createElement("div");r.className="hd",r.textContent=n,m.menu.appendChild(r);for(const a of o){if(a.group){const f=d.createElement("div");f.className="grp",f.textContent=a.group,m.menu.appendChild(f);continue}const i=d.createElement("button");i.disabled=!!a.disabled,a.disabled&&(i.style.opacity="0.45"),a.danger&&(i.className="danger");const s=d.createElement("span");s.textContent=a.icon||"▸";const c=d.createElement("span");c.textContent=a.text,i.append(s,c);const u=()=>{m.menu.querySelectorAll(".menu-submenu").forEach(f=>f.style.display="none"),m.menu.querySelectorAll('[aria-haspopup="menu"]').forEach(f=>f.setAttribute("aria-expanded","false"))};if(a.children){const f=d.createElement("span");f.className="submenu-arrow",f.textContent="›",f.setAttribute("aria-hidden","true"),i.appendChild(f),i.setAttribute("aria-label",a.text),i.setAttribute("aria-haspopup","menu"),i.setAttribute("aria-expanded","false");const p=d.createElement("div");p.className="menu-submenu",p.style.display="none",p.setAttribute("aria-label",a.text);for(const h of a.children){const x=d.createElement("button"),w=d.createElement("span");w.textContent=h.icon||"▸";const y=d.createElement("span");y.textContent=h.text,x.append(w,y),x.onclick=()=>{Cn(),Jt(),h.run()},p.appendChild(x)}const g=()=>{u(),p.style.display="",i.setAttribute("aria-expanded","true");const h=m.menu.getBoundingClientRect(),x=i.getBoundingClientRect(),w=p.offsetWidth,y=p.offsetHeight,j=h.right+w>innerWidth-8?h.left-w+1:h.right-1;p.style.left=Math.max(8,j)-h.left-m.menu.clientLeft+"px",p.style.top=Math.max(8,Math.min(x.top,innerHeight-y-8))-h.top-m.menu.clientTop+"px"};i.onmouseenter=g,i.onclick=g,i.onkeydown=h=>{h.key==="ArrowRight"&&(h.preventDefault(),g(),p.querySelector("button").focus())},p.onkeydown=h=>{h.key==="ArrowLeft"&&(h.preventDefault(),u(),i.focus())},m.menu.append(i,p)}else i.onmouseenter=u,i.onclick=()=>{Cn(),Jt(),a.run()},m.menu.appendChild(i);a.tip&&mo(i,a.tip)}m.menu.style.display="",m.menu.style.left=Math.min(e,innerWidth-m.menu.offsetWidth-8)+"px",m.menu.style.top=Math.min(t,innerHeight-m.menu.offsetHeight-8)+"px"}const Cn=()=>{Co++,m.menu.style.display="none"};function Jr(e,t,n){const o=d.createElement("button");o.className="tcap";const r=d.createElement("span");r.textContent=e;const a=d.createElement("i");return a.textContent="▴",o.append(r,a),o.title=t+" —— 点击换",o.onclick=i=>{i.stopPropagation();const s=o.getBoundingClientRect();Nt(s.left,s.bottom+4,t,n());const c=m.menu;s.bottom+c.offsetHeight+12>innerHeight&&(c.style.top=Math.max(48,s.top-c.offsetHeight-8)+"px")},o}function Rs(){const e=(o,r,a,i)=>{const s=d.createElement("button");s.className="dockb",s.title=a;const c=d.createElement("span");c.textContent=o;const u=d.createElement("span");return u.textContent=r,s.append(c,u),s.onmousedown=f=>f.stopPropagation(),s.onclick=f=>{f.stopPropagation(),i(s)},s},t=o=>()=>{if(!l)return;const r=ia();xn(o,r.x,r.y)},n=()=>{const o=d.createElement("div");return o.className="sep",o};m.dock.innerHTML="",m.dock.append(e("↥","上传","选一个图片/视频文件，放进一个素材节点 —— 再把它的出口拖到别的节点上就能反复用",kl),n(),e("T","文本","新建一个文本节点：存一段字，连到生成节点就并进提示词",t("card_text")),e("▧","图片","新建一个生图节点（默认文生图，玩法在参数面板左下角换）",t("card_image")),e("▷","视频","新建一个生视频节点（默认图生视频，玩法在参数面板左下角换）",t("card_video")),e("◇","工具箱","新建工具箱节点（玩法在参数面板左下角切换）",t("card_tools")))}const di={video:"放大播放",audio:"放大播放"};let Ae=null;function _o(){Ae?.image&&(Ae.image.style.transform=`translate3d(${Ae.x}px, ${Ae.y}px, 0) scale(${Ae.scale})`)}function Os(){Ae?.image&&(Ae.scale=1,Ae.x=0,Ae.y=0,_o())}function As(e){Ae.image=e,Ae.scale=1,Ae.x=0,Ae.y=0,e.classList.add("vimage"),e.title="滚轮缩放 · 拖拽平移 · 双击还原",_o(),e.addEventListener("wheel",o=>{if(!Ae||Ae.image!==e)return;o.preventDefault();const r=Ae.scale,a=Math.min(8,Math.max(.2,r*Math.exp(-o.deltaY*.0015)));if(a===r)return;const i=e.getBoundingClientRect(),s=a/r;Ae.x+=(o.clientX-(i.left+i.width/2))*(1-s),Ae.y+=(o.clientY-(i.top+i.height/2))*(1-s),Ae.scale=a,_o()},{passive:!1});let t=null;e.addEventListener("pointerdown",o=>{o.button!==0||!Ae||Ae.image!==e||(o.preventDefault(),t={id:o.pointerId,mx:o.clientX,my:o.clientY,x:Ae.x,y:Ae.y},e.setPointerCapture(o.pointerId),e.classList.add("panning"))}),e.addEventListener("pointermove",o=>{!t||o.pointerId!==t.id||!Ae||Ae.image!==e||(Ae.x=t.x+o.clientX-t.mx,Ae.y=t.y+o.clientY-t.my,_o())});const n=o=>{!t||o.pointerId!==t.id||(t=null,e.classList.remove("panning"),e.hasPointerCapture(o.pointerId)&&e.releasePointerCapture(o.pointerId))};e.addEventListener("pointerup",n),e.addEventListener("pointercancel",n),e.ondblclick=o=>{o.preventDefault(),Os()}}function Xr(){m.vbox.innerHTML="",m.view.style.display="none",Ae=null}function Yr(e,t=0,n=null,o=void 0){const r=n||e.outputs||[];if(!r.length){ee("这个节点还没有产物，先运行一次");return}Ae={outs:r,idx:Math.min(Math.max(t,0),r.length-1),seed:o!==void 0?o:e?e.seed:null},ci(),m.view.style.display=""}function pi(e){if(!Ae)return;const t=Ae.outs.length;t<2||(Ae.idx=(Ae.idx+e+t)%t,ci())}function ci(){const{outs:e,idx:t,seed:n}=Ae,o=e[t];Ae.image=null,Ae.scale=1,Ae.x=0,Ae.y=0;const r=d.createElement("div");r.className="vinfo";const a=[o.filename];e.length>1&&a.unshift(`${t+1} / ${e.length}`),n!=null&&a.push("seed "+n);const i=()=>r.textContent=a.join("　·　");let s;if(o.kind==="video"){s=d.createElement("video"),s.controls=s.autoplay=s.loop=!0;const u=()=>{const f=s.play();f&&typeof f.catch=="function"&&f.catch(()=>{})};s.readyState>=3?u():s.addEventListener("canplay",u,{once:!0}),Gr(s,o.url),s.onloadedmetadata=()=>{a.splice(a.indexOf(o.filename)+1,0,`${s.videoWidth}×${s.videoHeight}`,ui(s.duration)),i()}}else o.kind==="audio"?(s=d.createElement("audio"),s.src=o.url,s.controls=s.autoplay=!0,s.onloadedmetadata=()=>{a.splice(a.indexOf(o.filename)+1,0,ui(s.duration)),i()}):(s=d.createElement("img"),s.src=o.url,a.push("滚轮缩放 · 拖拽平移 · 双击还原"),s.onload=()=>{a.splice(a.indexOf(o.filename)+1,0,`${s.naturalWidth}×${s.naturalHeight}`),i()},As(s));s.draggable=!1,i();const c=d.createElement("button");if(c.className="vx",c.textContent="✕",c.title="关闭 (Esc)",c.onclick=Xr,m.vbox.innerHTML="",m.vbox.append(s,r,c),e.length>1)for(const[u,f,p]of[["p","‹",-1],["n","›",1]]){const g=d.createElement("button");g.className="vnav "+u,g.textContent=f,g.title=p<0?"上一张 (←)":"下一张 (→)",g.onclick=()=>pi(p),m.vbox.appendChild(g)}}function ui(e){if(!isFinite(e))return"时长未知";const t=Math.round(e);return`${Math.floor(t/60)}:${String(t%60).padStart(2,"0")}`}const la=e=>on()&&!e.locked&&!e.readonly&&!e.read_only&&["card_image","card_video"].includes(e.type)&&ge(e)?.kind==="gen";async function Fs(e){const t=l?.id,n=e.id;if(!la(e))return ee("此节点或画布不可加入导演台");try{if(await Yn(t),e=l?.cards.find(i=>i.id===n),!e||!la(e))throw new Error("节点已删除、锁定或不可操作");let o=Ro(e);if(!o){_t++;try{const i=await Vt(`/api/projects/${encodeURIComponent(t)}/director/import`,{rev:l.director?.rev||0,canvas_rev:l.rev||0,cards:[n]});if(l?.id!==t)throw new Error("画布已切换");if(o=Ro(e,i.project),!o)throw new Error("导入接口未返回关联镜头");yo(i.project)}finally{_t=Math.max(0,_t-1),ea()}}const r=`/director?project=${encodeURIComponent(t)}&shot=${encodeURIComponent(o.id)}`;ne.open(r,"_blank","noopener"),ee("导演镜头已就绪");const a=d.createElement("a");a.href=r,a.target="_blank",a.rel="noopener",a.textContent="打开导演镜头",m.toast.append(" · ",a)}catch(o){$e("导演台操作失败："+o.message)}}function qs(e,t,n){if(!he())return Nt(e,t,fe(n),[{text:"复制节点",run:()=>or(n)},...(n.outputs||[]).length?[{text:"预览产物",run:()=>Yr(n)}]:[]]);const o=ge(n),r={icon:"✎",text:B.size>1&&B.has(n.id)?`批量重命名（${B.size} 个节点）`:"重命名节点",run:()=>da(n)};if(ht(n)){const u=l.edges.filter(f=>f.from===n.id&&Ke(f)).length;return Nt(e,t,n.name||"风格化提示词",[r,{icon:"⧉",text:"就地复制一张",run:()=>So(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>or(n)},...u?[{icon:"⊘",text:`解除挂着的 ${u} 个节点`,run:()=>{l.edges=l.edges.filter(f=>!(f.from===n.id&&Ke(f))),Ge(),Ot(),oe&&Ce(oe),X()}}]:[],...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>Eo(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>Kr(n.id)}])}if(Ht(n))return Nt(e,t,n.name||fe(n),[...v(n)?[{icon:"↑",text:"运行（加工文本）",run:()=>Oo(n)}]:[],r,{icon:"⧉",text:"就地复制一张",run:()=>So(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>or(n)},...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>Eo(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>Kr(n.id)}]);if(ft(n)){const u=gn(n);return Nt(e,t,n.name||fe(n),[...u?[{icon:"⛶",text:di[u.kind]||"查看大图",run:()=>eo(u)}]:[],...u?[{icon:"⬇",text:`下载${He[u.kind]||"文件"}`,run:()=>Vr(u)}]:[],{icon:"📁",text:"选择 / 换文件",run:()=>Io(n)},r,{icon:"⧉",text:"就地复制一张",run:()=>So(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>or(n)},...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>Eo(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>Kr(n.id)}])}const a=n.outputs||[],i=a[0],s=a.length>1?`逐张看大图（${a.length} 张）`:di[i&&i.kind]||"查看大图",c=a.length>1?`下载全部 ${a.length} 张${i.kind==="video"?"视频":i.kind==="audio"?"音频":"图片"}`:`下载${i?.kind==="video"?"视频":i?.kind==="audio"?"音频":"图片"}`;Nt(e,t,n.name||(o?o.name:"节点"),[...!C&&la(n)?[{text:Ro(n)?"查看导演镜头":"加入导演台",run:()=>Fs(n)}]:[],...i?[{icon:"⛶",text:s,run:()=>Yr(n)}]:[],...i?[{icon:"⬇",text:c,run:()=>a.forEach(u=>Vr(u))}]:[],r,{icon:"↑",text:"运行",run:()=>Oo(n)},{icon:"⧉",text:"就地复制一张",run:()=>So(n)},{icon:"⎘",text:"复制，等下粘贴（Ctrl+C）",run:()=>or(n)},...n.w||n.h?[{icon:"⤡",text:"恢复默认大小",run:()=>Eo(n)}]:[],{icon:"✕",text:"删除节点（Delete）",danger:!0,run:()=>Kr(n.id)}])}function Vr(e){const t=d.createElement("a");t.href=e.url,t.download=e.filename.split(/[\\/]/).pop()||"download",d.body.appendChild(t),t.click(),t.remove()}function Eo(e){Le()&&(delete e.w,delete e.h,Tn(e),Ge(),bt(),X())}function da(e){if(!e||!Le())return;if(B.size>1&&B.has(e.id)){const o=l.cards.filter(r=>B.has(r.id)).sort((r,a)=>r.y-a.y||r.x-a.x);if(o.length>1)return Ds(o)}const t=ge(e),n=prompt("节点名字（留空恢复成工作流名）",e.name||(t?t.name:""));n!==null&&fi([{card:e,name:n}])}function Ds(e){const t=l,n=d.createElement("dialog");n.className="auth-dialog rename-dialog";const o=d.createElement("form"),r=d.createElement("h2");r.id="rename-heading",r.textContent=`批量重命名（${e.length} 个节点）`,n.setAttribute("aria-labelledby",r.id);const a=d.createElement("p");a.className="auth-note",a.textContent="按画布从上到下、从左到右排列。一次填好各节点名称后统一确认；留空恢复默认名称。";const i=d.createElement("div");i.className="rename-list";const s=e.map((p,g)=>{const h=d.createElement("label");h.className="fld";const x=d.createElement("span");x.textContent=`${g+1}. ${fe(p)}`;const w=d.createElement("input");return w.type="text",w.maxLength=40,w.value=fe(p),w.placeholder=fe({...p,name:null}),h.append(x,w),i.appendChild(h),{card:p,input:w}}),c=d.createElement("footer"),u=d.createElement("button");u.type="button",u.className="btn",u.textContent="取消";const f=d.createElement("button");f.type="submit",f.className="btn primary",f.textContent="确认重命名",c.append(u,f),o.append(r,a,i,c),n.appendChild(o),u.onclick=()=>n.close(),n.addEventListener("close",()=>n.remove()),n.addEventListener("keydown",p=>p.stopPropagation()),o.onsubmit=p=>{p.preventDefault(),l===t&&Le()&&fi(s.map(({card:g,input:h})=>({card:g,name:h.value}))),n.close()},d.body.appendChild(n),n.showModal(),s[0].input.focus(),s[0].input.select()}function fi(e){const t=e.map(({card:o,name:r})=>({card:o,name:r.trim().slice(0,40)||null})).filter(({card:o,name:r})=>l.cards.includes(o)&&r!==(o.name||null)&&!(r&&r===fe(o)));if(!t.length)return;const n=new Map;for(const{card:o,name:r}of t){const a=fe(o),i=fe({...o,name:r});a!==i&&n.set(`@${a}`,`@${i}`)}if(n.size){const o=[...n.keys()].sort((a,i)=>i.length-a.length).map(a=>a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")),r=new RegExp(`(?:${o.join("|")})(?![\\u4e00-\\u9fa5\\w])`,"g");for(const a of l.cards){for(const i of N(ge(a))){const s=a.params?.[i.key];typeof s=="string"&&(a.params[i.key]=s.replace(r,c=>n.get(c)))}for(const i in a.opt||{})typeof a.opt[i]=="string"&&(a.opt[i]=a.opt[i].replace(r,s=>n.get(s)))}}for(const{card:o,name:r}of t)o.name=r,Gt(o);oe&&En(oe),X()}function So(e){if(Le())return xi(bi(e),{x:e.x+24+V/2,y:e.y+28+40})}function pa(e,t){if(!l||!e?.id)return;const n=l.cards.find(o=>o.id===e.id);if(n)for(const o of["created_by","created_by_name","created_at"])e[o]!==void 0&&(n[o]=e[o]);else{const o=JSON.parse(JSON.stringify(e));Mo(o),l.cards.push(o),m.world.appendChild(ta(o)),Ge(),$r(),Ur(),m.hint.textContent=`${l.cards.length} 个节点`,ee(`${o.created_by_name||"协作者"} 添加了「${o.name||"新节点"}」`)}Number.isFinite(t)&&(l.rev=Math.max(l.rev||0,t))}function mi(e,t,n,o){return F((async()=>{const r=()=>l===e&&he();if(!r())return null;for(;;){const i=Ue.pendingChain;if(await i,!r())return null;if(i===Ue.pendingChain)break}const a=xn("card_asset",n,o,null,!1);return!a||(At(a.id),await ro(a,t),!await a._create||!r()||!e.cards.includes(a))?null:a})())}function Bs(e,t){if(!l||e.id!==l.id)return;const n=t.id,o=l.edges.filter(p=>p.from===n||p.to===n),r=(l.groups||[]).filter(p=>p.cards.includes(n)),a=(e.cards||[]).find(p=>p.id===n);if(a)for(const p of["created_by","created_by_name","created_at"])t[p]=a[p];const i=(e.cards||[]).filter(p=>p.id!==n);i.push(t);const s=e.edges||[],c=new Set(s.map(p=>JSON.stringify(p)));for(const p of o){const g=JSON.stringify(p);c.has(g)||(s.push(p),c.add(g))}const u=(e.groups||[]).filter(p=>!p.cards.includes(n));u.push(...r);const f=m.panel.style.display!=="none";Object.assign(l,e,{cards:i,edges:s,groups:u}),qt&&qt.rev<=l.rev&&(qt=null),nr(),f&&oe&&Ce(oe)}function Us(e){!l||e.created_by||(l.cards=l.cards.filter(t=>t!==e),l.edges=l.edges.filter(t=>t.from!==e.id&&t.to!==e.id),l.groups=(l.groups||[]).map(t=>({...t,cards:t.cards.filter(n=>n!==e.id)})).filter(t=>t.cards.length),B.delete(e.id),oe===e.id&&(oe=null,rn()),nr())}function Hs(e,t=!1){const n=l,o=n.id;return Ue.enqueueCardCreate(async()=>{try{const r=await Vt(`/api/projects/${encodeURIComponent(o)}/cards`,{card:Ko(e)});if(t){if(l!==n||!n.cards.includes(e))return!1;const a=r.project.cards.find(i=>i.id===e.id);pa(a,r.project.rev)}else{if(l?.id!==o)return!1;if(!n.cards.includes(e)){const a=r.project.cards.find(i=>i.id===e.id);return n.cards.some(i=>i.id===e.id)?pa(a,r.project.rev):l.rev=Math.max(l.rev||0,r.project.rev||0),!1}Bs(r.project,e)}return!0}catch(r){(t?l===n:l?.id===o)&&(Ue.markWorkFailure(r),Us(e),$e("卡片添加失败："+r.message))}})}function xn(e,t,n,o,r=!0){if(!Le())return null;const a=un(e);if(!a||!a.modes||!a.modes.length)return $e(`节点类型 ${e} 不可用：找不到定义或没有模式`),null;const i={id:Bt(),type:e,cap:o||jt(a.modes[0]),x:Math.round(t),y:Math.round(n),params:{},assets:{},status:null,progress:0,outputs:[]},c=l.cards.filter(f=>Et(f)===a).reduce((f,p)=>{if(!p.name)return f;const g=p.name.match(/^(.+?)(\d+)$/);return g?Math.max(f,parseInt(g[2],10)):f},0),u=a.name||a.modes[0].name;return i.name=`${u}${c+1}`,Zo(),l.cards.push(i),m.world.appendChild(ta(i)),r&&At(i.id),Ge(),i._create=Hs(i,!r),queueMicrotask(xo),i}function Kr(e){return hi([e])}function hi(e){if(!l||!Le())return 0;const t=new Set(e),n=new Set(l.cards.filter(o=>t.has(o.id)).map(o=>o.id));if(!n.size)return 0;Hn(l.edges.filter(o=>n.has(o.from))),l.cards=l.cards.filter(o=>!n.has(o.id)),l.edges=l.edges.filter(o=>!n.has(o.to));for(const o of n)B.delete(o);if(l.groups){for(const o of l.groups)o.cards=o.cards.filter(r=>!n.has(r));l.groups=l.groups.filter(o=>o.cards.length)}return n.has(oe)&&(oe=null,rn()),Jt(),n.has(m.hist._id)&&Xn(),Xt=null,nr(),X(),n.size}function gi(e){if(!l||!Le()||!e||tt(e.id)!==e)return;const t=l,n=e.id,o=fe(e),r=(e.history||[]).length,a=(e.outputs||[]).length||r;confirm(`删除「${o}」？
`+(a?`它有 ${r} 轮生成记录或产物，节点内记录删除后无法恢复。
`:"")+"相关连线会一并移除，此操作不能撤销；不会删除素材文件。")&&(l!==t||!he()||tt(n)!==e||Kr(n)&&ee(`已删除「${o}」`))}let Wn=null,jr=null,ca=0;function ua(e){return JSON.parse(JSON.stringify({id:e.id,type:e.type,cap:e.cap,name:e.name||null,w:e.w,h:e.h,x:e.x,y:e.y,params:e.params||{},assets:e.assets||{},outputs:e.outputs||[],opt:e.opt,optUse:e.optUse,optStyles:e.optStyles}))}function bi(e){const t=l.edges.filter(o=>o.to===e.id&&o.from!==e.id&&tt(o.from)).map(o=>Ke(o)?{...o}:{...o,slots:bn(o)});for(const[o,r]of Object.entries(e.assets||{})){if(!r||t.some(s=>!Ke(s)&&s.slots.includes(o)))continue;const a=typeof r=="string"?[r]:[r.ref,r.url].filter(Boolean),i=l.cards.find(s=>s.id!==e.id&&(s.outputs||[]).some(c=>a.some(u=>u===c.ref||u===c.url)));i&&t.push({from:i.id,to:e.id,slot:o,slots:[o]})}const n=[...new Set(t.map(o=>o.from))].map(o=>{const r=tt(o),a=ua(r);if(!ut(r)){const i=t.filter(c=>c.from===o&&!Ke(c)).flatMap(c=>c.slots.map(u=>{const f=e.assets?.[u];return f&&typeof f=="object"?f:a.outputs.find(p=>f&&(p.ref===f||p.url===f))}).filter(Boolean)),s=[...new Map(i.map(c=>[c.ref||c.url||JSON.stringify(c),c])).values()];Object.assign(a,{type:"card_asset",cap:"asset",name:fe(r),params:{},assets:{},outputs:s.length?s:a.outputs})}return a});return JSON.parse(JSON.stringify({...ua(e),sourceProject:l.id,references:{cards:n,edges:t}}))}function or(e){const t=!e||B.has(e.id)?l.cards.filter(n=>B.has(n.id)):[e];t.length&&(Wn=t.map(bi),ca=0,ee(t.length>1?`已复制 ${t.length} 个节点 · Ctrl / Cmd + V 批量粘贴`:`已复制「${fe(t[0])}」${Wn[0].outputs.length?"（包含当前产物）":""} · Ctrl / Cmd + V 粘贴`))}function Ws(e,t){const n=Array.isArray(e)?e:[e],o=n[0],r=o.sourceProject&&o.sourceProject!==l.id,a=new Set(n.map(h=>h.id)),i=new Map,s=n.flatMap(h=>h.references?.edges||[]);if(r)for(const h of n)for(const x of h.references?.cards||[]){if(a.has(x.id))continue;const w=i.get(x.id);w?w.outputs=[...new Map([...w.outputs||[],...x.outputs||[]].map(y=>[y.ref||y.url||JSON.stringify(y),y])).values()]:i.set(x.id,{...x})}if([...n,...i.values()].some(h=>!T.some(x=>x.id===h.type)))throw new Error("这种节点在当前版本里不存在了，粘不了");const c=(h,x,w)=>{const y=xn(h.type,x,w,h.cap,!1);return y?(Object.assign(y,{...ua(h),id:y.id,x:y.x,y:y.y,status:h.outputs?.length?"done":null}),Gt(y),Tn(y),Qe(y),Mt(y),Mi(y),y):null},u=t.x-V/2-o.x,f=t.y-40-o.y,p=new Map,g=[];for(const h of[...n,...i.values()]){const x=c(h,h.x+u,h.y+f);x&&(p.set(h.id,x.id),a.has(h.id)&&g.push(x))}for(const h of s){const x=p.get(h.from)||!r&&h.from,w=p.get(h.to);x&&w&&tt(x)&&l.edges.push({...JSON.parse(JSON.stringify(h)),from:x,to:w})}if(!g.length)return null;if(g.length===1)At(g[0].id);else{oe=null,Xt=null,B=new Set(g.map(h=>h.id)),rn(),Xn();for(const h of l.cards)h._el?.classList.toggle("sel",B.has(h.id));kn()}return Ge(),Ot(),X(),ee(g.length>1?`已粘贴 ${g.length} 个节点`:`已粘贴「${fe(g[0])}」`),g.length===1?g[0]:g}function xi(e,t){const n=l;return F((async()=>{try{let o=Array.isArray(e)?e:[e];if(o[0].sourceProject&&o[0].sourceProject!==n.id){const r=o.length>1,a=await Vt(`/api/projects/${encodeURIComponent(n.id)}/copy`,{source_project:o[0].sourceProject,card:r?{cards:o}:o[0]});if(!a.card||r&&!Array.isArray(a.card.cards))throw new Error("复制接口未返回节点");o=r?a.card.cards:[a.card]}for(;;){const r=Ue.pendingChain;if(await r,!he()||l!==n)throw new Error("画布已切换或权限已变化，未粘贴");if(r===Ue.pendingChain)break}return Ws(o,t)}catch(o){$e(`粘贴失败：${o.message}`)}})())}function fa(){if(!Le())return;if(!Wn)return ee("还没复制东西：先选中节点，Ctrl / Cmd + C");const e=Wn[0],t=jr||{x:e.x+V/2+24*++ca,y:e.y+40+28*ca};return xi(Wn,t)}const ma={png:"image",jpg:"image",jpeg:"image",webp:"image",gif:"image",bmp:"image",mp4:"video",webm:"video",mkv:"video",mov:"video",avi:"video"},yi={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif","image/bmp":"bmp","video/mp4":"mp4","video/webm":"webm","video/x-matroska":"mkv","video/quicktime":"mov","video/x-msvideo":"avi"};let ha=Promise.resolve();function ga(e){return ma[/\.([a-z0-9]+)$/i.exec(e.name||"")?.[1].toLowerCase()]||ma[yi[e.type]]||null}function ba(){if(!l||m.panel.style.display==="none"||m.panel.style.visibility==="hidden"||m.view.style.display!=="none"||d.querySelector("dialog[open]"))return null;const e=C?Br():tt(m.panel._id);return e&&e.id===m.panel._id?e:null}function $o(e,t){if(ut(e)||ft(e))throw new Error("当前节点不接收图片 / 视频引用，请先打开生成或工具节点的参数面板");const n=Et(e),o=ge(e),r=Ho(e,t);let a=e.cap;if(r)a=r.cap;else if(n?.id==="card_image"&&t==="image"&&["zimage_t2i","krea2_t2i"].includes(a))a=a.replace("_t2i","_i2i");else if(n?.id==="card_video"&&t==="video"&&!o?.inputs.some(g=>g.type===t)){const g=n.modes.find(h=>jo(h,t));g&&(a=jt(g))}const i=l.edges.filter(g=>g.to===e.id&&!Ke(g));if(a!==e.cap&&(Object.values(e.assets||{}).some(Boolean)||i.length))throw new Error("引用此素材需要切换模式；为保留已有引用，请先手动选择对应模式");const s=q[a],c=s?.inputs.filter(g=>g.type===t)||[],u=Jn(s,t),f=g=>!!e.assets?.[g.key]||i.some(h=>bn(h).includes(g.key)),p=c.find(g=>!f(g));if(!p||c.filter(f).length>=u)throw new Error(c.length?`${He[t]}引用已满，不会覆盖已有素材`:`当前节点没有可接收的${He[t]}槽位`);return{cap:a,slot:p}}async function Js(e,t,n){let o=n.cap;const r=()=>l===t&&on()&&t.cards.includes(n)&&ba()===n&&n.cap===o;try{if(!r())return;if(!un("card_asset"))throw new Error("找不到素材节点定义");const a={...n,assets:{...n.assets}};for(const i of e){const s=$o(a,ga(i));a.cap=s.cap,a.assets[s.slot.key]=!0}for(const i of e){if(!r())return;const s=ga(i);$o(n,s);const c=/\.([a-z0-9]+)$/i.exec(i.name||"")?.[1].toLowerCase(),u=ma[c]?i:new File([i],`${i.name||"剪贴板素材"}.${yi[i.type]}`,{type:i.type}),f=await It(u,ge(n)?.execution==="browser");if(!r())return;if(f.kind!==s)throw new Error("上传素材类型不匹配，未创建节点或引用");for(;;){const x=Ue.pendingChain;if(await x,!r())return;if(x===Ue.pendingChain)break}$o(n,s);const p=ia(),g=xn("card_asset",p.x,p.y,null,!1);if(!g||(await ro(g,f,!1),!await g._create))return;if(!r()||!t.cards.includes(g)){l===t&&ee("素材已导入，但当前节点已改变，未添加引用");return}const h=$o(n,s);h.cap!==n.cap&&(Et(n)?.id==="card_image"?(tr(n,h.cap),n._model||(n._model=h.cap.startsWith("krea2")?"krea2":"zimage")):n.cap=h.cap,o=n.cap,Gt(n)),n.assets[h.slot.key]=JSON.parse(JSON.stringify(g.outputs[0])),Bn(n),t.edges.push({from:g.id,to:n.id,slot:h.slot.key,slots:[h.slot.key]}),Ge(),Ot(),Mt(n),Ce(n.id),X(),ee(`已导入${He[s]}素材并引用到「${fe(n)}」的${ln(h.slot,n)}`)}}catch(a){l===t&&$e("剪贴板导入失败："+a.message)}}function Xs(e){if(e.defaultPrevented||d.querySelector("dialog[data-image-composer][open]"))return;const t=ba();if(!t)return;const n=e.clipboardData,o=[...n?.items||[]].filter(i=>i.kind==="file").map(i=>i.getAsFile()).filter(Boolean),r=o.length?o:[...n?.files||[]];if(r.length){if(e.preventDefault(),!on())return ee("此画布只读或已锁定，不能导入剪贴板素材");const i=r.filter(c=>ga(c));if(!i.length)return ee("剪贴板仅支持图片或视频文件");const s=l;ha=ha.then(()=>Js(i,s,t)),F(ha);return}e.target.closest("input,textarea,select")||e.target.isContentEditable||C||(Wn?(e.preventDefault(),fa()):n?.types.length&&ee("剪贴板未提供可读取的图片 / 视频文件；复制路径不能导入，请拖入文件或上传"))}function Jn(e,t){if(!e)return 0;const n=e.slotLimits&&e.slotLimits[t]&&e.slotLimits[t].max;return n??e.inputs.filter(o=>o.type===t).length}function wi(e,t){const n=ge(e);return n?n.inputs.filter(o=>o.type===t&&(e.assets||{})[o.key]).length:0}function Ys(e,t){const n=ge(e);if(!n)return null;const o=new Set((l?.edges||[]).filter(r=>r.to===e.id&&!Ke(r)).flatMap(bn));return Ve(e)&&(!Jn(n,t)||wi(e,t)>=Jn(n,t))?null:n.inputs.find(r=>r.type===t&&!e.assets?.[r.key]&&!o.has(r.key))||null}function xa(e,t){if(!Le()||e.id===t.id)return;if(Ht(t)){if(!tn(e))return ee(`「${fe(e)}」手里还没有字：先写一段，或先运行它`);if(l.edges.some(a=>a.from===e.id&&a.to===t.id&&a.slot===Dn))return ee("已经接过了");l.edges.push({from:e.id,to:t.id,slot:Dn}),Ge(),Ot(),oe===t.id&&Ce(t.id),X();const r=z(t).length;ee(`已把「${fe(e)}」的文本接给「${fe(t)}」（第 ${r} 段输入）`);return}if(ht(t))return ee("风格节点不收输入：它把字写给生成节点用");if(!N(ge(t)).length)return ee(`「${fe(t)}」不写提示词，接文本节点没有用`);if(!tn(e))return ee(`「${fe(e)}」手里还没有字：先写一段，或先运行它`);if(l.edges.some(r=>r.from===e.id&&r.to===t.id&&r.slot===er))return ee("已经挂上了");l.edges.push({from:e.id,to:t.id,slot:er}),Ge(),Ot(),oe===t.id&&Ce(t.id),X();const o=Me(e).length;ee(`文本已挂给「${fe(t)}」`+(o?`，下游 ${o} 个节点也跟着带`:""))}async function vi(e,t){if(!Le()||!t)return;if(ut(e))return xa(e,t);if(ut(t))return ee("文本节点不收图片/视频素材：把文本节点的出口拖过来才是接文本");if(ft(t))return ee("素材节点不收输入：它是把手里那份素材送给别的节点的");const n=e.outputs||[],o=n[0];if(!o)return ee(ft(e)?"这个素材节点还是空的：先点它选个文件":"上游还没有产物，先运行它");const r=Et(t);let a=!1;r&&r.id==="card_image"&&o.kind==="image"&&(t.cap==="zimage_t2i"?(tr(t,"zimage_i2i"),t._model||(t._model="zimage"),Gt(t),a=!0):t.cap==="krea2_t2i"&&(tr(t,"krea2_i2i"),t._model||(t._model="krea2"),Gt(t),a=!0));const i=ge(t);if(r&&r.id==="card_video"&&o.kind==="video"&&!Ve(t)&&!(i&&i.inputs.some(f=>f.type==="video"))){const f=r.modes.find(p=>jo(p,"video"));f&&(Hn(l.edges.filter(p=>p.to===t.id&&!Ke(p))),t.assets={},t.cap=jt(f),Gt(t),a=!0)}const s=Ho(t,o.kind);s&&(Hn(l.edges.filter(f=>f.to===t.id)),t.cap=s.cap,t.assets={},Gt(t));const c=s?{key:s.slot,label:He[o.kind]||"素材"}:Ys(t,o.kind);if(!c){const f=Jn(ge(t),o.kind);return ee(f&&wi(t,o.kind)>=f?`${He[o.kind]||o.kind}引用已达上限 ${f}`:`下游节点没有可接收的${He[o.kind]||o.kind}槽位`)}s||Hn(l.edges.filter(f=>f.to===t.id&&bn(f).includes(c.key)));const u={from:e.id,to:t.id,slot:c.key,slots:Qa(t,c.key,n)};l.edges.push(u),Hr(t),Ge(),Ot();try{const f=nt(t).length&&N(ge(t)).length,p=Jn(ge(t),o.kind);ee(`引用上游产物 → ${ln(c,t)}`+(p?`（上限 ${p}）`:"")+(f?"；上游的风格也跟着传下来了":""));for(let g=0;g<u.slots.length;g++){const h=n[g];if(!h)break;const x=ge(e)?.execution==="browser"&&h.ref?.startsWith("chouka/"),w=ft(e)||x?JSON.parse(JSON.stringify(h)):await ya(h,ge(t)?.execution==="browser");if(!l||!l.edges.includes(u))return;t.assets[u.slots[g]]=w}Bn(t),Mt(t),Ge(),(a||oe===t.id)&&Ce(t.id),X()}catch(f){l?.edges.includes(u)&&(Hn([u]),Hr(t),Ge(),Ot(),oe===t.id&&Ce(t.id)),X(),$e("引用失败："+f.message)}}function jo(e,t){if(e.route)return!!e.route[t];const n=q[jt(e)];return!!n&&n.inputs.some(o=>o.type===t)}async function Vs(e,t,n,o){if(!Le())return;const r=[["card_text","文本"],["card_image","图片"],["card_video","视频"],["card_tools","工具箱"]],a=(e.outputs||[]).length,i=(e.outputs||[])[0]?.kind||(ge(e)||Et(e)||{}).outputType;console.log("[spawnDownstream] 上游产物:",{outputCount:a,outputKind:i,fromId:e.id});const s=g=>{const h=[];for(const[x,w]of r){const y=T.find(J=>J.id===x);if(!y||!y.modes.length)continue;let j=null;a>1&&i&&(j=y.modes.find(J=>{if(!g(J))return!1;const We=jt(J),mt=q[We];if(!mt)return!1;const Je=mt.images||0,Ne=mt.videos||0,xt=mt.audios||0;return console.log("[spawnDownstream] 检查模式:",{mode:J,capId:We,imgCount:Je,vidCount:Ne,audCount:xt,outputCount:a,outputKind:i}),i==="image"&&Je===a?(console.log("[spawnDownstream] ✓ 找到匹配的图片模式:",We),!0):i==="video"&&Ne===a?(console.log("[spawnDownstream] ✓ 找到匹配的视频模式:",We),!0):i==="audio"&&xt===a?(console.log("[spawnDownstream] ✓ 找到匹配的音频模式:",We),!0):!1})),j||(j=y.modes.find(g)),j&&h.push({icon:y.icon,text:w,run:async()=>{const J=xn(y.id,t.x,t.y-40,jt(j));J&&(ut(e)?await xa(e,J):await vi(e,J))}})}return h};if(ut(e)){const g=T.find(x=>x.id==="card_text"),h=[];return g&&g.modes.length&&h.push({icon:g.icon,text:"文本节点（接住这段字当输入）",run:async()=>{const x=xn(g.id,t.x,t.y-40,jt(g.modes[0]));x&&await xa(e,x)}}),h.push(...s(x=>N(q[jt(x)]).length)),h.length?Nt(n,o,"把这段文本接给…",h):void 0}if(ft(e)){const g=gn(e);if(!g)return ee("这个素材节点还是空的：先点它选个文件");const h=s(w=>jo(w,g.kind)),x=He[g.kind]||g.kind;return h.length?Nt(n,o,`把这个${x}接给…`,h):ee(`没有节点收${x}素材`)}const c=(e.outputs||[])[0],u=c?c.kind:(ge(e)||Et(e)||{}).outputType;if(!u)return;const f=s(g=>jo(g,u)),p=He[u]||u;if(!f.length)return ee(`没有节点收${p}素材`);Nt(n,o,`把这个${p}接给…`,f)}async function ya(e,t=!1){const n=l;if(!he())throw new Error("此画布只读，不能导入素材");const o=await dt(new rt(e.url,location.href),{credentials:"same-origin"});if(!o.ok)throw new Error(`读取产物失败（${o.status}）`);const r=await o.blob();if(l!==n||!he())throw new Error("画布已切换或权限已变化，导入已取消");const a=e.filename||new rt(e.url,location.href).pathname.split("/").pop()||"历史产物",i=new File([r],a.split(/[\\/]/).pop(),{type:r.type});return It(i,t)}const ar=new Map;function Ks(e,t){if(t?.aborted)return Promise.reject(t.reason);const n=/^\/api\/upload\/([^/?#]+)$/.exec(e);if(!n)return Promise.resolve(e);if(!ar.has(e)){const a={controller:new AbortController,users:new Set,ready:!1};a.promise=(async()=>{const i=a.controller.signal;for(;;){i.throwIfAborted();const s=await vt(`/api/preview/${n[1]}`,{signal:i});if(i.throwIfAborted(),s.status==="ready")return a.ready=!0,s.url;if(s.status==="error")throw new Error(s.error);await new Promise((c,u)=>{const f=()=>{K(p),u(i.reason)},p=H(()=>{i.removeEventListener("abort",f),c()},1500);i.addEventListener("abort",f,{once:!0})})}})(),ar.set(e,a),a.promise.catch(()=>{ar.get(e)===a&&ar.delete(e)})}const o=ar.get(e),r={};return o.users.add(r),new Promise((a,i)=>{const s=()=>{t?.removeEventListener("abort",c),o.users.delete(r),!o.ready&&!o.users.size&&(ar.get(e)===o&&ar.delete(e),o.controller.abort())},c=()=>{s(),i(t.reason)};t?.addEventListener("abort",c,{once:!0}),o.promise.then(u=>{s(),a(u)},u=>{s(),i(u)})})}function Gr(e,t,n=()=>!0,o){if(e.playsInline=!0,!/^\/api\/upload\//.test(t)){e.src=t;return}e.dataset.previewOriginal=t;const r=e.getAttribute("poster"),a=e.title;let i;const s=(c,u)=>{e.dataset.previewState=c?"error":"processing",e.title=u;const f=c?["视频转码失败","修复转码后才能生成"]:["正在转码为 MP4","完成后可预览和生成"];e.poster=i="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#111318"/><g fill="#d1d5db" text-anchor="middle" font-family="sans-serif" font-size="25"><text x="320" y="168">${f[0]}</text><text x="320" y="208" font-size="19">${f[1]}</text></g></svg>`)};return s(!1,"服务器正在生成兼容 MP4；原片已备份，转码完成后下游节点使用 MP4 生成。"),Ks(t,o).then(c=>{e.dataset.previewOriginal!==t||!n()||(e.dataset.previewState="ready",e.title=a||"MP4 转码已完成，预览和后续生成均使用此版本；原片已备份。",e.getAttribute("poster")===i&&(r?e.poster=r:e.removeAttribute("poster")),e.src=c)}).catch(c=>{o?.aborted||e.dataset.previewOriginal!==t||!n()||(s(!0,c.message||"转码状态加载失败；请检查服务器后重试生成。"),e.removeAttribute("src"),e.load())})}function ki(e){e.querySelectorAll("video[data-video-url]").forEach(t=>{Gr(t,t.dataset.videoUrl)})}const _n=new Map;let Nr=null,No=null,Zr=null,wa=0,Qr=null;function va(){!_n.size||Qr!==null||(Qr=it(()=>{Qr=null,Ca()}))}ne.addEventListener("resize",va);function Ci(e){return/^\/api\/(upload|artifact)\//.test(e)?`/api/thumbnail?url=${encodeURIComponent(e)}`:null}function _i(e,t){t.controller?.abort(),t.blob&&rt.revokeObjectURL(t.blob),ir(e),e.tagName==="VIDEO"&&(e.pause(),e.removeAttribute("src"),e.load()),Nr?.unobserve(e),Zr?.unobserve(e),_n.delete(e)}function ka(){for(const[e,t]of _n)_i(e,t);Nr?.disconnect(),No?.disconnect(),Zr?.disconnect(),Nr=null,No=null,Zr=null,st(Qr),Qr=null}function Ca(){const e=m.stage.getBoundingClientRect(),t=ne.devicePixelRatio||1;for(const[n,o]of _n){if(!o.visible||!n.isConnected||o.project!==l||!k.active)continue;const r=n.getBoundingClientRect();if(r.right<=e.left-120||r.left>=e.right+120||r.bottom<=e.top-120||r.top>=e.bottom+120){o.controller?.abort();continue}if(o.fullURL&&!o.original&&Math.max(r.width,r.height)*t>512&&(o.url=o.fullURL,o.original=!0,o.done=!1,o.controller?.abort()),o.loading||o.done||wa>=4)continue;const a=new AbortController;o.controller=a,o.loading=!0,wa++,(async()=>{try{const i=await dt(o.url,{credentials:"same-origin",signal:a.signal});if(a.signal.aborted||_n.get(n)!==o||o.project!==l||!k.active)return;if(!i.ok)throw i.status===401&&await k.me(),[403,404].includes(i.status)&&ne.dispatchEvent(new CustomEvent("h3auth:denied",{detail:{path:"/api/thumbnail",method:"GET",error:{status:i.status}}})),new Error(`预览加载失败（${i.status}）；可双击查看原文件`);const s=await i.blob();if(a.signal.aborted||_n.get(n)!==o||!n.isConnected||o.project!==l||!k.active)return;const c=o.blob;o.blob=rt.createObjectURL(s),n.tagName==="VIDEO"?n.poster=o.blob:n.src=o.blob,c&&rt.revokeObjectURL(c),o.done=!0}catch(i){!a.signal.aborted&&_n.get(n)===o&&(o.done=!0,n.title=i.message)}finally{o.loading=!1,o.controller=null,wa--,Ca()}})()}}function Gs(e,t){const n=Ci(t);e.tagName==="VIDEO"?(e.dataset.videoUrl=t,e.preload="none",e.title="单击播放；双击放大查看原视频",e.poster="data:image/svg+xml;charset=utf-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="288"><rect width="512" height="288" fill="#111318"/><path d="M238 121v46l40-23z" fill="#b7bbc3"/></svg>')):(e.decoding="async",n&&(e.dataset.thumbnail="true")),Nr||(Nr=new Xe(o=>{for(const r of o){const a=_n.get(r.target);a&&(a.visible=r.isIntersecting,!a.visible&&a.loading&&a.controller?.abort())}Ca()},{root:m.stage,rootMargin:"120px"}),No=new Oe(()=>{for(const[o,r]of _n)o.isConnected||_i(o,r)}),No.observe(m.world,{childList:!0,subtree:!0}),Zr=new Re(va)),_n.set(e,{url:n||t,fullURL:n?e.tagName==="VIDEO"?`${n}&size=original`:t:null,original:!1,project:l,visible:!1,loading:!1,done:e.tagName==="VIDEO"&&!n}),Nr.observe(e),Zr.observe(e)}function Zs(e,t,n){for(const r of e.querySelectorAll("img, video")){const a=r.classList.contains("old")?n:t[+(r.dataset.i||0)]?.url;a&&Gs(r,a)}const o=e.querySelector("audio");o&&(o.src=t[0].url)}function ir(e){e._playRequest&&e.pause(),e._playRequest=null,e._previewController?.abort(),e._previewController=null}async function Qs(e){if(!e.isConnected||!k.active)return;for(const r of d.querySelectorAll("video"))ir(r);const t=l,n={},o=new AbortController;e._playRequest=n,e._previewController=o;try{if(e.getAttribute("src")||(e.preload="metadata",await Gr(e,e.dataset.videoUrl,()=>e._playRequest===n&&e.isConnected&&l===t&&k.active,o.signal)),e._playRequest!==n||!e.isConnected||l!==t||!k.active||e.dataset.previewState==="error")return;await e.play()}catch(r){!o.signal.aborted&&e._playRequest===n&&e.isConnected&&l===t&&(e.title=r.message||"视频暂时无法播放")}finally{e._previewController===o&&(e._previewController=null)}}function eo(e){Yr(null,0,[{url:e.url,kind:e.kind,filename:(e.origin||e.url).split(/[\\/]/).pop()}],null)}const Ei=20;function Mr(e,t){const n=e.outputs||[],o=Ve(e);if(!n.length&&!o)return;e.history=e.history||[];const r=e.history.find(a=>a.job===t.id);if(r){o&&Object.assign(r,{status:e.status,ms:e.ms??null,outputs:n});return}e.history.unshift({ts:Date.now(),job:t.id,seed:e.seed!=null?e.seed:null,cap:t.capability,ms:e.ms!=null?e.ms:null,outputs:n,...o?{status:e.status}:{},...t.prompts?{prompts:t.prompts.map(a=>({...a}))}:{}}),e.history.length>Ei&&(e.history.length=Ei)}function Mo(e){e.history||(e.history=(e.outputs||[]).length?[{ts:null,seed:e.seed!=null?e.seed:null,cap:e.cap,outputs:e.outputs}]:[])}function sr(e){if(!(e>0))return"";const t=Math.round(e/1e3);if(t<60)return`${t}秒`;const n=Math.floor(t/60);return n<60?`${n}分${t%60}秒`:`${Math.floor(n/60)}时${n%60}分`}function _a(e){if(!e)return"早前";const t=new Date(e),n=a=>String(a).padStart(2,"0"),o=new Date;o.setHours(0,0,0,0);const r=`${n(t.getHours())}:${n(t.getMinutes())}`;return e>=o.getTime()?r:`${n(t.getMonth()+1)}-${n(t.getDate())} ${r}`}function Xn(){m.hist.style.display="none",m.hist.innerHTML="",m.hist._id=null}function Si(e){return Math.max(240,Math.min(e,Math.min(720,innerWidth*.65)))}function el(){if(!m.hist||m.hist.style.display==="none")return;const e=m.hist.getBoundingClientRect().width,t=Si(e);t!==e&&m.hist.style.setProperty("--hist-width",`${t}px`)}function tl(e){const t=n=>{m.hist.style.setProperty("--hist-width",`${Si(n)}px`),bt(),Pt(),kn()};e.onpointerdown=n=>{if(n.button!==0)return;n.preventDefault();const o=n.clientX,r=m.hist.getBoundingClientRect().width;m.hist.classList.add("resizing"),e.setPointerCapture(n.pointerId),e.onpointermove=a=>t(r+o-a.clientX),e.onpointerup=e.onpointercancel=()=>{m.hist.classList.remove("resizing"),e.onpointermove=e.onpointerup=e.onpointercancel=null}},e.onkeydown=n=>{if(n.key!=="ArrowLeft"&&n.key!=="ArrowRight")return;n.preventDefault();const o=n.shiftKey?40:16;t(m.hist.getBoundingClientRect().width+(n.key==="ArrowLeft"?o:-o))}}function zr(e){const t=l&&l.cards.find(a=>a.id===e);if(!t||ut(t))return Xn();Mo(t);const n=d.createElement("div");n.className="hlist",ge(t);const o=d.createElement("button");o.className="hresize",o.type="button",o.title="左右拖动调整历史产物栏宽度",o.setAttribute("aria-label","调整历史产物栏宽度"),tl(o);const r=d.createElement("div");if(r.className="hhd",r.innerHTML='<b>历史产物</b><span class="n"></span><button class="x" title="收起">✕</button>',r.querySelector(".n").textContent=t.history.length?`${t.history.length} 轮`:"",r.querySelector(".x").onclick=Xn,!t.history.length){const a=d.createElement("div");a.className="hempty",a.textContent=`这个节点还没出过东西。
运行一次，每一轮的产物和 seed 都会留在这里。`,a.style.whiteSpace="pre-line",n.appendChild(a)}for(const[a,i]of t.history.entries())n.appendChild(nl(t,i,a===0));m.hist.innerHTML="",m.hist.append(o,r,n),m.hist._id=e,m.hist.style.display=""}async function zo(e,t){const n=String(e);try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(n);else{const o=d.activeElement,r=d.createElement("textarea");r.value=n,r.style.cssText="position:fixed;top:0;left:0;opacity:0;pointer-events:none",d.body.appendChild(r);try{if(r.focus(),r.select(),!d.execCommand("copy"))throw new Error("复制失败")}finally{r.remove(),o?.focus({preventScroll:!0})}}ee(t)}catch{$e("复制失败，请展开后手动选中文字复制")}}const Ea="application/x-chouka-history-output";let to=null;function nl(e,t,n){const o=t.outputs||[],r=d.createElement("div");r.className="hrun"+(n?" cur":"");const a=d.createElement("div");a.className="rh";const i=q[t.cap]&&q[t.cap].name||"";a.innerHTML='<span class="tag"></span><span class="nm"></span><span class="cnt"></span>',a.querySelector(".tag").textContent=n?"最新":_a(t.ts),a.querySelector(".nm").textContent=n?_a(t.ts):i,a.querySelector(".cnt").textContent=[t.status==="running"?"生成中":t.status==="error"?"失败":o.length>1?`${o.length} 张`:"",sr(t.ms)].filter(Boolean).join(" · "),a.title=i;const s=d.createElement("div");s.className="rg"+(o.length===1?" one":""),s.style.setProperty("--hcols",o.length===1?1:o.length<=4?2:3),s.innerHTML=o.map((p,g)=>p.kind==="video"?`<video data-video-url="${p.url}" data-i="${g}" muted loop preload="metadata" draggable="false"></video>`:p.kind==="audio"?`<div class="rg-a" data-i="${g}" title="${p.filename}">🎵</div>`:`<img src="${p.url}" data-i="${g}" alt="" draggable="false">`).join(""),ki(s);for(const p of s.querySelectorAll("[data-i]"))p.draggable=!0,p.title="单击放大查看；拖到画布创建素材节点";let c=!1;s.ondragstart=p=>{const g=p.target.closest("[data-i]"),h=g&&o[+g.dataset.i];if(!he()||!h||!["image","video","audio"].includes(h.kind)){p.preventDefault();return}c=!0,to={token:Bt(),project:l,output:{...h}},p.dataTransfer.items.clear(),p.dataTransfer.effectAllowed="copy",p.dataTransfer.setData(Ea,to.token)},s.ondragend=()=>{to=null,H(()=>{c=!1},0)},s.onclick=p=>{if(c)return;const g=p.target.closest("[data-i]");g&&Yr(e,+g.dataset.i,o,t.seed)},s.oncontextmenu=p=>{p.preventDefault(),p.stopPropagation();const g=p.target.closest("[data-i]");if(!g)return;const h=+g.dataset.i,x=o[h];if(!x)return;const w=[];w.push({icon:"⬇",text:`下载${x.kind==="video"?"视频":x.kind==="audio"?"音频":"图片"}`,run:()=>Vr(x)}),o.length>1&&w.push({icon:"⬇",text:`下载全部 ${o.length} 张${x.kind==="video"?"视频":x.kind==="audio"?"音频":"图片"}`,run:()=>o.forEach(y=>Vr(y))}),Nt(p.clientX,p.clientY,"历史记录",w)},r.append(a,s);const u=d.createElement("div");if(u.className="rs",u.innerHTML="<i>seed</i><span></span>",u.querySelector("span").textContent=t.seed!=null?String(t.seed):"未记录",t.seed!=null){const p=d.createElement("button");p.textContent="复制",p.title="复制 seed",p.onclick=()=>zo(t.seed,"已复制 seed "+t.seed),u.appendChild(p)}if(r.appendChild(u),t.user_prompt||t.negative_prompt){const p=d.createElement("details");p.className="rp";const g=d.createElement("summary");g.textContent="提示词";const h=d.createElement("div");if(t.user_prompt){const x=d.createElement("div");x.style.display="flex",x.style.justifyContent="space-between",x.style.alignItems="center",x.style.marginBottom="4px";const w=d.createElement("div");w.style.fontWeight="bold",w.textContent="正面提示词：";const y=d.createElement("button");y.textContent="复制",y.style.fontSize="12px",y.style.padding="2px 8px",y.onclick=()=>zo(t.user_prompt,"已复制正面提示词"),x.append(w,y);const j=d.createElement("div");j.style.marginBottom=t.negative_prompt?"8px":"0",j.textContent=t.user_prompt,h.append(x,j)}if(t.negative_prompt){const x=d.createElement("div");x.style.display="flex",x.style.justifyContent="space-between",x.style.alignItems="center",x.style.marginBottom="4px";const w=d.createElement("div");w.style.fontWeight="bold",w.textContent="负面提示词：";const y=d.createElement("button");y.textContent="复制",y.style.fontSize="12px",y.style.padding="2px 8px",y.onclick=()=>zo(t.negative_prompt,"已复制负面提示词"),x.append(w,y);const j=d.createElement("div");j.textContent=t.negative_prompt,h.append(x,j)}p.append(g,h),r.appendChild(p)}const f=t.prompts||(t.prompt!=null?[{label:"提示词",text:t.prompt}]:[]);for(const p of f){const g=d.createElement("details");g.className="rp";const h=d.createElement("div");h.className="history-prompt";const x=d.createElement("summary");x.textContent=p.key==="if_original"?"原始提示词":p.key==="if_submitted"?"提交给 IF CLI 的提示词":"当时提交的"+p.label;const w=d.createElement("button");w.textContent="复制",w.type="button",w.className="history-prompt-copy",w.title="复制"+x.textContent,w.onclick=()=>zo(p.text,"已复制"+p.label);const y=d.createElement("div");y.textContent=p.text||"（本次提交为空）",g.append(x,y),h.append(g,w),r.appendChild(h)}return r}async function rl(e){if(!Le())return;if(!on())return ee("请先复制示例画布，再保存图片合成");if(d.querySelector("dialog[data-image-composer][open]"))return;const t=l,n=()=>l===t&&on()&&tt(e.id)===e&&e.cap==="image_composite",o=()=>{if(!n())throw new Error("画布、节点或权限已变化，请关闭编辑器后重新打开")},r=async(a,i)=>{o(),Ue.beginFlush();try{Zo(),e.params.composition=JSON.parse(JSON.stringify(a));for(const c of Object.keys(e.assets))c.startsWith("composite:")&&delete e.assets[c];for(const c of a.layers)e.assets[`composite:${c.id}`]={...c.asset};if(i){e.outputs=[i],e.status="done",e.progress=1,e.job=null,e.seed=null,e.ms=null,e.error=null,e.step="",Mr(e,{id:`local:${Bt()}`,capability:e.cap});for(const c of t.edges.filter(u=>u.from===e.id&&!Ke(u)&&!u.version)){const u=tt(c.to);if(!u)continue;const f=bn(c);c.slots=f,f.forEach((p,g)=>{g===0?u.assets[p]={...i}:delete u.assets[p]}),Mt(u)}}xo(),Ue.cancelContentSave();const s=await ur(t.id);if(!s.ok)throw s.error||new Error("合成保存失败，请重试");o(),Qe(e),Ge(),m.panel._id===e.id&&Ce(e.id),i&&m.hist._id===e.id&&zr(e.id)}finally{Ue.endFlush()}};try{if(e._create&&await e._create,o(),!ne.ChoukaImageComposer)throw new Error("图片合成组件未加载，请强制刷新页面");const a=new Map,i=(c,u)=>{c?.kind!=="image"||!c.url||a.has(c.url)||a.set(c.url,{...c,name:u||c.origin||c.filename||"图片"})};for(const c of Object.values(e.assets||{}))i(c,c?.origin);for(const c of t.cards)if(c!==e){for(const u of Object.values(c.assets||{}))i(u,`${fe(c)} · ${u?.origin||"素材"}`);for(const u of c.outputs||[])i(u,`${fe(c)} · 产物`);for(const u of c.history||[])for(const f of u.outputs||[])i(f,`${fe(c)} · 历史产物`)}const s=(ge(e)?.inputs||[]).filter(c=>c.type==="image").map(c=>e.assets[c.key]).filter(c=>c?.kind==="image"&&c.url);await ne.ChoukaImageComposer.open({state:e.params.composition?JSON.parse(JSON.stringify(e.params.composition)):null,linkedSources:s,sources:[...a.values()],canEdit:n,upload:async c=>{o();const u=await It(c,!0);return o(),u},onSave:c=>r(c),onExport:async(c,u)=>{o();const f=await It(new File([c],`composition_${Date.now()}.png`,{type:"image/png"}),!0);o(),await r(u,{...f,filename:f.origin}),ee("图片合成已保存，可从输出端口连接下游节点")}})}catch(a){$e("图片合成："+a.message)}}function rn(){m.panel.style.display="none",m.panel._id=null,Xn()}function $i(e){m.panel.style.display!=="none"&&(m.panel.style.visibility=e?"hidden":"")}function bt(){if(m.panel.style.display==="none")return;if(C){m.panel.style.left="0px",m.panel.style.top="0px",m.panel.style.maxHeight="100%",m.panel.style.visibility="";return}const e=l&&l.cards.find(J=>J.id===m.panel._id);if(!e||!e._el)return rn();const t=8,n=e.x,o=e.y,r=e._el.offsetWidth,a=e._el.offsetHeight,i=n*$.k+$.x,s=o*$.k+$.y,c=r*$.k,u=a*$.k,f=m.stage.getBoundingClientRect(),p=i+c,g=s+u;if(!(p>0&&i<f.width&&g>0&&s<f.height)){m.panel.style.visibility="hidden";return}m.panel.style.visibility="";const x=52;m.panel.style.maxHeight=innerHeight-x-t+"px";const w=m.panel.offsetWidth;m.panel.offsetHeight;const y=i+c/2-w/2,j=s+u+t;m.panel.style.left=y+"px",m.panel.style.top=j+"px"}function Ce(e){if(C&&e!==pe)return;if(C&&Dt)return Cr();if(!he()){const P=tt(e);if(!P)return;m.panel.replaceChildren(),m.panel._id=e,m.panel.style.display="";const ie=d.createElement("strong");ie.textContent="只读 · "+fe(P);const Q=d.createElement("pre");Q.textContent=JSON.stringify(P.params||{},null,2),m.panel.append(ie,Q),bt();return}const t=l.cards.find(P=>P.id===e);if(!t)return rn();const n=Et(t),o=ge(t);Ve(t)&&!lo&&Ln().catch(()=>{});const r=m.panel.querySelector(".pbody"),a=r&&m.panel._id===e?r.scrollTop:0;if(m.panel._id=e,m.panel.innerHTML="",m.panel.style.display="",m.panel.style.visibility="",ht(t))return ol(t);if(Ht(t))return il(t);if(ft(t))return al(t);const i=["card_image","card_video","card_tools"].includes(n.id)&&n.modes.length>1;if(n.modes.length>1&&!i){const P=d.createElement("div");P.className="modes";for(const ie of n.modes){const Q=d.createElement("button");Q.className=Nn(ie,t.cap)?"on":"",Q.textContent=ie.name,mo(Q,()=>fo(t,ie,ie.name)),Q.onclick=()=>{Jt(),t.cap=jt(ie,an(t)),Ce(e),Gt(t),X()},P.appendChild(Q)}m.panel.appendChild(P)}if(!o)return m.panel.appendChild(Lo("能力不可用")),bt();const s=o.id==="image_composite"&&o.execution==="browser",c=Ve(t)?o:q[Wt(t)];let u=c&&c!==o?o.inputs.map(P=>{const ie=c.inputs.find(Q=>Q.key===P.key);return ie&&ie.default!==P.default?{...P,default:ie.default}:P}):o.inputs;const f=ct(t);if(f&&f.entry){const P=u.findIndex(ie=>kt.includes(ie.type));P>=0&&!t.assets[u[P].key]&&(u=u.slice(),u[P]={...u[P],label:f.entry.label})}const p=d.createElement("div");p.className="pbody",m.panel.appendChild(p);const g=d.createElement("div");if(g.className="knobnote clipboard-media-hint",g.textContent="Ctrl / Cmd + V：粘贴截图或图片 / 视频文件，自动创建素材节点并引用到空槽；不覆盖已有引用。复制文件需浏览器提供文件数据，仅路径文字无法导入。",Ve(t)&&(g.textContent=Gn?`本机 IF 不可用：${Gn}。请先安装并登录 IF CLI、启动本机桥接，点模型按钮可重试。`:"IF 使用本机账号；支持按模型数量连接多份引用。引用素材各上传一次，返回的 URL 按「图片1」「视频1」写入提示词，与生成需求一次提交；模型由 CLI 参数指定，随后轮询并保存产物。图片超过 10 MB 时优先转无损 WebP，仍超限再压缩；视频超过 50 MB 时自动转码。仅处理上传副本，原素材不变；本机上传合计不超过 100 MB，音频暂不支持。"),p.appendChild(g),Ve(t)){const P=fn.filter(me=>me.type===o.outputType),ie=t.params.if_model||P[0]?.display_name,Q=Bo(ie,o.outputType),ue=d.createElement("div");if(ue.className="knobnote",ue.textContent=`${Q.reference_fallback?"画布兜底引用上限（不代表官方支持）":"画布引用上限"}：图片 ${Q.bridge.image} · 视频 ${Q.bridge.video}。${Q.note} 全部引用上传后的 URL 按「图片1」「视频1」与生成需求一次提交，再轮询产物；是否采用全部引用以 IF 实际返回为准，音频暂不可提交。画面比例、清晰度、时长等参数作为生成内容要求发送，模型不保证严格遵守。`,Object.values(t.assets||{}).some(me=>me&&kt.includes(me.kind)&&!Q?.bridge?.[me.kind])&&(ue.textContent+=" 已连接的引用保持原样，但不适用于当前模型；可切回原模型或手动移除，运行时不会忽略它。"),p.appendChild(ue),Q?.source){const me=d.createElement("a");me.href=Q.source,me.target="_blank",me.rel="noopener noreferrer",me.textContent="供应商 API 参考文档（不作为 IF 引用上限）",p.appendChild(me)}}if(s){g.textContent="浏览器本地合成，不占 GPU。已连接的图片打开编辑器时自动加入图层，也可上传图片或从画布素材中选择添加。拖动位置、缩放图片，在图层列表调整遮挡顺序。";const P=d.createElement("div");P.className="knobnote";const ie=t.params.composition;P.textContent=ie?`编辑稿：${ie.width} × ${ie.height} · ${ie.layers.length} 个图层。保存编辑可继续修改；合成输出后可连接下游。`:"尚未创建编辑稿。点击下方「编辑合成」开始，默认画布 1920 × 1080，可修改尺寸和背景。",p.appendChild(P)}if(C){const P=ja(t);if(P.length){const ie=d.createElement("div");ie.className="director-supplement",ie.textContent=`导演补充（只读，提交时追加到提示词）
`+P.join(`
`),p.appendChild(ie)}}const h=u.filter(P=>kt.includes(P.type));if(h.length)if(s){const P=d.createElement("details");P.open=!0;const ie=d.createElement("summary");ie.textContent="连接图片素材（打开编辑器时自动加入图层）",P.append(ie,zi(t,h,f)),p.appendChild(P)}else p.appendChild(zi(t,h,f));if(t.cap==="if_image"){const P=u.find(ie=>ie.key==="if_reference");P&&p.appendChild(To(t,P))}const x=new Set;for(const P of h.filter(ie=>(t.assets||{})[ie.key])){const ie=u.filter(Q=>Q.rangeOf===P.key);if(ie.length===2){p.appendChild(vl(t,P,ie[0],ie[1]));for(const Q of ie)x.add(Q.key)}}const w=u.filter(P=>P.type==="textarea"&&!P.advanced),y=w.filter(P=>P.template),j=w.filter(P=>!P.template),J=j.filter(P=>P.pairWith&&u.some(ie=>ie.key===P.pairWith));J.length>1&&p.appendChild(dl(t,J));for(const P of j)(!J.includes(P)||J.length<2)&&p.appendChild(Ni(t,P));for(const P of y)p.appendChild(bl(t,P));const We=u.filter(P=>!kt.includes(P.type)&&P.type!=="textarea"&&(P.type==="seed"||!P.advanced)&&!P.mirror&&!x.has(P.key)),mt=(P,ie)=>{if(P.appendChild(To(t,ie)),ie.hint&&!ie.showHint){const Q=d.createElement("div");Q.className="knobnote",Q.textContent=ie.hint,P.appendChild(Q)}},Je=d.createElement("div");Je.className="pwrap";for(const P of We)i||mt(Je,P);p.appendChild(Je),t.error&&p.appendChild(Lo(t.error));const Ne=gr(t);Ne&&p.appendChild(Ne);const xt=br(t);xt&&p.appendChild(xt);const zt=d.createElement("div");if(zt.className="foot",i){const P=n.id==="card_video"?"生视频模式":n.id==="card_tools"?"工具箱模式":"生图模式",ie=ct(t)||n.modes[0],Q=Jr(`${n.icon} ${ie.name}`,P,()=>{const ue=me=>({icon:n.icon,text:me.name+(Nn(me,t.cap)?"（当前）":""),tip:()=>fo(t,me,me.name),run:()=>{if(Ve(t)&&["queued","running"].includes(t.status))return ee("请等待本机 IF 任务结束后再切换模式");Jt(),Pn(),tr(t,jt(me,an(t))),Ce(e),Gt(t),X()}});return n.id==="card_video"||n.id==="card_image"?[{group:"本地 API"},...n.modes.filter(me=>me.id!=="if_video"&&me.id!=="if_image").map(ue),{group:"云端 API"},...n.modes.filter(me=>me.id==="if_video"||me.id==="if_image").map(ue)]:n.modes.map(ue)});if(mo(Q,()=>fo(t,ie,ie.name)),zt.appendChild(Q),ie.modelSwitch){const ue=an(t),me=ze=>Kn[ze]||ze,Ye=Jr(me(ue)||o.name,n.id==="card_image"?"生图模型":"深度视频模型",()=>Object.entries(ie.modelSwitch).map(([ze,U])=>({text:me(ze)+(U===t.cap?"（当前）":""),run:()=>{Jt(),Pn(),tr(t,U),t._model=ze,Ce(e),Gt(t),X()}})));zt.appendChild(Ye)}else if(Ve(t)){const ue=fn.filter(ze=>ze.type===o.outputType),me=ue.find(ze=>ze.display_name===t.params.if_model)?.display_name||ue[0]?.display_name,Ye=Jr(me||"选择 IF 模型","IF 模型",()=>fn.some(ze=>ze.type===o.outputType)?fn.filter(ze=>ze.type===o.outputType).map(ze=>({text:ze.display_name+(ze.display_name===me?"（当前）":"")+" · "+zn(ze),disabled:["exhausted","unavailable"].includes(ze.quota_status),run:()=>{Pn(),t.params.if_model=ze.display_name;const U=t._referenceParameters,te=U&&t.params.duration===U.before.duration;Uo(t),te&&(U.before.duration=t.params.duration),Ce(e),X()}})):[{text:Gn?"重试连接本机 IF":"正在读取本机 IF 模型…",run:()=>Ln().catch(ze=>$e(ze.message))}]);Ye._openIFModels=Ye.onclick,Ye.onclick=async ze=>{ze.stopPropagation(),Cn();const U=Co;Ye.disabled=!0,Ye.firstChild.textContent="读取剩余次数…";try{await Ln(!1),Co===U&&m.panel._id===e&&l?.cards.includes(t)&&m.panel.querySelector('button[title="IF 模型 —— 点击换"]')?._openIFModels(ze)}catch(te){$e("读取 IF 剩余次数失败："+te.message)}finally{Ye.disabled=!1,Ye.firstChild.textContent=me||"选择 IF 模型"}},zt.appendChild(Ye)}if(!s){const ue=d.createElement("button");ue.className="tcap";const me=Yo(t,o);ue.textContent=me?`⚙ ${me}`:"⚙ 参数",ue.title=Ve(t)?"点开弹窗：比例、清晰度、时长等以内容发送":"点开弹窗：清晰度、画面比例、时长等参数",ue.onclick=Ye=>{Ye.stopPropagation(),is(t,ue)},zt.appendChild(ue)}}const yt=t.status==="queued"||t.status==="running",Lt=d.createElement("span");if(Lt.style.cssText="color:#8a8a94;font-size:12px",Lt.textContent=s?"本地合成 · 输出 PNG":o.outputType==="video"?"输出：视频":"输出：图片",t.status==="done"&&t.ms>0&&(Lt.textContent+=` · 上次 ${sr(t.ms)}`),zt.appendChild(Lt),yt&&t.job&&!Ve(t)){const P=d.createElement("button");P.className="cancel",P.textContent="取消",P.onclick=()=>Sl(t),P.style.marginLeft="auto",zt.appendChild(P)}const we=d.createElement("button");we.className="go",we.textContent=s?"编辑合成":"↑",we.title=s?"打开图片合成编辑器（不使用 ComfyUI）":"运行",s&&(we.style.cssText="width:auto;min-width:96px;padding:0 14px;border-radius:8px;font-size:13px;flex-shrink:0"),we.disabled=yt,we.onclick=()=>Oo(t),zt.appendChild(we),m.panel.appendChild(zt),bt(),p.scrollTop=a,Oa(t),Bn(t)}function Lo(e){const t=d.createElement("div");return t.className="err",t.textContent=e,t}function ol(e){const t=d.createElement("div");t.className="pbody",m.panel.appendChild(t);const n=d.createElement("div");n.className="pblock";const o=d.createElement("div");o.className="phd";const r=d.createElement("span");r.textContent="风格描述";const a=d.createElement("span");a.className="demo";const i=d.createElement("button");i.textContent="清空",o.append(r,a,i);const s=d.createElement("textarea");s.placeholder="例：蒂姆·波顿式哥特暗黑定格动画质感，冷青灰色调，强侧光硬阴影，胶片颗粒，浅景深，电影级构图",s.value=String((e.params||{}).style||""),s.style.minHeight="120px";const c=()=>{const x=s.value.trim();a.style.display=x?"none":"",a.textContent="⚠ 还没写，挂着也不起作用"},u=()=>{e.params=e.params||{},e.params.style=s.value,c(),Qe(e),X()};s.oninput=u,i.onclick=()=>{s.value="",u(),s.focus()},c(),n.append(o,s),t.appendChild(n);const f=l.edges.filter(x=>x.from===e.id&&Ke(x)),p=d.createElement("div");p.className="slinks";const g=d.createElement("div");if(g.className="atitle",g.textContent=f.length?`挂着 ${f.length} 个节点`:"还没挂给任何节点",p.appendChild(g),!f.length){const x=d.createElement("div");x.className="anote",x.textContent="把右边那颗点拖到一张生图/生视频节点上；拖到空白处会列出所有写提示词的玩法。",p.appendChild(x)}for(const x of f){const w=l.cards.find(We=>We.id===x.to);if(!w)continue;const y=d.createElement("div");y.className="slink";const j=d.createElement("button");j.className="nm",j.textContent=fe(w),j.title="选中这个节点（面板上能看到合并后的提示词）",j.onclick=()=>At(w.id);const J=d.createElement("button");J.className="off",J.textContent="解除",J.title="这个节点不再套用本风格",J.onclick=()=>Wr(x),y.append(j,J),p.appendChild(y)}const h=Me(e);if(h.length){const x=d.createElement("div");x.className="atitle",x.textContent=`顺着连线连带 ${h.length} 张`,p.appendChild(x);for(const w of h){const y=d.createElement("div");y.className="slink down";const j=d.createElement("button");j.className="nm",j.textContent=fe(w),j.title="选中这个节点（面板上能看到合并后的提示词）",j.onclick=()=>At(w.id);const J=d.createElement("span");J.className="off ro",J.textContent="继承",J.title="上游那个节点传下来的，要断就断它们之间那根产物连线",y.append(j,J),p.appendChild(y)}}t.appendChild(p),bt()}function al(e){const t=d.createElement("div");t.className="pbody",m.panel.appendChild(t);const n=gn(e),o=d.createElement("div");o.className="pblock";const r=d.createElement("div");r.className="phd";const a=d.createElement("span");a.textContent="手里的素材";const i=d.createElement("span");i.className="demo",r.append(a,i),o.appendChild(r);const s=d.createElement("div");s.className="prow";const c=d.createElement("button");if(c.textContent=n?"换一个文件":"选择文件",c.onclick=()=>Io(e),s.appendChild(c),n){const h=d.createElement("button");h.textContent="查看大图",h.onclick=()=>eo(n),s.appendChild(h)}const u=d.createElement("button");u.textContent="清空",u.title="把这份素材扔掉，节点变回空（不会删文件本身）",u.onclick=()=>{e.outputs=[];for(const h of l.edges.filter(x=>x.from===e.id&&!Ke(x)))ra(h);Qe(e),Mt(e),Ce(e.id),X()},s.appendChild(u),i.textContent=n?(n.origin||n.filename||n.url||"").split(/[\\/]/).pop():"还没有文件",i.title=n&&(n.origin||n.filename||n.url)||"",o.appendChild(s),t.appendChild(o);const f=l.edges.filter(h=>h.from===e.id),p=d.createElement("div");p.className="slinks";const g=d.createElement("div");if(g.className="atitle",g.textContent=f.length?`喂给 ${f.length} 个节点`:"还没喂给任何节点",p.appendChild(g),!f.length){const h=d.createElement("div");h.className="anote",h.textContent=n?"把右边那颗点拖到一个节点上，这份素材就进它的格子。":"先在上面选一个文件，再把出口拖到别的节点上。",p.appendChild(h)}for(const h of f){const x=l.cards.find(J=>J.id===h.to);if(!x)continue;const w=d.createElement("div");w.className="slink";const y=d.createElement("button");y.className="nm",y.textContent=fe(x),y.title="选中这个节点",y.onclick=()=>At(x.id);const j=d.createElement("button");j.className="off",j.textContent="解除",j.title="这个节点不再收这份素材",j.onclick=()=>Wr(h),w.append(y,j),p.appendChild(w)}t.appendChild(p),bt()}const ji=[["polish","润色","改得更通顺好读，不加料不改意思"],["optimize","优化","删废话、换具体说法，更精炼有表现力"],["expand","扩写","补细节补过渡，写到 2~3 倍长"],["custom","自定义","按下面写的指令处理文字"]];function il(e){const t=d.createElement("div");t.className="pbody",m.panel.appendChild(t);const n=e.status==="running";e.params=e.params||{};const o=d.createElement("div");o.className="pblock";const r=d.createElement("div");r.className="phd",r.innerHTML="<span>内容</span>";const a=d.createElement("textarea");if(a.placeholder="在这里写字或直接在节点上写",a.value=String(e.params.text||""),a.disabled=n,a.oninput=()=>{e.params.text=a.value;const h=e._el?e._el.querySelector(".body"):null,x=h?h.querySelector("textarea.ttxt"):null;x&&(x.value=a.value),na(e),X()},o.append(r,a),t.appendChild(o),e.params.op==="custom"){const h=d.createElement("div");h.className="pblock";const x=d.createElement("div");x.className="phd",x.innerHTML="<span>指令</span>";const w=d.createElement("textarea");w.placeholder="例：把接进来的几段整理成一条朋友圈文案，口语一点，带两个 emoji",w.value=String(e.params.instr||""),w.oninput=()=>{e.params.instr=w.value,X()},h.append(x,w),t.appendChild(h)}const i=l.edges.filter(h=>h.from===e.id&&Ke(h)),s=d.createElement("div");s.className="slinks";const c=d.createElement("div");if(c.className="atitle",c.textContent=i.length?`连着 ${i.length} 个节点`:"还没连给任何节点",s.appendChild(c),!i.length){const h=d.createElement("div");h.className="anote",h.textContent="把右边那颗点拖到生成节点（并进提示词）或别的文本节点（当输入）上；拖到空白处会列出所有能接的地方。",s.appendChild(h)}for(const h of i){const x=l.cards.find(J=>J.id===h.to);if(!x)continue;const w=d.createElement("div");w.className="slink";const y=d.createElement("button");y.className="nm",y.textContent=fe(x),y.title="选中这个节点",y.onclick=()=>At(x.id);const j=d.createElement("button");j.className="off",j.textContent="解除",j.title="这个节点不再用这段文本",j.onclick=()=>Wr(h),w.append(y,j),s.appendChild(w)}t.appendChild(s),e.error&&t.appendChild(Lo(e.error));const u=d.createElement("div");u.className="foot",u.appendChild(Jr((e.params.model||"api")==="local"?"🖥 本地 27B":"☁ 云端 API","模型",()=>[{icon:"☁",text:"云端 API —— 几秒就回，要配好 llm.json",run:()=>{e.params.model="api",Ce(e.id),X()}},{icon:"🖥",text:"本地 27B —— 不花钱，占显存，第一次慢",run:()=>{e.params.model="local",Ce(e.id),X()}}]));const f=h=>h?(ji.find(x=>x[0]===h)||[0,h])[1]:"不加工";u.appendChild(Jr(f(e.params.op),"加工方式",()=>[{icon:"✍",text:"不加工 —— 就当一个纯文本节点，只存字",run:()=>{e.params.op="",Qe(e),Ce(e.id),X()}},...ji.map(([h,x,w])=>({icon:"✎",text:`${x} —— ${w}`,run:()=>{e.params.op=h,Qe(e),Ce(e.id),X()}}))]));const p=d.createElement("span");if(p.style.cssText="color:#8a8a94;font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap",e._lastRun?p.textContent=(e._lastRun.via==="api"?"上次 ☁":"上次 🖥")+(e._lastRun.ms?` · ${(e._lastRun.ms/1e3).toFixed(1)} 秒`:""):e.params.op?p.textContent="结果写回节点 · 上游改了字，重跑一次就用新的":p.textContent="没选加工方式：这个节点只存字",p.title=p.textContent,u.appendChild(p),typeof e.params._prev=="string"&&e.params._prev!==e.params.text){const h=d.createElement("button");h.className="cancel",h.textContent="↩ 恢复运行前的字",h.title="上一次运行之前的节点上原文（只留这一步）",h.onclick=()=>{e.params.text=e.params._prev,delete e.params._prev,Qe(e),Ce(e.id),X()},u.appendChild(h)}const g=d.createElement("button");g.className="go",g.textContent="↑",g.title="运行",g.disabled=n||!e.params.op,g.onclick=()=>Oo(e),u.appendChild(g),m.panel.appendChild(u),bt()}async function sl(e){if(!Le())return;const t=v(e);if(!t)return ee("先在上面选一种加工方式（润色 / 优化 / 扩写 / 自定义）");if(e.status==="running")return ee("文本加工正在进行中，请稍候");e.error=null,e.status="running",e.ms=null,Qe(e),m.panel._id===e.id&&Ce(e.id);try{const n=z(e).map(i=>({name:i.name,text:i.text})),o=tn(e);o&&n.unshift({name:"节点上的原文",text:o});const r=await Vt("/api/text",{op:t,model:(e.params||{}).model||"api",inputs:n,params:{instr:String((e.params||{}).instr||"")},project:l&&l.id,projectName:l&&l.name,card:e.id,cardName:fe(e)});e.params._prev=String((e.params||{}).text||""),e.params.text=r.text,e.status="done",e.ms=r.ms,e._lastRun=r,X(),Qe(e),m.panel._id===e.id&&Ce(e.id);const a=l.edges.filter(i=>i.from===e.id&&Ke(i)).length;ee(ll(r)+(a?`
已连给 ${a} 个节点，它们下次运行会用这份新文本`:""))}catch(n){e.status="error",e.error=n.message,Ue.markWorkFailure(n),Qe(e),m.panel._id===e.id&&Ce(e.id),$e(n.message)}X()}function ll(e){const t=e.ms>=6e4?`${Math.floor(e.ms/6e4)} 分 ${Math.round(e.ms%6e4/1e3)} 秒`:`${(e.ms/1e3).toFixed(1)} 秒`;return`${e.via==="api"?"✅ 云端 API":"✅ 本地 27B"}，${t}`+(e.warn?`
⚠ ${e.warn}`:"")}function dl(e,t){const n=ge(e),o=t.filter(i=>(e.assets||{})[i.pairWith]),r=i=>ln(n.inputs.find(s=>s.key===i.pairWith)||i,e),a=d.createElement("div");if(a.className="ptabs",(e._tab==null||e._tab<0||e._tab>=o.length)&&(e._tab=o.length?0:-1),o.length){const i=d.createElement("div");i.className="tabs",o.forEach((s,c)=>{const u=d.createElement("button"),f=String(e.params[s.key]!=null?e.params[s.key]:s.default||"").trim();u.textContent=r(s)+(f?" ●":""),u.className=c===e._tab?"on":"",u.onclick=()=>{e._tab=c,Ce(e.id)},i.appendChild(u)}),a.appendChild(i),a.appendChild(Ni(e,o[e._tab],r(o[e._tab])+" 的提示词"))}else{const i=d.createElement("div");i.className="tabempty",i.textContent="还没有图片引用。添加图片后，这里才显示对应提示词。",a.appendChild(i)}return a}function Ni(e,t,n){const o=d.createElement("div");o.className="pblock";const r=t.key==="negative_prompt",a=r?[]:ce(e).map(tn),i=r?[]:z(e),s=q[Wt(e)]||ge(e),c=!!(s&&s.rewrite&&t.key===(N(s)[0]||{}).key),u=c?Fr(e,t.key):null,f=!!(u&&e.optUse&&e.optUse[t.key]),p=d.createElement("div");p.className="phd";const g=d.createElement("span"),h=a.length+i.length;g.textContent=(n||t.label)+(h&&!f?`（已并入 ${h} 段文本）`:"");const x=d.createElement("span");x.className="demo",x.textContent="⚠ 这是示例文案，改成你要的内容",p.append(g,x),o.appendChild(p),u&&o.appendChild(pl(e,t,f));const w=d.createElement("textarea");w.placeholder=`${n||t.label}：${r?"描述不希望出现的内容":"描述你想要的画面/动作/镜头"}`;const y=e.promptHeights?.[t.key];Number.isFinite(y)&&y>0&&(w.style.height=y+"px");const j=d.createElement("div");j.className="prompt-highlight-wrapper";const J=d.createElement("div");J.className="prompt-highlight-layer",j.appendChild(J),j.appendChild(w);function We(){const U=getComputedStyle(w);for(const ke of["fontFamily","fontSize","fontWeight","lineHeight","letterSpacing","wordSpacing","textIndent","paddingTop","paddingRight","paddingBottom","paddingLeft","borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth","boxSizing","width","height"])J.style[ke]=U[ke];J.style.borderStyle="solid",J.style.borderColor="transparent",J.style.whiteSpace="pre-wrap",J.style.overflowWrap=U.overflowWrap,J.style.wordBreak=U.wordBreak||"normal",J.style.top="0px",J.style.left="0px";const te=w.offsetWidth-w.clientWidth;te>0&&(J.style.paddingRight=parseFloat(U.paddingRight)+te+"px")}let mt=f?u:e.params[t.key]!=null?e.params[t.key]:r?t.default??"":"";if(!f&&h>0){const U=[];a.length>0&&a.forEach(ke=>{U.push(ke)}),i.length>0&&i.forEach(ke=>{U.push(ke.text)});const te=U.join(`

`);w.value=te+(mt?`

`+mt:`

`)}else w.value=mt;function Je(){const U=Ze=>Ze.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"),te=w.value;let ke="",se=0;const be=/@([\u4e00-\u9fa5\w]+)/g;let je;for(;!r&&(je=be.exec(te));)ke+=U(te.slice(se,je.index)),ke+=`<mark class="at-mention" data-name="${U(je[1])}">${U(je[0])}</mark>`,se=je.index+je[0].length;ke+=U(te.slice(se)),J.innerHTML=ke+`
`,J.scrollTop=w.scrollTop}f&&(w.classList.add("optta"),J.classList.add("opt")),w.addEventListener("wheel",U=>{U.stopPropagation()},{passive:!0}),w.addEventListener("keydown",U=>{if(r||U.isComposing||U.key!=="Backspace"&&U.key!=="Delete"||w.selectionStart!==w.selectionEnd)return;const te=w.selectionStart,ke=/@([\u4e00-\u9fa5\w]+)/g;let se;for(;se=ke.exec(w.value);)if(U.key==="Backspace"?te>se.index&&te<=se.index+se[0].length:te>=se.index&&te<se.index+se[0].length){U.preventDefault(),w.setSelectionRange(se.index,se.index+se[0].length),d.execCommand("delete");return}});let Ne=null,xt=-1;w.addEventListener("input",()=>{Je();const U=w.selectionStart,ke=w.value.substring(0,U).match(/@([\u4e00-\u9fa5\w]*)$/);if(ke&&!f&&!r){const se=ke[1].toLowerCase();xt=U-ke[0].length;const be=[],je=new Set(l.edges.filter(_e=>_e.to===e.id).map(_e=>_e.from));l.cards.forEach(_e=>{if(_e.id===e.id||!(ft(_e)||ut(_e)||ht(_e)))return;const qe=fe(_e);if(!qe.toLowerCase().includes(se))return;const Yt=Et(_e);be.push({type:"card",section:"canvas",connected:je.has(_e.id),card:_e,name:qe,icon:Yt.icon||"◻",label:ft(_e)?"素材":ut(_e)?"文本":"风格"})});const Ze=q[Wt(e)]||ge(e);Ze&&Ze.inputs&&Ze.inputs.forEach(_e=>{if(!["image","audio","video"].includes(_e.type))return;const wt=e.assets[_e.key];if(!wt||!wt.ref)return;const qe=ln(_e,e);qe.toLowerCase().includes(se)&&be.push({type:"slot",section:"current",key:_e.key,name:qe,icon:_e.type==="image"?"🖼":_e.type==="audio"?"🎵":"🎬",label:He[_e.type]||"素材"})}),be.length>0?zt(w,be):yt()}else yt()});function zt(U,te){yt(),Ne=d.createElement("div"),Ne.id="menu",Ne.className="at-menu",Ne.style.position="absolute",Ne.style.maxHeight="280px",Ne.style.overflowY="auto";const ke=qe=>{const Yt=d.createElement("button");Yt.className="at-menu-item"+(qe.connected?" connected":"");const Lr=d.createElement("span");Lr.className="at-menu-icon",Lr.textContent=qe.icon;const lr=d.createElement("span");lr.className="at-menu-name",lr.textContent=qe.name;const Pr=d.createElement("span");Pr.className="at-menu-type",Pr.textContent=qe.connected?`已连线 · ${qe.label}`:qe.label,Yt.append(Lr,lr,Pr),Yt.onclick=()=>{const Ir=qe.name,Ao=U.value.substring(0,xt),jl=U.value.substring(U.selectionStart);U.value=Ao+`@${Ir} `+jl,U.selectionStart=U.selectionEnd=Ao.length+Ir.length+2,f?e.opt[t.key]=U.value:e.params[t.key]=ze(U.value),Ye(),X(),Je(),yt(),U.focus()},Ne.appendChild(Yt)};for(const[qe,Yt]of[["current","当前素材"],["canvas","画布"]]){const Lr=te.filter(Ir=>Ir.section===qe).sort((Ir,Ao)=>+!!Ao.connected-+!!Ir.connected);if(!Lr.length)continue;const lr=d.createElement("div");lr.className="at-menu-group";const Pr=d.createElement("span");Pr.textContent=Yt,lr.appendChild(Pr),Ne.appendChild(lr),Lr.forEach(ke)}const se=ie(xt)||(()=>{const qe=U.getBoundingClientRect();return{left:qe.left+8,top:qe.top+8,bottom:qe.top+28}})();d.body.appendChild(Ne);const be=Ne.offsetWidth,je=Ne.offsetHeight;let Ze=se.left-6,_e=se.top-je-6;_e<8&&(_e=se.bottom+4),Ze+be>innerWidth-8&&(Ze=innerWidth-8-be),Ze<8&&(Ze=8),Ne.style.left=Ze+"px",Ne.style.top=_e+"px";const wt=qe=>{(!Ne||!Ne.contains(qe.target)&&qe.target!==U)&&(yt(),d.removeEventListener("mousedown",wt))};H(()=>d.addEventListener("mousedown",wt),0)}function yt(){Ne&&(Ne.remove(),Ne=null)}o.appendChild(j),Je();const Lt=new Re(()=>{if(!w.isConnected){Lt.disconnect();return}if(!w.offsetHeight)return;We(),J.scrollTop=w.scrollTop;const U=parseFloat(w.style.height);Number.isFinite(U)&&U>0&&U!==e.promptHeights?.[t.key]&&he()&&(e.promptHeights=e.promptHeights||{},e.promptHeights[t.key]=U,X())});Lt.observe(w),w.addEventListener("scroll",()=>{J.scrollTop=w.scrollTop});let we=null;function P(U,te){const ke=J.querySelectorAll(".at-mention");for(const se of ke){const be=se.getClientRects();for(const je of be)if(U>=je.left&&U<=je.right&&te>=je.top&&te<=je.bottom)return se}return null}function ie(U){const te=[],ke=d.createTreeWalker(J,NodeFilter.SHOW_TEXT);for(;ke.nextNode();)te.push(ke.currentNode);let se=0,be=null,je=0;for(const wt of te){if(se+wt.length>U){be=wt,je=U-se;break}se+=wt.length}if(!be){const wt=te[te.length-1];if(!wt)return null;be=wt,je=wt.length}const Ze=d.createRange();Ze.setStart(be,je),Ze.setEnd(be,Math.min(je+1,be.length));const _e=Ze.getClientRects()[0]||Ze.getBoundingClientRect();return _e.width===0&&_e.height===0?null:_e}w.addEventListener("mousemove",U=>{const te=P(U.clientX,U.clientY);if(w.style.cursor=te?"pointer":"",J.querySelectorAll(".at-mention.mhover").forEach(je=>je.classList.remove("mhover")),te&&te.classList.add("mhover"),!te)return me();const ke=te.dataset.name;if(!ke)return;let se=null;const be=l.cards.find(je=>fe(je)===ke);if(be){const je=be.outputs||[];je.length>0?se={type:je[0].kind,url:je[0].url,name:fe(be)}:(ut(be)||ht(be))&&(se={type:"text",text:tn(be)||"(空)",name:fe(be)})}if(!se){const je=q[Wt(e)]||ge(e);if(je&&je.inputs){const Ze=je.inputs.find(_e=>ln(_e,e)===ke);Ze&&e.assets[Ze.key]&&(se={type:Ze.type,url:e.assets[Ze.key].url,name:ke})}}se?ue(te,se):me()}),w.addEventListener("mouseleave",me),w.addEventListener("scroll",()=>{J.scrollTop=w.scrollTop,J.scrollLeft=w.scrollLeft,me()});let Q=null;function ue(U,te){if(we&&Q===te.name)return;me(),Q=te.name,we=d.createElement("div"),we.className="at-mention-preview",we.style.cssText=`
      position: fixed; z-index: 100; background: #060a14f7; border: 1px solid var(--acc);
      border-radius: 3px; padding: 8px; box-shadow: 0 12px 36px #000d, 0 0 18px #00e5ff2e;
      backdrop-filter: blur(6px); max-width: 320px; pointer-events: none;
    `;const ke=d.createElement("div");if(ke.style.cssText="font-size: 11px; color: var(--acc); margin-bottom: 6px; letter-spacing: 1px;",ke.textContent=te.name,we.appendChild(ke),te.type==="image"){const be=d.createElement("img");be.src=te.url,be.style.cssText="max-width: 300px; max-height: 200px; display: block; border-radius: 2px;",we.appendChild(be)}else if(te.type==="video"){const be=d.createElement("video");Gr(be,te.url),be.style.cssText="max-width: 300px; max-height: 200px; display: block; border-radius: 2px;",be.muted=!0,be.autoplay=!0,be.loop=!0,we.appendChild(be)}else if(te.type==="audio"){const be=d.createElement("div");be.textContent="🎵 "+te.name,be.style.cssText="padding: 12px; color: var(--txt); text-align: center;",we.appendChild(be)}else if(te.type==="text"){const be=d.createElement("div");be.textContent=te.text.substring(0,200)+(te.text.length>200?"...":""),be.style.cssText="color: var(--txt); font-size: 12px; line-height: 1.6; max-height: 150px; overflow: hidden;",we.appendChild(be)}const se=U.getBoundingClientRect();we.style.left=se.left+"px",we.style.top=se.bottom+4+"px",d.body.appendChild(we)}function me(){Q=null,we&&(we.remove(),we=null)}const Ye=()=>{const U=!r&&!f&&!!t.default&&w.value.trim()===String(t.default).trim();x.style.display=U?"":"none",w.classList.toggle("isdemo",U),J.classList.toggle("demo",U)},ze=U=>{if(!U)return"";if(!h)return U.trim();const te=[];a.length>0&&a.forEach(se=>te.push(se)),i.length>0&&i.forEach(se=>te.push(se.text));const ke=te.join(`

`);return U.startsWith(ke)?U.substring(ke.length).trim().replace(/^\n+/,""):U.trim()};if(w.oninput=()=>{f?e.opt[t.key]=w.value:e.params[t.key]=ze(w.value),Ye(),X()},Ye(),c||!f){const U=d.createElement("div");U.className="ptoolbar";const te=!!e._rwBusy,ke=e.params._promptModel||"api",se=d.createElement("button");se.className="tbtool model";const be=d.createElement("span");be.textContent=ke==="local"?"🖥 本地":"☁ 云端";const je=d.createElement("i");je.textContent="▾",se.append(be,je),se.title="模型 —— 点击换",se.onclick=qe=>{qe.stopPropagation();const Yt=se.getBoundingClientRect();Nt(Yt.left,Yt.bottom+4,"模型",[{icon:"☁",text:"云端 API —— 几秒就回，要配好 llm.json",run:()=>{e.params._promptModel="api",X(),En(e)}},{icon:"🖥",text:"本地 27B —— 不花钱，占显存，第一次慢",run:()=>{e.params._promptModel="local",X(),En(e)}}])},U.appendChild(se);const Ze=d.createElement("button");Ze.className="tbtool",Ze.textContent="🌐 翻译",Ze.disabled=te,Ze.title="中→英 / 英→中 自动判断（有道翻译）",Ze.onclick=()=>ul(e,t),U.appendChild(Ze);const _e=d.createElement("div");_e.style.cssText="display: flex; gap: 4px; margin-left: auto;";const wt=d.createElement("button");if(wt.className="tbtool",wt.textContent=f?"扔掉这份":"清空",wt.title=f?"删掉优化结果，切回你自己写的原词（原词一直没被动过）":"清空提示词",wt.onclick=()=>{if(f)return delete e.opt[t.key],delete e.optUse[t.key],e.optStyle&&delete e.optStyle[t.key],X(),En(e);if(e.params[t.key]="",!f&&h>0){const qe=[];a.length>0&&a.forEach(Yt=>{qe.push(Yt)}),i.length>0&&i.forEach(Yt=>{qe.push(Yt.text)}),w.value=qe.join(`

`)}else w.value="";Ye(),w.focus(),X()},_e.appendChild(wt),c){const qe=d.createElement("button");qe.className="tbtool opt",qe.textContent=te?"⏳ 优化中…":"✨ 优化",qe.disabled=te,qe.title="优化提示词：融入风格、补充细节"+(u?`
已有优化结果，再点会覆盖`:"")+`
接入的文本节点会一起融进结果`,qe.onclick=()=>hl(e,t,ke),_e.appendChild(qe)}U.appendChild(_e),o.appendChild(U)}if(e._rwErr&&e._rwErr.key===t.key){const U=d.createElement("div");U.className="rwerr",U.textContent="操作失败："+e._rwErr.msg,o.appendChild(U)}return o}function pl(e,t,n){const o=d.createElement("div");o.className="opttabs";const r=(u,f,p)=>{const g=d.createElement("button");return g.className=u?"on":"",g.textContent=f,g.title=p,g.onclick=()=>{e.optUse=e.optUse||{},e.optUse[t.key]=f!=="原词",X(),En(e)},g},a=nt(e).join(`

`),i=e.optStyle&&e.optStyle[t.key]||"",s=a!==i;o.append(r(!n,"原词","你自己写的那段。生成时"+(a?"会在前面拼上接入的文本节点":"原样提交")),r(n,"✨优化后","大模型优化出来的那段，已经是这个模型认的格式。"+(i?`
接入的文本已经融在里面了，生成时不再另外拼`:"")+`
原样提交`));const c=d.createElement("span");return c.className="note",n?s?(c.className="note bad",c.textContent="⚠ "+(i?a?"风格节点换过了，这份里还是旧的":"风格节点摘了，这份里还留着它":"风格节点是优化之后挂的，这份里没有它")+" —— 点「重新优化」",c.title="优化结果是一段写死的文字，风格在优化那一刻就烙进去了，之后改风格节点不会让它跟着变。要么重新优化一次，要么切回「原词」。"):c.textContent=a?"已含接入的文本，提交时不再另拼":"按模型认的格式写好了，原样提交":c.textContent=a?"提交时会拼上接入的文本":"",o.appendChild(c),o}const En=e=>{m.panel._id===e.id&&Ce(e.id)};function cl(e){const t=e.ms>=6e4?`${Math.floor(e.ms/6e4)} 分 ${Math.round(e.ms%6e4/1e3)} 秒`:`${(e.ms/1e3).toFixed(1)} 秒`;return`${e.fallback?`⚠ API 没通（${e.fallback}），本地 27B 兜的`:e.via==="api"?`✅ API 改的（${e.model||"远程"}）`:"✅ 本地 27B 改的"}，${t}`+(e.warn?`
⚠ `+e.warn:"")}function ul(e,t){return F(fl(e,t))}async function fl(e,t){if(!Le())return;if(e._rwBusy)return ee("翻译正在进行中，请稍候");const n=!!(e.optUse&&e.optUse[t.key]),o=n&&e.opt&&e.opt[t.key]?String(e.opt[t.key]):String(e.params[t.key]!=null?e.params[t.key]:t.default||"");if(!o.trim())return ee("先写点内容再翻译");e._rwBusy=!0,e._rwErr=null,En(e);try{const r=await Vt("/api/text",{op:"translate",model:"youdao",inputs:[{name:"原文",text:o}],params:{},project:l&&l.id,projectName:l&&l.name,card:e.id,cardName:fe(e)});n?(e.opt=e.opt||{},e.opt[t.key]=r.text):e.params[t.key]=r.text,X(),e._rwBusy=!1,En(e),ee(`翻译完成 · ${(r.ms/1e3).toFixed(1)} 秒 · ${r.model||"翻译服务"}`+(r.warn?`
${r.warn}`:""))}catch(r){e._rwBusy=!1,e._rwErr={key:t.key,msg:r.message},Ue.markWorkFailure(r),En(e),$e("翻译失败："+r.message)}}function Sa(e,t){if(!e||!l)return e;const n=q[Wt(t)]||ge(t);if(!n)return e;const o=new Map;let r=1,a=1,i=1;for(const s of n.inputs||[]){const c=t.assets[s.key];if(!c||!c.ref)continue;const u=ln(s,t);s.type==="image"?o.set(u,`<Picture ${r}>`):s.type==="audio"?o.set(u,`<Audio ${a}>`):s.type==="video"&&o.set(u,`<Video ${i}>`);const f=l.cards.find(p=>(p.outputs||[]).some(g=>g.url&&c.url&&g.url===c.url||g.filename&&c.filename&&g.filename===c.filename));if(f){const p=fe(f);s.type==="image"?(o.set(p,`<Picture ${r}>`),r++):s.type==="audio"?(o.set(p,`<Audio ${a}>`),a++):s.type==="video"&&(o.set(p,`<Video ${i}>`),i++)}else s.type==="image"?r++:s.type==="audio"?a++:s.type==="video"&&i++}return e.replace(/@([\u4e00-\u9fa5\w]+)/g,(s,c)=>{const u=o.get(c);if(u)return u;const f=l.cards.find(p=>fe(p)===c);return f&&(ut(f)||ht(f))&&tn(f)||s})}function ml(e){const t={},n=q[Wt(e)]||ge(e);if(!n)return t;for(const o of n.inputs||[]){const r=e.assets[o.key];if(!r||!r.ref)continue;const a=l.cards.find(i=>(i.outputs||[]).some(s=>s.url&&r.url&&s.url===r.url||s.filename&&r.filename&&s.filename===r.filename));a?t[o.key]=fe(a):t[o.key]=ln(o,e)}return t}function hl(e,t,n){return F(gl(e,t,n))}async function gl(e,t,n){if(!Le())return;const o=q[Wt(e)]||ge(e);if(!o||!o.rewrite)return;if(e._rwBusy)return ee("优化正在进行中，请稍候");const r=String(e.params[t.key]!=null?e.params[t.key]:t.default||""),a=nt(e);if(!r.trim()&&!a.length)return ee("先写一句你想要什么，优化才有东西可改");const i=Sa(r,e);e._rwBusy=!0,e._rwErr=null,En(e);try{await Xo(e);const s=Na(e),c=await Vt("/api/rewrite",{capability:o.id,params:s.params,assets:s.assets,prompt:i,style:a.join(`

`),model:n||"auto",cardInfo:ml(e),project:l&&l.id,projectName:l&&l.name,card:e.id,cardName:fe(e)});console.log("=== /api/rewrite 返回数据 ==="),console.log(JSON.stringify(c,null,2)),console.log("=== r.text 内容 ==="),console.log(c.text),console.log("=========================");let u=c.text||"";u=u.replace(/^[\s\S]*?<\/think>/i,""),u=u.replace(/^[\s\S]*?<\/thinking>/i,""),u=u.replace(/^[\s\S]*?<\/thought>/i,""),u=u.trim(),e.opt=e.opt||{},e.optUse=e.optUse||{},e.optStyle=e.optStyle||{},e.opt[t.key]=u,e.optUse[t.key]=!0,e.optStyle[t.key]=a.join(`

`),X(),ee(cl(c))}catch(s){e._rwErr={key:t.key,msg:s.message},Ue.markWorkFailure(s),$e("优化失败："+s.message)}e._rwBusy=!1,En(e)}function bl(e,t){const n=d.createElement("div");n.className="tpl";const o=d.createElement("button");o.className="tplhd";const r=d.createElement("div");r.style.display="none";const a=d.createElement("textarea");a.value=e.params[t.key]!=null?e.params[t.key]:t.default||"";const i=()=>{const u=a.value.trim()!==String(t.default||"").trim(),f=r.style.display!=="none";o.textContent=`${f?"▾":"▸"} ${t.label}`+(u?"（已被改过，出片结构可能跑偏）":"（预设，默认不用动）"),o.classList.toggle("dirty",u),c.style.display=u?"":"none"};o.onclick=()=>{r.style.display=r.style.display==="none"?"":"none",i()};const s=d.createElement("div");s.className="tplnote",s.textContent="⚠ "+(t.note||"预设参数，改了会影响出片。");const c=d.createElement("button");return c.className="tplrst",c.textContent="恢复预设",c.onclick=()=>{a.value=t.default||"",e.params[t.key]=a.value,i(),X()},a.oninput=()=>{e.params[t.key]=a.value,i(),X()},r.append(s,a,c),i(),n.append(o,r),n}function Gt(e){if(!e._el)return;const t=e._el.querySelector(".ch .t");t.textContent=fe(e),t.classList.toggle("named",!!e.name),Mt(e),Mi(e)}function Mt(e){Hr(e);const t=e._el&&e._el.querySelector(".cf .kt");if(!t)return;if(ht(e)){t.dataset.kind="style",t.textContent="🎨 只加提示词",t.title="这个节点不生成任何东西：把它的出口拖到生图/生视频节点上，提交时这段风格会并进那个节点的提示词";return}if(Ht(e)){t.style.display="",t.dataset.kind="text",t.textContent="✍ 文本",t.title=v(e)?"选了加工方式：点「↑ 运行」把接进来的文本加工后写回这个节点":"存一段文字：连到生成节点就并进提示词，连到别的文本节点就当它的输入；在面板里选加工方式可以让大模型来加工";return}if(ft(e)){const p=gn(e);t.style.display="",t.dataset.kind=p?p.kind:"both";const g=p&&p.width&&p.height?` ${p.width}×${p.height}`:"";t.textContent=p?`📎 ${He[p.kind]||p.kind}${g}`:"📎 空的",t.title=p?`${p.origin||""}
把右边的出口拖到别的节点 → 这份素材就进那个节点的格子里`:"点这个节点选一个文件（图片 / 视频 / 音频都收）";const h=e._el.querySelector(".body");!p&&h&&h.querySelector(".ph")&&(h.innerHTML=Er(e));return}const n=ct(e),o=Ga(e),r=Ka(e);t.dataset.kind=o?"both":r;const a=(e.outputs||[])[0],i=a&&a.width&&a.height?` ${a.width}×${a.height}`:"";t.textContent=o?"🖼🎬 跟素材":r==="video"?`🎬 视频${i}`:`🖼 图片${i}`;const s=((ge(e)||{}).inputs||[]).filter(p=>kt.includes(p.type)),c=n&&n.route?Object.keys(n.route):[...new Set(s.map(p=>p.type))],u=[...new Set(s.filter(p=>p.required).map(p=>p.type))];t.title=(o?"放图片就出图片、放视频就出视频":`这个节点出${He[r]}`)+(u.length?`；必需${u.map(p=>He[p]||p).join(" / ")}素材`:c.length?`；可引用${c.map(p=>He[p]||p).join(" / ")}素材`:"；不用素材");const f=e._el.querySelector(".body");!ut(e)&&f&&f.querySelector(".ph")&&(f.innerHTML=Er(e))}function Mi(e){const t=e._el&&e._el.querySelector(".inport");if(!t)return;const n=ct(e),o=ge(e);if(ft(e)){t.style.display="none";return}const r=Ht(e),a=n&&n.route?Object.keys(n.route):[...new Set((o?o.inputs:[]).filter(s=>kt.includes(s.type)).map(s=>s.type))];if(!a.length&&!r){t.style.display="none";return}const i=!ut(e)&&N(o).length;t.style.display="",t.title=r?"文本节点的出口拖到这里：接进来的文字都是这段加工的输入（按连线顺序）":a.length?`上游节点的产物拖到这里（收${a.map(s=>He[s]||s).join(" / ")}${i?"，也收文本节点":""}）`:"文本节点的出口拖到这里"}const $a="application/x-chouka-image-slot";function xl(e,t,n,o){const r=t.map(g=>g.key),a=r.indexOf(n),i=r.indexOf(o);if(a<0||i<0||a===i)return!1;const s=r.map(g=>({key:g,asset:e.assets[g]})),[c]=s.splice(a,1);s.splice(i,0,c);const u=Object.fromEntries(s.map((g,h)=>[g.key,r[h]]));s.forEach((g,h)=>{e.assets[r[h]]=g.asset});const f=ge(e),p=new Map((f&&f.inputs||[]).filter(g=>g.pairWith).map(g=>[g.pairWith,g.key]));if(r.every(g=>p.has(g))){const g=s.map((x,w)=>({from:p.get(x.key),to:p.get(r[w])}));for(const x of[e.params,e.opt,e.optUse,e.optStyle]){if(!x)continue;const w=g.map(y=>({to:y.to,has:Object.prototype.hasOwnProperty.call(x,y.from),value:x[y.from]}));for(const y of g)delete x[y.to];for(const y of w)y.has&&(x[y.to]=y.value)}const h=r.filter(x=>p.has(x));Number.isInteger(e._tab)&&h[e._tab]&&(e._tab=h.indexOf(u[h[e._tab]]))}for(const g of l&&l.edges||[])g.to!==e.id||Ke(g)||(u[g.slot]&&(g.slot=u[g.slot]),Array.isArray(g.slots)&&(g.slots=g.slots.map(h=>u[h]||h)));return!0}function yl(e,t,n,o){if(o.length<2)return;n.draggable=!0,n.classList.add("sortable"),n.title+=`
拖拽可调整图片顺序`;const r=a=>Array.from(a.dataTransfer&&a.dataTransfer.types||[]).includes($a);n.ondragstart=a=>{if(!Le())return a.preventDefault();n._skipClick=!0,a.dataTransfer.effectAllowed="move",a.dataTransfer.setData($a,t.key),it(()=>n.classList.add("dragging"))},n.ondragenter=a=>{r(a)&&(a.preventDefault(),a.stopPropagation(),n.classList.add("drop-target"))},n.ondragover=a=>{r(a)&&(a.preventDefault(),a.stopPropagation(),a.dataTransfer.dropEffect="move")},n.ondragleave=a=>{n.contains(a.relatedTarget)||n.classList.remove("drop-target")},n.ondrop=a=>{if(!r(a))return;a.preventDefault(),a.stopPropagation(),n.classList.remove("drop-target");const i=a.dataTransfer.getData($a);xl(e,o,i,t.key)&&(Mt(e),Ge(),Ot(),Ce(e.id),X())},n.ondragend=()=>{n.classList.remove("dragging","drop-target"),H(()=>{n._skipClick=!1},0)}}function zi(e,t,n){const o=ge(e),r=d.createElement("div");r.className="slots refs";const a=t.filter(p=>(e.assets||{})[p.key]),i=n&&n.route,s=[...new Set(t.map(p=>p.type))],c=d.createElement("div");if(c.className="refhead",i)c.textContent="引用上限：素材 1 个";else{const p=[];for(const g of s){const h=Jn(o,g);h&&p.push(`${He[g]||g} ${h}`)}c.textContent=p.length?`引用上限：${p.join(" · ")}`:"当前模型不支持画布素材引用"}r.appendChild(c);const u=a.filter(p=>p.type==="image");for(const p of a){const g=wl(e,p);p.type==="image"&&yl(e,p,g,u),r.appendChild(g)}const f=d.createElement("div");if(f.className="refadds",i){if(!a.length&&t.length){const p=d.createElement("button");p.className="refadd",p.textContent="＋ 添加素材（0/1）",p.title="可引用图片或视频，上限 1 个",p.onclick=()=>Po(e,t[0]),f.appendChild(p)}}else for(const p of s){const g=Jn(o,p),h=a.filter(y=>y.type===p).length,x=t.find(y=>y.type===p&&!(e.assets||{})[y.key]);if(!g||h>=g||!x)continue;const w=d.createElement("button");w.className="refadd",w.textContent=`＋ 添加${He[p]||p}（${h}/${g}）`,w.title=`${He[p]||p}引用上限 ${g}`,w.onclick=()=>Po(e,x),f.appendChild(w)}return f.childElementCount&&r.appendChild(f),r}function wl(e,t){const n=e.assets[t.key],o=d.createElement("div");o.className="slot"+(n?" filled":t.required?" req":""),o.dataset.key=t.key,o.title=(t.hint||ln(t,e))+(t.required?"（必填）":"")+(n?`
单击预览；右键更换、下载或清空素材`:`
单击上传素材`),o.innerHTML='<div class="box"></div><span class="lbl"></span>',o.querySelector(".lbl").textContent=ln(t,e);const r=o.querySelector(".box");return n?(r.innerHTML=n.kind==="image"?`<img src="${n.url}" draggable="false">`:n.kind==="video"?`<video data-video-url="${n.url}" muted draggable="false"></video>`:"🎵",ki(r)):r.textContent=t.type==="audio"?"🎵":t.type==="video"?"🎬":Aa(t)?"田":"＋",o.onclick=()=>{if(!o._skipClick)return n?eo(n):Po(e,t)},o.oncontextmenu=a=>{a.stopPropagation(),a.preventDefault(),n&&Nt(a.clientX,a.clientY,n.origin||ln(t,e),[{icon:"⛶",text:n.kind==="image"?"查看大图":"放大播放",run:()=>eo(n)},{icon:"↻",text:"更换素材",run:()=>Po(e,t)},{icon:"↓",text:"下载素材",run:()=>Vr({...n,filename:n.origin||n.filename||n.url})},{icon:"✕",text:"清空这一格",danger:!0,run:()=>{delete e.assets[t.key],ei(e.id,t.key),Mt(e),Ge(),Ot(),Ce(e.id),X()}}])},o}const Li=e=>{const t=String(e??"").split(":"),n=t.length>1?+t[0]*60+ +t[1]:+t[0];return Number.isFinite(n)?Math.max(0,Math.round(n)):0},no=e=>`${Math.floor(e/60)}:${String(Math.round(e)%60).padStart(2,"0")}`;function vl(e,t,n,o){const r=d.createElement("div");r.className="arange";const a=d.createElement("div");a.className="atitle",a.textContent="用音频的哪一段",r.appendChild(a);const i=e.assets[t.key];if(!i){const we=d.createElement("div");return we.className="anote",we.textContent=`先在上面的「${ln(t,e)}」传一段音频，这里就能试听、拖着选要用的一段。`,r.appendChild(we),r}const s=d.createElement("audio");s.src=i.url,s.preload="metadata",r.appendChild(s);const c=d.createElement("div");c.className="atrack",c.innerHTML='<div class="asel"></div><div class="ahead"></div><div class="ahd s" title="拖动：选段从这里开始"></div><div class="ahd e" title="拖动：选段到这里结束"></div>';const u=c.querySelector(".asel"),f=c.querySelector(".ahead"),p=c.querySelector(".ahd.s"),g=c.querySelector(".ahd.e");r.appendChild(c);const h=d.createElement("div");h.className="aout",r.appendChild(h);const x=d.createElement("div");x.className="abtn",r.appendChild(x);const w=d.createElement("div");w.className="anote",w.textContent="点条子上任意位置就从那儿开始听；听到该起／该停的地方，按下面两个按钮把边界钉在那里。",r.appendChild(w);let y=Li(e.params[n.key]!=null?e.params[n.key]:n.default),j=Li(e.params[o.key]!=null?e.params[o.key]:o.default);const J=()=>Math.floor(s.duration)||Math.max(j,1);function We(we,P){const ie=J();if(we=Math.max(0,Math.min(Math.round(we),ie-1)),P=Math.max(we+1,Math.min(Math.round(P),ie)),we===y&&P===j)return Lt();y=we,j=P,e.params[n.key]=no(y),e.params[o.key]=no(j),Lt(),X()}s.onloadedmetadata=()=>We(y,j);let mt=0;const Je=(we,P)=>{mt=P,s.currentTime=we,s.play()};s.ontimeupdate=()=>{mt&&s.currentTime>=mt&&s.pause(),Lt()},s.onplay=s.onpause=s.onended=()=>Lt();const Ne=(we,P,ie)=>{const Q=d.createElement("button");return Q.textContent=we,Q.title=P,Q.onclick=ie,x.appendChild(Q),Q},xt=Ne("▶ 试听选段","只放选中的这一段",()=>s.paused?Je(y,j):s.pause());Ne("▶ 整条","从头放到尾，用来找该从哪儿起",()=>Je(0,0)),Ne("⇤ 起点钉在这","把选段开头挪到当前播放位置",()=>We(Math.floor(s.currentTime),j)),Ne("终点钉在这 ⇥","把选段结尾挪到当前播放位置",()=>We(y,Math.ceil(s.currentTime)));const zt=we=>{const P=c.getBoundingClientRect();return Math.max(0,Math.min(1,(we.clientX-P.left)/P.width))*J()},yt=we=>P=>{P.stopPropagation(),P.preventDefault();const ie=ue=>we==="s"?We(zt(ue),j):We(y,zt(ue)),Q=()=>{ne.removeEventListener("mousemove",ie),ne.removeEventListener("mouseup",Q)};ne.addEventListener("mousemove",ie),ne.addEventListener("mouseup",Q)};p.onmousedown=yt("s"),g.onmousedown=yt("e"),c.onmousedown=we=>{we.stopPropagation(),s.currentTime=zt(we),Lt()};function Lt(){const we=J(),P=ie=>Math.max(0,Math.min(ie,we))/we*100+"%";u.style.left=P(y),u.style.width=(Math.min(j,we)-y)/we*100+"%",p.style.left=P(y),g.style.left=P(j),f.style.left=P(s.currentTime),h.textContent=`${no(y)} → ${no(j)}　选中 ${j-y} 秒`+(s.duration?`　（整条 ${no(Math.floor(s.duration))}）`:""),xt.textContent=s.paused?"▶ 试听选段":"⏸ 停"}return Lt(),r}function Po(e,t){if(!Le())return;const n=ct(e),o=n&&n.route&&Object.keys(n.route).length>1&&Object.values(n.route).some(r=>r.slot===t.key);m.picker.accept=o?Object.keys(n.route).map(r=>`${r}/*`).join(","):t.type==="audio"?"audio/*":t.type==="video"?"video/*":"image/*",m.picker.onchange=()=>F((async()=>{const r=m.picker.files[0];if(m.picker.value="",!!r)try{Ki(e,t,await It(r,ge(e)?.execution==="browser")),Ce(e.id),X()}catch(a){Ue.markWorkFailure(a),$e("上传失败："+a.message)}})()),m.picker.click()}function Io(e,t){Le()&&(m.picker.accept="image/*,video/*,audio/*",m.picker.onchange=()=>F((async()=>{const n=m.picker.files[0];if(m.picker.value="",!!n)try{const o=await It(n);t?await t(o):await ro(e,o)}catch(o){Ue.markWorkFailure(o),$e("上传失败："+o.message)}})()),m.picker.click())}async function ro(e,t,n=!0){if(!Le()||!l.cards.includes(e))return;e.outputs=[{...t,filename:(t.origin||t.url).split(/[\\/]/).pop()}],delete e.w,delete e.h,Tn(e),Qe(e),Gt(e),n&&Ce(e.id),Ge(),X();const o=l.edges.filter(r=>r.from===e.id&&!Ke(r));for(const r of o){const a=l.cards.find(i=>i.id===r.to);if(!(!a||!a.assets)){for(const i of bn(r))a.assets[i]=JSON.parse(JSON.stringify(e.outputs[0]));Bn(a),Mt(a)}}if(t.kind==="image"){const r=new Image;r.onload=()=>{if(!l?.cards.includes(e)||e.outputs[0]?.url!==t.url)return;const a=r.naturalWidth,i=r.naturalHeight;e.outputs[0].width=a,e.outputs[0].height=i,Mt(e),X()},r.src=t.url}else if(t.kind==="video"){const r=d.createElement("video");r.onloadedmetadata=()=>{if(!l?.cards.includes(e)||e.outputs[0]?.url!==t.url)return;const a=r.videoWidth,i=r.videoHeight;e.outputs[0].width=a,e.outputs[0].height=i,Mt(e),X()},Gr(r,t.url)}}function kl(){Le()&&l&&Io(null,e=>{const t=ia(),n=xn("card_asset",t.x,t.y);n&&(ro(n,e),ee(`已放进一个素材节点（${He[e.kind]||e.kind}）：把它右边那颗点拖到生图/生视频/工具节点上，这份素材就进那个节点的格子`))})}function To(e,t){const n=d.createElement("div");n.className="row";const o=d.createElement("label");o.textContent=t.label,o.title=t.hint||t.label,n.appendChild(o);const r=e.params[t.key]!=null?e.params[t.key]:t.type==="seed"?-1:t.default;if(Ve(e)&&t.key==="duration"){const a=d.createElement("input");a.type="number",a.min=t.min,t.max!=null&&(a.max=t.max),a.step=1,a.required=!0,a.value=r,a.style.width="72px";const i=t.max!=null?d.createElement("input"):null;i&&(i.type="range",i.min=t.min,i.max=t.max,i.step=1,i.value=r,i.oninput=()=>{a.value=i.value,e.params.duration=Number(i.value),X()},n.appendChild(i)),a.oninput=()=>{e.params.duration=a.value===""?"":Number(a.value),i&&(i.value=a.value),X()},a.onchange=()=>{Uo(e),a.value=e.params.duration,i&&(i.value=a.value),X()},n.appendChild(a)}else if(t.type==="slider"){const a=d.createElement("input");a.type="range",a.min=t.min!=null?t.min:1,a.max=t.max!=null?t.max:30,a.step=t.step||1;const i=q[Wt(e)]||ge(e),s=ns(e,i);if(t.key==="duration"&&s&&!i.inputs.some(f=>f.key==="preview_seconds")){const f=[+s.duration,+r].filter(p=>Number.isFinite(p)&&p>0);a.min=Math.min(+a.min,...f),a.max=Math.max(+a.max,...f),a.step="any"}const c=d.createElement("input");c.type="number",c.min=a.min,c.max=a.max,c.step=a.step,c.style.width="72px",a.value=c.value=r??a.min;const u=f=>{a.value=c.value=f,e.params[t.key]=parseFloat(f),X()};a.oninput=()=>u(a.value),c.oninput=()=>u(c.value),n.appendChild(a),n.appendChild(c)}else if(t.type==="seed"){const a=d.createElement("input");a.type="number",a.style.flex="1",a.value=r??-1,a.oninput=()=>{e.params[t.key]=a.value===""?-1:parseInt(a.value),X()};const i=d.createElement("button");i.className="dice",i.textContent="🎲 随机",i.title="-1 = 每次随机",i.onclick=()=>{a.value=-1,e.params[t.key]=-1,X()},n.appendChild(a),n.appendChild(i)}else if(t.type==="textarea"){const a=d.createElement("textarea");a.style.flex="1",a.style.minHeight="48px",a.value=r??"",a.oninput=()=>{e.params[t.key]=a.value,X()},n.appendChild(a)}else if(t.type==="select"&&t.appearance==="switch"){const a=d.createElement("button");a.type="button",a.className="param-switch",a.id=`param-${e.id}-${t.key}`,o.htmlFor=a.id,a.setAttribute("role","switch"),a.setAttribute("aria-label",t.label);const i=d.createElement("span");i.className="param-switch-track",i.setAttribute("aria-hidden","true");const s=d.createElement("span");s.className="param-switch-thumb",i.appendChild(s);const c=d.createElement("span");c.className="param-switch-state",c.setAttribute("aria-hidden","true"),a.append(i,c);const u=()=>{const f=(e.params[t.key]??t.default)==="on";a.setAttribute("aria-checked",String(f)),c.textContent=f?"开启":"关闭"};a.onclick=()=>{e.params[t.key]=a.getAttribute("aria-checked")==="true"?"off":"on",u(),X()},u(),n.appendChild(a)}else if(t.type==="select"&&t.options){const a=d.createElement("select");a.style.flex="1";for(const i of t.options){const s=d.createElement("option");s.value=typeof i=="object"?i.value:i,s.textContent=typeof i=="object"?i.label:i,a.appendChild(s)}r!=null&&(a.value=r),a.onchange=()=>{e.params[t.key]=a.value,X(),t.key==="aspect_ratio"&&Ce(e.id)},n.appendChild(a)}else{const a=d.createElement("input");a.type=t.type==="number"?"number":"text",t.min!=null&&(a.min=t.min),t.max!=null&&(a.max=t.max),a.value=r??"",a.style.flex="1",a.oninput=()=>{e.params[t.key]=a.type==="number"?a.value===""?"":parseFloat(a.value):a.value,X()},n.appendChild(a)}if(t.warnAbove!=null&&t.warning){const a=d.createElement("div");a.className="paramwarn";const i=()=>{const s=parseFloat(e.params[t.key]!=null?e.params[t.key]:t.default);a.hidden=!isFinite(s)||s<=t.warnAbove,a.textContent=t.warning};for(const s of n.querySelectorAll("input, select"))s.addEventListener("input",i),s.addEventListener("change",i);i(),n.appendChild(a)}if(t.showHint&&t.hint){const a=d.createElement("div");a.className="knobnote",a.id=`param-${e.id}-${t.key}-hint`,a.textContent=t.hint;const i=[...n.querySelectorAll("input, select, textarea, button")];for(const[s,c]of i.entries())c.id=`param-${e.id}-${t.key}-${s}`,c.setAttribute("aria-describedby",a.id),c.setAttribute("aria-label",t.label+(s?"数值":""));i.length&&(o.htmlFor=i[0].id),n.appendChild(a)}return(t.key==="megapixels"||t.key==="scale_to_length")&&_l(e,t,n),t.key==="frame_load_cap"&&Cl(e,t,n),n}async function Cl(e,t,n){const o=Object.values(e.assets||{}).find(c=>c&&c.kind==="video"),r=d.createElement("span");r.className="resout";const a=d.createElement("div");if(a.className="resline",a.appendChild(r),n.appendChild(a),!o){r.textContent="放进视频后这里显示总帧数";return}let i="读取总帧数…";const s=()=>{if(!o.frames){r.textContent=i;return}const c=parseFloat(e.params[t.key]!=null?e.params[t.key]:t.default)||0;r.textContent=`这段共 ${o.frames} 帧`+(o.fps?` · ${(+o.fps).toFixed(0)} fps · ${(+o.duration).toFixed(1)} 秒`:"")+(c>0&&c<o.frames?` → 只跑前 ${c} 帧`:" → 整段都跑")};s();for(const c of n.querySelectorAll("input"))c.addEventListener("input",s);if(!o.frames){try{Object.assign(o,await vt("/api/media?ref="+encodeURIComponent(o.ref)+"&project="+encodeURIComponent(l.id))),o.frames&&X()}catch(c){$e(`读取媒体信息失败：${c.message}`)}i="总帧数读不出来（填 0 = 整段，一定没错）",s()}}function _l(e,t,n){const r=ge(e).inputs.find(g=>g.key==="aspect_ratio"),a=r?e.params.aspect_ratio!=null?e.params.aspect_ratio:r.default:"16:9 (Widescreen)",i=d.createElement("span");i.className="resout";const s=[...n.querySelectorAll("input")],c=()=>{const g=parseFloat(e.params[t.key]!=null?e.params[t.key]:t.default);if(!isFinite(g)){i.textContent="";return}if(t.key==="megapixels"){const[h,x]=cr(a,g);i.textContent=`${h}×${x} · ${Math.min(h,x)}p`,i.title=`${a}，${g} 百万像素`}else i.textContent=`16:9 素材 → ${Math.round(g)}×${qi(g)} · ${qi(g)}p`,i.title="长边固定为这个值，短边按素材原比例算，所以 p 数随素材变"},u=g=>{for(const h of s)h.value=g;e.params[t.key]=g,c(),X()},f=d.createElement("span");f.className="presets";for(const g of pr){const h=t.key==="megapixels"?Xi(a,g):Wi[g],x=d.createElement("button");x.textContent=g+"p",h>t.max?(x.disabled=!0,x.title=t.key==="megapixels"?`${a} 下 ${g}p 需要 ${h} 百万像素，超过当前参数上限 ${t.max}`:`最长边 ${h}px 超过当前参数上限 ${t.max}`):(x.title=t.key==="megapixels"?`${cr(a,h).join("×")} · 短边 ${g}p`:`16:9 素材约 ${g}p；最长边 ${h}px，实际短边随素材比例变化`,x.onclick=()=>u(h)),f.appendChild(x)}const p=d.createElement("div");p.className="resline",p.append(i,f),n.appendChild(p);for(const g of s)g.addEventListener("input",c);c()}function Ro(e,t=l){return t?.director?.shots?.find(n=>n.id===e.director_shot||n.image?.card===e.id||n.video?.card===e.id)}function ja(e){const t=Ro(e);if(!t)return[];const n=[];return t.shotSize&&n.push("景别："+t.shotSize),(e.director_stage==="video"||t.video?.card===e.id)&&t.movement&&n.push("运镜："+t.movement),l.director.style?.trim()&&n.push("统一画面风格："+l.director.style.trim()),n}function Na(e){const t=q[Wt(e)]||ge(e),n={},o={},r=nt(e),a=ja(e),i=new Set(N(t).map(s=>s.key));for(const s of t.inputs){if(kt.includes(s.type)||s.mirror)continue;const c=e.params[s.key];if(c!=null?n[s.key]=c:s.type==="seed"?n[s.key]=-1:s.default!==void 0&&(n[s.key]=s.default),!i.has(s.key))continue;const u=qr(e,s.key);if(u!=null)n[s.key]=u;else{let f=Sa(n[s.key],e);r.length&&(f=co(f,r)),n[s.key]=f}a.length&&s.key==="prompt"&&(n[s.key]+=`
`+a.join(`
`))}if(es(t,n),t.imageControls){const s=Jo(e,t);n.image_ratio=s.ratio,n.image_clarity=s.clarity;for(const c of Fo)delete n[c]}for(const s of t.inputs.filter(c=>kt.includes(c.type))){const c=e.assets[s.key];c&&c.ref&&(o[s.key]=c.ref)}return{capability:t.id,params:n,assets:o,project:l&&l.id,projectName:l&&l.name,card:e.id,cardName:fe(e)}}function Oo(e){return e._ifRestoring?(ee("正在查询原产物，请勿重复生成"),Promise.resolve()):(e._runPromise||(e._runPromise=F(El(e).finally(()=>{delete e._runPromise}))),e._runPromise)}function Pi(e,t){!Ve(e)||!he()||!wn(e,t)||(e._ifResumePreparing?(delete e._ifResumePreparing,e._runPromise=F(Ii(e,!0).finally(()=>{delete e._runPromise}))):e.status==="running"&&(e.job?oo(e,t):e.if_request_id&&Ma(e,t)))}async function Ma(e,t){if(e._ifRecovering||l?.id!==t||!he()||!l.cards.includes(e)||!Ve(e)||!wn(e,t)||e.job||e.status!=="running"||!e.if_request_id)return;e._ifRecovering=!0;let n=!1;try{const o=await sn(`/requests/${encodeURIComponent(e.if_request_id)}`);if(l?.id!==t||!he()||!l.cards.includes(e))return;e.job=o.id,e.error=null,e.step="本机 IF 已接收原请求，正在恢复进度";const r=Or(e,t);r.job=o.id,Ut(r),Mr(e,{id:o.id,capability:e.if_job_cap||e.cap,prompts:e.if_pending_prompts||[]}),delete e.if_pending_prompts,Rt(e,t,"running"),await hn(e,t),oo(e,t)}catch(o){if(l?.id!==t||!l.cards.includes(e))return;n=o instanceof TypeError||o.status>=500||o.status===404&&Date.now()-(e.if_submitted_at||e.if_started)<12e4,e.step=n?"正在向本机 IF 确认原请求，请勿重复生成":"",n||(e.status="error",e.error="IF 提交结果尚未确认，请先在 IF 查看是否已创建任务，避免重复生成："+o.message),Rt(e,t,"submitting"),n||($e(e.error),await hn(e,t))}finally{e._ifRecovering=!1,l?.id===t&&l.cards.includes(e)&&(Qe(e),m.panel._id===e.id&&Ce(e.id),n&&H(()=>Ma(e,t),2500))}}async function Ii(e,t=!1){const n=l,o=e.cap,r=[];let a=!1,i=!1;e.status="queued",e.error=null,e.progress=null,e.job=null,e.ms=null,e.step="正在连接本机 IF 并读取模型",e.if_job_cap=o,t||(e.if_started=Date.now(),e.if_request_id=Array.from(crypto.getRandomValues(new Uint8Array(16)),c=>c.toString(16).padStart(2,"0")).join("")),delete e.if_submitted_at,delete e.if_pending_prompts,delete e.if_canvas_url;const s=Rt(e,n.id,"preparing");Qe(e),m.panel._id===e.id&&Ce(e.id);try{if(!s)throw new Error("无法保存 IF 刷新恢复记录，尚未提交生成；请检查浏览器存储空间和权限");const c=await ur(n.id);if(!c.ok)throw new Error("任务准备状态保存失败，尚未提交 IF："+(c.error?.message||"请重试"));const u=await Ln();if(!Mn)throw new Error("请更新本机 IF 桥接器后重试；当前版本不支持提交期间刷新恢复");if(await Xo(e),l!==n||!he()||!n.cards.includes(e)||e.cap!==o)throw new Error("画布已切换或权限已变化，已取消 IF 提交");const f=ge(e).outputType,p=u.filter(Q=>Q.type===f).find(Q=>Q.display_name===e.params.if_model)||!e.params.if_model&&u.find(Q=>Q.type===f);if(!p)throw new Error("当前 IF 模型不可用，请重新选择模型");if(["exhausted","unavailable"].includes(p.quota_status))throw new Error(`${p.display_name}：${zn(p)}，尚未提交生成，请选择其他模型`);const g=String(e.params.prompt||""),h=g.trim();if(!h)throw new Error("请先填写 IF 生成需求");const x=Bo(p.display_name,f),w=Object.entries(e.assets||{}).filter(([,Q])=>Q&&kt.includes(Q.kind)).sort(([Q],[ue])=>Q.localeCompare(ue,void 0,{numeric:!0})),y={image:0,video:0,audio:0};for(const[Q,ue]of w){const me=Q.match(/^(?:images|video)\[(\d+)\]$/);if(!me||ue.kind==="image"!==Q.startsWith("images["))throw new Error(`引用槽位与${He[ue.kind]||ue.kind}类型不匹配，请重新连接引用`);if(Number(me[1])>=(x.bridge[ue.kind]||0))throw new Error(`所选模型最多引用图片 ${x.bridge.image} 张、视频 ${x.bridge.video} 个；当前引用槽位超出范围，请移除多余引用或更换模型`);y[ue.kind]++}if(Object.keys(y).some(Q=>y[Q]>(x.bridge[Q]||0)))throw new Error("引用数量超出所选 IF 模型的画布槽位");const j={type:f,model:p.display_name,request_id:e.if_request_id,prompt:co(Sa(h,e),nt(e))},J=ja(e);J.length&&(j.prompt+=`
`+J.join(`
`));const We=ge(e),mt=We.inputs,Je=[];if(f==="image"){const{ratio:Q,clarity:ue}=Jo(e,We),[me,Ye]=Q.split(":").map(Number),ze=Wo.find(ke=>ke.id===ue).val,U=me>=Ye?Math.round(ze*me/Ye/16)*16:ze,te=me>=Ye?ze:Math.round(ze*Ye/me/16)*16;Je.push(`分辨率：${U}×${te}`)}else{const Q=mt.find(je=>je.key==="aspect_ratio"),ue=mt.find(je=>je.key==="megapixels"),me=e.params.aspect_ratio??Q.default,Ye=Number(e.params.megapixels??ue.default),ze=La(e,We),U=ze?[ze.width,ze.height]:cr(me,Number.isFinite(Ye)&&Ye>=ue.min&&Ye<=ue.max?Ye:ue.default),te=mt.find(je=>je.key==="duration"),ke=Number(e.params.duration??te.default);if(!Number.isSafeInteger(ke)||ke<te.min||te.max!=null&&ke>te.max)throw new Error(te.max!=null?`当前 IF 模型时长须为 ${te.min}–${te.max} 秒的整数，请修改时长`:"当前 IF 模型时长范围未核实，请输入正整数秒");const[se,be]=so[me]||[1,1];Je.push(`分辨率：${U[0]}×${U[1]}`,`时长：${ke}s`,`画面比例：${se} : ${be}`)}j.prompt+=`

${Je.join(`
`)}`;const Ne=f==="video"?"视频":"图片",xt=f==="video"?"图片、":"",zt=f==="video"?"不要改为生图":"不要改为视频或文字方案";if(j.prompt=`最终交付必须是${Ne}文件，不是${xt}故事板或文字方案。用户已经确认生成需求，请直接生成${Ne}；不要等待用户确认规划、分镜或中间图片，也不要把中间图片当作最终结果。如无法直接完成，请说明原因，${zt}。以本条${Ne}目标和以下参数要求为准。

${j.prompt}`,f==="image"&&e.params.if_reference?.trim()){if(!x.bridge.image&&!x.bridge.video)throw new Error("该模型不支持已确认的媒体引用");j.image=e.params.if_reference.trim()}const yt=Or(e,n.id);yt.pending=[],yt.job=null;const Lt=Q=>JSON.stringify([Q.kind,new rt(Q.url,location.href).href,Q.ref||""]),we=new Set(w.map(([,Q])=>Lt(Q)));if(yt.entries=yt.entries.filter(Q=>we.has(Q.source)),Ut(yt),w.length){if(!Rr)throw new Error("请更新本机 IF 桥接器后重试；当前版本不支持引用复用");j.references=[];for(const[Q,[,ue]]of w.entries()){const me=`${He[ue.kind]}引用（${Q+1}/${w.length}）`,Ye=new rt(ue.url,location.href);if(Ye.origin!==location.origin)throw new Error("IF 仅能上传当前画布内的本机素材");e.step=`正在检查 IF ${me}是否可复用`,Qe(e);const ze=await po(Ye,ue.kind);if(l!==n||!n.cards.includes(e)||e.cap!==o||!he())throw new Error("画布已切换或权限已变化，已取消 IF 提交");const U={source:Lt(ue),version:ze,kind:ue.kind};yt.pending.push(U);const te=yt.entries.find(_e=>_e.source===U.source&&_e.version===ze&&_e.kind===ue.kind&&Ar(_e.url));if(te){e.step=`正在复用已上传 IF 的${me}`,Qe(e),j.references.push({kind:ue.kind,url:te.url});continue}e.step=`正在读取 IF ${me}`,Qe(e);const ke=await dt(Ye,{credentials:"same-origin",cache:"no-store"});if(!ke.ok)throw new Error("无法读取画布引用素材");let se=await ke.blob();const be=ue.kind==="image"?["image/png","image/jpeg","image/webp"]:["video/mp4"],je=ue.kind==="image"?1e7:50*1024*1024;if(!be.includes(se.type)||se.size>je){e.step=`正在适配 IF ${He[ue.kind]}上传副本（${Q+1}/${w.length}）`,Qe(e);const _e=await dt(`/api/if-reference?${new URLSearchParams({url:Ye.pathname+Ye.search,type:ue.kind})}`,{credentials:"same-origin",cache:"no-store",headers:{"If-Match":ze}});if(!_e.ok)throw new Error(`IF 素材自动适配失败：${(await _e.text()).slice(0,500)}`);const wt=se.size;se=await _e.blob();const qe=_e.headers.get("X-Chouka-IF-Conversion");if(l!==n||!n.cards.includes(e)||e.cap!==o||!he())throw new Error("画布已切换或权限已变化，已取消 IF 提交");ee(`IF ${He[ue.kind]}上传副本已${qe==="lossless-webp"?"转换为无损 WebP":"压缩"}（${(wt/1048576).toFixed(1)} → ${(se.size/1048576).toFixed(1)} MB），原素材保持不变`)}if(!se.size||!be.includes(se.type)||se.size>je)throw new Error(`IF 上传副本仍不符合格式或 ${ue.kind==="image"?10:50} MB 大小限制，原素材未修改`);if(l!==n||!n.cards.includes(e)||e.cap!==o||!he())throw new Error("画布已切换或权限已变化，已取消 IF 提交");if(await po(Ye,ue.kind)!==ze)throw new Error("准备期间引用素材已变化，请重试");e.step=`正在向本机桥接传送${me}`,Qe(e);const Ze=await sn("/assets",{method:"POST",headers:{"X-Chouka-IF":"asset","Content-Type":se.type},body:se});if(r.push(Ze.asset_id),j.references.push({kind:ue.kind,asset_id:Ze.asset_id}),l!==n||!n.cards.includes(e)||e.cap!==o)throw new Error("画布已切换，已取消 IF 提交")}}if(Ut(yt),e.params.if_model=p.display_name,e.status="queued",e.error=null,e.progress=null,e.outputs=[],e.ms=null,e.step="正在交由本机 IF 桥接处理",e.job=null,i=!0,e.if_submitted_at=Date.now(),e.if_pending_prompts=[{key:"if_original",label:"原始提示词",text:g},{key:"if_submitted",label:"提交给 IF CLI 的提示词",text:j.prompt}],!Rt(e,n.id,"submitting"))throw new Error("无法保存 IF 提交恢复记录，尚未提交生成；请检查浏览器存储空间和权限");Qe(e),m.panel._id===e.id&&Ce(e.id);const P=await sn("/runs",{method:"POST",headers:{"Content-Type":"application/json","X-Chouka-IF":"generate"},body:JSON.stringify(j)});a=!0,e.job=P.id,e.if_job_cap=o,e.status="running",e.step="本机 IF 正在准备生成任务",yt.job=P.id,Ut(yt),Mr(e,{id:P.id,capability:o,prompts:e.if_pending_prompts}),delete e.if_pending_prompts,Rt(e,n.id,"running"),m.hist._id===e.id&&zr(e.id),(await hn(e,n.id)).ok||$e("IF 任务已提交，服务器状态保存失败；已保留本标签页恢复记录，请勿重复生成"),oo(e,n.id)}catch(c){const u=i&&!a&&(c instanceof TypeError||c instanceof SyntaxError||c.status>=500);if(!a&&!u&&r.length&&await Promise.allSettled(r.map(f=>sn(`/assets/${encodeURIComponent(f)}`,{method:"DELETE",headers:{"X-Chouka-IF":"asset"}}))),l!==n||!n.cards.includes(e))return;u?(e.status="running",e.error=null,e.step="正在向本机 IF 确认原请求",Rt(e,n.id,"submitting"),Ma(e,n.id)):(e.status="error",e.error=c.message,e.step="",e.job=null,Rt(e,n.id,"error"),$e(`「${fe(e)}」生成失败：${e.error}`),await hn(e,n.id))}l===n&&n.cards.includes(e)&&(Qe(e),m.panel._id===e.id&&Ce(e.id))}async function oo(e,t,n=null){if(e._ifPolling||l?.id!==t||!he()||!Ve(e)||!l.cards.includes(e)||!wn(e,t)||!e.job||e.status!=="running")return;e._ifPolling=!0;const o={job:e.job,request:e.if_request_id,started:e.if_started,cap:e.cap},r=()=>l?.id===t&&he()&&l.cards.includes(e)&&e.job===o.job&&e.if_request_id===o.request&&e.if_started===o.started&&e.cap===o.cap;let a=!1;try{const i=n||await sn(`/runs/${encodeURIComponent(e.job)}`);if(!r())return;Kt(e,i.result,t);const s=Zn(i.result);s&&(e.if_canvas_url=s);const c=e.history?.find(h=>h.job===e.job)?.prompts?.find(h=>h.key==="if_submitted");if(c&&typeof i.result?.submitted_prompt=="string"&&(c.text=i.result.submitted_prompt),i.state==="starting"||i.state==="running"){e.step=i.step||(i.state==="starting"?"本机 IF 正在准备生成任务":"IF 正在生成"),a=!0;return}if(i.state==="error")throw new Error((i.error||"IF 生成失败")+(i.result?.invalid_reference_indices?.length?"；已清除失效引用缓存，重试时仅重新上传失效素材":""));const u=i.result?.downloaded||[],f=ge(e).outputType,p=/请确认|确认后|回复["“]?确认/.test(i.result?.planning_text||"");if(!u.length)throw new Error(p?`IF 要求确认规划或故事板，未直接生成${He[f]}；请在 IF 网站查看该会话。`:`IF 未返回${He[f]}产物，请在 IF 网站查看该会话。`);const g=[];for(const[h,x]of u.entries()){if(x.type!==ge(e).outputType)continue;e.step=`正在取回 IF ${He[x.type]}产物（${h+1}/${u.length}）`,Qe(e);const w=await dt(`${Tt}/runs/${encodeURIComponent(e.job)}/media/${x.index}`,{credentials:"omit"});if(!w.ok)throw w.status>=500||w.status===429?new TypeError("IF 产物暂不可读取"):new Error("无法读取 IF 产物");const y=new File([await w.blob()],x.name);if(!r())return;e.step=`正在保存 IF ${He[x.type]}产物（${h+1}/${u.length}）`,Qe(e);const j=await It(y,x.type==="image");if(!r())return;g.push({...j,filename:x.name})}if(!g.length)throw new Error(f==="video"&&u.some(h=>h.type==="image")?`IF 只生成了故事板图片，尚未生成视频${p?"，并要求确认下一步":""}；请在 IF 网站查看该会话。`:`IF 返回的媒体类型与当前${He[f]}节点不符，请在 IF 网站查看该会话。`);e.outputs=g,e.status="done",e.step="",e.error=null,e.ms=Date.now()-(e.if_started||Date.now()),Mr(e,{id:e.job,capability:e.if_job_cap||e.cap}),m.hist._id===e.id&&zr(e.id),Rt(e,t,"done"),await Ti(e)}catch(i){if(!r())return;i instanceof TypeError||/桥接请求失败|Failed to fetch/.test(i.message)?(e.step="IF 连接或产物读取中断，正在重试",a=!0):(e.status="error",e.error=i.message,e.step="",e.ms=Date.now()-(e.if_started||Date.now()),e.job&&Mr(e,{id:e.job,capability:e.if_job_cap||e.cap}),m.hist._id===e.id&&zr(e.id),$e(`「${fe(e)}」生成失败：${i.message}`))}finally{e._ifPolling=!1,r()&&(Rt(e,t,a?"running":e.status),Qe(e),m.panel._id===e.id&&Ce(e.id),a?H(()=>oo(e,t),2500):["done","error"].includes(e.status)&&await hn(e,t))}}async function El(e){if(!Le())return;const t=l;if(ht(e))return ee("风格节点不用运行：它只把风格并进挂着的那几个节点的提示词");if(Ht(e))return sl(e);if(e.status==="queued"||e.status==="running")return;const n=ge(e);if(!n)return $e("能力不可用");if(n.id==="image_composite"&&n.execution==="browser")return rl(e);if(n.execution==="if_studio")return Ii(e);if(e.director_shot){if(Ue.cancelContentSave(),await Ue.pendingChain,!(await ur(l.id)).ok||!l.cards.includes(e))return;_t++,delete e.director_selected}e.job=null,e.queue_remaining=null,e.queue_ahead=null,e.error=null,e.progress=0,e.status="queued",e.outputs=[],e.ms=null,e.step="",Qe(e),Ce(e.id);try{if(await Xo(e),l!==t||!t.cards.includes(e)||!he())throw new Error("画布已切换或权限变化，未提交生成");const o=Na(e),r=await Vt("/api/generate",o);e.job=r.id,e.seed=r.seed,e.status=r.status,r.project_rev!=null&&l?.id===o.project&&(l.rev=Math.max(l.rev||0,r.project_rev))}catch(o){e.status="error",e.error=o.message,e.job=null,l===t&&Ue.markWorkFailure(o),$e(`「${fe(e)}」提交失败：${o.message}`)}e.director_shot&&(_t=Math.max(0,_t-1)),!(l!==t||!he())&&(Qe(e),m.panel._id===e.id&&Ce(e.id),X(!1),ea())}async function Sl(e){if(e.job)try{await Vt(`/api/job/${e.job}/cancel`)}catch(t){$e(t.message)}}async function Ti(e){const t=l;Ge();for(const n of t.edges.filter(o=>o.from===e.id&&!Ke(o)&&!o.version)){const o=t.cards.find(i=>i.id===n.to);if(!o)continue;const r=e.outputs||[],a=bn(n);n.slots=a;for(let i=0;i<a.length;i++){if(!r[i]){delete o.assets[a[i]];continue}try{const s=await ya(r[i],ge(o)?.execution==="browser");l===t&&t.edges.includes(n)&&tt(o.id)&&(o.assets[a[i]]=s)}catch(s){console.error("导入产物失败:",s),l===t&&$e(`向「${fe(o)}」导入产物失败：${s.message}`)}}if(l!==t)return;Bn(o),Mt(o),m.panel._id===o.id&&Ce(o.id)}}function $l(e){return e.project?l&&e.project===l.id?l.name:(M.find(t=>t.id===e.project)||{}).name||e.projectName||"":e.projectName||""}async function Ri(e){if(!l||l.id!==e.project){if(!M.some(o=>o.id===e.project))return ee("这个任务所在的画布已经不在了");await vr(e.project)}const t=l.cards.find(o=>o.id===e.card);if(!t)return ee("这个节点片已经从画布上删掉了");const n=m.stage.getBoundingClientRect();$.x=n.width/2-(t.x+le(t)/2)*$.k,$.y=n.height/3-t.y*$.k,In(),oe=t.id,B.clear(),Xt=null,Ge(!1);for(const o of l.cards)o._el&&o._el.classList.toggle("sel",o.id===t.id);Ce(t.id),bt(),Pt(),en()}return R.bind({open:vr,refresh:wr,clear:Fn,selectSpace(e){De=e,l&&!Da(l).includes(e)&&Fn(),ho()},renamed(e,t,n){l?.id===e&&(l.name=t,typeof n=="number"&&(l.rev=n),cn()),at.renameProject(e,t)}}),b.onDispose(()=>{Vo++,at.reset(),l=null,Ue.cancelTimers(),wo(),ka(),rr?.disconnect(),Xr()}),{ready:Fa,flush:()=>Yn(void 0,!0),getProject:()=>l,nodeEditor:C?ne.ChoukaNodeEditor:void 0}}function nd(b,k,I,R){const{window:W,document:Y,addEventListener:ne,setTimeout:d,clearTimeout:A,setInterval:H,clearInterval:K,requestAnimationFrame:Pe,cancelAnimationFrame:Be,ResizeObserver:it,MutationObserver:st,IntersectionObserver:Re,URL:Oe}=b;W.H3Auth=k,W.H3Notify=I;const Xe=R.mediaFetch;return(()=>{const rt=new Oe("/",location.href),dt=8192,O=32e6,S=100,Z=512,L=64e6,E=64*1024*1024;let V;const ve=D=>JSON.parse(JSON.stringify(D)),Se=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),D=>D.toString(16).padStart(2,"0")).join(""),Ee=(D,l)=>Number.isFinite(D)&&Number.isFinite(l)&&D>=1&&l>=1&&D<=dt&&l<=dt&&D*l<=O;function Ie(D,l){if(!Ee(D,l))throw new Error("图片或画布超出限制：单边 1–8192 像素，总像素不超过 3200 万。")}function ye(D){if(typeof D!="string"||!D||D.length>8192)throw new Error("图片地址无效。");const l=new Oe(D,location.href),M=l.pathname==="/api/file"||/^\/api\/upload\/[^/]+$/.test(l.pathname)||/^\/api\/artifact\/[^/]+\/[^/]+$/.test(l.pathname);if(!/^https?:$/.test(l.protocol)||l.origin!==location.origin||l.username||l.password||!M||l.hash)throw new Error("仅支持本站受控媒体地址（/api/file、/api/upload/文件名、/api/artifact/项目/文件名）；不接受其他路径、外站、data 或 blob 地址。");if(l.searchParams.sort(),l.href.length>8192)throw new Error("图片地址过长。");return l.href}function et(D){if(!D||D.kind!=="image")throw new Error("只能添加图片资产。");const l=JSON.stringify(D);if(l.length>262144)throw new Error("图片资产描述过大，请勿在编辑稿中嵌入图片数据。");const M=JSON.parse(l);return ye(M.url),M}function le(D){const l=M=>typeof M=="string"?M.trim().split(/[\\/]/).filter(Boolean).at(-1):"";return String(l(D.origin)||l(D.filename)||D.name||"图片").slice(0,200)}function re(D){const l=[`url:${ye(D.url)}`];if(typeof D.ref=="string"&&D.ref.trim()){if(D.ref.length>8192)throw new Error("图片资源标识过长。");l.push(`ref:${D.ref}`)}return l}function _(D){const l=JSON.stringify(D||{version:1,width:1920,height:1080,background:"transparent",layers:[]});if(l.length>2*1024*1024)throw new Error("编辑稿描述超过 2 MiB，请减少图层或资产元数据。");const M=JSON.parse(l);if(M.version!==1||!Array.isArray(M.layers)||M.layers.length>S)throw new Error("编辑稿版本或图层数量无效（最多 100 层）。");if(Ie(M.width,M.height),!Number.isInteger(M.width)||!Number.isInteger(M.height))throw new Error("画布尺寸必须为整数像素。");if(M.background!=="transparent"&&!/^#[a-f\d]{6}$/i.test(M.background))throw new Error("背景必须为透明或六位十六进制颜色。");const Te=new Set;M.layers=M.layers.map($=>{if(!$||typeof $.id!="string"||!$.id||Te.has($.id))throw new Error("图层 ID 无效或重复。");if(Te.add($.id),Ie($.width,$.height),![$.x,$.y,$.angle,$.opacity].every(Number.isFinite)||Math.abs($.x)>1e5||Math.abs($.y)>1e5||Math.abs($.angle)>36e3||$.opacity<0||$.opacity>1)throw new Error("图层位置、角度或透明度无效。");return{id:$.id,name:String($.name||"图片").slice(0,200),asset:et($.asset),x:$.x,y:$.y,width:$.width,height:$.height,angle:$.angle,opacity:$.opacity,visible:$.visible!==!1,locked:!!$.locked}});const De={version:1,width:M.width,height:M.height,background:M.background,layers:M.layers};if(M.linkedSources!==void 0){if(!Array.isArray(M.linkedSources)||M.linkedSources.length>Z||M.linkedSources.some($=>typeof $!="string"||!$||$.length>8196))throw new Error("已连接图片记录无效（最多 512 条有界资源标识）。");De.linkedSources=[...new Set(M.linkedSources)]}return De}async function C(D){const l=new Uint8Array(await D.slice(0,1048576).arrayBuffer()),M=new DataView(l.buffer),Te=(oe,B)=>String.fromCharCode(...l.subarray(oe,oe+B));let De,$;if(l.length>=24&&Te(1,3)==="PNG"&&M.getUint32(0)===2303741511)De=M.getUint32(16),$=M.getUint32(20);else if(l.length>=10&&/^GIF8[79]a$/.test(Te(0,6)))De=M.getUint16(6,!0),$=M.getUint16(8,!0);else if(l.length>=26&&Te(0,2)==="BM")M.getUint32(14,!0)===12?(De=M.getUint16(18,!0),$=M.getUint16(20,!0)):(De=M.getInt32(18,!0),$=Math.abs(M.getInt32(22,!0)));else if(l.length>=30&&Te(0,4)==="RIFF"&&Te(8,4)==="WEBP")for(let oe=12;oe+18<=l.length;){const B=Te(oe,4),St=M.getUint32(oe+4,!0),ot=oe+8;if(B==="VP8X"){De=1+l[ot+4]+(l[ot+5]<<8)+(l[ot+6]<<16),$=1+l[ot+7]+(l[ot+8]<<8)+(l[ot+9]<<16);break}if(B==="VP8 "&&l[ot+3]===157&&l[ot+4]===1&&l[ot+5]===42){De=M.getUint16(ot+6,!0)&16383,$=M.getUint16(ot+8,!0)&16383;break}if(B==="VP8L"&&l[ot]===47){De=1+l[ot+1]+((l[ot+2]&63)<<8),$=1+(l[ot+2]>>6)+(l[ot+3]<<2)+((l[ot+4]&15)<<10);break}oe=ot+St+St%2}else if(l[0]===255&&l[1]===216){let oe=2;for(;oe+8<l.length&&l[oe++]===255;){for(;l[oe]===255;)oe++;const B=l[oe++];if(B===217||B===218)break;if(B===1||B>=208&&B<=215)continue;const St=M.getUint16(oe);if(St<2)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(B)){$=M.getUint16(oe+3),De=M.getUint16(oe+5);break}oe+=St}}if(De===void 0||$===void 0)throw new Error("无法安全识别图片尺寸。请使用标准 PNG、JPEG、WebP、GIF 或 BMP 图片（不支持 SVG / AVIF）。");return Ie(De,$),{width:De,height:$}}async function G(D){const l=D.body.getReader(),M=[];let Te=0;try{for(;;){const De=await l.read();if(De.done)break;if(Te+=De.value.byteLength,Te>E)throw await l.cancel(),new Error("图片文件不得超过 64 MiB。");M.push(De.value)}}finally{l.releaseLock()}return new Blob(M,{type:D.headers.get("content-type")?.split(";")[0]||""})}function pe(){return V||(V=(async()=>{if((!W.fabric||W.fabric.version!=="7.4.0")&&await new Promise((D,l)=>{const M=Y.createElement("script");M.src=new Oe("vendor/fabric.min.js",rt).href,M.onload=D,M.onerror=()=>{M.remove(),l(new Error("本地 Fabric 加载失败，请刷新重试。"))},Y.head.append(M)}),W.fabric?.version!=="7.4.0")throw new Error("需要 Fabric 7.4.0 浏览器构建。")})().catch(D=>{throw V=null,D}),V)}function T(D,l,M){const Te=Y.createElement(D);return l&&(Te.className=l),M!==void 0&&(Te.textContent=M),Te}async function q({state:D,sources:l=[],linkedSources:M=[],upload:Te,onSave:De,onExport:$,canEdit:oe=()=>!0}={}){const B=T("dialog","chouka-composer image-composer-dialog");B.setAttribute("data-image-composer","");const St=`composer-${Se()}`;B.setAttribute("aria-labelledby",St);const ot=T("div","ic-head"),Sn=T("h2","","图片合成");Sn.id=St;const dn=T("button","ic-button","关闭");dn.type="button",dn.dataset.composerAction="close";const $t=T("button","ic-button","重试载入");$t.type="button",$t.hidden=!0,ot.append(Sn,T("span","ic-local","浏览器本地合成 · 原图尺寸输出"),$t,dn);const Qt=T("div","ic-status");Qt.setAttribute("role","status"),Qt.setAttribute("aria-live","polite");const Ft=T("div","ic-error");Ft.setAttribute("role","alert"),Ft.hidden=!0;const An=T("div","ic-body"),_t=T("aside","ic-left"),qt=T("section","ic-center"),Dt=T("aside","ic-right");_t.setAttribute("aria-label","图层和图片素材"),qt.setAttribute("aria-label","合成画布"),Dt.setAttribute("aria-label","图片与画布属性");const m=T("div","ic-toolbar"),Ue=T("div","ic-viewport"),en=T("canvas");en.setAttribute("aria-label","图片合成编辑画布"),Ue.append(en),qt.append(m,Ue,T("p","ic-hint","拖动图片移动，拖动角点缩放。方向键移动 1px，Shift + 方向键移动 10px。"));const X=T("div","ic-footer"),ur=T("span","ic-hint","编辑稿仅保存图片引用；合成 PNG 不包含选择框。");An.append(_t,qt,Dt),X.append(ur),B.append(ot,Qt,Ft,An,X),Y.body.append(B);const Yn=Y.activeElement;let F,Fe,at=null,pt=!1,pn=!1,Vn=!1,$n="",Pt=[],jn=-1,he,on,fr=0,Le=1,mr=!0,It=null,vt=!1;const Fn=new AbortController,cn=new Map,yn=new Map,Vt=()=>W.fabric,lt=()=>{try{return oe()===!0}catch(v){return $e(v),!1}};function $e(v){Ft.textContent=v?.message||String(v),Ft.hidden=!1,console.error("[图片合成]",v)}function hr(){Ft.hidden=!0,Ft.textContent=""}function ee(){return pn||pt||!Vn?!1:lt()?!0:(Qt.textContent="只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。",kt(),!1)}function Bt(v,z,N,ae=""){const de=T("button",`ic-button ${ae}`,z);de.type="button",v.append(de);const ce={撤销:"undo",重做:"redo",适应窗口:"fit",缩小:"zoom-out",放大:"zoom-in","上传图片（支持多选）":"upload",保存编辑稿:"save","合成 PNG":"export",上移:"raise",下移:"lower",置顶:"front",置底:"back",复制:"duplicate",删除:"delete"}[z];return ce&&(de.dataset.composerAction=ce),de.addEventListener("click",()=>{if(ee())try{const Me=N();Me?.catch&&Me.catch($e)}catch(Me){$e(Me)}}),de}function un(v,z,N="number",ae={}){const de=T("label","ic-field"),ce=T("span","",z),Me=T("input");return Me.type=N,Object.assign(Me,ae),de.append(ce,Me),v.append(de),Me}function kt(){if(pn)return;const v=lt(),z=pt||!Vn||!v;for(const N of B.querySelectorAll("button,input"))N!==dn&&N!==$t&&(N.disabled=z||N.dataset.inactive==="1");dn.disabled=pt,$t.disabled=pt||!v,B.setAttribute("aria-busy",String(pt)),Fe&&(Fe.skipTargetFind=z,Fe.selection=!1,Fe.upperCanvasEl.style.pointerEvents=z?"none":"",Fe.upperCanvasEl.tabIndex=z?-1:0),v||(Qt.textContent="只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。")}async function He(v,z){if(ee()){pt=!0,hr(),Qt.textContent=v,kt();try{return await z()}catch(N){pn||$e(N)}finally{pt=!1,pn||(Qt.textContent=lt()?Ft.hidden?"就绪 · 更改仅在保存编辑稿后持久化":"操作未完成，请检查提示后重试":"只读：当前工具卡已失效。仅可关闭。",ht())}}}async function Nn(v){const z=ye(v.url);if(cn.has(z))return cn.get(z);const N=await Xe(z,{credentials:"same-origin",redirect:"error",signal:Fn.signal});if(!N.ok)throw new Error(`图片读取失败（HTTP ${N.status}）。`);if(Number(N.headers.get("content-length"))>E)throw new Error("图片文件不得超过 64 MiB。");const ae=await G(N);if(ae.size>E||!/^image\/(png|jpeg|webp|gif|bmp|x-ms-bmp)$/i.test(ae.type))throw new Error("仅支持 PNG、JPEG、WebP、GIF、BMP 图片，单文件最多 64 MiB；不支持 SVG / AVIF。");const de=await C(ae);if(fr+de.width*de.height>L)throw new Error("已载入图片总像素超过 6400 万，请关闭后使用较小图片重新编辑。");const ce=await createImageBitmap(ae);try{if(Ie(ce.width,ce.height),fr+ce.width*ce.height>L)throw new Error("已载入图片总像素超过 6400 万，请关闭后使用较小图片重新编辑。")}catch(Me){throw ce.close(),Me}if(pn)throw ce.close(),new Error("合成器已关闭。");return fr+=ce.width*ce.height,cn.set(z,ce),ce}function jt(v){const z=cn.get(ye(v.asset.url));if(!z)throw new Error("图片尚未载入。");const N=new(Vt()).FabricImage(z,{originX:"left",originY:"top",left:v.x,top:v.y,angle:v.angle,scaleX:v.width/z.width,scaleY:v.height/z.height,opacity:v.opacity,visible:v.visible,selectable:!v.locked,evented:!v.locked,lockScalingFlip:!0,objectCaching:!1,cornerColor:"#a0e7cb",borderColor:"#a0e7cb",transparentCorners:!1,cornerSize:12,padding:0});return N.composerId=v.id,N.setControlsVisibility({ml:!Kt.checked,mr:!Kt.checked,mt:!Kt.checked,mb:!Kt.checked}),N}function Et(v){const z=ye(v.url),N=T("span","ic-thumbnail"),ae=cn.get(z);if(N.setAttribute("aria-hidden","true"),N.draggable=!1,ae){const de=T("canvas"),ce=Math.min(1,220/ae.width,120/ae.height);de.draggable=!1,de.width=Math.max(1,Math.round(ae.width*ce)),de.height=Math.max(1,Math.round(ae.height*ce)),de.getContext("2d").drawImage(ae,0,0,de.width,de.height),N.append(de)}else{const de=T("img");de.alt="",de.loading="lazy",de.decoding="async",de.draggable=!1;const ce=new Oe(z);de.src=/^\/api\/(upload|artifact)\//.test(ce.pathname)?`/api/thumbnail?url=${encodeURIComponent(ce.pathname+ce.search)}`:z,N.append(de)}return N}function ct(){return F?.layers.find(v=>v.id===at)}function an(){if(!Fe||!F)return;vt=!0,Fe.discardActiveObject();for(const N of Fe.getObjects())Fe.remove(N),N.dispose();yn.clear(),Fe.backgroundColor=F.background==="transparent"?"":F.background;for(const N of F.layers){const ae=jt(N);Fe.add(ae),yn.set(N.id,ae)}const v=ct(),z=yn.get(at);z&&v.visible&&!v.locked&&Fe.setActiveObject(z),vt=!1,mn(),ht(),Fe.requestRenderAll()}function Kn(){const v=JSON.stringify(F);if(Pt[jn]===v){ht();return}Pt.splice(jn+1),Pt.push(v),Pt.length>60&&Pt.shift(),jn=Pt.length-1,ht()}function Tt(v){if(!ee()||!F)return;const z=ve(F);try{v(),F=_(F),an(),Kn(),hr()}catch(N){F=z,an(),$e(N)}}function fn(v){const z=jn+v;if(z<0||z>=Pt.length)return;const N=F.linkedSources;F=JSON.parse(Pt[z]),N&&(F.linkedSources=[...new Set([...F.linkedSources||[],...N])]),jn=z,Pt[z]=JSON.stringify(F),an()}function mn(){if(!Fe||!F||pn)return;const v=Math.max(80,Ue.clientWidth-32),z=Math.max(80,Ue.clientHeight-32);mr&&(Le=Math.min(v/F.width,z/F.height,1)),Le=Math.max(.01,Math.min(Le,2,4096/Math.max(F.width,F.height),Math.sqrt(8e6/(F.width*F.height)))),Fe.setDimensions({width:Math.max(1,Math.round(F.width*Le)),height:Math.max(1,Math.round(F.height*Le))}),Fe.setViewportTransform([Le,0,0,Le,0,0]),Rr.textContent=`${Math.round(Le*100)}% · ${F.width} × ${F.height} px`}const lo=Bt(m,"撤销",()=>fn(-1)),Gn=Bt(m,"重做",()=>fn(1));Bt(m,"适应窗口",()=>{mr=!0,mn()}),Bt(m,"缩小",()=>{mr=!1,Le/=1.25,mn()}),Bt(m,"放大",()=>{mr=!1,Le*=1.25,mn()});const Rr=T("span","ic-zoom");m.append(Rr),_t.append(T("h3","","图层"),T("p","ic-hint","从上到下为顶层到底层，可拖动排序"));const Mn=T("div","ic-layers");Mn.setAttribute("aria-label","图层列表"),_t.append(Mn);const Ve=T("div","ic-layer-actions");_t.append(Ve);const sn=[];function zn(v,z){const N=Bt(Ve,v,()=>ct()&&z());return sn.push(N),N}function Ln(v){Tt(()=>{const z=F.layers.findIndex(ae=>ae.id===at),[N]=F.layers.splice(z,1);F.layers.splice(Math.max(0,Math.min(v,F.layers.length)),0,N)})}zn("上移",()=>Ln(F.layers.findIndex(v=>v.id===at)+1)),zn("下移",()=>Ln(F.layers.findIndex(v=>v.id===at)-1)),zn("置顶",()=>Ln(F.layers.length-1)),zn("置底",()=>Ln(0)),zn("复制",()=>Tt(()=>{if(F.layers.length>=S)throw new Error("最多添加 100 个图层。");const v=ve(ct());v.id=Se(),v.name=`${v.name} 副本`,v.x+=20,v.y+=20,F.layers.splice(F.layers.findIndex(z=>z.id===at)+1,0,v),at=v.id})),zn("删除",()=>Tt(()=>{F.layers=F.layers.filter(v=>v.id!==at),at=null})),_t.append(T("h3","","添加图片"));const Or=Bt(_t,"上传图片（支持多选）",()=>Ut.click()),Ut=T("input","ic-file");Ut.type="file",Ut.multiple=!0,Ut.accept="image/png,image/jpeg,image/webp,image/gif,image/bmp",Ut.hidden=!0,_t.append(Ut),_t.append(T("p","ic-hint","可拖入文件或粘贴图片。单边 ≤8192px，总像素 ≤3200万，文件 ≤64MiB。"));const Zn=T("div","ic-sources");_t.append(Zn),Dt.append(T("h3","","画布"));const gr=T("div","ic-field-grid");Dt.append(gr);const br=un(gr,"画布宽度 / px","number",{min:1,max:dt,step:1}),xr=un(gr,"画布高度 / px","number",{min:1,max:dt,step:1});br.dataset.composerField="canvas-width",xr.dataset.composerField="canvas-height";const qn=T("div","ic-background");Dt.append(qn);const wn=un(qn,"透明背景","checkbox");wn.parentElement.classList.add("ic-switch");const Rt=un(qn,"背景颜色","color");br.addEventListener("change",()=>Tt(()=>{F.width=Number(br.value)})),xr.addEventListener("change",()=>Tt(()=>{F.height=Number(xr.value)})),wn.addEventListener("change",()=>Tt(()=>{F.background=wn.checked?"transparent":Rt.value})),Rt.addEventListener("change",()=>Tt(()=>{F.background=Rt.value})),Dt.append(T("h3","","所选图层"));const Qn=un(Dt,"名称","text",{maxLength:200}),hn=T("div","ic-field-grid");Dt.append(hn);const Ar={};for(const[v,z,N,ae]of[["x","X / px",-1e5,1e5],["y","Y / px",-1e5,1e5],["width","宽度 / px",1,dt],["height","高度 / px",1,dt],["angle","角度 / °",-36e3,36e3],["opacity","透明度 / %",0,100]]){const de=un(hn,z,"number",{min:N,max:ae,step:v==="opacity"?1:.1});Ar[v]=de,de.dataset.composerField=v,de.addEventListener("change",()=>Tt(()=>{const ce=ct();if(!ce||ce.locked)return;const Me=Number(de.value);if(de.value.trim()===""||!Number.isFinite(Me))throw new Error("请输入有效数值。");if(Kt.checked&&(v==="width"||v==="height")){const nt=v==="width"?"height":"width";ce[nt]*=Me/ce[v]}ce[v]=v==="opacity"?Me/100:Me}))}const Kt=un(Dt,"锁定宽高比","checkbox",{checked:!0});Kt.parentElement.classList.add("ic-switch"),Kt.addEventListener("change",()=>{if(ee()){Fe.uniformScaling=Kt.checked;for(const v of yn.values())v.setControlsVisibility({ml:!Kt.checked,mr:!Kt.checked,mt:!Kt.checked,mb:!Kt.checked});Fe.requestRenderAll()}}),Qn.addEventListener("change",()=>Tt(()=>{const v=ct();v&&!v.locked&&(v.name=Qn.value||"图片")})),Dt.append(T("p","ic-hint","X / Y 是图片未旋转时的左上角原点。锁定图层后，需先解锁才能修改属性或在画布移动。"));const po=Bt(X,"保存编辑稿",ut,"ic-primary"),fe=Bt(X,"合成 PNG",ft,"ic-primary");function ht(){if(!F||pn){kt();return}const v=ct();br.value=F.width,xr.value=F.height,wn.checked=F.background==="transparent",wn.checked||(Rt.value=F.background),Qn.value=v?.name||"",Qn.dataset.inactive=!v||v.locked?"1":"0";for(const[N,ae]of Object.entries(Ar))ae.value=v?String(Math.round(v[N]*(N==="opacity"?100:1)*1e3)/1e3):"",ae.dataset.inactive=!v||v.locked?"1":"0";lo.dataset.inactive=jn<=0?"1":"0",Gn.dataset.inactive=jn>=Pt.length-1?"1":"0";for(const N of sn)N.dataset.inactive=!v||v.locked?"1":"0";Or.dataset.inactive=typeof Te!="function"?"1":"0",po.dataset.inactive=typeof De!="function"?"1":"0",fe.dataset.inactive=typeof $!="function"?"1":"0",Sn.textContent=`图片合成${JSON.stringify(F)!==$n?" · 未保存":""}`;const z=Mn.contains(Y.activeElement);Mn.replaceChildren(),F.layers.length||Mn.append(T("p","ic-empty","尚无图层。上传图片，或从下方画布素材中选择添加。"));for(const N of[...F.layers].reverse()){const ae=T("div",`ic-layer${at===N.id?" is-selected":""}`);ae.draggable=!pt&&lt(),ae.dataset.layerId=N.id;const de=le(N.asset),ce=T("button","ic-layer-name");ce.type="button",ce.title=de,ce.dataset.layerAction="select",ce.append(Et(N.asset),T("span","ic-asset-name",de)),ce.setAttribute("aria-pressed",String(at===N.id)),ce.disabled=pt||!lt(),ce.addEventListener("click",()=>{ee()&&(at=N.id,vt=!0,Fe.discardActiveObject(),!N.locked&&N.visible&&Fe.setActiveObject(yn.get(N.id)),vt=!1,Fe.requestRenderAll(),ht())});const Me=T("button","ic-layer-toggle",N.visible?"隐藏":"显示");Me.type="button",Me.setAttribute("aria-label",`${N.visible?"隐藏":"显示"} ${N.name}`),Me.setAttribute("aria-pressed",String(N.visible)),Me.dataset.layerAction="visible",Me.title=Me.getAttribute("aria-label");const nt=T("button","ic-layer-toggle",N.locked?"解锁":"锁定");nt.type="button",nt.setAttribute("aria-label",`${N.locked?"解锁":"锁定"} ${N.name}`),nt.setAttribute("aria-pressed",String(N.locked)),nt.dataset.layerAction="lock",nt.title=nt.getAttribute("aria-label"),Me.disabled=nt.disabled=pt||!lt(),Me.addEventListener("click",()=>Tt(()=>{N.visible=!N.visible})),nt.addEventListener("click",()=>Tt(()=>{N.locked=!N.locked})),ae.addEventListener("dragstart",nn=>{if(!ee()){nn.preventDefault();return}It=N.id,nn.dataTransfer.effectAllowed="move",nn.dataTransfer.setData("application/x-chouka-layer",N.id)}),ae.addEventListener("dragover",nn=>{It&&ee()&&(nn.preventDefault(),nn.dataTransfer.dropEffect="move",ae.classList.add("is-dragover"))}),ae.addEventListener("dragleave",()=>ae.classList.remove("is-dragover")),ae.addEventListener("dragend",()=>{It=null,ae.classList.remove("is-dragover")}),ae.addEventListener("drop",nn=>{if(!It)return;nn.preventDefault(),nn.stopPropagation();const Fr=It;It=null,Tt(()=>{const qr=F.layers.findIndex(yr=>yr.id===N.id),Dr=F.layers.findIndex(yr=>yr.id===Fr);if(Dr<0||qr<0||Dr===qr)return;const[co]=F.layers.splice(Dr,1);F.layers.splice(qr,0,co),at=Fr})});const Ot=T("div","ic-layer-controls");Ot.append(Me,nt),ae.append(ce,Ot),Mn.append(ae)}kt(),z&&!pt&&Fe?.upperCanvasEl.focus({preventScroll:!0})}async function er(v,z){if(F.layers.length+v.length>S)throw new Error("最多添加 100 个图层。");const N=[];for(const ae of v){if(!lt())throw new Error("编辑权限已失效，未添加图片。");const de=et(ae),ce=await Nn(de);if(!lt())throw new Error("编辑权限已失效，未添加图片。");const Me=Math.max(1/Math.min(ce.width,ce.height),Math.min(1,F.width/ce.width,F.height/ce.height));N.push({id:Se(),name:le(de),asset:de,x:0,y:0,width:ce.width*Me,height:ce.height*Me,angle:0,opacity:1,visible:!0,locked:!1})}if(!lt())throw new Error("编辑权限已失效，未添加图片。");F=_({...F,...z?{linkedSources:z}:{},layers:F.layers.concat(N)}),at=N.at(-1)?.id||at,an(),Kn()}async function Dn(){if(!Array.isArray(M)||M.length>Z)throw new Error("已连接图片列表无效或过多（最多 512 项）。");if(!M.length)return;const v=new Set(F.linkedSources||[]),z=new Set(v),N=new Set,ae=[];for(const de of F.layers)for(const ce of re(de.asset))N.add(ce);for(const de of M){const ce=et(de),Me=re(ce);if(Me.some(nt=>z.has(nt)||N.has(nt)))for(const nt of Me)z.add(nt);Me.some(nt=>v.has(nt)||N.has(nt))||ae.push(ce);for(const nt of Me)v.add(nt);if(v.size>Z)throw new Error("已连接图片记录已达 512 条上限，请使用“添加图片”手动添加新素材。")}if(!lt())throw new Error("编辑权限已失效，未添加图片。");z.size!==(F.linkedSources||[]).length&&(F=_({...F,linkedSources:[...z]}),Kn()),await er(ae,[...v])}async function Ke(v){if(!/^image\/(png|jpeg|webp|gif|bmp|x-ms-bmp)$/i.test(v.type)||!v.size||v.size>E)throw new Error(`${v.name||"粘贴文件"}：仅支持常见位图格式，且文件需在 64 MiB 以内。`);await C(v);const z=await createImageBitmap(v);try{Ie(z.width,z.height)}finally{z.close()}}function Ht(v){const z=Array.from(v||[]);if(z.length)return He("正在检查和上传图片，请勿关闭…",async()=>{if(typeof Te!="function")throw new Error("尚未配置图片上传回调。");if(F.layers.length+z.length>S)throw new Error("最多添加 100 个图层。");for(const ae of z)await Ke(ae);const N=[];for(const ae of z){if(!lt())throw new Error("编辑权限已失效，已停止上传。");const de=await Te(ae);if(!lt())throw new Error("编辑权限已失效，未采用晚到的上传结果。");N.push(et(de))}await er(N)})}Ut.addEventListener("change",()=>{const v=Array.from(Ut.files);Ut.value="",Ht(v)}),B.addEventListener("paste",v=>{if(v.stopPropagation(),v.target.closest('input,textarea,[contenteditable="true"]'))return;const z=Array.from(v.clipboardData?.files||[]);z.length&&(v.preventDefault(),Ht(z))}),B.addEventListener("dragover",v=>{v.stopPropagation(),v.dataTransfer.types.includes("Files")&&(v.preventDefault(),v.dataTransfer.dropEffect=pt||!lt()?"none":"copy")}),B.addEventListener("drop",v=>{v.stopPropagation(),v.preventDefault(),v.dataTransfer.files.length&&Ht(v.dataTransfer.files)}),B.addEventListener("keydown",v=>{if(v.stopPropagation(),v.target.closest('input,textarea,select,[contenteditable="true"]')||v.isComposing)return;const z=v.ctrlKey||v.metaKey,N=v.key.toLowerCase();if(z&&(N==="z"||N==="y")){v.preventDefault(),ee()&&fn(N==="y"||v.shiftKey?1:-1);return}if(N==="delete"||N==="backspace"){v.preventDefault(),ct()&&!ct().locked&&Tt(()=>{F.layers=F.layers.filter(de=>de.id!==at),at=null});return}const ae={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[v.key];ae&&(v.preventDefault(),ct()&&!ct().locked&&Tt(()=>{const de=ct(),ce=v.shiftKey?10:1;de.x+=ae[0]*ce,de.y+=ae[1]*ce}))});for(const v of["keyup","keypress","copy","cut","pointerdown","pointerup","click","dblclick","wheel"])B.addEventListener(v,z=>z.stopPropagation());async function ut(){await He("正在保存编辑稿，请勿关闭…",async()=>{const v=_(F);if(!lt())throw new Error("编辑权限已失效，未保存。");await De(ve(v)),lt()&&($n=JSON.stringify(v))})}async function ft(){await He("正在合成原尺寸 PNG，请勿关闭…",async()=>{const v=_(F),z=Y.createElement("canvas");let N;try{N=new(Vt()).StaticCanvas(z,{width:v.width,height:v.height,enableRetinaScaling:!1,renderOnAddRemove:!1,backgroundColor:v.background==="transparent"?"":v.background});for(const de of v.layers)de.visible&&N.add(jt(de));N.renderAll();const ae=await new Promise((de,ce)=>z.toBlob(Me=>Me?de(Me):ce(new Error("PNG 编码失败，可能内存不足。")),"image/png"));if(!lt())throw new Error("编辑权限已失效，未提交合成结果。");await $(ae,ve(v)),$n=JSON.stringify(v)}finally{try{N&&await N.dispose()}finally{z.width=z.height=0}}})}async function gn(v=!1){const z=v===!0;if(pn||pt&&!z||!z&&F&&JSON.stringify(F)!==$n&&!W.confirm("编辑稿有未保存的更改，确定关闭并放弃这些更改吗？"))return!1;pn=!0,Fn.abort(),he?.disconnect(),K(on),B.open&&B.close();try{Fe&&await Fe.dispose()}catch(N){console.error("[图片合成] 画布释放失败",N)}finally{for(const N of cn.values())N.close();cn.clear(),yn.clear(),Pt.length=0,B.remove(),Yn?.isConnected&&Yn.focus({preventScroll:!0})}return!0}dn.addEventListener("click",gn),B.addEventListener("cancel",v=>{v.preventDefault(),v.stopPropagation(),gn()}),B.showModal(),dn.focus();async function tn(){if(!(pt||pn)){pt=!0,Vn=!1,hr(),$t.hidden=!0,Qt.textContent="正在载入图片合成器…",kt();try{if(await pe(),Fe||(Fe=new(Vt()).Canvas(en,{enableRetinaScaling:!1,selection:!1,preserveObjectStacking:!0,uniformScaling:!0,uniScaleKey:null,renderOnAddRemove:!1}),Fe.upperCanvasEl.tabIndex=0,Fe.upperCanvasEl.setAttribute("aria-label","图片合成编辑画布，使用方向键移动所选图层"),Fe.on("mouse:down",()=>{!pt&&lt()&&Fe.upperCanvasEl.focus({preventScroll:!0})}),Fe.on("selection:created",v=>{!vt&&!pt&&lt()&&(at=v.selected?.[0]?.composerId||null,ht())}),Fe.on("selection:updated",v=>{!vt&&!pt&&lt()&&(at=v.selected?.[0]?.composerId||null,ht())}),Fe.on("selection:cleared",()=>{!vt&&!pt&&lt()&&(at=null,ht())}),Fe.on("object:modified",v=>{if(vt)return;if(!ee()){an();return}const z=v.target,N=F.layers.find(de=>de.id===z?.composerId);if(!N||N.locked){an();return}const ae=ve(F);try{Object.assign(N,{x:z.left,y:z.top,width:z.width*z.scaleX,height:z.height*z.scaleY,angle:z.angle}),F=_(F),Kn()}catch(de){F=ae,an(),$e(de)}})),!F){const v=_(D);for(const z of v.layers){if(!lt())throw new Error("只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。");await Nn(z.asset)}if(!lt())throw new Error("只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。");F=v,$n=JSON.stringify(F),Pt=[],jn=-1,an(),Kn()}Vn=!0;try{await Dn()}catch(v){$e(v),$t.hidden=!1}Zn.replaceChildren();for(const v of l)try{const z=et(v),N=le(z),ae=Bt(Zn,"",()=>He("正在添加画布图片…",()=>er([z])));ae.title=N,ae.setAttribute("aria-label",`添加 ${N}`),ae.append(Et(z),T("span","ic-asset-name",N))}catch(z){$e(z)}l.length||Zn.append(T("p","ic-hint","当前画布没有可用的图片素材。")),he?.disconnect(),he=new it(mn),he.observe(Ue)}catch(v){$e(v),Vn=!1,$t.hidden=!1}finally{pt=!1,Qt.textContent=Ft.hidden?"就绪 · 添加图片开始合成":"载入存在问题，请检查提示；可重试载入或关闭。",ht()}}}return b.onDispose(()=>{gn(!0)}),$t.addEventListener("click",()=>{lt()&&tn()}),on=H(kt,500),await tn(),{close:gn}}W.ChoukaImageComposer={open:q}})(),W.ChoukaImageComposer}const rd=Pl.extend({selectedId:za().nullable(),selectedSpace:za(),user:Il.nullable()});function od(b){const k=Vi({projects:[],teams:[],selectedId:null,selectedSpace:"personal",user:null,busy:!1,error:""});let I;async function R(Y){if(!k.getSnapshot().busy){k.set({...k.getSnapshot(),busy:!0,error:""});try{await Y()}catch(ne){k.set({...k.getSnapshot(),error:io(ne)})}finally{k.set({...k.getSnapshot(),busy:!1})}}}const W=Y=>Y.permission==="operate"&&!Y.locked;return{state:k,service:b,bind(Y){I=Y},update(Y){const ne=rd.parse(Y);k.set({...k.getSnapshot(),...ne})},selectSpace(Y){I?.selectSpace(Y)},open(Y){return R(async()=>{await I?.open(Y)})},create(){return R(async()=>{const Y=k.getSnapshot();if(Y.selectedSpace==="shared")throw new Error("共享给我的空间不能新建画布，请选择个人空间或项目组");const ne=Y.selectedSpace.startsWith("team:")?Y.selectedSpace.slice(5):null,d=ne?Y.teams.find(K=>K.id===ne)?.name:"个人空间",A=window.prompt(`在「${d||"项目组"}」新建画布`,"新项目 "+new Date().toLocaleDateString("zh-CN"));if(A===null)return;const H=await b.create(A,ne);await I?.refresh(),await I?.open(H.id)})},rename(Y){return R(async()=>{if(!W(Y))throw new Error("此画布不可修改");const ne=window.prompt("修改项目名",Y.name);if(ne===null)return;const d=ne.trim();if(!d)throw new Error("项目名不能为空");const A=Tl({name:za(),rev:Rl()}).parse(await b.rename(Y.id,d));I?.renamed(Y.id,A.name,A.rev),await I?.refresh()})},remove(Y){return R(async()=>{if(!W(Y))throw new Error("此画布不可修改");window.confirm(`删除项目「${Y.name}」？（文件会保留为 .deleted）`)&&(await b.remove(Y.id),k.getSnapshot().selectedId===Y.id&&I?.clear(),await I?.refresh())})},async refresh(){await I?.refresh()},spaces(Y){const ne=k.getSnapshot();return Ll(Y,ne.user?.id,ne.teams)}}}function ad({project:b,host:k,onClose:I}){const R=Zt.useRef(null),[W,Y]=Zt.useState(),[ne,d]=Zt.useState([]),[A,H]=Zt.useState([]),[K,Pe]=Zt.useState(""),[Be,it]=Zt.useState(!1);Zt.useEffect(()=>{let Re=!0;return R.current?.showModal(),k.service.shares(b.id).then(Oe=>{Re&&(Y(Oe),d(Oe.user_ids),H(Oe.team_ids))}).catch(Oe=>{Re&&Pe(io(Oe))}),()=>{Re=!1}},[k,b.id]);const st=(Re,Oe,Xe,rt)=>rt(Oe?[...Xe,Re]:Xe.filter(dt=>dt!==Re));return xe.jsx("dialog",{ref:R,className:"auth-dialog project-share-dialog",onCancel:I,children:xe.jsxs("form",{onSubmit:async Re=>{Re.preventDefault(),it(!0),Pe("");try{await k.service.share(b.id,ne,A),await k.refresh(),I()}catch(Oe){Pe(io(Oe))}finally{it(!1)}},children:[xe.jsxs("h2",{children:["分享「",b.name,"」"]}),xe.jsx("p",{className:"auth-note",children:"被选中的个人或项目组成员可以共同查看、编辑和运行这张画布。画布仍保留在你的个人空间。"}),xe.jsx("div",{className:"share-columns",children:["users","teams"].map(Re=>xe.jsxs("section",{className:"share-targets",children:[xe.jsx("h3",{children:Re==="users"?"个人":"项目组"}),xe.jsxs("div",{className:"share-target-list",children:[W?.[Re].map(Oe=>xe.jsxs("label",{className:"share-target",children:[xe.jsx("input",{type:"checkbox",checked:(Re==="users"?ne:A).includes(Oe.id),onChange:Xe=>st(Oe.id,Xe.target.checked,Re==="users"?ne:A,Re==="users"?d:H)}),xe.jsxs("span",{children:[Oe.name||Oe.username,Oe.display_name?`（${Oe.display_name}）`:""]})]},Oe.id)),W?.[Re].length===0&&xe.jsx("p",{className:"auth-note",children:"暂无可分享对象"})]})]},Re))}),xe.jsx("p",{role:"alert",children:K}),xe.jsxs("footer",{children:[xe.jsx("button",{type:"button",className:"btn",onClick:I,children:"取消"}),xe.jsx("button",{className:"btn primary",disabled:!W||Be,children:Be?"保存中…":"确定分享"})]})]})})}function id({host:b}){const k=Zt.useSyncExternalStore(b.state.subscribe,b.state.getSnapshot),[I,R]=Zt.useState(),W=[{value:"personal",label:"个人空间"},...k.projects.some(A=>b.spaces(A).includes("shared"))?[{value:"shared",label:"共享给我的画布"}]:[],...k.teams.map(A=>({value:`team:${A.id}`,label:A.name}))],Y=k.projects.filter(A=>b.spaces(A).includes(k.selectedSpace)),ne=new Map;for(const A of Y){const H=k.selectedSpace==="shared"?String(A.owner_id):"";ne.set(H,[...ne.get(H)||[],A])}const d=A=>{const H=A.permission==="operate"&&!A.locked,K=k.selectedSpace==="personal"&&!A.team_id&&String(A.owner_id)===String(k.user?.id)&&!A.locked;return xe.jsxs("div",{className:`pitem${A.id===k.selectedId?" on":""}`,title:`${A.team_name||A.owner_display_name?.trim()||"未填写姓名"} · ${A.permission==="operate"?"可操作":"只读"}`,onContextMenu:Pe=>{K&&(Pe.preventDefault(),R(A))},children:[xe.jsx("button",{className:"nm",onClick:()=>{b.open(A.id)},onDoubleClick:()=>H&&void b.rename(A),children:A.name}),xe.jsx("span",{className:"ct",children:A.cards}),K&&xe.jsx("button",{className:"pshare",title:"分享给个人或项目组",onClick:()=>R(A),children:"↗"}),H&&xe.jsxs(xe.Fragment,{children:[xe.jsx("button",{className:"ren",title:"重命名",disabled:k.busy,onClick:()=>{b.rename(A)},children:"✎"}),xe.jsx("button",{className:"del",title:"删除",disabled:k.busy,onClick:()=>{b.remove(A)},children:"✕"})]})]},A.id)};return xe.jsxs(xe.Fragment,{children:[xe.jsx("div",{className:"head",children:xe.jsx("span",{className:"project-panel-title",children:"画布列表"})}),xe.jsxs("button",{id:"newproj",disabled:k.busy,onClick:()=>{b.create()},children:[xe.jsx("span",{"aria-hidden":"true",children:"＋"}),xe.jsx("span",{children:"新建画布"})]}),xe.jsxs("label",{className:"space-picker",children:[xe.jsx("span",{children:"画布空间"}),xe.jsx("select",{id:"space-select",value:k.selectedSpace,onChange:A=>b.selectSpace(A.target.value),"aria-label":"选择个人空间或项目组",children:W.map(A=>xe.jsx("option",{value:A.value,children:A.label},A.value))})]}),xe.jsx("div",{id:"space-label",className:"section-label",children:W.find(A=>A.value===k.selectedSpace)?.label}),xe.jsx("div",{id:"plist",children:[...ne].map(([A,H])=>A?xe.jsxs("details",{className:"powner",open:!0,children:[xe.jsxs("summary",{children:[xe.jsx("span",{className:"powner-name",children:H[0]?.owner_display_name?.trim()||"未填写姓名"}),xe.jsx("span",{className:"powner-count",children:H.length})]}),xe.jsx("div",{className:"powner-items",children:H.map(d)})]},A):H.map(d))}),k.error&&xe.jsx("p",{role:"alert",className:"project-error",children:k.error}),xe.jsxs("div",{className:"side-foot",children:[xe.jsx("span",{className:"side-foot-dot"}),xe.jsx("span",{id:"space-status",children:k.selectedSpace==="personal"?"个人画布仅自己可见":k.selectedSpace==="shared"?"由画布所有者授权共享":"项目组画布由全体组员共享"})]}),I&&xe.jsx(ad,{host:b,project:I,onClose:()=>R(void 0)})]})}const sd=Dl+`
`+Bl+`
#side {position:relative} #dot {position:absolute;right:22px;top:28px;width:7px;height:7px;border-radius:50%;background:var(--err)} #dot.on{background:var(--ok)} #react-projects{display:contents}.pitem>.nm {border:0;background:none;color:inherit;text-align:left;min-width:0;cursor:pointer;font:inherit}.project-error{color:#fda4af;padding:12px;font-size:12px}`;function cd(){const b=Zt.useRef(null),[k,I]=Zt.useState(!0),[R,W]=Zt.useState(),[Y,ne]=Zt.useState(null),d=Zt.useCallback(H=>{const K=od(H.services.projects);W(K),ne(document.getElementById("react-projects"));const Pe=nd(H.scope,H.auth,H.notify,H.services),Be=td(H.scope,H.auth,H.notify,K,H.services,Pe);H.beforeLeave(async()=>{await Be.ready,await Be.flush()}),Be.nodeEditor&&(window.ChoukaNodeEditor=Be.nodeEditor),Be.ready.then(()=>{H.scope.disposed||I(!1)},it=>{H.scope.disposed||(I(!1),H.notify.error(it))})},[]),A=Al(b,"canvas","canvas","canvas-studio",sd,d);return xe.jsxs(xe.Fragment,{children:[xe.jsx("div",{id:"page-mount",ref:b,dangerouslySetInnerHTML:{__html:ql}}),Y&&R&&Fl.createPortal(xe.jsx(id,{host:R}),Y),k&&!A&&xe.jsx(Ol,{stage:"正在准备工作区"}),A&&xe.jsx("p",{role:"alert",children:A})]})}export{cd as CanvasPage};
