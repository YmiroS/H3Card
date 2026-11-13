// 「当前分区预览 + 手工改分区」这一块：痛点是两个人糊成一块色，只有形状看得出来，
// 所以给图不给长文字；状态行那句「N 人已按色块分配身份」并不能暴露粘连。
import { overlayPixels } from './segment-layer.js?v=45';
import {
  measureSegmentFit,
  sampleSize,
  FIT_TOLERANCE_NATURAL_PX,
  FIT_SHADOW_COLOR,
  FIT_SHADOW_SUSPECT_EXCESS,
} from './segment-fit.js?v=45';

// 叠加不透明度与编辑器同一档，预览里看到的边界才和编辑器里一致。
export const PREVIEW_OVERLAY_ALPHA = 0.55;

// 分区来源只说明「这一版是谁切的」；计费与后续链路都不由它决定。
const SOURCE_LABEL = { cloud: '云端', local: '本地分割', manual: '已手工' };

// 云端那条的固定口径：边界是大模型按压缩图重绘的，逐人可能差几个像素。
// 这句不随人数变化，免得每次改文案都要把「为什么贴不住」重新解释一遍。
const CLOUD_FIT_NOTE = '分区图是云端按压缩图重绘的，边界可能差几个像素；手工改分区不花钱。';

// 投影这条改成同图互比之后，1 人分区没有对照，得把这层意思说出来，不能让用户以为「没报就是没影子」。
const SINGLE_PERSON_SHADOW_NOTE = '这次只有 1 个人分区，投影嫌疑要跟同一次分区里其他人比才成立，单人没有对照，这条不报。';

// 超出过线才说这句：2026-11-12 实测云端把幕布上的投影一起画进了分区，而影子边缘是柔和渐暗、
// 压在暗背景上那部分轮廓才失分，所以「边缘贴不贴得住」的整体档位看不见它——
// 不点名，用户只会以为「尺寸没对齐」。
function shadowNote(scores, fit) {
  const pct = (v) => Math.round((v || 0) * 100);
  const who = scores.map((s) => `#${s.index} 多涂 ${pct(s.darkExcess)}%（自身 ${pct(s.darkRatio)}%）`).join('、');
  return (
    `疑似含投影：${who}。同一次分区里最干净的那位是 ${pct(fit?.darkRatioFloor)}% 暗背景，` +
    `比它多 ${pct(FIT_SHADOW_SUSPECT_EXCESS)}% 以上才报——绝对占比在暗场景会误报，所以换成同图对照。` +
    '多半是人物投在幕布/地面上的投影被一起涂成了人。勾选下面那条，紫色那一片就是它：进编辑器把影子涂黑即可，不花钱、也不再发云端请求。'
  );
}

// 禁用态一律带原因，不允许静默置灰。
// no-masks 是「还没拆」，no-extract 是「这条路在本页走不通」，后者外壳会补一句真因。
const REASONS = {
  'no-photo': '先上传参考图，再拆一次人，这里才有分区可改。',
  busy: '正在识别，这一轮跑完就能改分区。',
  'no-masks':
    '还没有可改的分区：先点「自动估计人体姿态」（默认先让云端大模型拆人），或点「本地模型拆人（不花钱）」' +
    '——两条都会留下每人一张蒙版，这里才改得动。',
  'no-extract':
    '这一版走的是本地整图识别，只出关键点、没有每人蒙版，所以这里改不动；本页拿不到拆人通道。',
  'no-host': '手工改分区要用外层工作台的分割编辑器，单独打开本页时用不了。',
};

