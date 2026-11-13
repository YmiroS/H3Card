// 分区边界与原图强边缘的贴合度：只回答「这块色的边缘画得准不准」，不回答「人是不是这个人」。
//
// 顺带算「蒙版里有多少像素涂在暗背景上」：2026-11-12 实测云端会把人物投在幕布上的投影一起画进分区
// （三人舞图每人 22%–35%）。投影边缘是柔和的渐暗，常够不上强边缘门槛，所以贴不贴得住那把尺子只在
// 「轮廓压在暗背景上」那一组里失分（改前暗处贴住率 24%–45%，加影子条款后 96%–100%），整体档位看不出来——
// 要落到「去编辑器把影子涂黑」这个动作，得单列这个占比，而且只跟同一次分区里最低那位比（见下面那条门槛的注释）。
//
// 为什么要逐人三档、不给一个全局分数：2026-11-12 实测同一次云端返回里，逐人位移方向不一致
// （方向一致性 0.24–0.26），按整幅最优平移最多只能省 8–26%，所以「全局套准」是假解药；
// 只有「谁偏得明显」这个信息能落到「去编辑器里改那一个」的动作上。
//
// 测算一律在缩样上做（长边 ≤480）：原图可以到 6336×2688，全分辨率跑边缘图 + 距离变换会把主线程
// 卡死几十秒。容差按原图像素给定，换算到缩样格子，所以口径仍是「离真实边缘几个原图像素」。

/** 缩样长边：贴合度是指示器不是测量仪，480 已经够把「差 2px」和「差 40px」分开。 */
export const FIT_SAMPLE_LONG_EDGE = 480;

/** 容差（原图像素）：边界落在这条范围内算「贴住了」。 */
export const FIT_TOLERANCE_NATURAL_PX = 4;

/** Sobel 幅值门槛（0–255 亮度）：低于这条的边缘多是皮肤/布料的渐变，不当作轮廓证据。 */
export const FIT_EDGE_MIN_GRADIENT = 40;

/**
 * 暗背景门槛（Rec.709 亮度 0–255）：幕布/墙面/地面的投影落在这条以下。
 * 70 是 2026-11-12 三人舞图实测那档：分区涂进暗幕布的每人 22%–35% 像素都在它下面。
 */
export const FIT_DARK_LUMA_MAX = 70;

/**
 * 「疑似含投影」的相对门槛：这一位的暗背景占比，比同一次分区里最低那位多出多少才报。
 *
 * 为什么不再是绝对占比（原为 ≥15%）：2026-11-12 拿三份分区图同尺量过——
 * 三人舞实拍整幅 75% 像素本来就暗，加影子条款前每人 22%–35%、加完只剩 6%–9%；
 * 而 11-11 老链路那份边缘贴得住（±4px 内 86%/100%）的分区图，因为人和幕布都是暗的，
 * 也算得出 66%/72%。同一档绝对值在两种图上说的是反话，所以只能跟同一张图里的其他人比。
 * 0.08 是照这三份的实测分布定的：改前有两位分别超出 13.4%、9.1%（都被点出来），
 * 而改后最大 3.2%、老链路最大 3.2%（缩样口径；全分辨率量到 5.2%），离线都还有一倍以上余量。
 *
 * 这条只看「比同图别人多出来的那部分」，所以只有 1 人分区时永远不报——没有对照。
 * 全部人都被涂进投影时，最低那位也当底，同样不报；宁可漏报也不拿暗场景误报。
 */
export const FIT_SHADOW_SUSPECT_EXCESS = 0.08;

/** 描边图里疑似投影用这个色整片涂出来：要回答的是「擦哪一块」，不是「边缘准不准」。 */
export const FIT_SHADOW_COLOR = '#9A6BE0';

/** 三档：邻近率 ≥70% 贴得住、≥40% 略偏、再低就是明显跑偏。 */
export const FIT_GRADES = [
  { key: 'good', min: 0.7, label: '贴得住', color: '#8FB06A' },
  { key: 'fair', min: 0.4, label: '略偏', color: '#FFD08A' },
  { key: 'poor', min: 0, label: '明显跑偏', color: '#E4746B' },
];

export function fitGrade(ratio) {
  if (!Number.isFinite(ratio)) return FIT_GRADES[2];
  for (const grade of FIT_GRADES) if (ratio >= grade.min) return grade;
  return FIT_GRADES[FIT_GRADES.length - 1];
}

