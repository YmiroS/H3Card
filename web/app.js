/* 抽卡系统 前端 (P0) — 免构建原生 JS
   画布 = 节点(产物+配方) + 连线(上游产物喂下游槽位)
   节点字段全部由后端 /api/cards 的 manifest 生成，前端不写死任何工作流 */

const $ = (s, r = document) => r.querySelector(s);
const CW = 268;            // 节点默认宽度，与 style.css 保持一致
const CW_MIN = 180, CW_MAX = 900, CH_MIN = 90, CH_MAX = 900;
const cardW = (c) => c.w || CW;
const SVGNS = "http://www.w3.org/2000/svg";

// 全站不弹浏览器原生右键菜单：想存图/定位文件走节点和素材格自己的菜单
document.addEventListener("contextmenu", (ev) => ev.preventDefault());

let CARDS = [];            // 节点种类（生图 / 生视频）
let CAPS = {};             // 能力清单
let PROJ = null;           // 当前项目
let projects = [];
let TASKS = [];            // 服务端所有任务（不限本项目），右上角计数和任务浮窗都看它
let view = { x: 60, y: 70, k: 1 };
let selId = null;
let selIds = new Set();    // 框选出来的多个节点（左键空白处拖一个框；Delete 全删、拖动整体移动）
let saveTimer = null;

const el = {
  side: $("#side"), plist: $("#plist"), dot: $("#dot"),
  ptitle: $("#ptitle"), hint: $("#hint"), fit: $("#fit"),
  stage: $("#stage"), world: $("#world"), wires: $("#wires"), groups: $("#groups"),
  lasso: $("#lasso"), selbar: $("#selbar"), dock: $("#dock"),
  empty: $("#empty"), panel: $("#panel"), hist: $("#hist"), menu: $("#menu"), tip: $("#tip"),
  toast: $("#toast"), picker: $("#picker"),
  jobsbtn: $("#jobsbtn"), jobs: $("#jobs"), controllerLink: $("#controller-link"),
  view: $("#view"), vbox: $("#view .vbox"), respop: $("#respop"),
  minimapBtn: $("#minimap-btn"), wiresToggle: $("#wires-toggle"), zoomMenu: $("#zoom-menu"),
  minimap: $("#minimap"), minimapCanvas: $("#minimap-canvas"), minimapViewport: $("#minimap-viewport"),
  zoomPercent: $("#zoom-percent"),
};

/* ================= 工具 ================= */
async function api(path, opt) {
  const r = await fetch(path, opt);
  const ct = r.headers.get("content-type") || "";
  let data = null, txt = "";
  if (ct.includes("json")) { try { data = await r.json(); } catch (e) {} }
  else { txt = await r.text(); }
  if (!r.ok) {
    const msg = (txt || r.statusText || "请求失败").replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ").trim();
    const err = new Error(msg.slice(0, 300));
    err.status = r.status;
    throw err;
  }
  return data;
}
const jpost = (p, b) => api(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b || {}) });
const jput = (p, b) => api(p, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

let toastTimer = null;
function toast(msg) {
  el.toast.textContent = msg;
  el.toast.style.display = "block";
  clearTimeout(toastTimer);
  // 按字数给时间：2.6 秒够看「已保存」，但看不完一段 API 报错
  // （「HTTP 401 —— key 不对或者没权限」后面还跟着人家返回的原文）。
  // 那种一闪而过等于没提示，用户只能来问人
  toastTimer = setTimeout(() => (el.toast.style.display = "none"),
    Math.min(2600 + Math.max(0, String(msg).length - 20) * 70, 9000));
}
const uid = () => Math.random().toString(36).slice(2, 10);
/** 节点属于哪一类。以节点内选中的能力为准，c.type 只是兜底：
    能力被拆成独立节点后（比如漫剧从"生视频"里单独抽出来），老项目里存的
    c.type 还指着旧节点，按 c.type 找会拿到一个模式列表里根本没有它的节点。 */
const cardDef = (t) => CARDS.find(c => c.id === t) || CARDS[0];
const MEDIA = ["image", "audio", "video"];
const KIND_ZH = { image: "图片", video: "视频", audio: "音频" };
const modeHas = (md, cid) => md.id === cid
  || !!(md.ladder && Object.values(md.ladder).includes(cid))
  || !!(md.route && Object.values(md.route).some(r => r.cap === cid))
  // modelSwitch：同一模式换模型跑的另一条能力（图生图的 zimage_i2i ↔ krea2_i2i）。
  // 不认它的话 modeOf 对 krea 的 cap 返回空，面板模式胶囊会兜底显示 modes[0]「文生图」
  || !!(md.modelSwitch && Object.values(md.modelSwitch).includes(cid));
/** 一个模式落到画布上时先跑哪条能力。路由节点（route）用排在最前那一路当初始状态 */
const modeCap = (md) => md ? (md.route ? md.route[Object.keys(md.route)[0]].cap : md.id) : null;
/** 同一条能力可能同时挂在两个节点上（补帧既有自己那个节点，也是「画质增强」的视频那一路），
    所以先认节点自己记的 c.type，只有它对不上时才去全局找。 */
const defOf = (c) => {
  const own = CARDS.find(d => d.id === c.type);
  if (own && own.modes.some(m => modeHas(m, c.cap))) return own;
  return CARDS.find(d => d.modes.some(m => modeHas(m, c.cap))) || cardDef(c.type);
};
const modeOf = (c) => { const d = defOf(c); return d && d.modes.find(m => modeHas(m, c.cap)); };
/** 节点显示名。合并模式用模式名（"H3 图生视频"），不用张数最多那条能力的名字（"首尾帧"）。
    路由节点同理：叫「画质增强」，不能叫「SeedVR2 图片高清放大」—— 那会让人以为它不收视频。
    最后兜底用模式名而不是裸 id：风格节点在 CAPS 里根本没有条目（它不是能力）。 */
const titleOf = (c) => {
  const cap = capOf(c), md = modeOf(c);
  // 素材节点叫全名「素材节点」：上传完画布上多出来的就是它，标题得让人一眼认出
  // 这是"存着一份素材、等着往别的节点上拖"的那种节点，而不是某个玩法
  if (isAsset(c)) return c.name || "素材节点";
  return c.name || (md && (md.ladder || md.route) ? md.name
    : cap ? cap.name : md ? md.name : c.cap);
};

/* ================= 风格节点 =================
   画布上唯一一张不对应任何能力的节点（`CAPS[c.cap]` 是空的），所以凡是"先取 cap
   再干活"的地方都要先问一句 isStyle。它自己不跑、不出产物，只把一段风格描述
   挂给下游的生图/生视频节点，提交时并进那个节点的提示词 —— 一处改，连着的全跟着变。 */
const isStyle = (c) => !!c && (defOf(c) || {}).kind === "style";
/** 风格连线走的还是 PROJ.edges，只是 slot 用 `@` 开头 —— 它不是素材槽，
    所以传产物那一套（importOutput、跑完自动喂下游）必须绕开它。 */
const STYLE_SLOT = "@style";   // 连到生成节点：提交那一刻并进主提示词
const TEXT_SLOT = "@text";     // 连到文本处理节点：作为输入文本之一（一个节点可收多根）
const isTextEdge = (e) => String(e.slot || "").startsWith("@");

/* ================= 文本节点片 =================
   风格节点的泛化：画布上所有传文字的节点。
     kind=style 风格节点 —— 只存一段风格描述，挂到生成节点
     kind=text  文本节点 —— 只有这一种：节点上直接写字；面板里选「加工方式」
               （润色/优化/扩写/自定义指令）就能把接进来的文本加工后写回节点上。
   任何文本节点的出口都能连：生成节点（@style，并进主提示词，可多张）或
   别的文本节点（@text，当输入文本之一，按连线顺序排列）。 */
const isText = (c) => !!c && (defOf(c) || {}).kind === "text";
const isTextCard = (c) => isStyle(c) || isText(c);       // 所有传文字的节点

/* ================= 素材节点 =================
   底部工具条「上传」出来的那个节点。跟文本节点/风格节点一样不对应任何能力
   （`CAPS[c.cap]` 是空的），自己不跑、不出产物 —— 手里就拿着一份上传上来的
   图片/视频/音频，把出口连到别的节点就等于把这份素材放进那个节点的格子里。
   为什么要它：一份素材经常要喂给好几个节点（同一张脸既生视频又抠图），
   以前得在每个节点的格子里各传一次，现在传一次、拉几根线。
   实现上那份素材就存成 c.outputs[0]，画面渲染／查看大图／下载／连线全都
   照产物那一套走，不用另开一套。 */
const isAsset = (c) => !!c && (defOf(c) || {}).kind === "asset";
/** 素材节点手里那份东西（没传过是 null） */
const assetOf = (c) => (isAsset(c) ? (c.outputs || [])[0] || null : null);
/** 一个文本节点「现在手里」的文字（节点上那个框里的字）。下游运行时读的都是它 ——
    上游改了字或重跑过，下游下一次运行自动用新的，这就是文本的继承。 */
const textOf = (c) => {
  if (!c) return "";
  if (isStyle(c)) return String((c.params || {}).style || "").trim();
  return String((c.params || {}).text || "").trim();
};
/** 这个节点选没选加工方式（polish/optimize/expand/custom）。没选就是一个纯文本节点，
    点运行会提示先选一种。 */
const textOp = (c) => (((c || {}).params || {}).op) || "";
/** 挂在这个节点上的文本输入（@text 边，连线顺序 = 输入顺序）。
    返回 [{card, text}]：面板上要显示每段来自哪个节点，运行时也照这个顺序合并。 */
const ownTexts = (c) => (PROJ ? PROJ.edges : [])
  .filter(e => e.to === c.id && e.slot === TEXT_SLOT)
  .map(e => cardOf(e.from))
  .filter(s => s && isTextCard(s))
  .map(s => ({ id: s.id, name: titleOf(s), text: textOf(s) }));

/** 这条能力的「提示词」框。作者调好的格式规范（template）和高级里的不算 ——
    风格是往画面描述里加的，不该混进那份规范。一个都没有的节点（补帧、放大、拼图）
    接不了风格节点：那些节点根本不写提示词。 */
const promptSpecs = (cap) => ((cap && cap.inputs) || [])
  .filter(s => s.type === "textarea" && !s.template && !s.advanced);

/** 直接挂在这个节点上的文本节点（风格节点 / 原始文本 / 处理节点的输出），按连线顺序。
    **手里还没字的不算** —— 先连线后写字是常事，那一阵子它既不该出现在读数里，
    更不该把上游的文本挡掉。 */
const ownStyles = (c) => (PROJ ? PROJ.edges : [])
  .filter(e => e.to === c.id && e.slot === STYLE_SLOT)
  .map(e => PROJ.cards.find(x => x.id === e.from))
  .filter(s => s && isTextCard(s) && textOf(s));

/** 从上游继承来的风格节点（不看这个节点自己挂了什么）。
    走的是普通产物连线，所以中间夹着不写提示词的节点（放大、补帧）也照样往下传 ——
    那个节点自己用不上风格，但它不该把链子截断。
    同一个风格节点顺两条路走到这里只算一次（按 id 去重）；seen 兼作环路保险。 */
function upStyles(c, seen = new Set()) {
  if (!c || seen.has(c.id)) return [];
  seen.add(c.id);
  const out = [], ids = new Set();
  for (const e of (PROJ ? PROJ.edges : []).filter(e => e.to === c.id && !isTextEdge(e))) {
    const p = PROJ.cards.find(x => x.id === e.from);
    if (!p || isTextCard(p)) continue;
    for (const s of styleCards(p, seen)) if (!ids.has(s.id)) { ids.add(s.id); out.push(s); }
  }
  return out;
}

/** 这个节点实际会套用的风格节点。一条链子只该在第一棒挂一次风格：后面每一棒都手动挂太啰嗦，
    漏一棒风格就断了。所以**风格顺着产物连线往下传**。
    自己挂了风格就以自己为准，上游那份不再往下传 —— 两段风格叠在一起会互相打架
    （"哥特暗黑" 撞 "清透日系"），而"这一棒换个风格"是真需求。
    想两份都要：把上游那个风格节点也拖到这个节点上（一个节点能挂好几张）。
    返回节点而不是文字：面板上要能说清哪张是继承来的、点它能跳过去。 */
function styleCards(c, seen = new Set()) {
  if (!c) return [];
  const own = ownStyles(c);
  return own.length ? own : upStyles(c, seen);
}

/** 这个节点下游会跟着套用这段风格的节点（不含直接挂的那几张）—— 风格节点面板上要交代清楚
    「改这一处会连带影响谁」，不然继承是隐形的。 */
function styleReach(s) {
  return (PROJ ? PROJ.cards : [])
    .filter(c => !isTextCard(c) && !ownStyles(c).some(x => x.id === s.id)
      && styleCards(c).some(x => x.id === s.id));
}

/** 这个节点实际会套用的文本，按套用顺序。 */
const styleTexts = (c) => styleCards(c).map(textOf);

/** 文本节点节点脚上的「挂了 N 张 · 连带下游 M 张」是顺着连线算出来的，所以**连线一改
    就得重刷**（接一根新线、清一格素材、换路由都会改这个数），不然那个数会停在改之前。 */
const paintStyles = () => (PROJ ? PROJ.cards : []).filter(isTextCard).forEach(s => paint(s));

const STYLE_PH = "{提示词}";
/** 风格和提示词怎么合成一句。风格文字里写了 {提示词} 就替换到那个位置：
    H3 要总基调在前、镜头约束在后；图生图那条的"提示词"其实是给描述模型的指令，
    风格得跟在后面 —— 一个占位符全都能表达，不用为每条能力写死一套规则。
    没写占位符就默认风格在前、空一行再接提示词。 */
/* ---- 提示词优化：一个提示词框可以有两份词 ----
   `c.opt[key]`  = 优化后的那份（本地大模型改写出来的，风格已经融进去了）
   `c.optUse[key]` = 用户在页签上选的是哪一份（true = 优化后）
   两份都落盘：优化跑一次要十几二十秒，刷新一下就没了说不过去。
   风格只拼给原词那份 —— 优化后的自带风格，再拼就是两份（见 payloadOf）。 */
const optOf = (c, key) => {
  const t = c.opt && c.opt[key];
  return t && String(t).trim() ? String(t) : null;
};
/** 这一格提交时会不会用优化后的那份；会就返回那段文字，不会返回 null */
const usingOpt = (c, key) => (c.optUse && c.optUse[key]) ? optOf(c, key) : null;

/** H3 的「参考图对到第几秒」那句话。官方规定它必须是提示词的第一行，
    后面空一行才是正文 —— 风格直接怼在最前面会把它挤到第三行，参考图就对不上位了。
    所以认出这一行，风格插到它后面去。 */
const H3_ALIGN = /^(?:For the target video, at [\d.]+ seconds|How the reference pictures align)[^\n]*\n/;

function withStyle(text, styles) {
  let t = String(text == null ? "" : text);
  for (const s of styles) {
    if (s.includes(STYLE_PH)) { t = s.split(STYLE_PH).join(t); continue; }
    if (!t.trim()) { t = s; continue; }
    const m = t.match(H3_ALIGN);
    t = m ? t.slice(0, m[0].length) + "\n" + s + "\n\n" + t.slice(m[0].length).replace(/^\s+/, "")
      : s + "\n\n" + t;
  }
  return t;
}
const filledImgs = (c) => Object.keys(c.assets || {})
  .filter(k => k.startsWith("images[") && c.assets[k]).length;

/** 合并模式真正要跑的能力：按已上传的图片张数挑（1 张=图生视频，2 张=首尾帧）。
    面板一直用张数最多那条能力来画（槽位是它的超集），提交时才落到具体这条。 */
function runCap(c) {
  const md = modeOf(c);
  if (!md || !md.ladder) return c.cap;
  const steps = Object.keys(md.ladder).map(Number).sort((a, b) => a - b);
  const n = Math.max(filledImgs(c), steps[0]);      // 一张都没传时按最低档算
  return md.ladder[String(steps.filter(s => s <= n).pop())] || c.cap;
}
const capOf = (c) => CAPS[c.cap] || null;

/** 路由节点上放进这种素材该切到哪一路（已经在那一路上就返回 null）。
    和 ladder 不一样，这里两条工作流的参数完全不同，画不出一张"并集"面板，
    所以是放素材那一刻就把节点切过去，切完面板/参数/产出全都走原来那套。 */
function routeFor(c, kind) {
  const md = modeOf(c);
  const r = md && md.route && md.route[kind];
  return r && r.cap !== c.cap ? r : null;
}

/** 往某一格放素材。路由节点要先按素材类型换能力 —— 换完槽位名都变了（images[0] →
    video[0]），所以旧素材和旧连线一起清掉，不然会留下一格对不上任何槽的孤儿。 */
function putAsset(c, s, file) {
  const r = file && file.kind ? routeFor(c, file.kind) : null;
  if (r) {
    // 路由换边时原来的素材格全部失效，连线和它们带来的引用一起清掉。
    removeEdges(PROJ.edges.filter(e => e.to === c.id));
    c.cap = r.cap;
    c.assets = {};
    s = { key: r.slot };
    paintTitle(c);
    drawWires(); paintStyles();
  }

  // 自动切换：文生图模式收到图片 → 切换到图生图模式
  const def = defOf(c);
  let modeSwitched = false;
  if (def && def.id === "card_image" && file && file.kind === "image") {
    if (c.cap === "zimage_t2i") {
      c.cap = "zimage_i2i";
      if (!c._model) c._model = "zimage";
      modeSwitched = true;
    } else if (c.cap === "krea2_t2i") {
      c.cap = "krea2_i2i";
      if (!c._model) c._model = "krea2";
      modeSwitched = true;
    }

    // 如果切换了模式，需要更新标题、重绘连线，并重新打开面板以显示新的参数
    if (modeSwitched) {
      paintTitle(c);
      drawWires();
      paintStyles();
      // 延迟打开面板，确保DOM更新完成
      setTimeout(() => openPanel(c.id), 50);
    }
  }

  // 手动上传表示这一格从此由用户自己管；否则上游下次重跑还会把它覆盖回来。
  if (!r && detachSlotEdges(c.id, s.key)) {
    drawWires(); paintStyles();
  }
  c.assets[s.key] = file;
  paintKind(c);            // 路由节点的节点脚徽标从「跟素材」变成真类型
  return s;
}

/* ================= H3 画布换算 =================
   ComfyUI 里视频分辨率不是直接填 width/height，而是两条链路算出来的，
   所以面板上要把它翻译回大家习惯的「多少 p」（p = 短边像素）。

   ResolutionSelector（comfy_extras/nodes_resolution.py）：
     total = megapixels * 1024 * 1024        ← 注意是 1024²，不是 100 万
     scale = sqrt(total / (wr * hr))
     w = round(wr * scale / 32) * 32   h 同理
   MiniMax H3 的原生画布（comfy_extras/nodes_minimax_h3.py:26-28）：
     短边 768、面积上限 768*1344、宽高必须是 32 的倍数。
   于是 16:9 下：0.4MP=864×480(480p)  0.5MP=960×544(544p)
                0.7MP=1152×640(640p) 1.0MP=1376×768(768p，顶到原生) */
const RATIO_WH = {
  "1:1 (Square)": [1, 1], "2:3 (Portrait Photo)": [2, 3], "3:2 (Photo)": [3, 2],
  "3:4 (Portrait Standard)": [3, 4], "4:3 (Standard)": [4, 3],
  "9:16 (Portrait Widescreen)": [9, 16], "16:9 (Widescreen)": [16, 9],
  "21:9 (Ultrawide)": [21, 9],
};
const H3_P = [480, 544, 640, 768];
// scale_to_side=longest 那条链路给的是长边；这几个长边在 16:9 素材上正好落到上面的短边
const H3_LONG = { 480: 832, 544: 960, 640: 1152, 768: 1344 };
const MULT = 32;

/** 正算：比例 + megapixels -> [宽, 高]，与 ResolutionSelector 逐步一致 */
function resFromMP(ratio, mp) {
  const [wr, hr] = RATIO_WH[ratio] || [1, 1];
  const scale = Math.sqrt(mp * 1024 * 1024 / (wr * hr));
  return [Math.round(wr * scale / MULT) * MULT, Math.round(hr * scale / MULT) * MULT];
}
/** 反算：想让短边正好落在 p 上，megapixels 该给多少。
    32 的取整网格上不是每个 megapixels 都能命中，所以按 0.01 往两边试，验算命中为准。*/
function mpForP(ratio, p) {
  const [wr, hr] = RATIO_WH[ratio] || [1, 1];
  const scale = p / Math.min(wr, hr);
  const base = Math.round(scale * scale * wr * hr / (1024 * 1024) * 100) / 100;
  for (const d of [0, 1, -1, 2, -2, 3, -3]) {
    const v = Math.round((base + d * 0.01) * 100) / 100;
    if (v > 0 && Math.min(...resFromMP(ratio, v)) === p) return v;
  }
  return base;
}
const shortOf16x9 = (L) => Math.round(L * 9 / 16 / MULT) * MULT;

/* ================= 清晰度 + 比例（照用户参考图做的选择器） =================
   两类工作流两种参数体系，选择器负责把「几K + 几比几」翻译回去：
   · megapixels + aspect_ratio（H3 视频 / 拼图 / 漫剧）—— 比例是节点内置 8 档
     select，清晰度档从 megapixels 的 min/max 里能选到的档位算
   · width + height（Z-Image 文生图）—— 任意 16 步进，清晰度按像素面积折 1K/2K */
/** 清晰度档：按标准分辨率档位（短边像素）定义 */
const CLARITY_STEPS = [
  { id: "480P", label: "480P", val: 480 },
  { id: "720P", label: "720P", val: 720 },
  { id: "1080P", label: "1080P", val: 1080 },
  { id: "1440P", label: "1440P", val: 1440 },
];
/** 比例网格（照参考图内置的 13 种；映射到工作流那 8 档 select 里的最优近似） */
const RATIO_GRID = [
  ["1:1", 1, 1], ["1:2", 1, 2], ["2:1", 2, 1], ["9:16", 9, 16], ["16:9", 16, 9],
  ["3:4", 3, 4], ["4:3", 4, 3], ["3:2", 3, 2], ["2:3", 2, 3], ["5:4", 5, 4],
  ["4:5", 4, 5], ["21:9", 21, 9], ["9:21", 9, 21],
];
/** 13 种比例 → 工作流 select 那 8 档（挑宽高比最接近的；5:4/4:5/1:2/2:1/9:21 没有
    完全对应的，折到最近的档） */
function ratioToOpt(r) {
  const [w, h] = [r[1], r[2]];
  let best = null, bd = Infinity;
  for (const [k, [wr, hr]] of Object.entries(RATIO_WH)) {
    const d = Math.abs(w / h - wr / hr);
    if (d < bd - 1e-9) { bd = d; best = k; }
  }
  return best;
}
const optToRatio = (opt) => {
  const wh = RATIO_WH[opt];
  return wh ? RATIO_GRID.find(r => r[1] === wh[0] && r[2] === wh[1]) : null;
};
/** 「⚙ 参数」弹窗：点按钮弹出（不是面板内展开），里面是清晰度 + 画面比例 + 常规参数（视频时长等）。
    照参考图那种浮层：一个小标题、选项网格、点外面/Esc 关。 */
function openResPop(c, anchor) {
  const cap = CAPS[runCap(c)] || capOf(c);
  const has = cap && cap.inputs.some(x =>
    ["megapixels", "width", "height", "aspect_ratio", "duration", "target_fps", "scale_to_length"].includes(x.key));
  if (!has) return toast("这个模式没有可调的分辨率参数");

  /** 原位刷新弹窗内容（选中态要变），**不关不重开** —— 重开会按重建过的锚点按钮
      重新摆位，弹窗就跳位置（这就是"选完参数窗口会跑"的 bug）。
      位置不动：只换 innerHTML，left/top 留在 style 上。 */
  const refill = () => {
    el.respop.innerHTML = "";
    el.respop.appendChild(clarityPicker(c, cap, refill));
    // 视频节点的常规参数（duration/target_fps）也收进这个弹窗，不在面板里摊开
    const specs = cap.inputs;
    const PARAM_KEYS = ["duration", "target_fps"];
    const params = specs.filter(s => PARAM_KEYS.includes(s.key) && s.type === "slider");
    if (params.length) {
      const pwrap = document.createElement("div"); pwrap.className = "pwrap";
      pwrap.style.marginTop = "12px";
      for (const s of params) {
        const row = document.createElement("div"); row.className = "row";
        const lb = document.createElement("label"); lb.textContent = s.label; lb.title = s.hint || s.label;
        row.appendChild(lb);
        const cur = c.params[s.key] != null ? c.params[s.key] : s.default;
        const r = document.createElement("input"); r.type = "range";
        r.min = s.min != null ? s.min : 1; r.max = s.max != null ? s.max : 30; r.step = s.step || 1;
        const n = document.createElement("input"); n.type = "number";
        n.min = r.min; n.max = r.max; n.step = r.step; n.style.width = "72px";
        r.value = n.value = cur != null ? cur : r.min;
        const set = (v) => {
          r.value = n.value = v; c.params[s.key] = parseFloat(v); save();
          // duration 变了要更新胶囊摘要
          if (s.key === "duration" && el.panel._id === c.id) {
            const caps = el.panel.querySelectorAll(".foot .tcap");
            const pb = caps[caps.length - 1];
            if (pb && pb.textContent.startsWith("⚙")) {
              const cb = paramsBrief(c, cap);
              pb.textContent = cb ? `⚙ ${cb}` : "⚙ 参数";
            }
          }
        };
        r.oninput = () => set(r.value); n.oninput = () => set(n.value);
        row.appendChild(r); row.appendChild(n);
        pwrap.appendChild(row);
      }
      el.respop.appendChild(pwrap);
    }
    const x = document.createElement("button");
    x.className = "x"; x.textContent = "✕"; x.title = "关闭 (Esc)";
    x.onclick = closeResPop;
    el.respop.appendChild(x);
    // 面板底部 ⚙ 胶囊的摘要跟着新选择变。只改那颗按钮的文案，不 openPanel 整块重建
    // （重建会把锚点按钮换成新元素，虽然弹窗位置不受影响，但没必要）
    if (el.panel._id === c.id) {
      const caps = el.panel.querySelectorAll(".foot .tcap");
      const pb = caps[caps.length - 1];      // 最后那颗胶囊 = ⚙（生图节点是第二颗）
      if (pb && pb.textContent.startsWith("⚙")) {
        const cb = paramsBrief(c, cap);
        pb.textContent = cb ? `⚙ ${cb}` : "⚙ 参数";
      }
    }
  };
  refill();
  el.respop.style.display = "";
  // 摆在锚点按钮上方居中；上方放不下就放下方；横向夹在窗口里（只在开的那一刻定一次）
  const r = anchor.getBoundingClientRect();
  const w = el.respop.offsetWidth, h = el.respop.offsetHeight;
  let left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8));
  let top = r.top - h - 8;
  if (top < 56) top = Math.min(r.bottom + 8, innerHeight - h - 8);
  el.respop.style.left = left + "px";
  el.respop.style.top = top + "px";
}
const closeResPop = () => (el.respop.style.display = "none");

/** 清晰度+比例选择器。能换的比例/清晰度按这个节点当前能力的参数体系画：
    有 aspect_ratio+megapixels 的走 H3 那套；width+height 的（文生图）算像素面积折 K 档。
    onchange：每点一格之后回调（弹窗要刷新胶囊摘要）。 */
function clarityPicker(c, cap, onchange) {
  const arSpec = cap.inputs.find(x => x.key === "aspect_ratio");
  const mpSpec = cap.inputs.find(x => x.key === "megapixels");
  const wSpec = cap.inputs.find(x => x.key === "width") && cap.inputs.find(x => x.key === "height");
  const stlSpec = cap.inputs.find(x => x.key === "scale_to_length");

  const wrap = document.createElement("div"); wrap.className = "cpick";

  // scale_to_length 模式（H3 基础视频：图生视频、说话唱歌）：只有一个数字输入框，控制最长边
  if (stlSpec && !arSpec) {
    const t = document.createElement("div"); t.className = "ctitle"; t.textContent = "分辨率（最长边）";
    const inp = document.createElement("input");
    inp.type = "number";
    inp.min = stlSpec.min || 512;
    inp.max = stlSpec.max || 1344;
    inp.step = stlSpec.step || 32;
    inp.value = c.params.scale_to_length != null ? c.params.scale_to_length : stlSpec.default;
    inp.style.cssText = "width:100%;padding:8px;font-size:14px;border:1px solid #3a3a44;border-radius:4px;background:#1a1a22;color:#fff";
    inp.oninput = () => {
      const v = parseInt(inp.value, 10);
      if (isNaN(v)) return;
      c.params.scale_to_length = Math.max(stlSpec.min || 512, Math.min(stlSpec.max || 1344, v));
      save(); onchange && onchange();
    };
    const hint = document.createElement("div");
    hint.style.cssText = "font-size:12px;color:#8a8a94;margin-top:4px";
    hint.textContent = `范围：${stlSpec.min || 512} ~ ${stlSpec.max || 1344}，步进 ${stlSpec.step || 32}`;
    wrap.append(t, inp, hint);
    return wrap;
  }

  // ---- 比例 ----
  // 两套体系都有比例：select 那套（H3）直接换档；width/height 那套（文生图）
  // 把比例记在 c.params._ratio，宽高每次照 比例×清晰度 现算（选哪个另一个跟着变）
  const isWH = !arSpec && wSpec;
  if (arSpec || isWH) {
    // 文生图当前比例：记过 _ratio 用它；没记过就从现有宽高反推最接近的档；都没有给默认 3:4
    const cur = arSpec
      ? (c.params.aspect_ratio != null ? c.params.aspect_ratio : arSpec.default)
      : (c.params._ratio || (() => {
          const w = c.params.width != null ? c.params.width : wSpec.default;
          const h = c.params.height != null ? c.params.height
            : (cap.inputs.find(x => x.key === "height") || {}).default;
          if (w && h) {
            let best = null, bd = Infinity;
            for (const r of RATIO_GRID) {
              const d = Math.abs(w / h - r[1] / r[2]);
              if (d < bd) { bd = d; best = r[0]; }
            }
            return best || "3:4";
          }
          return "3:4";
        })());
    const g = document.createElement("div"); g.className = "cgrid";
    // 当前档位对应的那一格才点亮。13 格比例折到工作流的 8 档 select，
    // 之前 exact 两头验算在 3:4 和 4:5 这种"折到同一档"的格子上都成立，
    // 一选就同时亮好几格。现在：canonical 那格 on，折到同一档的其余格只画虚线（near）
    const curGrid = arSpec ? (optToRatio(cur) || null) : null;
    for (const r of RATIO_GRID) {
      const b = document.createElement("button");
      const onWH = isWH && (r[0] === cur
        || (!c.params._ratio && r[0] === (RATIO_GRID.find(x =>
          Math.abs((c.params.width / c.params.height) - x[1] / x[2]) < 0.02) || [0, 0, 0])[0]));
      b.className = arSpec
        ? (r === curGrid ? "on" : (ratioToOpt(r) === cur ? "near" : ""))
        : (onWH ? "on" : "");
      b.innerHTML = `<i style="aspect-ratio:${r[1]}/${r[2]}"></i><span>${r[0]}</span>`;
      b.title = `画面比例 ${r[0]}`
        + (arSpec && ratioToOpt(r) !== cur ? `（工作流档位：${ratioToOpt(r)}）` : "（当前）");
      b.onclick = () => {
        if (arSpec) {
          c.params.aspect_ratio = ratioToOpt(r);
        } else {
          c.params._ratio = r[0];
          setWHFrom(r);
        }
        save(); onchange && onchange();
      };
      g.appendChild(b);
    }
    const t = document.createElement("div"); t.className = "ctitle"; t.textContent = "画面比例";
    wrap.append(t, g);
  }

  /** 文生图：按比例 + 清晰度档算宽高（16 步进）。清晰度档取当前选中的，
      没选过按现有宽高折最接近的档。 */
  function setWHFrom(ratio) {
    const step = whStep(cap, c) || CLARITY_STEPS[1];
    const [wr, hr] = [ratio[1], ratio[2]];
    const isW = wr >= hr;
    const short = step.val;
    c.params.width = isW ? Math.round(short * wr / hr / 16) * 16 : short;
    c.params.height = isW ? short : Math.round(short * hr / wr / 16) * 16;
  }

  // ---- 清晰度 ----
  // H3（megapixels）那套的档位按**短边像素**定：480/544/640/768p，跟面板分辨率行的
  // 快捷键同一套换算（mpForP）。之前用固定 0.5K/1K/1.5K/2K 档，0.5K 那档在 16:9 下
  // 实际只有 384p，跟工作流默认（说话 0.4MP=480p、漫剧 0.5MP=544p、参考 0.7MP=640p）
  // 完全对不上号，选中态也亮不出来。
  const mpRatio = mpSpec
    ? (c.params.aspect_ratio != null ? c.params.aspect_ratio
      : (cap.inputs.find(x => x.key === "aspect_ratio") || { default: "16:9 (Widescreen)" }).default)
    : null;
  if (mpSpec || wSpec) {
    const steps = [];
    if (mpSpec) {
      const hi = mpSpec.max ?? 1.1;
      for (const p of H3_P) {
        const v = mpForP(mpRatio, p);
        if (v > hi + 0.01) continue;   // 超宽比例下高 p 会顶穿 H3 的画布面积上限
        steps.push({ id: `${p}p`, label: `${p}p`, val: v, p });
      }
    } else {
      // 文生图那套：按标准分辨率档位（短边像素）
      for (const s of CLARITY_STEPS) {
        steps.push({ ...s, dis: false });
      }
    }
    const t = document.createElement("div"); t.className = "ctitle"; t.textContent = "清晰度";
    const g = document.createElement("div"); g.className = "cgrid k";
    const curStep = whStep(cap, c);
    for (const s of steps) {
      const b = document.createElement("button");
      const curVal = mpSpec
        ? parseFloat(c.params.megapixels != null ? c.params.megapixels : mpSpec.default)
        : (curStep ? curStep.val : null);
      // mp 那套按换算出的短边像素对档（0.4MP 默认正好就是 480p），
      // 别按 megapixels 原值等值比 —— 换算有 32 像素取整，原值永远差一点
      const on = mpSpec
        ? (isFinite(curVal) && Math.min(...resFromMP(mpRatio, curVal)) === s.p)
        : (curVal != null && Math.abs(curVal - s.val) < 40);
      b.className = on ? "on" : "";
      b.textContent = s.label;
      if (mpSpec) {
        b.title = resFromMP(mpRatio, s.val).join("×");
      } else {
        const r = RATIO_GRID.find(x => x[0] === (c.params._ratio || "3:4")) || [0, 3, 4];
        const isW = r[1] >= r[2];
        b.title = isW
          ? `${Math.round(s.val * r[1] / r[2] / 16) * 16} × ${s.val}`
          : `${s.val} × ${Math.round(s.val * r[2] / r[1] / 16) * 16}`;
      }
      b.onclick = () => {
        if (mpSpec) { c.params.megapixels = s.val; }
        else {
          c.params._clarity = s.id;
          // 从当前宽高反推比例，没有记录过就按现有宽高推算
          let ratio = c.params._ratio;
          if (!ratio) {
            const cw = c.params.width != null ? c.params.width : wSpec.default;
            const ch = c.params.height != null ? c.params.height
              : (cap.inputs.find(x => x.key === "height") || {}).default;
            if (cw && ch) {
              let best = null, bd = Infinity;
              for (const r of RATIO_GRID) {
                const d = Math.abs(cw / ch - r[1] / r[2]);
                if (d < bd) { bd = d; best = r[0]; }
              }
              ratio = best || "3:4";
              c.params._ratio = ratio; // 记录下来
            } else {
              ratio = "3:4";
            }
          }
          const r = RATIO_GRID.find(x => x[0] === ratio) || [0, 3, 4];
          setWHFrom(r);
        }
        save(); onchange && onchange();
      };
      g.appendChild(b);
    }
    wrap.append(t, g);
  }
  return wrap;
}

