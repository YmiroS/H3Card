// ChouKa 精简入口：只加载摆人 / 摆光 / 导出所需模块，不加载时间轴、关键帧、资产导入、视频识别。
import * as T from 'three';
import { setupWorkspaceShell } from './workspace-shell.js?v=45';
import { setupLightingWorkspace } from './lighting-workspace.js?v=45';
import {
  lightingAPI,
  snapshot,
  prompt,
  specification,
  setGroundVisible,
  people,
  mediaAPI,
  lightsUpdate,
  shot,
  lightAnalysis,
  setDepthStatus,
  applySegmentLayer as poseApplySegmentLayer,
  segmentEditClosed as poseSegmentEditClosed,
} from './pose.js?v=46';

setupWorkspaceShell();
setupLightingWorkspace(lightingAPI);

const $ = (id) => document.getElementById(id);

// 精简：删掉用不到的节点（CSS 隐藏时间轴实测不生效，只能删节点）。
// 注意保留 #handoff：它是关闭态 dialog（不可见），但「同时应用动作/镜头」两个 checkbox 挂在里面，prompt() 依赖它们。
for (const id of ['scene-timeline', 'save-session', 'export']) {
  $(id)?.remove();
}
// 「载入工程」是 label 包 input 的按钮：只删 input 会留下一个点了没反应的假按钮，所以连壳一起去掉。
$('load-session')?.closest('label')?.remove();
for (const key of ['asset', 'help']) {
  $(`left-tab-${key}`)?.remove();
  $(`left-category-${key}`)?.remove();
}
document.body.classList.remove('has-timeline');

// ---- 控件精简 ----
// pose.js 在渲染循环和导出里按 id 反复读这些节点（show-points / mark-mode / body-scale / fit / gizmos …），
// 所以只能隐藏或搬家，不能 remove，否则自动识别与导出会抛错。
const trimStyle = document.createElement('style');
trimStyle.textContent =
  '.chouka-adv{border:1px dashed #43563d;border-radius:6px;padding:4px 8px;margin-top:8px}' +
  '.chouka-adv.inline{display:inline-flex;align-items:center;gap:8px;min-width:0;margin:0 0 0 6px}' +
  '.chouka-adv>summary{cursor:pointer;color:#9aa7b4;font-size:12px;letter-spacing:.04em;white-space:nowrap}' +
  '.chouka-adv-body{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding-top:6px}' +
  '.chouka-adv.inline>.chouka-adv-body{padding-top:0}' +
  // 窄屏时快捷键说明收成一行，完整内容靠悬浮查看（这段样式走 ?v= 的版本号，改完一定能生效）
  '@media(max-width:1000px){.bottom .maya-hint{max-width:100%!important;white-space:nowrap!important;overflow:hidden;text-overflow:ellipsis;cursor:help}}';
document.head.append(trimStyle);

function advancedGroup(container, label, { inline = false } = {}) {
  const box = document.createElement('details');
  box.className = inline ? 'chouka-adv inline' : 'chouka-adv';
  const summary = document.createElement('summary');
  summary.textContent = label;
  const body = document.createElement('div');
  body.className = 'chouka-adv-body';
  box.append(summary, body);
  container.append(box);
  return body;
}
function stash(body, ...nodes) {
  for (const node of nodes) if (node) body.append(node);
}
// 把容器里已有的控件整块折起来，标题沿用它自己的小节标题。
function foldChildren(container) {
  const title = container.querySelector('.section-title')?.textContent || '高级';
  const box = document.createElement('details');
  box.className = 'chouka-adv';
  const summary = document.createElement('summary');
  summary.textContent = title;
  const body = document.createElement('div');
  body.className = 'chouka-adv-body';
  body.append(...[...container.children].filter((n) => !n.classList.contains('section-title')));
  box.append(summary, body);
  container.replaceChildren(box);
}
const closest = (id, tag) => $(id)?.closest(tag);

// 顶栏「二维图片预览」、单选项的主相机下拉、本构建没接线的照片标记点按钮，已在 index.html 里直接删掉。
// 姿态模型下拉只有一个选项，但自动识别运行时会读它，只能藏。
if (closest('pose-quality', 'label')) closest('pose-quality', 'label').hidden = true;

