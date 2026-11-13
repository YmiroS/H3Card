// 云端大模型「人物拆分图」本地解析：生图接口把照片重绘成固定调色板分区图
// （左起第 i 个人 = 调色板第 i 色，纯黑背景，尺寸不变），本地按最近色拆出每人蒙版，
// 再把每人单独隔离到中性灰底上、全尺寸跑 MediaPipe——不裁剪、不串人。
// 调色板必须与外壳 services/poseSegment.ts 里的 SEGMENT_PALETTE 保持一致。
export const SEGMENT_PALETTE = ['#E6194B', '#3CB44B', '#4363D8', '#F58231', '#911EB4', '#42D4F4'];

// 人数上限走「色桶 × 连通块」，不再等于调色板长度；与外壳 services/poseSegment.ts 的同名常量保持一致。
export const MAX_SEGMENT_PEOPLE = 16;

const BACKGROUND_LUM = 32; // max(r,g,b) 低于此值视为背景（模型被要求纯黑底）
const MIN_PERSON_RATIO = 0.003; // 单个连通块占比低于 0.3% 视为不可信，宁少不串

// 调色板归一化到「最大通道=1」的色相向量：模型重绘难免带明暗变化，比色相角更稳。
const PALETTE_VECTORS = SEGMENT_PALETTE.map((hex) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const m = Math.max(r, g, b);
  return [r / m, g / m, b / m];
});

export async function loadImage(dataUrl) {
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('拆分图无法读取'));
    image.src = dataUrl;
  });
  return image;
}

// 前景像素先按整张调色板归最近色分桶，再在每个色桶内部切连通块：
// 同一个颜色只要没连成一片就算两个人，所以人数 = Σ各色的连通块数，不再等于调色板长度
// （提示词那头允许循环用色，第 7 个人可以回到第 1 色）。顺序按质心从左到右，身份才不会串。
// 连通块打在格子上，格子边长取画面短边的 0.6%（夹 3~8 px）：
// 跨过模型平涂时画出的发丝、描边这类细缝，又不至于把真正分开的两个人粘成一块。
export function segmentMasksFromPixels(data, width, height) {
  if (!width || !height || data.length < width * height * 4) return null;
  const total = width * height;
  const minPx = Math.max(1, Math.round(total * MIN_PERSON_RATIO));
  const colorOf = new Uint8Array(total); // 0 = 背景，其余为调色板下标 + 1
  const colorCount = new Uint32Array(PALETTE_VECTORS.length);
  const colorBox = PALETTE_VECTORS.map(() => [width, height, -1, -1]);
  let foreground = 0;
  for (let p = 0, i = 0; i < total; p += 4, i += 1) {
    const r = data[p], g = data[p + 1], b = data[p + 2];
    const lum = Math.max(r, g, b);
    if (lum < BACKGROUND_LUM) continue;
    foreground += 1;
    const nr = r / lum, ng = g / lum, nb = b / lum;
    let best = 0, bestDist = Infinity;
    for (let c = 0; c < PALETTE_VECTORS.length; c += 1) {
      const v = PALETTE_VECTORS[c];
      const d = (nr - v[0]) ** 2 + (ng - v[1]) ** 2 + (nb - v[2]) ** 2;
      if (d < bestDist) { bestDist = d; best = c; }
    }
    colorOf[i] = best + 1;
    colorCount[best] += 1;
    const x = i % width, y = (i - x) / width;
    const box = colorBox[best];
    if (x < box[0]) box[0] = x;
    if (y < box[1]) box[1] = y;
    if (x > box[2]) box[2] = x;
    if (y > box[3]) box[3] = y;
  }
  if (!foreground) return null;
  const cell = Math.max(3, Math.min(8, Math.round(Math.min(width, height) * 0.006)));
  const parts = [];
  for (let c = 0; c < PALETTE_VECTORS.length; c += 1) {
    if (colorCount[c] < minPx) continue; // 整色杂点，不配进去数人
    const grid = labelColorCells(colorOf, width, c + 1, colorBox[c], cell);
    const stats = grid.count.map(() => ({ pixels: 0, sumX: 0 }));
    for (let y = grid.y1; y <= grid.y2; y += 1) {
      const row = y * width;
      const cy = Math.floor(y / cell) - grid.r0;
      for (let x = grid.x1; x <= grid.x2; x += 1) {
        if (colorOf[row + x] !== c + 1) continue;
        const s = stats[grid.label[cy * grid.cols + (Math.floor(x / cell) - grid.c0)]];
        s.pixels += 1;
        s.sumX += x;
      }
    }
    stats.forEach((s, label) => {
      if (s.pixels < minPx) return; // 碎片不算人
      parts.push({ color: c, grid, label, pixels: s.pixels, centroidX: s.sumX / s.pixels });
    });
  }
  if (!parts.length) return null;
  // 超过上限时留最大的那几个（多半是同人被切出来的碎片），再恢复左起顺序。
  const kept = parts.length > MAX_SEGMENT_PEOPLE
    ? parts.slice().sort((a, b) => b.pixels - a.pixels).slice(0, MAX_SEGMENT_PEOPLE)
    : parts;
  kept.sort((a, b) => a.centroidX - b.centroidX);
  const masks = [];
  const colors = [];
  for (const part of kept) {
    const mask = new Uint8Array(total);
    const { grid, label, color } = part;
    for (let y = grid.y1; y <= grid.y2; y += 1) {
      const row = y * width;
      const cy = Math.floor(y / cell) - grid.r0;
      for (let x = grid.x1; x <= grid.x2; x += 1) {
        if (colorOf[row + x] !== color + 1) continue;
        if (grid.label[cy * grid.cols + (Math.floor(x / cell) - grid.c0)] !== label) continue;
        mask[row + x] = 1;
      }
    }
    masks.push(mask);
    colors.push(color);
  }
  return { width, height, masks, colors };
}