/** 文生图（width/height 体系）当前对应的清晰度档：记过 _clarity 用它，
    否则按现有短边折最接近的档。 */
function whStep(cap, c) {
  if (c.params._clarity) {
    const s = CLARITY_STEPS.find(x => x.id === c.params._clarity);
    if (s) return s;
  }
  const w = cap.inputs.find(x => x.key === "width");
  const h = cap.inputs.find(x => x.key === "height");
  const cw = c.params.width != null ? c.params.width : (w || {}).default;
  const ch = c.params.height != null ? c.params.height : (h || {}).default;
  if (!cw || !ch) return null;
  const short = Math.min(cw, ch);
  let best = null, bd = Infinity;
  for (const s of CLARITY_STEPS) {
    const d = Math.abs(s.val - short);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

/** 这个节点当前选的「比例 · 清晰度 · 时长」摘要，给「⚙ 参数」胶囊当文案。
    没有分辨率参数的能力返回 null（胶囊就只写「参数」）。 */
function paramsBrief(c, cap) {
  if (!cap) return null;
  const ar = cap.inputs.find(x => x.key === "aspect_ratio");
  const mp = cap.inputs.find(x => x.key === "megapixels");
  const w = cap.inputs.find(x => x.key === "width");
  const stl = cap.inputs.find(x => x.key === "scale_to_length");
  const dur = cap.inputs.find(x => x.key === "duration");
  if (!ar && !mp && !w && !stl && !dur) return null;
  const parts = [];
  // scale_to_length 模式：只显示最长边数字
  if (stl && !ar) {
    const v = c.params.scale_to_length != null ? c.params.scale_to_length : stl.default;
    parts.push(`${v}px`);
    return parts.join(" · ");
  }
  if (ar) {
    const cur = c.params.aspect_ratio != null ? c.params.aspect_ratio : ar.default;
    const g = optToRatio(cur);
    parts.push(g ? g[0] : cur.split(" ")[0]);
  } else if (w && c.params._ratio) {
    parts.push(c.params._ratio);
  }
  if (mp) {
    const v = parseFloat(c.params.megapixels != null ? c.params.megapixels : mp.default);
    // 跟 ⚙ 弹窗同一口径：按短边像素报（480p/544p…），不报 MP 原值
    const ratio = c.params.aspect_ratio != null ? c.params.aspect_ratio
      : (ar || {}).default || "16:9 (Widescreen)";
    const p = isFinite(v) ? Math.min(...resFromMP(ratio, v)) : null;
    parts.push(p ? `${p}p` : "?");
  } else if (w) {
    const s = whStep(cap, c);
    if (s) parts.push(s.label);
  }
  // 视频时长
  if (dur) {
    const v = c.params.duration != null ? c.params.duration : dur.default;
    parts.push(`${v}秒`);
  }
  return parts.join(" · ");
}

/* ================= 能力说明浮层 ================= */
const OUT_TXT = { image: "图片 (png)", video: "视频 (mp4，含音轨)", audio: "音频" };
const GRID_ZH = { 4: "四宫格", 6: "六宫格", 9: "九宫格", 12: "十二宫格", 16: "十六宫格" };

/** 这个素材槽要的是一张几宫格拼图（manifest 的 grid，由下游切图节点推出来） */
function gridWord(s) {
  const g = s && s.grid;
  if (!g) return "";
  const n = g[0] * g[1];
  return GRID_ZH[n] || `${n}格`;
}

/** 槽位显示名。原始标签只有序号时补个词；要拼图的直接写成"四宫格3"，
    让人在点上传之前就知道该找什么样的图 */
function slotName(s, c = null) {
  const w = gridWord(s);
  if (MEDIA.includes(s.type)) {
    const cap = c && capOf(c);
    const filled = cap ? cap.inputs.filter(x => x.type === s.type && (c.assets || {})[x.key]) : [];
    const activeIndex = filled.findIndex(x => x.key === s.key);
    const keyIndex = +(String(s.key).match(/\[(\d+)\]/) || [0, 0])[1];
    const n = activeIndex >= 0 ? activeIndex + 1 : keyIndex + 1;
    const name = `${KIND_ZH[s.type] || s.type}${n}`;
    return w ? `${name}（${w}）` : name;
  }
  const t = String(s.label || "").trim();
  return w ? `${t}（${w}）` : t;
}

/** 从 manifest 反推这个工作流吃什么、吐什么 —— 不写死任何工作流 */
function capBrief(cap) {
  const by = (t) => cap.inputs.filter(s => s.type === t);
  const mediaKinds = [...new Set(cap.inputs.filter(s => MEDIA.includes(s.type)).map(s => s.type))];
  const txts = by("textarea");
  const dur = cap.inputs.find(s => s.key === "duration");
  const size = cap.inputs.filter(s => s.key === "width" || s.key === "height");
  const ratio = cap.inputs.find(s => s.key === "aspect_ratio");
  const mp = cap.inputs.find(s => s.key === "megapixels");
  const side = cap.inputs.find(s => s.key === "scale_to_length");
  const need = [], opt = [];
  for (const kind of mediaKinds) {
    const list = by(kind);
    const required = list.filter(s => s.required);
    const optional = list.filter(s => !s.required);
    const label = KIND_ZH[kind] || kind;
    if (required.length) {
      need.push(`${label} ×${required.length}：${required.map(s => slotName(s)).join(" / ")}`);
    }
    if (optional.length) {
      opt.push(`可引用${label}（上限 ${mediaLimit(cap, kind)}）`);
    }
  }
  if (!mediaKinds.length) need.push("不需要素材，纯提示词驱动");
  if (txts.length) need.push(txts.length > 1 ? `提示词 ×${txts.length}` : "提示词");
  if (dur) opt.push(`时长 ${dur.min}–${dur.max} 秒`);
  if (size.length) opt.push("画面宽高");
  if (ratio) opt.push(`画面比例（${ratio.options.length} 档，默认 ${ratio.default}）`);
  if (mp) opt.push(`分辨率 ${H3_P[0]}p–${H3_P[H3_P.length - 1]}p（短边，768p 为 H3 原生）`);
  if (side) opt.push(`分辨率长边 ${side.min}–${side.max}，画面比例跟随原图`);
  if (cap.inputs.some(s => s.type === "seed")) opt.push("种子");
  return { need, opt, out: OUT_TXT[cap.outputType] || cap.outputType, file: cap.file || cap.id };
}

function briefEl(cap, name) {
  const b = capBrief(cap);
  const d = document.createElement("div");
  const h = document.createElement("b"); h.textContent = name || cap.name;
  d.appendChild(h);
  if (cap.note) {
    const n = document.createElement("div"); n.className = "note";
    n.textContent = cap.note; d.appendChild(n);
  }
  const row = (k, v) => {
    const r = document.createElement("div"); r.className = "io";
    const i = document.createElement("i"); i.textContent = k;
    const s = document.createElement("span"); s.textContent = v;
    r.append(i, s); d.appendChild(r);
  };
  row("输入", b.need.join("　·　"));
  if (b.opt.length) row("可调", b.opt.join("　·　"));
  row("产出", b.out);
  const f = document.createElement("div"); f.className = "fn";
  f.textContent = b.file; d.appendChild(f);
  return d;
}

function plainBriefEl(name, note, rows) {
  const d = document.createElement("div");
  const h = document.createElement("b"); h.textContent = name;
  const n = document.createElement("div"); n.className = "note"; n.textContent = note;
  d.append(h, n);
  for (const [key, value] of rows) {
    const r = document.createElement("div"); r.className = "io";
    const i = document.createElement("i"); i.textContent = key;
    const s = document.createElement("span"); s.textContent = value;
    r.append(i, s); d.appendChild(r);
  }
  return d;
}

function modeBriefEl(c, md, name) {
  if (!md) return null;
  const active = modeHas(md, c.cap);
  const capId = active ? (md.ladder ? runCap(c) : c.cap) : modeCap(md);
  const cap = CAPS[capId] || CAPS[modeCap(md)];
  if (!cap) return plainBriefEl(name || md.name, "这个模式当前不可用。", []);
  const d = briefEl(cap, name || md.name);
  let note = "";
  if (md.route) {
    note = (md.entry && md.entry.hint ? md.entry.hint : "根据放入的素材类型自动选择工作流。")
      + (active ? `当前会运行「${cap.name}」。` : "");
  } else if (md.ladder) {
    note = "按图片数量自动选择："
      + Object.keys(md.ladder).map(Number).sort((a, b) => a - b)
        .map(k => `${k} 张 → ${(CAPS[md.ladder[k]] || {}).name || md.ladder[k]}`).join("；")
      + (active ? `。当前 ${filledImgs(c)} 张，会运行「${cap.name}」。` : "。");
  }
  if (note) {
    const n = document.createElement("div"); n.className = "note"; n.textContent = note;
    d.insertBefore(n, d.children[1] || null);
  }
  return d;
}

function nodeBriefEl(c) {
  const def = defOf(c);
  if (isStyle(c)) return plainBriefEl(titleOf(c),
    `这个节点保存一段可复用的风格描述，不会单独生成产物。连接到生成节点后会并入提示词，并沿产物连线向下游继承；下游节点自己挂风格时会从那里开始覆盖继承。使用 ${STYLE_PH} 可以指定原提示词插入位置。这里只写画风、色调、光线和镜头质感，具体画面内容留在生成节点。`,
    [["输入", "风格、色调、光线和镜头质感"], ["产出", "可复用的风格文字"]]);
  if (isText(c)) return plainBriefEl(titleOf(c),
    "这个节点保存和加工文字。可以连接到生成节点并入提示词，也可以连接到其他文本节点作为加工输入；加工结果会写回节点。",
    [["输入", "节点文字或上游文本"], ["产出", "可继续连接的文字"]]);
  if (isAsset(c)) return plainBriefEl(titleOf(c),
    "这个节点保存一份上传素材，不会单独运行。它可以同时连接到多个节点，让同一份图片、视频或音频重复使用；原文件不会被处理。",
    [["输入", "图片、视频或音频"], ["产出", "可复用的原始素材"]]);
  return modeBriefEl(c, modeOf(c), titleOf(c) || (def && def.name));
}

/** 把浮层摆在 a（锚点的屏幕矩形）旁边。
 *
 *  横向夹在**画布**的左右边界里，不是窗口：右边开着历史产物栏时按 innerWidth 夹，
 *  浮层会滑到栏子底下去；顶栏那 52px 同理。
 *  竖向先试锚点下方 → 放不下翻到上方 → 上下都放不下就贴着上边、再挪到锚点侧面，
 *  别糊在节点自己身上（卡在屏幕最下面、说明又长的时候就是这种情形）。 */
function tipShow(node, a) {
  el.tip.innerHTML = ""; el.tip.appendChild(node);
  el.tip.style.display = "";
  // 量之前先归位：上一次的落点会把浮层顶到窗口外，宽度被压窄、换行变多，量出来的高度是假的
  el.tip.style.left = el.tip.style.top = "0px";
  const GAP = 8, TOP = 52;
  const s = el.stage.getBoundingClientRect();
  const L = s.left + GAP, R = s.right - GAP;
  const w = el.tip.offsetWidth, h = el.tip.offsetHeight;
  const clampX = (v) => Math.max(L, Math.min(v, R - w));
  let left = clampX(a.left), top = a.bottom + GAP;
  if (top + h > innerHeight - GAP) {
    if (a.top - GAP - h >= TOP) {
      top = a.top - GAP - h;
    } else {
      top = Math.max(TOP, innerHeight - GAP - h);
      if (R - (a.right + GAP) >= w) left = a.right + GAP;          // 右边有地
      else if ((a.left - GAP) - L >= w) left = a.left - GAP - w;   // 左边有地
    }
  }
  el.tip.style.left = left + "px";
  el.tip.style.top = top + "px";
}
const tipHide = () => (el.tip.style.display = "none");

/** 给元素挂延迟悬停说明，避免鼠标经过整张节点时提示层闪烁。 */
function hoverTip(node, contentGetter) {
  let timer = null;
  node.addEventListener("mouseenter", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const content = contentGetter();
      if (content && node.matches(":hover")) tipShow(content, node.getBoundingClientRect());
    }, 280);
  });
  node.addEventListener("mouseleave", () => { clearTimeout(timer); tipHide(); });
  node.addEventListener("mousedown", () => { clearTimeout(timer); tipHide(); });
}

/* ================= 启动 ================= */
(async function boot() {
  try {
    const d = await api("/api/cards");
    CARDS = d.cards; CAPS = d.capabilities;
    el.dot.classList.toggle("on", !!d.comfy_online);
  } catch (e) { toast("后端未就绪：" + e.message); }
  await loadProjects();
  bindGlobal();
  // 一进来就打开示例（locked 那个），新用户不用先面对一张空画布
  const demo = projects.find(p => p.locked);
  if (demo) await openProject(demo.id);
  await health();
  setInterval(health, 5000);
  pollJobs();
  setInterval(pollJobs, 700);
})();

async function health() {
  try {
    const h = await api("/api/health");
    el.dot.classList.toggle("on", !!h.comfy_online);
    el.controllerLink.style.display = h.mode === "controller" ? "" : "none";
  } catch (e) {
    el.dot.classList.remove("on");
    el.controllerLink.style.display = "none";
  }
}

/* ================= 项目栏 ================= */
async function loadProjects() {
  try { projects = (await api("/api/projects")).projects; } catch (e) { projects = []; }
  el.plist.innerHTML = "";
  for (const p of projects) {
    const d = document.createElement("div");
    d.className = "pitem" + (PROJ && PROJ.id === p.id ? " on" : "");
    // locked 的项目（示例）不给删除按钮，服务端也会拒
    d.innerHTML = `<span class="nm"></span><span class="ct">${p.cards}</span>`
      + (p.locked ? "" : `<button class="del" title="删除">✕</button>`);
    d.querySelector(".nm").textContent = p.name;
    d.onclick = () => openProject(p.id);
    const del = d.querySelector(".del");
    if (del) del.onclick = async (ev) => {
      ev.stopPropagation();
      if (!confirm(`删除项目「${p.name}」？（文件会保留为 .deleted）`)) return;
      await api(`/api/projects/${p.id}`, { method: "DELETE" });
      if (PROJ && PROJ.id === p.id) { PROJ = null; closePanel(); showEmpty(); }
      loadProjects();
    };
    el.plist.appendChild(d);
  }
}

async function newProject() {
  const name = prompt("项目名", "新项目 " + new Date().toLocaleDateString("zh-CN"));
  if (name === null) return;
  const p = await jpost("/api/projects", { name });
  await loadProjects();
  openProject(p.id);
}

async function openProject(pid) {
  try { PROJ = await api(`/api/projects/${pid}`); }
  catch (e) { return toast(e.message); }
  PROJ.cards = PROJ.cards || [];
  PROJ.edges = PROJ.edges || [];
  PROJ.groups = PROJ.groups || [];
  // 能力被合并/拆分过之后，老项目里存的 cap 可能已经不是模式入口了
  // （图生视频并进了首尾帧那条），统一归到模式入口，参数和素材的 key 是通的
  for (const c of PROJ.cards) {
    const md = modeOf(c);
    // 路由节点的模式 id 不是能力 id（它就是那个节点），c.cap 已经是两路里的一条，别动。
    // modelSwitch 命中的也别归一：krea2_i2i 归回 zimage_i2i 等于把用户选的模型换了
    if (md && !md.route && md.id !== c.cap
      && !(md.modelSwitch && Object.values(md.modelSwitch).includes(c.cap))) c.cap = md.id;
    seedHistory(c);
  }
  // 文本节点曾经分 5 种模式（text_source / text_polish…），后来合成一种。
  // 老节点：模式 id 归一成 "text"；当时存在 c.out 里的加工结果搬进「节点上的字」
  for (const c of PROJ.cards) {
    if (!isText(c)) continue;
    if (c.cap !== "text") c.cap = "text";
    if (!String((c.params || {}).text || "").trim() && String(c.out || "").trim()) {
      c.params = c.params || {};
      c.params.text = c.out;
    }
  }
  view = Object.assign({ x: 60, y: 70, k: 1 }, PROJ.view || {});
  selId = null;
  selIds.clear();
  closePanel();
  el.empty.style.display = "none";
  el.dock.style.display = ""; el.fit.style.display = "";
  el.ptitle.textContent = PROJ.name;
  // 示例上的改动不落盘，这件事必须写在明面上：不然用户在它上面搭了半天，
  // 刷新一下全没了，只会以为是丢数据了
  if (PROJ.locked) {
    const b = document.createElement("span");
    b.className = "ro";
    b.textContent = "试玩画布 · 刷新还原";
    b.title = "这张画布是示例：参数怎么改、节点怎么拖、重跑几遍都随便，"
      + "改动只在这一次里有效，刷新就回到原样。想留下自己的东西就「＋ 新建项目」";
    el.ptitle.appendChild(b);
  }
  // 断线重连后可能有节点状态是 running，交给轮询自己收尾
  render();
  loadProjects();
}

function showEmpty() {
  el.empty.style.display = "";
  el.world.innerHTML = ""; el.wires.innerHTML = "";
  el.ptitle.textContent = "";
  el.dock.style.display = "none"; el.fit.style.display = "none";
  el.hint.textContent = "";
}

/** 节点对象上挂了 _el（DOM），序列化前必须剥掉，否则 JSON 循环引用 */
const plain = (c) => Object.fromEntries(Object.entries(c).filter(([k]) => k[0] !== "_"));

/** 保存串行化：两次 PUT 撞在一起会带同一个 rev，后一次要被服务端顶掉 */
let saveChain = Promise.resolve();

function save() {
  if (!PROJ) return;
  // 示例是只读的：拖节点、改参数、重跑都随便，但只活在这一次打开里，刷新就回到那份固定的示例。
  // 这里直接不发请求（服务端也会回 403），否则每动一下就弹一次「保存失败」
  if (PROJ.locked) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveChain = saveChain.then(doSave); }, 700);
}

async function doSave() {
  if (!PROJ) return;
  const id = PROJ.id;
  PROJ.view = view;
  try {
    const r = await jput(`/api/projects/${id}`, {
      rev: PROJ.rev || 0, name: PROJ.name,
      cards: PROJ.cards.map(plain), edges: PROJ.edges, groups: PROJ.groups || [], view,
    });
    if (PROJ && PROJ.id === id) PROJ.rev = r.rev;
  } catch (e) {
    // 409：画布在别处（另一个标签页 / 服务端脚本）被改过。这份内存快照已经是旧的，
    // 硬写会把别处的产物抹掉，所以丢掉本地这份、重新加载。
    if (e.status === 409 && PROJ && PROJ.id === id) {
      toast("画布在别处被改过，已重新加载");
      return openProject(id);
    }
    toast("保存失败：" + e.message);
  }
}

