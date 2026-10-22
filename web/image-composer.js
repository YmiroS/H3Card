/* Local-only image composition. Fabric 7.4.0 is vendored under vendor/. */
(() => {
  'use strict';
  const ownScript = document.currentScript;
  const base = new URL('.', ownScript?.src || location.href);
  const MAX_SIDE = 8192, MAX_PIXELS = 32000000, MAX_LAYERS = 100, MAX_LINKED_IDENTITIES = 512;
  const MAX_DECODED = 64000000, MAX_BYTES = 64 * 1024 * 1024;
  let dependencies;
  const copy = value => JSON.parse(JSON.stringify(value));
  // getRandomValues also works on the trusted intranet's non-secure HTTP origins.
  const uid = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2,'0')).join('');
  const sizeOK = (w, h) => Number.isFinite(w) && Number.isFinite(h) && w >= 1 && h >= 1 && w <= MAX_SIDE && h <= MAX_SIDE && w * h <= MAX_PIXELS;
  function assertSize(w, h) {
    if (!sizeOK(w, h)) throw new Error('图片或画布超出限制：单边 1–8192 像素，总像素不超过 3200 万。');
  }
  function mediaURL(value) {
    if (typeof value !== 'string' || !value || value.length > 8192) throw new Error('图片地址无效。');
    const url = new URL(value, location.href);
    // Only backend-controlled media routes; never fetch arbitrary same-origin endpoints.
    const controlledPath = url.pathname === '/api/file' || /^\/api\/upload\/[^/]+$/.test(url.pathname) || /^\/api\/artifact\/[^/]+\/[^/]+$/.test(url.pathname);
    if (!/^https?:$/.test(url.protocol) || url.origin !== location.origin || url.username || url.password || !controlledPath || url.hash) {
      throw new Error('仅支持本站受控媒体地址（/api/file、/api/upload/文件名、/api/artifact/项目/文件名）；不接受其他路径、外站、data 或 blob 地址。');
    }
    url.searchParams.sort();
    if (url.href.length > 8192) throw new Error('图片地址过长。');
    return url.href;
  }
  function assetJSON(value) {
    if (!value || value.kind !== 'image') throw new Error('只能添加图片资产。');
    const text = JSON.stringify(value);
    if (text.length > 262144) throw new Error('图片资产描述过大，请勿在编辑稿中嵌入图片数据。');
    const asset = JSON.parse(text);
    mediaURL(asset.url);
    return asset;
  }
  function assetName(asset) {
    const basename = value => typeof value === 'string' ? value.trim().split(/[\\/]/).filter(Boolean).at(-1) : '';
    return String(basename(asset.origin) || basename(asset.filename) || asset.name || '图片').slice(0,200);
  }
  function assetIdentities(asset) {
    const keys = [`url:${mediaURL(asset.url)}`];
    if (typeof asset.ref === 'string' && asset.ref.trim()) {
      if (asset.ref.length > 8192) throw new Error('图片资源标识过长。');
      keys.push(`ref:${asset.ref}`);
    }
    return keys;
  }
  function normalize(value) {
    const text = JSON.stringify(value || {version:1, width:1920, height:1080, background:'transparent', layers:[]});
    if (text.length > 2 * 1024 * 1024) throw new Error('编辑稿描述超过 2 MiB，请减少图层或资产元数据。');
    const s = JSON.parse(text);
    if (s.version !== 1 || !Array.isArray(s.layers) || s.layers.length > MAX_LAYERS) throw new Error('编辑稿版本或图层数量无效（最多 100 层）。');
    assertSize(s.width, s.height);
    if (!Number.isInteger(s.width) || !Number.isInteger(s.height)) throw new Error('画布尺寸必须为整数像素。');
    if (s.background !== 'transparent' && !/^#[a-f\d]{6}$/i.test(s.background)) throw new Error('背景必须为透明或六位十六进制颜色。');
    const ids = new Set();
    s.layers = s.layers.map(l => {
      if (!l || typeof l.id !== 'string' || !l.id || ids.has(l.id)) throw new Error('图层 ID 无效或重复。');
      ids.add(l.id);
      if (![l.width,l.height].every(value => Number.isFinite(value) && value > 0) || l.width > MAX_SIDE || l.height > MAX_SIDE || l.width * l.height > MAX_PIXELS) throw new Error('图层尺寸必须大于 0，单边不超过 8192 像素，总像素不超过 3200 万。');
      if (![l.x,l.y,l.angle,l.opacity].every(Number.isFinite) || Math.abs(l.x) > 100000 || Math.abs(l.y) > 100000 || Math.abs(l.angle) > 36000 || l.opacity < 0 || l.opacity > 1) throw new Error('图层位置、角度或透明度无效。');
      let crop;
      if (l.crop !== undefined) {
        const c = l.crop;
        if (!c || ![c.x,c.y,c.width,c.height].every(Number.isInteger) || c.x < 0 || c.y < 0 || c.width < 1 || c.height < 1 || c.x + c.width > MAX_SIDE || c.y + c.height > MAX_SIDE) throw new Error('图片裁剪范围无效，需使用原图范围内的整数像素。');
        crop = {x:c.x,y:c.y,width:c.width,height:c.height};
      }
      return {id:l.id, name:String(l.name || '图片').slice(0,200), asset:assetJSON(l.asset), x:l.x, y:l.y, width:l.width, height:l.height, angle:l.angle, opacity:l.opacity, visible:l.visible !== false, locked:!!l.locked, ...(crop ? {crop} : {})};
    });
    const normalized = {version:1, width:s.width, height:s.height, background:s.background, layers:s.layers};
    if (s.linkedSources !== undefined) {
      if (!Array.isArray(s.linkedSources) || s.linkedSources.length > MAX_LINKED_IDENTITIES || s.linkedSources.some(key => typeof key !== 'string' || !key || key.length > 8196)) throw new Error('已连接图片记录无效（最多 512 条有界资源标识）。');
      normalized.linkedSources = [...new Set(s.linkedSources)];
    }
    return normalized;
  }
  async function inspectImage(blob) {
    // Inspect dimensions before full decoding: compressed oversized images must not allocate huge bitmaps.
    const bytes = new Uint8Array(await blob.slice(0, 1024 * 1024).arrayBuffer());
    const view = new DataView(bytes.buffer), ascii = (at,n) => String.fromCharCode(...bytes.subarray(at,at+n));
    let w, h;
    if (bytes.length >= 24 && ascii(1,3) === 'PNG' && view.getUint32(0) === 0x89504e47) {
      w = view.getUint32(16); h = view.getUint32(20);
    } else if (bytes.length >= 10 && /^GIF8[79]a$/.test(ascii(0,6))) {
      w = view.getUint16(6,true); h = view.getUint16(8,true);
    } else if (bytes.length >= 26 && ascii(0,2) === 'BM') {
      const dib = view.getUint32(14,true);
      if (dib === 12) { w = view.getUint16(18,true); h = view.getUint16(20,true); }
      else { w = view.getInt32(18,true); h = Math.abs(view.getInt32(22,true)); }
    } else if (bytes.length >= 30 && ascii(0,4) === 'RIFF' && ascii(8,4) === 'WEBP') {
      for (let at = 12; at + 18 <= bytes.length;) {
        const kind = ascii(at,4), length = view.getUint32(at+4,true), data = at+8;
        if (kind === 'VP8X') { w = 1 + bytes[data+4] + (bytes[data+5]<<8) + (bytes[data+6]<<16); h = 1 + bytes[data+7] + (bytes[data+8]<<8) + (bytes[data+9]<<16); break; }
        if (kind === 'VP8 ' && bytes[data+3] === 157 && bytes[data+4] === 1 && bytes[data+5] === 42) { w = view.getUint16(data+6,true) & 16383; h = view.getUint16(data+8,true) & 16383; break; }
        if (kind === 'VP8L' && bytes[data] === 0x2f) { w = 1 + bytes[data+1] + ((bytes[data+2]&63)<<8); h = 1 + (bytes[data+2]>>6) + (bytes[data+3]<<2) + ((bytes[data+4]&15)<<10); break; }
        at = data + length + (length % 2);
      }
    } else if (bytes[0] === 255 && bytes[1] === 216) {
      let at = 2;
      while (at + 8 < bytes.length) {
        if (bytes[at++] !== 255) break;
        while (bytes[at] === 255) at++;
        const marker = bytes[at++];
        if (marker === 217 || marker === 218) break;
        if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
        const length = view.getUint16(at);
        if (length < 2) break;
        if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) { h = view.getUint16(at+3); w = view.getUint16(at+5); break; }
        at += length;
      }
    }
    if (w === undefined || h === undefined) throw new Error('无法安全识别图片尺寸。请使用标准 PNG、JPEG、WebP、GIF 或 BMP 图片（不支持 SVG / AVIF）。');
    assertSize(w,h); return {width:w,height:h};
  }
  async function boundedBlob(response) {
    const reader = response.body.getReader(), chunks = []; let length = 0;
    try {
      while (true) {
        const part = await reader.read(); if (part.done) break;
        length += part.value.byteLength;
        if (length > MAX_BYTES) { await reader.cancel(); throw new Error('图片文件不得超过 64 MiB。'); }
        chunks.push(part.value);
      }
    } finally { reader.releaseLock(); }
    return new Blob(chunks, {type:response.headers.get('content-type')?.split(';')[0] || ''});
  }
  function loadDependencies() {
    if (dependencies) return dependencies;
    dependencies = (async () => {
      const stylesheetURL = new URL('image-composer.css', base);
      const hasStylesheet = Array.from(document.querySelectorAll('link[rel~="stylesheet"]')).some(link => {
        const url = new URL(link.href, location.href);
        return url.origin === stylesheetURL.origin && url.pathname === stylesheetURL.pathname;
      });
      if (!hasStylesheet) {
        const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = stylesheetURL.href; link.dataset.choukaComposer = '1'; document.head.append(link);
      }
      if (!window.fabric || window.fabric.version !== '7.4.0') {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script'); script.src = new URL('vendor/fabric.min.js', base).href;
          script.onload = resolve; script.onerror = () => { script.remove(); reject(new Error('本地 Fabric 加载失败，请刷新重试。')); }; document.head.append(script);
        });
      }
      if (window.fabric?.version !== '7.4.0') throw new Error('需要 Fabric 7.4.0 浏览器构建。');
    })().catch(error => { dependencies = null; throw error; });
    return dependencies;
  }
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  async function open({state, sources = [], linkedSources = [], upload, onSave, onExport, canEdit = () => true} = {}) {
    const dialog = el('dialog', 'chouka-composer image-composer-dialog');
    dialog.setAttribute('data-image-composer', '');
    const headingId = `composer-${uid()}`;
    dialog.setAttribute('aria-labelledby', headingId);
    const head = el('div', 'ic-head'), title = el('h2', '', '图片合成'); title.id = headingId;
    const closeButton = el('button', 'ic-button', '关闭'); closeButton.type = 'button'; closeButton.dataset.composerAction = 'close';
    const retryButton = el('button', 'ic-button', '重试载入'); retryButton.type = 'button'; retryButton.hidden = true;
    head.append(title, el('span', 'ic-local', '浏览器本地合成 · 原图尺寸输出'), retryButton, closeButton);
    const status = el('div', 'ic-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    const errorBox = el('div', 'ic-error'); errorBox.setAttribute('role', 'alert'); errorBox.hidden = true;
    const body = el('div', 'ic-body'), left = el('aside', 'ic-left'), center = el('section', 'ic-center'), right = el('aside', 'ic-right');
    left.setAttribute('aria-label', '图层和图片素材'); center.setAttribute('aria-label', '合成画布'); right.setAttribute('aria-label', '图片与画布属性');
    const toolbar = el('div', 'ic-toolbar'), viewport = el('div', 'ic-viewport'), canvasElement = el('canvas');
    canvasElement.setAttribute('aria-label', '图片合成编辑画布');
    viewport.append(canvasElement); center.append(toolbar, viewport, el('p', 'ic-hint', '拖动图片移动，拖动角点缩放。方向键移动 1px，Shift + 方向键移动 10px。'));
    const footer = el('div', 'ic-footer'), footerNote = el('span', 'ic-hint', '编辑稿仅保存图片引用；合成 PNG 不包含选择框。');
    body.append(left, center, right); footer.append(footerNote); dialog.append(head, status, errorBox, body, footer); document.body.append(dialog);
    const previousFocus = document.activeElement;
    let model, canvas, selected = null, busy = false, dead = false, ready = false, dirtyBase = '', history = [], historyIndex = -1;
    let observer, permissionTimer, totalPixels = 0, viewScale = 1, fitMode = true, dragId = null, refreshing = false, cropSession = null;
    const abort = new AbortController(), images = new Map(), objectMap = new Map();
    const f = () => window.fabric;
    const allowed = () => { try { return canEdit() === true; } catch (error) { showError(error); return false; } };
    function showError(error) { errorBox.textContent = error?.message || String(error); errorBox.hidden = false; console.error('[图片合成]', error); }
    function clearError() { errorBox.hidden = true; errorBox.textContent = ''; }
    function editable() {
      if (dead || busy || !ready) return false;
      if (!allowed()) { status.textContent = '只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。'; refreshPermission(); return false; }
      return true;
    }
    function button(parent, text, action, kind = '') {
      const b = el('button', `ic-button ${kind}`, text); b.type = 'button'; parent.append(b);
      const actionName = {'撤销':'undo','重做':'redo','适应窗口':'fit','缩小':'zoom-out','放大':'zoom-in','上传图片（支持多选）':'upload','保存编辑稿':'save','合成 PNG':'export','上移':'raise','下移':'lower','置顶':'front','置底':'back','复制':'duplicate','删除':'delete'}[text];
      if (actionName) b.dataset.composerAction = actionName;
      b.addEventListener('click', () => { if (editable()) { try { const result = action(); if (result?.catch) result.catch(showError); } catch (error) { showError(error); } } });
      return b;
    }
    function field(parent, text, type = 'number', options = {}) {
      const label = el('label', 'ic-field'), span = el('span', '', text), input = el('input'); input.type = type;
      Object.assign(input, options); label.append(span, input); parent.append(label); return input;
    }
    function refreshPermission() {
      if (dead) return;
      const permitted = allowed(), disabled = busy || !ready || !permitted;
      for (const control of dialog.querySelectorAll('button,input')) {
        if (control.dataset.composerAction === 'cancel-crop') control.disabled = busy;
        else if (control !== closeButton && control !== retryButton) control.disabled = disabled || control.dataset.inactive === '1';
      }
      closeButton.disabled = busy;
      retryButton.disabled = busy || !permitted;
      dialog.setAttribute('aria-busy', String(busy));
      if (canvas) {
        canvas.skipTargetFind = disabled; canvas.selection = false;
        canvas.upperCanvasEl.style.pointerEvents = disabled ? 'none' : '';
        canvas.upperCanvasEl.tabIndex = disabled ? -1 : 0;
      }
      if (!permitted) status.textContent = '只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。';
    }
    async function run(label, task) {
      if (!editable()) return;
      busy = true; clearError(); status.textContent = label; refreshPermission();
      try { return await task(); }
      catch (error) { if (!dead) showError(error); }
      finally { busy = false; if (!dead) { status.textContent = allowed() ? (errorBox.hidden ? '就绪 · 更改仅在保存编辑稿后持久化' : '操作未完成，请检查提示后重试') : '只读：当前工具卡已失效。仅可关闭。'; updateUI(); } }
    }
    async function getImage(asset) {
      const url = mediaURL(asset.url);
      if (images.has(url)) return images.get(url);
      const response = await fetch(url, {credentials:'same-origin', redirect:'error', signal:abort.signal});
      if (!response.ok) throw new Error(`图片读取失败（HTTP ${response.status}）。`);
      if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('图片文件不得超过 64 MiB。');
      const blob = await boundedBlob(response);
      if (blob.size > MAX_BYTES || !/^image\/(png|jpeg|webp|gif|bmp|x-ms-bmp)$/i.test(blob.type)) throw new Error('仅支持 PNG、JPEG、WebP、GIF、BMP 图片，单文件最多 64 MiB；不支持 SVG / AVIF。');
      const dimensions = await inspectImage(blob);
      if (totalPixels + dimensions.width * dimensions.height > MAX_DECODED) throw new Error('已载入图片总像素超过 6400 万，请关闭后使用较小图片重新编辑。');
      const bitmap = await createImageBitmap(blob);
      try {
        assertSize(bitmap.width, bitmap.height);
        if (totalPixels + bitmap.width * bitmap.height > MAX_DECODED) throw new Error('已载入图片总像素超过 6400 万，请关闭后使用较小图片重新编辑。');
      } catch (error) { bitmap.close(); throw error; }
      if (dead) { bitmap.close(); throw new Error('合成器已关闭。'); }
      totalPixels += bitmap.width * bitmap.height; images.set(url, bitmap); return bitmap;
    }
    function imageCrop(layer) {
      const bitmap = images.get(mediaURL(layer.asset.url));
      if (!bitmap) throw new Error('图片尚未载入。');
      const crop = layer.crop || {x:0,y:0,width:bitmap.width,height:bitmap.height};
      if (crop.x + crop.width > bitmap.width || crop.y + crop.height > bitmap.height) throw new Error('裁剪范围超出原图尺寸。');
      return crop;
    }
    function makeObject(layer) {
      const bitmap = images.get(mediaURL(layer.asset.url)), crop = imageCrop(layer);
      const object = new (f().FabricImage)(bitmap, {originX:'left', originY:'top', left:layer.x, top:layer.y, angle:layer.angle, cropX:crop.x, cropY:crop.y, width:crop.width, height:crop.height, scaleX:layer.width / crop.width, scaleY:layer.height / crop.height, opacity:layer.opacity, visible:layer.visible, selectable:!layer.locked, evented:!layer.locked, lockScalingFlip:true, objectCaching:false, cornerColor:'#a0e7cb', borderColor:'#a0e7cb', transparentCorners:false, cornerSize:12, padding:0});
      object.composerId = layer.id;
      object.setControlsVisibility({ml:!ratio.checked,mr:!ratio.checked,mt:!ratio.checked,mb:!ratio.checked});
      return object;
    }
    function thumbnail(asset, crop) {
      const url = mediaURL(asset.url), frame = el('span', 'ic-thumbnail'), bitmap = images.get(url);
      frame.setAttribute('aria-hidden', 'true'); frame.draggable = false;
      if (bitmap) {
        // Reuse decoded pixels: rebuilding the layer list must not fetch the image again.
        const region = crop || {x:0,y:0,width:bitmap.width,height:bitmap.height};
        const preview = el('canvas'), scale = Math.min(1, 220 / region.width, 120 / region.height); preview.draggable = false;
        preview.width = Math.max(1, Math.round(region.width * scale)); preview.height = Math.max(1, Math.round(region.height * scale));
        preview.getContext('2d').drawImage(bitmap, region.x, region.y, region.width, region.height, 0, 0, preview.width, preview.height); frame.append(preview);
      } else {
        const preview = el('img'); preview.alt = ''; preview.loading = 'lazy'; preview.decoding = 'async'; preview.draggable = false;
        const original = new URL(url);
        preview.src = /^\/api\/(upload|artifact)\//.test(original.pathname)
          ? `/api/thumbnail?url=${encodeURIComponent(original.pathname + original.search)}` : url;
        frame.append(preview);
      }
      return frame;
    }
    function selectedLayer() { return model?.layers.find(l => l.id === selected); }
    function rebuild() {
      if (!canvas || !model) return;
      refreshing = true;
      canvas.discardActiveObject();
      for (const object of canvas.getObjects()) { canvas.remove(object); object.dispose(); }
      objectMap.clear();
      canvas.backgroundColor = model.background === 'transparent' ? '' : model.background;
      for (const layer of model.layers) { const object = makeObject(layer); canvas.add(object); objectMap.set(layer.id, object); }
      const layer = selectedLayer(), active = objectMap.get(selected);
      if (active && layer.visible && !layer.locked) canvas.setActiveObject(active);
      refreshing = false; resizeView(); updateUI(); canvas.requestRenderAll();
    }
    function checkpoint() {
      const serialized = JSON.stringify(model);
      if (history[historyIndex] === serialized) { updateUI(); return; }
      history.splice(historyIndex + 1); history.push(serialized);
      if (history.length > 60) history.shift(); historyIndex = history.length - 1;
      updateUI();
    }
    function change(mutator) {
      if (!editable() || !model) return;
      const before = copy(model);
      try { mutator(); model = normalize(model); rebuild(); checkpoint(); clearError(); return true; }
      catch (error) { model = before; rebuild(); showError(error); }
    }
    function travel(delta) {
      const index = historyIndex + delta;
      if (index < 0 || index >= history.length) return;
      const linkedSeen = model.linkedSources;
      model = JSON.parse(history[index]);
      // Undo can remove an auto-added layer, but must not make it reappear next open.
      if (linkedSeen) model.linkedSources = [...new Set([...(model.linkedSources || []), ...linkedSeen])];
      historyIndex = index; history[index] = JSON.stringify(model); rebuild();
    }
    function resizeView() {
      if (!canvas || !model || dead) return;
      const w = Math.max(80, viewport.clientWidth - 32), h = Math.max(80, viewport.clientHeight - 32);
      if (fitMode) viewScale = Math.min(w / model.width, h / model.height, 1);
      // Display backing stores stay small even for an 8192px output; logical coordinates are unchanged.
      viewScale = Math.max(.01, Math.min(viewScale, 2, 4096 / Math.max(model.width, model.height), Math.sqrt(8000000 / (model.width * model.height))));
      canvas.setDimensions({width:Math.max(1, Math.round(model.width * viewScale)), height:Math.max(1, Math.round(model.height * viewScale))});
      canvas.setViewportTransform([viewScale,0,0,viewScale,0,0]);
      zoomText.textContent = `${Math.round(viewScale * 100)}% · ${model.width} × ${model.height} px`;
    }
    const undoButton = button(toolbar, '撤销', () => travel(-1)), redoButton = button(toolbar, '重做', () => travel(1));
    button(toolbar, '适应窗口', () => { fitMode = true; resizeView(); });
    button(toolbar, '缩小', () => { fitMode = false; viewScale /= 1.25; resizeView(); });
    button(toolbar, '放大', () => { fitMode = false; viewScale *= 1.25; resizeView(); });
    const zoomText = el('span', 'ic-zoom'); toolbar.append(zoomText);
    left.append(el('h3', '', '图层'), el('p', 'ic-hint', '从上到下为顶层到底层，可拖动排序'));
    const layerList = el('div', 'ic-layers'); layerList.setAttribute('aria-label', '图层列表'); left.append(layerList);
    const layerActions = el('div', 'ic-layer-actions'); left.append(layerActions);
    const layerButtons = [];
    function layerButton(text, action) { const b = button(layerActions, text, () => selectedLayer() && action()); layerButtons.push(b); return b; }
    function moveLayer(index) { change(() => { const from = model.layers.findIndex(l => l.id === selected); const [layer] = model.layers.splice(from,1); model.layers.splice(Math.max(0,Math.min(index,model.layers.length)),0,layer); }); }
    layerButton('上移', () => moveLayer(model.layers.findIndex(l => l.id === selected) + 1));
    layerButton('下移', () => moveLayer(model.layers.findIndex(l => l.id === selected) - 1));
    layerButton('置顶', () => moveLayer(model.layers.length - 1)); layerButton('置底', () => moveLayer(0));
    layerButton('复制', () => change(() => {
      if (model.layers.length >= MAX_LAYERS) throw new Error('最多添加 100 个图层。');
      const layer = copy(selectedLayer()); layer.id = uid(); layer.name = `${layer.name} 副本`; layer.x += 20; layer.y += 20;
      model.layers.splice(model.layers.findIndex(l => l.id === selected) + 1,0,layer); selected = layer.id;
    }));
    layerButton('删除', () => change(() => { model.layers = model.layers.filter(l => l.id !== selected); selected = null; }));
    left.append(el('h3', '', '添加图片'));
    const uploadButton = button(left, '上传图片（支持多选）', () => fileInput.click());
    const fileInput = el('input', 'ic-file'); fileInput.type = 'file'; fileInput.multiple = true; fileInput.accept = 'image/png,image/jpeg,image/webp,image/gif,image/bmp'; fileInput.hidden = true; left.append(fileInput);
    left.append(el('p', 'ic-hint', '可拖入文件或粘贴图片。单边 ≤8192px，总像素 ≤3200万，文件 ≤64MiB。'));
    const sourceList = el('div', 'ic-sources'); left.append(sourceList);
    right.append(el('h3', '', '画布'));
    const canvasFields = el('div', 'ic-field-grid'); right.append(canvasFields);
    const cw = field(canvasFields, '画布宽度 / px', 'number', {min:1,max:MAX_SIDE,step:1});
    const ch = field(canvasFields, '画布高度 / px', 'number', {min:1,max:MAX_SIDE,step:1});
    cw.dataset.composerField = 'canvas-width'; ch.dataset.composerField = 'canvas-height';
    const backgroundRow = el('div', 'ic-background'); right.append(backgroundRow);
    const transparent = field(backgroundRow, '透明背景', 'checkbox'); transparent.parentElement.classList.add('ic-switch');
    const background = field(backgroundRow, '背景颜色', 'color');
    cw.addEventListener('change', () => change(() => { model.width = Number(cw.value); }));
    ch.addEventListener('change', () => change(() => { model.height = Number(ch.value); }));
    transparent.addEventListener('change', () => change(() => { model.background = transparent.checked ? 'transparent' : background.value; }));
    background.addEventListener('change', () => change(() => { model.background = background.value; }));
    right.append(el('h3', '', '所选图层'));
    const nameInput = field(right, '名称', 'text', {maxLength:200});
    const geometry = el('div', 'ic-field-grid'); right.append(geometry);
    const fields = {};
    for (const [key,label,min,max] of [['x','X / px',-100000,100000],['y','Y / px',-100000,100000],['width','宽度 / px',0,MAX_SIDE],['height','高度 / px',0,MAX_SIDE],['angle','角度 / °',-36000,36000],['opacity','透明度 / %',0,100]]) {
      const input = field(geometry,label,'number',{min,max,step:key === 'opacity' ? 1 : key === 'width' || key === 'height' ? 'any' : .1}); fields[key] = input; input.dataset.composerField = key;
      input.addEventListener('change', () => change(() => {
        const layer = selectedLayer(); if (!layer || layer.locked) return;
        const number = Number(input.value);
        if (input.value.trim() === '' || !Number.isFinite(number)) throw new Error('请输入有效数值。');
        if (ratio.checked && (key === 'width' || key === 'height')) {
          const other = key === 'width' ? 'height' : 'width'; layer[other] *= number / layer[key];
        }
        layer[key] = key === 'opacity' ? number / 100 : number;
      }));
    }
    const ratio = field(right, '锁定宽高比', 'checkbox', {checked:true}); ratio.parentElement.classList.add('ic-switch');
    ratio.addEventListener('change', () => {
      if (!editable()) return;
      canvas.uniformScaling = ratio.checked;
      for (const object of objectMap.values()) object.setControlsVisibility({ml:!ratio.checked,mr:!ratio.checked,mt:!ratio.checked,mb:!ratio.checked});
      canvas.requestRenderAll();
    });
    const cropButton = button(right, '裁剪图片', beginCrop);
    cropButton.dataset.composerAction = 'crop';
    right.append(el('p', 'ic-hint', '裁剪只影响所选图片，保留原图，可重新裁剪或恢复原图。'));
    const cropDialog = el('dialog', 'ic-crop-dialog');
    cropDialog.setAttribute('data-image-crop', '');
    const cropTitle = el('h2', '', '裁剪所选图片'); cropTitle.id = `crop-${uid()}`;
    cropDialog.setAttribute('aria-labelledby', cropTitle.id);
    const cropHint = el('p', 'ic-hint', '拖动边框调整范围，框内拖动移动，框外拖动重新框选；也可输入原图像素。');
    const cropStage = el('div', 'ic-crop-stage'), cropPreview = el('canvas');
    cropPreview.setAttribute('aria-label', '单张图片裁剪预览，可使用下方数值调整裁剪范围');
    cropStage.append(cropPreview);
    const cropFields = el('div', 'ic-field-grid ic-crop-fields'), cropInputs = {};
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    for (const [key,label] of [['x','裁剪 X / px'],['y','裁剪 Y / px'],['width','裁剪宽度 / px'],['height','裁剪高度 / px']]) {
      const input = field(cropFields, label, 'number', {min:key === 'x' || key === 'y' ? 0 : 1,step:1});
      cropInputs[key] = input;
      input.addEventListener('change', () => {
        if (!editable() || !cropSession) return;
        const {bitmap,rect} = cropSession, value = Number(input.value);
        if (input.value.trim() && Number.isFinite(value)) {
          rect[key] = clamp(Math.round(value), Number(input.min), Number(input.max));
          rect.width = Math.min(rect.width, bitmap.width - rect.x);
          rect.height = Math.min(rect.height, bitmap.height - rect.y);
        }
        paintCrop();
      });
    }
    const cropNote = el('p', 'ic-hint'); cropNote.setAttribute('role', 'status');
    const cropActions = el('div', 'ic-crop-actions');
    button(cropActions, '恢复原图', () => {
      if (!cropSession) return;
      const {bitmap} = cropSession;
      cropSession.rect = {x:0,y:0,width:bitmap.width,height:bitmap.height}; paintCrop();
    });
    const cropCancel = el('button', 'ic-button', '取消裁剪'); cropCancel.type = 'button'; cropCancel.dataset.composerAction = 'cancel-crop';
    cropCancel.addEventListener('click', cancelCrop); cropActions.append(cropCancel);
    button(cropActions, '应用裁剪', applyCrop, 'ic-primary');
    cropDialog.append(cropTitle, cropHint, cropStage, cropFields, cropNote, cropActions); dialog.append(cropDialog);
    cropDialog.addEventListener('cancel', event => { event.preventDefault(); event.stopPropagation(); cancelCrop(); });
    cropDialog.addEventListener('keydown', event => event.stopPropagation());
    function cancelCrop() {
      cropSession = null; cropDialog.close(); cropPreview.width = cropPreview.height = 0;
      cropButton.focus({preventScroll:true});
    }
    function beginCrop() {
      const layer = selectedLayer();
      if (!layer || layer.locked) return;
      const bitmap = images.get(mediaURL(layer.asset.url));
      cropSession = {id:layer.id,bitmap,rect:{...imageCrop(layer)},drag:null};
      const scale = Math.min(720 / bitmap.width, 420 / bitmap.height);
      cropPreview.width = Math.max(1, Math.round(bitmap.width * scale));
      cropPreview.height = Math.max(1, Math.round(bitmap.height * scale));
      paintCrop(); cropDialog.showModal(); cropCancel.focus();
    }
    function cropHandles(rect) {
      return [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]].map(([fx,fy]) =>
        ({fx,fy,x:rect.x + (fx + 1) * rect.width / 2,y:rect.y + (fy + 1) * rect.height / 2}));
    }
    function paintCrop() {
      if (!cropSession) return;
      const {bitmap,rect} = cropSession, ctx = cropPreview.getContext('2d');
      const sx = cropPreview.width / bitmap.width, sy = cropPreview.height / bitmap.height;
      const x = rect.x * sx, y = rect.y * sy, w = rect.width * sx, h = rect.height * sy;
      ctx.clearRect(0,0,cropPreview.width,cropPreview.height);
      ctx.drawImage(bitmap,0,0,cropPreview.width,cropPreview.height);
      ctx.fillStyle = '#000a'; ctx.beginPath(); ctx.rect(0,0,cropPreview.width,cropPreview.height); ctx.rect(x,y,w,h); ctx.fill('evenodd');
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(x,y,w,h);
      ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 1; ctx.beginPath();
      for (const part of [1/3,2/3]) { ctx.moveTo(x + w * part,y); ctx.lineTo(x + w * part,y + h); ctx.moveTo(x,y + h * part); ctx.lineTo(x + w,y + h * part); }
      ctx.stroke(); ctx.fillStyle = '#ffffff';
      for (const handle of cropHandles(rect)) ctx.fillRect(handle.x * sx - 4,handle.y * sy - 4,8,8);
      for (const [key,input] of Object.entries(cropInputs)) {
        input.max = key === 'x' ? bitmap.width - 1 : key === 'y' ? bitmap.height - 1 : key === 'width' ? bitmap.width - rect.x : bitmap.height - rect.y;
        input.value = rect[key];
      }
      cropNote.textContent = `原图 ${bitmap.width} × ${bitmap.height} px · 保留 ${rect.width} × ${rect.height} px`;
    }
    function cropPoint(event) {
      const bounds = cropPreview.getBoundingClientRect(), {bitmap} = cropSession;
      return {x:clamp(Math.round((event.clientX - bounds.left) * bitmap.width / bounds.width),0,bitmap.width),
        y:clamp(Math.round((event.clientY - bounds.top) * bitmap.height / bounds.height),0,bitmap.height)};
    }
    function cropHit(point) {
      const {rect,bitmap} = cropSession, bounds = cropPreview.getBoundingClientRect();
      const handles = cropHandles(rect).map(handle => ({...handle,distance:Math.hypot((point.x - handle.x) * bounds.width / bitmap.width,(point.y - handle.y) * bounds.height / bitmap.height)}));
      const nearest = handles.sort((a,b) => a.distance - b.distance)[0];
      if (nearest.distance <= 14) return nearest;
      return point.x > rect.x && point.x < rect.x + rect.width && point.y > rect.y && point.y < rect.y + rect.height ? 'move' : 'new';
    }
    cropPreview.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !editable() || !cropSession || cropSession.drag) return;
      event.preventDefault();
      const point = cropPoint(event), mode = cropHit(point), {bitmap} = cropSession;
      if (mode === 'new') { point.x = Math.min(point.x,bitmap.width - 1); point.y = Math.min(point.y,bitmap.height - 1); }
      cropSession.drag = {pointerId:event.pointerId,point,mode,before:{...cropSession.rect}};
      cropPreview.setPointerCapture(event.pointerId);
    });
    cropPreview.addEventListener('pointermove', event => {
      if (!cropSession || !editable()) return;
      const point = cropPoint(event), {drag,bitmap} = cropSession;
      if (!drag) {
        const hit = cropHit(point);
        cropPreview.style.cursor = typeof hit === 'string' ? hit === 'move' ? 'move' : 'crosshair' : hit.fx === 0 ? 'ns-resize' : hit.fy === 0 ? 'ew-resize' : hit.fx === hit.fy ? 'nwse-resize' : 'nesw-resize';
        return;
      }
      if (drag.pointerId !== event.pointerId) return;
      event.preventDefault();
      const {before,mode} = drag, dx = point.x - drag.point.x, dy = point.y - drag.point.y;
      if (mode === 'move') cropSession.rect = {...before,x:clamp(before.x + dx,0,bitmap.width - before.width),y:clamp(before.y + dy,0,bitmap.height - before.height)};
      else if (mode === 'new') cropSession.rect = {x:Math.min(point.x,drag.point.x),y:Math.min(point.y,drag.point.y),width:Math.max(1,Math.abs(dx)),height:Math.max(1,Math.abs(dy))};
      else {
        let x = before.x, y = before.y, right = x + before.width, bottom = y + before.height;
        if (mode.fx < 0) x = clamp(x + dx,0,right - 1);
        if (mode.fx > 0) right = clamp(right + dx,x + 1,bitmap.width);
        if (mode.fy < 0) y = clamp(y + dy,0,bottom - 1);
        if (mode.fy > 0) bottom = clamp(bottom + dy,y + 1,bitmap.height);
        cropSession.rect = {x,y,width:right - x,height:bottom - y};
      }
      paintCrop();
    });
    cropPreview.addEventListener('lostpointercapture', () => { if (cropSession) cropSession.drag = null; });
    function applyCrop() {
      if (!cropSession) return;
      const {id,bitmap,rect} = cropSession;
      const applied = change(() => {
        const layer = selectedLayer();
        if (!layer || layer.id !== id || layer.locked) throw new Error('所选图层已变化，请重新打开裁剪。');
        const previous = imageCrop(layer), sx = layer.width / previous.width, sy = layer.height / previous.height;
        const dx = (rect.x - previous.x) * sx, dy = (rect.y - previous.y) * sy, angle = layer.angle * Math.PI / 180;
        // Preserve each retained source pixel's canvas position, including rotated/non-uniformly scaled layers.
        layer.x += dx * Math.cos(angle) - dy * Math.sin(angle);
        layer.y += dx * Math.sin(angle) + dy * Math.cos(angle);
        layer.width = rect.width * sx; layer.height = rect.height * sy;
        if (rect.x === 0 && rect.y === 0 && rect.width === bitmap.width && rect.height === bitmap.height) delete layer.crop;
        else layer.crop = {...rect};
      });
      if (applied) cancelCrop();
      else cropNote.textContent = errorBox.textContent;
    }
    nameInput.addEventListener('change', () => change(() => { const layer = selectedLayer(); if (layer && !layer.locked) layer.name = nameInput.value || '图片'; }));
    right.append(el('p', 'ic-hint', 'X / Y 是图片未旋转时的左上角原点。锁定图层后，需先解锁才能修改属性或在画布移动。'));
    const saveButton = button(footer, '保存编辑稿', save, 'ic-primary');
    const exportButton = button(footer, '合成 PNG', exportPNG, 'ic-primary');
    function updateUI() {
      if (!model || dead) { refreshPermission(); return; }
      const layer = selectedLayer();
      cw.value = model.width; ch.value = model.height;
      transparent.checked = model.background === 'transparent';
      if (!transparent.checked) background.value = model.background;
      nameInput.value = layer?.name || '';
      nameInput.dataset.inactive = !layer || layer.locked ? '1' : '0';
      cropButton.dataset.inactive = !layer || layer.locked ? '1' : '0';
      for (const [key,input] of Object.entries(fields)) {
        input.value = layer ? String(Math.round(layer[key] * (key === 'opacity' ? 100 : 1) * 1000) / 1000) : '';
        input.dataset.inactive = !layer || layer.locked ? '1' : '0';
      }
      undoButton.dataset.inactive = historyIndex <= 0 ? '1' : '0';
      redoButton.dataset.inactive = historyIndex >= history.length - 1 ? '1' : '0';
      for (const b of layerButtons) b.dataset.inactive = !layer || layer.locked ? '1' : '0';
      uploadButton.dataset.inactive = typeof upload !== 'function' ? '1' : '0';
      saveButton.dataset.inactive = typeof onSave !== 'function' ? '1' : '0';
      exportButton.dataset.inactive = typeof onExport !== 'function' ? '1' : '0';
      title.textContent = `图片合成${JSON.stringify(model) !== dirtyBase ? ' · 未保存' : ''}`;
      const restoreCanvasFocus = layerList.contains(document.activeElement);
      layerList.replaceChildren();
      if (!model.layers.length) layerList.append(el('p', 'ic-empty', '尚无图层。上传图片，或从下方画布素材中选择添加。'));
      for (const item of [...model.layers].reverse()) {
        const row = el('div', `ic-layer${selected === item.id ? ' is-selected' : ''}`);
        row.draggable = !busy && allowed(); row.dataset.layerId = item.id;
        const filename = assetName(item.asset);
        const select = el('button', 'ic-layer-name'); select.type = 'button'; select.title = filename; select.dataset.layerAction = 'select';
        select.append(thumbnail(item.asset, item.crop), el('span', 'ic-asset-name', filename));
        select.setAttribute('aria-pressed', String(selected === item.id)); select.disabled = busy || !allowed();
        select.addEventListener('click', () => {
          if (!editable()) return;
          selected = item.id; refreshing = true; canvas.discardActiveObject();
          if (!item.locked && item.visible) canvas.setActiveObject(objectMap.get(item.id));
          refreshing = false; canvas.requestRenderAll(); updateUI();
        });
        const visible = el('button', 'ic-layer-toggle', item.visible ? '隐藏' : '显示'); visible.type = 'button';
        visible.setAttribute('aria-label', `${item.visible ? '隐藏' : '显示'} ${item.name}`);
        visible.setAttribute('aria-pressed', String(item.visible)); visible.dataset.layerAction = 'visible'; visible.title = visible.getAttribute('aria-label');
        const lock = el('button', 'ic-layer-toggle', item.locked ? '解锁' : '锁定'); lock.type = 'button';
        lock.setAttribute('aria-label', `${item.locked ? '解锁' : '锁定'} ${item.name}`);
        lock.setAttribute('aria-pressed', String(item.locked)); lock.dataset.layerAction = 'lock'; lock.title = lock.getAttribute('aria-label');
        visible.disabled = lock.disabled = busy || !allowed();
        visible.addEventListener('click', () => change(() => { item.visible = !item.visible; }));
        lock.addEventListener('click', () => change(() => { item.locked = !item.locked; }));
        row.addEventListener('dragstart', event => {
          if (!editable()) { event.preventDefault(); return; }
          dragId = item.id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-chouka-layer', item.id);
        });
        row.addEventListener('dragover', event => { if (dragId && editable()) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; row.classList.add('is-dragover'); } });
        row.addEventListener('dragleave', () => row.classList.remove('is-dragover'));
        row.addEventListener('dragend', () => { dragId = null; row.classList.remove('is-dragover'); });
        row.addEventListener('drop', event => {
          if (!dragId) return;
          event.preventDefault(); event.stopPropagation(); const moving = dragId; dragId = null;
          change(() => {
            const target = model.layers.findIndex(l => l.id === item.id), from = model.layers.findIndex(l => l.id === moving);
            if (from < 0 || target < 0 || from === target) return;
            const [movingLayer] = model.layers.splice(from,1); model.layers.splice(target,0,movingLayer); selected = moving;
          });
        });
        const controls = el('div', 'ic-layer-controls'); controls.append(visible,lock);
        row.append(select,controls); layerList.append(row);
      }
      refreshPermission();
      if (restoreCanvasFocus && !busy) canvas?.upperCanvasEl.focus({preventScroll:true});
    }
    async function appendAssets(assets, linkedSeen) {
      if (model.layers.length + assets.length > MAX_LAYERS) throw new Error('最多添加 100 个图层。');
      const added = [];
      for (const value of assets) {
        if (!allowed()) throw new Error('编辑权限已失效，未添加图片。');
        const asset = assetJSON(value), bitmap = await getImage(asset);
        if (!allowed()) throw new Error('编辑权限已失效，未添加图片。');
        const scale = Math.max(1 / Math.min(bitmap.width,bitmap.height), Math.min(1, model.width / bitmap.width, model.height / bitmap.height));
        added.push({id:uid(), name:assetName(asset), asset, x:0, y:0, width:bitmap.width * scale, height:bitmap.height * scale, angle:0, opacity:1, visible:true, locked:false});
      }
      if (!allowed()) throw new Error('编辑权限已失效，未添加图片。');
      model = normalize({...model, ...(linkedSeen ? {linkedSources:linkedSeen} : {}), layers:model.layers.concat(added)});
      selected = added.at(-1)?.id || selected; rebuild(); checkpoint();
    }
    async function appendLinkedSources() {
      if (!Array.isArray(linkedSources) || linkedSources.length > MAX_LINKED_IDENTITIES) throw new Error('已连接图片列表无效或过多（最多 512 项）。');
      if (!linkedSources.length) return;
      const seen = new Set(model.linkedSources || []), known = new Set(seen), represented = new Set(), pending = [];
      for (const layer of model.layers) for (const key of assetIdentities(layer.asset)) represented.add(key);
      for (const value of linkedSources) {
        const asset = assetJSON(value), keys = assetIdentities(asset);
        if (keys.some(key => known.has(key) || represented.has(key))) for (const key of keys) known.add(key);
        if (!keys.some(key => seen.has(key) || represented.has(key))) pending.push(asset);
        for (const key of keys) seen.add(key);
        if (seen.size > MAX_LINKED_IDENTITIES) throw new Error('已连接图片记录已达 512 条上限，请使用“添加图片”手动添加新素材。');
      }
      if (!allowed()) throw new Error('编辑权限已失效，未添加图片。');
      if (known.size !== (model.linkedSources || []).length) {
        // Remember matching legacy layers even if a different linked image fails to load.
        model = normalize({...model, linkedSources:[...known]}); checkpoint();
      }
      // Commit new imports and their identities together; failed loads keep existing layers intact.
      await appendAssets(pending, [...seen]);
    }
    async function validateFile(file) {
      if (!/^image\/(png|jpeg|webp|gif|bmp|x-ms-bmp)$/i.test(file.type) || !file.size || file.size > MAX_BYTES) throw new Error(`${file.name || '粘贴文件'}：仅支持常见位图格式，且文件需在 64 MiB 以内。`);
      await inspectImage(file);
      const bitmap = await createImageBitmap(file);
      try { assertSize(bitmap.width, bitmap.height); }
      finally { bitmap.close(); }
    }
    function importFiles(list) {
      const files = Array.from(list || []);
      if (!files.length) return;
      return run('正在检查和上传图片，请勿关闭…', async () => {
        if (typeof upload !== 'function') throw new Error('尚未配置图片上传回调。');
        if (model.layers.length + files.length > MAX_LAYERS) throw new Error('最多添加 100 个图层。');
        // Decode every file before uploading anything; do not upload disguised or oversized images.
        for (const file of files) await validateFile(file);
        const assets = [];
        for (const file of files) {
          if (!allowed()) throw new Error('编辑权限已失效，已停止上传。');
          const asset = await upload(file);
          if (!allowed()) throw new Error('编辑权限已失效，未采用晚到的上传结果。');
          assets.push(assetJSON(asset));
        }
        await appendAssets(assets);
      });
    }
    fileInput.addEventListener('change', () => { const files = Array.from(fileInput.files); fileInput.value = ''; importFiles(files); });
    dialog.addEventListener('paste', event => {
      event.stopPropagation();
      if (event.target.closest('input,textarea,[contenteditable="true"]')) return;
      const files = Array.from(event.clipboardData?.files || []);
      if (files.length) { event.preventDefault(); importFiles(files); }
    });
    dialog.addEventListener('dragover', event => {
      event.stopPropagation();
      if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); event.dataTransfer.dropEffect = busy || !allowed() ? 'none' : 'copy'; }
    });
    dialog.addEventListener('drop', event => {
      event.stopPropagation(); event.preventDefault();
      if (event.dataTransfer.files.length) importFiles(event.dataTransfer.files);
    });
    dialog.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.target.closest('input,textarea,select,[contenteditable="true"]') || event.isComposing) return;
      const command = event.ctrlKey || event.metaKey, key = event.key.toLowerCase();
      if (command && (key === 'z' || key === 'y')) {
        event.preventDefault(); if (editable()) travel(key === 'y' || event.shiftKey ? 1 : -1); return;
      }
      if (key === 'delete' || key === 'backspace') {
        event.preventDefault(); if (selectedLayer() && !selectedLayer().locked) change(() => { model.layers = model.layers.filter(l => l.id !== selected); selected = null; }); return;
      }
      const delta = {ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1]}[event.key];
      if (delta) {
        event.preventDefault();
        if (selectedLayer() && !selectedLayer().locked) change(() => { const layer = selectedLayer(), step = event.shiftKey ? 10 : 1; layer.x += delta[0] * step; layer.y += delta[1] * step; });
      }
    });
    for (const name of ['keyup','keypress','copy','cut','pointerdown','pointerup','click','dblclick','wheel']) dialog.addEventListener(name, event => event.stopPropagation());
    async function save() {
      await run('正在保存编辑稿，请勿关闭…', async () => {
        const snapshot = normalize(model);
        if (!allowed()) throw new Error('编辑权限已失效，未保存。');
        await onSave(copy(snapshot));
        if (allowed()) dirtyBase = JSON.stringify(snapshot);
      });
    }
    async function exportPNG() {
      await run('正在合成原尺寸 PNG，请勿关闭…', async () => {
        const snapshot = normalize(model), outputElement = document.createElement('canvas');
        let output;
        try {
          output = new (f().StaticCanvas)(outputElement, {width:snapshot.width,height:snapshot.height,enableRetinaScaling:false,renderOnAddRemove:false,backgroundColor:snapshot.background === 'transparent' ? '' : snapshot.background});
          for (const layer of snapshot.layers) if (layer.visible) output.add(makeObject(layer));
          output.renderAll();
          const blob = await new Promise((resolve,reject) => outputElement.toBlob(value => value ? resolve(value) : reject(new Error('PNG 编码失败，可能内存不足。')), 'image/png'));
          if (!allowed()) throw new Error('编辑权限已失效，未提交合成结果。');
          // Integration contract: resolve only after persisting both the PNG and this draft.
          await onExport(blob, copy(snapshot));
          dirtyBase = JSON.stringify(snapshot);
        } finally {
          try { if (output) await output.dispose(); }
          finally { outputElement.width = outputElement.height = 0; }
        }
      });
    }
    async function close() {
      if (dead || busy) return false;
      if (model && JSON.stringify(model) !== dirtyBase && !window.confirm('编辑稿有未保存的更改，确定关闭并放弃这些更改吗？')) return false;
      dead = true; abort.abort(); observer?.disconnect(); clearInterval(permissionTimer);
      if (dialog.open) dialog.close();
      try { if (canvas) await canvas.dispose(); }
      catch (error) { console.error('[图片合成] 画布释放失败', error); }
      finally {
        for (const bitmap of images.values()) bitmap.close();
        images.clear(); objectMap.clear(); history.length = 0; dialog.remove();
        if (previousFocus?.isConnected) previousFocus.focus({preventScroll:true});
      }
      return true;
    }
    closeButton.addEventListener('click', close);
    dialog.addEventListener('cancel', event => { event.preventDefault(); event.stopPropagation(); close(); });
    dialog.showModal(); closeButton.focus();
    async function initialize() {
      if (busy || dead) return;
      busy = true; ready = false; clearError(); retryButton.hidden = true;
      status.textContent = '正在载入图片合成器…'; refreshPermission();
      try {
        await loadDependencies();
        if (!canvas) {
          canvas = new (f().Canvas)(canvasElement, {enableRetinaScaling:false,selection:false,preserveObjectStacking:true,uniformScaling:true,uniScaleKey:null,renderOnAddRemove:false});
          canvas.upperCanvasEl.tabIndex = 0;
          canvas.upperCanvasEl.setAttribute('aria-label', '图片合成编辑画布，使用方向键移动所选图层');
          canvas.on('mouse:down', () => { if (!busy && allowed()) canvas.upperCanvasEl.focus({preventScroll:true}); });
          canvas.on('selection:created', event => { if (!refreshing && !busy && allowed()) { selected = event.selected?.[0]?.composerId || null; updateUI(); } });
          canvas.on('selection:updated', event => { if (!refreshing && !busy && allowed()) { selected = event.selected?.[0]?.composerId || null; updateUI(); } });
          canvas.on('selection:cleared', () => { if (!refreshing && !busy && allowed()) { selected = null; updateUI(); } });
          canvas.on('object:modified', event => {
            if (refreshing) return;
            if (!editable()) { rebuild(); return; }
            const object = event.target, layer = model.layers.find(l => l.id === object?.composerId);
            if (!layer || layer.locked) { rebuild(); return; }
            const before = copy(model);
            try {
              Object.assign(layer, {x:object.left,y:object.top,width:object.width * object.scaleX,height:object.height * object.scaleY,angle:object.angle});
              model = normalize(model); checkpoint();
            } catch (error) { model = before; rebuild(); showError(error); }
          });
        }
        if (!model) {
          const initial = normalize(state);
          for (const layer of initial.layers) {
            if (!allowed()) throw new Error('只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。');
            await getImage(layer.asset);
          }
          if (!allowed()) throw new Error('只读：当前没有编辑权限，或原工具卡已失效。仅可关闭。');
          model = initial; dirtyBase = JSON.stringify(model);
          history = []; historyIndex = -1; rebuild(); checkpoint();
        }
        ready = true;
        try { await appendLinkedSources(); }
        catch (error) { showError(error); retryButton.hidden = false; }
        sourceList.replaceChildren();
        for (const source of sources) {
          try {
            const asset = assetJSON(source), name = assetName(asset);
            const add = button(sourceList, '', () => run('正在添加画布图片…', () => appendAssets([asset])));
            add.title = name; add.setAttribute('aria-label', `添加 ${name}`);
            add.append(thumbnail(asset), el('span', 'ic-asset-name', name));
          } catch (error) { showError(error); }
        }
        if (!sources.length) sourceList.append(el('p', 'ic-hint', '当前画布没有可用的图片素材。'));
        observer?.disconnect(); observer = new ResizeObserver(resizeView); observer.observe(viewport);
      } catch (error) {
        showError(error); ready = false; retryButton.hidden = false;
      } finally {
        busy = false;
        status.textContent = errorBox.hidden ? '就绪 · 添加图片开始合成' : '载入存在问题，请检查提示；可重试载入或关闭。';
        updateUI();
      }
    }
    retryButton.addEventListener('click', () => { if (allowed()) initialize(); });
    permissionTimer = setInterval(refreshPermission, 500);
    await initialize();
    return {close};
  }
  window.ChoukaImageComposer = {open};
})();
