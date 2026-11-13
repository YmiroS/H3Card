// 手工改分区的载体换算：编辑器认「索引层」（像素值 = 身份号，0 是背景），识别链路认「每人一张 0/1 蒙版」。
// 两边来回都要重采样，尺寸口径一错就表现为「人对了位错了」，所以这三条留成不含 DOM 的纯函数，node 里直接钉住。
import { MAX_SEGMENT_PEOPLE } from './pose-mask-split.js?v=45';

/** 索引层是单通道 Uint8，0 留给背景，所以最多 255 个身份。 */
export const MAX_LAYER_IDENTITIES = 255;

function assertDims(width, height, what) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error(`${what}必须是正整数像素尺寸，收到 ${width}×${height}。`);
  }
}

/**
 * 每人一张 0/1 蒙版 → 一张索引层。身份号 = 左起序号 + 1，顺序即白模顺序；后盖的覆盖先盖的。
 * width/height 一律传参考图的 naturalWidth/Height：云端分区图被对齐到 16 的倍数改过尺寸，
 * 拿蒙版自己的尺寸当原图尺寸，包含度配对会系统性偏。
 */
export function indexLayerFromMasks({ masks, maskWidth, maskHeight, width, height }) {
  assertDims(width, height, '索引层尺寸');
  assertDims(maskWidth, maskHeight, '蒙版尺寸');
  if (!Array.isArray(masks) || !masks.length) throw new Error('没有可编辑的人物蒙版。');
  if (masks.length > MAX_LAYER_IDENTITIES) {
    throw new Error(`${masks.length} 个人装不进一张索引层（上限 ${MAX_LAYER_IDENTITIES}）。`);
  }
  const data = new Uint8Array(width * height);
  masks.forEach((mask, at) => {
    if (!mask || mask.length < maskWidth * maskHeight) {
      throw new Error(`第 ${at + 1} 个人的蒙版像素不够 ${maskWidth}×${maskHeight}，没法并进索引层。`);
    }
    const index = at + 1;
    for (let y = 0; y < height; y += 1) {
      const sy = Math.min(maskHeight - 1, Math.floor((y / height) * maskHeight));
      const srcRow = sy * maskWidth;
      const dstRow = y * width;
      for (let x = 0; x < width; x += 1) {
        const sx = Math.min(maskWidth - 1, Math.floor((x / width) * maskWidth));
        if (mask[srcRow + sx]) data[dstRow + x] = index;
      }
    }
  });
  return { width, height, data };
}

/**
 * 索引层 → 每人一张 0/1 蒙版，按身份号升序（身份顺序 = 白模顺序）。
 * 「身份号出现过即算一个人」，不过 MIN_PERSON_RATIO：那是给模型出的脏图设的拒收阈值，
 * 人工涂的细小手臂、远处的小孩会被静默吞掉。
 */
export function masksFromIndexLayer(layer) {
  if (!layer || typeof layer !== 'object') throw new Error('没有拿到分区索引层。');
  assertDims(layer.width, layer.height, '索引层尺寸');
  const total = layer.width * layer.height;
  if (!layer.data || layer.data.length < total) {
    throw new Error(`索引层像素数据不够 ${layer.width}×${layer.height}，装不下这份分区。`);
  }
  const seen = new Set();
  for (let at = 0; at < total; at += 1) if (layer.data[at]) seen.add(layer.data[at]);
  return [...seen].sort((a, b) => a - b).map((index) => {
    const mask = new Uint8Array(total);
    let pixels = 0;
    for (let at = 0; at < total; at += 1) {
      if (layer.data[at] !== index) continue;
      mask[at] = 1;
      pixels += 1;
    }
    return { index, mask, pixels, ratio: pixels / total };
  });
}

/**
 * 分区人数上限按识别链路那条说死：色桶连通块与角色池都是 16，再多只能合并身份。
 * 报错说清「现在几个、上限几个、去哪儿减」，不静默截断成前 16 个。
 */
export function assertSegmentPeople(count, limit = MAX_SEGMENT_PEOPLE) {
  if (count > limit) {
    throw new Error(
      `分区里有 ${count} 个人，超过本次识别上限 ${limit} 个；请在编辑器里把多余的身份合并或删掉。`,
    );
  }
  return count;
}

/** 蒙版占整幅画面的比例（预览 chip 上的「占比」）。 */
export function maskShare(mask) {
  if (!mask || !mask.length) return 0;
  let pixels = 0;
  for (let at = 0; at < mask.length; at += 1) pixels += mask[at] ? 1 : 0;
  return pixels / mask.length;
}

/**
 * 预览叠加：索引层 + 身份色 → RGBA（背景全透明，身份色按 alpha 半透）。
 * 色值一律由调用方从外壳的 identityColor 出口要来，本页不再抄一份色表。
 */
export function overlayPixels(layer, colorOf, alpha = 0.55) {
  if (!layer || typeof layer !== 'object') throw new Error('没有拿到分区索引层。');
  assertDims(layer.width, layer.height, '索引层尺寸');
  const total = layer.width * layer.height;
  const rgba = new Uint8ClampedArray(total * 4);
  const byte = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
  const cache = new Map();
  for (let at = 0; at < total; at += 1) {
    const index = layer.data?.[at] ?? 0;
    if (!index) continue;
    let rgb = cache.get(index);
    if (!rgb) {
      const raw = colorOf(index);
      if (!raw) continue;
      rgb = [raw[0], raw[1], raw[2]];
      cache.set(index, rgb);
    }
    const p = at * 4;
    rgba[p] = rgb[0];
    rgba[p + 1] = rgb[1];
    rgba[p + 2] = rgb[2];
    rgba[p + 3] = byte;
  }
  return { width: layer.width, height: layer.height, data: rgba };
}