/* ================= 视图 ================= */
function applyView() {
  el.world.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.k})`;
  el.wires.style.transform = el.world.style.transform;
  el.groups.style.transform = el.world.style.transform;
  el.wires.setAttribute("width", 1); el.wires.setAttribute("height", 1);
  paintSel();               // 工具条跟着缩放/平移走，不然就飘走了
  updateMinimap();
  updateZoomPercent();
}

function updateZoomPercent() {
  if (el.zoomPercent) {
    el.zoomPercent.textContent = Math.round(view.k * 100) + "%";
  }
}

function toWorld(cx, cy) {
  const r = el.stage.getBoundingClientRect();
  return { x: (cx - r.left - view.x) / view.k, y: (cy - r.top - view.y) / view.k };
}

/* ================= 小地图 ================= */
let minimapVisible = false;

function updateMinimap() {
  if (!minimapVisible || !PROJ || !PROJ.cards.length) return;

  const canvas = el.minimapCanvas;
  const ctx = canvas.getContext("2d");
  const MAP_W = 200, MAP_H = 150;

  // 设置 canvas 实际分辨率
  canvas.width = MAP_W;
  canvas.height = MAP_H;

  // 计算所有节点的包围盒
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of PROJ.cards) {
    const w = cardW(c), h = c._el ? c._el.offsetHeight : 200;
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x + w);
    maxY = Math.max(maxY, c.y + h);
  }

  // 添加边距
  const padding = 50;
  minX -= padding; minY -= padding;
  maxX += padding; maxY += padding;

  const worldW = maxX - minX, worldH = maxY - minY;
  const scale = Math.min(MAP_W / worldW, MAP_H / worldH);

  // 清空画布
  ctx.fillStyle = "#070707";
  ctx.fillRect(0, 0, MAP_W, MAP_H);

  // 绘制节点
  ctx.fillStyle = "#f3f4f6";
  ctx.strokeStyle = "#f3f4f6";
  ctx.lineWidth = 1;
  for (const c of PROJ.cards) {
    const x = (c.x - minX) * scale;
    const y = (c.y - minY) * scale;
    const w = cardW(c) * scale;
    const h = (c._el ? c._el.offsetHeight : 200) * scale;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  }

  // 绘制当前视口
  const stageRect = el.stage.getBoundingClientRect();
  const vpX = (-view.x / view.k - minX) * scale;
  const vpY = (-view.y / view.k - minY) * scale;
  const vpW = (stageRect.width / view.k) * scale;
  const vpH = (stageRect.height / view.k) * scale;

  el.minimapViewport.style.left = vpX + "px";
  el.minimapViewport.style.top = vpY + "px";
  el.minimapViewport.style.width = vpW + "px";
  el.minimapViewport.style.height = vpH + "px";

  // 保存缩放信息供拖动使用
  el.minimap._scale = scale;
  el.minimap._minX = minX;
  el.minimap._minY = minY;
}

function toggleMinimap() {
  minimapVisible = !minimapVisible;
  el.minimap.style.display = minimapVisible ? "" : "none";
  el.minimapBtn.classList.toggle("active", minimapVisible);
  if (minimapVisible) updateMinimap();
}

function bindMinimapDrag() {
  let dragging = false;

  const move = (ex, ey) => {
    if (!dragging) return;
    const rect = el.minimap.getBoundingClientRect();
    const mx = ex - rect.left;
    const my = ey - rect.top;

    const scale = el.minimap._scale || 1;
    const minX = el.minimap._minX || 0;
    const minY = el.minimap._minY || 0;

    const worldX = mx / scale + minX;
    const worldY = my / scale + minY;

    const stageRect = el.stage.getBoundingClientRect();
    view.x = -worldX * view.k + stageRect.width / 2;
    view.y = -worldY * view.k + stageRect.height / 2;

    applyView();
    placePanel();
    save();
  };

  el.minimapViewport.addEventListener("mousedown", (ev) => {
    ev.preventDefault();
    dragging = true;
  });

  el.minimap.addEventListener("mousedown", (ev) => {
    if (ev.target === el.minimapViewport) return;
    ev.preventDefault();
    dragging = true;
    move(ev.clientX, ev.clientY);
  });

  addEventListener("mousemove", (ev) => {
    if (dragging) move(ev.clientX, ev.clientY);
  });

  addEventListener("mouseup", () => {
    dragging = false;
  });
}

/* ================= 渲染 ================= */
function render() {
  el.world.innerHTML = "";
  for (const c of PROJ.cards) el.world.appendChild(buildCard(c));
  applyView();
  drawWires();
  paintGroups();
  el.hint.textContent = `${PROJ.cards.length} 个节点`;
  updateMinimap();
}

/** 这个节点这一轮会出什么：认真正会跑的那条能力，不是节点定义。
    路由节点的节点定义写死是 image（`_cards.json` 取第一路），切到视频那一路后还报"图片"
    就是在骗人；工具节点的节点图标（🧩 ✨）本身也不说明出图还是出视频。 */
const outKindOf = (c) => ((CAPS[runCap(c)] || capOf(c) || defOf(c) || {}).outputType) || "image";
/** 路由节点还一格素材都没放：出图还是出视频要等放进来那一刻才定，别先报一个。
    （新建的路由节点 c.cap 是排在最前那一路 = 图片，直接读它会误报"出图片"） */
const kindUndecided = (c) => {
  const md = modeOf(c);
  return !!(md && md.route) && !Object.values(c.assets || {}).some(Boolean);
};

/** 画面区的空占位：还没出过东西、或者这一轮失败/取消了都用它 */
function phHTML(c) {
  if (isStyle(c)) return `<span class="ph">🎨</span>`;
  if (isText(c)) return `<span class="ph">✍</span>`;
  if (isAsset(c)) return `<span class="ph">📎</span>`;
  return `<span class="ph">${kindUndecided(c) ? "🖼🎬"
    : outKindOf(c) === "video" ? "🎬" : "🖼"}</span>`;
}

/** 节点上「按住不是要拖节点」的地方。整个节点都能拖，所以这里列的是自己有事要干的那几样：
 *    button / input / textarea / select  按钮和输入框
 *    audio                               浏览器自带的播放条，整条都得留给它
 *    .vprog                              按住是拖播放进度（bindCardVideo）
 *    .cmp                                按住是拖原图对比线（bindCompare）
 *    .rz / .port / .inport               改大小、拉连线
 *  video **不在**里面：画面上按住就是拖节点，单击才是放/停（bindCardVideo 里按位移分辨）。
 *  拖进度只留给底下那条 .vprog —— 原来在画面上横向拖也能定位，但那把整块画面占死了，
 *  视频节点就只剩标题栏能拖。
 *  后三样自己就 stopPropagation 了，压根轮不到节点这层，列在这儿只是省得以后
 *  哪次改动把那个 stopPropagation 弄丢了，节点就跟着一起跑。 */
const NODRAG = "button,input,textarea,select,audio,.vprog,.cmp,.rz,.port,.inport";

function buildCard(c) {
  const def = defOf(c);
  const d = document.createElement("div");
  d.className = "card" + (selId === c.id ? " sel" : "");
  d.dataset.id = c.id;
  d.style.left = c.x + "px"; d.style.top = c.y + "px";
  d.innerHTML = `
    <div class="ch"><span>${def ? def.icon : "▪"}</span><span class="t"></span><button class="x" title="删除">✕</button></div>
    <div class="body">${phHTML(c)}</div>
    <div class="bar"><i></i></div>
    <div class="cf"><span class="kt"></span><span class="st"></span><span class="meta" style="margin-left:auto"></span></div>
    <div class="rz tl" title="拖动改大小（按住 Shift 只改宽）"></div>
    <div class="rz br" title="拖动改大小（按住 Shift 只改宽）"></div>
    <div class="inport"></div>
    <div class="port" title="${isAsset(c) ? "拖到别的节点上 → 这份素材就进它的格子" : "拖到空白处 → 用本节点产物新建下游节点"}"></div>`;
  c._el = d;
  applySize(c);
  paintTitle(c);
  d.querySelector(".ch .x").onclick = (ev) => { ev.stopPropagation(); delCard(c.id); };
  d.querySelector(".rz.tl").onmousedown = (ev) => startResize(ev, c, d, -1);
  d.querySelector(".rz.br").onmousedown = (ev) => startResize(ev, c, d, 1);
  d.querySelector(".port").onmousedown = (ev) => startWire(ev, c);
  d.onmousedown = (ev) => {
    // 中键留给画布：在节点上按住中键也是拖画布（不平移就会以为卡死了）
    if (ev.button === 1) return;
    // 整个节点都是拖动把手。以前只有标题栏那一条 26px 能拖 —— 出了图之后节点九成面积
    // 是画面，按下去却纹丝不动，每次挪节点都得回去瞄那一条。反过来列例外更省事（NODRAG）
    if (ev.button === 0 && !ev.target.closest(NODRAG)) return startDrag(ev, c, d);
    ev.stopPropagation();     // 右键别漏到画布上去
    pick(c.id);
  };
  d.oncontextmenu = (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    tipHide(); pick(c.id); cardMenu(ev.clientX, ev.clientY, c);
  };
  d.ondblclick = (ev) => {
    const body = ev.target.closest(".body");
    if (!body || isTextCard(c)) return;   // 文本节点/风格节点没有媒体产物可看
    if (isAsset(c) && !assetOf(c)) return;   // 空素材节点：连点就是连点，别开空的大窗口
    if (ev.target.closest(".vprog")) return;   // 在进度条上连点是在定位，别抢它
    // 音频那条播放条是浏览器画在 audio 里的，点它拿到的 target 还是 audio 本身，
    // 没法直接区分，只能按位置判断：落在底部这条里就是在操作播放条，别抢它的双击
    if (ev.target.matches("audio")) {
      const r = ev.target.getBoundingClientRect();
      if (ev.clientY > r.bottom - 34 * view.k) return;
    }
    // 大窗口里那份才是带播放条的，节点里这份别在背后接着响
    for (const v of body.querySelectorAll("video")) v.pause();
    // 宫格里双击哪一格就从哪一张开始看
    openViewer(c, +(ev.target.dataset.i || 0));
  };
  bindCardVideo(d.querySelector(".body"));
  bindCompare(d.querySelector(".body"), c);
  hoverTip(d, () => nodeBriefEl(c));
  // 空素材节点：点一下正文就弹文件选择（节点脚和徽标都写着「点节点选文件」，不接上会落空）
  d.onclick = (ev) => {
    if (!isAsset(c) || assetOf(c)) return;
    if (!ev.target.closest(".body")) return;
    pickAsset(c);
  };
  paint(c);
  return d;
}

/* 全屏幕只许一个东西在响。一屏摊着十几个节点，多开两个视频就分不清声音是哪来的，
   那个还在放的往往已经被滚出视野，只能听见声音找不着人。
   统一挂在 document 捕获阶段（play/pause 不冒泡），节点视频、宫格里的视频、
   大窗口里的视频和音频全走这一条，各处不用自己记着关别人。 */
let NOWPLAYING = null;
document.addEventListener("play", (ev) => {
  for (const o of document.querySelectorAll("video, audio")) if (o !== ev.target) o.pause();
  NOWPLAYING = ev.target;
}, true);
document.addEventListener("pause", (ev) => {
  if (NOWPLAYING === ev.target) NOWPLAYING = null;
}, true);
// 点到别处就停。范围按「它所在的那一块」算而不是按媒体元素本身：进度条、选区手柄都是
// 它的兄弟节点，按元素算的话一按进度条就先被这里停掉，拖完也就不会接着放了
document.addEventListener("mousedown", (ev) => {
  if (!NOWPLAYING) return;
  const box = NOWPLAYING.closest(".body, .vbox, .arange");
  if (!box || !box.contains(ev.target)) NOWPLAYING.pause();
}, true);

/** 节点里视频的交互：画面上单击放/停、按住拖是挪节点；定位进度只在底下那条 .vprog 上。
 *
 *  以前在画面上横向拖也能定位，代价是整块画面被占死 —— 视频节点就只剩标题栏那一条能拖。
 *  现在画面区交回给拖节点（NODRAG 里没有 video），这儿只负责分辨「按下又没挪动」= 点了一下。
 *  阈值跟 startDrag 一样是 4px，两边必须一致：小于 4px 那边不认拖、这边就得认点击，
 *  不然会出现「既没挪节点、也没放视频」的死角。
 *
 *  绑在 .body 上做事件委托，paint() 换掉里面的 innerHTML 也不用重新绑。 */
function bindCardVideo(body) {
  const seek = (v, clientX, box) => {
    if (!isFinite(v.duration) || !v.duration) return;
    const r = box.getBoundingClientRect();
    v.currentTime = Math.min(Math.max((clientX - r.left) / r.width, 0), 1) * v.duration;
  };
  body.onmousedown = (ev) => {
    if (ev.button !== 0) return;
    const bar = ev.target.closest(".vprog");
    if (bar) {
      const v = body.querySelector("video");
      if (!v) return;
      // .vprog 在 NODRAG 里，节点那层不会跟着动，这儿放心 stopPropagation
      ev.stopPropagation(); ev.preventDefault();
      const playing = !v.paused;
      v.pause(); seek(v, ev.clientX, bar);      // 按下即定位，不用先拖出一段
      const mv = (e) => seek(v, e.clientX, bar);
      const up = () => {
        document.removeEventListener("mousemove", mv);
        document.removeEventListener("mouseup", up);
        if (playing) v.play().catch(() => {});  // 拖完接着放
      };
      document.addEventListener("mousemove", mv);
      document.addEventListener("mouseup", up);
      return;
    }
    const v = ev.target.closest("video");
    if (!v) return;
    // 既不 stopPropagation 也不 preventDefault：这一下要原样交给节点那层去起拖
    // （幽灵图那边已经 draggable=false + CSS user-drag 兜住了）
    const x0 = ev.clientX, y0 = ev.clientY;
    const up = (e) => {
      document.removeEventListener("mouseup", up);
      // 挪过了就是在拖节点，别顺手把视频放起来
      if (Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) >= 4) return;
      if (v.paused) v.play().catch(() => {}); else v.pause();
    };
    document.addEventListener("mouseup", up);
  };
  // timeupdate 不冒泡，只能挂捕获阶段（捕获照样会经过祖先节点）
  body.addEventListener("timeupdate", (ev) => {
    const f = body.querySelector(".vprog i"), v = ev.target;
    if (!f || !isFinite(v.duration) || !v.duration) return;
    f.style.width = (v.currentTime / v.duration * 100) + "%";
  }, true);
}

/** 把节点自己的尺寸写到 DOM 上。
 *  宽度改整个节点；高度只改画面区（.body），标题栏和状态栏保持自然高度。
 *  出一整组产物时（.body.grid）画面区高度交回 CSS 自动撑开 —— 宫格是靠宽度
 *  等比排的，硬压一个高度只会把后几行裁掉。 */
function applySize(c) {
  const d = c._el; if (!d) return;
  d.style.width = cardW(c) + "px";
  const body = d.querySelector(".body");
  body.style.height = (c.h && !body.classList.contains("grid")) ? c.h + "px" : "";
}

function paint(c) {
  const d = c._el; if (!d) return;
  const body = d.querySelector(".body");
  const st = d.querySelector(".st"), meta = d.querySelector(".meta");
  const bar = d.querySelector(".bar i");
  // 风格节点没有产物，画面区直接摊那段风格文字：画布上一眼能看出这个节点在管什么风格，
  // 不用点开面板。（这也是它唯一的内容，藏起来这个节点就成了个空盒子）
  if (isStyle(c)) {
    const txt = String((c.params || {}).style || "").trim();
    body.classList.remove("grid");
    body.classList.add("sbody");
    applySize(c);
    body.textContent = "";
    if (txt) {
      const p = document.createElement("div"); p.className = "stx";
      p.textContent = txt;
      body.appendChild(p);
    } else body.innerHTML = phHTML(c)
      + `<div class="sempty">在旁边的面板里写一段风格，再把出口拖到生图/生视频节点上</div>`;
    const port = d.querySelector(".port");
    if (port) port.title = "拖到生图/生视频节点上 → 那个节点套用这段风格（拖到空白处会列出所有能挂的玩法）";
    const n = (PROJ ? PROJ.edges : []).filter(e => e.from === c.id && isTextEdge(e)).length;
    // 继承的那几张没有连线，节点脚不报数就等于没告诉用户这段风格到底管着几个节点
    const m = styleReach(c).length;
    st.className = "st";
    st.textContent = txt ? "" : "还没写";
    meta.textContent = n ? `挂了 ${n} 个节点` + (m ? ` · 连带下游 ${m} 张` : "") : "还没挂节点";
    bar.style.width = "0%";
    return;
  }
  // 文本节点：内容就长在节点上 —— 自己写的字和加工出来的结果都在这一个框里，
  // 都可以直接改。面板只管加工方式和输入
  if (isText(c)) {
    const busy = c.status === "running";
    body.classList.remove("grid");
    body.classList.add("sbody");
    applySize(c);
    body.textContent = "";
    const ta = document.createElement("textarea");
    ta.className = "ttxt";
    ta.spellcheck = false;
    ta.value = String((c.params || {}).text || "");
    ta.placeholder = busy ? "正在加工，稍等…"
      : "在这里写字；选好加工方式点「↑ 运行」，加工结果就落在这个框里 —— 可以直接改";
    ta.disabled = busy;
    ta.oninput = () => {
      c.params = c.params || {};
      c.params.text = ta.value;
      // 同步更新参数面板中的 textarea
      const panel = document.querySelector("#panel");
      const panelTa = panel ? panel.querySelector("textarea") : null;
      if (panelTa && panelTa.placeholder === "在这里写字或直接在节点上写") {
        panelTa.value = ta.value;
      }
      paintTextFoot(c);          // 只刷节点脚，不重画 body —— 重画会丢输入焦点
      save();
    };
    body.appendChild(ta);
    if (busy) {
      const l = document.createElement("div"); l.className = "load cover";
      body.appendChild(l);
    }
    paintTextFoot(c);
    return;
  }
  const outs = c.outputs || [];
  const out = outs[0];
  // 抠图这类节点要在画面上叠一张原图做对比（见 cmpSrc）
  const cmp = cmpSrc(c);
  // sig 而不是单个 url：一个节点可能出一整组图（分镜九宫格），少一张多一张都要重画
  // 原图也要进 sig：不重跑只换了输入那张图，画面里叠的那层也得跟着换
  const sig = outs.map(o => o.url).join("|") + (cmp ? "|<" + cmp : "");
  // dataset.url 同时当"画面区现在装的是什么"的记号，"busy" 是给加载态占的名字
  // （sig 是一串 URL，撞不上）
  const busy = c.status === "queued" || c.status === "running";

  if (busy && body.dataset.url !== "busy") {
    // 上一轮的产物必须撤掉：留着旧图，看着像已经出完了，还会有人去点它看大图
    body.dataset.url = "busy";
    body.classList.remove("grid");
    applySize(c);
    body.innerHTML = `<div class="load"></div>`;
  } else if (!busy && !outs.length && body.dataset.url === "busy") {
    // 失败/取消：转圈得停下来，不然一直转着像还在跑
    body.dataset.url = "";
    body.innerHTML = phHTML(c);
  } else if (isAsset(c) && !outs.length && body.dataset.url) {
    // 素材节点清空：手里那份文件没了，画面区还在演上一条 → 换回占位图标
    body.dataset.url = "";
    body.classList.remove("grid");
    body.innerHTML = phHTML(c);
  }

  if (outs.length && body.dataset.url !== sig) {
    body.dataset.url = sig;
    body.classList.toggle("grid", outs.length > 1);
    applySize(c);      // 宫格的画面区是自动高度，进出宫格都要重新决定 c.h 生不生效
    // draggable=false：节点里的图/视频不该能拖出去（拖出来是浏览器自带的行为，
    // 会拽出一个半透明幽灵图，还容易被当成"拖它去连线"）。CSS 里另有 user-drag 兜底
    // 节点里的视频一律不给 controls：268px 宽的节点塞一条播放条就挡掉半幅画面。
    // 单击播放/暂停、按住拖是挪节点、拖底下那条 .vprog 定位进度、
    // 双击进大窗口看带播放条的完整预览（见 buildCard / bindCardVideo）
    if (outs.length > 1) {
      // 一组产物铺成宫格，data-i 供双击时定位到具体哪一张
      body.style.setProperty("--cols", outs.length <= 4 ? 2 : outs.length <= 9 ? 3 : 4);
      body.innerHTML = outs.map((o, i) => o.kind === "video"
        ? `<video src="${o.url}" data-i="${i}" loop preload="metadata" draggable="false"></video>`
        : `<img src="${o.url}" data-i="${i}" alt="" draggable="false">`).join("");
    } else {
      // .vprog 是自己画的进度条：不给 controls 就没有任何进度反馈，按住拖也没了准头
      body.innerHTML = out.kind === "video"
        ? `<video src="${out.url}" loop preload="metadata" draggable="false"></video>`
          + `<div class="vprog" title="按住左右拖 → 定位进度（画面上按住是挪节点）"><i></i></div>`
        : out.kind === "audio"
          ? `<audio src="${out.url}" controls style="width:92%"></audio>`
          : cmp
            // 原图压在结果上面，按 --x 从左边裁开：往右拖 = 原图一点点长回来。
            // 文案不说"还原背景"：抠出背景那个节点拖回来的是主体，两个节点共用这一段
            ? `<div class="cmp" title="按住左右拖：跟原图对比，看边缘抠干净了没有">`
              + `<img class="new" src="${out.url}" alt="" draggable="false" data-i="0">`
              + `<img class="old" src="${cmp}" alt="" draggable="false">`
              + `<div class="cmpx"><i>⇔</i></div>`
              + `<div class="cmptip">按住往右拖 → 回到原图</div></div>`
            : `<img src="${out.url}" alt="" draggable="false">`;
    }
    if (cmp) applyCmp(c);
    // seed 不再压在画面上，改由右侧「历史产物」栏单独一行展示
    // 探测产物的真实尺寸（图片/视频），存回 outputs 里，paintKind 会读它显示分辨率
    if (!isTextCard(c) && !isAsset(c)) {
      for (let i = 0; i < outs.length; i++) {
        const o = outs[i];
        if (o.kind === "image" && !o.width) {
          const img = body.querySelector(`img[data-i="${i}"]`) || body.querySelector("img");
          if (img && img.complete) {
            o.width = img.naturalWidth; o.height = img.naturalHeight;
            paintKind(c); save();
          } else if (img) {
            img.onload = () => {
              o.width = img.naturalWidth; o.height = img.naturalHeight;
              paintKind(c); save();
            };
          }
        } else if (o.kind === "video" && !o.width) {
          const v = body.querySelector(`video[data-i="${i}"]`) || body.querySelector("video");
          if (v && v.readyState >= 1) {
            o.width = v.videoWidth; o.height = v.videoHeight;
            paintKind(c); save();
          } else if (v) {
            v.onloadedmetadata = () => {
              o.width = v.videoWidth; o.height = v.videoHeight;
              paintKind(c); save();
            };
          }
        }
      }
    }
  }

  // 素材节点自己不跑，节点脚不能报"待生成"（它永远等不到）——只说手里有没有东西
  if (isAsset(c)) {
    st.className = "st" + (out ? " done" : "");
    st.textContent = out ? "已就绪" : "点节点选文件";
    st.title = out ? "把右边的出口拖到别的节点 → 这份素材就进那个节点的格子里" : st.textContent;
    bar.style.width = "0%";
    meta.textContent = out ? out.filename.slice(-22) : "";
    meta.title = out ? (out.origin || "") : "";
    return;
  }

  const s = c.status;
  st.className = "st" + (s === "running" || s === "queued" ? " run" : s === "done" ? " done" : s === "error" ? " err" : "");
  st.textContent = s === "queued" ? (c.queue_remaining > 1 ? `排队中 (${c.queue_remaining})` : "排队中")
    : s === "running" ? `生成中 ${Math.round((c.progress || 0) * 100)}%`
                        + (c.step ? ` · ${c.step}` : "")
    : s === "done" ? (fmtEla(c.ms) ? `已完成 · ${fmtEla(c.ms)}` : "已完成")
    : s === "error" ? "失败"
    : s === "canceled" ? "已取消" : "待生成";
  st.title = st.textContent;           // 挤成省略号时鼠标悬停还能看全
  bar.style.width = (s === "running" || s === "queued" ? (c.progress || 0.02) * 100 : s === "done" ? 100 : 0) + "%";
  meta.textContent = c.error ? String(c.error).slice(0, 40)
    : outs.length > 1 ? `${outs.length} 张`
    : out ? out.filename.slice(-22) : "";
  meta.title = c.error || "";
}

/** 文本节点的节点脚：状态字 / 输入段数 / 出口提示 / 进度条。在节点上打字时也要刷它
    （「还没写」得变掉），但绝不能重画 body —— 重画会丢输入焦点。 */
function paintTextFoot(c) {
  const d = c._el; if (!d) return;
  const st = d.querySelector(".st"), meta = d.querySelector(".meta");
  const bar = d.querySelector(".bar i");
  const op = textOp(c);          // 选没选加工方式：没选就是纯文本节点
  const busy = c.status === "running";
  const txt = textOf(c);
  const port = d.querySelector(".port");
  if (port) port.title = "拖到生成节点上 → 并进它的提示词；拖到另一个文本节点上 → 当那段加工的输入"
    + "（拖到空白处会列出能接的地方）";
  const outN = (PROJ ? PROJ.edges : []).filter(e => e.from === c.id && isTextEdge(e)).length;
  const inN = ownTexts(c).length;
  st.className = "st" + (busy ? " run" : c.status === "error" ? " err" : op && c.status === "done" ? " done" : "");
  if (busy) st.textContent = "处理中…";
  else if (op) st.textContent = c.status === "error" ? "失败"
    : c.status === "done" ? (fmtEla(c.ms) ? `已完成 · ${fmtEla(c.ms)}` : "已完成")
    : "待运行";
  else st.textContent = txt ? "" : "还没写";
  st.title = st.textContent;
  const bits = [];
  if (op) bits.push(`输入 ${inN} 段`);
  if (outN) bits.push(`连 ${outN} 个节点`);
  meta.textContent = bits.join(" · ");
  meta.title = c.error || "";
  bar.style.width = busy ? "40%" : c.status === "done" ? "100%" : "0%";
}

/* ---------- 原图 ↔ 结果 对比线 ----------
   只有 manifest 里 compare: true 的能力才画（现在是人物提取 / 抠出背景 / 人物擦除 三条）。
   这几条的成败全在边缘那一圈，透明底的图单看只是一块空白，不跟原图叠着看根本判断不了
   干净没有。要给别的能力开就在 scan_workflows.py 的 COMPARE 集合里加一个 id。
   文案保持节点中立（"回到原图"，不写"还原背景"）：往右拖回来的东西每个节点都不一样，
   三个节点共用这一段 DOM。 */

/** 这个节点该不该画对比线；该画就返回压在上面那张原图的 url。 */
function cmpSrc(c) {
  const md = CAPS[runCap(c)];
  if (!md || !md.compare) return null;
  const outs = c.outputs || [];
  if (outs.length !== 1 || outs[0].kind !== "image") return null;   // 宫格/视频不画
  const s = (md.inputs || []).find(x => x.type === "image");
  const a = s && (c.assets || {})[s.key];
  return a && a.kind === "image" ? a.url : null;
}

/** 把分割位置写到 DOM 上。位置存百分比而不是像素 —— 节点能拉宽拉窄，
    存像素的话一改尺寸那条线就跑偏了。
    存在 c._cmp：下划线开头的键 plain() 会剥掉，不进存档 —— 这是「我刚看到哪」，
    不是这个节点的设置，重开项目该回到默认（0 = 只看结果，原图完全收在左边）。 */
function applyCmp(c) {
  const box = c._el && c._el.querySelector(".cmp");
  if (!box) return;
  const x = c._cmp == null ? 0 : c._cmp;
  box.style.setProperty("--x", (x * 100) + "%");
  box.classList.toggle("dragged", c._cmp != null);   // 动过就把提示字撤了
}

/** 按住 .cmp 左右拖。事件委托在 .body 上，paint() 换 innerHTML 也不用重绑。
    必须用 addEventListener：.body 的 onmousedown 已经被 bindCardVideo 占了。 */
function bindCompare(body, c) {
  body.addEventListener("mousedown", (ev) => {
    if (ev.button !== 0) return;
    const box = ev.target.closest(".cmp");
    if (!box) return;
    // 不 stopPropagation：照样冒泡上去选中这个节点
    ev.preventDefault();                 // 掐掉浏览器自带的拖拽幽灵图
    const at = (clientX) => {
      const r = box.getBoundingClientRect();
      c._cmp = Math.min(Math.max((clientX - r.left) / r.width, 0), 1);
      applyCmp(c);
    };
    at(ev.clientX);                      // 按下即定位，不用先拖出一段
    const mv = (e) => at(e.clientX);
    const up = () => {
      document.removeEventListener("mousemove", mv);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", mv);
    document.addEventListener("mouseup", up);
  });
}

/* ---------- 连线 ---------- */
const cardOf = (id) => (PROJ ? PROJ.cards : []).find(x => x.id === id) || null;

/** 一根产物线实际占用的素材格。新线会把完整列表存进 edge.slots；老项目只有
    edge.slot，就按上游当前产物数量补算一次，保证升级后第一次断线也能清干净。 */
function mediaSlotsForOutputs(to, baseSlot, outputs, freeOnly = true) {
  if (!baseSlot || !outputs || outputs.length <= 1) return baseSlot ? [baseSlot] : [];
  const match = /^(\w+)\[(\d+)\]$/.exec(baseSlot);
  const cap = to && capOf(to);
  if (!match || !cap) return [baseSlot];
  const slotType = match[1], start = +match[2], kind = outputs[0] && outputs[0].kind;
  const slots = (cap.inputs || [])
    .filter(s => {
      const sm = new RegExp(`^${slotType}\\[(\\d+)\\]$`).exec(s.key);
      return sm && +sm[1] >= start && (!kind || s.type === kind)
        && (!freeOnly || !(to.assets || {})[s.key]);
    })
    .sort((a, b) => parseInt(/\[(\d+)\]/.exec(a.key)[1], 10)
      - parseInt(/\[(\d+)\]/.exec(b.key)[1], 10))
    .slice(0, outputs.length)
    .map(s => s.key);
  return slots.length ? slots : [baseSlot];
}

function edgeSlots(e) {
  if (!e || isTextEdge(e)) return [];
  if (Array.isArray(e.slots)) return [...new Set(e.slots.filter(Boolean))];
  const from = cardOf(e.from), to = cardOf(e.to);
  const current = (from && from.outputs) || [];
  const previous = (from && from.history && from.history[0] && from.history[0].outputs) || [];
  return mediaSlotsForOutputs(to, e.slot, current.length ? current : previous, false);
}

/** 删除产物线时同步删掉它写进下游的素材引用。这里只动线拥有的格，手动上传的
    其他格、别的连线，以及节点自己的提示词都不受影响。 */
function clearEdgeAssets(e) {
  const to = cardOf(e && e.to);
  if (!to || !to.assets) return false;
  let changed = false;
  for (const key of edgeSlots(e)) {
    if (!(key in to.assets)) continue;
    delete to.assets[key];
    changed = true;
  }
  if (changed) paintKind(to);
  return changed;
}

function removeEdges(edges, clearAssets = true) {
  const gone = new Set(edges || []);
  if (!gone.size) return false;
  if (clearAssets) for (const e of gone) clearEdgeAssets(e);
  PROJ.edges = PROJ.edges.filter(e => !gone.has(e));
  return true;
}

/** 用户手动换掉某一格时，只解除这格与上游的绑定；一根多产物线还占着其他格时保留。 */
function detachSlotEdges(cardId, slot) {
  const gone = [];
  let changed = false;
  for (const e of PROJ.edges) {
    if (e.to !== cardId || isTextEdge(e)) continue;
    const slots = edgeSlots(e);
    if (!slots.includes(slot)) continue;
    const keep = slots.filter(key => key !== slot);
    changed = true;
    if (!keep.length) gone.push(e);
    else {
      e.slots = keep;
      if (e.slot === slot) e.slot = keep[0];
    }
  }
  removeEdges(gone, false);
  return changed;
}

function cardBox(id) {
  const c = cardOf(id);
  if (!c) return null;
  const h = c._el ? c._el.offsetHeight : 230;
  return { x: c.x, y: c.y, w: cardW(c), h };
}

/** 选中的连线。存的是 PROJ.edges 里那条对象本身（不是下标）——
    删节点、换路由都会重排数组，下标会指到别人身上去。 */
let selEdge = null;

/** 风格顺着这根产物线往下传吗（见 styleCards）。风格继承**没有自己的连线**，
    它借的就是这根产物线；不画在线上这件事就是隐形的。 */
function carriesStyle(e) {
  if (isTextEdge(e)) return false;
  const a = cardOf(e.from), b = cardOf(e.to);
  return !!(a && b && !isTextCard(a) && styleCards(a).length && !ownStyles(b).length);
}

function edgeWord(e) {
  const a = cardOf(e.from), b = cardOf(e.to);
  const nm = (c) => c ? titleOf(c) : "?";
  return isTextEdge(e)
    ? (e.slot === TEXT_SLOT ? `文本：${nm(a)} → ${nm(b)}` : `风格：${nm(a)} → ${nm(b)}`)
    : `${nm(a)} → ${nm(b)}`;
}

function drawWires() {
  el.wires.innerHTML = "";
  for (const e of PROJ.edges) {
    const a = cardBox(e.from), b = cardBox(e.to);
    if (!a || !b) continue;
    const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2;
    const dx = Math.max(50, Math.abs(x2 - x1) * 0.5);
    const d = `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
    const mk = (cls) => {
      const p = document.createElementNS(SVGNS, "path");
      if (cls) p.setAttribute("class", cls);
      p.setAttribute("d", d);
      el.wires.appendChild(p);
      return p;
    };
    // 底下垫一根透明的粗线专管接鼠标：真正那根只有 1.3~1.6px，画布缩小后点不中
    const hit = mk("hit");
    const tt = document.createElementNS(SVGNS, "title");
    tt.textContent = edgeWord(e) + (carriesStyle(e) ? "（风格也顺着这根线往下传）" : "")
      + "　点一下选中，Delete 删除";
    hit.appendChild(tt);
    hit.addEventListener("mousedown", (ev) => { ev.stopPropagation(); pickEdge(e); });
    hit.addEventListener("contextmenu", (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      pickEdge(e); edgeMenu(ev.clientX, ev.clientY, e);
    });
    // 风格线画成虚线：它传的是文字不是产物，跟"上一张的图接给下一张"是两件事，
    // 画成同一根实线会让人以为风格节点也出图
    mk([isTextEdge(e) ? "txt" : "", e === selEdge ? "sel" : ""].filter(Boolean).join(" "));
    // 再叠一层紫虚线 = 这根产物线上还捎着风格
    if (carriesStyle(e)) mk("carry");
  }
  paintSel();               // 框选的虚线框和顶部工具条跟着节点位置走
  paintGroups();            // 分组框也一样（拖动时每帧重算）
}

/* ---------- 框选 / 分组 ---------- */
/** 一个节点在世界坐标里的矩形（高度量 DOM，宫格那种自动高度才准） */
function cardRect(c) {
  return { x: c.x, y: c.y, w: cardW(c), h: c._el ? c._el.offsetHeight : 230 };
}

/** 找一块空地放新节点（世界坐标）。底部工具条建节点不给用户挑位置，所以从**视野正中**
    开始找：正中空着就放正中，占了就绕着中心一圈圈往外找最近的空位。
    不从左上角扫 —— 那样节点会落在视野边角上，建完还得去找它。 */
function blankSpot(w = CW, h = 230) {
  const r = el.stage.getBoundingClientRect();
  const mid = toWorld((r.left + r.right) / 2, (r.top + r.bottom) / 2);
  const cx = mid.x - w / 2, cy = mid.y - h / 2;     // 节点的左上角，让节点中心对准视野中心
  const gap = 24;
  const rects = (PROJ ? PROJ.cards : []).map(cardRect);
  const free = (x, y) => !rects.some(q =>
    x < q.x + q.w + gap && x + w + gap > q.x && y < q.y + q.h + gap && y + h + gap > q.y);
  if (free(cx, cy)) return { x: Math.round(cx), y: Math.round(cy) };
  // 绕着中心一圈圈往外：每圈在 8 个方向上试，先近后远，落点始终离视野中心最近
  const step = 64;
  for (let ring = 1; ring <= 24; ring++) {
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const x = cx + dx * ring * step, y = cy + dy * ring * step;
      if (free(x, y)) return { x: Math.round(x), y: Math.round(y) };
    }
  }
  return { x: Math.round(cx), y: Math.round(cy) };   // 实在没地方就叠在正中，用户自己拖开
}

/** 一堆节点的包围盒（世界坐标） */
function bboxOf(ids) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const id of ids) {
    const c = cardOf(id);
    if (!c) continue;
    const r = cardRect(c);
    x1 = Math.min(x1, r.x); y1 = Math.min(y1, r.y);
    x2 = Math.max(x2, r.x + r.w); y2 = Math.max(y2, r.y + r.h);
  }
  return x1 === Infinity ? null : { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** 框选状态：选中节点外圈的青色虚线框 + 上方的小工具条（≥2 张才有工具条）。 */
function paintSel() {
  if (!el.groups) return;
  let box = el.groups.querySelector(".selbox");
  if (!selIds.size) {
    if (box) box.remove();
    el.selbar.style.display = "none";
    return;
  }
  const b = bboxOf(selIds);
  if (!b) { selIds.clear(); return paintSel(); }
  if (!box) {
    box = document.createElement("div");
    box.className = "selbox";
    el.groups.appendChild(box);
  }
  box.style.left = b.x - 8 + "px"; box.style.top = b.y - 8 + "px";
  box.style.width = b.w + 16 + "px"; box.style.height = b.h + 16 + "px";
  if (selIds.size < 2) { el.selbar.style.display = "none"; return; }
  // 工具条摆在包围盒上方（stage 内坐标，跟 #selbar 的定位一致），出界就夹回来
  el.selbar.style.display = "";
  const r = el.stage.getBoundingClientRect();
  const sx = view.x + b.x * view.k, sy = view.y + b.y * view.k;
  el.selbar.style.left = Math.max(4, Math.min(sx, r.width - el.selbar.offsetWidth - 4)) + "px";
  el.selbar.style.top = Math.max(50, sy - el.selbar.offsetHeight - 10) + "px";
}

/** 分组框：打过的组在节点底下画一圈虚线框 + 左上角组名。
    拖框 = 整组一起动；双击组名改名；右键框 = 重命名 / 删组（节点保留）。 */
function paintGroups() {
  if (!el.groups) return;
  el.groups.querySelectorAll(".ggroup").forEach(g => g.remove());
  if (!PROJ) return;
  for (const g of PROJ.groups || []) {
    const b = bboxOf(g.cards);
    if (!b) continue;
    const PAD = 12, TOP = 28;
    const d = document.createElement("div"); d.className = "ggroup";
    d.style.left = b.x - PAD + "px"; d.style.top = b.y - TOP + "px";
    d.style.width = b.w + PAD * 2 + "px"; d.style.height = b.h + PAD + TOP + "px";
    const lb = document.createElement("div"); lb.className = "gglabel";
    lb.textContent = `${g.name}（${g.cards.length}）`;
    d.appendChild(lb);
    d.onmousedown = (ev) => {
      if (ev.button !== 0) return;
      ev.stopPropagation(); ev.preventDefault();
      // 点分组框 = 选中这组（出虚线框和工具条），再拖着走就是整组一起动
      selIds = new Set(g.cards);
      paintSel();
      beginCardsMove(ev, [...g.cards].map(cardOf).filter(Boolean));
    };
    lb.ondblclick = (ev) => { ev.stopPropagation(); renameGroup(g); };
    d.oncontextmenu = (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      showMenu(ev.clientX, ev.clientY, g.name, [
        { icon: "✎", text: "重命名", run: () => renameGroup(g) },
        { icon: "✕", text: "删除组（节点保留）", danger: true, run: () => {
            PROJ.groups = PROJ.groups.filter(x => x !== g);
            paintGroups(); save();
          } },
      ]);
    };
    el.groups.appendChild(d);
  }
}

function renameGroup(g) {
  const n = prompt("组名", g.name);
  if (n === null) return;
  g.name = n.trim().slice(0, 30) || g.name;
  paintGroups(); save();
}

/** 按住一起拖动几个节点：单节点拖动、框选多张后拖、拖分组框，全走这里。 */
function beginCardsMove(ev, cards) {
  if (ev.button !== 0 || !cards.length) return;
  ev.stopPropagation(); ev.preventDefault();
  tipHide();
  const s = { mx: ev.clientX, my: ev.clientY, pos: cards.map(c => ({ c, x: c.x, y: c.y })) };
  let moved = false;
  const mv = (e) => {
    // 4px 阈值：手抖一下不算拖，也就不会白闪一次面板
    if (!moved && Math.abs(e.clientX - s.mx) + Math.abs(e.clientY - s.my) < 4) return;
    if (!moved) { moved = true; }
    const dx = (e.clientX - s.mx) / view.k, dy = (e.clientY - s.my) / view.k;
    for (const p of s.pos) {
      p.c.x = Math.round(p.x + dx); p.c.y = Math.round(p.y + dy);
      if (p.c._el) { p.c._el.style.left = p.c.x + "px"; p.c._el.style.top = p.c.y + "px"; }
    }
    drawWires();
    // 拖动过程中实时更新参数面板位置，让它一直吸附在卡片下方
    placePanel();
  };
  const up = () => {
    document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up);
    if (moved) { placePanel(); save(); }
  };
  document.addEventListener("mousemove", mv); document.addEventListener("mouseup", up);
}

/** Delete 删掉框选的一堆节点（会问一句 —— 没有撤销）。 */
function askDelMany() {
  const cards = [...selIds].map(cardOf).filter(Boolean);
  if (!cards.length) return;
  const n = cards.filter(c => (c.history || []).length || (c.outputs || []).length).length;
  if (!confirm(`删除选中的 ${cards.length} 个节点？`
      + (n ? `其中 ${n} 张有生成记录，删了找不回来（产物文件还在 ComfyUI 输出目录）。` : ""))) return;
  for (const c of cards) delCard(c.id);
  selIds.clear(); paintSel();
  toast(`已删除 ${cards.length} 个节点`);
}

function pickEdge(e) {
  selEdge = e; selId = null;
  closeMenu(); tipHide(); closePanel();
  for (const c of PROJ.cards) if (c._el) c._el.classList.remove("sel");
  drawWires();
  toast(edgeWord(e) + " · Delete 删除");
}

function edgeMenu(cx, cy, e) {
  const a = cardOf(e.from), b = cardOf(e.to);
  showMenu(cx, cy, edgeWord(e), [
    ...(a ? [{ icon: "◧", text: `选中上游「${titleOf(a)}」`, run: () => pick(a.id) }] : []),
    ...(b ? [{ icon: "◨", text: `选中下游「${titleOf(b)}」`, run: () => pick(b.id) }] : []),
    { icon: "✕", text: e.slot === TEXT_SLOT ? "断开这段文本" : isTextEdge(e) ? "解除这个风格节点" : "删除连线",
      danger: true, run: () => delEdge(e) },
  ]);
}

/** 删一根线。文本/风格引用是实时从 edges 读取的；产物线还要把它写进下游
    assets 的一格或多格一起删掉，否则画面上虽然断线，运行时仍会继续引用旧产物。 */
function delEdge(e) {
  const cleared = !isTextEdge(e) && clearEdgeAssets(e);
  removeEdges([e], false);
  if (selEdge === e) selEdge = null;
  drawWires(); paintStyles();
  if (selId) openPanel(selId);
  save();
  toast(e.slot === TEXT_SLOT ? "已断开这段文本输入"
    : isTextEdge(e) ? "已解除风格"
    : cleared ? "已删除连线，并清除下游引用"
    : "已删除连线");
}

/* ================= 交互：拖节点 / 平移 / 缩放 / 连线 ================= */
function pick(id) {
  selId = id;
  selIds.clear(); paintSel();                          // 点单个节点 = 放弃框选
  if (selEdge) { selEdge = null; drawWires(); }      // 选中的线和选中的节点只留一个
  for (const c of PROJ.cards) if (c._el) c._el.classList.toggle("sel", c.id === id);
  openHistory(id);      // 先开栏子再摆面板：面板要按变窄之后的画布找位置
  openPanel(id);
}

function startDrag(ev, c, d) {
  if (ev.button !== 0) return;
  // 谁跟着这个节点一起动：先看框选（拖选中里的一张 = 整个选择动），
  // 没框选就看分组（组里的节点拖一张 = 整组动；同时在几个组里就全跟着），
  // 都没有才单张
  let ids = (selIds.size > 1 && selIds.has(c.id)) ? [...selIds] : null;
  if (!ids) {
    const union = new Set();
    for (const g of (PROJ.groups || [])) {
      if (g.cards.includes(c.id)) g.cards.forEach(x => union.add(x));
    }
    if (union.size > 1) ids = [...union];
  }
  pick(c.id);
  beginCardsMove(ev, ids ? ids.map(cardOf).filter(Boolean) : [c]);
}

/** 拖角改大小。dir=1 是右下角（左上角钉住），dir=-1 是左上角（右下角钉住，
 *  所以位置要跟着一起变）。按住 Shift 只改宽 —— 宫格的排布只看宽度，调宫格节点时
 *  往往不想顺手把画面区高度也动了。 */
function startResize(ev, c, d, dir) {
  if (ev.button !== 0) return;
  ev.stopPropagation(); ev.preventDefault();
  tipHide(); pick(c.id);
  const body = d.querySelector(".body");
  const s = { mx: ev.clientX, my: ev.clientY, x: c.x, y: c.y,
              w: cardW(c), h: c.h || body.offsetHeight, ch: d.offsetHeight };
  const fit = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));
  let moved = false;
  const mv = (e) => {
    if (!moved && Math.abs(e.clientX - s.mx) + Math.abs(e.clientY - s.my) < 3) return;
    if (!moved) { moved = true; }
    c.w = fit(s.w + (e.clientX - s.mx) / view.k * dir, CW_MIN, CW_MAX);
    if (!e.shiftKey) c.h = fit(s.h + (e.clientY - s.my) / view.k * dir, CH_MIN, CH_MAX);
    applySize(c);
    if (dir < 0) {
      // 右下角钉住：位置补偿要用「真的量出来」的高度。宫格节点的画面区是自动高度，
      // c.h 根本没生效，照 c.h 算会让节点凭空往上跳一截
      c.x = s.x + (s.w - c.w);
      c.y = s.y + (s.ch - d.offsetHeight);
      d.style.left = c.x + "px"; d.style.top = c.y + "px";
    }
    drawWires();
    // 改变卡片大小时也实时更新参数面板位置
    placePanel();
  };
  const up = () => {
    document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up);
    if (moved) { placePanel(); save(); }
  };
  document.addEventListener("mousemove", mv); document.addEventListener("mouseup", up);
}

function startWire(ev, c) {
  ev.stopPropagation(); ev.preventDefault();
  tipHide();
  const a = cardBox(c.id);
  const p = document.createElementNS(SVGNS, "path");
  p.setAttribute("class", "tmp");
  el.wires.appendChild(p);
  const x1 = a.x + a.w, y1 = a.y + a.h / 2;
  // 拉线期间把所有收得下的入口点亮，不用一张张试哪张接得上
  el.world.classList.add("wiring");
  let last = null;
  const mv = (e) => {
    const w = toWorld(e.clientX, e.clientY);
    last = w;
    const dx = Math.max(50, Math.abs(w.x - x1) * 0.5);
    p.setAttribute("d", `M${x1},${y1} C${x1 + dx},${y1} ${w.x - dx},${w.y} ${w.x},${w.y}`);
  };
  const up = (e) => {
    document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up);
    p.remove();
    el.world.classList.remove("wiring");
    const tc = e.target.closest && e.target.closest(".card");
    if (tc && tc.dataset.id !== c.id) linkTo(c, PROJ.cards.find(x => x.id === tc.dataset.id));
    else if (last) spawnDownstream(c, last, e.clientX, e.clientY);
  };
  document.addEventListener("mousemove", mv); document.addEventListener("mouseup", up);
}