// 中间工具条：低频开关收进「高级」，常驻只留视图切换、关节点和地面。
const viewTools = document.querySelector('.viewtools');
stash(
  advancedGroup(viewTools, '高级', { inline: true }),
  $('gizmos'),
  $('camera-fit-lock'),
  $('tool-scale'),
  closest('tool-space', 'label'),
);
$('use-view').textContent = '把当前视角设为拍摄相机';
$('use-view').title = '把当前自由观察的视角设为出图用的拍摄相机';

// 底部：白模截图由外壳自动附带，单独导出降为高级。
stash(advancedGroup(document.querySelector('.bottom'), '高级导出', { inline: true }), $('png'));
// 窄屏时快捷键说明会被压成一行，完整内容放进悬浮提示里
const mayaHint = document.getElementById('summary');
if (mayaHint) mayaHint.title = `完整快捷键：${mayaHint.textContent}`;

// 左栏「动作校准」：手动标点留三个入口（当前关节 / 标记 / 显示），拟合与校准细节收进高级。
const motionAdvanced = advancedGroup($('left-category-motion'), '高级校准与拟合');
stash(
  motionAdvanced,
  closest('lock-fov', 'label'),
  $('lift-pose'),
  $('fit'),
  $('joint-calibration'),
  $('fit-status'),
);

// 深度先验控件：pose.js 的 depthSettings() 按 id 读这两个节点，缺省退回强度 0.65 / 正向。
// 之前精简版没有这两个节点，识别结果一直用默认值，「深度反了 / 前后压缩」只能眼看着没法调。
const depthBox = document.createElement('div');
depthBox.className = 'chouka-depth';
depthBox.innerHTML =
  '<label>深度强度<input id="pose-depth-strength" aria-label="深度先验强度" type="range" min="0" max="1" step=".05" value=".65"><output id="chouka-depth-value">0.65</output></label>' +
  '<label>深度方向<select id="pose-depth-polarity" aria-label="深度先验方向"><option value="1">按模型给的远近</option><option value="-1">远近反过来</option></select></label>' +
  '<button id="chouka-depth-refit" type="button">按新深度重拟合</button>' +
  '<p class="hint">识别只能量出画面里的位置，前后远近靠模型估：强度越大越信它，估反了就选「远近反过来」。</p>' +
  '<p id="chouka-depth-info" class="hint"></p>';
motionAdvanced.append(depthBox);
const depthStrength = $('pose-depth-strength');
const depthPolarity = $('pose-depth-polarity');
const depthRefit = $('chouka-depth-refit');
const depthInfo = $('chouka-depth-info');
function syncDepthReadout() {
  $('chouka-depth-value').textContent = Number(depthStrength.value).toFixed(2);
  const diagnostics = people.active().depthDiagnostics;
  depthInfo.textContent = Number.isFinite(diagnostics?.depth_m_assumption)
    ? `这次按「距相机 ${diagnostics.depth_m_assumption.toFixed(2)} 米」假设髋部远近${diagnostics.depth_measured ? '' : '（是估计，不是测距）'}。`
    : '跑一次自动识别后，这里会显示当前用的远近假设。';
}
async function refitDepth() {
  depthRefit.disabled = true;
  depthRefit.textContent = '重拟合中…';
  try {
    await mediaAPI.refitDepth();
    syncDepthReadout();
  } catch (error) {
    depthInfo.textContent = '这次没重拟合：' + error.message;
  } finally {
    depthRefit.disabled = false;
    depthRefit.textContent = '按新深度重拟合';
  }
}
depthStrength.oninput = syncDepthReadout;
depthStrength.onchange = refitDepth;
depthPolarity.onchange = refitDepth;
depthRefit.onclick = refitDepth;
for (const event of ['lumen-people-change', 'lumen-photo-loaded', 'lumen-edit-committed']) {
  document.addEventListener(event, syncDepthReadout);
}
syncDepthReadout();

// 右栏灯光：分析档位与结果保持展开（折起来后「分析原图灯光」像被下架了）；只折经典模板。
const presetPanel = document.querySelector('.light-presets');
if (presetPanel) foldChildren(presetPanel);

// 角色选择器：新版把下拉框写在被我们替换掉的 workspace-entry.js 里，这里补一个。
const roleBar = document.createElement('div');
roleBar.className = 'chouka-role-bar';
roleBar.innerHTML =
  '<label>角色 <select id="chouka-role-select" aria-label="选择角色"></select></label>' +
  '<label>保留前 <input id="chouka-role-keep" type="number" min="1" max="6" value="1" aria-label="保留角色数量"> 个</label>' +
  '<button id="chouka-role-truncate" type="button">删多余角色</button>';
