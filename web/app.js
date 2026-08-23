/* 抽卡系统 前端 (P0) — 免构建原生 JS
   画布 = 卡片(产物+配方) + 连线(上游产物喂下游槽位)
   卡片字段全部由后端 /api/cards 的 manifest 生成，前端不写死任何工作流 */

const $ = (s, r = document) => r.querySelector(s);
const CW = 268;            // 卡片宽度，与 style.css 保持一致
const SVGNS = "http://www.w3.org/2000/svg";

let CARDS = [];            // 卡种（生图 / 生视频）
let CAPS = {};             // 能力清单
let PROJ = null;           // 当前项目
let projects = [];
let view = { x: 60, y: 70, k: 1 };
let selId = null;
let saveTimer = null;

const el = {
  side: $("#side"), plist: $("#plist"), dot: $("#dot"),
  ptitle: $("#ptitle"), hint: $("#hint"), addcard: $("#addcard"), fit: $("#fit"),
  stage: $("#stage"), world: $("#world"), wires: $("#wires"),
  empty: $("#empty"), panel: $("#panel"), menu: $("#menu"), tip: $("#tip"),
  toast: $("#toast"), picker: $("#picker"),
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
    throw new Error(msg.slice(0, 300));
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
  toastTimer = setTimeout(() => (el.toast.style.display = "none"), 2600);
}
const uid = () => Math.random().toString(36).slice(2, 10);
/** 卡片属于哪一类。以卡内选中的能力为准，c.type 只是兜底：
    能力被拆成独立卡片后（比如漫剧从"生视频"里单独抽出来），老项目里存的
    c.type 还指着旧卡，按 c.type 找会拿到一个模式列表里根本没有它的卡。 */
const cardDef = (t) => CARDS.find(c => c.id === t) || CARDS[0];
const modeHas = (md, cid) => md.id === cid
  || !!(md.ladder && Object.values(md.ladder).includes(cid));
const defOf = (c) => CARDS.find(d => d.modes.some(m => modeHas(m, c.cap))) || cardDef(c.type);
const modeOf = (c) => { const d = defOf(c); return d && d.modes.find(m => modeHas(m, c.cap)); };
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
  if (/^\d+$/.test(t)) return (w || (s.type === "audio" ? "音频" : "图")) + t;
  return w ? `${t}（${w}）` : t;
}