function bindGlobal() {
  $("#toggle").onclick = () => document.body.classList.toggle("collapsed");
  $("#newproj").onclick = newProject;
  $("#createHere").onclick = newProject;
  // 底部工具条：新建节点的唯一入口。上传直接建素材节点，图片/视频/工具箱摊开各自节点里的玩法
  buildDock();
  el.fit.onclick = () => { view = { x: 60, y: 70, k: 1 }; applyView(); placePanel(); save(); };
  el.jobsbtn.onclick = toggleJobs;
  // 框选后上方工具条里的「打组」：把选中的节点圈成一个组（虚线框，整体拖动）
  el.selbar.innerHTML = "";
  const gb = document.createElement("button");
  gb.className = "mkgroup"; gb.textContent = "▦ 打组";
  gb.title = "把选中的节点圈成一个组：拖分组框整体移动；双击组名改名，右键框删组（节点保留）";
  gb.onclick = () => {
    if (selIds.size < 2) return;
    PROJ.groups = PROJ.groups || [];
    const same = PROJ.groups.find(g => g.cards.length === selIds.size
      && g.cards.every(x => selIds.has(x)));
    if (same) return toast("这几张已经是同一组了");
    PROJ.groups.push({ id: uid(), name: `组 ${PROJ.groups.length + 1}`, cards: [...selIds] });
    // 选中状态保留：外圈虚线框和这条工具条都还在，接着拖就是整组一起动
    paintSel(); paintGroups(); save();
    toast("已打组：拖组里的节点或分组框 = 整组一起动；双击组名改名，右键框删组");
  };
  el.selbar.appendChild(gb);
  // 双保险：工具条按下的那一漏到画布去（画布会把它当框选起点）
  el.selbar.onmousedown = (ev) => ev.stopPropagation();
  addEventListener("resize", () => { placePanel(); placeJobs(); paintSel(); });

  // Ctrl+V 粘在鼠标那儿，所以一直记着鼠标落在世界坐标的哪个位置
  el.stage.addEventListener("mousemove", (ev) => { mouseW = toWorld(ev.clientX, ev.clientY); });
  el.stage.addEventListener("mouseleave", () => { mouseW = null; });

  el.stage.addEventListener("mousedown", (ev) => {
    // 工具条自己管自己（打组这些按钮）：冒泡到画布会被当成"点空白"把选中清掉，
    // 按钮执行时手里就没节点了 —— 这就是打组点了没反应的原因
    // 参数面板也同理：点面板上的按钮不能关掉面板
    if (ev.target.closest("#selbar") || ev.target.closest("#panel")) return;
    // 中键 = 拖画布（在哪儿按都行，节点上按中键也放过来了）
    if (ev.button === 1) {
      ev.preventDefault();          // 掐掉浏览器中键的自动滚动
      const s = { mx: ev.clientX, my: ev.clientY, x: view.x, y: view.y };
      el.stage.classList.add("panning");
      let moved = false;
      const mv = (e) => {
        // 一动就把参数面板藏掉（跟拖节点同一套）：不然面板浮在原地挡住挪过来的节点
        if (!moved) { moved = true; veilPanel(true); }
        view.x = s.x + e.clientX - s.mx; view.y = s.y + e.clientY - s.my; applyView();
      };
      const up = () => {
        el.stage.classList.remove("panning");
        document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up);
        // 拖动画布结束后恢复面板显示，并重新定位到节点下方
        if (moved) { veilPanel(false); placePanel(); }
        save();
      };
      document.addEventListener("mousemove", mv); document.addEventListener("mouseup", up);
      return;
    }
    if (ev.button !== 0) return;
    // 左键点空白：清掉选中；按住拖出去一个框 = 框选节点
    closeMenu(); closeJobs();
    selId = null; closePanel();
    if (selEdge) { selEdge = null; drawWires(); }
    for (const c of (PROJ ? PROJ.cards : [])) if (c._el) c._el.classList.remove("sel");
    selIds.clear(); paintSel();
    const s = { mx: ev.clientX, my: ev.clientY };
    let moved = false;
    const mv = (e) => {
      if (!moved && Math.abs(e.clientX - s.mx) + Math.abs(e.clientY - s.my) < 4) return;
      moved = true;
      const x1 = Math.min(s.mx, e.clientX), y1 = Math.min(s.my, e.clientY);
      const x2 = Math.max(s.mx, e.clientX), y2 = Math.max(s.my, e.clientY);
      const r = el.stage.getBoundingClientRect();
      el.lasso.style.display = "";
      el.lasso.style.left = x1 - r.left + "px"; el.lasso.style.top = y1 - r.top + "px";
      el.lasso.style.width = x2 - x1 + "px"; el.lasso.style.height = y2 - y1 + "px";
      const a = toWorld(x1, y1), b = toWorld(x2, y2);
      selIds.clear();
      if (PROJ) for (const c of PROJ.cards) {
        const rc = cardRect(c);
        if (rc.x < b.x && rc.x + rc.w > a.x && rc.y < b.y && rc.y + rc.h > a.y) selIds.add(c.id);
      }
      paintSel();
    };
    const up = () => {
      document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up);
      el.lasso.style.display = "none";
      if (!moved) return;                    // 纯点了一下：上面已经清过选中了
      if (selIds.size === 1) {               // 只圈到一张就当普通选中（开面板那种）
        const id = [...selIds][0];
        selIds.clear();
        pick(id);
      } else {
        paintSel();
        if (selIds.size) toast(`选中 ${selIds.size} 个节点：拖动整体移动 · Delete 全删 · 上方按钮打组`);
      }
    };
    document.addEventListener("mousemove", mv); document.addEventListener("mouseup", up);
  });

  el.stage.addEventListener("wheel", (ev) => {
    if (!PROJ) return;
    ev.preventDefault();
    const w = toWorld(ev.clientX, ev.clientY);
    const k = Math.min(2, Math.max(0.25, view.k * (ev.deltaY < 0 ? 1.1 : 1 / 1.1)));
    const r = el.stage.getBoundingClientRect();
    view.x = ev.clientX - r.left - w.x * k;
    view.y = ev.clientY - r.top - w.y * k;
    view.k = k;
    applyView(); save();
  }, { passive: false });

  // 空白处右键：新建节点、上传、粘贴
  el.stage.addEventListener("contextmenu", (ev) => {
    ev.preventDefault();
    if (!PROJ || ev.target.closest(".card")) return;
    tipHide();
    const at = toWorld(ev.clientX, ev.clientY);
    const menu = [];

    // 新建生成节点（包括文本节点）
    menu.push({ group: "生成节点" });

    // 文本节点
    const textCard = CARDS.find(d => d.kind === "text");
    if (textCard) {
      menu.push({
        icon: textCard.icon || "✍",
        text: "文本",
        run: () => {
          addCard(textCard.id, at.x, at.y, textCard.modes[0] ? modeCap(textCard.modes[0]) : null);
        }
      });
    }

    // 其他生成节点
    const genCards = CARDS.filter(d => d.kind === "gen");
    genCards.forEach(d => {
      let name = d.name;
      if (name === "生图") name = "图片";
      else if (name === "生视频") name = "视频";

      menu.push({
        icon: d.icon || "◻",
        text: name,
        run: () => {
          addCard(d.id, at.x, at.y, d.modes[0] ? modeCap(d.modes[0]) : null);
        }
      });
    });

    // 新建工具节点 - 展开显示每个模式
    const toolCards = CARDS.filter(d => d.kind === "tool");
    if (toolCards.length > 0) {
      menu.push({ group: "工具" });
      toolCards.forEach(def => {
        def.modes.forEach(md => {
          menu.push({
            icon: def.icon || "◻",
            text: md.name,
            run: () => {
              addCard(def.id, at.x, at.y, modeCap(md));
            }
          });
        });
      });
    }

    // 上传素材
    menu.push({ group: "其他" });
    menu.push({
      icon: "📎",
      text: "上传素材",
      run: () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*,video/*,audio/*";
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const fd = new FormData();
          fd.append("file", file, file.name);
          try {
            const r = await fetch("/api/upload", { method: "POST", body: fd });
            if (!r.ok) throw new Error(await r.text());
            const asset = await r.json();
            const assetCard = CARDS.find(d => d.kind === "asset");
            if (!assetCard) return toast("找不到素材节点定义");
            const c = addCard(assetCard.id, at.x, at.y, assetCard.modes[0].id);
            c.outputs = [asset];
            paintCard(c);
            save();
            toast("已上传：" + asset.filename);
          } catch (err) {
            toast("上传失败：" + err.message);
          }
        };
        input.click();
      }
    });

    // 粘贴复制的节点
    if (CLIP) {
      menu.push({
        icon: "⧉",
        text: "粘贴刚复制的节点（Ctrl+V）",
        run: () => {
          mouseW = at;
          pasteCard();
        }
      });
    }

    if (menu.length > 0) {
      showMenu(ev.clientX, ev.clientY, "画布", menu);
    }
  });

  // 拖拽文件到画布 → 自动上传并建素材节点（落在鼠标位置）
  el.stage.addEventListener("dragover", (ev) => {
    if (!PROJ) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "copy";
  });
  el.stage.addEventListener("drop", async (ev) => {
    if (!PROJ) return;
    ev.preventDefault();
    const files = [...(ev.dataTransfer?.files || [])];
    if (!files.length) return;
    // 只处理图片/视频/音频，其他类型忽略
    const valid = files.filter(f => f.type.startsWith("image/") || f.type.startsWith("video/") || f.type.startsWith("audio/"));
    if (!valid.length) return toast("只支持图片、视频、音频文件");
    const at = toWorld(ev.clientX, ev.clientY);
    for (const f of valid) {
      const fd = new FormData(); fd.append("file", f, f.name);
      try {
        const r = await api("/api/upload", { method: "POST", body: fd });
        const item = r.files[0];
        const p = { x: Math.round(at.x - 134), y: Math.round(at.y - 84) };   // 节点中心对齐鼠标位置
        const c = addCard("card_asset", p.x, p.y);
        if (!c) continue;
        await setAssetItem(c, item);
        toast(`已建素材节点：${item.origin || f.name}`);
        at.x += 50; at.y += 50;   // 多个文件时错开位置
      } catch (e) {
        toast(`上传失败 ${f.name}：${e.message}`);
      }
    }
  });

  // 点大图外面的黑底关掉；点到图/视频本身不关，否则想拉进度条一松手窗就没了
  el.view.addEventListener("mousedown", (ev) => {
    if (ev.target === el.view) closeViewer();
  });

  // ⚙ 参数弹窗：点弹窗外面关掉（点到弹窗自己不关）
  addEventListener("mousedown", (ev) => {
    if (el.respop.style.display === "none") return;
    if (!el.respop.contains(ev.target)) closeResPop();
  }, true);

  // 胶囊菜单（模型/加工方式/生图模式）同理：点菜单外面关掉。
  // 点在打开它的那颗胶囊按钮上不关 —— 那颗的 onclick 会自动重开菜单，关掉反而闪一下。
  addEventListener("mousedown", (ev) => {
    if (el.menu.style.display === "none") return;
    if (!el.menu.contains(ev.target) && !ev.target.closest(".tcap")) closeMenu();
  }, true);

  document.addEventListener("keydown", (ev) => {
    // 大图开着时左右键翻同一个节点的下一个产物（分镜九宫格）
    if (el.view.style.display !== "none" && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) {
      ev.preventDefault(); stepViewer(ev.key === "ArrowRight" ? 1 : -1); return;
    }
    // 画布快捷键：正在框里打字时一概不管（Ctrl+C 得留给复制文字，Delete 得留给删字）
    const t = ev.target, tag = (t.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select" || t.isContentEditable;
    if (PROJ && !typing && el.view.style.display === "none") {
      const c = cardOf(selId);
      if (ev.key === "Delete" || ev.key === "Backspace") {
        // 线优先：选中线的那一刻节点选中就被清了，两个不会同时亮
        if (selEdge) { ev.preventDefault(); delEdge(selEdge); return; }
        // 框选了一堆：全删（会问一句）
        if (selIds.size > 1) { ev.preventDefault(); askDelMany(); return; }
        if (c) { ev.preventDefault(); askDelCard(c); return; }
      }
      if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && !ev.altKey) {
        const k = ev.key.toLowerCase();
        if (k === "c" && c) { ev.preventDefault(); copyCard(c); return; }
        if (k === "v") { ev.preventDefault(); pasteCard(); return; }
      }
      // H键：将选中的节点定位到屏幕中上方
      if (ev.key.toLowerCase() === "h" && c && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey && !ev.altKey) {
        ev.preventDefault();
        // 将节点移动到屏幕中上方（上方1/3处）
        const stageRect = el.stage.getBoundingClientRect();
        const targetScreenY = stageRect.top + stageRect.height * 0.3; // 屏幕上方30%处
        const targetScreenX = stageRect.left + stageRect.width * 0.5;  // 屏幕中央

        // 节点中心点在世界坐标中的位置
        const cardCenterX = c.x + (c._el ? c._el.offsetWidth / 2 : CW / 2);
        const cardCenterY = c.y + (c._el ? c._el.offsetHeight / 2 : 168 / 2);

        // 计算需要的view偏移，让节点中心点显示在目标位置
        view.x = targetScreenX - cardCenterX * view.k;
        view.y = targetScreenY - cardCenterY * view.k;

        applyView(); placePanel(); save();
        return;
      }
    }
    if (ev.key !== "Escape") return;
    // ⚙ 参数弹窗开着时 Esc 先关它
    if (el.respop.style.display !== "none") { closeResPop(); return; }
    // 大图开着时 Esc 只关大图，不该顺手把节点选中状态和参数面板一起清掉
    if (el.view.style.display !== "none") { closeViewer(); return; }
    // 任务浮窗开着时 Esc 只关它，别顺手把选中的节点和参数面板一起清掉
    if (el.jobs.style.display !== "none") { closeJobs(); return; }
    closeMenu(); tipHide(); selId = null; closePanel();
    if (selEdge) { selEdge = null; drawWires(); }
    selIds.clear(); paintSel();                  // Esc 也收掉框选
    for (const c of (PROJ ? PROJ.cards : [])) if (c._el) c._el.classList.remove("sel");
  });

  // 画布工具条按钮事件
  el.minimapBtn.onclick = toggleMinimap;
  bindMinimapDrag();

  let wiresVisible = true;
  el.wiresToggle.onclick = () => {
    wiresVisible = !wiresVisible;
    el.wires.style.display = wiresVisible ? "" : "none";
    el.wiresToggle.classList.toggle("active", !wiresVisible);
    // 同时控制节点上的连接点显示/隐藏
    document.querySelectorAll(".card .inp, .card .out").forEach(dot => {
      dot.style.display = wiresVisible ? "" : "none";
    });
  };

  el.zoomMenu.onclick = (ev) => {
    const items = [
      { icon: "+", text: "放大 (125%)", run: () => { view.k = 1.25; applyView(); placePanel(); save(); } },
      { icon: "1:1", text: "重置 (100%)", run: () => { view.k = 1; applyView(); placePanel(); save(); } },
      { icon: "−", text: "缩小 (75%)", run: () => { view.k = 0.75; applyView(); placePanel(); save(); } },
      { icon: "−", text: "缩小 (50%)", run: () => { view.k = 0.5; applyView(); placePanel(); save(); } },
      { icon: "□", text: "适应画布", run: () => { view = { x: 60, y: 70, k: 1 }; applyView(); placePanel(); save(); } },
    ];
    showMenu(ev.clientX, ev.clientY - 200, "缩放", items);
  };
}

/* ================= 右键菜单 ================= */
/** items: [{icon, text, danger, run}]，{group:"…"} 是一行分类小标题 */
function showMenu(cx, cy, title, items) {
  el.menu.innerHTML = "";
  const hd = document.createElement("div"); hd.className = "hd";
  hd.textContent = title; el.menu.appendChild(hd);
  for (const it of items) {
    if (it.group) {
      const g = document.createElement("div"); g.className = "grp";
      g.textContent = it.group; el.menu.appendChild(g);
      continue;
    }
    const b = document.createElement("button");
    if (it.danger) b.className = "danger";
    const i = document.createElement("span"); i.textContent = it.icon || "▸";
    const t = document.createElement("span"); t.textContent = it.text;
    b.append(i, t);
    b.onclick = () => { closeMenu(); tipHide(); it.run(); };
    if (it.tip) hoverTip(b, it.tip);
    el.menu.appendChild(b);
  }
  el.menu.style.display = "";
  el.menu.style.left = Math.min(cx, innerWidth - el.menu.offsetWidth - 8) + "px";
  el.menu.style.top = Math.min(cy, innerHeight - el.menu.offsetHeight - 8) + "px";
}
const closeMenu = () => (el.menu.style.display = "none");

/** 面板底部工具条的胶囊按钮（文本节点的模型/加工方式、生图节点的模式都是它）：
    名字+▾，点开一个小菜单换。菜单往**上方**弹 —— 按钮都在面板最底一排，
    往下弹会盖住整排工具条（点完想再点旁边的就被菜单挡住了）。 */
function capBtn(label, title, items) {
  const b = document.createElement("button");
  b.className = "tcap";
  const s = document.createElement("span"); s.textContent = label;
  const i = document.createElement("i"); i.textContent = "▴";
  b.append(s, i);
  b.title = title + " —— 点击换";
  b.onclick = (ev) => {
    ev.stopPropagation();
    const r = b.getBoundingClientRect();
    showMenu(r.left, r.bottom + 4, title, items());
    const menu = el.menu;
    // 默认往下弹；会盖到屏幕底（也就盖住按钮自己那排）就翻到按钮上方
    if (r.bottom + menu.offsetHeight + 12 > innerHeight) {
      menu.style.top = Math.max(48, r.top - menu.offsetHeight - 8) + "px";
    }
  };
  return b;
}


/* ---------- 底部工具条（新建节点的唯一入口） ---------- */
/** 节点都建在视野正中（blankSpot），建完就在眼前，不用去找。
    文本/图片/视频点一下直接建，用该节点的第一个模式，玩法进参数面板左下角的胶囊换；
    工具箱例外 —— 它那几样（抠图/拼图/补帧/画质增强）互相不搭，
    默认给哪个都是错的，所以弹一份清单让用户挑。 */
function buildDock() {
  const mk = (icon, label, title, run) => {
    const b = document.createElement("button");
    b.className = "dockb";
    b.title = title;
    const i = document.createElement("span"); i.textContent = icon;
    const t = document.createElement("span"); t.textContent = label;
    b.append(i, t);
    b.onmousedown = (ev) => ev.stopPropagation();   // 别漏到画布的"点空白"上去
    b.onclick = (ev) => { ev.stopPropagation(); run(b); };
    return b;
  };
  const spawn = (tid) => () => {
    if (!PROJ) return;
    const p = blankSpot();
    addCard(tid, p.x, p.y);
  };
  // 工具箱：列出所有工具节点的每一样，选中才建节点。菜单往上弹（按钮贴着屏幕底沿）
  const tools = (b) => {
    if (!PROJ) return;
    const items = [];
    for (const def of CARDS.filter(d => d.kind === "tool" && d.modes.length)) {
      for (const md of def.modes) items.push({
        icon: def.icon, text: md.name,
        run: () => { const p = blankSpot(); addCard(def.id, p.x, p.y, modeCap(md)); },
      });
    }
    if (!items.length) return toast("没有可用的工具节点");
    const r = b.getBoundingClientRect();
    showMenu(r.left, r.top, "工具箱 · 选一样", items);
    el.menu.style.top = Math.max(48, r.top - el.menu.offsetHeight - 8) + "px";
  };
  const sep = () => { const s = document.createElement("div"); s.className = "sep"; return s; };
  el.dock.innerHTML = "";
  el.dock.append(
    mk("↥", "上传", "选一个图片/视频文件，放进一个素材节点 —— 再把它的出口拖到别的节点上就能反复用",
      addAssetCard),
    sep(),
    mk("T", "文本", "新建一个文本节点：存一段字，连到生成节点就并进提示词", spawn("card_text")),
    mk("▧", "图片", "新建一个生图节点（默认文生图，玩法在参数面板左下角换）", spawn("card_image")),
    mk("▷", "视频", "新建一个生视频节点（默认图生视频，玩法在参数面板左下角换）", spawn("card_video")),
    mk("◇", "工具箱", "抠图 / 拼图 / 补帧 / 画质增强 —— 点开选一样", tools),
  );
}

/* ================= 产物大图 / 详情 ================= */
const VIEW_WORD = { video: "放大播放", audio: "放大播放" };

// 大图正在看哪一组产物的第几张：{ outs, idx, seed }
// outs 显式传进来而不是每次读 c.outputs：历史产物栏里点的是过去某一轮，
// 那一组产物已经不是节点当前的 outputs 了
let VIEW = null;

function closeViewer() {
  el.vbox.innerHTML = "";          // 清空才会停掉正在播的视频
  el.view.style.display = "none";
  VIEW = null;
}

function openViewer(c, i = 0, outs = null, seed = undefined) {
  const list = outs || c.outputs || [];
  if (!list.length) { toast("这个节点还没有产物，先运行一次"); return; }
  VIEW = {
    outs: list, idx: Math.min(Math.max(i, 0), list.length - 1),
    seed: seed !== undefined ? seed : (c ? c.seed : null),
  };
  paintViewer();
  el.view.style.display = "";
}

// 一组产物里前后翻，左右方向键也走这里
function stepViewer(d) {
  if (!VIEW) return;
  const n = VIEW.outs.length;
  if (n < 2) return;
  VIEW.idx = (VIEW.idx + d + n) % n;
  paintViewer();
}

function paintViewer() {
  const { outs, idx, seed } = VIEW;
  const out = outs[idx];
  const info = document.createElement("div"); info.className = "vinfo";
  const bits = [out.filename];
  if (outs.length > 1) bits.unshift(`${idx + 1} / ${outs.length}`);
  if (seed != null) bits.push("seed " + seed);
  const put = () => (info.textContent = bits.join("　·　"));

  let m;
  if (out.kind === "video") {
    m = document.createElement("video");
    m.src = out.url; m.controls = m.autoplay = m.loop = true;
    m.onloadedmetadata = () => {
      bits.splice(bits.indexOf(out.filename) + 1, 0, `${m.videoWidth}×${m.videoHeight}`, fmtDur(m.duration));
      put();
    };
  } else if (out.kind === "audio") {
    m = document.createElement("audio");
    m.src = out.url; m.controls = m.autoplay = true;
    m.onloadedmetadata = () => { bits.splice(bits.indexOf(out.filename) + 1, 0, fmtDur(m.duration)); put(); };
  } else {
    m = document.createElement("img");
    m.src = out.url;
    m.onload = () => { bits.splice(bits.indexOf(out.filename) + 1, 0, `${m.naturalWidth}×${m.naturalHeight}`); put(); };
  }
  m.draggable = false;
  put();

  const x = document.createElement("button");
  x.className = "vx"; x.textContent = "✕"; x.title = "关闭 (Esc)";
  x.onclick = closeViewer;

  el.vbox.innerHTML = "";
  el.vbox.append(m, info, x);
  if (outs.length > 1) {
    for (const [cls, sym, d] of [["p", "‹", -1], ["n", "›", 1]]) {
      const b = document.createElement("button");
      b.className = "vnav " + cls; b.textContent = sym;
      b.title = d < 0 ? "上一张 (←)" : "下一张 (→)";
      b.onclick = () => stepViewer(d);
      el.vbox.appendChild(b);
    }
  }
}

// 秒 -> 0:07 / 1:23。视频详情里 7.04 秒这种读数没人看得懂
function fmtDur(s) {
  if (!isFinite(s)) return "时长未知";
  const t = Math.round(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

function cardMenu(cx, cy, c) {
  const cap = capOf(c);
  if (isStyle(c)) {
    const n = PROJ.edges.filter(e => e.from === c.id && isTextEdge(e)).length;
    return showMenu(cx, cy, c.name || "风格化提示词", [
      { icon: "✎", text: "重命名节点", run: () => renameCard(c) },
      { icon: "⧉", text: "就地复制一张", run: () => cloneCard(c) },
      { icon: "⎘", text: "复制，等下粘贴（Ctrl+C）", run: () => copyCard(c) },
      // 挂错节点了想全撤掉，比一根根找线点开销小
      ...(n ? [{ icon: "⊘", text: `解除挂着的 ${n} 个节点`, run: () => {
        PROJ.edges = PROJ.edges.filter(e => !(e.from === c.id && isTextEdge(e)));
        drawWires(); paintStyles(); if (selId) openPanel(selId); save();
      } }] : []),
      ...(c.w || c.h ? [{ icon: "⤡", text: "恢复默认大小", run: () => resetSize(c) }] : []),
      { icon: "✕", text: "删除节点（Delete）", danger: true, run: () => delCard(c.id) },
    ]);
  }
  if (isText(c)) {
    return showMenu(cx, cy, c.name || titleOf(c), [
      ...(textOp(c) ? [{ icon: "↑", text: "运行（加工文本）", run: () => run(c) }] : []),
      { icon: "✎", text: "重命名节点", run: () => renameCard(c) },
      { icon: "⧉", text: "就地复制一张", run: () => cloneCard(c) },
      { icon: "⎘", text: "复制，等下粘贴（Ctrl+C）", run: () => copyCard(c) },
      ...(c.w || c.h ? [{ icon: "⤡", text: "恢复默认大小", run: () => resetSize(c) }] : []),
      { icon: "✕", text: "删除节点（Delete）", danger: true, run: () => delCard(c.id) },
    ]);
  }
  if (isAsset(c)) {
    const a = assetOf(c);
    return showMenu(cx, cy, c.name || titleOf(c), [
      ...(a ? [{ icon: "⛶", text: VIEW_WORD[a.kind] || "查看大图", run: () => openAsset(a) }] : []),
      ...(a ? [{ icon: "⬇", text: `下载${KIND_ZH[a.kind] || "文件"}`, run: () => downloadOut(a) }] : []),
      { icon: "📁", text: "选择 / 换文件", run: () => pickAsset(c) },
      ...(a ? [{ icon: "⌕", text: "定位文件", run: () => revealAsset(a) }] : []),
      { icon: "✎", text: "重命名节点", run: () => renameCard(c) },
      { icon: "⧉", text: "就地复制一张", run: () => cloneCard(c) },
      { icon: "⎘", text: "复制，等下粘贴（Ctrl+C）", run: () => copyCard(c) },
      ...(c.w || c.h ? [{ icon: "⤡", text: "恢复默认大小", run: () => resetSize(c) }] : []),
      { icon: "✕", text: "删除节点（Delete）", danger: true, run: () => delCard(c.id) },
    ]);
  }
  const outs = c.outputs || [];
  const out = outs[0];
  const vword = outs.length > 1 ? `逐张看大图（${outs.length} 张）` : (VIEW_WORD[out && out.kind] || "查看大图");
  const dlWord = outs.length > 1
    ? `下载全部 ${outs.length} 张${out.kind === "video" ? "视频" : out.kind === "audio" ? "音频" : "图片"}`
    : `下载${out.kind === "video" ? "视频" : out.kind === "audio" ? "音频" : "图片"}`;

  showMenu(cx, cy, c.name || (cap ? cap.name : "节点"), [
    ...(out ? [{ icon: "⛶", text: vword, run: () => openViewer(c) }] : []),
    ...(out ? [{ icon: "⬇", text: dlWord, run: () => outs.forEach(o => downloadOut(o)) }] : []),
    { icon: "✎", text: "重命名节点", run: () => renameCard(c) },
    { icon: "↑", text: "运行", run: () => run(c) },
    { icon: "⧉", text: "就地复制一张", run: () => cloneCard(c) },
    // Ctrl+C 是"拿在手上、想粘哪儿粘哪儿"，跟就地复制不是一件事，两条都留
    { icon: "⎘", text: "复制，等下粘贴（Ctrl+C）", run: () => copyCard(c) },
    // 拖角改过大小才给这条：没改过的节点摆一个点了没反应的菜单项只会让人以为坏了
    ...(c.w || c.h ? [{ icon: "⤡", text: "恢复默认大小", run: () => resetSize(c) }] : []),
    { icon: "✕", text: "删除节点（Delete）", danger: true, run: () => delCard(c.id) },
  ]);
}

/** 把一份产物下载到本地（浏览器下载）。跨源的同名问题不用管 —— 产物都走
    本服务的 /api/file，URL 就是自己的源。 */
function downloadOut(o) {
  const a = document.createElement("a");
  a.href = o.url;
  a.download = o.filename.split(/[\\/]/).pop() || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function resetSize(c) {
  delete c.w; delete c.h;      // 删掉而不是写回 268/168：默认值将来改了，老节点也跟着走
  applySize(c); drawWires(); placePanel(); save();
}

function renameCard(c) {
  const cap = capOf(c);
  const oldName = titleOf(c);
  const n = prompt("节点名字（留空恢复成工作流名）", c.name || (cap ? cap.name : ""));
  if (n === null) return;
  const newName = n.trim().slice(0, 40) || null;

  // 旧名改新名：遍历所有节点的提示词，把 @旧名 替换成 @新名
  if (oldName !== titleOf({ ...c, name: newName })) {
    const oldTag = `@${oldName}`;
    const newTag = newName ? `@${newName}` : `@${cap ? cap.name : ""}`;
    const re = new RegExp(`@${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\u4e00-\\u9fa5\\w])`, 'g');

    for (const card of PROJ.cards) {
      const pcap = capOf(card);
      if (!pcap) continue;
      const specs = promptSpecs(pcap);
      for (const s of specs) {
        const v = card.params[s.key];
        if (typeof v === 'string' && v.includes(oldTag)) {
          card.params[s.key] = v.replace(re, newTag);
        }
      }
      // 优化后的词也要替换
      if (card.opt) {
        for (const key in card.opt) {
          if (typeof card.opt[key] === 'string' && card.opt[key].includes(oldTag)) {
            card.opt[key] = card.opt[key].replace(re, newTag);
          }
        }
      }
    }
  }

  c.name = newName;
  paintTitle(c);
  // 重命名可能影响其他节点的面板显示（提示词里的 @标签文字变了），
  // 如果当前打开的面板里有引用这个节点，需要刷新
  if (selId) repanel(selId);
  save();
}

function cloneCard(c) {
  const n = addCard(c.type, c.x + 24, c.y + 28);
  const outputs = JSON.parse(JSON.stringify(c.outputs || []));
  Object.assign(n, {
    cap: c.cap, name: c.name, params: JSON.parse(JSON.stringify(c.params || {})),
    assets: JSON.parse(JSON.stringify(c.assets || {})), outputs,
    status: outputs.length ? "done" : null,
  });
  paintTitle(n); paint(n); openPanel(n.id); save();      // paint：风格节点的正文在画面区
}

function addCard(type, x, y, cap) {
  const def = cardDef(type);
  if (!def || !def.modes || !def.modes.length) {
    toast(`节点类型 ${type} 不可用：找不到定义或没有模式`);
    return null;
  }
  const c = { id: uid(), type, cap: cap || modeCap(def.modes[0]), x: Math.round(x), y: Math.round(y), params: {}, assets: {}, status: null, progress: 0, outputs: [] };

  // 自动分配序号名称
  const sameDef = PROJ.cards.filter(x => defOf(x) === def);
  const maxNum = sameDef.reduce((max, x) => {
    if (!x.name) return max;
    const m = x.name.match(/^(.+?)(\d+)$/);
    return m ? Math.max(max, parseInt(m[2], 10)) : max;
  }, 0);
  const baseLabel = def.name || def.modes[0].name;
  c.name = `${baseLabel}${maxNum + 1}`;

  PROJ.cards.push(c);
  el.world.appendChild(buildCard(c));
  pick(c.id); drawWires(); save();
  return c;
}

function delCard(id) {
  // 删上游节点等同于删掉它的所有出口线：下游里由这些线带入的引用也必须清掉。
  removeEdges(PROJ.edges.filter(e => e.from === id));
  PROJ.cards = PROJ.cards.filter(c => c.id !== id);
  PROJ.edges = PROJ.edges.filter(e => e.to !== id);
  // 组里少一张；空组直接散掉
  selIds.delete(id);
  if (PROJ.groups) {
    for (const g of PROJ.groups) g.cards = g.cards.filter(x => x !== id);
    PROJ.groups = PROJ.groups.filter(g => g.cards.length);
  }
  if (selId === id) { selId = null; closePanel(); }
  // 介绍浮层（悬停标题出的那段说明）和历史产物栏可能正开着这个节点：
  // 元素一删 mouseleave 永远不会来，不手动收掉就一直浮在那儿
  tipHide();
  if (el.hist._id === id) closeHistory();
  selEdge = null;                    // 连着它的线跟着没了，选中记号不能留成野指针
  render(); save();
}

/** Delete 键删节点。菜单里那条不问就删（点菜单是有意的），键盘容易手滑，
    所以**跑出过东西的节点**要问一句 —— 没有撤销，删掉那几轮的产物记录就找不回来了。 */
function askDelCard(c) {
  const n = (c.history || []).length;
  if ((c.outputs || []).length || n) {
    if (!confirm(`删除「${titleOf(c)}」？它有 ${n} 轮生成记录，删了找不回来。\n`
      + "（产物文件本身还在 ComfyUI 的输出目录里）")) return;
  }
  delCard(c.id);
  toast(`已删除「${titleOf(c)}」`);
}

/** Ctrl+C 存下的那个节点。只活在这一次打开里（不落盘）—— 它是"手上拿着的东西"，
    不是项目内容；跨项目粘贴也就顺带能用了。 */
let CLIP = null;
/** 鼠标最后停在画布世界坐标的哪儿：Ctrl+V 要粘在鼠标那儿，不然连粘 5 张会叠成一坨 */
let mouseW = null;
let pasteN = 0;

function copyCard(c) {
  CLIP = {
    type: c.type, cap: c.cap, name: c.name || null, w: c.w, h: c.h, x: c.x, y: c.y,
    params: JSON.parse(JSON.stringify(c.params || {})),
    assets: JSON.parse(JSON.stringify(c.assets || {})),
    outputs: JSON.parse(JSON.stringify(c.outputs || [])),
  };
  pasteN = 0;
  toast(`已复制「${titleOf(c)}」${CLIP.outputs.length ? "（包含当前产物）" : ""} · Ctrl+V 粘贴`);
}

function pasteCard() {
  if (!CLIP) return toast("还没复制东西：先点一个节点，Ctrl+C");
  // cardDef 找不到会落回第一个节点（生图），照它粘会粘出一张不相干的节点，所以这儿要精确查
  if (!CARDS.some(d => d.id === CLIP.type)) return toast("这种节点在当前版本里不存在了，粘不了");
  // 鼠标不在画布上（比如刚在侧边栏点完）就按老位置错开一点，连着粘也不会重叠
  const at = mouseW || { x: CLIP.x + 24 * ++pasteN, y: CLIP.y + 28 * pasteN };
  const n = addCard(CLIP.type, at.x - CW / 2, at.y - 40, CLIP.cap);
  const outputs = JSON.parse(JSON.stringify(CLIP.outputs || []));
  Object.assign(n, {
    name: CLIP.name,
    params: JSON.parse(JSON.stringify(CLIP.params)),
    assets: JSON.parse(JSON.stringify(CLIP.assets)),
    outputs,
    status: outputs.length ? "done" : null,
  });
  if (CLIP.w) n.w = CLIP.w;
  if (CLIP.h) n.h = CLIP.h;
  paintTitle(n); applySize(n); paint(n); paintKind(n); paintPort(n);
  openPanel(n.id); save();
  toast(`已粘贴「${titleOf(n)}」`);
}

/* ================= 连线传产物 ================= */
function mediaLimit(cap, kind) {
  if (!cap) return 0;
  const declared = cap.slotLimits && cap.slotLimits[kind] && cap.slotLimits[kind].max;
  return declared != null ? declared : cap.inputs.filter(s => s.type === kind).length;
}

function mediaCount(c, kind) {
  const cap = capOf(c);
  return cap ? cap.inputs.filter(s => s.type === kind && (c.assets || {})[s.key]).length : 0;
}

function firstFreeSlot(c, kind) {
  const cap = capOf(c); if (!cap) return null;
  return cap.inputs.find(s => s.type === kind && !c.assets[s.key]) || null;
}

/** 把一个文本节点接到别的节点上。不搬文件、不占素材槽 ——
    只记一条 @ 开头的连线：连生成节点就是提交那一刻并进提示词（payloadOf），
    连另一个文本节点就是运行那一刻当输入。所以改上游的字不用重连、也不用重跑下游。 */
function linkText(from, to) {
  if (from.id === to.id) return;
  if (isText(to)) {
    // 文本节点：@text 边，一张能收好几根（多个文本输入），同一根不重复接
    if (!textOf(from)) return toast(`「${titleOf(from)}」手里还没有字：先写一段，或先运行它`);
    if (PROJ.edges.some(e => e.from === from.id && e.to === to.id && e.slot === TEXT_SLOT)) {
      return toast("已经接过了");
    }
    PROJ.edges.push({ from: from.id, to: to.id, slot: TEXT_SLOT });
    drawWires(); paintStyles();
    if (selId === to.id) openPanel(to.id);
    save();
    const n = ownTexts(to).length;
    toast(`已把「${titleOf(from)}」的文本接给「${titleOf(to)}」（第 ${n} 段输入）`);
    return;
  }
  if (isStyle(to)) return toast("风格节点不收输入：它把字写给生成节点用");
  // 生成节点：@style 边（老机制），同样一张能挂好几个文本节点
  const ps = promptSpecs(capOf(to));
  if (!ps.length) return toast(`「${titleOf(to)}」不写提示词，接文本节点没有用`);
  if (!textOf(from)) return toast(`「${titleOf(from)}」手里还没有字：先写一段，或先运行它`);
  if (PROJ.edges.some(e => e.from === from.id && e.to === to.id && e.slot === STYLE_SLOT)) {
    return toast("已经挂上了");
  }
  PROJ.edges.push({ from: from.id, to: to.id, slot: STYLE_SLOT });
  drawWires(); paintStyles();
  if (selId === to.id) openPanel(to.id);
  save();
  const n = styleReach(from).length;
  toast(`文本已挂给「${titleOf(to)}」` + (n ? `，下游 ${n} 个节点也跟着带` : ""));
}

async function linkTo(from, to) {
  if (!to) return;
  if (isTextCard(from)) return linkText(from, to);
  if (isTextCard(to)) return toast("文本节点不收图片/视频素材：把文本节点的出口拖过来才是接文本");
  if (isAsset(to)) return toast("素材节点不收输入：它是把手里那份素材送给别的节点的");
  const outputs = from.outputs || [];
  const out = outputs[0];
  if (!out) return toast(isAsset(from) ? "这个素材节点还是空的：先点它选个文件" : "上游还没有产物，先运行它");

  // 自动切换：文生图模式接收图片 → 切换到图生图模式（在查找槽位之前）
  const toDef = defOf(to);
  let modeSwitched = false;
  if (toDef && toDef.id === "card_image" && out.kind === "image") {
    if (to.cap === "zimage_t2i") {
      to.cap = "zimage_i2i";
      if (!to._model) to._model = "zimage";
      paintTitle(to);
      modeSwitched = true;
    } else if (to.cap === "krea2_t2i") {
      to.cap = "krea2_i2i";
      if (!to._model) to._model = "krea2";
      paintTitle(to);
      modeSwitched = true;
    }
  }

  // 普通「生视频」节点默认是图生视频。给它接视频时自动切到第一个真正收视频的模式
  //（现在就是 H3 全能参考），不能再把 mp4 假装成参考图塞进 LoadImage。
  const currentCap = capOf(to);
  if (toDef && toDef.id === "card_video" && out.kind === "video"
      && !(currentCap && currentCap.inputs.some(s => s.type === "video"))) {
    const videoMode = toDef.modes.find(md => modeTakes(md, "video"));
    if (videoMode) {
      removeEdges(PROJ.edges.filter(e => e.to === to.id && !isTextEdge(e)));
      to.assets = {};
      to.cap = modeCap(videoMode);
      paintTitle(to);
      modeSwitched = true;
    }
  }

  // 路由节点先按上游产物的类型切到对应那一路，切完槽位名才对得上（见 routeFor）
  const r = routeFor(to, out.kind);
  if (r) {
    removeEdges(PROJ.edges.filter(e => e.to === to.id));
    to.cap = r.cap; to.assets = {}; paintTitle(to);
  }
  const spec = r ? { key: r.slot, label: KIND_ZH[out.kind] || "素材" }
    // 素材类型必须和槽位一致。视频不能降级塞进图片格：界面虽然能预览，提交时却会
    // 把 mp4 文件名写给 LoadImage，既显示成“图片素材”，运行也一定失败。
    : firstFreeSlot(to, out.kind);
  if (!spec) {
    const limit = mediaLimit(capOf(to), out.kind);
    return toast(limit && mediaCount(to, out.kind) >= limit
      ? `${KIND_ZH[out.kind] || out.kind}引用已达上限 ${limit}`
      : `下游节点没有可接收的${KIND_ZH[out.kind] || out.kind}槽位`);
  }

  // 同一格换接别的上游时，先清掉旧线拥有的全部引用；多产物线可能不止占 spec.key 一格。
  if (!r) removeEdges(PROJ.edges.filter(e => e.to === to.id && edgeSlots(e).includes(spec.key)));
  const edge = {
    from: from.id, to: to.id, slot: spec.key,
    slots: mediaSlotsForOutputs(to, spec.key, outputs),
  };
  PROJ.edges.push(edge);
  drawWires(); paintStyles();
  try {
    // 风格是顺着这根线传下来的（没有单独的连线），接线那一刻就说一句，不然是隐形的
    const inh = styleTexts(to).length && promptSpecs(capOf(to)).length;
    const limit = mediaLimit(capOf(to), out.kind);
    toast(`引用上游产物 → ${slotName(spec, to)}` + (limit ? `（上限 ${limit}）` : "")
      + (inh ? "；上游的风格也跟着传下来了" : ""));
    // 素材节点手里那份本来就是上传上来的（已经在 input 目录里、ref 是现成的），
    // 再走一遍 importOutput 就是把同一个文件下载下来重新传一次，纯粹白等。
    for (let i = 0; i < edge.slots.length; i++) {
      const output = outputs[i];
      if (!output) break;
      const imported = isAsset(from) ? JSON.parse(JSON.stringify(output))
        : await importOutput(output);
      // 导入期间用户可能已经删线；异步返回后不能把刚清掉的引用重新塞回来。
      if (!PROJ || !PROJ.edges.includes(edge)) return;
      to.assets[edge.slots[i]] = imported;
    }

    paintKind(to);
    // 如果切换了模式，强制重新打开面板以显示新的槽位和参数
    if (modeSwitched || selId === to.id) openPanel(to.id);
    save();
  } catch (e) {
    save();
    toast("引用失败：" + e.message);
  }
}

/** 这个模式收得下 kind 类型的素材吗。
    路由节点看它有没有那一路；阶梯模式的 md.id 是张数最多那条（超集），
    它有的槽少张数那条都有，所以只看超集就够。 */
function modeTakes(md, kind) {
  if (md.route) return !!md.route[kind];
  const cap = CAPS[modeCap(md)];
  return !!cap && cap.inputs.some(s => s.type === kind);
}

/** 从出口拖到空白处：列出真收得下这份产物的玩法让人自己挑。
    以前是按产出类型猜一张（图→生视频、视频→生图），猜错的概率不低，
    而且"视频接进生图当参考图"根本跑不通（LoadImage 读不了 mp4）。
    这里只列槽位类型对得上的，选完直接建节点 + 连线。 */
async function spawnDownstream(from, at, cx, cy) {
  // 一个节点一条，收口成跟底部工具条一样的几样（文本/图片/视频/工具箱），不再按玩法摊开。
  // 建节点用的是**第一个收得下这份素材的模式**——拖一张图给「图片」建出来就是图生图，
  // 不是文生图，不然线接上去发现没有格子可进。
  const ORDER = [
    ["card_text", "文本"], ["card_image", "图片"], ["card_video", "视频"], ["card_tools", "工具箱"],
  ];

  // 获取上游产物数量和类型
  const outputCount = (from.outputs || []).length;
  const outputKind = (from.outputs || [])[0]?.kind || (capOf(from) || defOf(from) || {}).outputType;

  console.log('[spawnDownstream] 上游产物:', { outputCount, outputKind, fromId: from.id });

  const list = (pred) => {
    const items = [];
    for (const [tid, label] of ORDER) {
      const def = CARDS.find(d => d.id === tid);
      if (!def || !def.modes.length) continue;
      // 根据产物数量筛选模式：
      // - 如果有多个产物，优先匹配 images/videos/audios 数量相同的模式
      // - 如果没有匹配的，降级到支持单个素材的模式
      let md = null;
      if (outputCount > 1 && outputKind) {
        // 多产物：找支持对应数量的模式
        md = def.modes.find(m => {
          if (!pred(m)) return false;
          const capId = modeCap(m);
          const cap = CAPS[capId];
          if (!cap) return false;
          const imgCount = cap.images || 0;
          const vidCount = cap.videos || 0;
          const audCount = cap.audios || 0;
          console.log('[spawnDownstream] 检查模式:', { mode: m, capId, imgCount, vidCount, audCount, outputCount, outputKind });
          // 匹配产物类型和数量
          if (outputKind === "image" && imgCount === outputCount) {
            console.log('[spawnDownstream] ✓ 找到匹配的图片模式:', capId);
            return true;
          }
          if (outputKind === "video" && vidCount === outputCount) {
            console.log('[spawnDownstream] ✓ 找到匹配的视频模式:', capId);
            return true;
          }
          if (outputKind === "audio" && audCount === outputCount) {
            console.log('[spawnDownstream] ✓ 找到匹配的音频模式:', capId);
            return true;
          }
          return false;
        });
      }
      // 如果没找到匹配的，或者只有单产物，用原逻辑
      if (!md) md = def.modes.find(pred);
      if (!md) continue;
      items.push({
        icon: def.icon, text: label,
        run: async () => {
          const c = addCard(def.id, at.x, at.y - 40, modeCap(md));
          if (!c) return;
          if (isTextCard(from)) await linkText(from, c);
          else await linkTo(from, c);
        },
      });
    }
    return items;
  };
  // 文本节点拖出来：文本节点（当这段文字的输入）+ 写提示词的生成节点。文本节点自己没有
  // promptSpecs（它不是能力），走 pred 会漏掉，单独补一条
  if (isTextCard(from)) {
    const tdef = CARDS.find(d => d.id === "card_text");
    const items = [];
    if (tdef && tdef.modes.length) items.push({
      icon: tdef.icon, text: "文本节点（接住这段字当输入）",
      run: async () => {
        const c = addCard(tdef.id, at.x, at.y - 40, modeCap(tdef.modes[0]));
        if (c) await linkText(from, c);
      },
    });
    items.push(...list(md => promptSpecs(CAPS[modeCap(md)]).length));
    if (!items.length) return;
    return showMenu(cx, cy, "把这段文本接给…", items);
  }
  if (isAsset(from)) {
    const a = assetOf(from);
    if (!a) return toast("这个素材节点还是空的：先点它选个文件");   // 没东西可往外送
    // 素材节点手里那份就是它的"产物"：按它真实的类型列收得下的节点
    const items = list(md => modeTakes(md, a.kind));
    const zh = KIND_ZH[a.kind] || a.kind;
    return items.length ? showMenu(cx, cy, `把这个${zh}接给…`, items)
      : toast(`没有节点收${zh}素材`);
  }
  const out = (from.outputs || [])[0];
  // 还没跑过就按这条能力"将来会出什么"来列 —— 先把链子搭起来、回头再跑是常见做法，
  // 不能因为上游还空着就什么都不给建（linkTo 那边会提醒去跑上游）
  const kind = out ? out.kind : (capOf(from) || defOf(from) || {}).outputType;
  if (!kind) return;
  const items = list(md => modeTakes(md, kind));
  const zh = KIND_ZH[kind] || kind;
  if (!items.length) return toast(`没有节点收${zh}素材`);
  showMenu(cx, cy, `把这个${zh}接给…`, items);
}

/** 把 ComfyUI 输出目录里的产物搬进 input 目录，得到可用的 LoadImage 值 */
async function importOutput(out) {
  const blob = await (await fetch(out.url)).blob();
  const fd = new FormData();
  fd.append("file", blob, out.filename.split(/[\\/]/).pop());
  const r = await api("/api/upload", { method: "POST", body: fd });
  return r.files[0];
}

/** 素材格里的图/视频/音频：复用产物大图那套查看器，不用为它再写一个 */
function openAsset(a) {
  openViewer(null, 0, [{
    url: a.url, kind: a.kind,
    filename: (a.origin || a.url).split(/[\\/]/).pop(),
  }], null);
}

/** 在资源管理器里选中这份素材。只把文件名发过去，路径由服务端在 data/uploads 里拼 */
async function revealAsset(a) {
  try { await jpost("/api/reveal", { name: a.url.split("/").pop() }); }
  catch (e) { toast("定位失败：" + e.message); }
}

/* ================= 右侧历史产物栏 ================= */
const HIST_MAX = 20;               // 每个节点留 20 轮；再往前的去 ComfyUI 的 output 目录里找

/** 一轮产物的签名，用来判重：轮询会反复读到同一轮，不能记成好多条 */
const runSig = (outs) => (outs || []).map(o => o.url).join("|");

/** 把节点刚出的这一轮记进历史（最新的在最前面） */
function pushHistory(c) {
  const outs = c.outputs || [];
  if (!outs.length) return;
  c.history = c.history || [];
  const sig = runSig(outs);
  if (c.history.some(h => runSig(h.outputs) === sig)) return;
  c.history.unshift({
    ts: Date.now(), seed: c.seed != null ? c.seed : null,
    cap: runCap(c), ms: c.ms != null ? c.ms : null, outputs: outs,
    // 挂了风格节点时，节点上提示词框里的字并不是真发出去的那段（风格是提交那一刻并进去的）。
    // 只有把当时真提交的整段留下来，这一轮才复现得出来 —— 风格节点后来改了、解除了都不影响它
    ...(c._sent ? { prompt: c._sent } : {}),
    // 生图节点：记录提示词和负面提示词
    ...((c.cap === "zimage_t2i" || c.cap === "krea2_t2i") && c.params ? {
      user_prompt: c.params.prompt || "",
      negative_prompt: c.params.negative_prompt || ""
    } : {}),
  });
  if (c.history.length > HIST_MAX) c.history.length = HIST_MAX;
}

/** 老项目里的节点只有 outputs 没有 history，补一条占位，别让人以为产物丢了。
 *  ts 记 null：那一轮的时间我们确实不知道，显示成"早前"，不编一个假时间 */
function seedHistory(c) {
  if (c.history) return;
  c.history = (c.outputs || []).length
    ? [{ ts: null, seed: c.seed != null ? c.seed : null, cap: c.cap, outputs: c.outputs }]
    : [];
}

/** 这一轮真花了多久。数据来自服务端 job 的 started/ended（跟浏览器同一台机器，
    不用担心时钟差），不知道就返回空串不显示 —— 不拿「现在减开始」编一个假数字。
    名字别叫 fmtDur：那个是给视频时长用的（秒、0:07 样式），同名会互相顶掉。 */
function fmtEla(ms) {
  if (!(ms > 0)) return "";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}秒`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}分${s % 60}秒` : `${Math.floor(m / 60)}时${m % 60}分`;
}

function histTime(ts) {
  if (!ts) return "早前";
  const d = new Date(ts), p = (n) => String(n).padStart(2, "0");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const hm = `${p(d.getHours())}:${p(d.getMinutes())}`;
  return ts >= today.getTime() ? hm : `${p(d.getMonth() + 1)}-${p(d.getDate())} ${hm}`;
}

function closeHistory() {
  el.hist.style.display = "none";
  el.hist.innerHTML = "";          // 清空才会停掉缩略图里正在加载的视频
  el.hist._id = null;
}

function openHistory(id) {
  const c = PROJ && PROJ.cards.find(x => x.id === id);
  if (!c) return closeHistory();
  if (isTextCard(c)) return closeHistory();   // 文本节点/风格节点没有媒体产物，别摆一个空栏子占地方
  seedHistory(c);
  const list = document.createElement("div"); list.className = "hlist";
  const cap = capOf(c);

  const hd = document.createElement("div"); hd.className = "hhd";
  hd.innerHTML = `<b>历史产物</b><span class="n"></span><button class="x" title="收起">✕</button>`;
  hd.querySelector(".n").textContent = c.history.length ? `${c.history.length} 轮` : "";
  hd.querySelector(".x").onclick = closeHistory;

  if (!c.history.length) {
    const e = document.createElement("div"); e.className = "hempty";
    e.textContent = "这个节点还没出过东西。\n运行一次，每一轮的产物和 seed 都会留在这里。";
    e.style.whiteSpace = "pre-line";
    list.appendChild(e);
  }
  for (const [i, h] of c.history.entries()) list.appendChild(histRun(c, h, i === 0));

  el.hist.innerHTML = "";
  el.hist.append(hd, list);
  el.hist._id = id;
  el.hist.style.display = "";
  // 摆面板的活交给紧跟着的 openPanel()：那时画布已经被栏子挤窄，量出来的边界才是对的
}

function histRun(c, h, cur) {
  const outs = h.outputs || [];
  const box = document.createElement("div");
  box.className = "hrun" + (cur ? " cur" : "");

  const rh = document.createElement("div"); rh.className = "rh";
  const capName = (CAPS[h.cap] && CAPS[h.cap].name) || "";
  rh.innerHTML = `<span class="tag"></span><span class="nm"></span><span class="cnt"></span>`;
  rh.querySelector(".tag").textContent = cur ? "最新" : histTime(h.ts);
  rh.querySelector(".nm").textContent = cur ? histTime(h.ts) : capName;
  rh.querySelector(".cnt").textContent =
    [outs.length > 1 ? `${outs.length} 张` : "", fmtEla(h.ms)].filter(Boolean).join(" · ");
  rh.title = capName;

  const rg = document.createElement("div");
  rg.className = "rg" + (outs.length === 1 ? " one" : "");
  rg.style.setProperty("--hcols", outs.length === 1 ? 1 : outs.length <= 4 ? 2 : 3);
  rg.innerHTML = outs.map((o, i) => o.kind === "video"
    ? `<video src="${o.url}" data-i="${i}" muted loop preload="metadata" draggable="false"></video>`
    : o.kind === "audio"
      ? `<div class="rg-a" data-i="${i}" title="${o.filename}">🎵</div>`
      : `<img src="${o.url}" data-i="${i}" alt="" draggable="false">`).join("");
  rg.onclick = (ev) => {
    const t = ev.target.closest("[data-i]");
    if (t) openViewer(c, +t.dataset.i, outs, h.seed);
  };
  // 历史记录右键菜单：下载
  rg.oncontextmenu = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const t = ev.target.closest("[data-i]");
    if (!t) return;
    const idx = +t.dataset.i;
    const out = outs[idx];
    if (!out) return;

    const menu = [];
    // 单张下载
    menu.push({
      icon: "⬇",
      text: `下载${out.kind === "video" ? "视频" : out.kind === "audio" ? "音频" : "图片"}`,
      run: () => downloadOut(out)
    });
    // 全部下载（如果有多张）
    if (outs.length > 1) {
      menu.push({
        icon: "⬇",
        text: `下载全部 ${outs.length} 张${out.kind === "video" ? "视频" : out.kind === "audio" ? "音频" : "图片"}`,
        run: () => outs.forEach(o => downloadOut(o))
      });
    }

    showMenu(ev.clientX, ev.clientY, "历史记录", menu);
  };

  box.append(rh, rg);

  // seed 专区：独占一行，不压在画面上
  const rs = document.createElement("div"); rs.className = "rs";
  rs.innerHTML = `<i>seed</i><span></span>`;
  rs.querySelector("span").textContent = h.seed != null ? String(h.seed) : "未记录";
  if (h.seed != null) {
    const cp = document.createElement("button");
    cp.textContent = "复制"; cp.title = "复制 seed";
    cp.onclick = () => navigator.clipboard.writeText(String(h.seed))
      .then(() => toast("已复制 seed " + h.seed), () => toast("复制失败，手动选中即可"));
    rs.appendChild(cp);
  }
  box.appendChild(rs);

  // 生图节点：显示提示词和负面提示词
  if (h.user_prompt || h.negative_prompt) {
    const rp = document.createElement("details"); rp.className = "rp";
    const sm = document.createElement("summary"); sm.textContent = "提示词";
    const tx = document.createElement("div");
    if (h.user_prompt) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.marginBottom = "4px";
      const label = document.createElement("div");
      label.style.fontWeight = "bold";
      label.textContent = "正面提示词：";
      const cpBtn = document.createElement("button");
      cpBtn.textContent = "复制";
      cpBtn.style.fontSize = "12px";
      cpBtn.style.padding = "2px 8px";
      cpBtn.onclick = () => navigator.clipboard.writeText(h.user_prompt)
        .then(() => toast("已复制正面提示词"), () => toast("复制失败"));
      row.append(label, cpBtn);
      const content = document.createElement("div");
      content.style.marginBottom = h.negative_prompt ? "8px" : "0";
      content.textContent = h.user_prompt;
      tx.append(row, content);
    }
    if (h.negative_prompt) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.marginBottom = "4px";
      const label = document.createElement("div");
      label.style.fontWeight = "bold";
      label.textContent = "负面提示词：";
      const cpBtn = document.createElement("button");
      cpBtn.textContent = "复制";
      cpBtn.style.fontSize = "12px";
      cpBtn.style.padding = "2px 8px";
      cpBtn.onclick = () => navigator.clipboard.writeText(h.negative_prompt)
        .then(() => toast("已复制负面提示词"), () => toast("复制失败"));
      row.append(label, cpBtn);
      const content = document.createElement("div");
      content.textContent = h.negative_prompt;
      tx.append(row, content);
    }
    rp.append(sm, tx);
    box.appendChild(rp);
  }

  // 套了风格节点的那几轮：把当时真提交的整段提示词收在这儿。节点上那个框里的字
  // 不等于跑出这一轮的那段话，不放出来的话这一轮等于没法复现
  if (h.prompt) {
    const rp = document.createElement("details"); rp.className = "rp";
    const smRow = document.createElement("div");
    smRow.style.display = "flex";
    smRow.style.justifyContent = "space-between";
    smRow.style.alignItems = "center";
    const sm = document.createElement("summary"); sm.textContent = "当时提交的提示词";
    const cpBtn = document.createElement("button");
    cpBtn.textContent = "复制";
    cpBtn.style.fontSize = "12px";
    cpBtn.style.padding = "2px 8px";
    cpBtn.style.marginLeft = "8px";
    cpBtn.onclick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      navigator.clipboard.writeText(h.prompt)
        .then(() => toast("已复制提示词"), () => toast("复制失败"));
    };
    sm.appendChild(cpBtn);
    const tx = document.createElement("div"); tx.textContent = h.prompt;
    rp.append(sm, tx);
    box.appendChild(rp);
  }
  return box;
}

/* ================= 参数面板 ================= */
function closePanel() {
  el.panel.style.display = "none"; el.panel._id = null;
  closeHistory();
}

/** 拖节点时把面板藏起来（用 visibility 而不是 display：还能量到宽高，松手好复位） */
function veilPanel(on) {
  if (el.panel.style.display === "none") return;
  el.panel.style.visibility = on ? "hidden" : "";
}

function placePanel() {
  if (el.panel.style.display === "none") return;
  const c = PROJ && PROJ.cards.find(x => x.id === el.panel._id);
  if (!c || !c._el) return closePanel();

  const GAP = 8;

  // 节点的世界坐标
  const cx = c.x, cy = c.y;
  const cw = c._el.offsetWidth, ch = c._el.offsetHeight;

  // 将世界坐标转换为屏幕坐标：应用 view 的平移和缩放
  const screenX = cx * view.k + view.x;
  const screenY = cy * view.k + view.y;
  const screenW = cw * view.k;
  const screenH = ch * view.k;

  // 获取 stage 的边界
  const r = el.stage.getBoundingClientRect();

  // 检查节点是否在可视区域内，如果完全不在就隐藏面板
  const nodeRight = screenX + screenW;
  const nodeBottom = screenY + screenH;
  const isVisible = nodeRight > r.left && screenX < r.right &&
                    nodeBottom > r.top && screenY < r.bottom;

  if (!isVisible) {
    el.panel.style.visibility = "hidden";
    return;
  }

  el.panel.style.visibility = "";

  // 先限高再量高
  const TOP = 52;
  el.panel.style.maxHeight = (innerHeight - TOP - GAP) + "px";
  const w = el.panel.offsetWidth, h = el.panel.offsetHeight;

  // 面板位置：节点中心下方
  const panelX = screenX + screenW / 2 - w / 2;
  const panelY = screenY + screenH + GAP;

  el.panel.style.left = panelX + "px";
  el.panel.style.top = panelY + "px";
}

function openPanel(id) {
  const c = PROJ.cards.find(x => x.id === id);
  if (!c) return closePanel();
  const def = defOf(c), cap = capOf(c);
  // 切 tab / 传图都会整块重画，同一个节点要留住滚动位置，不然每次都弹回顶部
  const old = el.panel.querySelector(".pbody");
  const scrolled = (old && el.panel._id === id) ? old.scrollTop : 0;
  el.panel._id = id;
  el.panel.innerHTML = "";
  el.panel.style.display = "";
  el.panel.style.visibility = "";     // 上一次拖节点藏起来后没复位的话，这里兜一下

  if (isStyle(c)) return stylePanel(c);
  if (isText(c)) return textPanel(c);
  if (isAsset(c)) return assetPanel(c);

  // --- 模式切换 ---
  // 生图节点和生视频节点的模式挪到底部工具条的胶囊里（面板只留素材引用和提示词，见底部 foot）；
  // 别的多模式节点暂时还是顶部条
  const compact = (def.id === "card_image" || def.id === "card_video") && def.modes.length > 1;
  if (def.modes.length > 1 && !compact) {
    const m = document.createElement("div"); m.className = "modes";
    for (const md of def.modes) {
      const b = document.createElement("button");
      b.className = modeHas(md, c.cap) ? "on" : "";
      b.textContent = md.name;
      hoverTip(b, () => modeBriefEl(c, md, md.name));
      b.onclick = () => { tipHide(); c.cap = modeCap(md); openPanel(id); paintTitle(c); save(); };
      m.appendChild(b);
    }
    el.panel.appendChild(m);
  }
  if (!cap) { el.panel.appendChild(errBox("能力不可用")); return placePanel(); }

  // 合并模式的槽位按图槽最多那条画（它是超集），但默认值得取「按当前张数真正会跑的
  // 那条」。不这么做的话，面板显示的是首尾帧那条的示例提示词，只传一张图跑的却是
  // 图生视频那条的示例提示词 —— 看到的和出片的不是一回事。
  const rcap = CAPS[runCap(c)];
  let specs = (rcap && rcap !== cap)
    ? cap.inputs.map((s) => {
      const o = rcap.inputs.find(x => x.key === s.key);
      return o && o.default !== s.default ? { ...s, default: o.default } : s;
    })
    : cap.inputs;
  const md = modeOf(c);
  // 路由节点的入口只有一格、两种素材都收，所以空着的时候不能叫「图片」（见 ROUTE_CARDS.entry）。
  // 一旦放进去了就露出真名（图片/视频），那正好是"路由到哪一路了"的反馈
  if (md && md.entry) {
    const i = specs.findIndex(x => MEDIA.includes(x.type));
    if (i >= 0 && !c.assets[specs[i].key]) {
      specs = specs.slice();
      specs[i] = { ...specs[i], label: md.entry.label };
    }
  }
  // 中间这坨才滚动：模式切换留在顶部、运行按钮留在底部，参数再多也不会被推出屏幕
  const body = document.createElement("div"); body.className = "pbody";
  el.panel.appendChild(body);

  // --- 素材槽 ---
  // 放在提示词前面：漫剧那种一图一提示词的工作流，tab 是跟着图长出来的，
  // 先看到图槽才讲得通
  const media = specs.filter(x => MEDIA.includes(x.type));
  if (media.length) body.appendChild(referenceSlots(c, media, md));

  // --- 音频选区 ---
  // 起止点不画成两个文本框：要裁哪一段全靠听（第几秒开始唱），手打 "0:05" 得先知道
  // 这音频哪一秒在唱什么，只能反复试跑。manifest 里的 rangeOf 指向它裁的那个音频槽。
  // 没引用音频时连素材卡都不显示，选区自然也不能先占一块位置。
  const ranged = new Set();
  for (const s of media.filter(s => (c.assets || {})[s.key])) {
    const rg = specs.filter(x => x.rangeOf === s.key);
    if (rg.length !== 2) continue;      // 不是成对的起止点，还是交给普通旋钮画
    body.appendChild(audioRange(c, s, rg[0], rg[1]));
    for (const x of rg) ranged.add(x.key);
  }

  // --- 提示词 ---
  const texts = specs.filter(x => x.type === "textarea" && !x.advanced);
  const tpl = texts.filter(x => x.template);     // 作者调好的规范，折起来放最后
  const norm = texts.filter(x => !x.template);
  const paired = norm.filter(x => x.pairWith && specs.some(y => y.key === x.pairWith));
  if (paired.length > 1) body.appendChild(promptTabs(c, paired));
  for (const s of norm) {
    // 负面提示词只在文生图模式下显示（Z-Image和Krea2都支持）
    if (s.key === "negative_prompt") {
      const isT2I = c.cap === "zimage_t2i" || c.cap === "krea2_t2i";
      if (!isT2I) continue;
    }
    if (!paired.includes(s) || paired.length < 2) body.appendChild(promptBlock(c, s));
  }
  for (const s of tpl) body.appendChild(templateBlock(c, s));

  // --- 常规参数 ---
  // mirror = 多个节点共用同一个参数框（如两个采样器共用种子），只画一次
  // ranged = 已经画成上面那条选区了，别在这儿再出一对文本框
  const rows = specs.filter(x => !MEDIA.includes(x.type) && x.type !== "textarea"
    && x.type !== "seed"            // 种子不进面板：永远默认 -1（每次随机），想复现去历史栏复制 seed
    && !x.advanced && !x.mirror && !ranged.has(x.key));
  // 旋钮下面那行小字：光靠 label 说不清的（"分辨率"是每格的还是整张的）必须摆在
  // 明面上。以前只有「高级」里的旋钮画它，常规旋钮的 hint 只当 tooltip，不悬停看不见
  const addRow = (box, s) => {
    box.appendChild(rowEl(c, s));
    if (s.hint) {
      const nt = document.createElement("div");
      nt.className = "knobnote"; nt.textContent = s.hint;
      box.appendChild(nt);
    }
  };
  // 生图节点的分辨率/比例不在面板里摊开了：点「⚙」胶囊弹独立小窗（openResPop）。
  // 别的节点照旧摊开剩余旋钮；高级参数整个不画（用户定的：基本上不动）
  // **compact 模式：分辨率参数 + 常规参数（duration/target_fps）收进 ⚙ 弹窗**
  const pwrap = document.createElement("div"); pwrap.className = "pwrap";
  const COMPACT_KEYS = new Set(["megapixels", "width", "height", "aspect_ratio", "scale_to_length",
    "duration", "target_fps"]);
  for (const s of rows) if (!(compact && COMPACT_KEYS.has(s.key))) addRow(pwrap, s);
  body.appendChild(pwrap);

  if (c.error) body.appendChild(errBox(c.error));

  // --- 底部 ---
  const foot = document.createElement("div"); foot.className = "foot";
  // 生图节点和生视频节点：左下「模式」胶囊（换玩法）+「⚙ 参数」（清晰度/比例弹窗），跟文本节点同一套
  if (compact) {
    const isVideo = def.id === "card_video";
    const currentMode = modeOf(c) || def.modes[0];
    const modeButton = capBtn(`${def.icon} ${currentMode.name}`, isVideo ? "生视频模式" : "生图模式",
      () => def.modes.map(mo => ({
        icon: def.icon,
        text: mo.name + (modeHas(mo, c.cap) ? "（当前）" : ""),
        tip: () => modeBriefEl(c, mo, mo.name),
        run: () => { tipHide(); closeResPop(); c.cap = modeCap(mo); openPanel(id); paintTitle(c); save(); },
      })));
    hoverTip(modeButton, () => modeBriefEl(c, currentMode, currentMode.name));
    foot.appendChild(modeButton);

    // 模型选择按钮（文生图和图生图模式显示，用于在Z-Image和Krea2之间切换）
    if (def.id === "card_image" && c.cap && (c.cap === "zimage_t2i" || c.cap === "krea2_t2i" || c.cap === "zimage_i2i" || c.cap === "krea2_i2i")) {
      // 保存当前选择的模型到卡片对象
      if (!c._model) c._model = (c.cap === "krea2_t2i" || c.cap === "krea2_i2i") ? "krea2" : "zimage";
      const curModel = c._model || "zimage";

      const modelBtn = capBtn(
        curModel === "krea2" ? "🎨 Krea2" : "🖼 Z-Image",
        "生图模型",
        () => [
          {
            icon: "🖼",
            text: "Z-Image" + (curModel === "zimage" ? "（当前）" : ""),
            run: () => {
              tipHide(); closeResPop();
              c._model = "zimage";
              // 实时判断当前是否为图生图模式（检查后缀而不是具体值，更robust）
              const isCurrentI2I = c.cap && c.cap.endsWith("_i2i");
              c.cap = isCurrentI2I ? "zimage_i2i" : "zimage_t2i";
              openPanel(id); paintTitle(c); save();
            }
          },
          {
            icon: "🎨",
            text: "Krea2" + (curModel === "krea2" ? "（当前）" : ""),
            run: () => {
              tipHide(); closeResPop();
              c._model = "krea2";
              // 实时判断当前是否为图生图模式（检查后缀而不是具体值，更robust）
              const isCurrentI2I = c.cap && c.cap.endsWith("_i2i");
              c.cap = isCurrentI2I ? "krea2_i2i" : "krea2_t2i";
              openPanel(id); paintTitle(c); save();
            }
          }
        ]
      );
      foot.appendChild(modelBtn);
    }

    const pb = document.createElement("button");
    pb.className = "tcap";
    const cb = paramsBrief(c, cap);
    pb.textContent = cb ? `⚙ ${cb}` : "⚙ 参数";
    pb.title = "点开弹窗：清晰度、画面比例、时长等参数";
    pb.onclick = (ev) => { ev.stopPropagation(); openResPop(c, pb); };
    foot.appendChild(pb);
  }
  const running = c.status === "queued" || c.status === "running";
  const info = document.createElement("span");
  info.style.cssText = "color:#8a8a94;font-size:12px";
  info.textContent = cap.outputType === "video" ? "输出：视频" : "输出：图片";
  // 上一轮跑了多久：视频一轮动辄几分钟，这个数得在面板里也报一声（节点脚上一直有）
  if (c.status === "done" && c.ms > 0) info.textContent += ` · 上次 ${fmtEla(c.ms)}`;
  foot.appendChild(info);
  if (running) {
    const cn = document.createElement("button");
    cn.className = "cancel"; cn.textContent = "取消";
    cn.onclick = () => cancel(c);
    cn.style.marginLeft = "auto";
    foot.appendChild(cn);
  }
  const go = document.createElement("button");
  go.className = "go"; go.textContent = "↑"; go.title = "运行";
  go.disabled = running;
  go.onclick = () => run(c);
  foot.appendChild(go);
  el.panel.appendChild(foot);

  placePanel();
  body.scrollTop = scrolled;      // 必须等内容进了 DOM 才有 scrollHeight 可滚
}

function errBox(t) { const d = document.createElement("div"); d.className = "err"; d.textContent = t; return d; }

/** 风格节点的面板。它没有能力、没有素材、没有参数，只有一段文字和"挂给了谁"，
    所以整块单独画，不走上面那套（specs / 旋钮 / 运行按钮一个都用不上）。 */
function stylePanel(c) {
  const body = document.createElement("div"); body.className = "pbody";
  el.panel.appendChild(body);

  const wrap = document.createElement("div"); wrap.className = "pblock";
  const hd = document.createElement("div"); hd.className = "phd";
  const nm = document.createElement("span"); nm.textContent = "风格描述";
  const cnt = document.createElement("span"); cnt.className = "demo";
  const clr = document.createElement("button"); clr.textContent = "清空";
  hd.append(nm, cnt, clr);
  const ta = document.createElement("textarea");
  ta.placeholder = "例：蒂姆·波顿式哥特暗黑定格动画质感，冷青灰色调，"
    + "强侧光硬阴影，胶片颗粒，浅景深，电影级构图";
  ta.value = String((c.params || {}).style || "");
  ta.style.minHeight = "120px";
  const sync = () => {
    const t = ta.value.trim();
    cnt.style.display = t ? "none" : "";
    cnt.textContent = "⚠ 还没写，挂着也不起作用";
  };
  const commit = () => {
    c.params = c.params || {};
    c.params.style = ta.value;
    sync(); paint(c); save();
  };
  ta.oninput = commit;
  clr.onclick = () => { ta.value = ""; commit(); ta.focus(); };
  sync();
  wrap.append(hd, ta);
  body.appendChild(wrap);

  // --- 挂给了谁 ---
  const edges = PROJ.edges.filter(e => e.from === c.id && isTextEdge(e));
  const box = document.createElement("div"); box.className = "slinks";
  const t = document.createElement("div"); t.className = "atitle";
  t.textContent = edges.length ? `挂着 ${edges.length} 个节点` : "还没挂给任何节点";
  box.appendChild(t);
  if (!edges.length) {
    const p = document.createElement("div"); p.className = "anote";
    p.textContent = "把右边那颗点拖到一张生图/生视频节点上；拖到空白处会列出所有写提示词的玩法。";
    box.appendChild(p);
  }
  for (const e of edges) {
    const to = PROJ.cards.find(x => x.id === e.to);
    if (!to) continue;
    const r = document.createElement("div"); r.className = "slink";
    const a = document.createElement("button"); a.className = "nm";
    a.textContent = titleOf(to);
    a.title = "选中这个节点（面板上能看到合并后的提示词）";
    a.onclick = () => pick(to.id);
    const x = document.createElement("button"); x.className = "off";
    x.textContent = "解除"; x.title = "这个节点不再套用本风格";
    x.onclick = () => delEdge(e);
    r.append(a, x);
    box.appendChild(r);
  }
  // 继承来的那几张：没有连线、也不能在这儿解除（要断就断产物那根线），
  // 但不列出来用户就不知道这段风格还在悄悄影响谁
  const down = styleReach(c);
  if (down.length) {
    const t2 = document.createElement("div"); t2.className = "atitle";
    t2.textContent = `顺着连线连带 ${down.length} 张`;
    box.appendChild(t2);
    for (const to of down) {
      const r = document.createElement("div"); r.className = "slink down";
      const a = document.createElement("button"); a.className = "nm";
      a.textContent = titleOf(to);
      a.title = "选中这个节点（面板上能看到合并后的提示词）";
      a.onclick = () => pick(to.id);
      const s = document.createElement("span"); s.className = "off ro";
      s.textContent = "继承"; s.title = "上游那个节点传下来的，要断就断它们之间那根产物连线";
      r.append(a, s);
      box.appendChild(r);
    }
  }
  body.appendChild(box);
  placePanel();
}

/* ================= 素材节点面板 ================= */
/** 素材节点的手里就一份上传上来的文件，不生成、没参数。面板里干三件事：
    换文件、看大图/定位、看这份素材现在喂给了哪几个节点（跟风格节点的「挂给了谁」一个道理，
    只是那是文本、这份是文件）。 */
function assetPanel(c) {
  const body = document.createElement("div"); body.className = "pbody";
  el.panel.appendChild(body);
  const a = assetOf(c);

  const wrap = document.createElement("div"); wrap.className = "pblock";
  const hd = document.createElement("div"); hd.className = "phd";
  const nm = document.createElement("span"); nm.textContent = "手里的素材";
  const cnt = document.createElement("span"); cnt.className = "demo";
  hd.append(nm, cnt);
  wrap.appendChild(hd);

  // 有文件就放一个预览（图片来源/视频/音频各走各的），没文件就放一块空位
  const pv = document.createElement("div"); pv.className = "asset";
  if (a) {
    const fn = document.createElement("div"); fn.className = "aname";
    fn.textContent = (a.origin || a.url).split(/[\\/]/).pop();
    fn.title = a.origin || "";
    pv.appendChild(fn);
    if (a.kind === "video") {
      const v = document.createElement("video"); v.src = a.url; v.controls = true; v.loop = true;
      pv.appendChild(v);
    } else if (a.kind === "audio") {
      const au = document.createElement("audio"); au.src = a.url; au.controls = true;
      pv.appendChild(au);
    } else {
      const img = document.createElement("img"); img.src = a.url;
      pv.appendChild(img);
    }
  } else {
    pv.classList.add("empty");
    pv.textContent = "还没有文件";
  }
  wrap.appendChild(pv);

  // 操作行：换 / 看 / 找，只在有文件时给「看」和「找」
  const ops = document.createElement("div"); ops.className = "prow";
  const chg = document.createElement("button"); chg.textContent = a ? "换一个文件" : "选择文件";
  chg.onclick = () => pickAsset(c);
  ops.appendChild(chg);
  if (a) {
    const vw = document.createElement("button"); vw.textContent = "查看大图";
    vw.onclick = () => openAsset(a);
    const rv = document.createElement("button"); rv.textContent = "定位文件";
    rv.onclick = () => revealAsset(a);
    ops.appendChild(vw); ops.appendChild(rv);
  }
  const clr = document.createElement("button"); clr.textContent = "清空";
  clr.title = "把这份素材扔掉，节点变回空（不会删文件本身）";
  clr.onclick = () => {
    c.outputs = [];
    // 连线保留，方便之后重新选文件；但下游不能继续拿已经清空的旧素材运行。
    for (const e of PROJ.edges.filter(e => e.from === c.id && !isTextEdge(e))) clearEdgeAssets(e);
    paint(c); paintKind(c); openPanel(c.id); save();
  };
  ops.appendChild(clr);
  cnt.textContent = a ? (a.filename || "").split(/[\\/]/).pop() : "";
  wrap.appendChild(ops);
  body.appendChild(wrap);

  // --- 喂给了谁 ---
  const edges = PROJ.edges.filter(e => e.from === c.id);
  const box = document.createElement("div"); box.className = "slinks";
  const t = document.createElement("div"); t.className = "atitle";
  t.textContent = edges.length ? `喂给 ${edges.length} 个节点` : "还没喂给任何节点";
  box.appendChild(t);
  if (!edges.length) {
    const p = document.createElement("div"); p.className = "anote";
    p.textContent = a
      ? "把右边那颗点拖到一个节点上，这份素材就进它的格子。"
      : "先在上面选一个文件，再把出口拖到别的节点上。";
    box.appendChild(p);
  }
  for (const e of edges) {
    const to = PROJ.cards.find(x => x.id === e.to);
    if (!to) continue;
    const r = document.createElement("div"); r.className = "slink";
    const b = document.createElement("button"); b.className = "nm";
    b.textContent = titleOf(to);
    b.title = "选中这个节点";
    b.onclick = () => pick(to.id);
    const x = document.createElement("button"); x.className = "off";
    x.textContent = "解除"; x.title = "这个节点不再收这份素材";
    x.onclick = () => delEdge(e);
    r.append(b, x);
    box.appendChild(r);
  }
  body.appendChild(box);
  placePanel();
}

/* ================= 文本节点面板 ================= */
/** 加工方式：不选 = 纯文本节点（只存字）；选了哪个，运行就按哪个规矩加工。
    「自定义」用下面那个指令框；三种预设是调好的规矩，指令框对它们无效。 */
const TEXT_OPS_UI = [
  ["polish", "润色", "改得更通顺好读，不加料不改意思"],
  ["optimize", "优化", "删废话、换具体说法，更精炼有表现力"],
  ["expand", "扩写", "补细节补过渡，写到 2~3 倍长"],
  ["custom", "自定义", "按下面写的指令处理文字"],
];

/** 文本节点的面板：字在节点上（那个框直接写直接改），这里管加工 ——
    指令 + 输入列表 + 附加文字 + 连给了谁；底部一条工具条：
    左下角「模型」胶囊、右边一颗「加工方式」胶囊、最右圆形「↑ 运行」。 */
function textPanel(c) {
  const body = document.createElement("div"); body.className = "pbody";
  el.panel.appendChild(body);
  const busy = c.status === "running";
  c.params = c.params || {};

  // --- 内容 ---
  const textWrap = document.createElement("div"); textWrap.className = "pblock";
  const textHd = document.createElement("div"); textHd.className = "phd";
  textHd.innerHTML = `<span>内容</span>`;
  const textTa = document.createElement("textarea");
  textTa.placeholder = "在这里写字或直接在节点上写";
  textTa.value = String(c.params.text || "");
  textTa.disabled = busy;
  textTa.oninput = () => {
    c.params.text = textTa.value;
    // 同步更新卡片上的 textarea
    const body = c._el ? c._el.querySelector(".body") : null;
    const cardTa = body ? body.querySelector("textarea.ttxt") : null;
    if (cardTa) cardTa.value = textTa.value;
    paintTextFoot(c);
    save();
  };
  textWrap.append(textHd, textTa);
  body.appendChild(textWrap);

  // --- 指令（自定义加工方式才用） ---
  if (c.params.op === "custom") {
    const wrap = document.createElement("div"); wrap.className = "pblock";
    const hd = document.createElement("div"); hd.className = "phd";
    hd.innerHTML = `<span>指令</span>`;
    const ta = document.createElement("textarea");
    ta.placeholder = "例：把接进来的几段整理成一条朋友圈文案，口语一点，带两个 emoji";
    ta.value = String(c.params.instr || "");
    ta.oninput = () => { c.params.instr = ta.value; save(); };
    wrap.append(hd, ta);
    body.appendChild(wrap);
  }

  // --- 连给了谁（@style 挂的生成节点 + @text 接的文本节点） ---
  const edges = PROJ.edges.filter(e => e.from === c.id && isTextEdge(e));
  const sbox = document.createElement("div"); sbox.className = "slinks";
  const st = document.createElement("div"); st.className = "atitle";
  st.textContent = edges.length ? `连着 ${edges.length} 个节点` : "还没连给任何节点";
  sbox.appendChild(st);
  if (!edges.length) {
    const p = document.createElement("div"); p.className = "anote";
    p.textContent = "把右边那颗点拖到生成节点（并进提示词）或别的文本节点（当输入）上；"
      + "拖到空白处会列出所有能接的地方。";
    sbox.appendChild(p);
  }
  for (const e of edges) {
    const to = PROJ.cards.find(x => x.id === e.to);
    if (!to) continue;
    const r = document.createElement("div"); r.className = "slink";
    const a = document.createElement("button"); a.className = "nm";
    a.textContent = titleOf(to);
    a.title = "选中这个节点";
    a.onclick = () => pick(to.id);
    const x = document.createElement("button"); x.className = "off";
    x.textContent = "解除"; x.title = "这个节点不再用这段文本";
    x.onclick = () => delEdge(e);
    r.append(a, x);
    sbox.appendChild(r);
  }
  body.appendChild(sbox);

  if (c.error) body.appendChild(errBox(c.error));

  // --- 底部工具条：左下「模型」胶囊 · 右边「加工方式」胶囊 · 中间信息 · 最右「↑」圆钮 ---
  const foot = document.createElement("div"); foot.className = "foot";
  foot.appendChild(capBtn(
    (c.params.model || "api") === "local" ? "🖥 本地 27B" : "☁ 云端 API",
    "模型",
    () => [
      { icon: "☁", text: "云端 API —— 几秒就回，要配好 llm.json",
        run: () => { c.params.model = "api"; openPanel(c.id); save(); } },
      { icon: "🖥", text: "本地 27B —— 不花钱，占显存，第一次慢",
        run: () => { c.params.model = "local"; openPanel(c.id); save(); } },
    ]));
  const opName = (id) => id ? (TEXT_OPS_UI.find(x => x[0] === id) || [0, id])[1] : "不加工";
  foot.appendChild(capBtn(
    opName(c.params.op),
    "加工方式",
    () => [
      { icon: "✍", text: "不加工 —— 就当一个纯文本节点，只存字",
        run: () => { c.params.op = ""; paint(c); openPanel(c.id); save(); } },
      ...TEXT_OPS_UI.map(([id, name, tip]) => ({
        icon: "✎", text: `${name} —— ${tip}`,
        run: () => { c.params.op = id; paint(c); openPanel(c.id); save(); },
      })),
    ]));

  const info = document.createElement("span");
  info.style.cssText = "color:#8a8a94;font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
  if (c._lastRun) {
    info.textContent = (c._lastRun.via === "api" ? "上次 ☁" : "上次 🖥")
      + (c._lastRun.ms ? ` · ${(c._lastRun.ms / 1000).toFixed(1)} 秒` : "");
  } else if (!c.params.op) {
    info.textContent = "没选加工方式：这个节点只存字";
  } else {
    info.textContent = "结果写回节点 · 上游改了字，重跑一次就用新的";
  }
  info.title = info.textContent;
  foot.appendChild(info);
  if (typeof c.params._prev === "string" && c.params._prev !== c.params.text) {
    const undo = document.createElement("button");
    undo.className = "cancel"; undo.textContent = "↩ 恢复运行前的字";
    undo.title = "上一次运行之前的节点上原文（只留这一步）";
    undo.onclick = () => {
      c.params.text = c.params._prev;
      delete c.params._prev;
      paint(c); openPanel(c.id); save();
    };
    foot.appendChild(undo);
  }
  const go = document.createElement("button");
  go.className = "go"; go.textContent = "↑"; go.title = "运行";
  go.disabled = busy || !c.params.op;
  go.onclick = () => run(c);
  foot.appendChild(go);
  el.panel.appendChild(foot);
  placePanel();
}

/** 文本节点的运行：节点上的字 + 接进来的几段（连线顺序）+ 附加文字，交给选定的模型
    按选定的加工方式处理，结果**写回节点上**（运行前的字留一步可恢复）。
    上游改了字或重跑过，这里读到的就是新的 —— 继承是实时的，不用重新连线。 */
async function runText(c) {
  const op = textOp(c);
  if (!op) return toast("先在上面选一种加工方式（润色 / 优化 / 扩写 / 自定义）");
  // 防止重复点击：已经在运行就不要再发请求
  if (c.status === "running") return toast("文本加工正在进行中，请稍候");
  c.error = null; c.status = "running"; c.ms = null;
  paint(c);
  if (el.panel._id === c.id) openPanel(c.id);
  try {
    const inputs = ownTexts(c).map(x => ({ name: x.name, text: x.text }));
    const own = textOf(c);
    if (own) inputs.unshift({ name: "节点上的原文", text: own });   // 节点上排第一
    const r = await jpost("/api/text", {
      op, model: (c.params || {}).model || "api",
      inputs,
      params: { instr: String((c.params || {}).instr || "") },
      project: PROJ && PROJ.id, card: c.id, cardName: titleOf(c),
    });
    c.params._prev = String((c.params || {}).text || "");   // 留一步可恢复
    c.params.text = r.text;
    c.status = "done"; c.ms = r.ms; c._lastRun = r;
    save(); paint(c);
    if (el.panel._id === c.id) openPanel(c.id);
    const downs = PROJ.edges.filter(e => e.from === c.id && isTextEdge(e)).length;
    toast(textRunToast(r) + (downs ? `\n已连给 ${downs} 个节点，它们下次运行会用这份新文本` : ""));
  } catch (e) {
    c.status = "error"; c.error = e.message;
    paint(c);
    if (el.panel._id === c.id) openPanel(c.id);
    toast(e.message);
  }
  save();
}

function textRunToast(r) {
  const t = r.ms >= 60000
    ? `${Math.floor(r.ms / 60000)} 分 ${Math.round(r.ms % 60000 / 1000)} 秒`
    : `${(r.ms / 1000).toFixed(1)} 秒`;
  return `${r.via === "api" ? "✅ 云端 API" : "✅ 本地 27B"}，${t}`
    + (r.warn ? `\n⚠ ${r.warn}` : "");
}

/** 图 ↔ 提示词是一对一跑的（第 k 张图配第 k 条提示词，见 manifest 的 pairWith），
    所以提示词收成一排 tab、跟着图走：没上传第 k 张图，第 k 条提示词就不存在。
    后端也照这个关系清空未配对的提示词，两边的列表长度才对得上。 */
function promptTabs(c, list) {
  const cap = capOf(c);
  const active = list.filter(s => (c.assets || {})[s.pairWith]);
  // tab 名只按当前真正引用的图片顺序编号；删掉图片1后，原图片2会自然显示成图片1。
  const name = (s) => slotName(cap.inputs.find(x => x.key === s.pairWith) || s, c);
  const wrap = document.createElement("div"); wrap.className = "ptabs";
  if (c._tab == null || c._tab < 0 || c._tab >= active.length) c._tab = active.length ? 0 : -1;

  if (active.length) {
    const strip = document.createElement("div"); strip.className = "tabs";
    active.forEach((s, i) => {
      const b = document.createElement("button");
      const txt = String(c.params[s.key] != null ? c.params[s.key] : s.default || "").trim();
      b.textContent = name(s) + (txt ? " ●" : "");
      b.className = i === c._tab ? "on" : "";
      b.onclick = () => { c._tab = i; openPanel(c.id); };
      strip.appendChild(b);
    });
    wrap.appendChild(strip);
    wrap.appendChild(promptBlock(c, active[c._tab], name(active[c._tab]) + " 的提示词"));
  } else {
    const p = document.createElement("div"); p.className = "tabempty";
    p.textContent = "还没有图片引用。添加图片后，这里才显示对应提示词。";
    wrap.appendChild(p);
  }
  return wrap;
}

/** 提示词块：默认值是工作流作者的演示文案，必须让用户看见并且一键清掉。
    优化过之后这一格有两份词（原词 / 优化后），页签选哪份就提交哪份。 */
function promptBlock(c, s, label) {
  const wrap = document.createElement("div"); wrap.className = "pblock";
  const scs = styleCards(c);
  const styles = scs.map(textOf);
  const own = ownStyles(c);
  // 获取引用的文本节点
  const texts = ownTexts(c);

  // ✨优化只画在"主提示词"那一格，而且这条能力得在扫描器的 REWRITE 表里登记过
  // （manifest.rewrite）。分镜那种一图一句的节点本来就没登记
  const rcap = CAPS[runCap(c)] || capOf(c);
  const canOpt = !!(rcap && rcap.rewrite
    && s.key === (promptSpecs(rcap)[0] || {}).key);
  const opt = canOpt ? optOf(c, s.key) : null;
  // 有优化结果时页签说话，没有就一直是原词
  const useOpt = !!(opt && c.optUse && c.optUse[s.key]);

  const hd = document.createElement("div"); hd.className = "phd";
  const nm = document.createElement("span");
  // 标题：如果有引用文本节点，添加说明
  const totalTexts = styles.length + texts.length;
  nm.textContent = (label || s.label) + (totalTexts && !useOpt ? `（已并入 ${totalTexts} 段文本）` : "");
  const tag = document.createElement("span"); tag.className = "demo";
  tag.textContent = "⚠ 这是示例文案，改成你要的内容";
  hd.append(nm, tag);
  wrap.appendChild(hd);

  // 两份词的页签。优化前不画 —— 只有一份词的时候页签是噪音
  if (opt) wrap.appendChild(optTabs(c, s, useOpt));

  const ta = document.createElement("textarea");
  ta.placeholder = `${label || s.label}：描述你想要的画面/动作/镜头`;

  // @ 标签高亮：textarea 底下垫一层排版完全一致的 div（文字透明、标签上色），
  // textarea 盖在上面接所有鼠标事件 —— 高亮层纯视觉，pointer-events: none
  const highlightWrapper = document.createElement("div");
  highlightWrapper.className = "prompt-highlight-wrapper";
  const highlightLayer = document.createElement("div");
  highlightLayer.className = "prompt-highlight-layer";
  highlightWrapper.appendChild(highlightLayer);
  highlightWrapper.appendChild(ta);

  /** 把 textarea 的排版度量逐项抄给高亮层，差一个像素标签框就会和文字错位 */
  function syncMetrics() {
    const cs = getComputedStyle(ta);
    for (const p of ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing",
                     "wordSpacing", "textIndent", "paddingTop", "paddingRight",
                     "paddingBottom", "paddingLeft", "borderTopWidth", "borderRightWidth",
                     "borderBottomWidth", "borderLeftWidth", "boxSizing", "width", "height"]) {
      highlightLayer.style[p] = cs[p];
    }
    highlightLayer.style.borderStyle = "solid";
    highlightLayer.style.borderColor = "transparent";
    highlightLayer.style.whiteSpace = "pre-wrap";
    highlightLayer.style.overflowWrap = cs.overflowWrap;
    highlightLayer.style.wordBreak = cs.wordBreak || "normal";

    // 层的边框宽度也从 textarea 抄了过来（透明、宽度一致），
    // 所以边框盒直接对齐 wrapper（= textarea 的边框盒）就是重合，
    // 再按边框偏移一次等于偏两次，文字会错位 1px
    highlightLayer.style.top = "0px";
    highlightLayer.style.left = "0px";

    // textarea 出滚动条后文字区变窄，高亮层没有滚动条还占全宽 —— 换行位置就岔开了。
    // 把滚动条宽度补进高亮层的右内边距，两边换行宽度一致
    const sbw = ta.offsetWidth - ta.clientWidth;
    if (sbw > 0) {
      highlightLayer.style.paddingRight = (parseFloat(cs.paddingRight) + sbw) + "px";
    }
  }

  // 构建输入框内容：引用内容在上方 + 用户文本在下方
  let baseValue = useOpt ? opt
    : (c.params[s.key] != null ? c.params[s.key] : "");

  // 如果不是优化后的版本，在输入框内显示引用内容（不带标签）在上方
  if (!useOpt && totalTexts > 0) {
    const parts = [];
    // 风格节点：只显示内容（在最上方）
    if (styles.length > 0) {
      styles.forEach(st => {
        parts.push(st);
      });
    }
    // 文本节点：只显示内容
    if (texts.length > 0) {
      texts.forEach(t => {
        parts.push(t.text);
      });
    }
    // 引用内容在前，空两行，用户文本在后
    const refContent = parts.join('\n\n');
    ta.value = refContent + (baseValue ? '\n\n' + baseValue : '\n\n');
  } else {
    ta.value = baseValue;
  }

  // 更新高亮层内容：普通文字转义后透明占位，@标签 上色成 <mark>
  function updateHighlight() {
    const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const text = ta.value;
    let html = "", last = 0;
    const re = /@([\u4e00-\u9fa5\w]+)/g;
    let m;
    while ((m = re.exec(text))) {
      html += esc(text.slice(last, m.index));
      html += `<mark class="at-mention" data-name="${esc(m[1])}">${esc(m[0])}</mark>`;
      last = m.index + m[0].length;
    }
    html += esc(text.slice(last));
    highlightLayer.innerHTML = html + "\n";   // 结尾补一个换行，末行折行时高度才对
    highlightLayer.scrollTop = ta.scrollTop;
  }

  // 优化后那份是给模型看的格式化长文（H3 的六段式能有四五百词），框子要高一点
  if (useOpt) { ta.classList.add("optta"); highlightLayer.classList.add("opt"); }

  // 阻止滚动事件冒泡到画布
  ta.addEventListener('wheel', (ev) => {
    ev.stopPropagation();
  }, { passive: true });

  // @标签 是一个整体：退格/删除键只要落在标签范围内（含紧贴标签前后沿），
  // 一次删掉整个标签，不会删出半个来
  ta.addEventListener("keydown", (ev) => {
    if (ev.isComposing) return;                        // 输入法组字中不插手
    if (ev.key !== "Backspace" && ev.key !== "Delete") return;
    if (ta.selectionStart !== ta.selectionEnd) return; // 有选区时按默认行为删
    const pos = ta.selectionStart;
    const re = /@([\u4e00-\u9fa5\w]+)/g;               // 与高亮层同一条标签规则
    let m;
    while ((m = re.exec(ta.value))) {
      const hit = ev.key === "Backspace"
        ? pos > m.index && pos <= m.index + m[0].length   // 要删的左边那个字属于标签
        : pos >= m.index && pos < m.index + m[0].length;  // 要删的右边那个字属于标签
      if (hit) {
        ev.preventDefault();
        ta.setSelectionRange(m.index, m.index + m[0].length);
        document.execCommand("delete"); // 走原生编辑：input 事件照常触发、Ctrl+Z 还能撤销
        return;
      }
    }
  });

  // @ 提及功能：输入 @ 时弹出卡片选择菜单
  let atMenuEl = null;
  let atMenuStart = -1; // @ 开始的位置

  ta.addEventListener('input', () => {
    // 更新高亮层
    updateHighlight();

    const cursorPos = ta.selectionStart;
    const textBefore = ta.value.substring(0, cursorPos);
    // 匹配 @ 后面的文字（可以是中文、英文、数字）
    const match = textBefore.match(/@([\u4e00-\u9fa5\w]*)$/);

    if (match && !useOpt) {
      const query = match[1].toLowerCase();
      atMenuStart = cursorPos - match[0].length;

      // 构建可引用项列表：卡片 + 卡片的输入素材
      const items = [];

      // 1. 添加所有卡片（素材、文本、风格）
      PROJ.cards.forEach(card => {
        if (card.id === c.id) return; // 排除当前节点
        const isReferable = isAsset(card) || isTextCard(card) || isStyle(card);
        if (!isReferable) return;

        const name = titleOf(card);
        if (!name.toLowerCase().includes(query)) return;

        const def = defOf(card);
        items.push({
          type: 'card',
          card: card,
          name: name,
          icon: def.icon || "◻",
          label: isAsset(card) ? "素材" : isTextCard(card) ? "文本" : "风格",
        });
      });

      // 2. 添加当前卡片的所有输入素材（槽位中的图片/音频/视频）
      const cap = CAPS[runCap(c)] || capOf(c);
      if (cap && cap.inputs) {
        cap.inputs.forEach(s => {
          if (!['image', 'audio', 'video'].includes(s.type)) return;
          const asset = c.assets[s.key];
          if (!asset || !asset.ref) return;

          const slotLabel = slotName(s, c);
          if (!slotLabel.toLowerCase().includes(query)) return;

          items.push({
            type: 'slot',
            key: s.key,
            name: slotLabel,
            icon: s.type === 'image' ? "🖼" : s.type === 'audio' ? "🎵" : "🎬",
            label: "当前素材",
          });
        });
      }

      if (items.length > 0) {
        showAtMenu(ta, items);
      } else {
        hideAtMenu();
      }
    } else {
      hideAtMenu();
    }
  });

  function showAtMenu(textarea, items) {
    hideAtMenu();

    atMenuEl = document.createElement("div");
    atMenuEl.id = "menu"; // 使用现有的菜单样式
    atMenuEl.style.position = "absolute";
    atMenuEl.style.maxHeight = "280px";
    atMenuEl.style.overflowY = "auto";

    items.forEach(item => {
      const btn = document.createElement("button");
      btn.style.cssText = "display: flex; align-items: center; gap: 9px; width: 100%; " +
        "padding: 8px 10px; border-radius: 2px; text-align: left;";

      const icon = document.createElement("span");
      icon.textContent = item.icon;
      icon.style.fontSize = "14px";

      const nameSpan = document.createElement("span");
      nameSpan.textContent = item.name;
      nameSpan.style.flex = "1";

      const typeSpan = document.createElement("span");
      typeSpan.textContent = item.label;
      typeSpan.style.fontSize = "11px";
      typeSpan.style.color = "var(--dim)";

      btn.append(icon, nameSpan, typeSpan);

      btn.onclick = () => {
        // 插入引用名称
        const refName = item.name;
        const before = textarea.value.substring(0, atMenuStart);
        const after = textarea.value.substring(textarea.selectionStart);
        textarea.value = before + `@${refName} ` + after;
        textarea.selectionStart = textarea.selectionEnd = before.length + refName.length + 2;

        // 触发 oninput 保存
        if (useOpt) {
          c.opt[s.key] = textarea.value;
        } else {
          c.params[s.key] = extractUserText(textarea.value);
        }
        sync(); save();
        updateHighlight();   // 程序改 value 不触发 input 事件，高亮层要手动刷

        hideAtMenu();
        textarea.focus();
      };

      atMenuEl.appendChild(btn);
    });

    // 菜单位置：贴着 @ 字符、往**上**弹（跟参考图那种 mention 交互一致）。
    // @ 的屏幕坐标借高亮层当镜子算 —— 层里排版和 textarea 逐像素一致，
    // 在 offset 处立一个 range 就能拿到那个字的方框
    const cr = caretRect(atMenuStart) || (() => {
      const r = textarea.getBoundingClientRect();
      return { left: r.left + 8, top: r.top + 8, bottom: r.top + 28 };
    })();
    document.body.appendChild(atMenuEl);       // 先进 DOM 才量得到高度
    const mw = atMenuEl.offsetWidth, mh = atMenuEl.offsetHeight;
    let mx = cr.left - 6, my = cr.top - mh - 6;  // 6 = 菜单内边距，让选项首字对齐 @
    if (my < 8) my = cr.bottom + 4;              // 顶上放不下才往下弹
    if (mx + mw > innerWidth - 8) mx = innerWidth - 8 - mw;
    if (mx < 8) mx = 8;
    atMenuEl.style.left = mx + "px";
    atMenuEl.style.top = my + "px";

    // 点击外部关闭菜单
    const closeOnOutside = (e) => {
      if (!atMenuEl.contains(e.target) && e.target !== textarea) {
        hideAtMenu();
        document.removeEventListener("mousedown", closeOnOutside);
      }
    };
    setTimeout(() => document.addEventListener("mousedown", closeOnOutside), 0);
  }

  function hideAtMenu() {
    if (atMenuEl) {
      atMenuEl.remove();
      atMenuEl = null;
    }
  }

  // 组装：wrapper 里已经装好 高亮层 + textarea
  wrap.appendChild(highlightWrapper);
  updateHighlight();
  // wrap 这会儿还没进文档 —— promptBlock 的返回值要等调用方去 appendChild。
  // 离屏元素 getComputedStyle 拿到的是初始值（16px 默认字号、零内边距），
  // 现在抄会把高亮层抄岔，行高逐行偏移，文字就糊出边框了。
  // ResizeObserver 挂上就会先触发一次（那时已在文档里、量的是真值），
  // 之后拖输入框右下角改尺寸也会跟着重抄
  const ro = new ResizeObserver(() => {
    syncMetrics();
    highlightLayer.scrollTop = ta.scrollTop;
  });
  ro.observe(ta);
  // textarea 滚动时高亮层跟着滚（overflow:hidden 的层用 scrollTop 程序滚动）
  ta.addEventListener("scroll", () => { highlightLayer.scrollTop = ta.scrollTop; });

  // 悬停预览：textarea 盖在高亮层上面，标签收不到鼠标事件，
  // 所以在 textarea 上用光标坐标反算字符偏移，判断停没停在某个 @标签 里
  let previewEl = null;

  /** 光标位置对应的 @标签：返回它的 DOM 元素（从高亮层里数出来的第 n 个 mark） */
  function mentionAt(x, y) {
    // textarea 文字透明时，caretRangeFromPoint 可能检测不到或返回高亮层节点
    // 改用更直接的方法：检测鼠标下是否有高亮层的 mark 元素
    const marks = highlightLayer.querySelectorAll(".at-mention");
    for (const mark of marks) {
      const rects = mark.getClientRects();
      for (const rect of rects) {
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return mark;
        }
      }
    }
    return null;
  }

  /** 某个字符偏移的屏幕坐标：在高亮层（textarea 的像素级镜像）里立 range 量出来 */
  function caretRect(pos) {
    const texts = [];
    const walker = document.createTreeWalker(highlightLayer, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) texts.push(walker.currentNode);
    let acc = 0, node = null, off = 0;
    for (const t of texts) {
      if (acc + t.length > pos) { node = t; off = pos - acc; break; }
      acc += t.length;
    }
    if (!node) {
      const last = texts[texts.length - 1];
      if (!last) return null;
      node = last; off = last.length;
    }
    const r = document.createRange();
    r.setStart(node, off);
    r.setEnd(node, Math.min(off + 1, node.length));   // 一个字宽，collapsed range 拿不到高度
    const rect = r.getClientRects()[0] || r.getBoundingClientRect();
    return rect.width === 0 && rect.height === 0 ? null : rect;
  }

  ta.addEventListener('mousemove', (ev) => {
    const mark = mentionAt(ev.clientX, ev.clientY);
    ta.style.cursor = mark ? "pointer" : "";
    // 悬停的那个标签加深，其余还原
    highlightLayer.querySelectorAll(".at-mention.mhover")
      .forEach(x => x.classList.remove("mhover"));
    if (mark) mark.classList.add("mhover");
    if (!mark) return hidePreview();

    const name = mark.dataset.name;
    if (!name) return;

    // 查找对应的卡片或槽位
    let previewData = null;

    // 1. 查找卡片
    const targetCard = PROJ.cards.find(card => titleOf(card) === name);
    if (targetCard) {
      const outputs = targetCard.outputs || [];
      if (outputs.length > 0) {
        previewData = { type: outputs[0].kind, url: outputs[0].url, name: titleOf(targetCard) };
      } else if (isTextCard(targetCard) || isStyle(targetCard)) {
        previewData = { type: 'text', text: textOf(targetCard) || '(空)', name: titleOf(targetCard) };
      }
    }

    // 2. 查找当前节点的输入槽位
    if (!previewData) {
      const cap = CAPS[runCap(c)] || capOf(c);
      if (cap && cap.inputs) {
        const slot = cap.inputs.find(s => slotName(s, c) === name);
        if (slot && c.assets[slot.key]) {
          previewData = { type: slot.type, url: c.assets[slot.key].url, name };
        }
      }
    }

    if (previewData) showPreview(mark, previewData);
    else hidePreview();
  });

  ta.addEventListener('mouseleave', hidePreview);
  // textarea 滚了高亮层必须跟着滚（overflow:hidden 也能程序滚动），
  // 不然文字滚走了标签还停在顶上 —— 看起来就是标签和文本错位、两个都看得见
  ta.addEventListener('scroll', () => {
    highlightLayer.scrollTop = ta.scrollTop;
    highlightLayer.scrollLeft = ta.scrollLeft;
    hidePreview();
  });

  let previewName = null;   // 正在显示的标签名：同名不重建，鼠标滑动才不闪
  function showPreview(anchor, data) {
    if (previewEl && previewName === data.name) return;
    hidePreview();
    previewName = data.name;

    previewEl = document.createElement("div");
    previewEl.className = "at-mention-preview";
    previewEl.style.cssText = `
      position: fixed; z-index: 100; background: #060a14f7; border: 1px solid var(--acc);
      border-radius: 3px; padding: 8px; box-shadow: 0 12px 36px #000d, 0 0 18px #00e5ff2e;
      backdrop-filter: blur(6px); max-width: 320px; pointer-events: none;
    `;

    const title = document.createElement("div");
    title.style.cssText = "font-size: 11px; color: var(--acc); margin-bottom: 6px; letter-spacing: 1px;";
    title.textContent = data.name;
    previewEl.appendChild(title);

    if (data.type === 'image') {
      const img = document.createElement("img");
      img.src = data.url;
      img.style.cssText = "max-width: 300px; max-height: 200px; display: block; border-radius: 2px;";
      previewEl.appendChild(img);
    } else if (data.type === 'video') {
      const video = document.createElement("video");
      video.src = data.url;
      video.style.cssText = "max-width: 300px; max-height: 200px; display: block; border-radius: 2px;";
      video.muted = true;
      video.autoplay = true;
      video.loop = true;
      previewEl.appendChild(video);
    } else if (data.type === 'audio') {
      const audio = document.createElement("div");
      audio.textContent = "🎵 " + data.name;
      audio.style.cssText = "padding: 12px; color: var(--txt); text-align: center;";
      previewEl.appendChild(audio);
    } else if (data.type === 'text') {
      const text = document.createElement("div");
      text.textContent = data.text.substring(0, 200) + (data.text.length > 200 ? '...' : '');
      text.style.cssText = "color: var(--txt); font-size: 12px; line-height: 1.6; max-height: 150px; overflow: hidden;";
      previewEl.appendChild(text);
    }

    // 定位：在 mark 下方
    const rect = anchor.getBoundingClientRect();
    previewEl.style.left = rect.left + "px";
    previewEl.style.top = (rect.bottom + 4) + "px";

    document.body.appendChild(previewEl);
  }

  function hidePreview() {
    previewName = null;
    if (previewEl) {
      previewEl.remove();
      previewEl = null;
    }
  }

  const sync = () => {
    // 示例文案警告：清空了默认文案才算
    const isDemo = !useOpt && !!s.default && ta.value.trim() === String(s.default).trim();
    tag.style.display = isDemo ? "" : "none";
    ta.classList.toggle("isdemo", isDemo);
    highlightLayer.classList.toggle("demo", isDemo);   // 文字色由高亮层出，同步打给层
  };

  // 从输入框内容中提取用户自己的文本
  // 引用内容在上方，用户文本在所有引用内容之后
  // 通过计算引用内容的总长度来分离
  const extractUserText = (text) => {
    if (!text) return '';
    if (!totalTexts) return text.trim(); // 没有引用，全是用户文本

    // 计算引用部分的完整内容
    const refParts = [];
    if (styles.length > 0) {
      styles.forEach(st => refParts.push(st));
    }
    if (texts.length > 0) {
      texts.forEach(t => refParts.push(t.text));
    }
    const refContent = refParts.join('\n\n');

    // 如果文本以引用内容开头，提取后面的用户文本
    if (text.startsWith(refContent)) {
      const userText = text.substring(refContent.length).trim();
      // 去掉开头的换行
      return userText.replace(/^\n+/, '');
    }

    // 如果文本不是以引用内容开头（用户可能修改了引用部分），
    // 则尝试找到引用内容的结束位置
    return text.trim();
  };

  // 改哪个页签写回哪一份。优化后的也让改 —— 模型偶尔会漏个标签、多写一句，
  // 让人当场补掉比重跑一轮二十秒划算
  ta.oninput = () => {
    if (useOpt) {
      c.opt[s.key] = ta.value;
    } else {
      // 只保存用户自己的文本，引用内容不保存（提交时会通过 withStyle 自动合并）
      c.params[s.key] = extractUserText(ta.value);
    }
    sync(); save();
  };
  sync();

  // 提示词底部工具条：模型选择 + 翻译 + 清空 + 优化（左→右）
  if (canOpt || !useOpt) {
    const toolbar = document.createElement("div"); toolbar.className = "ptoolbar";
    const busy = !!c._rwBusy;

    // 左：模型选择（存在 c.params._promptModel，默认 api）
    const curModel = c.params._promptModel || "api";
    const modelBtn = document.createElement("button");
    modelBtn.className = "tbtool model";
    const modelLabel = document.createElement("span");
    modelLabel.textContent = curModel === "local" ? "🖥 本地" : "☁ 云端";
    const modelArrow = document.createElement("i");
    modelArrow.textContent = "▾";
    modelBtn.append(modelLabel, modelArrow);
    modelBtn.title = "模型 —— 点击换";
    modelBtn.onclick = (ev) => {
      ev.stopPropagation();
      const r = modelBtn.getBoundingClientRect();
      showMenu(r.left, r.bottom + 4, "模型", [
        { icon: "☁", text: "云端 API —— 几秒就回，要配好 llm.json",
          run: () => { c.params._promptModel = "api"; save(); repanel(c); } },
        { icon: "🖥", text: "本地 27B —— 不花钱，占显存，第一次慢",
          run: () => { c.params._promptModel = "local"; save(); repanel(c); } },
      ]);
    };
    toolbar.appendChild(modelBtn);

    // 中：翻译按钮（走有道 API，不需要模型参数）
    const trBtn = document.createElement("button");
    trBtn.className = "tbtool";
    trBtn.textContent = "🌐 翻译";
    trBtn.disabled = busy;
    trBtn.title = "中→英 / 英→中 自动判断（有道翻译）";
    trBtn.onclick = () => doTranslate(c, s);
    toolbar.appendChild(trBtn);

    // 右侧区域：清空 + 优化（紧贴在一起）
    // 创建一个包裹右侧按钮的容器
    const rightGroup = document.createElement("div");
    rightGroup.style.cssText = "display: flex; gap: 4px; margin-left: auto;";

    // 清空按钮
    const clr = document.createElement("button");
    clr.className = "tbtool";
    clr.textContent = useOpt ? "扔掉这份" : "清空";
    clr.title = useOpt ? "删掉优化结果，切回你自己写的原词（原词一直没被动过）" : "清空提示词";
    clr.onclick = () => {
      // 在「优化后」页签上，"清空"唯一有意义的解释是"这份不要了" —— 留一个空的
      // 优化结果在那儿只会让人对着一个空框发愣。原词那份一直没被动过，直接切回去
      if (useOpt) {
        delete c.opt[s.key]; delete c.optUse[s.key];
        if (c.optStyle) delete c.optStyle[s.key];
        save(); return repanel(c);
      }
      // 清空用户文本，但保留引用内容（不带标签）
      c.params[s.key] = "";
      if (!useOpt && totalTexts > 0) {
        const parts = [];
        // 重新构建引用部分（只有内容）
        if (styles.length > 0) {
          styles.forEach(st => {
            parts.push(st);
          });
        }
        if (texts.length > 0) {
          texts.forEach(t => {
            parts.push(t.text);
          });
        }
        ta.value = parts.join('\n\n');
      } else {
        ta.value = "";
      }
      sync(); ta.focus(); save();
    };
    rightGroup.appendChild(clr);

    // 优化按钮（只在可优化时显示）
    if (canOpt) {
      const optBtn = document.createElement("button");
      optBtn.className = "tbtool opt";
      optBtn.textContent = busy ? "⏳ 优化中…" : "✨ 优化";
      optBtn.disabled = busy;
      optBtn.title = "优化提示词：融入风格、补充细节"
        + (opt ? "\n已有优化结果，再点会覆盖" : "")
        + "\n接入的文本节点会一起融进结果";
      optBtn.onclick = () => doRewrite(c, s, curModel);
      rightGroup.appendChild(optBtn);
    }

    toolbar.appendChild(rightGroup);
    wrap.appendChild(toolbar);
  }

  if (c._rwErr && c._rwErr.key === s.key) {
    const e = document.createElement("div"); e.className = "rwerr";
    e.textContent = "操作失败：" + c._rwErr.msg;
    wrap.appendChild(e);
  }
  return wrap;
}