// 色桶内按格子做 8 邻域连通块标号，只在桶的包围盒内跑；返回格子标号与盒的起点。
function labelColorCells(colorOf, width, value, box, cell) {
  const [x1, y1, x2, y2] = box;
  const c0 = Math.floor(x1 / cell), r0 = Math.floor(y1 / cell);
  const cols = Math.floor(x2 / cell) - c0 + 1, rows = Math.floor(y2 / cell) - r0 + 1;
  const hit = new Uint8Array(cols * rows);
  for (let y = y1; y <= y2; y += 1) {
    const row = y * width, cy = Math.floor(y / cell) - r0;
    for (let x = x1; x <= x2; x += 1) {
      if (colorOf[row + x] !== value) continue;
      hit[cy * cols + (Math.floor(x / cell) - c0)] = 1;
    }
  }
  const label = new Int32Array(cols * rows).fill(-1);
  const stack = new Int32Array(cols * rows);
  const count = [];
  for (let seed = 0; seed < hit.length; seed += 1) {
    if (!hit[seed] || label[seed] >= 0) continue;
    const id = count.length;
    count.push(0);
    label[seed] = id;
    let top = 0;
    stack[top++] = seed;
    while (top) {
      const cur = stack[--top];
      const cx = cur % cols, cy = (cur - cx) / cols;
      for (let dy = -1; dy <= 1; dy += 1) {
        const ny = cy + dy;
        if (ny < 0 || ny >= rows) continue;
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = cx + dx;
          if (nx < 0 || nx >= cols) continue;
          const next = ny * cols + nx;
          if (!hit[next] || label[next] >= 0) continue;
          label[next] = id;
          stack[top++] = next;
        }
      }
    }
  }
  return { x1, y1, x2, y2, c0, r0, cols, label, count };
}

// 把拆分图拆成每人一张 0/1 蒙版。personCount 省略时按画面里真出现的人数；
// 传了就必须对上（云端校正站位那条已经知道本地检出几个人），对不上整张作废。
export function masksFromSegmentImage(image, personCount) {
  if (personCount !== undefined && personCount !== null &&
      (!Number.isInteger(personCount) || personCount < 1 || personCount > MAX_SEGMENT_PEOPLE)) return null;
  // 位图取 naturalWidth/Height；重采样用的画布只有 width/Height，两种都当同一件事读。
  const width = image.naturalWidth || image.width, height = image.naturalHeight || image.height;
  if (!width || !height) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const parsed = segmentMasksFromPixels(ctx.getImageData(0, 0, width, height).data, width, height);
  if (!parsed) return null;
  if (personCount != null && parsed.masks.length !== personCount) return null;
  return parsed;
}