export function createSegmentManualUI({ getPhotoImage, colorOf, onEdit, toast }) {
  const preview = document.createElement('div');
  preview.id = 'segment-preview';
  preview.className = 'segment-preview';
  const caption = document.createElement('p');
  caption.className = 'segment-preview-title';
  caption.textContent = '当前分区预览';
  const canvas = document.createElement('canvas');
  canvas.className = 'segment-preview-canvas';
  canvas.setAttribute('aria-label', '当前人物分区叠加预览');
  const chipRow = document.createElement('div');
  chipRow.className = 'segment-preview-chips';
  // 「只看对不齐」：半透明填充换成按档位上色的轮廓线，贴没贴住一眼看得出，不用先认形状。
  const fitToggle = document.createElement('label');
  fitToggle.className = 'check segment-fit-toggle';
  const fitBox = document.createElement('input');
  fitBox.type = 'checkbox';
  fitToggle.append(fitBox, document.createTextNode('只看对不齐（档位描边 + 疑似投影涂紫）'));
  const fitNote = document.createElement('p');
  fitNote.className = 'segment-preview-note';
  preview.append(caption, canvas, fitToggle, chipRow, fitNote);

  const button = document.createElement('button');
  button.id = 'segment-edit';
  button.className = 'wide segment-edit';
  button.textContent = '手工改分区（不花钱）';
  button.onclick = () => {
    if (button.disabled) {
      if (button.title) toast(button.title);
      return;
    }
    onEdit();
  };
  const note = document.createElement('p');
  note.id = 'segment-edit-note';
  note.className = 'hint';

  function chip(person, source) {
    const row = document.createElement('span');
    row.className = 'segment-chip' + (person.manual ? ' manual' : '');
    const rgb = colorOf(person.index);
    if (rgb) row.style.setProperty('--segment-chip', `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
    const dot = document.createElement('i');
    dot.className = 'segment-chip-dot';
    row.append(dot, document.createTextNode(
      `${person.label || '人物' + person.index} · ${Math.round(person.ratio * 100)}% · ${SOURCE_LABEL[source] || '云端'}`,
    ));
    return row;
  }

  function gradeChip(score, fit) {
    // 那句「±几个像素」要写实际判据：图太大时缩样后不足一格，尺子会被放宽到一格。
    const tol = Math.max(1, Math.round((fit && fit.toleranceEffectiveNaturalPx) || FIT_TOLERANCE_NATURAL_PX));
    const row = document.createElement('span');
    row.className = 'segment-chip segment-fit-chip';
    row.style.setProperty('--segment-chip', score.grade.color);
    const dot = document.createElement('i');
    dot.className = 'segment-chip-dot';
    row.append(
      dot,
      document.createTextNode(`#${score.index} 边缘 ${Math.round(score.ratio * 100)}% ${score.grade.label}`),
    );
    row.title =
      `分区边缘落到原图真实边缘 ±${tol} 像素内的比例：${Math.round(score.ratio * 100)}%（长边 480 缩样测算，是指示器不是逐像素测量值）。\n` +
      (score.shadowSuspect
        ? '注意：这一位旁边还有一条投影嫌疑——投影的边缘是柔和渐暗，压不住强边缘门槛，所以档位看着还行也可能多涂了一块影子。'
        : score.grade.key === 'good'
          ? '这一位的边缘基本贴着真人轮廓，不用动。'
          : '这一位的边缘和真人轮廓对不上：进编辑器只涂这一位即可，改完不花钱、也不再发云端请求。');
    return row;
  }

  // 投影单独一条 chip：和「边缘档位」是两回事，混在同一行会读成同一个指标。
  function shadowChip(score, fit) {
    const pct = (v) => Math.round((v || 0) * 100);
    const row = document.createElement('span');
    row.className = 'segment-chip segment-shadow-chip';
    row.style.setProperty('--segment-chip', FIT_SHADOW_COLOR);
    const dot = document.createElement('i');
    dot.className = 'segment-chip-dot';
    row.append(
      dot,
      document.createTextNode(`#${score.index} 疑似含投影 +${pct(score.darkExcess)}%`),
    );
    row.title =
      `这一位的分区色有 ${pct(score.darkRatio)}% 落在暗背景上（亮度 ≤70）；同一次分区里最干净的那位是 ` +
      `${pct(fit?.darkRatioFloor)}%，多出来这 ${pct(score.darkExcess)}% 才是嫌疑——实测多为投在幕布/地面上的投影。\n` +
      '深色衣服、暗皮肤都算进占比里，所以这条只看同图谁更突出，不看绝对值：暗场景不会整片误报，反过来只 1 人时也没对照。\n' +
      '要擦：点「手工改分区」只涂黑影子那一片，改完免费重识别姿势，不再发云端请求。';
    return row;
  }

  // 贴合度按位图缓存：同一层反复重画（勾选、栏宽变了）不重跑边缘图与距离变换。
  let fitCache = null;
  let shownLayer = null;

  function measure(layer) {
    if (fitCache && fitCache.layer === layer) return fitCache.result;
    const image = getPhotoImage();
    let result = null;
    if (layer && image) {
      try {
        const size = sampleSize(image.naturalWidth, image.naturalHeight);
        const sheet = document.createElement('canvas');
        sheet.width = size.width;
        sheet.height = size.height;
        const ctx = sheet.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0, size.width, size.height);
        result = measureSegmentFit(layer, ctx.getImageData(0, 0, size.width, size.height).data, size);
      } catch (err) {
        // 贴合度只是指示器：算不出来不能让整块分区预览不见，退回不打分。
        result = { error: err.message };
      }
    }
    fitCache = { layer, result };
    return result;
  }

  // 预览按参考图比例画，宽不超过左栏；身份色只叠一层半透明，材质还得看得见。
  function paint(layer) {
    const image = getPhotoImage();
    if (!layer || !image) {
      canvas.hidden = true;
      return;
    }
    const aspect = image.naturalWidth / image.naturalHeight || 1;
    const width = Math.max(120, Math.min(canvas.parentElement?.clientWidth || 320, 480));
    const height = Math.max(60, Math.round(width / aspect));
    canvas.width = width;
    canvas.height = height;
    canvas.hidden = false;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    if (fitBox.checked) {
      const fit = measure(layer);
      if (fit && fit.outline) {
        const sheet = document.createElement('canvas');
        sheet.width = fit.width;
        sheet.height = fit.height;
        sheet.getContext('2d').putImageData(new ImageData(fit.outline, fit.width, fit.height), 0, 0);
        // 描边只有一格宽，平滑一开就糊成灰边，档位颜色反而认不出来。
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sheet, 0, 0, width, height);
        return;
      }
    }
    const overlay = overlayPixels(layer, colorOf, PREVIEW_OVERLAY_ALPHA);
    const sheet = document.createElement('canvas');
    sheet.width = overlay.width;
    sheet.height = overlay.height;
    sheet.getContext('2d').putImageData(new ImageData(overlay.data, overlay.width, overlay.height), 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(sheet, 0, 0, width, height);
  }

  function render(state) {
    const people = state.people || [];
    const reason = state.reason || null;
    const source = state.source || 'cloud';
    shownLayer = state.layer || null;
    preview.hidden = !state.layer;
    paint(state.layer);
    const fit = state.layer ? measure(state.layer) : null;
    const scores = fit && fit.scores ? fit.scores : [];
    // 档位只在云端那条说「贴不住」才有意义：本地分割的边界就是模型按原图切的，跑偏另有来源。
    const isCloud = source === 'cloud';
    const showGrades = isCloud && scores.some((s) => s.grade.key !== 'good');
    const suspects = isCloud ? scores.filter((s) => s.shadowSuspect) : [];
    chipRow.replaceChildren(
      ...people.map((person) => chip(person, source)),
      ...(showGrades ? scores.map((s) => gradeChip(s, fit)) : []),
      ...suspects.map((score) => shadowChip(score, fit)),
    );
    fitToggle.hidden = !state.layer || !isCloud;
    // 送出尺寸和返回尺寸不一致时那句要说在预览口径里：状态行会被后面的步骤盖掉，这行一直在。
    fitNote.textContent = state.layer && isCloud
      ? [
          state.sizeNote,
          fit && fit.error
            ? `贴合度这次没算出来：${fit.error}；分区本身没受影响，照常可改。`
            : suspects.length
              ? shadowNote(suspects, fit)
              : [CLOUD_FIT_NOTE, scores.length === 1 ? SINGLE_PERSON_SHADOW_NOTE : ''].filter(Boolean).join(' '),
        ]
          .filter(Boolean)
          .join(' ')
      : '';
    // 外壳能给出更准的真因时（no-extract），用它那句，本地文案只兜底。
    const reasonText = state.reasonNote || REASONS[reason];
    button.disabled = reason !== null;
    button.title = reason ? reasonText : '用现成的分割编辑器涂两笔，改完直接按这份重识别；这一步不花钱，也不再发云端请求。';
    note.textContent = reason
      ? reasonText
      : `分区里 ${people.length} 个人（${SOURCE_LABEL[source] || '云端'}那版）；改完按这份重识别，不再花钱。`;
  }

  fitBox.onchange = () => paint(shownLayer);

  return { preview, button, note, render };
}