/** 「优化」按钮：云端 API 和本地 27B 拆成两个，点哪个用哪个，不自动换。
    已经优化过再点就是「重新优化」（换个种子再跑一遍，覆盖旧的那份）。 */
function optBtn(c, s, done) {
  const wrap = document.createElement("span");
  wrap.style.cssText = "display:flex;gap:2px";
  const busy = !!c._rwBusy;
  for (const [model, label, tip] of [
    ["api", "☁ 优化", "云端 API（llm.json 里配的那家）：几秒就回、不占显存、ComfyUI 不用开。"
      + "没配好会直接报错，不会偷偷换本地"],
    ["local", "🖥 优化", "本地 27B：不花钱，但要占显存、排 ComfyUI 的队，"
      + "第一次加载好几分钟"],
  ]) {
    const b = document.createElement("button"); b.className = "rwbtn";
    b.textContent = busy ? "优化中…" : label;
    b.disabled = busy;
    b.title = tip
      + (done ? "\n已经有优化结果了：再点一次是重新优化，覆盖旧的那份" : "")
      + "\n接入的文本节点会一起融进优化结果里"
      + "\n原词不会被动，优化完多一个页签，用哪份你选";
    b.onclick = () => doRewrite(c, s, model);
    wrap.appendChild(b);
  }
  return wrap;
}

