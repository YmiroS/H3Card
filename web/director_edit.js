'use strict';
/* 独立剪辑文档；不创建画布节点，不改导演采用版本，不调用生成服务。 */
(() => {
  const FPS = 30, HISTORY_LIMIT = 60;
  const clone = value => structuredClone(value);
  const q = value => Math.round(Number(value) * FPS) / FPS;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const finite = value => Number.isFinite(Number(value));
  const uid = prefix => prefix + '_' + crypto.randomUUID().replaceAll('-', '');
  const statuses = {queued:'排队中', running:'导出中', done:'已完成', error:'失败', canceled:'已取消'};
  const kinds = {video:'视频', image:'图片', audio:'音频'};
  let config, root, ui = {}, pid = null, epoch = 0, documentEdit = null, exports = [];
  let visible = false, dirty = false, version = 0, saving = null, loading = null, operation = false;
  let blocked = false, message = '', saveTimer, pollTimer, pollBusy = false, operationTask = null, pollDenied = false;
  let undoStack = [], redoStack = [], selection = null, dragging = null, trimming = null, zoom = 36;
  let playhead = 0, playing = false, playStarting = false, playGeneration = 0, raf = 0, clockTime = 0, clockStart = 0;
  let mediaKey = '', musicKey = '', audioContext, videoGain, musicGain, resizeObserver;
  const current = token => token === epoch && pid === config?.getContext()?.project?.id;
  const context = () => config?.getContext() || {};
  const canWrite = () => !!documentEdit && !blocked && !!context().writable && !context().busy && !operation && !saving && !loading && !trimming;
  const active = record => ['queued','running'].includes(record.status);
  const asset = item => documentEdit?.assets?.[item.asset];
  const duration = clip => Math.max(1, Math.round((clip.out - clip.in) / clip.speed * FPS)) / FPS;
  function clipPositions() {
    let start = 0;
    return (documentEdit?.clips || []).map(clip => {
      const item = {clip, start, end:q(start + duration(clip))}; start = item.end; return item;
    });
  }
  function totalDuration() { return clipPositions().at(-1)?.end || 0; }
  function timelineDuration() {
    return Math.max(totalDuration(),
      ...(documentEdit?.audio || []).map(item => q(item.start + item.out - item.in)),
      ...(documentEdit?.texts || []).map(item => item.end));
  }
  function mediaURL(value) {
    if (typeof value !== 'string') return '';
    try {
      const url = new URL(value, location.href);
      return url.origin === location.origin && !url.username && !url.password &&
        (/^\/api\/upload(?:\/|$)/.test(url.pathname) || url.pathname === '/api/file' || /^\/api\/artifact\//.test(url.pathname)) ? url.href : '';
    } catch { return ''; }
  }
  function node(tag, className, text) {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text != null) result.textContent = String(text);
    return result;
  }
  function button(text, action, mutate = false, className = 'button small') {
    const result = node('button', className, text); result.type = 'button';
    if (mutate) result.dataset.editWrite = '1';
    result.onclick = () => {
      if (mutate && !canWrite()) return;
      Promise.resolve().then(action).catch(error => notify(error.message));
    };
    return result;
  }
  const notify = text => config?.toast?.(text);
  function editableSnapshot() {
    const {ratio, resolution, fps, clips, audio, texts} = documentEdit;
    return clone({ratio, resolution, fps, clips, audio, texts});
  }
  function changed() {
    dirty = true; version++;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => flush().catch(() => {}), 900);
    render();
  }
  function mutate(action) {
    if (!canWrite()) return;
    pause();
    const before = editableSnapshot();
    try { action(); validateLocal(); }
    catch (error) { Object.assign(documentEdit, before); notify(error.message); render(); return; }
    if (JSON.stringify(before) === JSON.stringify(editableSnapshot())) return;
    undoStack.push(before); if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    redoStack = []; changed();
  }
  function validateLocal() {
    for (const track of ['clips','audio','texts']) if (documentEdit[track].length > 200) throw new Error('每条轨道最多 200 个片段');
    if (totalDuration() > 3600 + 1e-7) throw new Error('成片最长 60 分钟，请缩短主轨后再添加或减速');
    for (const item of [...documentEdit.clips,...documentEdit.audio]) {
      if (!finite(item.in) || !finite(item.out) || item.in < 0 || item.out > 3600 || item.out - item.in < 1 / FPS - 1e-7) throw new Error('源入/出点须在 0–3600 秒内，至少保留一帧');
      const value = asset(item);
      if (!value || value.kind !== 'image' && item.out > value.duration + 0.001) throw new Error('裁剪超出源素材范围');
    }
    for (const item of documentEdit.audio) {
      if (!finite(item.start) || item.start < 0 || item.start > 3600) throw new Error('音频开始时间须在 0–3600 秒内');
      validateAudio(item,item.id);
    }
    for (const item of documentEdit.texts) {
      if (!item.text.length || item.text.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(item.text)) throw new Error('文字须为 1–2000 个字符，不可包含控制字符');
      if (item.start < 0 || item.end > 3600 || item.end <= item.start) throw new Error('文字时间须在 0–3600 秒内，至少保留一帧');
    }
  }
  function restore(from, to) {
    if (!canWrite() || !from.length) return;
    pause(); to.push(editableSnapshot()); if (to.length > HISTORY_LIMIT) to.shift();
    Object.assign(documentEdit, from.pop()); changed();
  }
  function failure(error, token) {
    if (!current(token)) return;
    if ([401,403,404,409,423].includes(error.status)) blocked = true;
    message = error.status === 409 ? '剪辑修订冲突：本页草稿仍保留。先下载草稿，再重新加载。' : `剪辑操作失败：${error.message}`;
    renderStatus(); notify(message);
  }
  function endpoint(suffix = '', projectID = pid) { return `/api/projects/${encodeURIComponent(projectID)}/edit${suffix}`; }
  async function load(force = false) {
    if (!pid || !visible) return;
    if (loading && !force) return loading;
    const token = epoch, path = endpoint();
    const task = config.auth.request(path).then(result => {
      if (!current(token)) return;
      documentEdit = clone(result.edit); exports = clone(result.exports || []);
      dirty = false; blocked = false; pollDenied = false; message = ''; version++;
      undoStack = []; redoStack = []; selection = null; playhead = 0;
      render(); schedulePoll();
    }).catch(error => failure(error, token)).finally(() => {
      if (current(token) && loading === task) { loading = null; renderStatus(); }
    });
    loading = task; renderStatus(); return task;
  }
  async function flush() {
    if (trimming) return;
    const token = epoch;
    clearTimeout(saveTimer);
    if (saving) { await saving; if (!current(token)) return; }
    while (dirty && current(token)) {
      if (blocked || !context().writable) throw new Error('剪辑草稿尚未保存，请下载草稿并解决权限或修订冲突');
      const snapshot = clone(documentEdit), sentVersion = version, path = endpoint();
      const task = config.auth.json(path, 'PUT', snapshot).then(result => {
        if (!current(token)) return;
        // 不改写素材元数据；所有 PUT 始终携带服务端注册表的完整原样副本。
        if (version === sentVersion) { documentEdit = clone(result.edit); dirty = false; }
        else { documentEdit.rev = result.edit.rev; documentEdit.assets = clone(result.edit.assets); }
        message = '';
      }).catch(error => { failure(error, token); throw error; });
      saving = task; renderStatus();
      try { await task; }
      finally {
        if (current(token) && saving === task) {
          saving = null;
          // PUT 响应会替换文档；重新绑定所有参数回调，避免继续修改旧片段对象。
          render();
        }
      }
    }
  }
  function transaction(action) {
    if (!canWrite()) return Promise.resolve();
    const token = epoch;
    operation = true; renderStatus();
    const task = (async () => {
      try {
        await config.flushDirector(); if (!current(token)) return;
        await flush(); if (!current(token)) return;
        await action(token);
      } catch (error) { failure(error, token); }
      finally { if (current(token)) { operation = false; operationTask = null; render(); } }
    })();
    operationTask = task; return task;
  }
  async function flushAll() {
    if (trimming) finishTrim(false);
    const token = epoch;
    if (operationTask) await operationTask;
    if (!current(token)) return;
    if (loading) await loading;
    if (!current(token)) return;
    await flush();
  }
  function downloadDraft() {
    if (!documentEdit) return;
    const blob = new Blob([JSON.stringify({project:pid, name:context().project?.name, edit:documentEdit}, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob), link = node('a'); link.href = url;
    link.download = `${String(context().project?.name || '项目').replace(/[\\/:*?"<>|]/g, '_')}-剪辑草稿.json`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function setContext(nextPID) {
    if (pid === nextPID) return;
    hide(); epoch++; pid = nextPID; documentEdit = null; exports = []; loading = saving = null;
    dirty = operation = blocked = pollBusy = pollDenied = false; operationTask = null; message = ''; version++;
    undoStack = []; redoStack = []; selection = null; playhead = 0;
    clearTimeout(saveTimer); mediaKey = musicKey = '';
    if (root) { ui.video.removeAttribute('src'); ui.music.removeAttribute('src'); ui.image.removeAttribute('src'); }
  }
  function renderStatus() {
    if (!root) return;
    if (trimming && (!context().writable || context().busy || blocked)) finishTrim(true);
    ui.status.textContent = message || (loading ? '正在读取剪辑文档…' : trimming ? '正在裁剪 · 松开保存，Esc 取消' : operation ? '正在处理…' : saving ? '剪辑保存中…' : dirty ? '剪辑有修改 · 即将保存' : documentEdit ? `剪辑已保存 · 修订 ${documentEdit.rev}` : '打开项目后开始剪辑');
    ui.status.classList.toggle('error', blocked || message.includes('失败') || message.includes('冲突'));
    ui.recovery.hidden = !blocked;
    root.querySelectorAll('[data-edit-write]').forEach(control => { control.disabled = !canWrite() || control.dataset.editInvalid === '1'; });
    root.querySelectorAll('.edit-track-clips .edit-block').forEach(control => { control.draggable = canWrite(); });
    ui.undo.disabled = !canWrite() || !undoStack.length; ui.redo.disabled = !canWrite() || !redoStack.length;
    root.querySelectorAll('.edit-trim-handle').forEach(handle => handle.setAttribute('aria-disabled', String(!canWrite())));
    ui.save.disabled = !dirty || blocked || operation || !!saving || !!trimming || !context().writable;
    ui.draft.disabled = !documentEdit;
    ui.play.disabled = !documentEdit || totalDuration() <= 0;
    ui.reload.disabled = operation || !!saving || !!loading;
    ui.order.disabled = !canWrite() || !orderedAdopted().length;
    ui.exportButton.disabled = !canWrite() || totalDuration() <= 0;
    config?.onStateChange?.({dirty, pending:!!saving || operation || !!trimming});
  }
  function init(container) {
    if (root) return;
    root = container; root.tabIndex = -1;
    const toolbar = node('div','edit-toolbar');
    ui.status = node('span','edit-status'); ui.status.setAttribute('role','status');
    ui.undo = button('撤销', () => restore(undoStack, redoStack));
    ui.redo = button('重做', () => restore(redoStack, undoStack));
    ui.save = button('保存剪辑', flush);
    ui.draft = button('下载草稿', downloadDraft);
    toolbar.append(ui.status, ui.undo, ui.redo, ui.save, ui.draft);
    ui.recovery = node('div','notice warning'); ui.recovery.hidden = true;
    ui.recovery.append(node('span','','草稿不会自动覆盖远端。下载备份后，可重新加载远端剪辑。'));
    ui.reload = button('重新加载剪辑', async () => {
      if (operation || saving || loading || !confirm('放弃本页剪辑草稿并重新加载？请先下载草稿备份。')) return;
      clearTimeout(saveTimer); pause(); await load(true);
    }); ui.recovery.append(ui.reload, button('下载保留草稿', downloadDraft));
    const grid = node('div','edit-grid'), library = node('aside','edit-library section-card');
    library.append(node('h2','','素材库'));
    ui.order = button('按镜头顺序加入主轨', () => importAdopted(orderedAdopted()), true);
    const upload = node('input'); upload.type = 'file'; upload.multiple = true;
    upload.accept = 'video/*,image/*,audio/*,.mp4,.mov,.webm,.mkv,.png,.jpg,.jpeg,.webp,.gif,.mp3,.wav,.m4a,.ogg,.flac';
    upload.setAttribute('aria-label','上传视频、图片或音频素材'); upload.dataset.editWrite = '1';
    upload.onchange = () => { const files = [...upload.files]; upload.value = ''; uploadFiles(files); };
    library.append(ui.order, node('p','muted','按顺序优先采用视频，否则采用图片。只在点击时固定版本；不会跟随后续生成结果。'), upload,
      node('h3','','镜头已采用的产物'));
    ui.adopted = node('div','edit-assets'); ui.registry = node('div','edit-assets');
    library.append(ui.adopted, node('h3','','已登记素材'), ui.registry);
    const center = node('div','edit-center');
    const settings = node('div','edit-settings'); ui.settings = settings;
    ui.canvas = node('div','edit-preview'); ui.canvas.setAttribute('aria-label','剪辑画面预览');
    ui.video = node('video'); ui.video.playsInline = true; ui.video.preload = 'auto'; ui.video.preservesPitch = true;
    ui.image = node('img'); ui.image.alt = '剪辑画面'; ui.music = node('audio'); ui.music.preload = 'auto';
    ui.overlay = node('div','edit-text-overlay'); ui.empty = node('span','edit-preview-empty','在素材库中加入视频或图片');
    ui.canvas.append(ui.video, ui.image, ui.overlay, ui.empty); ui.video.hidden = ui.image.hidden = true;
    for (const media of [ui.video, ui.music]) {
      media.onloadedmetadata = () => { if (visible && documentEdit) syncPreview(true); };
      media.onerror = () => { if (visible && media.getAttribute('src')) { ui.mediaStatus.textContent = '素材无法解码或读取，请检查文件格式与权限。'; pause(); } };
    }
    ui.mediaStatus = node('span','muted'); ui.mediaStatus.setAttribute('role','status');
    const transport = node('div','edit-transport');
    ui.play = button('播放', togglePlay, false, 'button');
    ui.time = node('span','edit-time','0.00 / 0.00 秒');
    ui.seek = node('input'); ui.seek.type = 'range'; ui.seek.min = 0; ui.seek.max = 0; ui.seek.step = 1 / FPS; ui.seek.value = 0;
    ui.seek.setAttribute('aria-label','预览播放头（秒）'); ui.seek.oninput = () => seek(Number(ui.seek.value));
    const back = button('−1帧', () => seek(playhead - 1 / FPS)), forward = button('+1帧', () => seek(playhead + 1 / FPS));
    transport.append(ui.play, back, forward, ui.time, ui.seek);
    const timelineTools = node('div','edit-toolbar');
    timelineTools.append(node('h2','','时间线（30 fps）'), button('添加文字', addText, true));
    const zoomLabel = node('label','edit-zoom','缩放');
    const zoomInput = node('input'); zoomInput.type = 'range'; zoomInput.min = 12; zoomInput.max = 160; zoomInput.value = zoom;
    zoomInput.setAttribute('aria-label','时间线缩放'); zoomInput.oninput = () => { zoom = Number(zoomInput.value); renderTimeline(); };
    zoomLabel.append(zoomInput); timelineTools.append(zoomLabel);
    ui.timelineScroll = node('div','edit-timeline-scroll'); ui.timeline = node('div','edit-timeline'); ui.timelineScroll.append(ui.timeline);
    ui.rangeWarning = node('p','notice warning'); ui.rangeWarning.hidden = true;
    const shortcuts = node('div','edit-shortcuts');
    shortcuts.setAttribute('aria-label','时间轨快捷键说明');
    shortcuts.append(node('b','','选中片段后使用快捷键（输入框内不触发）'),
      node('p','','空格：播放 / 暂停 · ← / →：−1 / +1 帧 · Shift + ← / →：−10 / +10 帧 · Home / End：片头 / 片尾'),
      node('p','','Delete / Backspace：删除 · S 或 Ctrl / Cmd + B：在播放头分割画面片段 · Q：裁掉播放头之前 · W：裁掉播放头之后'),
      node('p','','Ctrl / Cmd + Z：撤销 · Ctrl / Cmd + Shift + Z 或 Ctrl + Y：重做 · Esc：取消边缘拖拽'),
      node('p','','拖拽片段左右边缘调整片长 / 裁剪；视频保持速度，图片调整停留时长。主轨裁剪后连续收拢，拖拽片段中部排序。短片段请先放大时间线。'));
    center.append(settings, ui.canvas, ui.music, ui.mediaStatus, transport, timelineTools, ui.timelineScroll,
      shortcuts, ui.rangeWarning, node('p','muted','音频仅一轨，可有间隔但不可重叠。文字可叠加。成片长度只取画面主轨，超出部分不会导出。'));
    ui.inspector = node('aside','edit-inspector section-card'); ui.inspector.setAttribute('aria-label','剪辑片段参数');
    grid.append(library, center, ui.inspector);
    const exportPanel = node('section','section-card edit-exports');
    const exportHeading = node('div','edit-toolbar');
    ui.exportButton = button('导出当前剪辑', createExport, true, 'button primary');
    exportHeading.append(node('h2','','成片导出'), ui.exportButton);
    ui.exportList = node('div');
    exportPanel.append(exportHeading, node('p','muted','导出固定当前已保存修订；历史任务不会因后续剪辑而改变。720 / 1080 表示短边像素，帧率固定 30 fps。'), ui.exportList);
    ui.resultDialog = node('dialog','edit-result-dialog'); ui.resultTitle = node('h2'); ui.resultMedia = node('video');
    ui.resultMedia.controls = true; ui.resultMedia.playsInline = true;
    ui.resultDialog.append(ui.resultTitle, ui.resultMedia, button('关闭', () => ui.resultDialog.close()));
    ui.resultDialog.onclose = () => { ui.resultMedia.pause(); ui.resultMedia.removeAttribute('src'); };
    root.append(toolbar, ui.recovery, grid, exportPanel, ui.resultDialog);
    resizeObserver = new ResizeObserver(() => renderOverlay()); resizeObserver.observe(ui.canvas);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { finishTrim(true); pause(); clearTimeout(pollTimer); }
      else if (visible) schedulePoll();
    });
    window.addEventListener('h3auth:expired', () => { finishTrim(true); blocked = true; pause(); clearTimeout(pollTimer); renderStatus(); });
    window.addEventListener('blur', () => finishTrim(true));
    root.addEventListener('keydown', event => {
      if (!visible || root.hidden || event.isComposing || event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])') || document.querySelector('dialog[open]')) return;
      if (trimming) {
        if (event.key === 'Escape') { event.preventDefault(); finishTrim(true); }
        return;
      }
      const key = event.key.toLowerCase(), command = event.ctrlKey || event.metaKey;
      if (event.altKey) return;
      if (command && key === 'z') { event.preventDefault(); if (!event.repeat) restore(event.shiftKey ? redoStack : undoStack, event.shiftKey ? undoStack : redoStack); return; }
      if (event.ctrlKey && key === 'y') { event.preventDefault(); if (!event.repeat) restore(redoStack, undoStack); return; }
      if (command && key !== 'b') return;
      if (event.code === 'Space') { event.preventDefault(); if (!event.repeat) togglePlay(); return; }
      if (['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); seek(playhead + (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 10 : 1) / FPS); return; }
      if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); seek(event.key === 'Home' ? 0 : totalDuration()); return; }
      if (!canWrite() || !selection || event.repeat) return;
      if (key === 'delete' || key === 'backspace') { event.preventDefault(); deleteSelection(); }
      else if ((!command && key === 's' || command && key === 'b') && selection.track === 'clips') { event.preventDefault(); splitClip(selection.id); }
      else if (!command && (key === 'q' || key === 'w')) { event.preventDefault(); cropSelection(key === 'q' ? 'start' : 'end'); }
    });
    renderStatus();
  }
  function mount(container) {
    init(container); visible = true; root.hidden = false;
    if (!documentEdit) load(); else { render(); schedulePoll(); }
  }
  function hide() {
    finishTrim(true); visible = false; pause(); clearTimeout(pollTimer);
    if (root) { root.hidden = true; if (ui.resultDialog.open) ui.resultDialog.close(); }
  }
  function adopted() { return context().outputs || []; }
  function validProvenance(choice) {
    return ['shot','card','job'].every(key => typeof choice.source?.[key] === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(choice.source[key])) && Number.isInteger(choice.source.index) && choice.source.index >= 0;
  }
  function orderedAdopted() {
    const byShot = new Map();
    for (const output of adopted()) {
      if (!validProvenance(output)) continue;
      const old = byShot.get(output.source.shot);
      if (!old || output.output.kind === 'video') byShot.set(output.source.shot, output);
    }
    return [...byShot.values()].map(clone);
  }
  function assetName(id, value = documentEdit.assets[id]) {
    return value?.filename || (value?.source?.shot ? `镜头素材 · ${kinds[value.kind]}` : `${kinds[value?.kind] || '素材'} · ${id.slice(-8)}`);
  }
  function thumbnail(value) {
    const url = mediaURL(value.url);
    if (!url) return node('span','edit-asset-icon','地址不可用');
    if (value.kind === 'audio') return node('span','edit-asset-icon','音频');
    const media = node(value.kind === 'image' ? 'img' : 'video','edit-asset-thumb'); media.src = url;
    if (value.kind === 'image') { media.alt = value.filename || '图片素材'; media.loading = 'lazy'; }
    else { media.muted = true; media.playsInline = true; media.preload = 'none'; }
    return media;
  }
  function renderLibrary() {
    if (!documentEdit) return;
    ui.adopted.replaceChildren(); ui.registry.replaceChildren();
    const choices = adopted();
    for (const choice of choices) {
      const frozen = clone(choice), card = node('div','edit-asset');
      const copy = node('div','edit-asset-copy');
      const add = button('固定此版本并加入主轨', () => importAdopted([frozen]), true);
      if (!validProvenance(choice)) { add.dataset.editInvalid = '1'; add.disabled = true; }
      copy.append(node('b','',`${choice.order + 1}. ${choice.title} · ${kinds[choice.output.kind]}`),
        node('small','muted',`${choice.source.job} · 产物 ${choice.source.index + 1}`), add);
      if (!validProvenance(choice)) copy.append(node('small','muted','历史产物缺少关联节点来源，无法固定导入；可下载原素材后上传。'));
      card.append(thumbnail(choice.output), copy); ui.adopted.append(card);
    }
    if (!choices.length) ui.adopted.append(node('p','muted','尚无可用的已采用镜头产物。也可上传素材开始剪辑。'));
    for (const [id, value] of Object.entries(documentEdit.assets)) {
      const card = node('div','edit-asset'), copy = node('div','edit-asset-copy');
      copy.append(node('b','',assetName(id, value)),
        node('small','muted',`${kinds[value.kind]}${value.kind !== 'image' ? ` · ${Number(value.duration || 0).toFixed(2)} 秒` : ''}`));
      if (value.source?.job) copy.append(node('small','muted',`${value.source.job} · 产物 ${Number(value.source.index) + 1}`));
      const add = button(value.kind === 'audio' ? '加入音频轨' : '加入主轨', () => addAsset(id), true);
      if (!mediaURL(value.url)) { add.disabled = true; add.dataset.editInvalid = '1'; }
      copy.append(add); card.append(thumbnail(value), copy); ui.registry.append(card);
    }
    if (!Object.keys(documentEdit.assets).length) ui.registry.append(node('p','muted','上传与导入的素材会保留在此处；删除片段不会删除素材。'));
  }
  function defaultItem(id) {
    const value = documentEdit.assets[id];
    if (!value || !mediaURL(value.url)) throw new Error('素材不可用');
    if (value.kind === 'image') return {id:uid('clip'), asset:id, in:0, out:3, speed:1, volume:1, fit:'contain'};
    const end = Math.floor(Number(value.duration) * FPS + 1e-7) / FPS;
    if (!Number.isFinite(end) || end < 1 / FPS) throw new Error('素材缺少有效时长，无法加入时间线');
    if (value.kind === 'audio') {
      const start = q(Math.max(0, ...documentEdit.audio.map(item => item.start + item.out - item.in)));
      return {id:uid('audio'), asset:id, in:0, out:end, start, volume:1};
    }
    return {id:uid('clip'), asset:id, in:0, out:end, speed:1, volume:1, fit:'contain'};
  }
  function appendAsset(id) {
    const item = defaultItem(id), track = documentEdit.assets[id].kind === 'audio' ? 'audio' : 'clips';
    documentEdit[track].push(item); selection = {track, id:item.id};
  }
  function addAsset(id) { mutate(() => appendAsset(id)); }
  async function importAdopted(choices) {
    if (!choices.length) return;
    // 调用前已复制产物、job 与原始 outputs 索引，不会异步跟随采用版本变化。
    await transaction(async token => {
      for (const choice of choices) {
        if (!current(token)) return;
        if (!mediaURL(choice.output.url) || !['video','image'].includes(choice.output.kind)) throw new Error('镜头产物不是可导入的同源图片或视频');
        if (!validProvenance(choice)) throw new Error('产物缺少固定镜头 / 节点 / 任务来源，不能导入');
        await flush(); if (!current(token)) return;
        if (documentEdit.clips.length >= 200) throw new Error('主轨最多 200 个片段');
        if (Object.keys(documentEdit.assets).length >= 200) throw new Error('素材库最多 200 份素材');
        const result = await config.auth.json(endpoint('/import'), 'POST', {
          rev:documentEdit.rev, output:clone(choice.output), source:clone(choice.source)
        });
        if (!current(token)) return;
        documentEdit = clone(result.edit); dirty = false; version++;
        const before = editableSnapshot();
        try { appendAsset(result.asset.id); validateLocal(); }
        catch (error) { Object.assign(documentEdit,before); throw error; }
        undoStack.push(before); if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
        redoStack = []; dirty = true; version++;
        await flush(); if (!current(token)) return;
      }
      message = '已按固定产物版本加入主轨';
    });
  }
  async function uploadFiles(files) {
    if (!files.length) return;
    await transaction(async token => {
      for (const file of files) {
        if (!current(token)) return;
        if (Object.keys(documentEdit.assets).length >= 200) throw new Error('素材库最多 200 份素材');
        if (!file.size || file.size > 512 * 1024 * 1024) throw new Error('上传素材须非空且不超过 512 MB');
        const form = new FormData(); form.append('file', file); form.append('rev', String(documentEdit.rev));
        const result = await config.auth.request(endpoint('/upload'), {method:'POST', body:form});
        if (!current(token)) return;
        documentEdit = clone(result.edit); dirty = false; version++;
      }
      message = '素材已登记，请点击素材的「加入主轨 / 音频轨」';
    });
  }
  function field(label, value, action, options = {}) {
    const wrapper = node('label','edit-field'), caption = node('span','',label);
    const input = node(options.options ? 'select' : options.textarea ? 'textarea' : 'input');
    if (options.options) for (const item of options.options) {
      input.add(new Option(typeof item === 'object' ? item.label : String(item), typeof item === 'object' ? item.value : item));
    }
    else if (!options.textarea) input.type = options.type || 'number';
    for (const key of ['min','max','step','maxLength']) if (options[key] != null) input[key] = options[key];
    input.value = value; input.dataset.editWrite = '1';
    input.onchange = () => {
      if (!canWrite()) { input.value = value; return; }
      const numeric = !options.options && !options.textarea && !['color','text'].includes(options.type);
      if (numeric && (input.value === '' || !finite(input.value))) { input.value = value; return; }
      mutate(() => action(numeric ? Number(input.value) : input.value));
    };
    wrapper.append(caption, input);
    if (options.hint) wrapper.append(node('small','muted',options.hint));
    return wrapper;
  }
  function numberRange(value, min, max, label, quantize = false) {
    if (!finite(value) || value < min - 1e-7 || value > max + 1e-7) throw new Error(`${label}须在 ${min.toFixed(2)}–${max.toFixed(2)} 之间`);
    return quantize ? q(clamp(value,min,max)) : clamp(value,min,max);
  }
  function sourceEnd(item) { return Math.min(3600,Math.floor(Number(asset(item)?.duration) * FPS + 1e-7) / FPS); }
  function setTrim(item, key, value) {
    value = numberRange(value, 0, sourceEnd(item), '源素材时间', true);
    const start = key === 'in' ? value : item.in, end = key === 'out' ? value : item.out;
    if (Math.round((end - start) * FPS) < 1) throw new Error('出点必须至少比入点晚一帧');
    if (selection.track === 'audio') validateAudio({...item, [key]:value}, item.id);
    item[key] = value;
  }
  function validateAudio(item, exceptID) {
    const end = q(item.start + item.out - item.in);
    if (documentEdit.audio.some(other => other.id !== exceptID &&
      Math.round(item.start * FPS) < Math.round((other.start + other.out - other.in) * FPS) &&
      Math.round(end * FPS) > Math.round(other.start * FPS))) throw new Error('同一音频轨不能重叠，请调整开始时间或裁剪范围');
  }
  function itemRange(track, item) {
    if (track === 'clips') {
      const position = clipPositions().find(value => value.clip.id === item.id);
      return {start:position.start, end:position.end};
    }
    return {start:item.start, end:track === 'audio' ? q(item.start + item.out - item.in) : item.end};
  }
  function trimEdge(track, item, original, side, delta) {
    const frame = 1 / FPS;
    const bounded = (value, low, high) => clamp(q(value), Math.ceil((low - 1e-7) * FPS) / FPS, Math.floor((high + 1e-7) * FPS) / FPS);
    if (track === 'clips') {
      const available = Math.min(3600, 3600 - q(totalDuration() - duration(item)));
      if (asset(item).kind === 'image') {
        item.in = 0; item.speed = 1;
        item.out = bounded(original.out + (side === 'start' ? -delta : delta), frame, available);
      } else if (side === 'start') {
        item.in = bounded(original.in + delta * original.speed, Math.max(0, original.out - available * original.speed), original.out - frame);
      } else {
        item.out = bounded(original.out + delta * original.speed, original.in + frame, Math.min(sourceEnd(item), original.in + available * original.speed));
      }
    } else if (track === 'audio') {
      const end = q(original.start + original.out - original.in);
      const others = documentEdit.audio.filter(other => other.id !== item.id);
      const previous = Math.max(0, ...others.filter(other => other.start < original.start).map(other => q(other.start + other.out - other.in)));
      const next = Math.min(Infinity, ...others.filter(other => other.start >= end - 1e-7).map(other => other.start));
      if (side === 'start') {
        const start = bounded(original.start + delta, Math.max(previous, original.start - original.in), Math.min(3600, end - frame));
        item.start = start; item.in = q(original.in + start - original.start);
      } else {
        item.out = bounded(original.out + delta, original.in + frame, Math.min(sourceEnd(item), original.in + next - original.start));
      }
    } else if (side === 'start') item.start = bounded(original.start + delta, 0, original.end - frame);
    else item.end = bounded(original.end + delta, original.start + frame, 3600);
  }
  function cropSelection(side) {
    mutate(() => {
      const item = documentEdit[selection.track].find(value => value.id === selection.id);
      if (!item) return;
      const range = itemRange(selection.track, item);
      if (playhead <= range.start || playhead >= range.end) throw new Error('请把播放头移到选中片段内部');
      trimEdge(selection.track, item, clone(item), side, playhead - range[side]);
    });
  }
  function focusTimeline() {
    (ui.timeline.querySelector('.edit-block.selected') || root).focus({preventScroll:true});
  }
  function beginTrim(event, track, item, side, handle) {
    event.stopPropagation(); event.preventDefault();
    if (event.button !== 0 || !canWrite()) return;
    pause(); clearTimeout(saveTimer); dragging = null;
    selection = {track,id:item.id};
    trimming = {track,id:item.id,side,original:clone(item),before:editableSnapshot(),pointer:event.pointerId,
      x:event.clientX,scroll:ui.timelineScroll.scrollLeft,zoom,handle,token:epoch};
    ui.timeline.querySelectorAll('.edit-block').forEach(block => block.classList.toggle('selected', block.dataset.track === track && block.dataset.id === item.id));
    handle.parentElement.focus({preventScroll:true});
    handle.setPointerCapture(event.pointerId);
    window.addEventListener('pointermove', moveTrim);
    window.addEventListener('pointerup', endTrim);
    window.addEventListener('pointercancel', cancelTrim);
    handle.addEventListener('lostpointercapture', cancelTrim);
    root.classList.add('edit-trimming'); renderInspector(); renderStatus();
  }
  function moveTrim(event) {
    const gesture = trimming;
    if (!gesture || event.pointerId !== gesture.pointer) return;
    if (!current(gesture.token) || !visible || blocked || !context().writable || context().busy) { finishTrim(true); return; }
    event.preventDefault();
    const item = documentEdit[gesture.track].find(value => value.id === gesture.id);
    const delta = (event.clientX - gesture.x + ui.timelineScroll.scrollLeft - gesture.scroll) / gesture.zoom;
    const previous = clone(item);
    try { trimEdge(gesture.track, item, gesture.original, gesture.side, delta); validateLocal(); }
    catch { Object.assign(item, previous); }
    playhead = q(clamp(playhead,0,totalDuration()));
    paintTimeline(); renderInspector(); syncPreview(true); updateTransport();
  }
  function endTrim(event) {
    if (event.pointerId !== trimming?.pointer) return;
    moveTrim(event); finishTrim(false);
  }
  function cancelTrim(event) { if (!event || event.pointerId === trimming?.pointer) finishTrim(true); }
  function finishTrim(cancel) {
    const gesture = trimming; if (!gesture) return;
    trimming = null;
    window.removeEventListener('pointermove', moveTrim); window.removeEventListener('pointerup', endTrim); window.removeEventListener('pointercancel', cancelTrim);
    gesture.handle.removeEventListener('lostpointercapture', cancelTrim);
    if (gesture.handle.hasPointerCapture(gesture.pointer)) gesture.handle.releasePointerCapture(gesture.pointer);
    root.classList.remove('edit-trimming');
    if (cancel || !current(gesture.token) || blocked || !context().writable || context().busy) {
      Object.assign(documentEdit, gesture.before);
      if (dirty) saveTimer = setTimeout(() => flush().catch(() => {}),900);
      render();
    } else if (JSON.stringify(gesture.before) !== JSON.stringify(editableSnapshot())) {
      undoStack.push(gesture.before); if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
      redoStack = []; changed();
    } else {
      if (dirty) saveTimer = setTimeout(() => flush().catch(() => {}),900);
      render();
    }
    focusTimeline();
  }
  function paintTimeline() {
    const total = totalDuration();
    ui.timeline.style.width = `${Math.max(450,Math.max(10,timelineDuration()) * zoom)}px`;
    ui.rangeWarning.hidden = timelineDuration() <= total + 1e-7;
    ui.rangeWarning.textContent = `成片长度 ${total.toFixed(2)} 秒：部分音频或文字超出画面主轨，预览与导出会在成片末尾截断。`;
    for (const block of ui.timeline.querySelectorAll('.edit-block')) {
      const item = documentEdit[block.dataset.track].find(value => value.id === block.dataset.id);
      const {start,end} = itemRange(block.dataset.track,item);
      block.style.left = `${start * zoom}px`; block.style.width = `${Math.max(2,(end - start) * zoom)}px`;
      block.title = `${block.dataset.track === 'texts' ? item.text : assetName(item.asset)} · ${start.toFixed(2)}–${end.toFixed(2)} 秒`;
    }
  }
  function moveClip(id, offset) {
    mutate(() => {
      const index = documentEdit.clips.findIndex(item => item.id === id), target = index + offset;
      if (index < 0 || target < 0 || target >= documentEdit.clips.length) return;
      documentEdit.clips.splice(target, 0, documentEdit.clips.splice(index, 1)[0]);
    });
  }
  function splitClip(id) {
    mutate(() => {
      const position = clipPositions().find(item => item.clip.id === id); if (!position) return;
      const {clip, start, end} = position;
      if (Math.round(playhead * FPS) <= Math.round(start * FPS) || Math.round(playhead * FPS) >= Math.round(end * FPS)) throw new Error('请把播放头移到选中片段内部');
      const cut = q(clip.in + (playhead - start) * clip.speed);
      if (Math.round((cut - clip.in) * FPS) < 1 || Math.round((clip.out - cut) * FPS) < 1) throw new Error('分割后每段源素材至少保留一帧');
      const next = {...clone(clip), id:uid('clip'), in:cut};
      clip.out = cut;
      // 图片是独立停留时长，不使用源素材入点。
      if (asset(clip).kind === 'image') { next.in = 0; next.out = q(next.out - cut); }
      const index = documentEdit.clips.indexOf(clip); documentEdit.clips.splice(index + 1, 0, next);
      selection = {track:'clips', id:next.id};
    });
  }
  function duplicateSelection() {
    mutate(() => {
      const list = documentEdit[selection.track], index = list.findIndex(item => item.id === selection.id); if (index < 0) return;
      const copy = {...clone(list[index]), id:uid(selection.track === 'clips' ? 'clip' : selection.track === 'audio' ? 'audio' : 'text')};
      if (selection.track === 'audio') copy.start = q(Math.max(0, ...list.map(item => item.start + item.out - item.in)));
      list.splice(index + 1, 0, copy); selection = {track:selection.track, id:copy.id};
    });
  }
  function deleteSelection() {
    mutate(() => { const list = documentEdit[selection.track], index = list.findIndex(item => item.id === selection.id); if (index >= 0) list.splice(index, 1); selection = null; });
  }
  function addText() {
    mutate(() => {
      const start = Math.min(playhead,3600 - 1 / FPS);
      const item = {id:uid('text'), text:'输入文字', start:q(start), end:q(Math.min(3600,start + 3)), x:0.5, y:0.85, size:40, color:'#ffffff'};
      documentEdit.texts.push(item); selection = {track:'texts', id:item.id};
    });
  }
  function renderSettings() {
    ui.settings.replaceChildren(
      field('画布比例', documentEdit.ratio, value => { documentEdit.ratio = value; }, {options:['16:9','9:16','1:1']}),
      field('短边分辨率', documentEdit.resolution, value => { documentEdit.resolution = Number(value); }, {options:[720,1080]}),
      node('span','muted',`30 fps · ${outputSize().join(' × ')} 像素`)
    );
    ui.canvas.style.aspectRatio = documentEdit.ratio.replace(':',' / ');
    const size = outputSize(); ui.canvas.style.maxWidth = `calc(65vh * ${size[0] / size[1]})`;
  }
  function renderInspector() {
    ui.inspector.replaceChildren(node('h2','','片段参数'));
    const item = selection && documentEdit[selection.track].find(candidate => candidate.id === selection.id);
    if (!item) { selection = null; ui.inspector.append(node('p','muted','点击时间线片段进行裁剪、变速、调整音量或编辑文字。所有秒数按 30 fps 对齐。')); return; }
    const actions = node('div','edit-toolbar');
    actions.append(button('复制', duplicateSelection, true), button('删除', deleteSelection, true, 'button small danger'));
    ui.inspector.append(actions);
    const timeOptions = {min:0, max:3600, step:1 / FPS};
    if (selection.track === 'clips') {
      const image = asset(item).kind === 'image';
      ui.inspector.append(node('p','edit-item-name',assetName(item.asset)));
      const move = node('div','edit-toolbar');
      move.append(button('前移', () => moveClip(item.id, -1), true), button('后移', () => moveClip(item.id, 1), true), button('在播放头分割', () => splitClip(item.id), true)); ui.inspector.append(move);
      const position = clipPositions().find(value => value.clip.id === item.id);
      ui.inspector.append(node('p','muted',`时间线 ${position.start.toFixed(2)}–${position.end.toFixed(2)} 秒`));
      if (!image) {
        ui.inspector.append(
          field('源入点（秒）', item.in, value => setTrim(item, 'in', value), {...timeOptions, max:item.out - 1 / FPS}),
          field('源出点（秒）', item.out, value => setTrim(item, 'out', value), {...timeOptions, min:item.in + 1 / FPS, max:sourceEnd(item)}),
          field('自定义速度（0.25–4×）', item.speed, value => { item.speed = numberRange(value, 0.25, 4, '播放速度'); }, {min:0.25, max:4, step:0.05})
        );
        const presets = node('div','edit-speed-presets');
        for (const speed of [0.25,0.5,1,1.5,2,4]) presets.append(button(`${speed}×`, () => mutate(() => { item.speed = speed; }), true));
        ui.inspector.append(presets);
      }
      ui.inspector.append(field(image ? '图片停留时长（秒）' : '最终时长（秒）', duration(item), value => {
        const next = numberRange(value, 1 / FPS, 3600, '片段时长', true);
        if (image) { item.in = 0; item.out = next; item.speed = 1; }
        else item.speed = numberRange((item.out - item.in) / next, 0.25, 4, '所需播放速度');
      }, {...timeOptions, min:1 / FPS, max:3600, hint:image ? '图片入点为 0，速度固定 1×。' : '最终时长 =（出点 − 入点）÷ 速度，四舍五入到一帧。修改时长保留入/出点并反算速度，须在 0.25–4× 内。'}));
      if (!image) ui.inspector.append(field('原声音量（0–2）', item.volume, value => { item.volume = numberRange(value, 0, 2, '音量'); }, {min:0,max:2,step:0.1, hint:'变速保留音高；不影响配乐速度。超过 1 使用浏览器音频增益。'}));
      ui.inspector.append(field('画面适配', item.fit, value => { item.fit = value; }, {options:[{value:'contain',label:'完整显示（留黑边）'},{value:'cover',label:'填满画布（裁切）'}]}));
    } else if (selection.track === 'audio') {
      ui.inspector.append(node('p','edit-item-name',assetName(item.asset)),
        field('时间线开始（秒）', item.start, value => { const start = numberRange(value, 0, 3600, '开始时间', true); validateAudio({...item,start}, item.id); item.start = start; }, timeOptions),
        field('源入点（秒）', item.in, value => setTrim(item, 'in', value), {...timeOptions,max:item.out - 1 / FPS}),
        field('源出点（秒）', item.out, value => setTrim(item, 'out', value), {...timeOptions,min:item.in + 1 / FPS,max:sourceEnd(item)}),
        field('音量（0–2）', item.volume, value => { item.volume = numberRange(value, 0, 2, '音量'); }, {min:0,max:2,step:0.1}),
        node('p','muted',`保持原速 · 结束于 ${q(item.start + item.out - item.in).toFixed(2)} 秒。调整时间不会推移其他音频。`));
    } else {
      ui.inspector.append(
        field('文字内容', item.text, value => { item.text = value; }, {textarea:true,maxLength:2000}),
        field('开始（秒）', item.start, value => { const start = numberRange(value, 0, 3600, '开始时间', true); if (start >= item.end) throw new Error('开始须早于结束'); item.start = start; }, {...timeOptions,max:item.end - 1 / FPS}),
        field('结束（秒）', item.end, value => { const end = numberRange(value, item.start + 1 / FPS, 3600, '结束时间', true); item.end = end; }, {...timeOptions,min:item.start + 1 / FPS}),
        field('中心 X（0–1）', item.x, value => { item.x = numberRange(value, 0, 1, 'X'); }, {min:0,max:1,step:0.01}),
        field('中心 Y（0–1）', item.y, value => { item.y = numberRange(value, 0, 1, 'Y'); }, {min:0,max:1,step:0.01}),
        field('导出字号（像素）', item.size, value => { item.size = Math.round(numberRange(value, 16, 96, '字号')); }, {min:16,max:96,step:1}),
        field('文字颜色', item.color, value => { if (!/^#[\da-f]{6}$/i.test(value)) throw new Error('颜色格式须为 #RRGGBB'); item.color = value; }, {type:'color'}),
        node('p','muted','文字位置为中心点归一化坐标；预览字号按导出画布高度缩放。'));
    }
  }
  function renderTimeline() {
    if (!documentEdit) return;
    if (trimming) { paintTimeline(); return; }
    const focused = ui.timeline.contains(document.activeElement) || document.activeElement === root;
    const total = totalDuration(), length = Math.max(10, timelineDuration()), width = Math.max(450, length * zoom);
    ui.rangeWarning.hidden = timelineDuration() <= total + 1e-7;
    ui.rangeWarning.textContent = `成片长度 ${total.toFixed(2)} 秒：部分音频或文字超出画面主轨，预览与导出会在成片末尾截断。`;
    ui.timeline.replaceChildren(); ui.timeline.style.width = `${width}px`;
    const ruler = node('div','edit-ruler'); ruler.style.width = `${width}px`;
    const tickStep = zoom >= 80 ? 1 : zoom >= 24 ? 5 : 10;
    // 限制标尺节点数量，长音频无需生成数万个 DOM 节点。
    const step = Math.max(tickStep, Math.ceil(length / 500));
    for (let time = 0; time <= length; time += step) {
      const tick = node('span','edit-tick',`${time}s`); tick.style.left = `${time * zoom}px`; ruler.append(tick);
    }
    ruler.onpointerdown = event => {
      if (event.button !== 0 || trimming) return;
      event.preventDefault();
      const update = e => seek((e.clientX - ruler.getBoundingClientRect().left) / zoom);
      update(event); focusTimeline(); ruler.setPointerCapture(event.pointerId);
      ruler.onpointermove = update;
      ruler.onpointerup = ruler.onpointercancel = () => { ruler.onpointermove = null; };
    };
    ui.timeline.append(ruler);
    const tracks = [
      {key:'clips', label:'画面主轨', values:clipPositions().map(value => ({item:value.clip,start:value.start,end:value.end}))},
      {key:'audio', label:'配乐 / 音频', values:documentEdit.audio.map(item => ({item,start:item.start,end:q(item.start + item.out - item.in)}))},
      {key:'texts', label:'文字层', values:documentEdit.texts.map(item => ({item,start:item.start,end:item.end}))}
    ];
    for (const track of tracks) {
      const row = node('div',`edit-track edit-track-${track.key}`); row.append(node('span','edit-track-label',track.label));
      // 文字允许重叠：分配可见子行，不会覆盖其他文字的选择目标。
      const lanes = [];
      const values = track.key === 'texts' ? track.values.slice().sort((a,b) => a.start - b.start) : track.values;
      for (const value of values) {
        const {item,start,end} = value;
        let lane = 0;
        if (track.key === 'texts') { lane = lanes.findIndex(until => until <= start); if (lane < 0) lane = lanes.length; lanes[lane] = end; }
        const selected = selection?.track === track.key && selection.id === item.id;
        const block = node('button',`edit-block${selected ? ' selected' : ''}`);
        block.type = 'button'; block.textContent = track.key === 'texts' ? item.text : assetName(item.asset);
        block.title = `${block.textContent} · ${start.toFixed(2)}–${end.toFixed(2)} 秒`;
        block.style.left = `${start * zoom}px`; block.style.width = `${Math.max(2,(end - start) * zoom)}px`;
        block.style.top = `${26 + lane * 38}px`;
        block.dataset.track = track.key; block.dataset.id = item.id;
        for (const side of ['start','end']) {
          const handle = node('span','edit-trim-handle'); handle.dataset.side = side;
          handle.title = side === 'start' ? '拖拽裁剪左边缘' : '拖拽裁剪右边缘';
          handle.setAttribute('aria-label',handle.title);
          handle.onpointerdown = event => beginTrim(event, track.key, item, side, handle);
          handle.onclick = event => { event.preventDefault(); event.stopPropagation(); };
          handle.ondragstart = event => event.preventDefault();
          block.append(handle);
        }
        block.onclick = () => { if (trimming) return; selection = {track:track.key,id:item.id}; renderTimeline(); renderInspector(); renderStatus(); focusTimeline(); };
        if (track.key === 'clips') {
          block.draggable = canWrite();
          block.ondragstart = event => { if (!canWrite()) { event.preventDefault(); return; } dragging = item.id; event.dataTransfer.setData('text/plain',item.id); event.dataTransfer.effectAllowed = 'move'; };
          block.ondragover = event => { if (dragging && canWrite()) { event.preventDefault(); block.classList.add('drag-over'); } };
          block.ondragleave = () => block.classList.remove('drag-over');
          block.ondragend = () => { dragging = null; root.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); };
          block.ondrop = event => {
            event.preventDefault(); const id = dragging; dragging = null;
            const from = documentEdit.clips.findIndex(clip => clip.id === id), to = documentEdit.clips.findIndex(clip => clip.id === item.id);
            if (from >= 0 && to >= 0) moveClip(id, to - from);
          };
        }
        row.append(block);
      }
      row.style.height = `${Math.max(1,lanes.length) * 38 + 30}px`;
      row.onclick = event => { if (event.target === row) { seek((event.clientX - row.getBoundingClientRect().left) / zoom); focusTimeline(); } };
      ui.timeline.append(row);
    }
    ui.playheadLine = node('div','edit-playhead'); ui.timeline.append(ui.playheadLine);
    updateTransport();
    if (focused) focusTimeline();
  }
  function outputSize() {
    const side = Number(documentEdit?.resolution || 720), wide = side === 1080 ? 1920 : 1280;
    return documentEdit?.ratio === '9:16' ? [side,wide] : documentEdit?.ratio === '1:1' ? [side,side] : [wide,side];
  }
  function renderOverlay() {
    if (!root || !documentEdit) return;
    ui.overlay.replaceChildren();
    const scale = ui.canvas.clientHeight / outputSize()[1];
    for (const text of documentEdit.texts) {
      if (playhead < text.start || playhead >= text.end) continue;
      const layer = node('div','edit-preview-text',text.text);
      layer.style.left = `${clamp(text.x,0,1) * 100}%`; layer.style.top = `${clamp(text.y,0,1) * 100}%`;
      layer.style.fontSize = `${text.size * scale}px`;
      if (/^#[\da-f]{6}$/i.test(text.color)) layer.style.color = text.color;
      ui.overlay.append(layer);
    }
  }
  function updateTransport() {
    if (!root) return;
    const total = totalDuration();
    ui.time.textContent = `${playhead.toFixed(2)} / ${total.toFixed(2)} 秒`;
    ui.seek.max = total; ui.seek.value = playhead;
    ui.play.textContent = playing ? '暂停' : '播放';
    if (ui.playheadLine) ui.playheadLine.style.left = `${playhead * zoom}px`;
  }
  function seek(time) {
    pause(); playhead = q(clamp(time,0,totalDuration()));
    ui.mediaStatus.textContent = ''; syncPreview(true); updateTransport();
  }
  async function enableAudio() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!audioContext) {
      audioContext = new Audio();
      videoGain = audioContext.createGain(); musicGain = audioContext.createGain();
      audioContext.createMediaElementSource(ui.video).connect(videoGain); videoGain.connect(audioContext.destination);
      audioContext.createMediaElementSource(ui.music).connect(musicGain); musicGain.connect(audioContext.destination);
    }
    if (audioContext.state === 'suspended') await audioContext.resume();
  }
  function mediaVolume(media, gain, value) {
    const volume = clamp(Number(value) || 0,0,2);
    if (gain) { media.volume = 1; gain.gain.value = volume; }
    else { media.volume = Math.min(1,volume); if (volume > 1 && playing) ui.mediaStatus.textContent = '当前浏览器不支持音频增益，预览音量上限为 1；导出仍使用设定音量。'; }
  }
  function syncMedia(media, key, previousKey, url, time, speed, volume, gain, force) {
    if (key !== previousKey) { media.pause(); media.src = url; force = true; }
    media.playbackRate = speed; media.preservesPitch = true;
    mediaVolume(media,gain,volume);
    if (media.readyState >= 1 && (force || Math.abs(media.currentTime - time) > 0.15)) {
      try { media.currentTime = Math.max(0,time); } catch { /* 等待元数据后再次同步。 */ }
    }
    if (playing && media.paused) {
      const token = epoch, generation = playGeneration;
      media.play().catch(error => {
        if (current(token) && generation === playGeneration && visible && playing && media.getAttribute('src') === url && error.name !== 'AbortError') {
          ui.mediaStatus.textContent = '浏览器未能播放素材，请重新点击播放或检查编码。'; pause();
        }
      });
    } else if (!playing) media.pause();
    return key;
  }
  function syncPreview(force = false) {
    if (!documentEdit || !root) return;
    const position = clipPositions().find(item => playhead >= item.start && playhead < item.end);
    const clip = position?.clip, value = clip && asset(clip), url = value && mediaURL(value.url);
    ui.video.hidden = value?.kind !== 'video' || !url; ui.image.hidden = value?.kind !== 'image' || !url;
    ui.empty.hidden = !!url;
    ui.empty.textContent = totalDuration() ? '此时段没有画面' : '在素材库中加入视频或图片';
    if (value?.kind === 'video' && url) {
      ui.video.style.objectFit = clip.fit;
      const sourceTime = q(clamp(clip.in + (playhead - position.start) * clip.speed, clip.in, clip.out));
      mediaKey = syncMedia(ui.video,`${clip.id}:${url}`,mediaKey,url,sourceTime,clip.speed,clip.volume,videoGain,force);
    } else { ui.video.pause(); mediaKey = ''; }
    if (value?.kind === 'image' && url) {
      if (ui.image.getAttribute('src') !== url) ui.image.src = url;
      ui.image.style.objectFit = clip.fit;
    }
    const music = documentEdit.audio.find(item => playhead >= item.start && playhead < q(item.start + item.out - item.in));
    const musicURL = music && mediaURL(asset(music)?.url);
    if (music && musicURL) {
      musicKey = syncMedia(ui.music,`${music.id}:${musicURL}`,musicKey,musicURL,q(music.in + playhead - music.start),1,music.volume,musicGain,force);
    } else { ui.music.pause(); musicKey = ''; }
    renderOverlay();
  }
  function pause() {
    playing = false; playStarting = false; playGeneration++; cancelAnimationFrame(raf); raf = 0;
    if (root) { ui.video.pause(); ui.music.pause(); updateTransport(); }
  }
  async function togglePlay() {
    if (playing || playStarting) { pause(); return; }
    if (!documentEdit || !visible || document.hidden || totalDuration() <= 0) return;
    const token = epoch, generation = ++playGeneration; playStarting = true;
    try { await enableAudio(); }
    catch { if (current(token) && generation === playGeneration) ui.mediaStatus.textContent = '浏览器音频增益不可用，将按原生音量预览。'; }
    if (!current(token) || generation !== playGeneration || !visible || document.hidden) return;
    playStarting = false;
    if (playhead >= totalDuration()) playhead = 0;
    playing = true; clockStart = performance.now(); clockTime = playhead;
    syncPreview(true); updateTransport();
    const tick = now => {
      if (!playing || !current(token) || !visible || document.hidden) return;
      playhead = q(Math.min(totalDuration(),clockTime + (now - clockStart) / 1000));
      if (playhead >= totalDuration()) { pause(); syncPreview(true); return; }
      syncPreview(); updateTransport(); raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  async function createExport() {
    await transaction(async token => {
      const result = await config.auth.json(endpoint('/exports'),'POST',{rev:documentEdit.rev});
      if (!current(token)) return;
      exports = [clone(result.export), ...exports.filter(item => item.id !== result.export.id)];
      renderExports(); schedulePoll();
    });
  }
  async function cancelExport(id) {
    if (!canWrite()) return;
    const token = epoch;
    try {
      const result = await config.auth.json(endpoint(`/exports/${encodeURIComponent(id)}/cancel`),'POST',{});
      if (!current(token)) return;
      exports = exports.map(item => item.id === id ? clone(result.export) : item); renderExports(); schedulePoll();
    } catch (error) {
      if (error.status === 409) {
        if (!current(token)) return;
        message = `取消导出失败：${error.message}`;
        renderStatus(); notify(message);
      } else failure(error,token);
    }
  }
  function playResult(record) {
    const url = mediaURL(record.url); if (!url) { notify('导出地址不是允许的同源产物地址'); return; }
    pause(); ui.resultTitle.textContent = record.filename || `成片 · 修订 ${record.edit_rev}`;
    ui.resultMedia.src = url; ui.resultDialog.showModal(); ui.resultMedia.play().catch(() => {});
  }
  function renderExports() {
    ui.exportList.replaceChildren();
    for (const record of exports) {
      const row = node('div','edit-export-row');
      const info = node('div');
      info.append(node('b','',record.filename || `导出 ${record.id}`),
        node('small','muted',`修订 ${record.edit_rev} · ${statuses[record.status] || '未知状态'}${active(record) ? ` · ${Math.round(clamp(Number(record.progress) || 0,0,1) * 100)}%` : ''}`));
      if (active(record)) { const progress = node('progress'); progress.max = 1; progress.value = clamp(Number(record.progress) || 0,0,1); progress.setAttribute('aria-label','导出进度'); info.append(progress); }
      if (record.error) info.append(node('p','edit-export-error',record.error));
      const controls = node('div','edit-toolbar');
      if (active(record)) controls.append(button('取消', () => cancelExport(record.id), true));
      if (record.status === 'done') {
        if (mediaURL(record.url)) controls.append(button('播放成片', () => playResult(record)));
        const download = node('a','button small','下载成片');
        download.href = endpoint(`/exports/${encodeURIComponent(record.id)}/download`); download.download = record.filename || '成片.mp4';
        controls.append(download);
      }
      row.append(info, controls); ui.exportList.append(row);
    }
    if (!exports.length) ui.exportList.append(node('p','muted','尚无导出记录。导出任务只使用已登记的素材，不调用 GPU 生成。'));
    renderStatus();
  }
  function schedulePoll() {
    clearTimeout(pollTimer);
    if (!visible || document.hidden || pollDenied || !config.auth.active || !exports.some(active)) return;
    const token = epoch;
    pollTimer = setTimeout(() => pollExports(token),1500);
  }
  async function pollExports(token) {
    if (!current(token) || !visible || document.hidden || pollBusy || !config.auth.active) return;
    pollBusy = true;
    try {
      const result = await config.auth.request(endpoint('/exports'));
      if (!current(token) || !visible || document.hidden) return;
      exports = clone(result.exports || []); renderExports();
    } catch (error) {
      if (current(token) && visible) { message = `导出状态读取失败：${error.message}`; if ([401,403,404].includes(error.status)) pollDenied = true; renderStatus(); }
    } finally { if (current(token)) { pollBusy = false; schedulePoll(); } }
  }
  function render() {
    if (!root || !documentEdit || !visible) { renderStatus(); return; }
    playhead = q(clamp(playhead,0,totalDuration()));
    renderSettings(); renderLibrary(); renderTimeline(); renderInspector(); renderExports(); syncPreview(true); renderStatus();
  }
  window.DirectorEdit = {
    configure(options) { config = options; }, init, setContext, mount, hide, flush:flushAll,
    refresh() { if (visible && documentEdit) { renderLibrary(); renderStatus(); } },
    get dirty() { return dirty; }, get pending() { return !!saving || operation || !!trimming; }
  };
})();