/** 缩样尺寸：长边不超过 limit，等比取整，至少 1px。 */
export function sampleSize(width, height, limit = FIT_SAMPLE_LONG_EDGE) {
  const scale = Math.min(1, limit / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

/** RGBA → 亮度（Rec.709，和融合度度量那条口径一致；OpenCV 的 L 通道不能用在这里）。 */
export function luminance(rgba, width, height) {
  const out = new Float32Array(width * height);
  for (let at = 0; at < out.length; at += 1) {
    const p = at * 4;
    out[at] = (rgba[p] ?? 0) * 0.2126 + (rgba[p + 1] ?? 0) * 0.7152 + (rgba[p + 2] ?? 0) * 0.0722;
  }
  return out;
}

/** 强边缘图：Sobel 幅值过门槛即为 1；边界一圈按「谁都不是」处理，不产证据。 */
export function strongEdges(luma, width, height, minGradient = FIT_EDGE_MIN_GRADIENT) {
  const edges = new Uint8Array(width * height);
  const at = (x, y) => y * width + x;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const gx =
        -luma[at(x - 1, y - 1)] + luma[at(x + 1, y - 1)]
        - 2 * luma[at(x - 1, y)] + 2 * luma[at(x + 1, y)]
        - luma[at(x - 1, y + 1)] + luma[at(x + 1, y + 1)];
      const gy =
        -luma[at(x - 1, y - 1)] - 2 * luma[at(x, y - 1)] - luma[at(x + 1, y - 1)]
        + luma[at(x - 1, y + 1)] + 2 * luma[at(x, y + 1)] + luma[at(x + 1, y + 1)];
      if (Math.hypot(gx, gy) >= minGradient) edges[at(x, y)] = 1;
    }
  }
  return edges;
}

/** 到最近强边缘的 chamfer 距离（直线权重 3、对角 4，所以 1 缩样像素 = 3 单位）。 */
export function edgeDistance(edges, width, height) {
  const far = Number.POSITIVE_INFINITY;
  const d = new Float32Array(edges.length);
  for (let i = 0; i < d.length; i += 1) d[i] = edges[i] ? 0 : far;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = y * width + x;
      let v = d[at];
      if (x > 0) v = Math.min(v, d[at - 1] + 3);
      if (y > 0) v = Math.min(v, d[at - width] + 3);
      if (x > 0 && y > 0) v = Math.min(v, d[at - width - 1] + 4);
      if (x < width - 1 && y > 0) v = Math.min(v, d[at - width + 1] + 4);
      d[at] = v;
    }
  }
  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = width - 1; x >= 0; x -= 1) {
      const at = y * width + x;
      let v = d[at];
      if (x < width - 1) v = Math.min(v, d[at + 1] + 3);
      if (y < height - 1) v = Math.min(v, d[at + width] + 3);
      if (x < width - 1 && y < height - 1) v = Math.min(v, d[at + width + 1] + 4);
      if (x > 0 && y < height - 1) v = Math.min(v, d[at + width - 1] + 4);
      d[at] = v;
    }
  }
  return d;
}

/** 索引层最近邻缩样：身份号 ≤255，一个像素一个字节就装得下。 */
export function downsampleIndex(layer, width, height) {
  const out = new Uint8Array(width * height);
  const stepX = layer.width / width;
  const stepY = layer.height / height;
  for (let y = 0; y < height; y += 1) {
    const sy = Math.min(layer.height - 1, Math.floor((y + 0.5) * stepY));
    const srcRow = sy * layer.width;
    const dstRow = y * width;
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(layer.width - 1, Math.floor((x + 0.5) * stepX));
      out[dstRow + x] = layer.data[srcRow + sx] ?? 0;
    }
  }
  return out;
}

/** 轮廓像素：属于某个身份、且四邻里有不同号的格；返回每个身份的轮廓清单。 */
export function identityBoundaries(index, width, height) {
  const owners = new Map();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = y * width + x;
      const owner = index[at];
      if (!owner) continue;
      const different =
        (x > 0 && index[at - 1] !== owner) ||
        (x < width - 1 && index[at + 1] !== owner) ||
        (y > 0 && index[at - width] !== owner) ||
        (y < height - 1 && index[at + width] !== owner);
      if (!different) continue;
      let list = owners.get(owner);
      if (!list) owners.set(owner, (list = []));
      list.push(at);
    }
  }
  return { owners, index };
}

/**
 * 一份分区层对一张原图的逐人贴合度 + 「只看对不齐」描边图。
 *
 * `rgba` 必须是按 `size` 缩样后的原图像素（调用方负责 drawImage），尺寸对不上直接抛，
 * 不拿两套尺寸混着算——那正是「人对了位错了」的成因。
 */