/** 原词 / 优化后 两个页签。选中哪个，生成时就提交哪个。 */
function optTabs(c, s, useOpt) {
  const strip = document.createElement("div"); strip.className = "opttabs";
  const mk = (on, text, title) => {
    const b = document.createElement("button");
    b.className = on ? "on" : ""; b.textContent = text; b.title = title;
    b.onclick = () => {
      c.optUse = c.optUse || {};
      c.optUse[s.key] = (text !== "原词");
      save(); repanel(c);
    };
    return b;
  };
  // 风格是烙进优化结果里的，不会跟着风格节点变。所以对比一下"优化时挂的"和"现在挂的"
  const cur = styleTexts(c).join("\n\n");
  const was = (c.optStyle && c.optStyle[s.key]) || "";
  const stale = cur !== was;
  strip.append(
    mk(!useOpt, "原词", "你自己写的那段。生成时"
      + (cur ? "会在前面拼上接入的文本节点" : "原样提交")),
    mk(useOpt, "✨优化后", "大模型优化出来的那段，已经是这个模型认的格式。"
      + (was ? "\n接入的文本已经融在里面了，生成时不再另外拼" : "")
      + "\n原样提交"));

  const note = document.createElement("span"); note.className = "note";
  if (!useOpt) {
    note.textContent = cur ? "提交时会拼上接入的文本" : "";
  } else if (stale) {
    // 这三种都是"优化结果里的风格已经不是现在这个风格节点了"，不说出来风格就静悄悄地错了
    note.className = "note bad";
    note.textContent = "⚠ " + (!was ? "风格节点是优化之后挂的，这份里没有它"
      : !cur ? "风格节点摘了，这份里还留着它" : "风格节点换过了，这份里还是旧的")
      + " —— 点「重新优化」";
    note.title = "优化结果是一段写死的文字，风格在优化那一刻就烙进去了，"
      + "之后改风格节点不会让它跟着变。要么重新优化一次，要么切回「原词」。";
  } else {
    note.textContent = cur ? "已含接入的文本，提交时不再另拼" : "按模型认的格式写好了，原样提交";
  }
  strip.appendChild(note);
  return strip;
}

