/* Task-list state and floating panel; canvas mutation is an explicit callback. */
(function (root, factory) {
  const feature = factory();
  if (typeof module === "object" && module.exports) module.exports = feature;
  else root.ChoukaTaskPanel = feature;
})(globalThis, function () {
"use strict";
function create({ document, panel, button, getViewport, getUser, canTask, api, jpost,
  jobProjName, fmtEla, histTime, toast, showError, confirm, onFocusTask, onJobsChanged }) {
  let tasks = [], request = null, epoch = 0;
  function setJobs(jobs) { tasks = jobs; paintJobsBtn(); if (panel.style.display !== "none") renderJobs(); }
  function pollJobs() {
    if (request) return request;
    const expected = epoch;
    request = (async () => {
      let jobs;
      try { jobs = (await api("/api/jobs")).jobs || []; } catch (_) { return; }
      if (epoch !== expected) return;
      setJobs(jobs);
      await onJobsChanged(jobs);
    })().finally(() => { request = null; });
    return request;
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
  const live = tasks.filter(jobLive);
  const run = live.find(j => j.status === "running");
  const b = button;
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
  if (panel.style.display === "none") {
    panel.style.display = "";
    button.classList.add("open");
    renderJobs(); placeJobs();
    pollJobs();          // 刚打开别先给人看上一轮 700ms 前的旧状态
  } else closeJobs();
}

function closeJobs() {
  panel.style.display = "none";
  panel.innerHTML = "";
  panel._sig = null;
  button.classList.remove("open");
}

/** 挂在按钮下面，右边缘对齐。宽度够不着就往左躲，别飘到窗外 */
function placeJobs() {
  if (panel.style.display === "none") return;
  const GAP = 8, r = button.getBoundingClientRect();
  panel.style.maxHeight = (getViewport().height - r.bottom - GAP * 2) + "px";
  const w = panel.offsetWidth;
  panel.style.top = (r.bottom + GAP) + "px";
  panel.style.left = Math.max(GAP, Math.min(r.right - w, getViewport().width - w - GAP)) + "px";
}

/** 列表骨架的签名：有哪些任务、各自什么状态。只有它变了才重建 DOM ——
    每 700ms 整块重画会让按钮在 mousedown 和 mouseup 之间被换掉，那一下点击就丢了。
    进度、步骤、耗时这些一直在变的东西交给 fillJobRow 原地刷。 */
const jobsSig = () => JSON.stringify(tasks.map(j => [j.id, j.status, !!j.error,
  jobProjName(j), j.cardName, j.name, j.submitter_display_name, j.submitter_username]));

function renderJobs() {
  const sig = jobsSig();
  if (panel._sig === sig) {
    for (const d of panel.querySelectorAll(".jrow")) {
      const j = tasks.find(x => x.id === d._id);
      if (j) fillJobRow(d, j);
    }
    return;
  }
  panel._sig = sig;
  // 骨架重建时要留住滚动位置，不然新任务一进来列表就被弹回顶部
  const old = panel.querySelector(".jlist");
  const scrolled = old ? old.scrollTop : 0;

  panel.innerHTML = "";
  const hd = document.createElement("div"); hd.className = "jhd";
  const ttl = document.createElement("b");
  const n = tasks.filter(jobLive).length;
  ttl.textContent = n ? `任务 · ${n} 个没跑完` : "任务";
  hd.appendChild(ttl);
  if (tasks.some(j => !jobLive(j))) {
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
  if (!tasks.length) {
    const e = document.createElement("div"); e.className = "jempty";
    e.textContent = "还没有任务。在节点上点「生成」，任务就会出现在这里。";
    list.appendChild(e);
  }
  for (const j of tasks) list.appendChild(jobRow(j));

  panel.append(hd, list);
  list.scrollTop = scrolled;
}

function jobRow(j) {
  const d = document.createElement("div");
  d.className = "jrow " + jobCls(j);
  d._id = j.id;

  const submitter = getUser()?.role === 'admin'
    ? j.submitter_display_name?.trim() || j.submitter_username || '未记录提交人' : '';
  if (submitter) {
    const person = document.createElement('div'); person.className = 'jowner';
    person.textContent = submitter; d.append(person);
  }
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
  nm.title = (submitter ? `${submitter} - ` : '') + (pj ? `${pj} - ` : "") + (card !== j.name ? `${card}（${j.name}）` : j.name);
  d._st = document.createElement("span"); d._st.className = "st";
  r1.append(nm, d._st);

  const r2 = document.createElement("div"); r2.className = "r2";
  d._sp = document.createElement("span"); d._sp.className = "sp";
  d._tm = document.createElement("span");
  r2.append(d._sp, d._tm);
  const r3 = document.createElement("div"); r3.className = "r3";
  d._node = document.createElement("span"); d._node.className = "node";
  d._step = document.createElement("span"); d._step.className = "step";
  r3.append(d._node, d._step);
  d.append(r1, r2, r3);

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
  if (j.project && j.card) acts.appendChild(actBtn("看节点", () => onFocusTask(j)));
  d.appendChild(acts);

  fillJobRow(d, j);
  return d;
}

/** 只刷每次轮询都在变的那几处：状态百分比、当前步骤、执行节点、耗时、进度条 */
function fillJobRow(d, j) {
  const pct = Math.round((j.progress || 0) * 100);
  // 排队的不报"前面还有几个"：ComfyUI 的 queue_remaining 是整条队列的长度，
  // 不是这一条自己的位次，拿它当位次就是编数字。队列长度改在浮窗标题上说一次
  d._st.textContent = j.status === "running" ? `运行中 ${pct}%`
    : JOB_ZH[j.status] || j.status;
  const modelText = `${j.name} · ${j.modelName || j.capability}`;
  if (d._sp.textContent !== modelText) d._sp.textContent = d._sp.title = modelText;
  const nodeText = `执行节点：${j.nodeName || "等待分配"}`;
  if (d._node.textContent !== nodeText) d._node.textContent = d._node.title = nodeText;
  const stepText = j.step ? `当前：${j.step}` : "";
  if (d._step.textContent !== stepText) d._step.textContent = d._step.title = stepText;
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
  j = tasks.find(task => task.id === j.id) || j;
  if (!canTask(j)) return toast("此任务关联的画布为只读，不能停止");
  try { await jpost(`/api/job/${j.id}/cancel`); } catch (e) { return showError(e.message); }
  pollJobs();
}

async function delTask(j) {
  j = tasks.find(task => task.id === j.id) || j;
  if (!canTask(j)) return toast("此任务关联的画布为只读，不能删除");
  // 还在跑的删掉等于先停后删，这一步不可逆（跑到一半的算力就没了），所以问一句
  if (jobLive(j) && !confirm("这个任务还没跑完，删除会先把它停掉。继续？")) return;
  try { await api(`/api/job/${j.id}`, { method: "DELETE" }); } catch (e) { return showError(e.message); }
  pollJobs();
}

async function clearDoneJobs() {
  try { await jpost("/api/jobs/clear"); } catch (e) { return showError(e.message); }
  pollJobs();
}


  return { pollJobs, paintJobsBtn, toggleJobs, closeJobs, placeJobs, renderJobs,
    stopTask, delTask, clearDoneJobs,
    getJobs: () => tasks,
    reset() { epoch++; setJobs([]); },
    retainProjects(ids) { epoch++; setJobs(tasks.filter(job => ids.includes(job.project))); },
    renameProject(id, name) { for (const job of tasks) if (job.project === id) job.projectName = name;
      if (panel.style.display !== "none") renderJobs(); },
  };
}
function createCanvasUpdater({getProject, canOperate, isIF, canTask, paint, refreshPanel,
  pushHistory, refreshHistory, propagateCardOutputs, titleOf, showError, save}) {
return async function applyCanvasJobs(tasks) {
  if (!getProject() || !canOperate()) return;
  const project = getProject(), projectId = project.id;
  const live = getProject().cards.filter(c => c.job && !isIF(c) && ["queued", "running"].includes(c.status));
  if (!live.length) return;
  let dirty = false;
  for (const c of live) {
    if (getProject() !== project || !project.cards.includes(c) || !canOperate()) return;
    const j = tasks.find(x => x.id === c.job);
    // 任务被从列表里删掉了（在浮窗里删的）。服务端删之前已经把活儿停了，
    // 这里必须跟着落地，不然节点会一直转圈等一个不存在的任务
    if (!j) {
      c.status = "canceled"; c.step = ""; c.job = null; paint(c); dirty = true;
      refreshPanel(c);
      continue;
    }
    // 任务列表随授权变化；只读任务可查看状态，但不能自动回写画布。
    if (!canTask(j) || !getProject() || getProject().id !== projectId || !canOperate()) continue;
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
      refreshPanel(c);
      if (c.status === "done") {
        pushHistory(c, j);
        refreshHistory(c);
        await propagateCardOutputs(c);
      }
      if (c.status === "error") showError(`「${titleOf(c)}」生成失败：${c.error || "未知错误"}`);
    }
  }
  if (dirty && getProject() === project && canOperate()) save(false);
}


}
return {create, createCanvasUpdater};
});
