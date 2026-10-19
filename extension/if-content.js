(() => {
  if (window !== window.top) return;
  const LIMIT = 128 * 1024 * 1024;
  const CHUNK = 48 * 1024;
  const extensions = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp',
    'image/gif': 'gif', 'image/bmp': 'bmp', 'video/mp4': 'mp4',
    'video/webm': 'webm', 'video/quicktime': 'mov', 'video/x-matroska': 'mkv',
    'video/x-msvideo': 'avi',
  };
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;z-index:2147483647;display:none;pointer-events:none;';
  const shadow = host.attachShadow({mode: 'closed'});
  const action = document.createElement('button');
  action.type = 'button';
  action.textContent = '加入 Chouka 画布';
  action.setAttribute('aria-label', '将当前 IF Studio 图片或视频加入 Chouka 画布');
  action.style.cssText = 'all:initial;display:block;box-sizing:border-box;min-height:44px;padding:9px 14px;border:1px solid #75d0f4;border-radius:8px;background:#18374b;color:#fff;font:600 14px/1.4 system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 18px #0009;pointer-events:auto;';
  shadow.append(action);
  document.documentElement.append(host);
  let active = null;
  let busy = false;

  function update(target) {
    if (busy) return;
    if (!(target instanceof HTMLImageElement || target instanceof HTMLVideoElement)) {
      host.style.display = 'none'; active = null; return;
    }
    const bounds = target.getBoundingClientRect();
    if (bounds.width < 120 || bounds.height < 80 || bounds.bottom < 0 || bounds.top > innerHeight) {
      host.style.display = 'none'; active = null; return;
    }
    active = target;
    host.style.left = `${Math.max(8, Math.min(innerWidth - 190, bounds.right - 180))}px`;
    host.style.top = `${Math.max(8, Math.min(innerHeight - 52, bounds.bottom - 52))}px`;
    host.style.display = 'block';
  }

  document.addEventListener('mousemove', event => {
    if (event.composedPath().includes(host)) return;
    update(event.target.closest?.('img,video'));
  }, {passive: true});
  document.addEventListener('scroll', () => { if (active) update(active); }, {passive: true, capture: true});
  window.addEventListener('resize', () => { if (active) update(active); });

  async function send(message) {
    const reply = await chrome.runtime.sendMessage(message);
    if (!reply?.ok) throw new Error(reply?.error || '插件通信失败');
  }

  action.addEventListener('click', async () => {
    const media = active;
    if (!media || busy) return;
    busy = true;
    action.textContent = '正在读取素材…';
    action.disabled = true;
    const id = crypto.randomUUID();
    let started = false;
    try {
      const source = media.currentSrc || media.src;
      if (!source) throw new Error('没有可读取的图片或视频地址');
      const url = new URL(source, location.href);
      if (url.protocol !== 'https:' && !(url.protocol === 'blob:' && url.origin === 'https://ifs.alibaba-inc.com')) {
        throw new Error('不支持读取该素材地址，请先下载后手动导入。');
      }
      const kind = media instanceof HTMLVideoElement ? 'video' : 'image';
      const response = await fetch(url.href, {credentials: url.origin === 'https://ifs.alibaba-inc.com' ? 'include' : 'omit'});
      if (!response.ok || !response.body) throw new Error(`无法读取素材（${response.status}），请下载后手动导入。`);
      const mime = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
      if (mime && mime !== 'application/octet-stream' && !mime.startsWith(`${kind}/`)) {
        throw new Error('返回的不是图片或视频文件，请下载后手动导入。');
      }
      let name = url.protocol === 'blob:' ? '' : url.pathname.split('/').pop().split('?')[0];
      try { name = decodeURIComponent(name); } catch { name = ''; }
      const allowed = kind === 'image' ? /\.(png|jpe?g|webp|gif|bmp)$/i : /\.(mp4|webm|mkv|mov|avi)$/i;
      if (!allowed.test(name)) name = `IF Studio ${kind === 'image' ? '图片' : '视频'}.${extensions[mime] || (kind === 'image' ? 'png' : 'mp4')}`;
      const expected = Number(response.headers.get('content-length')) || 0;
      if (expected > LIMIT) throw new Error('素材超过 128 MB，请下载后手动导入。');
      await send({type: 'begin', id, kind, name, size: expected});
      started = true;
      const reader = response.body.getReader();
      let total = 0;
      for (;;) {
        const {value, done} = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > LIMIT) {
          await reader.cancel();
          throw new Error('素材超过 128 MB，请下载后手动导入。');
        }
        for (let offset = 0; offset < value.byteLength; offset += CHUNK) {
          const bytes = value.subarray(offset, offset + CHUNK);
          await send({type: 'chunk', id, data: btoa(String.fromCharCode(...bytes))});
        }
        action.textContent = `正在传输 ${Math.round(total / 1024 / 1024)} MB…`;
      }
      if (!total) throw new Error('素材文件为空');
      await send({type: 'end', id, size: total});
      started = false;
      action.textContent = '已发送，请在 Chouka 确认';
    } catch (error) {
      if (started) await chrome.runtime.sendMessage({type: 'abort', id}).catch(() => {});
      action.textContent = error.message;
      action.style.maxWidth = 'min(320px, 90vw)';
      action.style.whiteSpace = 'normal';
    } finally {
      busy = false;
      action.disabled = false;
      setTimeout(() => {
        action.textContent = '加入 Chouka 画布';
        action.style.maxWidth = '';
        action.style.whiteSpace = '';
      }, 5000);
    }
  });
})();