/** 重画面板，但只在它确实开着这个节点的时候 —— 优化要等好一会儿，
    这中间用户可能已经关了面板、或去看别的节点了，别硬把面板抢回来。 */
const repanel = (c) => { if (el.panel._id === c.id) openPanel(c.id); };

/** 优化完那句提示。要说清**走的哪条路** —— 一次几秒（API）和一次几分钟
    （本地 27B 要把 14 GB 挤进显存）差着两个数量级，不说的话用户只会觉得
    "这功能时快时慢"，也不知道 llm.json 到底生效了没有。
    r.fallback 有值 = API 试过没通，那句原因必须露出来（key 填错、余额不足、
    超时是完全不同的处理），否则他只能来问我。 */
function rwToast(r) {
  const t = r.ms >= 60000
    ? `${Math.floor(r.ms / 60000)} 分 ${Math.round(r.ms % 60000 / 1000)} 秒`
    : `${(r.ms / 1000).toFixed(1)} 秒`;
  const how = r.fallback ? `⚠ API 没通（${r.fallback}），本地 27B 兜的`
    : r.via === "api" ? `✅ API 改的（${r.model || "远程"}）`
      : "✅ 本地 27B 改的";
  return `${how}，${t}` + (r.warn ? "\n⚠ " + r.warn : "");
}

/** 把提示词交给大模型改一遍，结果存成这一格的「优化后」那份。
    先走 API（几秒），不通再落本地 27B —— 本地那条走 ComfyUI 队列、跟出图抢显存，
    前面有活儿还得排队，界面上就是按钮一直显示「优化中…」。 */
/** 翻译提示词（中→英 / 英→中），调用有道翻译 API */
async function doTranslate(c, s) {
  // 防止重复点击：已经在跑就不要再发请求
  if (c._rwBusy) return toast("翻译正在进行中，请稍候");
  // 根据当前选中的 tab 决定翻译哪个版本：优化后 or 原文
  const useOpt = !!(c.optUse && c.optUse[s.key]);
  const src = useOpt && c.opt && c.opt[s.key]
    ? String(c.opt[s.key])
    : String(c.params[s.key] != null ? c.params[s.key] : (s.default || ""));
  if (!src.trim()) return toast("先写点内容再翻译");
  c._rwBusy = true; c._rwErr = null;
  repanel(c);
  try {
    const r = await jpost("/api/text", {
      op: "translate", model: "youdao",
      inputs: [{ name: "原文", text: src }], params: {},
      project: PROJ && PROJ.id, card: c.id, cardName: titleOf(c),
    });
    // 翻译结果写回当前选中的版本
    if (useOpt) {
      c.opt = c.opt || {};
      c.opt[s.key] = r.text;
    } else {
      c.params[s.key] = r.text;
    }
    save();
    c._rwBusy = false; repanel(c);
    toast(`翻译完成 · ${(r.ms / 1000).toFixed(1)} 秒 · 有道翻译`
      + (r.warn ? `\n${r.warn}` : ""));
  } catch (e) {
    c._rwBusy = false;
    c._rwErr = { key: s.key, msg: e.message };
    repanel(c);
    toast("翻译失败：" + e.message);
  }
}

/** 解析提示词中的 @卡片名，替换为模型能理解的标签
    @素材节点1 → <Picture 1>
    @文本卡1 → 文本卡的内容
    @风格卡1 → 风格卡的内容
    @图片 → <Picture N>（当前节点的输入槽位） */
function resolveCardMentions(prompt, card) {
  if (!prompt || !PROJ) return prompt;

  const cap = CAPS[runCap(card)] || capOf(card);
  if (!cap) return prompt;

  // 构建映射：卡片名/槽位名 → 槽位标签（<Picture N> / <Audio N> / <Video N>）
  const slotMap = new Map();
  let picIdx = 1, audIdx = 1, vidIdx = 1;

  // 遍历所有输入槽位
  for (const s of (cap.inputs || [])) {
    const asset = card.assets[s.key];
    if (!asset || !asset.ref) continue;

    // 1. 如果槽位有素材，先按槽位标签映射（图片、场景等）
    const slotLabel = slotName(s, card);
    if (s.type === 'image') {
      slotMap.set(slotLabel, `<Picture ${picIdx}>`);
    } else if (s.type === 'audio') {
      slotMap.set(slotLabel, `<Audio ${audIdx}>`);
    } else if (s.type === 'video') {
      slotMap.set(slotLabel, `<Video ${vidIdx}>`);
    }

    // 2. 找到这个素材来自哪个卡片（通过 URL 或文件名匹配）
    const sourceCard = PROJ.cards.find(c =>
      (c.outputs || []).some(o =>
        (o.url && asset.url && o.url === asset.url) ||
        (o.filename && asset.filename && o.filename === asset.filename)
      )
    );

    if (sourceCard) {
      const cardName = titleOf(sourceCard);
      if (s.type === 'image') {
        slotMap.set(cardName, `<Picture ${picIdx}>`);
        picIdx++;
      } else if (s.type === 'audio') {
        slotMap.set(cardName, `<Audio ${audIdx}>`);
        audIdx++;
      } else if (s.type === 'video') {
        slotMap.set(cardName, `<Video ${vidIdx}>`);
        vidIdx++;
      }
    } else {
      // 如果找不到来源卡片，仅按类型递增索引
      if (s.type === 'image') picIdx++;
      else if (s.type === 'audio') audIdx++;
      else if (s.type === 'video') vidIdx++;
    }
  }

  // 替换 @引用
  return prompt.replace(/@([\u4e00-\u9fa5\w]+)/g, (match, name) => {
    // 先检查是否是槽位标签或素材来源卡片
    const slotTag = slotMap.get(name);
    if (slotTag) return slotTag;

    // 检查是否是文本卡或风格卡（直接展开内容）
    const targetCard = PROJ.cards.find(c => titleOf(c) === name);
    if (targetCard && (isTextCard(targetCard) || isStyle(targetCard))) {
      const text = textOf(targetCard);
      return text || match; // 有内容就展开，没有保持原样
    }

    // 找不到就保持原样（可能用户还没创建这个卡片）
    return match;
  });
}

/** 构建卡片信息映射，用于传递给后端（让后端知道 <Picture N> 对应哪个卡片名）*/
function buildCardInfo(card) {
  const info = {};
  const cap = CAPS[runCap(card)] || capOf(card);
  if (!cap) return info;

  for (const s of (cap.inputs || [])) {
    const asset = card.assets[s.key];
    if (!asset || !asset.ref) continue;

    // 尝试找到素材来源卡片
    const sourceCard = PROJ.cards.find(c =>
      (c.outputs || []).some(o =>
        (o.url && asset.url && o.url === asset.url) ||
        (o.filename && asset.filename && o.filename === asset.filename)
      )
    );

    // 如果找到来源卡片，记录卡片名；否则记录槽位标签
    if (sourceCard) {
      info[s.key] = titleOf(sourceCard);
    } else {
      info[s.key] = slotName(s, card);
    }
  }

  return info;
}

async function doRewrite(c, s, model) {
  const cap = CAPS[runCap(c)] || capOf(c);
  if (!cap || !cap.rewrite) return;
  // 防止重复点击：已经在跑就不要再发请求
  if (c._rwBusy) return toast("优化正在进行中，请稍候");
  // 拿的一定是**原词**：优化的输入永远是用户自己写的那段，不是上一轮的优化结果
  // （拿优化结果再优化会一轮轮越写越长，最后跟用户想要的没关系了）
  const src = String(c.params[s.key] != null ? c.params[s.key] : (s.default || ""));
  const styles = styleTexts(c);
  // 只要有用户文本或引用内容，就可以优化
  if (!src.trim() && !styles.length) return toast("先写一句你想要什么，优化才有东西可改");

  // **解析 @引用**：将 @卡片名 替换为 <Picture N> 等标签
  const resolvedPrompt = resolveCardMentions(src, c);

  const pl = payloadOf(c);
  c._rwBusy = true; c._rwErr = null;
  repanel(c);
  try {
    // prompt 是解析后的词，接入的文本另外给 —— 让模型把文本融进输出里。用户选「优化后」时
    // 提交的就是这份输出原样，系统不再拼文本节点（payloadOf），所以必须融进去
    const r = await jpost("/api/rewrite", {
      capability: cap.id, params: pl.params, assets: pl.assets,
      prompt: resolvedPrompt,  // 使用解析后的提示词
      style: styles.join("\n\n"), model: model || "auto",
      cardInfo: buildCardInfo(c),  // 传递卡片信息映射
      project: PROJ && PROJ.id, card: c.id, cardName: titleOf(c),
    });
    // 调试：打印完整的返回数据
    console.log("=== /api/rewrite 返回数据 ===");
    console.log(JSON.stringify(r, null, 2));
    console.log("=== r.text 内容 ===");
    console.log(r.text);
    console.log("=========================");

    // 过滤掉思考标签及其之前的所有内容
    let cleanedText = r.text || '';
    cleanedText = cleanedText.replace(/^[\s\S]*?<\/think>/i, '');
    cleanedText = cleanedText.replace(/^[\s\S]*?<\/thinking>/i, '');
    cleanedText = cleanedText.replace(/^[\s\S]*?<\/thought>/i, '');
    cleanedText = cleanedText.trim();

    c.opt = c.opt || {}; c.optUse = c.optUse || {}; c.optStyle = c.optStyle || {};
    c.opt[s.key] = cleanedText;
    c.optUse[s.key] = true;             // 跑完直接切过去，不然还得再点一下才看得见
    // 记下这份优化是配着哪段风格跑出来的。之后风格节点换了/摘了/新挂了，
    // 优化结果**不会**跟着变（风格是烙在文字里的），页签那儿要能说出来
    c.optStyle[s.key] = styles.join("\n\n");
    save();
    toast(rwToast(r));
  } catch (e) {
    c._rwErr = { key: s.key, msg: e.message };
  }
  c._rwBusy = false;
  repanel(c);
}

/** 作者调好的规范（漫剧那份剧本格式规范就是）：默认折起来。
    它字段类型跟提示词一样，但里面是规则不是内容 —— 改它是换出片结构，
    所以不能跟提示词并排摆着等人顺手覆盖。清空更糟：节点会退回自带预设，
    分镜数量和硬切规则一起没了。 */
function templateBlock(c, s) {
  const wrap = document.createElement("div"); wrap.className = "tpl";
  const hd = document.createElement("button"); hd.className = "tplhd";
  const inner = document.createElement("div"); inner.style.display = "none";

  const ta = document.createElement("textarea");
  ta.value = c.params[s.key] != null ? c.params[s.key] : (s.default || "");
  const sync = () => {
    const dirty = ta.value.trim() !== String(s.default || "").trim();
    const open = inner.style.display !== "none";
    hd.textContent = `${open ? "▾" : "▸"} ${s.label}`
      + (dirty ? "（已被改过，出片结构可能跑偏）" : "（预设，默认不用动）");
    hd.classList.toggle("dirty", dirty);
    rst.style.display = dirty ? "" : "none";
  };
  hd.onclick = () => { inner.style.display = inner.style.display === "none" ? "" : "none"; sync(); };

  const note = document.createElement("div"); note.className = "tplnote";
  note.textContent = "⚠ " + (s.note || "预设参数，改了会影响出片。");
  const rst = document.createElement("button"); rst.className = "tplrst";
  rst.textContent = "恢复预设";
  rst.onclick = () => { ta.value = s.default || ""; c.params[s.key] = ta.value; sync(); save(); };
  ta.oninput = () => { c.params[s.key] = ta.value; sync(); save(); };

  inner.append(note, ta, rst);
  sync();
  wrap.append(hd, inner);
  return wrap;
}
function paintTitle(c) {
  if (!c._el) return;
  const t = c._el.querySelector(".ch .t");
  t.textContent = titleOf(c);
  t.classList.toggle("named", !!c.name);
  paintKind(c);
  paintPort(c);
}

/** 节点脚最左边那枚徽标：这个节点出图还是出视频。
    节点图标（🧩 工具、✨ 画质增强）和用户自己改的节点名都可能完全看不出类型，
    产物出来之前画面区又是空的 —— 所以类型要有个固定位置常驻，不靠猜。
    路由节点还没放素材时两路都可能，标「跟素材」；放进去那一刻 paintTitle 会重刷。
    跟着 paintTitle 一起刷：换模式、换路由、按张数换能力都会改产出类型。 */
function paintKind(c) {
  const k = c._el && c._el.querySelector(".cf .kt");
  if (!k) return;
  // 风格节点不出东西，徽标位上说清它是干什么的 —— 不然它长得跟别的节点一样，
  // 只是一直"待生成"，会有人反复去点运行
  if (isStyle(c)) {
    k.dataset.kind = "style";
    k.textContent = "🎨 只加提示词";
    k.title = "这个节点不生成任何东西：把它的出口拖到生图/生视频节点上，"
      + "提交时这段风格会并进那个节点的提示词";
    return;
  }
  if (isText(c)) {
    k.style.display = "";
    k.dataset.kind = "text";
    k.textContent = "✍ 文本";
    k.title = textOp(c)
      ? "选了加工方式：点「↑ 运行」把接进来的文本加工后写回这个节点"
      : "存一段文字：连到生成节点就并进提示词，连到别的文本节点就当它的输入；"
        + "在面板里选加工方式可以让大模型来加工";
    return;
  }
  // 素材节点报的是「手里这份是什么」，不是「会出什么」——它不生成东西。
  // 节点定义里写死 outputType: image，照 outKindOf 读会把一段视频说成图片
  if (isAsset(c)) {
    const a = assetOf(c);
    k.style.display = "";
    k.dataset.kind = a ? a.kind : "both";
    // 徽标文字：类型 + 原始分辨率（有的话）
    const res = (a && a.width && a.height) ? ` ${a.width}×${a.height}` : "";
    k.textContent = a ? `📎 ${KIND_ZH[a.kind] || a.kind}${res}` : "📎 空的";
    k.title = a ? `${a.origin || ""}\n把右边的出口拖到别的节点 → 这份素材就进那个节点的格子里`
      : "点这个节点选一个文件（图片 / 视频 / 音频都收）";
    const body0 = c._el.querySelector(".body");
    if (!a && body0 && body0.querySelector(".ph")) body0.innerHTML = phHTML(c);
    return;
  }
  const md = modeOf(c);
  const undecided = kindUndecided(c);
  const kind = outKindOf(c);
  k.dataset.kind = undecided ? "both" : kind;
  // 徽标文字：类型 + 分辨率（有产物且是图片/视频时显示）
  const out = (c.outputs || [])[0];
  const res = (out && (out.width && out.height)) ? ` ${out.width}×${out.height}` : "";
  k.textContent = undecided ? "🖼🎬 跟素材" : kind === "video" ? `🎬 视频${res}` : `🖼 图片${res}`;
  const inputs = ((capOf(c) || {}).inputs || []).filter(s => MEDIA.includes(s.type));
  const ins = md && md.route ? Object.keys(md.route) : [...new Set(inputs.map(s => s.type))];
  const required = [...new Set(inputs.filter(s => s.required).map(s => s.type))];
  k.title = (undecided ? "放图片就出图片、放视频就出视频" : `这个节点出${KIND_ZH[kind]}`)
    + (required.length ? `；必需${required.map(x => KIND_ZH[x] || x).join(" / ")}素材`
      : ins.length ? `；可引用${ins.map(x => KIND_ZH[x] || x).join(" / ")}素材` : "；不用素材");
  // 还没出过产物时画面区那个大图标也是同一个信息，一起换掉（有产物就别动它）。
  // 文本节点的空态是一整块提示（图标＋引导字），交给 paint() 画，这里别只换图标
  const body = c._el.querySelector(".body");
  if (!isTextCard(c) && body && body.querySelector(".ph")) body.innerHTML = phHTML(c);
}

/** 左边那颗绿点：这个节点收得下上游产物。纯文生图没有素材槽，不画点 ——
    画了就是在说"往这儿接"，接过去只会弹"没有可接收的槽位"。
    路由节点按它两路的类型报（图片/视频都收），不管当前切到了哪一路。
    跟着 paintTitle 一起刷，因为换模式、换路由都会改能力，能收什么也跟着变。 */
function paintPort(c) {
  const p = c._el && c._el.querySelector(".inport");
  if (!p) return;
  const md = modeOf(c), cap = capOf(c);
  // 素材节点不收任何输入：左边那颗绿点不画，不然会有人去拖线进来（linkTo 会拒绝）
  if (isAsset(c)) { p.style.display = "none"; return; }
  // 能接文本节点的也点这颗点：不然用户不知道往哪儿拖那根线
  const styleOk = !isTextCard(c) && promptSpecs(cap).length;
  // 文本节点收 @text（多根，当加工输入）；风格节点不收任何输入
  const textIn = isText(c);
  const kinds = md && md.route ? Object.keys(md.route)
    : [...new Set((cap ? cap.inputs : []).filter(s => MEDIA.includes(s.type)).map(s => s.type))];
  p.style.display = (kinds.length || styleOk || textIn) ? "" : "none";
  p.title = textIn
    ? "文本节点的出口拖到这里：接进来的文字都是这段加工的输入（按连线顺序）"
    : kinds.length
      ? `上游节点的产物拖到这里（收${kinds.map(k => KIND_ZH[k] || k).join(" / ")}${styleOk ? "，也收文本节点" : ""}）`
      : "文本节点的出口拖到这里";
}

/** 素材引用按需显示：只有已经引用的素材才画卡片；下面的添加按钮直接打开文件选择，
    取消选择不会留下空槽。每种类型同时标出上限，连线和手动上传共用同一套限制。 */
function referenceSlots(c, specs, md) {
  const cap = capOf(c);
  const wrap = document.createElement("div"); wrap.className = "slots refs";
  const filled = specs.filter(s => (c.assets || {})[s.key]);
  const route = md && md.route;
  const kinds = [...new Set(specs.map(s => s.type))];

  const head = document.createElement("div"); head.className = "refhead";
  if (route) {
    head.textContent = "引用上限：素材 1 个";
  } else {
    const limits = [];
    for (const kind of kinds) {
      const max = mediaLimit(cap, kind);
      if (max) limits.push(`${KIND_ZH[kind] || kind} ${max}`);
    }
    head.textContent = `引用上限：${limits.join(" · ")}`;
  }
  wrap.appendChild(head);
  for (const s of filled) wrap.appendChild(slotEl(c, s));

  const adds = document.createElement("div"); adds.className = "refadds";
  if (route) {
    if (!filled.length && specs.length) {
      const b = document.createElement("button"); b.className = "refadd";
      b.textContent = "＋ 添加素材（0/1）";
      b.title = "可引用图片或视频，上限 1 个";
      b.onclick = () => pickFile(c, specs[0]);
      adds.appendChild(b);
    }
  } else {
    for (const kind of kinds) {
      const max = mediaLimit(cap, kind);
      const count = filled.filter(s => s.type === kind).length;
      const next = specs.find(s => s.type === kind && !(c.assets || {})[s.key]);
      if (!max || count >= max || !next) continue;
      const b = document.createElement("button"); b.className = "refadd";
      b.textContent = `＋ 添加${KIND_ZH[kind] || kind}（${count}/${max}）`;
      b.title = `${KIND_ZH[kind] || kind}引用上限 ${max}`;
      b.onclick = () => pickFile(c, next);
      adds.appendChild(b);
    }
  }
  if (adds.childElementCount) wrap.appendChild(adds);
  return wrap;
}

function slotEl(c, s) {
  const a = c.assets[s.key];
  const d = document.createElement("div");
  d.className = "slot" + (a ? " filled" : s.required ? " req" : "");
  d.title = (s.hint || slotName(s, c)) + (s.required ? "（必填）" : "");
  d.innerHTML = `<div class="box"></div><span class="lbl"></span>`;
  d.querySelector(".lbl").textContent = slotName(s, c);
  const box = d.querySelector(".box");
  if (a) {
    box.innerHTML = a.kind === "image" ? `<img src="${a.url}" draggable="false">`
      : a.kind === "video" ? `<video src="${a.url}" muted draggable="false"></video>` : `🎵`;
  } else box.textContent = s.type === "audio" ? "🎵"
    : s.type === "video" ? "🎬" : gridWord(s) ? "田" : "＋";
  d.onclick = () => pickFile(c, s);
  d.oncontextmenu = (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    if (!a) return;
    // 以前右键直接就把这一格清了，手滑一下素材就没了，还跟"右键=看菜单"的直觉相反
    showMenu(ev.clientX, ev.clientY, a.origin || slotName(s, c), [
      { icon: "⛶", text: a.kind === "image" ? "查看大图" : "放大播放", run: () => openAsset(a) },
      { icon: "📁", text: "定位文件", run: () => revealAsset(a) },
      {
        icon: "✕", text: "清空这一格", danger: true, run: () => {
          delete c.assets[s.key];
          detachSlotEdges(c.id, s.key);
          paintKind(c);
          drawWires(); paintStyles(); openPanel(c.id); save();
        },
      },
    ]);
  };
  return d;
}