const imagePane = $('left-category-image');
imagePane?.querySelector('.category-header')?.after(roleBar);
const roleSelect = $('chouka-role-select');
const roleKeep = $('chouka-role-keep');
const roleTruncate = $('chouka-role-truncate');
function keepCount() {
  return Math.max(1, Math.min(6, Number(roleKeep.value) || 1));
}
// 删除是不可逆的（photo-people.truncate 会 dispose 掉机器人），所以先说清会掉谁。
function syncTruncateHint() {
  const dropped = people.list().slice(keepCount()).map((p) => p.name);
  roleTruncate.disabled = dropped.length === 0;
  roleTruncate.title = dropped.length
    ? `将删除 ${dropped.join('、')}，它们已经摆好的姿势和标好的关键点会一并丢掉，且不能撤销。`
    : '当前没有超出「保留前 N 个」的角色可删。';
  return dropped;
}
function syncRoles() {
  const list = people.list();
  roleSelect.replaceChildren(
    ...list.map((p) => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = p.name;
      return option;
    }),
  );
  roleSelect.value = people.active().id;
  roleBar.hidden = list.length < 2;
  // 默认只留 1 个：多人识别后默认填全部，「删多余角色」点了没有变化。
  roleKeep.value = '1';
  syncTruncateHint();
}
roleSelect.onchange = () => people.select(roleSelect.value);
roleKeep.oninput = syncTruncateHint;
roleTruncate.onclick = () => {
  const dropped = syncTruncateHint();
  if (!dropped.length) return;
  if (!window.confirm(`将删除 ${dropped.join('、')}，它们已经摆好的姿势和标好的关键点会一并丢掉，且不能撤销。\n确认删除？`)) return;
  people.truncate(keepCount());
  syncRoles();
};
for (const event of ['lumen-people-change', 'lumen-photo-loaded']) {
  document.addEventListener(event, syncRoles);
}
syncRoles();

function photoInfo() {
  const text = $('file-info')?.textContent ?? '';
  const match = /^(.*?)\s*·\s*(\d+)\s*×\s*(\d+)/.exec(text);
  if (!match || /尚未加载/.test(text)) return null;
  return { name: match[1], width: Number(match[2]), height: Number(match[3]) };
}

// 主光按角色 id 认，不再认下标：灯可以被删掉或新增，第 1 盏未必是主光。
const keyLamp = () => lightingAPI.lamps.find((l) => l.id === 'key') || null;

function mainLight() {
  const lamp = keyLamp();
  if (!lamp) return null;
  const target = lightingAPI.target();
  const delta = new T.Vector3().fromArray(lamp.pos).sub(target);
  const distance = delta.length();
  const local = delta
    .clone()
    .normalize()
    .applyQuaternion(shot.quaternion.clone().invert());
  const azimuth = T.MathUtils.radToDeg(Math.atan2(local.x, local.z));
  const elevation = T.MathUtils.radToDeg(
    Math.atan2(local.y, Math.hypot(local.x, local.z)),
  );
  return {
    power: lamp.power,
    kelvin: lamp.kelvin,
    azimuth: Math.round(azimuth * 10) / 10,
    elevation: Math.round(elevation * 10) / 10,
    distance: Math.round(distance * 100) / 100,
  };
}

function summary() {
  const state = lightingAPI.state;
  return {
    photo: photoInfo(),
    poseSource: state.poseSource,
    lightSource: state.lightSource,
    activeLights: lightingAPI.lamps.filter((l) => l.enabled && l.power > 0).length,
    camera: { fov: shot.fov, azimuth: null },
    mainLight: mainLight(),
    groundVisible: state.groundVisible !== false,
    people: people.list().length,
    activePerson: people.active().name,
  };
}

