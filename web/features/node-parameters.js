/* Node parameters: pure value transforms and injected DOM/reference adapters. */
(function (root, factory) {
  const feature = factory();
  if (typeof module === "object" && module.exports) module.exports = feature;
  else root.ChoukaNodeParameters = feature;
})(globalThis, function () {
"use strict";
const MEDIA = ["image", "audio", "video"];
const CLARITY_STEPS = [
  { id: "480P", label: "480P", val: 480 },
  { id: "720P", label: "720P", val: 720 },
  { id: "1080P", label: "1080P", val: 1080 },
  { id: "1440P", label: "1440P", val: 1440 },
  { id: "2K", label: "2K", val: 2048 },
];
/** 比例网格（照参考图内置的 13 种；映射到工作流那 8 档 select 里的最优近似） */
const RATIO_GRID = [
  ["1:1", 1, 1], ["1:2", 1, 2], ["2:1", 2, 1], ["9:16", 9, 16], ["16:9", 16, 9],
  ["3:4", 3, 4], ["4:3", 4, 3], ["3:2", 3, 2], ["2:3", 2, 3], ["5:4", 5, 4],
  ["4:5", 4, 5], ["21:9", 21, 9], ["9:21", 9, 21],
];

/** TT 分辨率值同时编码尺寸和比例，例如 1280x720 (16:9)。 */
function resolutionPresets(spec) {
  return (spec && spec.options || []).map(value => {
    const m = /^(\d+)x(\d+)\s+\(([^)]+)\)$/.exec(String(value));
    if (!m) return null;
    const width = parseInt(m[1], 10), height = parseInt(m[2], 10);
    return { value, width, height, ratio: m[3], short: Math.min(width, height) };
  }).filter(Boolean);
}
function resolutionPreset(spec, value) {
  return resolutionPresets(spec).find(x => x.value === value) || null;
}
function imageSettings(c, cap) {
  const controls = cap.imageControls;
  const ratio = c.params.image_ratio;
  const clarity = c.params.image_clarity;
  return {
    ratio: RATIO_GRID.some(r => r[0] === ratio) || (controls.mode === "i2i" && ratio === "original")
      ? ratio : controls.defaultRatio,
    clarity: CLARITY_STEPS.some(s => s.id === clarity) ? clarity : controls.defaultClarity,
  };
}


function switchImageCapability(c, capability, old, next) {
  if (old && next && old.id !== next.id && (old.imageControls || next.imageControls)) {
    const modelKeys = cap => [...new Set(cap.inputs.filter(s =>
      !MEDIA.includes(s.type) && s.type !== "textarea" && s.type !== "seed").map(s => s.key))];
    const saved = c.params._imageModelParams ||= {};
    saved[old.id] = Object.fromEntries(modelKeys(old).filter(k => c.params[k] != null).map(k => [k, c.params[k]]));
    const ratios = c.params._imageRatios ||= {};
    if (old.imageControls) ratios[old.imageControls.mode] = imageSettings(c, old).ratio;
    for (const key of new Set([...modelKeys(old), ...modelKeys(next)])) delete c.params[key];
    Object.assign(c.params, saved[next.id] || {});
    if (next.imageControls && old.imageControls?.mode !== next.imageControls.mode) {
      c.params.image_ratio = ratios[next.imageControls.mode] || next.imageControls.defaultRatio;
    }
  }
  c.cap = capability;
}


function create({ document, getCapability, getCapabilityById, getRunCapability, getProject, isIF, normalizeIFDuration,
  api, save, onReferenceChange, ratioWH: RATIO_WH, multiple: MULT }) {
function imageClarityPicker(c, cap, onchange) {
  const current = imageSettings(c, cap);
  const wrap = document.createElement("div"); wrap.className = "cpick image-size-controls";
  const title = document.createElement("div"); title.className = "ctitle"; title.textContent = "画面比例";
  const ratios = document.createElement("div"); ratios.className = "cgrid";
  const choices = cap.imageControls.mode === "i2i" ? [["original", 1, 1], ...RATIO_GRID] : RATIO_GRID;
  for (const [ratio, width, height] of choices) {
    const button = document.createElement("button");
    const label = ratio === "original" ? "原图" : ratio;
    button.className = ratio === current.ratio ? "on" : "";
    button.innerHTML = `<i style="--ratio:${width / height}"></i><span>${label}</span>`;
    button.title = `画面比例 ${label}`;
    button.onclick = () => { c.params.image_ratio = ratio; save(); onchange(); };
    ratios.appendChild(button);
  }
  const clarityTitle = document.createElement("div"); clarityTitle.className = "ctitle"; clarityTitle.textContent = "清晰度";
  const sizes = document.createElement("div"); sizes.className = "cgrid k";
  for (const step of CLARITY_STEPS) {
    const button = document.createElement("button");
    button.className = step.id === current.clarity ? "on" : "";
    button.textContent = step.label;
    button.title = `目标短边 ${step.val}px，实际尺寸按模型要求对齐`;
    button.onclick = () => { c.params.image_clarity = step.id; save(); onchange(); };
    sizes.appendChild(button);
  }
  const hint = document.createElement("div"); hint.className = "image-size-hint";
  hint.textContent = cap.imageControls.mode === "i2i"
    ? "清晰度按短边计算；默认保持原图比例。指定比例时，模型可能裁切主图以适配画布。"
    : "清晰度按短边计算；实际尺寸按模型要求对齐。高分辨率会增加显存占用。";
  wrap.append(title, ratios, clarityTitle, sizes, hint);
  return wrap;
}


const supportsVideoReference = cap => cap?.kind === "gen" && cap.outputType === "video"
  && (cap.execution === "if_studio" || (cap.id.startsWith("minimax_h3_") && cap.inputs.some(s => s.type === "video")));
const referenceVideo = (c, cap) => supportsVideoReference(cap)
  ? (isIF(c) ? getCapability(c) : cap).inputs.filter(s => s.type === "video").map(s => c.assets?.[s.key]).find(a => a?.ref) : null;
const videoMetadataReady = a => a && [a.width, a.height, a.duration].every(v => Number.isFinite(+v) && +v > 0);
const referenceMetadata = new WeakMap();

async function ensureReferenceMetadata(c, cap = getRunCapability(c)) {
  const source = referenceVideo(c, cap);
  if (!source || videoMetadataReady(source)) return;
  if (referenceMetadata.has(source)) return referenceMetadata.get(source).promise;
  const project = getProject();
  const state = {};
  referenceMetadata.set(source, state);
  state.promise = api("/api/media?ref=" + encodeURIComponent(source.ref) + "&project=" + encodeURIComponent(project.id))
    .then(info => {
      if (!videoMetadataReady(info)) throw new Error("无法读取参考视频的比例和时长，请重新导入视频");
      if (getProject() !== project || !project.cards.includes(c) || referenceVideo(c, cap) !== source) return;
      Object.assign(source, info);
      save();
    }).catch(error => { state.error = error.message; throw error; });
  return state.promise;
}
function syncReferenceParameters(c, cap = getRunCapability(c)) {
  const source = referenceVideo(c, cap);
  if (!source) {
    delete c._referenceParameters;
    delete c.params._reference_video;
    return Promise.resolve();
  }
  const identity = JSON.stringify([cap.id, source.ref]);
  if (c.params._reference_video === identity) return Promise.resolve();
  const pending = c._referenceParameters;
  if (pending?.identity === identity && pending.source === source) return pending.promise;
  const project = getProject(), params = c.params;
  const before = {...params};
  const state = {identity, source, before};
  c._referenceParameters = state;
  const apply = () => {
    if (getProject() !== project || !project.cards.includes(c) || c.params !== params
      || c._referenceParameters !== state || (getRunCapability(c)) !== cap
      || referenceVideo(c, cap) !== source || !videoMetadataReady(source)) return;
    const unchanged = keys => keys.every(key => params[key] === before[key]);
    const ar = cap.inputs.find(s => s.key === "aspect_ratio");
    const ratio = +source.width / +source.height;
    if (ar && unchanged(["aspect_ratio"])) {
      params.aspect_ratio = ar.options.reduce((best, option) =>
        Math.abs(RATIO_WH[option][0] / RATIO_WH[option][1] - ratio)
          < Math.abs(RATIO_WH[best][0] / RATIO_WH[best][1] - ratio) ? option : best);
    } else if (!ar && unchanged(["width", "height", "_ratio"])) {
      const r = RATIO_GRID.reduce((best, item) => Math.abs(item[1] / item[2] - ratio)
        < Math.abs(best[1] / best[2] - ratio) ? item : best);
      const value = key => params[key] ?? cap.inputs.find(s => s.key === key)?.default;
      const short = Math.min(+value("width"), +value("height"));
      params._ratio = r[0];
      params.width = r[1] >= r[2] ? Math.round(short * r[1] / r[2] / MULT) * MULT : short;
      params.height = r[1] >= r[2] ? short : Math.round(short * r[2] / r[1] / MULT) * MULT;
    }
    // 人物迁移的 duration 是单段长度，不是成片总时长。
    const preview = cap.inputs.some(s => s.key === "preview_seconds");
    const key = preview ? "preview_seconds" : "duration";
    if (unchanged([key])) {
      params[key] = preview ? 0 : Math.max(1, Math.round(+source.duration));
      if (isIF(c)) normalizeIFDuration(c);
    }
    params._reference_video = identity;
    save();
  };
  state.promise = videoMetadataReady(source) ? Promise.resolve(apply()) : ensureReferenceMetadata(c, cap).then(apply);
  return state.promise;
}
function refreshVideoParameters(c) {
  syncReferenceParameters(c).catch(() => {}).finally(() => onReferenceChange(c));
}
function videoReferenceStatus(c, cap) {
  const source = referenceVideo(c, cap);
  if (!source || videoMetadataReady(source)) return null;
  const note = document.createElement("div"); note.className = "knobnote"; note.setAttribute("role", "status");
  note.textContent = referenceMetadata.get(source)?.error || "正在读取参考视频的比例和时长…";
  if (referenceMetadata.get(source)?.error) {
    const retry = document.createElement("button"); retry.type = "button"; retry.textContent = "重新读取";
    retry.onclick = () => {
      referenceMetadata.delete(source); delete c._referenceParameters;
      refreshVideoParameters(c); onReferenceChange(c);
    };
    note.appendChild(retry);
  }
  return note;
}

  return { imageClarityPicker, supportsVideoReference, referenceVideo, videoMetadataReady,
    ensureReferenceMetadata, syncReferenceParameters, refreshVideoParameters, videoReferenceStatus,
    switchImageCapability: (card, id) => switchImageCapability(card, id, getCapability(card), getCapabilityById(id)) };
}
return { CLARITY_STEPS, RATIO_GRID, resolutionPresets, resolutionPreset, imageSettings,
  switchImageCapability, applyInputPresets, create };
function applyInputPresets(cap, params) {
  for (const spec of (cap.inputs || []).filter(s => s.presets)) {
    const selected = params[spec.key] != null ? params[spec.key] : spec.default;
    const preset = spec.presets[selected];
    if (!preset) throw new Error(`${spec.label}无效：${selected}`);
    params[spec.key] = selected;
    Object.assign(params, preset);
  }
}


});
