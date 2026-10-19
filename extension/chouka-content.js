(() => {
  if (window !== window.top || location.origin !== 'http://127.0.0.1:8201' || location.pathname !== '/if-studio') return;
  const LIMIT = 128 * 1024 * 1024;
  let incoming = null;

  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message.type === 'ping') { reply({ok: true}); return; }
    if (message.type === 'abort') {
      if (incoming?.id === message.id) incoming = null;
      reply({ok: true}); return;
    }
    try {
      if (message.type === 'begin') {
        if (incoming) throw new Error('已有素材正在接收');
        if (!['image', 'video'].includes(message.kind)
            || typeof message.name !== 'string' || message.name.length > 200
            || !Number.isSafeInteger(message.size) || message.size < 0 || message.size > LIMIT) {
          throw new Error('素材信息不正确');
        }
        incoming = {id: message.id, kind: message.kind, name: message.name, size: message.size, received: 0, chunks: []};
      } else if (message.type === 'chunk') {
        if (!incoming || incoming.id !== message.id || typeof message.data !== 'string' || message.data.length > 90000) {
          throw new Error('素材块不正确');
        }
        const binary = atob(message.data);
        incoming.received += binary.length;
        if (incoming.received > LIMIT || incoming.size && incoming.received > incoming.size) {
          throw new Error('素材超过允许大小');
        }
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
        incoming.chunks.push(bytes);
      } else if (message.type === 'end') {
        if (!incoming || incoming.id !== message.id || !incoming.received
            || incoming.size && incoming.received !== incoming.size
            || incoming.received !== message.size) {
          throw new Error('素材传输不完整');
        }
        const type = incoming.kind === 'image' ? 'image/png' : 'video/mp4';
        const file = new File(incoming.chunks, incoming.name, {type});
        incoming = null;
        window.postMessage({source: 'chouka-if-extension', type: 'file', file}, location.origin);
      } else throw new Error('未知传输动作');
      reply({ok: true});
    } catch (error) {
      incoming = null;
      reply({ok: false, error: error.message});
    }
  });
})();