window.choukaLumen = {
  async loadPhoto(file) {
    const input = $('photo');
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    // 给 pose.js 的 change 监听递话：这张图是外壳给的，不算「在工作台里自己换图」。
    window.__choukaPhotoFromShell = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const started = performance.now();
    while (performance.now() - started < 20_000) {
      const info = photoInfo();
      if (info) return info;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error('原图载入超时，请重试');
  },
  photoLoaded() {
    return photoInfo() !== null;
  },
  setGround(visible) {
    setGroundVisible(visible);
  },
  // 当前场景快照指纹：外壳用它判断「关掉会不会丢改动」，比逐个控件加埋点可靠。
  sceneDigest() {
    return mediaAPI.digest ? mediaAPI.digest() : null;
  },
  // 云端看图分析的请求由外壳发（登录态和 CSRF 都在外壳那边），这里只声明云端可选不可选。
  setCloudAnalysis(available) {
    if (lightAnalysis && lightAnalysis.setCloudMode) lightAnalysis.setCloudMode(!!available);
  },
  exportPack({ applyPose = false, applyCamera = false, rebuildLitSide = false } = {}) {
    const pose = $('prompt-pose');
    const camera = $('prompt-camera');
    const rebuild = $('prompt-rebuild');
    if (pose) pose.checked = applyPose;
    if (camera) camera.checked = applyCamera;
    if (rebuild) rebuild.checked = rebuildLitSide;
    return { prompt: prompt(), spec: specification(), png: snapshot(), summary: summary() };
  },
  summary,
  // 多人自动识别定深用的深度图（项目节点 depth_image 产出，白近黑远相对深度）。
  // 外壳在载入原图后、自动识别前 set 进来；识别流程读到 window.__choukaDepthMap 才会启用深度校正。
  async setDepthMap(dataUrl) {
    if (!dataUrl) {
      window.__choukaDepthMap = null;
      return null;
    }
    const { loadDepthMap } = await import('./pose-depth-map.js');
    window.__choukaDepthMap = await loadDepthMap(dataUrl);
    return { width: window.__choukaDepthMap.width, height: window.__choukaDepthMap.height };
  },
  // 深度图入口挪进了打光台的「自动识别」面板：状态由外壳推下来，本页只画这一行并把用户的选择交回外壳。
  // 不推（或推 null）就整行收起，独立打开本页时不会留下点了没反应的假控件。
  setDepthStatus(payload) {
    setDepthStatus(payload || null);
  },
  // 云端「人物分区图」也只能由外壳发（登录态在同源父窗口），这里只做转交。外壳没注册时返回 null，调用方按失败处理。
  // 返回拆分图 data URL；personCount 传数字即按人数挑调色板颜色，省略即让模型自己数图里有几个人。
  async analyzePose(personCount) {
    const host = window.parent?.choukaLumenHost;
    if (!host || typeof host.analyzePose !== 'function') return null;
    return host.analyzePose(personCount);
  },
  // 分割编辑器「应用」后回传的索引层（像素值=身份号）：本页按这份免费重跑逐人估姿态。
  // 尺寸对不上会抛，返回值是错误文案，null 表示这次重识别跑完了。
  applySegmentLayer(payload) {
    return poseApplySegmentLayer(payload);
  },
  // 编辑器里点了取消：本页把状态行改回「分区没变」，避免看着像已经生效了。
  segmentEditClosed() {
    poseSegmentEditClosed();
  },
  mainLight,
  adjustMainLight({ power, kelvin, azimuth, elevation } = {}) {
    const lamp = keyLamp();
    if (!lamp) return null;
    // 原图没拟合出主光时这盏灯是关闭态，只改方位不会进图2 也不会进提示词，摆光成了空操作。
    if ([power, kelvin, azimuth, elevation].some(Number.isFinite)) lamp.enabled = true;
    if (Number.isFinite(power)) lamp.power = power;
    if (Number.isFinite(kelvin)) lamp.kelvin = kelvin;
    if (Number.isFinite(azimuth) || Number.isFinite(elevation)) {
      const current = mainLight();
      const az = T.MathUtils.degToRad(Number.isFinite(azimuth) ? azimuth : current.azimuth);
      const el = T.MathUtils.degToRad(Number.isFinite(elevation) ? elevation : current.elevation);
      const target = lightingAPI.target();
      const distance = current.distance || 3;
      const local = new T.Vector3(
        Math.sin(az) * Math.cos(el),
        Math.sin(el),
        Math.cos(az) * Math.cos(el),
      );
      const world = local.applyQuaternion(shot.quaternion);
      lamp.pos = target.clone().addScaledVector(world, distance).toArray();
    }
    lightsUpdate();
    return mainLight();
  },
  roles() {
    return people.list().map((p) => ({
      id: p.id,
      name: p.name,
      bounds: p.bounds ?? null,
      poseSource: p.poseSource,
    }));
  },
  selectRole(id) {
    people.select(id);
    syncRoles();
  },
  keepRoles(n) {
    people.truncate(Math.max(1, Math.min(6, n)));
    syncRoles();
  },
};
