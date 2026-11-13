// 参考画面关节标签避让：纯函数，输入候选标签框，输出「放得下」的位置，放不下的直接不画。
// 之前每个点都在固定偏移处画名字，多人合照里 16 个标签有 8 组互相压字，读不出哪个点对应哪个关节。

const overlaps = (a, b) => a.x2 > b.x1 && b.x2 > a.x1 && a.y2 > b.y1 && b.y2 > a.y1;

/**
 * @param {Array<{key:string,x:number,y:number,w:number,priority?:number}>} items 期望的左下角锚点与估算宽度
 * @param {{bounds:{width:number,height:number},rowHeight?:number,gap?:number,attempts?:number}} options
 * @returns {Array<{key:string,x:number,y:number,shown:boolean}>} 按输入优先级依次落位
 */
export function placeLabels(
  items,
  {bounds, rowHeight = 13, gap = 2, attempts = 4} = {},
) {
  const box = (item, y) => ({
    x1: item.x,
    x2: item.x + item.w,
    y1: y - rowHeight,
    y2: y + gap,
  });
  const ordered = [...items].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  const placed = [];
  const result = new Map();
  for (const item of ordered) {
    const x = Math.max(2, Math.min(item.x, bounds.width - item.w - 2));
    let done = false;
    for (let n = 0; n <= attempts && !done; n++) {
      const offsets = n === 0 ? [0] : [-n * (rowHeight + gap), n * (rowHeight + gap)];
      for (const offset of offsets) {
        const y = item.y + offset;
        if (y - rowHeight < 0 || y + gap > bounds.height) continue;
        const rect = {...box(item, y), x1: x, x2: x + item.w};
        if (placed.some((p) => overlaps(p, rect))) continue;
        placed.push(rect);
        result.set(item.key, {...item, x, y, shown: true});
        done = true;
        break;
      }
    }
    if (!done) result.set(item.key, {...item, x, shown: false});
  }
  return items.map((item) => result.get(item.key));
}