export function measureSegmentFit(layer, rgba, size) {
  const { width, height, scale } = size;
  if (rgba.length < width * height * 4) {
    throw new Error(`缩样像素不够 ${width}×${height}，没法算贴合度。`);
  }
  const luma = luminance(rgba, width, height);
  const distance = edgeDistance(strongEdges(luma, width, height), width, height);
  // 原图像素 → 缩样格子是乘 scale，缩样格子 → chamfer 单位是乘 3：写成除会把容差放大 1/scale² 倍，
  // 1044 宽的图等于拿 ±19 像素的尺去量 ±4 像素的口径，跑偏的分区也会被念成「贴得住」。
  // 容差至少留一格：6K 原图缩到 480 后 ±4 像素连半个格都不到，量化本身会把每个人都判成跑偏。
  const tolerance = Math.max(3, 3 * FIT_TOLERANCE_NATURAL_PX * Math.max(scale, 1e-6));
  const { owners, index } = identityBoundaries(downsampleIndex(layer, width, height), width, height);
  const outline = new Uint8ClampedArray(width * height * 4);
  // 逐人统计整块蒙版（不只轮廓）：暗像素占比回答的是「这片色涂到了暗背景上没有」。
  const areas = new Map();
  for (let at = 0; at < index.length; at += 1) {
    const owner = index[at];
    if (!owner) continue;
    let stat = areas.get(owner);
    if (!stat) areas.set(owner, (stat = { total: 0, dark: 0 }));
    stat.total += 1;
    if (luma[at] <= FIT_DARK_LUMA_MAX) stat.dark += 1;
  }
  const darkRatioOf = (owner) => {
    const stat = areas.get(owner);
    return stat && stat.total ? stat.dark / stat.total : 0;
  };
  // 同一次分区里「涂在暗背景上最少」的那一位当场景底：暗幕布、暗衣服、暗人都抬这一位，
  // 也抬其他人，所以只有超出它的部分才是「多画了一块影子」的信号。
  // 底只能从「算得是一个人」的分片里挑：一两格的碎条占比天然是 0，拿它当底会把所有人都判成带影子。
  const biggest = Math.max(0, ...[...areas.values()].map((stat) => stat.total));
  const peers = [...areas.entries()].filter(([, stat]) => stat.total >= 0.2 * biggest);
  const darkRatioFloor = peers.length ? Math.min(...peers.map(([owner]) => darkRatioOf(owner))) : 0;
  const excessOf = (owner) => darkRatioOf(owner) - darkRatioFloor;
  // 超出过线的整片涂出来：先铺影子，轮廓后画并盖在上面，所以「哪里偏」和「哪片是影子」不打架。
  const suspects = [...areas.keys()].filter((owner) => excessOf(owner) >= FIT_SHADOW_SUSPECT_EXCESS);
  if (suspects.length) {
    const rgb = parseInt(FIT_SHADOW_COLOR.slice(1), 16);
    const want = new Set(suspects);
    for (let at = 0; at < index.length; at += 1) {
      if (!want.has(index[at]) || luma[at] > FIT_DARK_LUMA_MAX) continue;
      const p = at * 4;
      outline[p] = (rgb >> 16) & 255;
      outline[p + 1] = (rgb >> 8) & 255;
      outline[p + 2] = rgb & 255;
      outline[p + 3] = 255;
    }
  }
  const scores = [];
  for (const [owner, list] of [...owners.entries()].sort((a, b) => a[0] - b[0])) {
    let near = 0;
    for (const at of list) {
      const ok = distance[at] <= tolerance;
      if (ok) near += 1;
      const grade = ok ? FIT_GRADES[0] : FIT_GRADES[2];
      const rgb = parseInt(grade.color.slice(1), 16);
      const p = at * 4;
      outline[p] = (rgb >> 16) & 255;
      outline[p + 1] = (rgb >> 8) & 255;
      outline[p + 2] = rgb & 255;
      outline[p + 3] = 255;
    }
    const ratio = list.length ? near / list.length : 0;
    const darkRatio = darkRatioOf(owner);
    scores.push({
      index: owner,
      boundary: list.length,
      ratio,
      grade: fitGrade(ratio),
      darkRatio,
      darkExcess: excessOf(owner),
      shadowSuspect: excessOf(owner) >= FIT_SHADOW_SUSPECT_EXCESS,
    });
  }
  // 轮廓归属信息给调用方留着：描边图只画得出色，谁是谁要靠号。
  // toleranceEffectiveNaturalPx 是这一把尺实际等价的原图像素（不足一格时会被放大到一格），
  // 界面那句「±几个像素」要说的是它，不然 6K 图上写的 ±4 与实际判据不符。
  return {
    width,
    height,
    scale,
    toleranceNaturalPx: FIT_TOLERANCE_NATURAL_PX,
    toleranceUnits: tolerance,
    toleranceEffectiveNaturalPx: tolerance / (3 * Math.max(scale, 1e-6)),
    darkLumaMax: FIT_DARK_LUMA_MAX,
    darkRatioFloor,
    shadowSuspectExcess: FIT_SHADOW_SUSPECT_EXCESS,
    scores,
    outline,
    index,
  };
}
