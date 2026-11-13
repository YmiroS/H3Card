// 云端两条入口（看图分析灯光 / 人物分区图校正站位）共用的交互壳。
// 这里只管三件事：发之前问一句要不要计费、进行中还差几步、失败后把原因留在页面上。
// 请求本身仍由各入口自己发（登录态和 CSRF 都在外壳那一侧），本模块不碰网络。

export const DEADLINE_SECONDS = { light: 70, pose: 120 };

// 确认条没人应答时不能把入口按钮永久按住：60 秒自动取消（不发请求、不计费）。
export const ASK_TIMEOUT_SECONDS = 60;

// 同一时刻只允许一条活动流：确认条/步骤条堆在面板上会互相压字，也让人分不清谁在跑。
let activeFlow = null;

const COPY = {
  light: {
    ask: '云端看图分析要调用大模型，发一次计费一次。',
    range: '10–60 秒',
    detail: (s) =>
      '原图压缩后发给大模型判断光位，预计 ' + s + '返回。超时只会停止等待，服务端那一发可能仍在完成并计费，所以不会自动重试，要重试请手动再点一次。',
    go: '确认并分析（计费一次）',
    ghost: '先不用（改用本地等效拟合）',
    steps: ['发送云端看图请求', '折算灯位并写入场景'],
    degrade: '改用本地等效拟合',
  },
  pose: {
    ask: '云端校正站位要调用生图大模型，发一次计费一次。',
    range: '30–120 秒',
    detail: (s) =>
      '整张照片发给大模型重绘成人物分区图，那一发预计 ' + s + '返回，本地拆蒙版与识别另计。超时只会停止等待，服务端那一发可能仍在完成并计费，所以不会自动重试，要重试请手动再点一次。',
    go: '确认并校正（计费一次）',
    ghost: '先不用（保留本地摆放）',
    steps: ['发送分区图请求', '本地拆蒙版与整图识别', '按色块分配身份', '按深度重排前后与落地'],
    degrade: '保留本地摆放',
  },
};

// 本地那条不花钱，只借步骤条和计时，确认环节直接跳过。
// 步骤按代码里真正能分出的界画：模型下载和识别都在 detectPose 一次 await 里，不拆成两步骗人。
export const LOCAL_STEPS = {
  pose: ['加载模型并识别关键点', '逐人估姿态与定深', '落地校正与关节校准'],
};

// 正式线默认第一步就是「云端先把人拆出来」：这一步失败后面都跑不了，所以确认条要说明白
// 它买的是人物提取、降级只能退回不花钱但容易串人的本地整图识别。
export const EXTRACT_OVERRIDES = {
  ask: '先让云端大模型把图里的人拆出来，发一次计费一次。',
  detail:
    '整张照片发给大模型重绘成人物分区图，那一发预计 30–120 秒返回；拆不出人就没办法逐人估姿势。' +
    '超时只会停止等待，服务端那一发可能仍在完成并计费，所以不会自动重试，要重试请手动再点一次。',
  go: '确认并提取（计费一次）',
  ghost: '先不用（改用本地识别）',
  steps: ['发送分区图请求', '按色块数出人物', '整图识别并按色块分配身份', '逐人估姿态与落地校正'],
  degrade: '改用本地识别（不花钱）',
};