/* 时间码只发「分:秒」的整秒形式。上游 AudioCrop 是 60*int(分)+int(秒) 硬解的：
   写 "1:02:03" 它只看前两段、写 "5.5" 它按 5 秒算，两种都不报错，静默裁错一段。
   分可以超过 59（"75:03" 就是 75 分 3 秒），它自己会乘 60。 */
const tsec = (v) => {
  const p = String(v == null ? "" : v).split(":");
  const n = p.length > 1 ? (+p[0]) * 60 + (+p[1]) : +p[0];
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
};
const tstr = (n) => `${Math.floor(n / 60)}:${String(Math.round(n) % 60).padStart(2, "0")}`;

/** 音频选区：一条能试听、能拖的条子，代替「音频起点 / 音频终点」那两个文本框。
    传进来的音频往前有几秒废话、副歌从第几秒起，这些只能听出来，填数字填不出来。
    上面那对手柄拖选段，点条子本身是把播放位置挪过去听，两件事不抢同一个手势。 */
function audioRange(c, slot, sSpec, eSpec) {
  const d = document.createElement("div"); d.className = "arange";
  const ttl = document.createElement("div"); ttl.className = "atitle";
  ttl.textContent = "用音频的哪一段";
  d.appendChild(ttl);

  const a = c.assets[slot.key];
  if (!a) {
    const n = document.createElement("div"); n.className = "anote";
    n.textContent = `先在上面的「${slotName(slot, c)}」传一段音频，这里就能试听、拖着选要用的一段。`;
    d.appendChild(n);
    return d;
  }

  const au = document.createElement("audio");
  au.src = a.url; au.preload = "metadata";
  d.appendChild(au);

  const bar = document.createElement("div"); bar.className = "atrack";
  bar.innerHTML = `<div class="asel"></div><div class="ahead"></div>`
    + `<div class="ahd s" title="拖动：选段从这里开始"></div>`
    + `<div class="ahd e" title="拖动：选段到这里结束"></div>`;
  const sel = bar.querySelector(".asel"), head = bar.querySelector(".ahead");
  const hs = bar.querySelector(".ahd.s"), he = bar.querySelector(".ahd.e");
  d.appendChild(bar);

  const out = document.createElement("div"); out.className = "aout";
  d.appendChild(out);
  const btns = document.createElement("div"); btns.className = "abtn";
  d.appendChild(btns);
  const note = document.createElement("div"); note.className = "anote";
  note.textContent = "点条子上任意位置就从那儿开始听；听到该起／该停的地方，按下面两个按钮把边界钉在那里。";
  d.appendChild(note);

  let st = tsec(c.params[sSpec.key] != null ? c.params[sSpec.key] : sSpec.default);
  let en = tsec(c.params[eSpec.key] != null ? c.params[eSpec.key] : eSpec.default);
  // 元数据还没到时先按选区自己撑出个长度，不然除以 0，条子画不出来
  const dur = () => Math.floor(au.duration) || Math.max(en, 1);

  function setRange(ns, ne) {
    const D = dur();
    ns = Math.max(0, Math.min(Math.round(ns), D - 1));
    // 至少留 1 秒：AudioCrop 遇到 start >= end 是直接抛 ValueError 整条任务红掉
    ne = Math.max(ns + 1, Math.min(Math.round(ne), D));
    if (ns === st && ne === en) return render();
    st = ns; en = ne;
    c.params[sSpec.key] = tstr(st); c.params[eSpec.key] = tstr(en);
    render(); save();
  }
  // 换了条更短的音频时，把超出真实长度的选区收回来。默认终点 0:05 撞上 3 秒的素材，
  // 面板上还写着 0:05 而实际只裁到 0:03，那 2 秒的差就成了没法解释的怪事
  au.onloadedmetadata = () => setRange(st, en);

  let stopAt = 0;
  const playFrom = (t, until) => { stopAt = until; au.currentTime = t; au.play(); };
  au.ontimeupdate = () => { if (stopAt && au.currentTime >= stopAt) au.pause(); render(); };
  au.onplay = au.onpause = au.onended = () => render();

  const mk = (txt, title, fn) => {
    const b = document.createElement("button");
    b.textContent = txt; b.title = title; b.onclick = fn;
    btns.appendChild(b); return b;
  };
  const play = mk("▶ 试听选段", "只放选中的这一段", () => au.paused ? playFrom(st, en) : au.pause());
  mk("▶ 整条", "从头放到尾，用来找该从哪儿起", () => playFrom(0, 0));
  mk("⇤ 起点钉在这", "把选段开头挪到当前播放位置", () => setRange(Math.floor(au.currentTime), en));
  mk("终点钉在这 ⇥", "把选段结尾挪到当前播放位置", () => setRange(st, Math.ceil(au.currentTime)));

  const pos = (ev) => {
    const r = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * dur();
  };
  const drag = (which) => (ev) => {
    ev.stopPropagation(); ev.preventDefault();     // 别让画布把这一拖当成框选
    const mv = (e) => which === "s" ? setRange(pos(e), en) : setRange(st, pos(e));
    const up = () => {
      window.removeEventListener("mousemove", mv);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
  };
  hs.onmousedown = drag("s"); he.onmousedown = drag("e");
  // 手柄压在条子上面，它们自己 stopPropagation，所以拖手柄不会顺带跳播放位置
  bar.onmousedown = (ev) => { ev.stopPropagation(); au.currentTime = pos(ev); render(); };

  function render() {
    const D = dur();
    const pct = (t) => Math.max(0, Math.min(t, D)) / D * 100 + "%";
    sel.style.left = pct(st);
    sel.style.width = (Math.min(en, D) - st) / D * 100 + "%";
    hs.style.left = pct(st); he.style.left = pct(en);
    head.style.left = pct(au.currentTime);
    out.textContent = `${tstr(st)} → ${tstr(en)}　选中 ${en - st} 秒`
      + (au.duration ? `　（整条 ${tstr(Math.floor(au.duration))}）` : "");
    play.textContent = au.paused ? "▶ 试听选段" : "⏸ 停";
  }
  render();
  return d;
}

function pickFile(c, s) {
  // 路由节点那一格两种都收，accept 不能只写一种，否则选视频时文件对话框里根本看不到
  const r = modeOf(c), both = r && r.route && Object.keys(r.route).length > 1
    && Object.values(r.route).some(x => x.slot === s.key);
  el.picker.accept = both ? Object.keys(r.route).map(k => `${k}/*`).join(",")
    : s.type === "audio" ? "audio/*" : s.type === "video" ? "video/*" : "image/*";
  el.picker.onchange = async () => {
    const f = el.picker.files[0]; el.picker.value = "";
    if (!f) return;
    const fd = new FormData(); fd.append("file", f, f.name);
    try {
      const r = await api("/api/upload", { method: "POST", body: fd });
      putAsset(c, s, r.files[0]);
      openPanel(c.id); save();
    } catch (e) { toast("上传失败：" + e.message); }
  };
  el.picker.click();
}

/** 给素材节点选文件：跟普通节点格的 pickFile 几乎一样，只是不吃 slot ——
    素材节点不往格子里放，收进 c.outputs[0]。
    第二个参数传函数时当"上传成功后拿这一份去建节点"用（底部工具条的「上传」走这条）。 */
function pickAsset(c, onItem) {
  el.picker.accept = "image/*,video/*,audio/*";   // 三种都收，别只写一种
  el.picker.onchange = async () => {
    const f = el.picker.files[0]; el.picker.value = "";
    if (!f) return;
    const fd = new FormData(); fd.append("file", f, f.name);
    try {
      const r = await api("/api/upload", { method: "POST", body: fd });
      if (onItem) onItem(r.files[0]);
      else setAssetItem(c, r.files[0]);
    } catch (e) { toast("上传失败：" + e.message); }
  };
  el.picker.click();
}

/** 把上传接口回来的那一份（无 filename 键）抄进素材节点的 outputs[0]，
    并补一个 filename —— 画面区 meta 行、下载都按产物那套读它。
    图片/视频加载完后按原始比例缩小一半显示。 */
async function setAssetItem(c, item) {
  c.outputs = [{ ...item, filename: (item.origin || item.url).split(/[\\/]/).pop() }];
  paint(c); paintTitle(c); openPanel(c.id); save();

  // 同步更新所有引用这个素材节点的下游节点。上游曾清空过时下游格也会是空的，
  // 不能拿“当前有值”当条件，否则重新选择文件后连线还在、引用却恢复不了。
  const edges = PROJ.edges.filter(e => e.from === c.id && !isTextEdge(e));
  for (const e of edges) {
    const to = PROJ.cards.find(x => x.id === e.to);
    if (!to || !to.assets) continue;
    for (const key of edgeSlots(e)) {
      to.assets[key] = JSON.parse(JSON.stringify(c.outputs[0]));
    }
    paintKind(to);
  }

  // 加载媒体获取原始尺寸，缩小一半显示
  if (item.kind === "image") {
    const img = new Image();
    img.onload = () => {
      const w0 = img.naturalWidth, h0 = img.naturalHeight;
      c.w = Math.round(w0 / 2);
      c.h = Math.round(h0 / 2);
      c.outputs[0].width = w0;   // 存原始尺寸，paintKind 会读它
      c.outputs[0].height = h0;
      applySize(c); paintKind(c); save();
    };
    img.src = item.url;
  } else if (item.kind === "video") {
    const v = document.createElement("video");
    v.onloadedmetadata = () => {
      const w0 = v.videoWidth, h0 = v.videoHeight;
      c.w = Math.round(w0 / 2);
      c.h = Math.round(h0 / 2);
      c.outputs[0].width = w0;
      c.outputs[0].height = h0;
      applySize(c); paintKind(c); save();
    };
    v.src = item.url;
  }
  // 音频不调整尺寸，用默认的
}

/** 底部工具条「上传」：先弹文件选择器，选中之后才建素材节点。
    顺序不能反 —— 先建节点会走 addCard→pick→openPanel 一串同步渲染，
    浏览器就不再把随后那次 picker.click() 当"用户点出来的"，对话框会被静默拦掉。
    取消选择就什么都不建，画布上不留空节点。 */
function addAssetCard() {
  if (!PROJ) return;
  pickAsset(null, (item) => {
    const p = blankSpot();
    const c = addCard("card_asset", p.x, p.y);
    if (!c) return;   // 建节点失败（节点定义不可用）
    setAssetItem(c, item);
    // 说清画布上多出来的这张是什么、接下来能拿它干什么 —— 光冒一个节点，
    // 新手不知道它跟"上传到某个格子里"有什么区别
    toast(`已放进一个素材节点（${KIND_ZH[item.kind] || item.kind}）：`
      + "把它右边那颗点拖到生图/生视频/工具节点上，这份素材就进那个节点的格子");
  });
}

function rowEl(c, s) {
  const row = document.createElement("div"); row.className = "row";
  const lb = document.createElement("label"); lb.textContent = s.label; lb.title = s.hint || s.label;
  row.appendChild(lb);
  // 种子默认 -1（每次随机），不沿用工作流里那颗固定种子
  const cur = c.params[s.key] != null ? c.params[s.key]
    : (s.type === "seed" ? -1 : s.default);

  if (s.type === "slider") {
    const r = document.createElement("input"); r.type = "range";
    r.min = s.min != null ? s.min : 1; r.max = s.max != null ? s.max : 30; r.step = s.step || 1;
    const n = document.createElement("input"); n.type = "number";
    n.min = r.min; n.max = r.max; n.step = r.step; n.style.width = "72px";
    r.value = n.value = cur != null ? cur : r.min;
    const set = (v) => { r.value = n.value = v; c.params[s.key] = parseFloat(v); save(); };
    r.oninput = () => set(r.value); n.oninput = () => set(n.value);
    row.appendChild(r); row.appendChild(n);
  } else if (s.type === "seed") {
    const n = document.createElement("input"); n.type = "number"; n.style.flex = "1";
    n.value = cur != null ? cur : -1;
    n.oninput = () => { c.params[s.key] = n.value === "" ? -1 : parseInt(n.value); save(); };
    const dice = document.createElement("button");
    dice.className = "dice"; dice.textContent = "🎲 随机"; dice.title = "-1 = 每次随机";
    dice.onclick = () => { n.value = -1; c.params[s.key] = -1; save(); };
    row.appendChild(n); row.appendChild(dice);
  } else if (s.type === "textarea") {
    const ta = document.createElement("textarea"); ta.style.flex = "1"; ta.style.minHeight = "48px";
    ta.value = cur != null ? cur : "";
    ta.oninput = () => { c.params[s.key] = ta.value; save(); };
    row.appendChild(ta);
  } else if (s.type === "select" && s.options) {
    const sel = document.createElement("select"); sel.style.flex = "1";
    for (const o of s.options) { const op = document.createElement("option"); op.value = op.textContent = o; sel.appendChild(op); }
    if (cur != null) sel.value = cur;
    sel.onchange = () => {
      c.params[s.key] = sel.value; save();
      // 比例一换，同一 megapixels 对应的 p 数就变了，整块重画才不会显示过期读数
      if (s.key === "aspect_ratio") openPanel(c.id);
    };
    row.appendChild(sel);
  } else {
    const i = document.createElement("input");
    i.type = s.type === "number" ? "number" : "text";
    if (s.min != null) i.min = s.min;
    if (s.max != null) i.max = s.max;
    i.value = cur != null ? cur : "";
    i.style.flex = "1";
    i.oninput = () => { c.params[s.key] = i.type === "number" ? (i.value === "" ? "" : parseFloat(i.value)) : i.value; save(); };
    row.appendChild(i);
  }
  if (s.key === "megapixels" || s.key === "scale_to_length") augRes(c, s, row);
  if (s.key === "frame_load_cap") augFrames(c, s, row);
  return row;
}

/** 「只处理前几帧」下面那行读数：这段视频一共多少帧。
    滑条上限是个死数（300），素材可能只有 243 帧 —— 不报总帧数，用户没法判断自己
    填的这个数是"截一小段"还是"跟整段一样"。帧数只能探文件，上传时就探好存进素材
    记录；这条改动之前存的素材没有，现探一次（/api/media）再补回记录里。 */
async function augFrames(c, s, row) {
  const a = Object.values(c.assets || {}).find(x => x && x.kind === "video");
  const out = document.createElement("span"); out.className = "resout";
  const line = document.createElement("div"); line.className = "resline";
  line.appendChild(out); row.appendChild(line);
  if (!a) { out.textContent = "放进视频后这里显示总帧数"; return; }
  let miss = "读取总帧数…";
  const draw = () => {
    if (!a.frames) { out.textContent = miss; return; }
    const v = parseFloat(c.params[s.key] != null ? c.params[s.key] : s.default) || 0;
    out.textContent = `这段共 ${a.frames} 帧`
      + (a.fps ? ` · ${(+a.fps).toFixed(0)} fps · ${(+a.duration).toFixed(1)} 秒` : "")
      + (v > 0 && v < a.frames ? ` → 只跑前 ${v} 帧` : " → 整段都跑");
  };
  draw();
  for (const i of row.querySelectorAll("input")) i.addEventListener("input", draw);
  if (a.frames) return;
  try {
    Object.assign(a, await api("/api/media?ref=" + encodeURIComponent(a.ref)));
    if (a.frames) save();
  } catch (e) { /* 探不到就落到下面那句 */ }
  miss = "总帧数读不出来（填 0 = 整段，一定没错）";
  draw();
}

/** 给分辨率那一行补上「多少 p」读数和 480/544/640/768p 快捷键。
    滑到 megapixels=0.5 谁都不知道那是 544p —— 这行读数就是为了消掉这个翻译成本。 */
function augRes(c, s, row) {
  const cap = capOf(c);
  const rt = cap.inputs.find(x => x.key === "aspect_ratio");
  const ratio = rt ? (c.params.aspect_ratio != null ? c.params.aspect_ratio : rt.default)
    : "16:9 (Widescreen)";
  const out = document.createElement("span"); out.className = "resout";
  const inputs = [...row.querySelectorAll("input")];

  const sync = () => {
    const v = parseFloat(c.params[s.key] != null ? c.params[s.key] : s.default);
    if (!isFinite(v)) { out.textContent = ""; return; }
    if (s.key === "megapixels") {
      const [w, h] = resFromMP(ratio, v);
      out.textContent = `${w}×${h} · ${Math.min(w, h)}p`;
      out.title = `${ratio}，${v} 百万像素`;
    } else {
      out.textContent = `16:9 素材 → ${Math.round(v)}×${shortOf16x9(v)} · ${shortOf16x9(v)}p`;
      out.title = "长边固定为这个值，短边按素材原比例算，所以 p 数随素材变";
    }
  };
  const setAll = (v) => {
    for (const i of inputs) i.value = v;
    c.params[s.key] = v;
    sync(); save();
  };

  const pre = document.createElement("span"); pre.className = "presets";
  for (const p of H3_P) {
    const v = s.key === "megapixels" ? mpForP(ratio, p) : H3_LONG[p];
    const b = document.createElement("button"); b.textContent = p + "p";
    // 超宽比例下高 p 会顶穿 H3 的面积上限（21:9 的 768p 要 1.31MP），直接禁掉
    if (v > s.max) {
      b.disabled = true;
      b.title = `${ratio} 下 ${p}p 需要 ${v} 百万像素，超过 H3 的画布上限 ${s.max}`;
    } else {
      b.title = p === 768 ? "H3 原生短边（768×1344），再往上是训练分布外，只会更慢更糊"
        : `短边 ${p}`;
      b.onclick = () => setAll(v);
    }
    pre.appendChild(b);
  }
  const line2 = document.createElement("div"); line2.className = "resline";
  line2.append(out, pre);
  row.appendChild(line2);
  for (const i of inputs) i.addEventListener("input", sync);
  sync();
}

/* ================= 运行 / 轮询 ================= */
/** 所见即所得：面板里显示的值就是提交的值。
    以前没动过的输入框不会进 params，ComfyUI 于是用了模板里作者的演示值 —
    图生视频出鼠标广告就是这么来的。 */
function payloadOf(c) {
  const cap = CAPS[runCap(c)] || capOf(c), params = {}, assets = {};
  // 风格节点是提交这一刻才并进提示词的（不写回 c.params，见 promptBlock）
  const styles = styleTexts(c);
  const pkeys = new Set(promptSpecs(cap).map(s => s.key));
  for (const s of cap.inputs) {
    if (MEDIA.includes(s.type) || s.mirror) continue;
    // 种子永远默认 -1（每次随机）：面板里没有这个旋钮了，老节点里存过的固定值也不再生效
    const v = s.type === "seed" ? undefined : c.params[s.key];
    if (v != null) params[s.key] = v;
    else if (s.type === "seed") params[s.key] = -1;      // 每次随机
    else if (s.default !== undefined) params[s.key] = s.default;
    if (!pkeys.has(s.key)) continue;
    // 用了「优化后」那份：它是整段现成的提示词，风格在优化那一步就已经融进去了，
    // 这儿再拼一遍就是两份风格。所以优化后的词**原样提交**，不过 withStyle
    const opt = usingOpt(c, s.key);
    if (opt != null) {
      params[s.key] = opt;
    } else {
      // 先展开 @标签（@文本卡 → 原文、@素材卡 → <Picture 1>），再拼风格
      let resolved = resolveCardMentions(params[s.key], c);
      if (styles.length) resolved = withStyle(resolved, styles);
      params[s.key] = resolved;
    }
  }
  for (const [k, v] of Object.entries(c.assets)) if (v && v.ref) assets[k] = v.ref;
  // card/cardName 只给任务浮窗用：光有能力名说不清是哪个节点在跑，也没法点回去
  return { capability: cap.id, params, assets,
           project: PROJ && PROJ.id, card: c.id, cardName: titleOf(c) };
}

async function run(c) {
  if (isStyle(c)) return toast("风格节点不用运行：它只把风格并进挂着的那几个节点的提示词");
  if (isText(c)) return runText(c);
  const cap = capOf(c);
  if (!cap) return toast("能力不可用");
  c.error = null; c.progress = 0; c.status = "queued"; c.outputs = []; c.ms = null; c.step = "";
  paint(c); openPanel(c.id);      // status 一进 queued，paint 就把画面区换成加载态
  const pl = payloadOf(c);
  // 留一手给历史记录：真提交的那段跟面板上原词那个框不一样时（并了风格节点、或者用的是
  // 优化后那份），只有把真提交的整段留下来这一轮才复现得出来（见 pushHistory）。
  // `_` 开头不落盘，真正持久化的是 history 里那一条
  const pk = promptSpecs(CAPS[runCap(c)] || cap).map(s => s.key);
  const sent = pk.length ? String(pl.params[pk[0]] || "") : "";
  c._sent = (pk.length && sent !== String(c.params[pk[0]] || "")) ? sent : null;
  try {
    const job = await jpost("/api/generate", pl);
    c.job = job.id; c.seed = job.seed; c.status = job.status;
  } catch (e) {
    c.status = "error"; c.error = e.message; c.job = null;
    toast(e.message);
  }
  paint(c); if (el.panel._id === c.id) openPanel(c.id);
  save();
}

async function cancel(c) {
  if (!c.job) return;
  try { await jpost(`/api/job/${c.job}/cancel`); } catch (e) { toast(e.message); }
}

/** 一次把所有任务捞回来：右上角的计数要算上别的项目/别处提交的活儿，
    所以不能只按当前项目的节点一张张问。 */
async function pollJobs() {
  try { TASKS = (await api("/api/jobs")).jobs || []; } catch (e) { return; }
  paintJobsBtn();
  if (el.jobs.style.display !== "none") renderJobs();
  if (!PROJ) return;
  const live = PROJ.cards.filter(c => c.job && ["queued", "running"].includes(c.status));
  if (!live.length) return;
  let dirty = false;
  for (const c of live) {
    const j = TASKS.find(x => x.id === c.job);
    // 任务被从列表里删掉了（在浮窗里删的）。服务端删之前已经把活儿停了，
    // 这里必须跟着落地，不然节点会一直转圈等一个不存在的任务
    if (!j) {
      c.status = "canceled"; c.step = ""; c.job = null; paint(c); dirty = true;
      if (el.panel._id === c.id) openPanel(c.id);
      continue;
    }
    const was = c.status;
    c.status = j.status; c.progress = j.progress; c.error = j.error;
    c.queue_remaining = j.queue_remaining; c.step = j.step || "";
    if (j.seed != null) c.seed = j.seed;
    // 耗时按服务端的起止时间算，别用浏览器这边的轮询间隔（差一整个轮询周期）
    if (j.started && j.ended) c.ms = Math.round((j.ended - j.started) * 1000);
    if (j.outputs && j.outputs.length) c.outputs = j.outputs;
    paint(c);
    if (was !== c.status) {
      dirty = true;
      if (el.panel._id === c.id) openPanel(c.id);
      if (c.status === "done") {
        pushHistory(c);
        if (el.hist._id === c.id) openHistory(c.id);
        drawWires();
        // 下游已连线的节点自动吃掉新产物（风格线传的是文字，没有产物可搬，跳过）
        for (const e of PROJ.edges.filter(e => e.from === c.id && !isTextEdge(e))) {
          const to = PROJ.cards.find(x => x.id === e.to);
          if (!to) continue;

          // 只更新这根线实际绑定的格。这样用户手动换掉其中一格后，上游重跑不会再抢回来；
          // 上游这轮少产物时，多出来的旧引用也同步清掉。
          const outputs = c.outputs || [];
          const slots = edgeSlots(e);
          e.slots = slots;              // 老项目第一次跑到这里时顺便升级绑定记录
          for (let i = 0; i < slots.length; i++) {
            if (!outputs[i]) {
              delete to.assets[slots[i]];
              continue;
            }
            try {
              const imported = await importOutput(outputs[i]);
              // 导入期间删线/删节点后，这份迟到的结果不能把引用复活。
              if (PROJ && PROJ.edges.includes(e) && cardOf(to.id)) to.assets[slots[i]] = imported;
            } catch (err) {
              console.error('导入产物失败:', err);
            }
          }

          paintKind(to);
          if (el.panel._id === to.id) openPanel(to.id);
        }
      }
      if (c.status === "error") toast(c.error || "生成失败");
    }
  }
  if (dirty) save();
}

/* ================= 任务浮窗 ================= */
const JOB_ZH = { queued: "等待中", running: "运行中", done: "已完成",
                 error: "失败", canceled: "已取消" };
const jobLive = (j) => j.status === "queued" || j.status === "running";
const jobCls = (j) => j.status === "running" ? "run" : j.status === "queued" ? "wait"
  : j.status === "done" ? "done" : j.status === "error" ? "bad" : "gone";

/** 右上角那颗按钮。数字 = 还没跑完的任务数；后面那截字说明它们是在跑还是在等，
    颜色同一件事再说一遍（青=在跑、橙=在等、灰=闲着），不点开也知道现在什么状况。 */
function paintJobsBtn() {
  const live = TASKS.filter(jobLive);
  const run = live.find(j => j.status === "running");
  const b = el.jobsbtn;
  const sig = `${live.length}|${run ? Math.round((run.progress || 0) * 100) : -1}`;
  if (b._sig === sig) return;        // 700ms 一次的轮询，没变就别重画
  b._sig = sig;
  b.classList.toggle("run", !!run);
  b.classList.toggle("wait", !run && live.length > 0);
  b.innerHTML = `任务<span class="n">(${live.length})</span>`;
  const s = run ? `运行中 ${Math.round((run.progress || 0) * 100)}%`
    : live.length ? "等待中" : "";
  if (s) {
    const t = document.createElement("span"); t.className = "s"; t.textContent = s;
    b.appendChild(t);
  }
  b.title = live.length ? `${live.length} 个任务没跑完，点开可以看详情、停止或删除`
    : "现在没有任务在跑，点开看历史";
}

function toggleJobs() {
  if (el.jobs.style.display === "none") {
    el.jobs.style.display = "";
    el.jobsbtn.classList.add("open");
    renderJobs(); placeJobs();
    pollJobs();          // 刚打开别先给人看上一轮 700ms 前的旧状态
  } else closeJobs();
}

function closeJobs() {
  el.jobs.style.display = "none";
  el.jobs.innerHTML = "";
  el.jobs._sig = null;
  el.jobsbtn.classList.remove("open");
}

/** 挂在按钮下面，右边缘对齐。宽度够不着就往左躲，别飘到窗外 */
function placeJobs() {
  if (el.jobs.style.display === "none") return;
  const GAP = 8, r = el.jobsbtn.getBoundingClientRect();
  el.jobs.style.maxHeight = (innerHeight - r.bottom - GAP * 2) + "px";
  const w = el.jobs.offsetWidth;
  el.jobs.style.top = (r.bottom + GAP) + "px";
  el.jobs.style.left = Math.max(GAP, Math.min(r.right - w, innerWidth - w - GAP)) + "px";
}

/** 列表骨架的签名：有哪些任务、各自什么状态。只有它变了才重建 DOM ——
    每 700ms 整块重画会让按钮在 mousedown 和 mouseup 之间被换掉，那一下点击就丢了。
    进度、步骤、耗时这些一直在变的东西交给 fillJobRow 原地刷。 */
const jobsSig = () => TASKS.map(j => `${j.id}:${j.status}:${j.error ? 1 : 0}`).join(",");

function renderJobs() {
  const sig = jobsSig();
  if (el.jobs._sig === sig) {
    for (const d of el.jobs.querySelectorAll(".jrow")) {
      const j = TASKS.find(x => x.id === d._id);
      if (j) fillJobRow(d, j);
    }
    return;
  }
  el.jobs._sig = sig;
  // 骨架重建时要留住滚动位置，不然新任务一进来列表就被弹回顶部
  const old = el.jobs.querySelector(".jlist");
  const scrolled = old ? old.scrollTop : 0;

  el.jobs.innerHTML = "";
  const hd = document.createElement("div"); hd.className = "jhd";
  const ttl = document.createElement("b");
  const n = TASKS.filter(jobLive).length;
  ttl.textContent = n ? `任务 · ${n} 个没跑完` : "任务";
  hd.appendChild(ttl);
  if (TASKS.some(j => !jobLive(j))) {
    const clr = document.createElement("button");
    clr.className = "lnk"; clr.textContent = "清空已结束";
    clr.title = "只清列表里的记录，已经出好的产物还在节点上";
    clr.onclick = clearDoneJobs;
    hd.appendChild(clr);
  }
  const x = document.createElement("button");
  x.className = "x"; x.textContent = "✕"; x.title = "关闭"; x.onclick = closeJobs;
  hd.appendChild(x);

  const list = document.createElement("div"); list.className = "jlist";
  if (!TASKS.length) {
    const e = document.createElement("div"); e.className = "jempty";
    e.textContent = "还没有任务。在节点上点「生成」，任务就会出现在这里。";
    list.appendChild(e);
  }
  for (const j of TASKS) list.appendChild(jobRow(j));

  el.jobs.append(hd, list);
  list.scrollTop = scrolled;
}

/** 任务是哪个项目的。当前打开的这个直接用 PROJ.name（刚改的名字 projects 里还是旧的），
    别的项目去 projects 列表里认 id；项目已经被删了就只剩节点名。 */
function jobProjName(j) {
  if (!j.project) return "";
  if (PROJ && j.project === PROJ.id) return PROJ.name;
  return (projects.find(p => p.id === j.project) || {}).name || "";
}

function jobRow(j) {
  const d = document.createElement("div");
  d.className = "jrow " + jobCls(j);
  d._id = j.id;

  const r1 = document.createElement("div"); r1.className = "r1";
  const nm = document.createElement("span"); nm.className = "nm";
  // 节点名才是用户认得出的那个（"角色图放大"），能力名（"SeedVR2 图片高清放大"）退到第二行。
  // 前面再挂上项目名：几个项目里都有一张叫"主角图"的节点，光看节点名分不出是哪个在跑
  const card = j.cardName || j.name;
  const pj = jobProjName(j);
  if (pj) {
    const p = document.createElement("i"); p.className = "pj";
    p.textContent = pj + " - ";
    nm.appendChild(p);
  }
  const cn = document.createElement("span"); cn.className = "cn";
  cn.textContent = card;
  nm.appendChild(cn);
  nm.title = (pj ? `${pj} - ` : "") + (card !== j.name ? `${card}（${j.name}）` : j.name);
  d._st = document.createElement("span"); d._st.className = "st";
  r1.append(nm, d._st);

  const r2 = document.createElement("div"); r2.className = "r2";
  d._sp = document.createElement("span"); d._sp.className = "sp";
  d._tm = document.createElement("span");
  r2.append(d._sp, d._tm);
  d.append(r1, r2);

  if (jobLive(j)) {
    const bar = document.createElement("div"); bar.className = "bar";
    d._bar = document.createElement("i");
    bar.appendChild(d._bar); d.appendChild(bar);
  }
  if (j.error) {
    const m = document.createElement("div"); m.className = "msg";
    m.textContent = j.error; d.appendChild(m);
  }

  const acts = document.createElement("div"); acts.className = "acts";
  if (jobLive(j)) acts.appendChild(actBtn("停止", () => stopTask(j)));
  acts.appendChild(actBtn("删除", () => delTask(j), true));
  if (j.project && j.card) acts.appendChild(actBtn("看节点", () => focusTask(j)));
  d.appendChild(acts);

  fillJobRow(d, j);
  return d;
}

/** 只刷每次轮询都在变的那几处：状态百分比、当前步骤、耗时、进度条 */
function fillJobRow(d, j) {
  const pct = Math.round((j.progress || 0) * 100);
  // 排队的不报"前面还有几个"：ComfyUI 的 queue_remaining 是整条队列的长度，
  // 不是这一条自己的位次，拿它当位次就是编数字。队列长度改在浮窗标题上说一次
  d._st.textContent = j.status === "running" ? `运行中 ${pct}%`
    : JOB_ZH[j.status] || j.status;
  d._sp.textContent = j.step || j.name;   // 在跑就报当前步骤，没跑就报用的哪条能力
  const ela = j.started ? fmtEla(((j.ended || Date.now() / 1000) - j.started) * 1000) : "";
  d._tm.textContent = histTime(j.created * 1000) + (ela ? ` · ${ela}` : "");
  if (d._bar) d._bar.style.width = pct + "%";
}

function actBtn(text, run, danger) {
  const b = document.createElement("button");
  if (danger) b.className = "danger";
  b.textContent = text;
  b.onclick = run;
  return b;
}

async function stopTask(j) {
  try { await jpost(`/api/job/${j.id}/cancel`); } catch (e) { return toast(e.message); }
  pollJobs();
}

async function delTask(j) {
  // 还在跑的删掉等于先停后删，这一步不可逆（跑到一半的算力就没了），所以问一句
  if (jobLive(j) && !confirm("这个任务还没跑完，删除会先把它停掉。继续？")) return;
  try { await api(`/api/job/${j.id}`, { method: "DELETE" }); } catch (e) { return toast(e.message); }
  pollJobs();
}

async function clearDoneJobs() {
  try { await jpost("/api/jobs/clear"); } catch (e) { return toast(e.message); }
  pollJobs();
}

/** 从任务跳回它对应的那个节点：不在当前画布就先把那张画布打开 */
async function focusTask(j) {
  if (!PROJ || PROJ.id !== j.project) {
    if (!projects.some(p => p.id === j.project)) return toast("这个任务所在的画布已经不在了");
    await openProject(j.project);
  }
  const c = PROJ.cards.find(x => x.id === j.card);
  if (!c) return toast("这个节点片已经从画布上删掉了");
  const r = el.stage.getBoundingClientRect();
  view.x = r.width / 2 - (c.x + cardW(c) / 2) * view.k;
  view.y = r.height / 3 - c.y * view.k;
  applyView();
  selId = c.id;
  for (const o of PROJ.cards) if (o._el) o._el.classList.toggle("sel", o.id === c.id);
  openPanel(c.id); placePanel(); placeJobs(); save();
}