// 用蒙版从原照片里抠出单人：蒙版内保留原图像素（识别吃的是真实纹理，质量等同整图识别），
// 蒙版外涂中性灰——相邻人物被抹掉，自然没有跨人串扰。蒙版坐标系与输出尺寸可不同，按最近邻对齐。
// blur 变体把背景换成整图重模糊（孤立灰底剪影检出不稳时，场景上下文能拉 MediaPipe 一把）；
// rect 变体只画归一化窗口 [x1,y1,x2,y2] 内的源图（输出=裁剪放大，蒙版按同一窗口对齐）。
export function isolatePerson(sourceImage, mask, maskWidth, maskHeight, outWidth, outHeight, { blur = 0, rect = null } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext('2d');
  const sx = rect ? rect[0] * sourceImage.naturalWidth : 0;
  const sy = rect ? rect[1] * sourceImage.naturalHeight : 0;
  const sw = rect ? (rect[2] - rect[0]) * sourceImage.naturalWidth : sourceImage.naturalWidth;
  const sh = rect ? (rect[3] - rect[1]) * sourceImage.naturalHeight : sourceImage.naturalHeight;
  if (blur > 0) ctx.filter = `blur(${blur}px)`;
  ctx.drawImage(sourceImage, sx, sy, sw, sh, 0, 0, outWidth, outHeight);
  ctx.filter = 'none';
  const imageData = ctx.getImageData(0, 0, outWidth, outHeight);
  const { data } = imageData;
  for (let y = 0; y < outHeight; y += 1) {
    const vn = rect ? rect[1] + (y / outHeight) * (rect[3] - rect[1]) : y / outHeight;
    const my = Math.min(maskHeight - 1, Math.floor(vn * maskHeight));
    for (let x = 0; x < outWidth; x += 1) {
      const un = rect ? rect[0] + (x / outWidth) * (rect[2] - rect[0]) : x / outWidth;
      const mx = Math.min(maskWidth - 1, Math.floor(un * maskWidth));
      if (mask[my * maskWidth + mx]) continue;
      const p = (y * outWidth + x) * 4;
      data[p] = 127;
      data[p + 1] = 127;
      data[p + 2] = 127;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// 蒙版包围盒（归一化 [x1,y1,x2,y2]）：隔离重识别的裁剪范围。
export function maskBBox(mask, maskWidth, maskHeight) {
  let x1 = 1, y1 = 1, x2 = 0, y2 = 0;
  for (let y = 0; y < maskHeight; y += 1) {
    for (let x = 0; x < maskWidth; x += 1) {
      if (!mask[y * maskWidth + x]) continue;
      x1 = Math.min(x1, x / maskWidth); x2 = Math.max(x2, x / maskWidth);
      y1 = Math.min(y1, y / maskHeight); y2 = Math.max(y2, y / maskHeight);
    }
  }
  return x2 > x1 && y2 > y1 ? [x1, y1, x2, y2] : null;
}

// 归一化坐标点是否落在蒙版内（带小邻域容错）：拆分配对、深度采样共用。
export function maskHasPoint(mask, maskWidth, maskHeight, u, v, radius = 2) {
  const cx = Math.round(u * (maskWidth - 1)), cy = Math.round(v * (maskHeight - 1));
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= maskWidth || y >= maskHeight) continue;
      if (mask[y * maskWidth + x]) return true;
    }
  }
  return false;
}

// 蒙版内深度图中位数（步进采样）：蒙版覆盖整个人，比四个躯干锚点更抗局部遮挡。
// 返回 null 表示无深度图或蒙版外采不到样，调用方回退骨长估深。
export function maskNearness(depthMap, mask, width, height) {
  if (!depthMap || !depthMap.gray || !depthMap.width || !depthMap.height) return null;
  const values = [];
  const step = 2;
  for (let y = 0; y < height; y += step) {
    const dy = Math.min(depthMap.height - 1, Math.round((y / height) * depthMap.height));
    for (let x = 0; x < width; x += step) {
      const i = y * width + x;
      if (!mask[i]) continue;
      const dx = Math.min(depthMap.width - 1, Math.round((x / width) * depthMap.width));
      values.push(depthMap.gray[dy * depthMap.width + dx]);
    }
  }
  if (values.length < 16) return null;
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}