/** 从 manifest 反推这个工作流吃什么、吐什么 —— 不写死任何工作流 */
function capBrief(cap) {
  const by = (t) => cap.inputs.filter(s => s.type === t);
  const imgs = by("image"), auds = by("audio"), txts = by("textarea");
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
  if (!imgs.length && !auds.length) need.push("不需要素材，纯提示词驱动");
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

function tipShow(node, x, y) {
  el.tip.innerHTML = ""; el.tip.appendChild(node);
  el.tip.style.display = "";
  el.tip.style.left = Math.max(8, Math.min(x, innerWidth - el.tip.offsetWidth - 8)) + "px";
  el.tip.style.top = (y + el.tip.offsetHeight > innerHeight - 8
    ? y - el.tip.offsetHeight - 16 : y) + "px";
}
const tipHide = () => (el.tip.style.display = "none");

/** 给元素挂"悬停显示能力说明" */
function hoverBrief(node, capGetter, nameGetter) {
  node.addEventListener("mouseenter", () => {
    const cap = capGetter(); if (!cap) return;
    const r = node.getBoundingClientRect();
    tipShow(briefEl(cap, nameGetter && nameGetter()), r.left, r.bottom + 8);
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
  setInterval(health, 5000);
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
    d.innerHTML = `<span class="nm"></span><span class="ct">${p.cards}</span><button class="del" title="删除">✕</button>`;
    d.querySelector(".nm").textContent = p.name;
    d.onclick = () => openProject(p.id);
    d.querySelector(".del").onclick = async (ev) => {
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
    if (md && md.id !== c.cap) c.cap = md.id;
  }
  view = Object.assign({ x: 60, y: 70, k: 1 }, PROJ.view || {});
  selId = null;
  closePanel();
  el.empty.style.display = "none";
  el.addcard.style.display = ""; el.fit.style.display = "";
  el.ptitle.textContent = PROJ.name;
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

function save() {
  if (!PROJ) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (!PROJ) return;
    PROJ.view = view;
    try {
      await jput(`/api/projects/${PROJ.id}`,
        { name: PROJ.name, cards: PROJ.cards.map(plain), edges: PROJ.edges, view });
    } catch (e) { toast("保存失败：" + e.message); }
  }, 700);
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

function buildCard(c) {
  const def = defOf(c);
  const d = document.createElement("div");
  d.className = "card" + (selId === c.id ? " sel" : "");
  d.dataset.id = c.id;
  d.style.left = c.x + "px"; d.style.top = c.y + "px";
  d.innerHTML = `
    <div class="ch"><span>${def ? def.icon : "▪"}</span><span class="t"></span><button class="x" title="删除">✕</button></div>
    <div class="body"><span class="ph">${(def && def.outputType) === "video" ? "🎬" : "🖼"}</span></div>
    <div class="bar"><i></i></div>
    <div class="cf"><span class="st"></span><span class="meta" style="margin-left:auto"></span></div>
    <div class="port" title="拖到空白处 → 用本卡产物新建下游卡"></div>`;
  c._el = d;
  paintTitle(c);
  d.querySelector(".ch .x").onclick = (ev) => { ev.stopPropagation(); delCard(c.id); };
  d.querySelector(".ch").onmousedown = (ev) => startDrag(ev, c, d);
  d.querySelector(".port").onmousedown = (ev) => startWire(ev, c);
  d.onmousedown = (ev) => { ev.stopPropagation(); pick(c.id); };
  d.oncontextmenu = (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    tipHide(); pick(c.id); cardMenu(ev.clientX, ev.clientY, c);
  };
  hoverBrief(d.querySelector(".ch"), () => capOf(c), () => c.name);
  paint(c);
  return d;
}

function paint(c) {
  const d = c._el; if (!d) return;
  const body = d.querySelector(".body");
  const st = d.querySelector(".st"), meta = d.querySelector(".meta");
  const bar = d.querySelector(".bar i");
  const out = (c.outputs || [])[0];

  if (out && body.dataset.url !== out.url) {
    body.dataset.url = out.url;
    body.innerHTML = out.kind === "video"
      ? `<video src="${out.url}" controls loop preload="metadata"></video>`
      : out.kind === "audio"
        ? `<audio src="${out.url}" controls style="width:92%"></audio>`
        : `<img src="${out.url}" alt="">`;
    if (c.seed != null) {
      const b = document.createElement("span");
      b.className = "badge"; b.textContent = "seed " + c.seed;
      body.appendChild(b);
    }
  }

  const s = c.status;
  st.className = "st" + (s === "running" || s === "queued" ? " run" : s === "done" ? " done" : s === "error" ? " err" : "");
  st.textContent = s === "queued" ? (c.queue_remaining > 1 ? `排队中 (${c.queue_remaining})` : "排队中")
    : s === "running" ? `生成中 ${Math.round((c.progress || 0) * 100)}%`
    : s === "done" ? "已完成"
    : s === "error" ? "失败"
    : s === "canceled" ? "已取消" : "待生成";
  bar.style.width = (s === "running" || s === "queued" ? (c.progress || 0.02) * 100 : s === "done" ? 100 : 0) + "%";
  meta.textContent = c.error ? String(c.error).slice(0, 40) : (out ? out.filename.slice(-22) : "");
  meta.title = c.error || "";
}

/* ---------- 连线 ---------- */
function cardBox(id) {
  const c = PROJ.cards.find(x => x.id === id);
  if (!c) return null;
  const h = c._el ? c._el.offsetHeight : 230;
  return { x: c.x, y: c.y, w: CW, h };
}
function drawWires() {
  el.wires.innerHTML = "";
  for (const e of PROJ.edges) {
    const a = cardBox(e.from), b = cardBox(e.to);
    if (!a || !b) continue;
    const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2;
    const dx = Math.max(50, Math.abs(x2 - x1) * 0.5);
    const p = document.createElementNS(SVGNS, "path");
    p.setAttribute("d", `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`);
    el.wires.appendChild(p);
  }
}

/* ================= 交互：拖卡 / 平移 / 缩放 / 连线 ================= */
function pick(id) {
  selId = id;
  for (const c of PROJ.cards) if (c._el) c._el.classList.toggle("sel", c.id === id);
  openPanel(id);
}

function startDrag(ev, c, d) {
  if (ev.button !== 0) return;
  ev.stopPropagation();
  tipHide();
  pick(c.id);
  const s = { mx: ev.clientX, my: ev.clientY, x: c.x, y: c.y };
  const mv = (e) => {
    c.x = Math.round(s.x + (e.clientX - s.mx) / view.k);
    c.y = Math.round(s.y + (e.clientY - s.my) / view.k);
    d.style.left = c.x + "px"; d.style.top = c.y + "px";
    drawWires(); placePanel();
  };
  const up = () => { document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up); save(); };
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
    const tc = e.target.closest && e.target.closest(".card");
    if (tc && tc.dataset.id !== c.id) linkTo(c, PROJ.cards.find(x => x.id === tc.dataset.id));
    else if (last) spawnDownstream(c, last);
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

  el.stage.addEventListener("mousedown", (ev) => {
    if (ev.button !== 0) return;
    closeMenu();
    selId = null; closePanel();
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

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") { closeMenu(); tipHide(); selId = null; closePanel(); }
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
    不如把卡内的模式摊出来选，建出来的卡就已经是想要的那个模式。 */
const OUT_GROUP = { image: "生图", video: "生视频", audio: "生音频" };

function openMenu(cx, cy, at) {
  const items = [];
  for (const [out, gname] of Object.entries(OUT_GROUP)) {
    const defs = CARDS.filter(d => d.modes.length && d.outputType === out);
    if (!defs.length) continue;
    items.push({ group: gname });
    for (const def of defs) {
      for (const md of def.modes) {
        items.push({
          icon: def.icon, text: md.name,
          run: () => addCard(def.id, at.x - CW / 2, at.y - 40, md.id),
        });
      }
    }
  }
  showMenu(cx, cy, "新建卡片", items);
}

function cardMenu(cx, cy, c) {
  const cap = capOf(c);
  showMenu(cx, cy, c.name || (cap ? cap.name : "卡片"), [
    { icon: "✎", text: "重命名卡片", run: () => renameCard(c) },
    { icon: "↑", text: "运行", run: () => run(c) },
    { icon: "⧉", text: "复制卡片", run: () => cloneCard(c) },
    { icon: "✕", text: "删除卡片", danger: true, run: () => delCard(c.id) },
  ]);
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
  paintTitle(n); openPanel(n.id); save();
}

function addCard(type, x, y, cap) {
  const def = cardDef(type);
  const c = { id: uid(), type, cap: cap || def.modes[0].id, x: Math.round(x), y: Math.round(y), params: {}, assets: {}, status: null, progress: 0, outputs: [] };
  PROJ.cards.push(c);
  el.world.appendChild(buildCard(c));
  pick(c.id); drawWires(); save();
  return c;
}

function delCard(id) {
  PROJ.cards = PROJ.cards.filter(c => c.id !== id);
  PROJ.edges = PROJ.edges.filter(e => e.from !== id && e.to !== id);
  if (selId === id) { selId = null; closePanel(); }
  render(); save();
}

/* ================= 连线传产物 ================= */
function firstFreeSlot(c, kind) {
  const cap = capOf(c); if (!cap) return null;
  const specs = cap.inputs.filter(s => s.type === kind);
  return (specs.find(s => !c.assets[s.key]) || specs[0] || null);
}

async function linkTo(from, to) {
  if (!to) return;
  const out = (from.outputs || [])[0];
  if (!out) return toast("上游还没有产物，先运行它");
  const spec = firstFreeSlot(to, out.kind === "audio" ? "audio" : "image");
  if (!spec) return toast("下游卡没有可接收的槽位");
  PROJ.edges = PROJ.edges.filter(e => !(e.to === to.id && e.slot === spec.key));
  PROJ.edges.push({ from: from.id, to: to.id, slot: spec.key });
  drawWires(); save();
  try {
    toast(`引用上游产物 → ${spec.label}`);
    to.assets[spec.key] = await importOutput(out);
    if (selId === to.id) openPanel(to.id);
    save();
  } catch (e) { toast("引用失败：" + e.message); }
}

async function spawnDownstream(from, at) {
  const out = (from.outputs || [])[0];
  // 图 → 视频；视频/音频 → 生图（当参考）
  const want = out && out.kind === "video" ? "card_image" : "card_video";
  const def = CARDS.find(d => d.id === want && d.modes.length) || CARDS.find(d => d.modes.length);
  if (!def) return;
  const c = addCard(def.id, at.x, at.y - 40);
  if (out) await linkTo(from, c);
}

/** 把 ComfyUI 输出目录里的产物搬进 input 目录，得到可用的 LoadImage 值 */
async function importOutput(out) {
  const blob = await (await fetch(out.url)).blob();
  const fd = new FormData();
  fd.append("file", blob, out.filename.split(/[\\/]/).pop());
  const r = await api("/api/upload", { method: "POST", body: fd });
  return r.files[0];
}

/* ================= 参数面板 ================= */
function closePanel() { el.panel.style.display = "none"; el.panel._id = null; }

function placePanel() {
  if (el.panel.style.display === "none") return;
  const c = PROJ && PROJ.cards.find(x => x.id === el.panel._id);
  if (!c || !c._el) return closePanel();
  const GAP = 8, TOP = 52;                 // TOP 给顶栏让位
  // 先限高再量高：漫剧20宫格那种 6 个提示词的面板不封顶会直接长到屏幕外，
  // 量出来的 offsetHeight 就没法用来做"放不下就上移"的判断了
  el.panel.style.maxHeight = (innerHeight - TOP - GAP) + "px";
  const r = el.stage.getBoundingClientRect();
  const w = el.panel.offsetWidth, h = el.panel.offsetHeight;
  const left = r.left + view.x + (c.x + CW / 2) * view.k - w / 2;
  const below = r.top + view.y + (c.y + c._el.offsetHeight + 12) * view.k;
  el.panel.style.left = Math.max(GAP, Math.min(left, innerWidth - w - GAP)) + "px";
  el.panel.style.top = Math.max(TOP, Math.min(below, innerHeight - h - GAP)) + "px";
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

  // --- 模式切换 ---
  if (def.modes.length > 1) {
    const m = document.createElement("div"); m.className = "modes";
    for (const md of def.modes) {
      const b = document.createElement("button");
      b.className = md.id === c.cap ? "on" : "";
      b.textContent = md.name;
      hoverBrief(b, () => CAPS[md.id], () => md.name);
      b.onclick = () => { tipHide(); c.cap = md.id; openPanel(id); paintTitle(c); save(); };
      m.appendChild(b);
    }
    el.panel.appendChild(m);
  }
  if (!cap) { el.panel.appendChild(errBox("能力不可用")); return placePanel(); }

  // 合并模式的槽位按图槽最多那条画（它是超集），但默认值得取「按当前张数真正会跑的
  // 那条」。不这么做的话，面板显示的是首尾帧那条的示例提示词，只传一张图跑的却是
  // 图生视频那条的示例提示词 —— 看到的和出片的不是一回事。
  const rcap = CAPS[runCap(c)];
  const specs = (rcap && rcap !== cap)
    ? cap.inputs.map((s) => {
      const o = rcap.inputs.find(x => x.key === s.key);
      return o && o.default !== s.default ? { ...s, default: o.default } : s;
    })
    : cap.inputs;
  // 中间这坨才滚动：模式切换留在顶部、运行按钮留在底部，参数再多也不会被推出屏幕
  const body = document.createElement("div"); body.className = "pbody";
  el.panel.appendChild(body);

  // --- 玩法说明 ---
  // 素材有硬性要求（比如每张图必须是四宫格拼图）的工作流，不讲清楚就是白跑一轮
  if (cap.note) {
    const n = document.createElement("div"); n.className = "pnote";
    n.textContent = cap.note;
    body.appendChild(n);
  }
  // 合并模式：把"传几张跑哪条"摊开写，并标出现在会跑哪条
  const md = modeOf(c);
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
  const media = specs.filter(x => x.type === "image" || x.type === "audio");
  if (media.length) {
    const wrap = document.createElement("div"); wrap.className = "slots";
    for (const s of media) wrap.appendChild(slotEl(c, s));
    body.appendChild(wrap);
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
  const rows = specs.filter(x => !["image", "audio", "textarea"].includes(x.type)
    && !x.advanced && !x.mirror);
  for (const s of rows) body.appendChild(rowEl(c, s));

  // --- 高级 ---
  const adv = specs.filter(x => x.advanced && !x.mirror);
  if (adv.length) {
    const box = document.createElement("div"); box.className = "adv";
    const t = document.createElement("button");
    t.textContent = `▸ 高级 (${adv.length})`;
    const items = document.createElement("div"); items.className = "items"; items.style.display = "none";
    for (const s of adv) {
      items.appendChild(rowEl(c, s));
      // 高级参数默认值都是调好的，不写清楚推荐多少、为什么，用户只能瞎拉滑条
      if (s.hint) {
        const nt = document.createElement("div");
        nt.className = "knobnote"; nt.textContent = s.hint;
        items.appendChild(nt);
      }
    }
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

/** 提示词块：默认值是工作流作者的演示文案，必须让用户看见并且一键清掉 */
function promptBlock(c, s, label) {
  const wrap = document.createElement("div"); wrap.className = "pblock";
  const hd = document.createElement("div"); hd.className = "phd";
  const nm = document.createElement("span"); nm.textContent = label || s.label;
  const tag = document.createElement("span"); tag.className = "demo";
  tag.textContent = "⚠ 这是示例文案，改成你要的内容";
  const clr = document.createElement("button"); clr.textContent = "清空";
  hd.append(nm, tag, clr);

  const ta = document.createElement("textarea");
  ta.placeholder = `${label || s.label}：描述你想要的画面/动作/镜头`;
  ta.value = c.params[s.key] != null ? c.params[s.key] : (s.default || "");
  const sync = () => {
    const isDemo = !!s.default && ta.value.trim() === String(s.default).trim();
    tag.style.display = isDemo ? "" : "none";
    ta.classList.toggle("isdemo", isDemo);
  };
  ta.oninput = () => { c.params[s.key] = ta.value; sync(); save(); };
  clr.onclick = () => { ta.value = ""; c.params[s.key] = ""; sync(); ta.focus(); save(); };
  sync();
  wrap.append(hd, ta);
  return wrap;
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
  const t = c._el.querySelector(".ch .t"), cap = capOf(c), md = modeOf(c);
  // 合并模式用模式名（"H3 图生视频"），不用张数最多那条能力的名字（"首尾帧"）
  t.textContent = c.name || (md && md.ladder ? md.name : cap ? cap.name : c.cap);
  t.classList.toggle("named", !!c.name);
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
    box.innerHTML = a.kind === "image" ? `<img src="${a.url}">`
      : a.kind === "video" ? `<video src="${a.url}" muted></video>` : `🎵`;
  } else box.textContent = s.type === "audio" ? "🎵" : gridWord(s) ? "田" : "＋";
  d.onclick = () => pickFile(c, s);
  d.oncontextmenu = (ev) => {
    ev.preventDefault();
    delete c.assets[s.key];
    PROJ.edges = PROJ.edges.filter(e => !(e.to === c.id && e.slot === s.key));
    drawWires(); openPanel(c.id); save();
  };
  return d;
}

function pickFile(c, s) {
  el.picker.accept = s.type === "audio" ? "audio/*" : "image/*";
  el.picker.onchange = async () => {
    const f = el.picker.files[0]; el.picker.value = "";
    if (!f) return;
    const fd = new FormData(); fd.append("file", f, f.name);
    try {
      const r = await api("/api/upload", { method: "POST", body: fd });
      c.assets[s.key] = r.files[0];
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
  return row;
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
  for (const s of cap.inputs) {
    if (s.type === "image" || s.type === "audio" || s.mirror) continue;
    const v = c.params[s.key];
    if (v != null) params[s.key] = v;
    else if (s.type === "seed") params[s.key] = -1;      // 每次随机
    else if (s.default !== undefined) params[s.key] = s.default;
  }
  for (const [k, v] of Object.entries(c.assets)) if (v && v.ref) assets[k] = v.ref;
  return { capability: cap.id, params, assets };
}

async function run(c) {
  const cap = capOf(c);
  if (!cap) return toast("能力不可用");
  c.error = null; c.progress = 0; c.status = "queued"; c.outputs = [];
  if (c._el) c._el.querySelector(".body").dataset.url = "";
  paint(c); openPanel(c.id);
  try {
    const job = await jpost("/api/generate", payloadOf(c));
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

async function pollJobs() {
  if (!PROJ) return;
  const live = PROJ.cards.filter(c => c.job && ["queued", "running"].includes(c.status));
  if (!live.length) return;
  let dirty = false;
  for (const c of live) {
    let j;
    try { j = await api(`/api/job/${c.job}`); } catch (e) { continue; }
    const was = c.status;
    c.status = j.status; c.progress = j.progress; c.error = j.error;
    c.queue_remaining = j.queue_remaining;
    if (j.seed != null) c.seed = j.seed;
    if (j.outputs && j.outputs.length) c.outputs = j.outputs;
    paint(c);
    if (was !== c.status) {
      dirty = true;
      if (el.panel._id === c.id) openPanel(c.id);
      if (c.status === "done") {
        drawWires();
        // 下游已连线的卡自动吃掉新产物
        for (const e of PROJ.edges.filter(e => e.from === c.id)) {
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
