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
  empty: $("#empty"), panel: $("#panel"), menu: $("#menu"),
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
const cardDef = (t) => CARDS.find(c => c.id === t) || CARDS[0];
const capOf = (c) => CAPS[c.cap] || null;

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
  const def = cardDef(c.type);
  const d = document.createElement("div");
  d.className = "card" + (selId === c.id ? " sel" : "");
  d.dataset.id = c.id;
  d.style.left = c.x + "px"; d.style.top = c.y + "px";
  d.innerHTML = `
    <div class="ch"><span>${def ? def.icon : "▪"}</span><span class="t"></span><button class="x" title="删除">✕</button></div>
    <div class="body"><span class="ph">${c.type === "card_video" ? "🎬" : "🖼"}</span></div>
    <div class="bar"><i></i></div>
    <div class="cf"><span class="st"></span><span class="meta" style="margin-left:auto"></span></div>
    <div class="port" title="拖到空白处 → 用本卡产物新建下游卡"></div>`;
  c._el = d;
  paintTitle(c);
  d.querySelector(".ch .x").onclick = (ev) => { ev.stopPropagation(); delCard(c.id); };
  d.querySelector(".ch").onmousedown = (ev) => startDrag(ev, c, d);
  d.querySelector(".port").onmousedown = (ev) => startWire(ev, c);
  d.onmousedown = (ev) => { ev.stopPropagation(); pick(c.id); };
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

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") { closeMenu(); selId = null; closePanel(); }
  });
}

/* ================= 新建卡片菜单 ================= */
function openMenu(cx, cy, at) {
  el.menu.innerHTML = `<div class="hd">新建卡片</div>`;
  for (const def of CARDS) {
    if (!def.modes.length) continue;
    const b = document.createElement("button");
    b.innerHTML = `<span>${def.icon}</span><span>${def.name}</span>`;
    b.onclick = () => { closeMenu(); addCard(def.id, at.x - CW / 2, at.y - 40); };
    el.menu.appendChild(b);
  }
  el.menu.style.display = "";
  el.menu.style.left = Math.min(cx, innerWidth - 180) + "px";
  el.menu.style.top = Math.min(cy, innerHeight - 130) + "px";
}
const closeMenu = () => (el.menu.style.display = "none");

function addCard(type, x, y) {
  const def = cardDef(type);
  const c = { id: uid(), type, cap: def.modes[0].id, x: Math.round(x), y: Math.round(y), params: {}, assets: {}, status: null, progress: 0, outputs: [] };
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
  const r = el.stage.getBoundingClientRect();
  const left = r.left + view.x + (c.x + CW / 2) * view.k - el.panel.offsetWidth / 2;
  const top = r.top + view.y + (c.y + c._el.offsetHeight + 12) * view.k;
  el.panel.style.left = Math.max(8, Math.min(left, innerWidth - el.panel.offsetWidth - 8)) + "px";
  el.panel.style.top = Math.max(50, Math.min(top, innerHeight - 90)) + "px";
}

function openPanel(id) {
  const c = PROJ.cards.find(x => x.id === id);
  if (!c) return closePanel();
  const def = cardDef(c.type), cap = capOf(c);
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
      b.title = `${md.name}\n工作流：${(CAPS[md.id] || {}).file || md.id}\n槽位：${md.slots}`;
      b.onclick = () => { c.cap = md.id; openPanel(id); paintTitle(c); save(); };
      m.appendChild(b);
    }
    el.panel.appendChild(m);
  }
  if (!cap) { el.panel.appendChild(errBox("能力不可用")); return placePanel(); }

  const specs = cap.inputs;
  const mk = (h) => { const d = document.createElement("div"); d.innerHTML = h; return d.firstElementChild; };

  // --- 提示词 ---
  for (const s of specs.filter(x => x.type === "textarea" && !x.advanced)) {
    const ta = document.createElement("textarea");
    ta.placeholder = s.label;
    ta.value = c.params[s.key] != null ? c.params[s.key] : (s.default || "");
    ta.oninput = () => { c.params[s.key] = ta.value; save(); };
    el.panel.appendChild(ta);
  }

  // --- 素材槽 ---
  const media = specs.filter(x => x.type === "image" || x.type === "audio");
  if (media.length) {
    const wrap = document.createElement("div"); wrap.className = "slots";
    for (const s of media) wrap.appendChild(slotEl(c, s));
    el.panel.appendChild(wrap);
  }

  // --- 常规参数 ---
  // mirror = 多个节点共用同一个参数框（如两个采样器共用种子），只画一次
  const rows = specs.filter(x => !["image", "audio", "textarea"].includes(x.type)
    && !x.advanced && !x.mirror);
  for (const s of rows) el.panel.appendChild(rowEl(c, s));

  // --- 高级 ---
  const adv = specs.filter(x => x.advanced);
  if (adv.length) {
    const box = document.createElement("div"); box.className = "adv";
    const t = document.createElement("button");
    t.textContent = `▸ 高级 (${adv.length})`;
    const items = document.createElement("div"); items.className = "items"; items.style.display = "none";
    for (const s of adv) items.appendChild(s.type === "textarea" ? rowEl(c, s) : rowEl(c, s));
    t.onclick = () => {
      const open = items.style.display === "none";
      items.style.display = open ? "" : "none";
      t.textContent = (open ? "▾" : "▸") + ` 高级 (${adv.length})`;
      placePanel();
    };
    box.appendChild(t); box.appendChild(items);
    el.panel.appendChild(box);
  }

  if (c.error) el.panel.appendChild(errBox(c.error));

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
}

function errBox(t) { const d = document.createElement("div"); d.className = "err"; d.textContent = t; return d; }
function paintTitle(c) {
  if (!c._el) return;
  const t = c._el.querySelector(".ch .t"), cap = capOf(c);
  t.textContent = cap ? cap.name : c.cap;
  t.title = cap ? `${cap.name}\n工作流：${cap.file || cap.id}` : c.cap;
}

function slotEl(c, s) {
  const a = c.assets[s.key];
  const d = document.createElement("div");
  d.className = "slot" + (a ? " filled" : s.required ? " req" : "");
  d.title = (s.hint || s.label) + (s.required ? "（必填）" : "");
  d.innerHTML = `<div class="box"></div><span class="lbl"></span>`;
  d.querySelector(".lbl").textContent = s.label;
  const box = d.querySelector(".box");
  if (a) {
    box.innerHTML = a.kind === "image" ? `<img src="${a.url}">`
      : a.kind === "video" ? `<video src="${a.url}" muted></video>` : `🎵`;
  } else box.textContent = s.type === "audio" ? "🎵" : "＋";
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
    sel.onchange = () => { c.params[s.key] = sel.value; save(); };
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
  return row;
}

/* ================= 运行 / 轮询 ================= */
function payloadOf(c) {
  const assets = {};
  for (const [k, v] of Object.entries(c.assets)) if (v && v.ref) assets[k] = v.ref;
  return { capability: c.cap, params: c.params, assets };
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
