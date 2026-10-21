/* Owns save sequencing, timers and local-work failures; project remains in the canvas. */
(function (root, factory) {
  const feature = factory();
  if (typeof module === "object" && module.exports) module.exports = feature;
  else root.ChoukaProjectPersistence = feature;
})(globalThis, function () {
"use strict";
function create({ getProject, getView, isAuthenticated, canSave, nodeEditor, editorCard, plain,
  api, jpost, jput, recordCanvasEdit, flushPendingProjectSync, openProject, toast, showError,
  flushFocusedControl, setTimeout = globalThis.setTimeout, clearTimeout = globalThis.clearTimeout }) {
  let saveTimer = null, viewTimer = null;
  let contentSaving = false, pendingCardCreates = 0, pendingContentSaves = 0, localFlushes = 0;
  let saveFailure = null, workFailure = null;
  const pendingNodeWork = new Set();
function trackNodeWork(work) {
  pendingNodeWork.add(work);
  const done = () => { pendingNodeWork.delete(work); flushPendingProjectSync(); };
  work.then(done, error => { workFailure = error; done(); });
  return work;
}

/** 保存串行化：两次 PUT 撞在一起会带同一个 rev，后一次要被服务端顶掉 */
let saveChain = Promise.resolve();
let viewSaveChain = Promise.resolve();

function saveView() {
  if (nodeEditor || !isAuthenticated() || !getProject()) return;
  clearTimeout(viewTimer);
  const expectedId = getProject().id;
  viewTimer = setTimeout(() => {
    viewTimer = null;
    const view = getView();
    const snapshot = { x: view.x, y: view.y, k: view.k };
    viewSaveChain = viewSaveChain.then(async () => {
      if (!isAuthenticated()) return;
      try {
        await jput(`/api/projects/${encodeURIComponent(expectedId)}/view`, snapshot);
      } catch (error) {
        if (getProject()?.id === expectedId) showError("视图保存失败：" + error.message);
      }
    });
  }, 400);
}

function save(userEdit = true) {
  if (userEdit) recordCanvasEdit();
  if (!canSave()) return;
  // 示例是只读的：拖节点、改参数、重跑都随便，但只活在这一次打开里，刷新就回到那份固定的示例。
  // 这里直接不发请求（服务端也会回 403），否则每动一下就弹一次「保存失败」
  if (getProject().locked) return;
  clearTimeout(saveTimer);
  const expectedId = getProject().id;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    enqueueSave(expectedId);
  }, 700);
}

function enqueueSave(expectedId = getProject()?.id) {
  pendingContentSaves++;
  saveChain = saveChain.then(() => doSave(expectedId)).finally(() => {
    pendingContentSaves--;
    flushPendingProjectSync();
  });
  return saveChain;
}

async function restoreDeletedCardsAndRetry(id, payload) {
  const remote = await api(`/api/projects/${encodeURIComponent(id)}`);
  if (!getProject() || getProject().id !== id || (remote.rev || 0) !== payload.rev) return null;
  const remoteIds = new Set((remote.cards || []).map(card => card.id));
  const missing = payload.cards.filter(card => !remoteIds.has(card.id));
  if (!missing.length) return null;

  let latest = remote;
  for (const card of missing) {
    const result = await jpost(`/api/projects/${encodeURIComponent(id)}/cards`, {
      card, rev: latest.rev || 0,
    });
    if (!getProject() || getProject().id !== id) throw new Error("恢复节点期间画布已切换");
    latest = result.project;
    const saved = result.card || (latest.cards || []).find(item => item.id === card.id);
    const live = getProject().cards.find(item => item.id === card.id);
    if (saved && live) for (const key of ["created_by", "created_by_name", "created_at"])
      if (saved[key] !== undefined) live[key] = card[key] = saved[key];
  }
  payload.rev = latest.rev || 0;
  getProject().rev = Math.max(getProject().rev || 0, payload.rev);
  return jput(`/api/projects/${id}`, payload);
}

async function doSave(expectedId = getProject()?.id) {
  if (!canSave() || getProject().id !== expectedId) {
    return { ok: false, error: new Error("画布不可保存或已切换") };
  }
  if (nodeEditor && !editorCard()) return { ok: false, error: new Error("此节点已删除或不可访问") };
  if (nodeEditor && saveFailure?.status === 409) return { ok: false, error: saveFailure };
  const id = getProject().id;
  const payload = {
    rev: getProject().rev || 0, name: getProject().name,
    cards: getProject().cards.map(plain), edges: getProject().edges, groups: getProject().groups || [],
  };
  contentSaving = true;
  try {
    const r = await jput(`/api/projects/${id}`, payload);
    if (!getProject() || getProject().id !== id) return { ok: false, error: new Error("保存期间画布已切换") };
    getProject().rev = Math.max(getProject().rev || 0, r.rev || 0);
    saveFailure = null;
    return { ok: true };
  } catch (caught) {
    let e = caught;
    if (e.status === 409 && getProject() && getProject().id === id && !nodeEditor && !localFlushes) {
      try {
        const r = await restoreDeletedCardsAndRetry(id, payload);
        if (r) {
          if (!getProject() || getProject().id !== id) return { ok: false, error: new Error("保存期间画布已切换") };
          getProject().rev = Math.max(getProject().rev || 0, r.rev || 0);
          saveFailure = null;
          return { ok: true };
        }
      } catch (retryError) {
        e = retryError;
      }
    }
    if (getProject()?.id === id) saveFailure = e;
    // 普通画布的真正版本冲突仍重新加载；撤销恢复已落盘删除的节点会先走建卡接口重建。
    if (e.status === 409 && getProject() && getProject().id === id && !nodeEditor && !localFlushes) {
      toast("画布在别处被改过，已重新加载");
      await openProject(id);
    } else {
      showError("保存失败：" + e.message);
    }
    return { ok: false, error: e };
  } finally {
    contentSaving = false;
    flushPendingProjectSync();
  }
}

/** 等待本地提交（不是等待 GPU 任务结束），并确认最后一次 PUT 真正成功。 */
async function flushLocalChanges(expectedId = getProject()?.id) {
  localFlushes++;
  try {
    // change/blur 才落值的控件也要先提交，父页关闭按钮不会自动让 iframe 内控件失焦。
    flushFocusedControl();
    for (;;) {
      const chain = saveChain;
      await chain;
      await Promise.all([...pendingNodeWork]);
      if (!getProject() || getProject().id !== expectedId) throw new Error("画布已关闭或切换");
      if (workFailure) throw workFailure;
      if (saveFailure && [403, 404, 409].includes(saveFailure.status)) throw saveFailure;
      if (chain !== saveChain || pendingNodeWork.size || pendingCardCreates) continue;
      if (!canSave()) throw new Error("此画布只读或已锁定，不能保存");
      if (nodeEditor && !editorCard()) throw new Error("此节点已删除，不能保存或重新创建");
      clearTimeout(saveTimer); saveTimer = null;
      const saved = await enqueueSave(expectedId);
      if (!saved?.ok) throw saved?.error || new Error("保存未完成");
      if (workFailure) throw workFailure;
      if (!pendingNodeWork.size && !pendingCardCreates && !pendingContentSaves && saveTimer === null) return;
    }
  } catch (error) {
    if (error === workFailure) workFailure = null;
    throw error;
  } finally {
    localFlushes--;
    flushPendingProjectSync();
  }
}


  function cancelContentSave() { clearTimeout(saveTimer); saveTimer = null; }
  function cancelTimers() { cancelContentSave(); clearTimeout(viewTimer); viewTimer = null; }
  function enqueueCardCreate(createCard) {
    pendingCardCreates++;
    saveChain = saveChain.then(createCard).finally(() => {
      pendingCardCreates--; flushPendingProjectSync();
    });
    return saveChain;
  }
  return { saveView, save, enqueueSave, flushLocalChanges, trackNodeWork, enqueueCardCreate,
    cancelContentSave, cancelTimers,
    resetFailures() { saveFailure = null; workFailure = null; },
    markWorkFailure(error) { workFailure = error; },
    beginFlush() { localFlushes++; },
    endFlush() { localFlushes--; flushPendingProjectSync(); },
    get pendingChain() { return saveChain; },
    get busy() { return saveTimer !== null || contentSaving || pendingContentSaves > 0
      || pendingCardCreates > 0 || pendingNodeWork.size > 0 || localFlushes > 0 || !!(nodeEditor && saveFailure); },
    get status() { return Object.freeze({contentSaving, pendingCardCreates, pendingContentSaves,
      localFlushes, pendingNodeWork: pendingNodeWork.size, saveScheduled: saveTimer !== null, saveFailure, workFailure}); },
  };
}
return {create};
});
