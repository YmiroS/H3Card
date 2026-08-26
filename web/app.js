/* 抽卡系统 前端 (P0) — 免构建原生 JS
   画布 = 卡片(产物+配方) + 连线(上游产物喂下游槽位)
   卡片字段全部由后端 /api/cards 的 manifest 生成，前端不写死任何工作流 */

const $ = (s, r = document) => r.querySelector(s);
const CW = 268;            // 卡片默认宽度，与 style.css 保持一致
const CW_MIN = 180, CW_MAX = 900, CH_MIN = 90, CH_MAX = 900;
const cardW = (c) => c.w || CW;
const SVGNS = "http://www.w3.org/2000/svg";

// 全站不弹浏览器原生右键菜单：想存图/定位文件走卡片和素材格自己的菜单
document.addEventListener("contextmenu", (ev) => ev.preventDefault());

let CARDS = [];            // 卡种（生图 / 生视频）
let CAPS = {};             // 能力清单
let PROJ = null;           // 当前项目
let projects = [];
let TASKS = [];            // 服务端所有任务（不限本项目），右上角计数和任务浮窗都看它
let view = { x: 60, y: 70, k: 1 };
let selId = null;
let saveTimer = null;

const el = {
  side: $("#side"), plist: $("#plist"), dot: $("#dot"),
  ptitle: $("#ptitle"), hint: $("#hint"), addcard: $("#addcard"), fit: $("#fit"),
  stage: $("#stage"), world: $("#world"), wires: $("#wires"),
  empty: $("#empty"), panel: $("#panel"), hist: $("#hist"), menu: $("#menu"), tip: $("#tip"),
  toast: $("#toast"), picker: $("#picker"),
  jobsbtn: $("#jobsbtn"), jobs: $("#jobs"),
  view: $("#view"), vbox: $("#view .vbox"),
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
/** 卡片属于哪一类。以卡内选中的能力为准，c.type 只是兜底：
    能力被拆成独立卡片后（比如漫剧从"生视频"里单独抽出来），老项目里存的
    c.type 还指着旧卡，按 c.type 找会拿到一个模式列表里根本没有它的卡。 */
const cardDef = (t) => CARDS.find(c => c.id === t) || CARDS[0];
const MEDIA = ["image", "audio", "video"];
const KIND_ZH = { image: "图片", video: "视频", audio: "音频" };
const modeHas = (md, cid) => md.id === cid
  || !!(md.ladder && Object.values(md.ladder).includes(cid))
  || !!(md.route && Object.values(md.route).some(r => r.cap === cid));
/** 一个模式落到画布上时先跑哪条能力。路由卡（route）用排在最前那一路当初始状态 */
const modeCap = (md) => md.route ? md.route[Object.keys(md.route)[0]].cap : md.id;
/** 同一条能力可能同时挂在两张卡上（补帧既有自己那张卡，也是「画质增强」的视频那一路），
    所以先认卡片自己记的 c.type，只有它对不上时才去全局找。 */
const defOf = (c) => {
  const own = CARDS.find(d => d.id === c.type);
  if (own && own.modes.some(m => modeHas(m, c.cap))) return own;
  return CARDS.find(d => d.modes.some(m => modeHas(m, c.cap))) || cardDef(c.type);
};
const modeOf = (c) => { const d = defOf(c); return d && d.modes.find(m => modeHas(m, c.cap)); };
/** 卡片显示名。合并模式用模式名（"H3 图生视频"），不用张数最多那条能力的名字（"首尾帧"）。
    路由卡同理：叫「画质增强」，不能叫「SeedVR2 图片高清放大」—— 那会让人以为它不收视频。
    最后兜底用模式名而不是裸 id：风格卡在 CAPS 里根本没有条目（它不是能力）。 */
const titleOf = (c) => {
  const cap = capOf(c), md = modeOf(c);
  return c.name || (md && (md.ladder || md.route) ? md.name
    : cap ? cap.name : md ? md.name : c.cap);
};

/* ================= 风格卡 =================
   画布上唯一一张不对应任何能力的卡（`CAPS[c.cap]` 是空的），所以凡是"先取 cap
   再干活"的地方都要先问一句 isStyle。它自己不跑、不出产物，只把一段风格描述
   挂给下游的生图/生视频卡，提交时并进那张卡的提示词 —— 一处改，连着的全跟着变。 */
const isStyle = (c) => !!c && (defOf(c) || {}).kind === "style";
/** 风格连线走的还是 PROJ.edges，只是 slot 用 `@` 开头 —— 它不是素材槽，
    所以传产物那一套（importOutput、跑完自动喂下游）必须绕开它。 */
const STYLE_SLOT = "@style";
const isTextEdge = (e) => String(e.slot || "").startsWith("@");

/** 这条能力的「提示词」框。作者调好的格式规范（template）和高级里的不算 ——
    风格是往画面描述里加的，不该混进那份规范。一个都没有的卡（补帧、放大、拼图）
    接不了风格卡：那些卡根本不写提示词。 */
const promptSpecs = (cap) => ((cap && cap.inputs) || [])
  .filter(s => s.type === "textarea" && !s.template && !s.advanced);

const styleTextOf = (s) => String(((s || {}).params || {}).style || "").trim();

/** 直接挂在这张卡上的风格卡，按连线顺序。**还没写字的不算** ——
    先连线后写字是常事，那一阵子它既不该出现在读数里，更不该把上游的风格挡掉。 */
const ownStyles = (c) => (PROJ ? PROJ.edges : [])
  .filter(e => e.to === c.id && e.slot === STYLE_SLOT)
  .map(e => PROJ.cards.find(x => x.id === e.from))
  .filter(s => s && isStyle(s) && styleTextOf(s));

/** 从上游继承来的风格卡（不看这张卡自己挂了什么）。
    走的是普通产物连线，所以中间夹着不写提示词的卡（放大、补帧）也照样往下传 ——
    那张卡自己用不上风格，但它不该把链子截断。
    同一张风格卡顺两条路走到这里只算一次（按 id 去重）；seen 兼作环路保险。 */
function upStyles(c, seen = new Set()) {
  if (!c || seen.has(c.id)) return [];
  seen.add(c.id);
  const out = [], ids = new Set();
  for (const e of (PROJ ? PROJ.edges : []).filter(e => e.to === c.id && !isTextEdge(e))) {
    const p = PROJ.cards.find(x => x.id === e.from);
    if (!p || isStyle(p)) continue;
    for (const s of styleCards(p, seen)) if (!ids.has(s.id)) { ids.add(s.id); out.push(s); }
  }
  return out;
}

/** 这张卡实际会套用的风格卡。一条链子只该在第一棒挂一次风格：后面每一棒都手动挂太啰嗦，
    漏一棒风格就断了。所以**风格顺着产物连线往下传**。
    自己挂了风格就以自己为准，上游那份不再往下传 —— 两段风格叠在一起会互相打架
    （"哥特暗黑" 撞 "清透日系"），而"这一棒换个风格"是真需求。
    想两份都要：把上游那张风格卡也拖到这张卡上（一张卡能挂好几张）。
    返回卡片而不是文字：面板上要能说清哪张是继承来的、点它能跳过去。 */
function styleCards(c, seen = new Set()) {
  if (!c) return [];
  const own = ownStyles(c);
  return own.length ? own : upStyles(c, seen);
}

/** 这张卡下游会跟着套用这段风格的卡（不含直接挂的那几张）—— 风格卡面板上要交代清楚
    「改这一处会连带影响谁」，不然继承是隐形的。 */
function styleReach(s) {
  return (PROJ ? PROJ.cards : [])
    .filter(c => !isStyle(c) && !ownStyles(c).some(x => x.id === s.id)
      && styleCards(c).some(x => x.id === s.id));
}

/** 这张卡实际会套用的风格文字，按套用顺序。 */
const styleTexts = (c) => styleCards(c).map(styleTextOf);

/** 风格卡卡脚上「连带下游 N 张」是顺着产物连线算出来的，所以**产物连线一改就得重刷**
    （接一根新线、清一格素材、换路由都会改这个数），不然那个数会停在改之前。 */
const paintStyles = () => (PROJ ? PROJ.cards : []).filter(isStyle).forEach(s => paint(s));

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

/** 路由卡上放进这种素材该切到哪一路（已经在那一路上就返回 null）。
    和 ladder 不一样，这里两条工作流的参数完全不同，画不出一张"并集"面板，
    所以是放素材那一刻就把卡切过去，切完面板/参数/产出全都走原来那套。 */
function routeFor(c, kind) {
  const md = modeOf(c);
  const r = md && md.route && md.route[kind];
  return r && r.cap !== c.cap ? r : null;
}

/** 往某一格放素材。路由卡要先按素材类型换能力 —— 换完槽位名都变了（images[0] →
    video[0]），所以旧素材和旧连线一起清掉，不然会留下一格对不上任何槽的孤儿。 */
function putAsset(c, s, file) {
  const r = file && file.kind ? routeFor(c, file.kind) : null;
  if (r) {
    c.cap = r.cap;
    c.assets = {};
    PROJ.edges = PROJ.edges.filter(e => e.to !== c.id);
    s = { key: r.slot };
    paintTitle(c);
    drawWires(); paintStyles();
  }
  c.assets[s.key] = file;
  paintKind(c);            // 路由卡的卡脚徽标从「跟素材」变成真类型
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
function slotName(s) {
  const t = String(s.label || "").trim(), w = gridWord(s);
  if (/^\d+$/.test(t)) return (w || (s.type === "image" ? "图" : KIND_ZH[s.type] || "")) + t;
  return w ? `${t}（${w}）` : t;
}

/** 从 manifest 反推这个工作流吃什么、吐什么 —— 不写死任何工作流 */
function capBrief(cap) {
  const by = (t) => cap.inputs.filter(s => s.type === t);
  const imgs = by("image"), auds = by("audio"), vids = by("video"), txts = by("textarea");
  const dur = cap.inputs.find(s => s.key === "duration");
  const size = cap.inputs.filter(s => s.key === "width" || s.key === "height");
  const ratio = cap.inputs.find(s => s.key === "aspect_ratio");
  const mp = cap.inputs.find(s => s.key === "megapixels");
  const side = cap.inputs.find(s => s.key === "scale_to_length");
  const need = [], opt = [];
  if (imgs.length) {
    (imgs.every(s => s.required) ? need : opt).push(
      `图片 ×${imgs.length}：${imgs.map(s => slotName(s) + (s.required ? "" : "?")).join(" / ")}`);
  }
  if (auds.length) need.push(`音频 ×${auds.length}：${auds.map(s => s.label).join(" / ")}`);
  if (vids.length) need.push(`视频 ×${vids.length}：${vids.map(s => s.label).join(" / ")}`);
  if (!imgs.length && !auds.length && !vids.length) need.push("不需要素材，纯提示词驱动");
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

/** 把浮层摆在 a（锚点的屏幕矩形）旁边。
 *
 *  横向夹在**画布**的左右边界里，不是窗口：右边开着历史产物栏时按 innerWidth 夹，
 *  浮层会滑到栏子底下去；顶栏那 52px 同理。
 *  竖向先试锚点下方 → 放不下翻到上方 → 上下都放不下就贴着上边、再挪到锚点侧面，
 *  别糊在卡片自己身上（卡在屏幕最下面、说明又长的时候就是这种情形）。 */
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

/** 给元素挂"悬停显示能力说明" */
function hoverBrief(node, capGetter, nameGetter) {
  node.addEventListener("mouseenter", () => {
    const cap = capGetter(); if (!cap) return;
    tipShow(briefEl(cap, nameGetter && nameGetter()), node.getBoundingClientRect());
  });
  node.addEventListener("mouseleave", tipHide);
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
  setInterval(health, 5000);
  pollJobs();
  setInterval(pollJobs, 700);
})();

async function health() {
  try {
    const h = await api("/api/health");
    el.dot.classList.toggle("on", !!h.comfy_online);
  } catch (e) { el.dot.classList.remove("on"); }
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
  // 能力被合并/拆分过之后，老项目里存的 cap 可能已经不是模式入口了
  // （图生视频并进了首尾帧那条），统一归到模式入口，参数和素材的 key 是通的
  for (const c of PROJ.cards) {
    const md = modeOf(c);
    // 路由卡的模式 id 不是能力 id（它就是那张卡），c.cap 已经是两路里的一条，别动
    if (md && !md.route && md.id !== c.cap) c.cap = md.id;
    seedHistory(c);
  }
  view = Object.assign({ x: 60, y: 70, k: 1 }, PROJ.view || {});
  selId = null;
  closePanel();
  el.empty.style.display = "none";
  el.addcard.style.display = ""; el.fit.style.display = "";
  el.ptitle.textContent = PROJ.name;
  // 示例上的改动不落盘，这件事必须写在明面上：不然用户在它上面搭了半天，
  // 刷新一下全没了，只会以为是丢数据了
  if (PROJ.locked) {
    const b = document.createElement("span");
    b.className = "ro";
    b.textContent = "试玩画布 · 刷新还原";
    b.title = "这张画布是示例：参数怎么改、卡怎么拖、重跑几遍都随便，"
      + "改动只在这一次里有效，刷新就回到原样。想留下自己的东西就「＋ 新建项目」";
    el.ptitle.appendChild(b);
  }
  // 断线重连后可能有卡片状态是 running，交给轮询自己收尾
  render();
  loadProjects();
}

function showEmpty() {
  el.empty.style.display = "";
  el.world.innerHTML = ""; el.wires.innerHTML = "";
  el.ptitle.textContent = "";
  el.addcard.style.display = "none"; el.fit.style.display = "none";
  el.hint.textContent = "";
}

/** 卡片对象上挂了 _el（DOM），序列化前必须剥掉，否则 JSON 循环引用 */
const plain = (c) => Object.fromEntries(Object.entries(c).filter(([k]) => k[0] !== "_"));

/** 保存串行化：两次 PUT 撞在一起会带同一个 rev，后一次要被服务端顶掉 */
let saveChain = Promise.resolve();

function save() {
  if (!PROJ) return;
  // 示例是只读的：拖卡、改参数、重跑都随便，但只活在这一次打开里，刷新就回到那份固定的示例。
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
      cards: PROJ.cards.map(plain), edges: PROJ.edges, view,
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
  el.wires.setAttribute("width", 1); el.wires.setAttribute("height", 1);
}

function toWorld(cx, cy) {
  const r = el.stage.getBoundingClientRect();
  return { x: (cx - r.left - view.x) / view.k, y: (cy - r.top - view.y) / view.k };
}

/* ================= 渲染 ================= */
function render() {
  el.world.innerHTML = "";
  for (const c of PROJ.cards) el.world.appendChild(buildCard(c));
  applyView();
  drawWires();
  el.hint.textContent = `${PROJ.cards.length} 张卡`;
}

/** 这张卡这一轮会出什么：认真正会跑的那条能力，不是卡片定义。
    路由卡的卡片定义写死是 image（`_cards.json` 取第一路），切到视频那一路后还报"图片"
    就是在骗人；工具卡的卡片图标（🧩 ✨）本身也不说明出图还是出视频。 */
const outKindOf = (c) => ((CAPS[runCap(c)] || capOf(c) || defOf(c) || {}).outputType) || "image";
/** 路由卡还一格素材都没放：出图还是出视频要等放进来那一刻才定，别先报一个。
    （新建的路由卡 c.cap 是排在最前那一路 = 图片，直接读它会误报"出图片"） */
const kindUndecided = (c) => {
  const md = modeOf(c);
  return !!(md && md.route) && !Object.values(c.assets || {}).some(Boolean);
};

/** 画面区的空占位：还没出过东西、或者这一轮失败/取消了都用它 */
function phHTML(c) {
  if (isStyle(c)) return `<span class="ph">🎨</span>`;
  return `<span class="ph">${kindUndecided(c) ? "🖼🎬"
    : outKindOf(c) === "video" ? "🎬" : "🖼"}</span>`;
}

/** 卡片上「按住不是要拖卡」的地方。整张卡都能拖，所以这里列的是自己有事要干的那几样：
 *    button / input / textarea / select  按钮和输入框
 *    audio                               浏览器自带的播放条，整条都得留给它
 *    .vprog                              按住是拖播放进度（bindCardVideo）
 *    .cmp                                按住是拖原图对比线（bindCompare）
 *    .rz / .port / .inport               改大小、拉连线
 *  video **不在**里面：画面上按住就是拖卡，单击才是放/停（bindCardVideo 里按位移分辨）。
 *  拖进度只留给底下那条 .vprog —— 原来在画面上横向拖也能定位，但那把整块画面占死了，
 *  视频卡就只剩标题栏能拖。
 *  后三样自己就 stopPropagation 了，压根轮不到卡片这层，列在这儿只是省得以后
 *  哪次改动把那个 stopPropagation 弄丢了，卡片就跟着一起跑。 */
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
    <div class="port" title="拖到空白处 → 用本卡产物新建下游卡"></div>`;
  c._el = d;
  applySize(c);
  paintTitle(c);
  d.querySelector(".ch .x").onclick = (ev) => { ev.stopPropagation(); delCard(c.id); };
  d.querySelector(".rz.tl").onmousedown = (ev) => startResize(ev, c, d, -1);
  d.querySelector(".rz.br").onmousedown = (ev) => startResize(ev, c, d, 1);
  d.querySelector(".port").onmousedown = (ev) => startWire(ev, c);
  d.onmousedown = (ev) => {
    // 整张卡都是拖动把手。以前只有标题栏那一条 26px 能拖 —— 出了图之后卡片九成面积
    // 是画面，按下去却纹丝不动，每次挪卡都得回去瞄那一条。反过来列例外更省事（NODRAG）
    if (ev.button === 0 && !ev.target.closest(NODRAG)) return startDrag(ev, c, d);
    ev.stopPropagation();     // 右键/中键也别漏到画布上去平移
    pick(c.id);
  };
  d.oncontextmenu = (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    tipHide(); pick(c.id); cardMenu(ev.clientX, ev.clientY, c);
  };
  d.ondblclick = (ev) => {
    const body = ev.target.closest(".body");
    if (!body || isStyle(c)) return;      // 风格卡没有产物可看
    if (ev.target.closest(".vprog")) return;   // 在进度条上连点是在定位，别抢它
    // 音频那条播放条是浏览器画在 audio 里的，点它拿到的 target 还是 audio 本身，
    // 没法直接区分，只能按位置判断：落在底部这条里就是在操作播放条，别抢它的双击
    if (ev.target.matches("audio")) {
      const r = ev.target.getBoundingClientRect();
      if (ev.clientY > r.bottom - 34 * view.k) return;
    }
    // 大窗口里那份才是带播放条的，卡里这份别在背后接着响
    for (const v of body.querySelectorAll("video")) v.pause();
    // 宫格里双击哪一格就从哪一张开始看
    openViewer(c, +(ev.target.dataset.i || 0));
  };
  bindCardVideo(d.querySelector(".body"));
  bindCompare(d.querySelector(".body"), c);
  hoverBrief(d.querySelector(".ch"), () => capOf(c), () => c.name);
  paint(c);
  return d;
}

/* 全屏幕只许一个东西在响。一屏摊着十几张卡，多开两个视频就分不清声音是哪来的，
   那个还在放的往往已经被滚出视野，只能听见声音找不着人。
   统一挂在 document 捕获阶段（play/pause 不冒泡），卡片视频、宫格里的视频、
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

/** 卡片里视频的交互：画面上单击放/停、按住拖是挪卡；定位进度只在底下那条 .vprog 上。
 *
 *  以前在画面上横向拖也能定位，代价是整块画面被占死 —— 视频卡就只剩标题栏那一条能拖。
 *  现在画面区交回给拖卡（NODRAG 里没有 video），这儿只负责分辨「按下又没挪动」= 点了一下。
 *  阈值跟 startDrag 一样是 4px，两边必须一致：小于 4px 那边不认拖、这边就得认点击，
 *  不然会出现「既没挪卡、也没放视频」的死角。
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
      // .vprog 在 NODRAG 里，卡片那层不会跟着动，这儿放心 stopPropagation
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
    // 既不 stopPropagation 也不 preventDefault：这一下要原样交给卡片那层去起拖
    // （幽灵图那边已经 draggable=false + CSS user-drag 兜住了）
    const x0 = ev.clientX, y0 = ev.clientY;
    const up = (e) => {
      document.removeEventListener("mouseup", up);
      // 挪过了就是在拖卡，别顺手把视频放起来
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

/** 把卡片自己的尺寸写到 DOM 上。
 *  宽度改整张卡；高度只改画面区（.body），标题栏和状态栏保持自然高度。
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
  // 风格卡没有产物，画面区直接摊那段风格文字：画布上一眼能看出这张卡在管什么风格，
  // 不用点开面板。（这也是它唯一的内容，藏起来这张卡就成了个空盒子）
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
      + `<div class="sempty">在旁边的面板里写一段风格，再把出口拖到生图/生视频卡上</div>`;
    const port = d.querySelector(".port");
    if (port) port.title = "拖到生图/生视频卡上 → 那张卡套用这段风格（拖到空白处会列出所有能挂的玩法）";
    const n = (PROJ ? PROJ.edges : []).filter(e => e.from === c.id && isTextEdge(e)).length;
    // 继承的那几张没有连线，卡脚不报数就等于没告诉用户这段风格到底管着几张卡
    const m = styleReach(c).length;
    st.className = "st";
    st.textContent = txt ? "" : "还没写";
    meta.textContent = n ? `挂了 ${n} 张卡` + (m ? ` · 连带下游 ${m} 张` : "") : "还没挂卡";
    bar.style.width = "0%";
    return;
  }
  const outs = c.outputs || [];
  const out = outs[0];
  // 抠图这类卡要在画面上叠一张原图做对比（见 cmpSrc）
  const cmp = cmpSrc(c);
  // sig 而不是单个 url：一张卡可能出一整组图（分镜九宫格），少一张多一张都要重画
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
  }

  if (outs.length && body.dataset.url !== sig) {
    body.dataset.url = sig;
    body.classList.toggle("grid", outs.length > 1);
    applySize(c);      // 宫格的画面区是自动高度，进出宫格都要重新决定 c.h 生不生效
    // draggable=false：卡片里的图/视频不该能拖出去（拖出来是浏览器自带的行为，
    // 会拽出一个半透明幽灵图，还容易被当成"拖它去连线"）。CSS 里另有 user-drag 兜底
    // 卡片里的视频一律不给 controls：268px 宽的卡塞一条播放条就挡掉半幅画面。
    // 单击播放/暂停、按住拖是挪卡、拖底下那条 .vprog 定位进度、
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
          + `<div class="vprog" title="按住左右拖 → 定位进度（画面上按住是挪卡）"><i></i></div>`
        : out.kind === "audio"
          ? `<audio src="${out.url}" controls style="width:92%"></audio>`
          : cmp
            // 原图压在结果上面，按 --x 从左边裁开：往右拖 = 原图一点点长回来。
            // 文案不说"还原背景"：抠出背景那张卡拖回来的是主体，两张卡共用这一段
            ? `<div class="cmp" title="按住左右拖：跟原图对比，看边缘抠干净了没有">`
              + `<img class="new" src="${out.url}" alt="" draggable="false" data-i="0">`
              + `<img class="old" src="${cmp}" alt="" draggable="false">`
              + `<div class="cmpx"><i>⇔</i></div>`
              + `<div class="cmptip">按住往右拖 → 回到原图</div></div>`
            : `<img src="${out.url}" alt="" draggable="false">`;
    }
    if (cmp) applyCmp(c);
    // seed 不再压在画面上，改由右侧「历史产物」栏单独一行展示
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

/* ---------- 原图 ↔ 结果 对比线 ----------
   只有 manifest 里 compare: true 的能力才画（现在是人物提取 / 抠出背景 / 人物擦除 三条）。
   这几条的成败全在边缘那一圈，透明底的图单看只是一块空白，不跟原图叠着看根本判断不了
   干净没有。要给别的能力开就在 scan_workflows.py 的 COMPARE 集合里加一个 id。
   文案保持卡片中立（"回到原图"，不写"还原背景"）：往右拖回来的东西每张卡都不一样，
   三张卡共用这一段 DOM。 */

/** 这张卡该不该画对比线；该画就返回压在上面那张原图的 url。 */
function cmpSrc(c) {
  const md = CAPS[runCap(c)];
  if (!md || !md.compare) return null;
  const outs = c.outputs || [];
  if (outs.length !== 1 || outs[0].kind !== "image") return null;   // 宫格/视频不画
  const s = (md.inputs || []).find(x => x.type === "image");
  const a = s && (c.assets || {})[s.key];
  return a && a.kind === "image" ? a.url : null;
}

/** 把分割位置写到 DOM 上。位置存百分比而不是像素 —— 卡片能拉宽拉窄，
    存像素的话一改尺寸那条线就跑偏了。
    存在 c._cmp：下划线开头的键 plain() 会剥掉，不进存档 —— 这是「我刚看到哪」，
    不是这张卡的设置，重开项目该回到默认（0 = 只看结果，原图完全收在左边）。 */
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
    // 不 stopPropagation：照样冒泡上去选中这张卡
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

function cardBox(id) {
  const c = cardOf(id);
  if (!c) return null;
  const h = c._el ? c._el.offsetHeight : 230;
  return { x: c.x, y: c.y, w: cardW(c), h };
}

/** 选中的连线。存的是 PROJ.edges 里那条对象本身（不是下标）——
    删卡、换路由都会重排数组，下标会指到别人身上去。 */
let selEdge = null;

/** 风格顺着这根产物线往下传吗（见 styleCards）。风格继承**没有自己的连线**，
    它借的就是这根产物线；不画在线上这件事就是隐形的。 */
function carriesStyle(e) {
  if (isTextEdge(e)) return false;
  const a = cardOf(e.from), b = cardOf(e.to);
  return !!(a && b && !isStyle(a) && styleCards(a).length && !ownStyles(b).length);
}

function edgeWord(e) {
  const a = cardOf(e.from), b = cardOf(e.to);
  const nm = (c) => c ? titleOf(c) : "?";
  return isTextEdge(e) ? `风格：${nm(a)} → ${nm(b)}` : `${nm(a)} → ${nm(b)}`;
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
    // 画成同一根实线会让人以为风格卡也出图
    mk([isTextEdge(e) ? "txt" : "", e === selEdge ? "sel" : ""].filter(Boolean).join(" "));
    // 再叠一层紫虚线 = 这根产物线上还捎着风格
    if (carriesStyle(e)) mk("carry");
  }
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
    { icon: "✕", text: isTextEdge(e) ? "解除这张风格卡" : "删除连线",
      danger: true, run: () => delEdge(e) },
  ]);
}

/** 删一根线。产物线删掉**不动下游那一格里的素材** —— 那份文件早就搬过去了，
    删线只是断开"上游重跑一次、下游自动换成新产物"这条关系。
    素材也想清就右键那一格「清空这一格」，两件事分开。 */
function delEdge(e) {
  const b = cardOf(e.to), had = !!(b && (b.assets || {})[e.slot]);
  PROJ.edges = PROJ.edges.filter(x => x !== e);
  if (selEdge === e) selEdge = null;
  drawWires(); paintStyles();
  if (selId) openPanel(selId);
  save();
  toast(isTextEdge(e) ? "已解除风格"
    : had ? "已删除连线（那一格的素材还在，只是不再跟着上游重跑更新）"
    : "已删除连线");
}

/* ================= 交互：拖卡 / 平移 / 缩放 / 连线 ================= */
function pick(id) {
  selId = id;
  if (selEdge) { selEdge = null; drawWires(); }      // 选中的线和选中的卡只留一个
  for (const c of PROJ.cards) if (c._el) c._el.classList.toggle("sel", c.id === id);
  openHistory(id);      // 先开栏子再摆面板：面板要按变窄之后的画布找位置
  openPanel(id);
}

function startDrag(ev, c, d) {
  if (ev.button !== 0) return;
  ev.stopPropagation();
  ev.preventDefault();          // 标题栏是拖动把手，别让它同时被拖成半截高亮
  tipHide();
  pick(c.id);
  const s = { mx: ev.clientX, my: ev.clientY, x: c.x, y: c.y };
  let moved = false;
  const mv = (e) => {
    // 4px 阈值：手抖一下不算拖，也就不会白闪一次面板
    if (!moved && Math.abs(e.clientX - s.mx) + Math.abs(e.clientY - s.my) < 4) return;
    if (!moved) { moved = true; veilPanel(true); }
    c.x = Math.round(s.x + (e.clientX - s.mx) / view.k);
    c.y = Math.round(s.y + (e.clientY - s.my) / view.k);
    d.style.left = c.x + "px"; d.style.top = c.y + "px";
    drawWires();
  };
  const up = () => {
    document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up);
    if (moved) { veilPanel(false); placePanel(); save(); }
  };
  document.addEventListener("mousemove", mv); document.addEventListener("mouseup", up);
}

/** 拖角改大小。dir=1 是右下角（左上角钉住），dir=-1 是左上角（右下角钉住，
 *  所以位置要跟着一起变）。按住 Shift 只改宽 —— 宫格的排布只看宽度，调宫格卡时
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
    if (!moved) { moved = true; veilPanel(true); }
    c.w = fit(s.w + (e.clientX - s.mx) / view.k * dir, CW_MIN, CW_MAX);
    if (!e.shiftKey) c.h = fit(s.h + (e.clientY - s.my) / view.k * dir, CH_MIN, CH_MAX);
    applySize(c);
    if (dir < 0) {
      // 右下角钉住：位置补偿要用「真的量出来」的高度。宫格卡的画面区是自动高度，
      // c.h 根本没生效，照 c.h 算会让卡片凭空往上跳一截
      c.x = s.x + (s.w - c.w);
      c.y = s.y + (s.ch - d.offsetHeight);
      d.style.left = c.x + "px"; d.style.top = c.y + "px";
    }
    drawWires();
  };
  const up = () => {
    document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up);
    if (moved) { veilPanel(false); placePanel(); save(); }
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
  el.addcard.onclick = () => {
    const r = el.stage.getBoundingClientRect();
    openMenu(r.left + 140, r.top + 120, toWorld(r.left + 140, r.top + 120));
  };
  el.fit.onclick = () => { view = { x: 60, y: 70, k: 1 }; applyView(); placePanel(); save(); };
  el.jobsbtn.onclick = toggleJobs;
  addEventListener("resize", () => { placePanel(); placeJobs(); });

  // Ctrl+V 粘在鼠标那儿，所以一直记着鼠标落在世界坐标的哪个位置
  el.stage.addEventListener("mousemove", (ev) => { mouseW = toWorld(ev.clientX, ev.clientY); });
  el.stage.addEventListener("mouseleave", () => { mouseW = null; });

  el.stage.addEventListener("mousedown", (ev) => {
    if (ev.button !== 0) return;
    closeMenu(); closeJobs();
    selId = null; closePanel();
    if (selEdge) { selEdge = null; drawWires(); }
    for (const c of (PROJ ? PROJ.cards : [])) if (c._el) c._el.classList.remove("sel");
    const s = { mx: ev.clientX, my: ev.clientY, x: view.x, y: view.y };
    el.stage.classList.add("panning");
    const mv = (e) => { view.x = s.x + e.clientX - s.mx; view.y = s.y + e.clientY - s.my; applyView(); };
    const up = () => {
      el.stage.classList.remove("panning");
      document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up); save();
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
    applyView(); placePanel(); save();
  }, { passive: false });

  el.stage.addEventListener("dblclick", (ev) => {
    if (!PROJ || ev.target.closest(".card")) return;
    openMenu(ev.clientX, ev.clientY, toWorld(ev.clientX, ev.clientY));
  });

  el.stage.addEventListener("contextmenu", (ev) => {
    ev.preventDefault();
    if (!PROJ || ev.target.closest(".card")) return;
    tipHide();
    openMenu(ev.clientX, ev.clientY, toWorld(ev.clientX, ev.clientY));
  });

  // 点大图外面的黑底关掉；点到图/视频本身不关，否则想拉进度条一松手窗就没了
  el.view.addEventListener("mousedown", (ev) => {
    if (ev.target === el.view) closeViewer();
  });

  document.addEventListener("keydown", (ev) => {
    // 大图开着时左右键翻同一张卡的下一个产物（分镜九宫格）
    if (el.view.style.display !== "none" && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) {
      ev.preventDefault(); stepViewer(ev.key === "ArrowRight" ? 1 : -1); return;
    }
    // 画布快捷键：正在框里打字时一概不管（Ctrl+C 得留给复制文字，Delete 得留给删字）
    const t = ev.target, tag = (t.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select" || t.isContentEditable;
    if (PROJ && !typing && el.view.style.display === "none") {
      const c = cardOf(selId);
      if (ev.key === "Delete" || ev.key === "Backspace") {
        // 线优先：选中线的那一刻卡片选中就被清了，两个不会同时亮
        if (selEdge) { ev.preventDefault(); delEdge(selEdge); return; }
        if (c) { ev.preventDefault(); askDelCard(c); return; }
      }
      if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && !ev.altKey) {
        const k = ev.key.toLowerCase();
        if (k === "c" && c) { ev.preventDefault(); copyCard(c); return; }
        if (k === "v") { ev.preventDefault(); pasteCard(); return; }
      }
    }
    if (ev.key !== "Escape") return;
    // 大图开着时 Esc 只关大图，不该顺手把卡片选中状态和参数面板一起清掉
    if (el.view.style.display !== "none") { closeViewer(); return; }
    // 任务浮窗开着时 Esc 只关它，别顺手把选中的卡和参数面板一起清掉
    if (el.jobs.style.display !== "none") { closeJobs(); return; }
    closeMenu(); tipHide(); selId = null; closePanel();
    if (selEdge) { selEdge = null; drawWires(); }
    for (const c of (PROJ ? PROJ.cards : [])) if (c._el) c._el.classList.remove("sel");
  });
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
    b.onclick = () => { closeMenu(); it.run(); };
    el.menu.appendChild(b);
  }
  el.menu.style.display = "";
  el.menu.style.left = Math.min(cx, innerWidth - el.menu.offsetWidth - 8) + "px";
  el.menu.style.top = Math.min(cy, innerHeight - el.menu.offsetHeight - 8) + "px";
}
const closeMenu = () => (el.menu.style.display = "none");

/** 新建卡片菜单：按产出分成生图/生视频两类，条目直接是具体玩法。
    卡片名（"生视频"）和分类名是同一个词，所以列卡片会变成"生视频 > 生视频"，
    不如把卡内的模式摊出来选，建出来的卡就已经是想要的那个模式。

    工具（拼图/裁切这类只加工素材、不创作的）单独一组放最后：它的产出也是图片，
    混进"生图"里会让人以为它也在画画，而且真正要找它的时候翻不到。 */
const OUT_GROUP = { image: "生图", video: "生视频", audio: "生音频" };

function menuGroups() {
  const gs = [];
  for (const [out, gname] of Object.entries(OUT_GROUP)) {
    gs.push([gname, CARDS.filter(
      d => d.modes.length && d.kind !== "tool" && d.outputType === out)]);
  }
  gs.push(["工具", CARDS.filter(d => d.modes.length && d.kind === "tool")]);
  // 风格卡自己一组：它不出产物，混进"生图"里就是在说它也会画画
  gs.push(["风格", CARDS.filter(d => d.modes.length && d.kind === "style")]);
  return gs;
}

function openMenu(cx, cy, at) {
  const items = [];
  // 手上拿着复制的卡就摆在最前面：右键的这个位置就是要粘的位置，比记快捷键直观
  if (CLIP) items.push({
    icon: "⧉", text: "粘贴刚复制的卡片（Ctrl+V）",
    run: () => { mouseW = at; pasteCard(); },
  });
  for (const [gname, defs] of menuGroups()) {
    if (!defs.length) continue;
    items.push({ group: gname });
    for (const def of defs) {
      for (const md of def.modes) {
        items.push({
          icon: def.icon, text: md.name,
          run: () => addCard(def.id, at.x - CW / 2, at.y - 40, modeCap(md)),
        });
      }
    }
  }
  showMenu(cx, cy, "新建卡片", items);
}

/* ================= 产物大图 / 详情 ================= */
const VIEW_WORD = { video: "放大播放", audio: "放大播放" };

// 大图正在看哪一组产物的第几张：{ outs, idx, seed }
// outs 显式传进来而不是每次读 c.outputs：历史产物栏里点的是过去某一轮，
// 那一组产物已经不是卡片当前的 outputs 了
let VIEW = null;

function closeViewer() {
  el.vbox.innerHTML = "";          // 清空才会停掉正在播的视频
  el.view.style.display = "none";
  VIEW = null;
}

function openViewer(c, i = 0, outs = null, seed = undefined) {
  const list = outs || c.outputs || [];
  if (!list.length) { toast("这张卡还没有产物，先运行一次"); return; }
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
      { icon: "✎", text: "重命名卡片", run: () => renameCard(c) },
      { icon: "⧉", text: "就地复制一张", run: () => cloneCard(c) },
      { icon: "⎘", text: "复制，等下粘贴（Ctrl+C）", run: () => copyCard(c) },
      // 挂错卡了想全撤掉，比一根根找线点开销小
      ...(n ? [{ icon: "⊘", text: `解除挂着的 ${n} 张卡`, run: () => {
        PROJ.edges = PROJ.edges.filter(e => !(e.from === c.id && isTextEdge(e)));
        drawWires(); paintStyles(); if (selId) openPanel(selId); save();
      } }] : []),
      ...(c.w || c.h ? [{ icon: "⤡", text: "恢复默认大小", run: () => resetSize(c) }] : []),
      { icon: "✕", text: "删除卡片（Delete）", danger: true, run: () => delCard(c.id) },
    ]);
  }
  const outs = c.outputs || [];
  const out = outs[0];
  const vword = outs.length > 1 ? `逐张看大图（${outs.length} 张）` : (VIEW_WORD[out && out.kind] || "查看大图");
  showMenu(cx, cy, c.name || (cap ? cap.name : "卡片"), [
    ...(out ? [{ icon: "⛶", text: vword, run: () => openViewer(c) }] : []),
    { icon: "✎", text: "重命名卡片", run: () => renameCard(c) },
    { icon: "↑", text: "运行", run: () => run(c) },
    { icon: "⧉", text: "就地复制一张", run: () => cloneCard(c) },
    // Ctrl+C 是"拿在手上、想粘哪儿粘哪儿"，跟就地复制不是一件事，两条都留
    { icon: "⎘", text: "复制，等下粘贴（Ctrl+C）", run: () => copyCard(c) },
    // 拖角改过大小才给这条：没改过的卡摆一个点了没反应的菜单项只会让人以为坏了
    ...(c.w || c.h ? [{ icon: "⤡", text: "恢复默认大小", run: () => resetSize(c) }] : []),
    { icon: "✕", text: "删除卡片（Delete）", danger: true, run: () => delCard(c.id) },
  ]);
}

function resetSize(c) {
  delete c.w; delete c.h;      // 删掉而不是写回 268/168：默认值将来改了，老卡也跟着走
  applySize(c); drawWires(); placePanel(); save();
}

function renameCard(c) {
  const cap = capOf(c);
  const n = prompt("卡片名字（留空恢复成工作流名）", c.name || (cap ? cap.name : ""));
  if (n === null) return;
  c.name = n.trim().slice(0, 40) || null;
  paintTitle(c); save();
}

function cloneCard(c) {
  const n = addCard(c.type, c.x + 24, c.y + 28);
  Object.assign(n, {
    cap: c.cap, name: c.name, params: JSON.parse(JSON.stringify(c.params || {})),
    assets: JSON.parse(JSON.stringify(c.assets || {})),
  });
  paintTitle(n); paint(n); openPanel(n.id); save();      // paint：风格卡的正文在画面区
}

function addCard(type, x, y, cap) {
  const def = cardDef(type);
  const c = { id: uid(), type, cap: cap || modeCap(def.modes[0]), x: Math.round(x), y: Math.round(y), params: {}, assets: {}, status: null, progress: 0, outputs: [] };
  PROJ.cards.push(c);
  el.world.appendChild(buildCard(c));
  pick(c.id); drawWires(); save();
  return c;
}

function delCard(id) {
  PROJ.cards = PROJ.cards.filter(c => c.id !== id);
  PROJ.edges = PROJ.edges.filter(e => e.from !== id && e.to !== id);
  if (selId === id) { selId = null; closePanel(); }
  selEdge = null;                    // 连着它的线跟着没了，选中记号不能留成野指针
  render(); save();
}

/** Delete 键删卡。菜单里那条不问就删（点菜单是有意的），键盘容易手滑，
    所以**跑出过东西的卡**要问一句 —— 没有撤销，删掉那几轮的产物记录就找不回来了。 */
function askDelCard(c) {
  const n = (c.history || []).length;
  if ((c.outputs || []).length || n) {
    if (!confirm(`删除「${titleOf(c)}」？它有 ${n} 轮生成记录，删了找不回来。\n`
      + "（产物文件本身还在 ComfyUI 的输出目录里）")) return;
  }
  delCard(c.id);
  toast(`已删除「${titleOf(c)}」`);
}

/** Ctrl+C 存下的那张卡。只活在这一次打开里（不落盘）—— 它是"手上拿着的东西"，
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
  };
  pasteN = 0;
  // 产物和历史故意不带：复制一张卡不该让新卡假装它也跑过（跟"复制卡片"菜单同一个规矩）
  toast(`已复制「${titleOf(c)}」（不含产物）· Ctrl+V 粘贴`);
}

function pasteCard() {
  if (!CLIP) return toast("还没复制东西：先点一张卡，Ctrl+C");
  // cardDef 找不到会落回第一张卡（生图），照它粘会粘出一张不相干的卡，所以这儿要精确查
  if (!CARDS.some(d => d.id === CLIP.type)) return toast("这种卡在当前版本里不存在了，粘不了");
  // 鼠标不在画布上（比如刚在侧边栏点完）就按老位置错开一点，连着粘也不会重叠
  const at = mouseW || { x: CLIP.x + 24 * ++pasteN, y: CLIP.y + 28 * pasteN };
  const n = addCard(CLIP.type, at.x - CW / 2, at.y - 40, CLIP.cap);
  Object.assign(n, {
    name: CLIP.name,
    params: JSON.parse(JSON.stringify(CLIP.params)),
    assets: JSON.parse(JSON.stringify(CLIP.assets)),
  });
  if (CLIP.w) n.w = CLIP.w;
  if (CLIP.h) n.h = CLIP.h;
  paintTitle(n); applySize(n); paint(n); paintKind(n); paintPort(n);
  openPanel(n.id); save();
  toast(`已粘贴「${titleOf(n)}」`);
}

/* ================= 连线传产物 ================= */
function firstFreeSlot(c, kind) {
  const cap = capOf(c); if (!cap) return null;
  const specs = cap.inputs.filter(s => s.type === kind);
  return (specs.find(s => !c.assets[s.key]) || specs[0] || null);
}

/** 把风格卡挂到一张生成卡上。不搬文件、不占素材槽 —— 只记一条 @style 连线，
    真正的合并发生在提交那一刻（payloadOf），所以改风格卡不用重连、也不用重跑上游。 */
function linkStyle(from, to) {
  if (isStyle(to)) return toast("风格卡之间不用连线：一张卡可以挂好几张风格卡");
  const ps = promptSpecs(capOf(to));
  if (!ps.length) return toast(`「${titleOf(to)}」不写提示词，挂风格卡没有用`);
  if (PROJ.edges.some(e => e.from === from.id && e.to === to.id && e.slot === STYLE_SLOT)) {
    return toast("已经挂上了");
  }
  PROJ.edges.push({ from: from.id, to: to.id, slot: STYLE_SLOT });
  drawWires(); paintStyles();
  if (selId === to.id) openPanel(to.id);
  save();
  const n = styleReach(from).length;
  toast(`风格已挂给「${titleOf(to)}」` + (n ? `，下游 ${n} 张卡也跟着套` : ""));
}

async function linkTo(from, to) {
  if (!to) return;
  if (isStyle(from)) return linkStyle(from, to);
  if (isStyle(to)) return toast("风格卡不收素材：把它的出口拖到生图/生视频卡上");
  const out = (from.outputs || [])[0];
  if (!out) return toast("上游还没有产物，先运行它");
  // 路由卡先按上游产物的类型切到对应那一路，切完槽位名才对得上（见 routeFor）
  const r = routeFor(to, out.kind);
  if (r) { to.cap = r.cap; to.assets = {}; paintTitle(to); }
  const spec = r ? { key: r.slot, label: KIND_ZH[out.kind] || "素材" }
    // 同类型的槽优先（视频产物接进视频槽）；没有就沿用老规矩，当参考图使
    : (firstFreeSlot(to, out.kind)
      || firstFreeSlot(to, out.kind === "audio" ? "audio" : "image"));
  if (!spec) return toast("下游卡没有可接收的槽位");
  PROJ.edges = PROJ.edges.filter(e => !(e.to === to.id && (r || e.slot === spec.key)));
  PROJ.edges.push({ from: from.id, to: to.id, slot: spec.key });
  drawWires(); paintStyles(); save();
  try {
    // 风格是顺着这根线传下来的（没有单独的连线），接线那一刻就说一句，不然是隐形的
    const inh = styleTexts(to).length && promptSpecs(capOf(to)).length;
    toast(`引用上游产物 → ${spec.label}` + (inh ? "；上游的风格也跟着传下来了" : ""));
    to.assets[spec.key] = await importOutput(out);
    paintKind(to);
    if (selId === to.id) openPanel(to.id);
    save();
  } catch (e) { toast("引用失败：" + e.message); }
}

/** 这个模式收得下 kind 类型的素材吗。
    路由卡看它有没有那一路；阶梯模式的 md.id 是张数最多那条（超集），
    它有的槽少张数那条都有，所以只看超集就够。 */
function modeTakes(md, kind) {
  if (md.route) return !!md.route[kind];
  const cap = CAPS[modeCap(md)];
  return !!cap && cap.inputs.some(s => s.type === kind);
}

/** 从出口拖到空白处：列出真收得下这份产物的玩法让人自己挑。
    以前是按产出类型猜一张（图→生视频、视频→生图），猜错的概率不低，
    而且"视频接进生图当参考图"根本跑不通（LoadImage 读不了 mp4）。
    这里只列槽位类型对得上的，选完直接建卡 + 连线。 */
async function spawnDownstream(from, at, cx, cy) {
  // 风格卡拖出来：列所有写提示词的玩法（工具卡不写提示词，自动落选）
  if (isStyle(from)) {
    const items = [];
    for (const [gname, defs] of menuGroups()) {
      const hit = [];
      for (const def of defs) {
        for (const md of def.modes) if (promptSpecs(CAPS[modeCap(md)]).length) hit.push([def, md]);
      }
      if (!hit.length) continue;
      items.push({ group: gname });
      for (const [def, md] of hit) {
        items.push({
          icon: def.icon, text: md.name,
          run: () => linkStyle(from, addCard(def.id, at.x, at.y - 40, modeCap(md))),
        });
      }
    }
    if (!items.length) return;
    return showMenu(cx, cy, "把这段风格挂给…", items);
  }
  const out = (from.outputs || [])[0];
  // 还没跑过就按这条能力"将来会出什么"来列 —— 先把链子搭起来、回头再跑是常见做法，
  // 不能因为上游还空着就什么都不给建（linkTo 那边会提醒去跑上游）
  const kind = out ? out.kind : (capOf(from) || defOf(from) || {}).outputType;
  if (!kind) return;
  const items = [];
  for (const [gname, defs] of menuGroups()) {
    const hit = [];
    for (const def of defs) {
      for (const md of def.modes) if (modeTakes(md, kind)) hit.push([def, md]);
    }
    if (!hit.length) continue;
    items.push({ group: gname });
    for (const [def, md] of hit) {
      items.push({
        icon: def.icon, text: md.name,
        run: async () => {
          const c = addCard(def.id, at.x, at.y - 40, modeCap(md));
          await linkTo(from, c);
        },
      });
    }
  }
  const zh = KIND_ZH[kind] || kind;
  if (!items.length) return toast(`没有卡片收${zh}素材`);
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
const HIST_MAX = 20;               // 每张卡留 20 轮；再往前的去 ComfyUI 的 output 目录里找

/** 一轮产物的签名，用来判重：轮询会反复读到同一轮，不能记成好多条 */
const runSig = (outs) => (outs || []).map(o => o.url).join("|");

/** 把卡片刚出的这一轮记进历史（最新的在最前面） */
function pushHistory(c) {
  const outs = c.outputs || [];
  if (!outs.length) return;
  c.history = c.history || [];
  const sig = runSig(outs);
  if (c.history.some(h => runSig(h.outputs) === sig)) return;
  c.history.unshift({
    ts: Date.now(), seed: c.seed != null ? c.seed : null,
    cap: runCap(c), ms: c.ms != null ? c.ms : null, outputs: outs,
    // 挂了风格卡时，卡上提示词框里的字并不是真发出去的那段（风格是提交那一刻并进去的）。
    // 只有把当时真提交的整段留下来，这一轮才复现得出来 —— 风格卡后来改了、解除了都不影响它
    ...(c._sent ? { prompt: c._sent } : {}),
  });
  if (c.history.length > HIST_MAX) c.history.length = HIST_MAX;
}

/** 老项目里的卡只有 outputs 没有 history，补一条占位，别让人以为产物丢了。
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
  if (isStyle(c)) return closeHistory();   // 风格卡永远没有产物，别摆一个空栏子占地方
  seedHistory(c);
  const list = document.createElement("div"); list.className = "hlist";
  const cap = capOf(c);

  const hd = document.createElement("div"); hd.className = "hhd";
  hd.innerHTML = `<b>历史产物</b><span class="n"></span><button class="x" title="收起">✕</button>`;
  hd.querySelector(".n").textContent = c.history.length ? `${c.history.length} 轮` : "";
  hd.querySelector(".x").onclick = closeHistory;

  if (!c.history.length) {
    const e = document.createElement("div"); e.className = "hempty";
    e.textContent = "这张卡还没出过东西。\n运行一次，每一轮的产物和 seed 都会留在这里。";
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

  // 套了风格卡的那几轮：把当时真提交的整段提示词收在这儿。卡上那个框里的字
  // 不等于跑出这一轮的那段话，不放出来的话这一轮等于没法复现
  if (h.prompt) {
    const rp = document.createElement("details"); rp.className = "rp";
    const sm = document.createElement("summary"); sm.textContent = "当时提交的提示词";
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

/** 拖卡片时把面板藏起来（用 visibility 而不是 display：还能量到宽高，松手好复位） */
function veilPanel(on) {
  if (el.panel.style.display === "none") return;
  el.panel.style.visibility = on ? "hidden" : "";
}

function placePanel() {
  if (el.panel.style.display === "none") return;
  const c = PROJ && PROJ.cards.find(x => x.id === el.panel._id);
  if (!c || !c._el) return closePanel();
  const GAP = 8, TOP = 52;                 // TOP 给顶栏让位
  // 先限高再量高：漫剧20宫格那种 6 个提示词的面板不封顶会直接长到屏幕外，
  // 量出来的 offsetHeight 就没法用来做"放不下就换边"的判断了
  el.panel.style.maxHeight = (innerHeight - TOP - GAP) + "px";
  const r = el.stage.getBoundingClientRect();
  const w = el.panel.offsetWidth, h = el.panel.offsetHeight;
  // 卡片在屏幕上的矩形（offsetHeight 是世界坐标，要乘缩放）
  const cx = r.left + view.x + c.x * view.k, cy = r.top + view.y + c.y * view.k;
  const cw = cardW(c) * view.k, ch = c._el.offsetHeight * view.k;
  // 横向按画布自己的左右边界夹，而不是整个窗口：右边开着历史产物栏时，
  // 按 innerWidth 夹会让面板滑到栏子底下去
  const clampX = (v) => Math.max(r.left + GAP, Math.min(v, r.right - w - GAP));
  const clampY = (v) => Math.max(TOP, Math.min(v, innerHeight - h - GAP));
  const midX = clampX(cx + cw / 2 - w / 2), midY = clampY(cy + ch / 2 - h / 2);
  // 下 → 右 → 上 → 左，取第一个放得下的；四边都放不下就挑那边空地最宽的
  const sides = [
    { room: innerHeight - GAP - (cy + ch + GAP), left: midX, top: cy + ch + GAP, need: h },
    { room: r.right - GAP - (cx + cw + GAP), left: cx + cw + GAP, top: midY, need: w },
    { room: (cy - GAP) - TOP, left: midX, top: cy - GAP - h, need: h },
    { room: (cx - GAP) - (r.left + GAP), left: cx - GAP - w, top: midY, need: w },
  ];
  const p = sides.find(s => s.room >= s.need) || sides.reduce((a, b) => (b.room > a.room ? b : a));
  el.panel.style.left = clampX(p.left) + "px";
  el.panel.style.top = clampY(p.top) + "px";
}

function openPanel(id) {
  const c = PROJ.cards.find(x => x.id === id);
  if (!c) return closePanel();
  const def = defOf(c), cap = capOf(c);
  // 切 tab / 传图都会整块重画，同一张卡要留住滚动位置，不然每次都弹回顶部
  const old = el.panel.querySelector(".pbody");
  const scrolled = (old && el.panel._id === id) ? old.scrollTop : 0;
  el.panel._id = id;
  el.panel.innerHTML = "";
  el.panel.style.display = "";
  el.panel.style.visibility = "";     // 上一次拖卡片藏起来后没复位的话，这里兜一下

  if (isStyle(c)) return stylePanel(c);

  // --- 模式切换 ---
  if (def.modes.length > 1) {
    const m = document.createElement("div"); m.className = "modes";
    for (const md of def.modes) {
      const b = document.createElement("button");
      b.className = modeHas(md, c.cap) ? "on" : "";
      b.textContent = md.name;
      hoverBrief(b, () => CAPS[modeCap(md)], () => md.name);
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
  // 路由卡的入口只有一格、两种素材都收，所以空着的时候不能叫「图片」（见 ROUTE_CARDS.entry）。
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

  // --- 玩法说明 ---
  // 能力本身的介绍（cap.note、吃什么吐什么）不在这儿画：面板一打开就是一大段字，
  // 把素材槽和参数挤到下面去，而这段话看一遍就够了。改成鼠标停在卡片顶栏上才显示
  // （buildCard 里的 hoverBrief）。下面这两条留着 —— 它们不是介绍，是"现在会跑哪条"
  // 的实时反馈，看的时候正需要对着参数看。
  // 路由卡：说清楚放什么会跑什么，并标出现在这一格是哪一路
  if (md && md.route) {
    const filled = Object.keys(md.route).find(k => md.route[k].cap === c.cap
      && c.assets[md.route[k].slot]);
    const n = document.createElement("div"); n.className = "pnote";
    n.textContent = md.entry.hint
      + (filled ? `现在放的是${KIND_ZH[filled] || filled}，会跑「${cap.name}」。`
        : "现在还没放素材。");
    body.appendChild(n);
  }
  // 合并模式：把"传几张跑哪条"摊开写，并标出现在会跑哪条
  if (md && md.ladder) {
    const now = runCap(c);
    const n = document.createElement("div"); n.className = "pnote";
    n.textContent = "看图片张数决定跑哪条工作流："
      + Object.keys(md.ladder).map(Number).sort((a, b) => a - b)
        .map(k => `${k} 张 → ${(CAPS[md.ladder[k]] || {}).name || md.ladder[k]}`).join("；")
      + `。当前 ${filledImgs(c)} 张，会跑「${(CAPS[now] || {}).name || now}」。`;
    body.appendChild(n);
  }

  // --- 素材槽 ---
  // 放在提示词前面：漫剧那种一图一提示词的工作流，tab 是跟着图长出来的，
  // 先看到图槽才讲得通
  const media = specs.filter(x => MEDIA.includes(x.type));
  if (media.length) {
    const wrap = document.createElement("div"); wrap.className = "slots";
    for (const s of media) wrap.appendChild(slotEl(c, s));
    body.appendChild(wrap);
  }

  // --- 音频选区 ---
  // 起止点不画成两个文本框：要裁哪一段全靠听（第几秒开始唱），手打 "0:05" 得先知道
  // 这音频哪一秒在唱什么，只能反复试跑。manifest 里的 rangeOf 指向它裁的那个音频槽
  const ranged = new Set();
  for (const s of media) {
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
    if (!paired.includes(s) || paired.length < 2) body.appendChild(promptBlock(c, s));
  }
  for (const s of tpl) body.appendChild(templateBlock(c, s));

  // --- 常规参数 ---
  // mirror = 多个节点共用同一个参数框（如两个采样器共用种子），只画一次
  // ranged = 已经画成上面那条选区了，别在这儿再出一对文本框
  const rows = specs.filter(x => !MEDIA.includes(x.type) && x.type !== "textarea"
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
  for (const s of rows) addRow(body, s);

  // --- 高级 ---
  const adv = specs.filter(x => x.advanced && !x.mirror && !ranged.has(x.key));
  if (adv.length) {
    const box = document.createElement("div"); box.className = "adv";
    const t = document.createElement("button");
    t.textContent = `▸ 高级 (${adv.length})`;
    const items = document.createElement("div"); items.className = "items"; items.style.display = "none";
    // 高级参数默认值都是调好的，不写清楚推荐多少、为什么，用户只能瞎拉滑条
    for (const s of adv) addRow(items, s);
    t.onclick = () => {
      const open = items.style.display === "none";
      items.style.display = open ? "" : "none";
      t.textContent = (open ? "▾" : "▸") + ` 高级 (${adv.length})`;
      placePanel();
    };
    box.appendChild(t); box.appendChild(items);
    body.appendChild(box);
  }

  if (c.error) body.appendChild(errBox(c.error));

  // --- 底部 ---
  const foot = document.createElement("div"); foot.className = "foot";
  const running = c.status === "queued" || c.status === "running";
  const info = document.createElement("span");
  info.style.cssText = "color:#8a8a94;font-size:12px";
  info.textContent = cap.outputType === "video" ? "输出：视频" : "输出：图片";
  // 说明搬去卡片顶栏悬停了，这儿得留一句指路：素材有硬性要求（比如每张图必须是
  // 四宫格拼图）的玩法，没看过那段话就是白跑一轮
  if (cap.note) info.textContent += " · 玩法说明：鼠标停在卡片标题上";
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

/** 风格卡的面板。它没有能力、没有素材、没有参数，只有一段文字和"挂给了谁"，
    所以整块单独画，不走上面那套（specs / 旋钮 / 运行按钮一个都用不上）。 */
function stylePanel(c) {
  const body = document.createElement("div"); body.className = "pbody";
  el.panel.appendChild(body);

  const n = document.createElement("div"); n.className = "pnote";
  n.textContent = "这张卡不生成任何东西。把它的出口（右边那颗点）拖到生图/生视频卡上，"
    + "提交那一刻这段文字会并进那张卡的提示词里 —— 一张风格卡可以同时挂好几张卡，"
    + "改一次，挂着的全跟着变。\n"
    + "挂了一张，它下游整条链都跟着套：产物接给谁，风格就传给谁，"
    + "不用每一棒都挂一遍（中间夹着放大、补帧这种不写提示词的卡也照样往下传）。"
    + "下游哪张卡自己挂了风格，那张卡起就以它自己的为准，这一份不再往下传。\n"
    + `默认是风格在前、空一行再接卡片自己的提示词。想换位置就在下面写上 ${STYLE_PH}，`
    + "卡片的提示词会填到那个位置去（比如「照下面的内容画一张图：" + STYLE_PH
    + "。整体是哥特暗黑定格动画风格」）。\n"
    + "只写风格：画风、色调、光线、镜头质感、画质词。别在这儿写具体画面内容 ——"
    + "那是每张卡自己的事，写在这儿会让所有卡画同一个东西。";
  body.appendChild(n);

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
  t.textContent = edges.length ? `挂着 ${edges.length} 张卡` : "还没挂给任何卡";
  box.appendChild(t);
  if (!edges.length) {
    const p = document.createElement("div"); p.className = "anote";
    p.textContent = "把右边那颗点拖到一张生图/生视频卡上；拖到空白处会列出所有写提示词的玩法。";
    box.appendChild(p);
  }
  for (const e of edges) {
    const to = PROJ.cards.find(x => x.id === e.to);
    if (!to) continue;
    const r = document.createElement("div"); r.className = "slink";
    const a = document.createElement("button"); a.className = "nm";
    a.textContent = titleOf(to);
    a.title = "选中这张卡（面板上能看到合并后的提示词）";
    a.onclick = () => pick(to.id);
    const x = document.createElement("button"); x.className = "off";
    x.textContent = "解除"; x.title = "这张卡不再套用本风格";
    x.onclick = () => {
      PROJ.edges = PROJ.edges.filter(y => y !== e);
      drawWires(); paintStyles(); openPanel(c.id); save();
    };
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
      a.title = "选中这张卡（面板上能看到合并后的提示词）";
      a.onclick = () => pick(to.id);
      const s = document.createElement("span"); s.className = "off ro";
      s.textContent = "继承"; s.title = "上游那张卡传下来的，要断就断它们之间那根产物连线";
      r.append(a, s);
      box.appendChild(r);
    }
  }
  body.appendChild(box);
  placePanel();
}

/** 图 ↔ 提示词是一对一跑的（第 k 张图配第 k 条提示词，见 manifest 的 pairWith），
    所以提示词收成一排 tab、跟着图走：没上传第 k 张图，第 k 条提示词就不存在。
    后端也照这个关系清空未配对的提示词，两边的列表长度才对得上。 */
function promptTabs(c, list) {
  const cap = capOf(c);
  // tab 名跟着素材槽走：槽叫"四宫格3"，这条就是"四宫格3 的提示词"
  const name = (s) => slotName(cap.inputs.find(x => x.key === s.pairWith) || s);
  const wrap = document.createElement("div"); wrap.className = "ptabs";
  const strip = document.createElement("div"); strip.className = "tabs";
  const on = list.map(s => !!c.assets[s.pairWith]);
  if (c._tab == null || !on[c._tab]) c._tab = on.indexOf(true);

  list.forEach((s, i) => {
    const b = document.createElement("button");
    const txt = String(c.params[s.key] != null ? c.params[s.key] : s.default || "").trim();
    b.textContent = name(s) + (on[i] && txt ? " ●" : "");
    if (!on[i]) {
      b.className = "off";
      b.title = `上传「${name(s)}」后启用 —— 提示词是一张图配一条`;
    } else {
      b.className = i === c._tab ? "on" : "";
      b.onclick = () => { c._tab = i; openPanel(c.id); };
    }
    strip.appendChild(b);
  });
  wrap.appendChild(strip);
  if (c._tab >= 0) wrap.appendChild(promptBlock(c, list[c._tab], name(list[c._tab]) + " 的提示词"));
  else {
    const p = document.createElement("div"); p.className = "tabempty";
    p.textContent = "先上传图片。每加一张图，这里就多一条它专属的提示词。";
    wrap.appendChild(p);
  }
  return wrap;
}

/** 提示词块：默认值是工作流作者的演示文案，必须让用户看见并且一键清掉。
    优化过之后这一格有两份词（原词 / 优化后），页签选哪份就提交哪份。 */
function promptBlock(c, s, label) {
  const wrap = document.createElement("div"); wrap.className = "pblock";
  const scs = styleCards(c);
  const styles = scs.map(styleTextOf);
  const own = ownStyles(c);

  // ✨优化只画在"主提示词"那一格，而且这条能力得在扫描器的 REWRITE 表里登记过
  // （manifest.rewrite）。分镜那种一图一句的卡本来就没登记
  const rcap = CAPS[runCap(c)] || capOf(c);
  const canOpt = !!(rcap && rcap.rewrite
    && s.key === (promptSpecs(rcap)[0] || {}).key);
  const opt = canOpt ? optOf(c, s.key) : null;
  // 有优化结果时页签说话，没有就一直是原词
  const useOpt = !!(opt && c.optUse && c.optUse[s.key]);

  const hd = document.createElement("div"); hd.className = "phd";
  const nm = document.createElement("span"); nm.textContent = label || s.label;
  const tag = document.createElement("span"); tag.className = "demo";
  tag.textContent = "⚠ 这是示例文案，改成你要的内容";
  const clr = document.createElement("button");
  clr.textContent = useOpt ? "扔掉这份" : "清空";
  if (useOpt) clr.title = "删掉优化结果，切回你自己写的原词（原词一直没被动过）";
  hd.append(nm, tag);
  if (canOpt) hd.appendChild(optBtn(c, s, !!opt));
  hd.appendChild(clr);
  wrap.appendChild(hd);

  // 两份词的页签。优化前不画 —— 只有一份词的时候页签是噪音
  if (opt) wrap.appendChild(optTabs(c, s, useOpt));

  const ta = document.createElement("textarea");
  ta.placeholder = `${label || s.label}：描述你想要的画面/动作/镜头`;
  ta.value = useOpt ? opt
    : (c.params[s.key] != null ? c.params[s.key] : (s.default || ""));
  // 优化后那份是给模型看的格式化长文（H3 的六段式能有四五百词），框子要高一点
  if (useOpt) ta.classList.add("optta");
  wrap.appendChild(ta);

  // 「实际提交」读数。只有原词那份需要它：风格是提交那一刻才并进去的
  // （合并结果**不写回 c.params** —— 写回去风格就固化在这张卡上了，改风格卡时下游
  // 不跟着变，还会一路叠加），所以面板上的框 ≠ 真提交的，必须摆出来。
  // 优化后那份不需要：风格在优化那一步就融进去了，框里就是原样提交的东西。
  // 风格可能是从上游顺着连线传下来的（这张卡上没有那根线），不说清来路用户会以为面板串了
  let pv = null;
  if (styles.length && !useOpt) {
    pv = document.createElement("div"); pv.className = "stypv";
    const ph = document.createElement("div"); ph.className = "hd";
    ph.textContent = `实际提交（已套用 ${styles.length} 张风格卡`
      + (own.length ? "" : " · 从上游继承") + "）";
    // 自己挂了就不继承上游，这件事不摆出来就是"上游那张风格白挂了"
    const over = own.length ? upStyles(c) : [];
    ph.title = (own.length ? "这张卡自己挂的：" : "从上游继承：") + scs.map(titleOf).join("、")
      + (own.length ? "" : "\n要断就断它跟上游那根产物连线")
      + (over.length ? `\n上游还传了「${over.map(titleOf).join("、")}」，`
        + "但这张卡自己挂了风格，就以自己的为准；两份都要就把上游那张也拖到这张卡上" : "");
    const pb = document.createElement("div"); pb.className = "tx";
    pv.append(ph, pb);
    pv._tx = pb;
    wrap.appendChild(pv);
  }

  const sync = () => {
    // 示例文案警告只对原词有意义：优化后的那份是模型写的，不可能等于作者的演示文案
    const isDemo = !useOpt && !!s.default && ta.value.trim() === String(s.default).trim();
    tag.style.display = isDemo ? "" : "none";
    ta.classList.toggle("isdemo", isDemo);
    if (pv) pv._tx.textContent = withStyle(ta.value, styles);
  };
  // 改哪个页签写回哪一份。优化后的也让改 —— 模型偶尔会漏个标签、多写一句，
  // 让人当场补掉比重跑一轮二十秒划算
  ta.oninput = () => {
    if (useOpt) { c.opt[s.key] = ta.value; } else { c.params[s.key] = ta.value; }
    sync(); save();
  };
  clr.onclick = () => {
    // 在「优化后」页签上，"清空"唯一有意义的解释是"这份不要了" —— 留一个空的
    // 优化结果在那儿只会让人对着一个空框发愣。原词那份一直没被动过，直接切回去
    if (useOpt) {
      delete c.opt[s.key]; delete c.optUse[s.key];
      if (c.optStyle) delete c.optStyle[s.key];
      save(); return repanel(c);
    }
    ta.value = ""; c.params[s.key] = ""; sync(); ta.focus(); save();
  };
  sync();
  if (c._rwErr && c._rwErr.key === s.key) {
    const e = document.createElement("div"); e.className = "rwerr";
    e.textContent = "优化没成功：" + c._rwErr.msg;
    wrap.appendChild(e);
  }
  return wrap;
}

/** 「✨优化」按钮。已经优化过就是「重新优化」（换个种子再跑一遍，覆盖旧的那份）。 */
function optBtn(c, s, done) {
  const b = document.createElement("button"); b.className = "rwbtn";
  const busy = !!c._rwBusy;
  b.textContent = busy ? "优化中…" : (done ? "重新优化" : "✨优化");
  b.disabled = busy;
  b.title = busy ? "本地大模型正在优化，第一次要等它加载模型，十几到几十秒"
    : "把这段话交给本地大模型，改成这个模型认的写法。"
    + "\n挂了风格卡的话，风格会一起融进优化结果里"
    + "\n原词不会被动，优化完多一个页签，用哪份你选";
  b.onclick = () => doRewrite(c, s);
  return b;
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
  // 风格是烙进优化结果里的，不会跟着风格卡变。所以对比一下"优化时挂的"和"现在挂的"
  const cur = styleTexts(c).join("\n\n");
  const was = (c.optStyle && c.optStyle[s.key]) || "";
  const stale = cur !== was;
  strip.append(
    mk(!useOpt, "原词", "你自己写的那段。生成时"
      + (cur ? "会在前面拼上风格卡的文字" : "原样提交")),
    mk(useOpt, "✨优化后", "本地大模型优化出来的那段，已经是这个模型认的格式。"
      + (was ? "\n风格已经融在里面了，生成时不再另外拼风格卡" : "")
      + "\n原样提交"));

  const note = document.createElement("span"); note.className = "note";
  if (!useOpt) {
    note.textContent = cur ? "提交时会拼上风格卡" : "";
  } else if (stale) {
    // 这三种都是"优化结果里的风格已经不是现在这张风格卡了"，不说出来风格就静悄悄地错了
    note.className = "note bad";
    note.textContent = "⚠ " + (!was ? "风格卡是优化之后挂的，这份里没有它"
      : !cur ? "风格卡摘了，这份里还留着它" : "风格卡换过了，这份里还是旧的")
      + " —— 点「重新优化」";
    note.title = "优化结果是一段写死的文字，风格在优化那一刻就烙进去了，"
      + "之后改风格卡不会让它跟着变。要么重新优化一次，要么切回「原词」。";
  } else {
    note.textContent = cur ? "已含风格，提交时不再另拼风格卡" : "按模型认的格式写好了，原样提交";
  }
  strip.appendChild(note);
  return strip;
}

/** 重画面板，但只在它确实开着这张卡的时候 —— 优化要等好一会儿，
    这中间用户可能已经关了面板、或去看别的卡了，别硬把面板抢回来。 */
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
async function doRewrite(c, s) {
  const cap = CAPS[runCap(c)] || capOf(c);
  if (!cap || !cap.rewrite) return;
  // 拿的一定是**原词**：优化的输入永远是用户自己写的那段，不是上一轮的优化结果
  // （拿优化结果再优化会一轮轮越写越长，最后跟用户想要的没关系了）
  const src = String(c.params[s.key] != null ? c.params[s.key] : (s.default || ""));
  if (!src.trim()) return toast("先写一句你想要什么，优化才有东西可改");
  const pl = payloadOf(c);
  c._rwBusy = true; c._rwErr = null;
  repanel(c);
  try {
    // prompt 是原词，风格另外给 —— 让模型把风格融进输出里。用户选「优化后」时
    // 提交的就是这份输出原样，系统不再拼风格卡（payloadOf），所以必须融进去
    const r = await jpost("/api/rewrite", {
      capability: cap.id, params: pl.params, assets: pl.assets,
      prompt: src, style: styleTexts(c).join("\n\n"),
      project: PROJ && PROJ.id, card: c.id, cardName: titleOf(c),
    });
    c.opt = c.opt || {}; c.optUse = c.optUse || {}; c.optStyle = c.optStyle || {};
    c.opt[s.key] = r.text;
    c.optUse[s.key] = true;             // 跑完直接切过去，不然还得再点一下才看得见
    // 记下这份优化是配着哪段风格跑出来的。之后风格卡换了/摘了/新挂了，
    // 优化结果**不会**跟着变（风格是烙在文字里的），页签那儿要能说出来
    c.optStyle[s.key] = styleTexts(c).join("\n\n");
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

/** 卡脚最左边那枚徽标：这张卡出图还是出视频。
    卡片图标（🧩 工具、✨ 画质增强）和用户自己改的卡名都可能完全看不出类型，
    产物出来之前画面区又是空的 —— 所以类型要有个固定位置常驻，不靠猜。
    路由卡还没放素材时两路都可能，标「跟素材」；放进去那一刻 paintTitle 会重刷。
    跟着 paintTitle 一起刷：换模式、换路由、按张数换能力都会改产出类型。 */
function paintKind(c) {
  const k = c._el && c._el.querySelector(".cf .kt");
  if (!k) return;
  // 风格卡不出东西，徽标位上说清它是干什么的 —— 不然它长得跟别的卡一样，
  // 只是一直"待生成"，会有人反复去点运行
  if (isStyle(c)) {
    k.dataset.kind = "style";
    k.textContent = "🎨 只加提示词";
    k.title = "这张卡不生成任何东西：把它的出口拖到生图/生视频卡上，"
      + "提交时这段风格会并进那张卡的提示词";
    return;
  }
  const md = modeOf(c);
  const undecided = kindUndecided(c);
  const kind = outKindOf(c);
  k.dataset.kind = undecided ? "both" : kind;
  k.textContent = undecided ? "🖼🎬 跟素材" : kind === "video" ? "🎬 视频" : "🖼 图片";
  const ins = md && md.route ? Object.keys(md.route)
    : [...new Set(((capOf(c) || {}).inputs || [])
        .filter(s => MEDIA.includes(s.type)).map(s => s.type))];
  k.title = (undecided ? "放图片就出图片、放视频就出视频" : `这张卡出${KIND_ZH[kind]}`)
    + (ins.length ? `；要${ins.map(x => KIND_ZH[x] || x).join(" / ")}素材` : "；不用素材");
  // 还没出过产物时画面区那个大图标也是同一个信息，一起换掉（有产物就别动它）
  const body = c._el.querySelector(".body");
  if (body && body.querySelector(".ph")) body.innerHTML = phHTML(c);
}

/** 左边那颗绿点：这张卡收得下上游产物。纯文生图没有素材槽，不画点 ——
    画了就是在说"往这儿接"，接过去只会弹"没有可接收的槽位"。
    路由卡按它两路的类型报（图片/视频都收），不管当前切到了哪一路。
    跟着 paintTitle 一起刷，因为换模式、换路由都会改能力，能收什么也跟着变。 */
function paintPort(c) {
  const p = c._el && c._el.querySelector(".inport");
  if (!p) return;
  const md = modeOf(c), cap = capOf(c);
  // 能接风格卡的也点这颗点：不然用户不知道往哪儿拖那根线
  const styleOk = !isStyle(c) && promptSpecs(cap).length;
  const kinds = md && md.route ? Object.keys(md.route)
    : [...new Set((cap ? cap.inputs : []).filter(s => MEDIA.includes(s.type)).map(s => s.type))];
  p.style.display = (kinds.length || styleOk) ? "" : "none";
  p.title = kinds.length
    ? `上游卡的产物拖到这里（收${kinds.map(k => KIND_ZH[k] || k).join(" / ")}${styleOk ? "，也收风格卡" : ""}）`
    : "风格卡的出口拖到这里";
}

function slotEl(c, s) {
  const a = c.assets[s.key];
  const d = document.createElement("div");
  d.className = "slot" + (a ? " filled" : s.required ? " req" : "");
  d.title = (s.hint || slotName(s)) + (s.required ? "（必填）" : "");
  d.innerHTML = `<div class="box"></div><span class="lbl"></span>`;
  d.querySelector(".lbl").textContent = slotName(s);
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
    showMenu(ev.clientX, ev.clientY, a.origin || slotName(s), [
      { icon: "⛶", text: a.kind === "image" ? "查看大图" : "放大播放", run: () => openAsset(a) },
      { icon: "📁", text: "定位文件", run: () => revealAsset(a) },
      {
        icon: "✕", text: "清空这一格", danger: true, run: () => {
          delete c.assets[s.key];
          PROJ.edges = PROJ.edges.filter(e => !(e.to === c.id && e.slot === s.key));
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
    n.textContent = `先在上面的「${slotName(slot)}」传一段音频，这里就能试听、拖着选要用的一段。`;
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
  // 路由卡那一格两种都收，accept 不能只写一种，否则选视频时文件对话框里根本看不到
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
  // 风格卡是提交这一刻才并进提示词的（不写回 c.params，见 promptBlock）
  const styles = styleTexts(c);
  const pkeys = new Set(promptSpecs(cap).map(s => s.key));
  for (const s of cap.inputs) {
    if (MEDIA.includes(s.type) || s.mirror) continue;
    const v = c.params[s.key];
    if (v != null) params[s.key] = v;
    else if (s.type === "seed") params[s.key] = -1;      // 每次随机
    else if (s.default !== undefined) params[s.key] = s.default;
    if (!pkeys.has(s.key)) continue;
    // 用了「优化后」那份：它是整段现成的提示词，风格在优化那一步就已经融进去了，
    // 这儿再拼一遍就是两份风格。所以优化后的词**原样提交**，不过 withStyle
    const opt = usingOpt(c, s.key);
    if (opt != null) params[s.key] = opt;
    else if (styles.length) params[s.key] = withStyle(params[s.key], styles);
  }
  for (const [k, v] of Object.entries(c.assets)) if (v && v.ref) assets[k] = v.ref;
  // card/cardName 只给任务浮窗用：光有能力名说不清是哪张卡在跑，也没法点回去
  return { capability: cap.id, params, assets,
           project: PROJ && PROJ.id, card: c.id, cardName: titleOf(c) };
}

async function run(c) {
  if (isStyle(c)) return toast("风格卡不用运行：它只把风格并进挂着的那几张卡的提示词");
  const cap = capOf(c);
  if (!cap) return toast("能力不可用");
  c.error = null; c.progress = 0; c.status = "queued"; c.outputs = []; c.ms = null; c.step = "";
  paint(c); openPanel(c.id);      // status 一进 queued，paint 就把画面区换成加载态
  const pl = payloadOf(c);
  // 留一手给历史记录：真提交的那段跟面板上原词那个框不一样时（并了风格卡、或者用的是
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
    所以不能只按当前项目的卡片一张张问。 */
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
    // 这里必须跟着落地，不然卡片会一直转圈等一个不存在的任务
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
        // 下游已连线的卡自动吃掉新产物（风格线传的是文字，没有产物可搬，跳过）
        for (const e of PROJ.edges.filter(e => e.from === c.id && !isTextEdge(e))) {
          const to = PROJ.cards.find(x => x.id === e.to);
          if (!to) continue;
          try { to.assets[e.slot] = await importOutput(c.outputs[0]); } catch (err) {}
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
    clr.title = "只清列表里的记录，已经出好的产物还在卡片上";
    clr.onclick = clearDoneJobs;
    hd.appendChild(clr);
  }
  const x = document.createElement("button");
  x.className = "x"; x.textContent = "✕"; x.title = "关闭"; x.onclick = closeJobs;
  hd.appendChild(x);

  const list = document.createElement("div"); list.className = "jlist";
  if (!TASKS.length) {
    const e = document.createElement("div"); e.className = "jempty";
    e.textContent = "还没有任务。在卡片上点「生成」，任务就会出现在这里。";
    list.appendChild(e);
  }
  for (const j of TASKS) list.appendChild(jobRow(j));

  el.jobs.append(hd, list);
  list.scrollTop = scrolled;
}

/** 任务是哪个项目的。当前打开的这个直接用 PROJ.name（刚改的名字 projects 里还是旧的），
    别的项目去 projects 列表里认 id；项目已经被删了就只剩卡片名。 */
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
  // 卡片名才是用户认得出的那个（"角色图放大"），能力名（"SeedVR2 图片高清放大"）退到第二行。
  // 前面再挂上项目名：几个项目里都有一张叫"主角图"的卡，光看卡片名分不出是哪个在跑
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
  if (j.project && j.card) acts.appendChild(actBtn("看卡片", () => focusTask(j)));
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

/** 从任务跳回它对应的那张卡：不在当前画布就先把那张画布打开 */
async function focusTask(j) {
  if (!PROJ || PROJ.id !== j.project) {
    if (!projects.some(p => p.id === j.project)) return toast("这个任务所在的画布已经不在了");
    await openProject(j.project);
  }
  const c = PROJ.cards.find(x => x.id === j.card);
  if (!c) return toast("这张卡片已经从画布上删掉了");
  const r = el.stage.getBoundingClientRect();
  view.x = r.width / 2 - (c.x + cardW(c) / 2) * view.k;
  view.y = r.height / 3 - c.y * view.k;
  applyView();
  selId = c.id;
  for (const o of PROJ.cards) if (o._el) o._el.classList.toggle("sel", o.id === c.id);
  openPanel(c.id); placePanel(); placeJobs(); save();
}
