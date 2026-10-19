const CHOUKA_PAGE = 'http://127.0.0.1:8201/if-studio?extension=1';
const IF_ORIGIN = 'https://ifs.alibaba-inc.com';
const MAX_BYTES = 128 * 1024 * 1024;
const transfers = new Map();

async function waitForReceiver(tabId) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const reply = await chrome.tabs.sendMessage(tabId, {type: 'ping'});
      if (reply?.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('Chouka 测试服务未就绪，请确认 8201 端口正在运行。');
}

async function relay(message, sender) {
  const from = sender.tab?.url;
  if (sender.frameId !== 0 || !from || new URL(from).origin !== IF_ORIGIN) {
    throw new Error('仅允许 IF Studio 顶层页面发起素材传输');
  }
  const id = message.id;
  if (typeof id !== 'string' || !/^[a-f\d-]{36}$/i.test(id)) throw new Error('无效传输编号');

  if (message.type === 'begin') {
    if (transfers.has(id)) throw new Error('素材传输已存在');
    if (!['image', 'video'].includes(message.kind)
        || !Number.isSafeInteger(message.size) || message.size < 0 || message.size > MAX_BYTES
        || typeof message.name !== 'string' || message.name.length > 200) {
      throw new Error('仅支持 128 MB 以内的图片或视频；较大文件请下载后手动导入。');
    }
    const tab = await chrome.tabs.create({url: CHOUKA_PAGE, active: false});
    try {
      await waitForReceiver(tab.id);
      const reply = await chrome.tabs.sendMessage(tab.id, {
        type: 'begin', id, kind: message.kind, name: message.name, size: message.size,
      });
      if (!reply?.ok) throw new Error(reply?.error || 'Chouka 页面拒绝接收素材');
      transfers.set(id, {source: sender.tab.id, target: tab.id});
      return {ok: true};
    } catch (error) {
      await chrome.tabs.remove(tab.id).catch(() => {});
      throw error;
    }
  }

  const transfer = transfers.get(id);
  if (!transfer || transfer.source !== sender.tab.id) throw new Error('传输已失效，请重新选择素材');
  const target = await chrome.tabs.get(transfer.target);
  if (!target.url?.startsWith('http://127.0.0.1:8201/if-studio')) {
    transfers.delete(id);
    throw new Error('Chouka 页面已离开导入页');
  }
  try {
    if (message.type === 'chunk' && (typeof message.data !== 'string' || message.data.length > 90000)) {
      throw new Error('素材块不正确');
    }
    if (!['chunk', 'end', 'abort'].includes(message.type)) throw new Error('未知传输动作');
    const reply = await chrome.tabs.sendMessage(transfer.target, message);
    if (!reply?.ok) throw new Error(reply?.error || '接收素材失败');
    if (message.type === 'end') {
      transfers.delete(id);
      await chrome.tabs.update(transfer.target, {active: true});
    }
    if (message.type === 'abort') transfers.delete(id);
    return {ok: true};
  } catch (error) {
    transfers.delete(id);
    chrome.tabs.sendMessage(transfer.target, {type: 'abort', id}).catch(() => {});
    throw error;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  relay(message, sender).then(sendResponse, error => sendResponse({ok: false, error: error.message}));
  return true;
});