export function elapsedText(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '未知时长';
  if (ms < 1000) return `${Math.round(ms)} 毫秒`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} 秒`;
  return `${Math.floor(ms / 60000)} 分 ${((ms % 60000) / 1000).toFixed(1)} 秒`;
}

// 预期区间的文案统一从这里出，避免面板写「10–60 秒」、提示词写「约 1 分钟」。
export function rangeText(kind) {
  return (COPY[kind] && COPY[kind].range) || '';
}

export function confirmCopy(kind, { range } = {}) {
  const copy = COPY[kind];
  if (!copy) return null;
  const seconds = range || copy.range;
  return {
    line: copy.ask,
    detail: copy.detail(seconds),
    go: copy.go,
    ghost: copy.ghost,
    seconds,
    actions: { retry: '重试（再计费一次）', degrade: copy.degrade },
  };
}

export function flowSteps(kind, { cloud = true } = {}) {
  if (!cloud) return (LOCAL_STEPS[kind] || []).slice();
  const copy = COPY[kind];
  return copy ? copy.steps.slice() : [];
}

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

// 步骤条：data-on 走过、data-current 正在走，绿点与琥珀点区分，不靠颜色单独表意（文字始终在）。
function Steps(list) {
  const ol = el('ol', 'flow-steps');
  ol.setAttribute('role', 'list');
  const items = list.map((label) => {
    const li = el('li', null, label);
    ol.append(li);
    return li;
  });
  return {
    ol,
    set(current) {
      items.forEach((li, i) => {
        if (i < current) {
          li.dataset.on = '';
          delete li.dataset.current;
        } else if (i === current) {
          li.dataset.current = '';
          delete li.dataset.on;
        } else {
          delete li.dataset.on;
          delete li.dataset.current;
        }
      });
    },
    all() {
      items.forEach((li) => {
        li.dataset.on = '';
        delete li.dataset.current;
      });
    },
  };
}

// free = 本地那条：不问计费、不显示降级按钮、也没有超时口径。
// overrides = 同一条云端通道在不同入口下的文案差异（默认第一步是「先拆人」，措辞和事后校正不一样）。
export function createCloudFlow({ kind, host, insertBefore, onDegrade, onAsk, free = false, overrides = null }) {
  const copy = confirmCopy(kind);
  if (copy && overrides) {
    // COPY 里那句问话叫 ask，渲染读的是 copy.line：不改名只会盖掉 detail/go/ghost，标题还挂着别种入口的话。
    const { ask, degrade, steps, ...rest } = overrides;
    Object.assign(copy, rest, ask ? { line: ask } : {});
    // 失败块里那颗降级按钮的文案走 actions.degrade；确认条上的「先不用」走 ghost。步骤条在上面单独建，不在 copy 里。
    if (degrade) Object.assign(copy.actions, { degrade });
  }
  const box = el('div', 'cloud-flow');
  box.hidden = true;
  box.setAttribute('aria-live', 'polite');

  const askBox = el('div', 'flow-ask');
  const text = el('span', 'flow-copy');
  // 行内只留一句问话，30–120 秒 / 超时不自动重试 / 那一发可能仍在计费 这些收进折叠块：
  // 259px 高的确认条插在 209px 宽的窄栏里，正文比问话还长，反而看不到在等什么。
  const more = el('details', 'flow-more');
  more.append(el('summary', null, '看详情'), el('small', null, copy ? copy.detail : ''));
  text.append(el('b', null, copy ? copy.line : ''), more);
  const goBtn = el('button', 'primary flow-go', copy ? copy.go : '确认并发送');
  const ghostBtn = el('button', 'flow-ghost', copy ? copy.ghost : '先不用');
  const rememberRow = el('label', 'check flow-remember');
  const rememberBox = document.createElement('input');
  rememberBox.type = 'checkbox';
  rememberRow.append(rememberBox, document.createTextNode('本次会话内不再询问'));
  askBox.append(text, goBtn, ghostBtn, rememberRow);

  const runBox = el('div', 'flow-run');
  const spin = el('i', 'flow-spin');
  spin.setAttribute('aria-hidden', 'true');
  const timer = el('span', 'flow-timer');
  let steps = Steps((overrides && overrides.steps) || flowSteps(kind, { cloud: !free }));
  runBox.append(spin, steps.ol, timer);

  const failBox = el('div', 'flow-fail');
  const failMsg = el('p', 'flow-fail-msg');
  const failDetail = el('p', 'flow-detail');
  const failRetry = el('button', 'flow-retry', free ? '重试（不花钱）' : copy ? copy.actions.retry : '重试');
  const failDegrade = el('button', 'flow-ghost', copy ? copy.actions.degrade : '改用本地');
  failDegrade.hidden = !onDegrade;
  const failActions = el('div', 'flow-actions');
  failActions.append(failRetry, failDegrade);
  failBox.append(failMsg, failDetail, failActions);

  box.append(askBox, runBox, failBox);
  if (insertBefore && insertBefore.parentNode === host) host.insertBefore(box, insertBefore);
  else if (host) host.append(box);

  let startedAt = 0;
  let ticker = null;
  let hideTimer = null;
  let askTimer = null;
  let resolveAsk = null;
  let retry = null;
  let remembered = false;
  let askedOnce = false;
  let timedOut = false;
  let state = 'idle';
  let shown = 'idle';
  let seq = 0;
  let currentRun = 0;

  // 落点每次现算：建壳时 #pose-status 还挂在扁平面板上，工作外壳随后才把它那一组搬进
  // 「自动识别」小节。照创建时的父节点插，确认条会留在面板顶部、离触发按钮约 600px，
  // 用户看到的就只有「按钮变灰、没别的反应」。
  const place = () => {
    const ref = typeof insertBefore === 'function' ? insertBefore() : insertBefore;
    const parent = ref && ref.parentNode;
    if (!parent) return;
    if (box.parentNode === parent && box.nextElementSibling === ref) return;
    parent.insertBefore(box, ref);
  };

  // 三态出现就得进视野，否则「有反馈」等于「没反馈」（窄栏要滚 673px 才看全）。
  const reveal = () => {
    const rect = box.getBoundingClientRect();
    if (rect.height <= 0) return;
    const view = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top >= 6 && rect.bottom <= view - 6) return;
    box.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const paint = () => {
    place();
    askBox.hidden = state !== 'ask';
    runBox.hidden = !(state === 'run' || state === 'done');
    failBox.hidden = state !== 'fail';
    spin.hidden = state !== 'run';
    box.hidden = state === 'idle';
    runBox.classList.toggle('is-done', state === 'done');
    if (state !== shown) {
      shown = state;
      if (state === 'ask' || state === 'run' || state === 'fail') reveal();
    }
  };

  const stop = () => {
    if (ticker) clearInterval(ticker);
    ticker = null;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
    if (askTimer) clearTimeout(askTimer);
    askTimer = null;
  };

  const claim = () => {
    if (activeFlow && activeFlow !== self) activeFlow.retire();
    activeFlow = self;
  };

  const release = () => {
    if (activeFlow === self) activeFlow = null;
  };

  const tick = () => {
    const ms = performance.now() - startedAt;
    const limit = free ? null : DEADLINE_SECONDS[kind];
    timer.textContent = `已等待 ${elapsedText(ms)}${Number.isFinite(limit) ? ` · 超过 ${limit} 秒停止等待` : ''}`;
    timer.classList.toggle('is-late', Number.isFinite(limit) && ms > limit * 1000 * 0.6);
  };

  const answer = (value) => {
    if (askTimer) clearTimeout(askTimer);
    askTimer = null;
    const done = resolveAsk;
    resolveAsk = null;
    if (done) done(value);
  };

  goBtn.onclick = () => {
    remembered = rememberBox.checked;
    answer(true);
  };
  ghostBtn.onclick = () => {
    state = 'idle';
    paint();
    answer(false);
  };
  // 勾选只对本次会话生效，关掉工作台就重新问，避免「上次勾过」变成永久扣费授权。
  rememberBox.onchange = () => {
    remembered = rememberBox.checked;
  };
  failRetry.onclick = () => {
    if (!retry) return;
    state = 'idle';
    paint();
    retry();
  };
  failDegrade.onclick = () => {
    state = 'idle';
    paint();
    if (onDegrade) onDegrade();
  };

  const self = {
    el: box,
    // 计费确认：没勾「不再询问」时把这一条摊开问一次；本地那条不花钱，直接放行。
    ask() {
      if (free || remembered) return Promise.resolve(true);
      claim();
      timedOut = false;
      // 这一条通道第一次问时把详情摊开（计费口径不能靠点开才看得到），之后默认折叠。
      more.open = !askedOnce;
      askedOnce = true;
      state = 'ask';
      paint();
      try { goBtn.focus({ preventScroll: true }); } catch { /* 老浏览器不认参数 */ }
      // 等待期间状态行不能空着：不写字就等于「点了没反应」。
      if (onAsk) onAsk();
      return new Promise((resolve) => {
        resolveAsk = resolve;
        askTimer = setTimeout(() => {
          // 没人应答就自己收摊：不发请求、不计费，入口按钮交还给用户。
          askTimer = null;
          timedOut = true;
          resolveAsk = null;
          state = 'idle';
          paint();
          release();
          resolve(false);
        }, ASK_TIMEOUT_SECONDS * 1000);
      });
    },
    askTimedOut: () => timedOut,
    retire() {
      if (state !== 'idle' && state !== 'done') self.hide();
    },
    start(labels) {
      claim();
      stop();
      if (Array.isArray(labels) && labels.length) {
        steps = new Steps(labels);
        runBox.replaceChildren(spin, steps.ol, timer);
      }
      startedAt = performance.now();
      currentRun = ++seq;
      state = 'run';
      paint();
      steps.set(0);
      tick();
      ticker = setInterval(tick, 250);
      return currentRun;
    },
    // 被新一次识别顶掉的旧流程只能收自己的那块：状态已经不是 run 就说明这一发已经出结果了。
    abandon(run) {
      if (run === currentRun && state === 'run') {
        stop();
        state = 'idle';
        paint();
        release();
      }
    },
    step(i) {
      steps.set(i);
    },
    // 成功只留一句「用时多少」，八秒后收起；细节由各入口写进自己的状态行。
    done(extra) {
      stop();
      release();
      steps.all();
      state = 'done';
      paint();
      timer.textContent = `用时 ${elapsedText(performance.now() - startedAt)}${extra ? ' · ' + extra : ''}`;
      hideTimer = setTimeout(() => {
        state = 'idle';
        paint();
      }, 8000);
    },
    // 失败必须留在页面上：一句话原因 + 能不能重试 + 重试要不要再花钱。
    fail(message, { detail, onRetry } = {}) {
      stop();
      retry = onRetry || null;
      failRetry.hidden = !retry;
      failMsg.textContent = message;
      failDetail.textContent =
        detail ||
        (free
          ? '当前摆放没有改动；重试不花钱，也可以改用「照片关键点校准」手动标点。'
          : '本次结果未应用；重试会再计费一次，改走本地那条不花钱。');
      state = 'fail';
      paint();
      release();
    },
    hide() {
      stop();
      state = 'idle';
      paint();
      release();
    },
    destroy() {
      stop();
      box.remove();
      release();
    },
  };
  return self;
}
