// 深度图辅助的多人定深与地面接触校正。
// 深度图来自项目节点 depth_image 能力（Depth Anything 3）：白色=较近、黑色=较远，是相对深度（视差口径），不含绝对米制。
// 用法约定：只用它修「人与人之间的相对深度」和「落地」，绝对尺度仍锚在骨长估深上，不单独相信深度图。
export async function loadDepthMap(dataUrl){
  const image=new Image();
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('深度图无法读取'));image.src=dataUrl;});
  const canvas=document.createElement('canvas');
  canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,0,0);
  const {data,width,height}=ctx.getImageData(0,0,canvas.width,canvas.height);
  const gray=new Float32Array(width*height);
  for(let i=0,j=0;i<data.length;i+=4,j+=1)gray[j]=((data[i]+data[i+1]+data[i+2])/3)/255;
  return{gray,width,height};
}
function patchMedian(map,u,v,radius=2){
  const cx=Math.round(u*map.width),cy=Math.round(v*map.height);
  const values=[];
  for(let dy=-radius;dy<=radius;dy+=1)for(let dx=-radius;dx<=radius;dx+=1){
    const x=cx+dx,y=cy+dy;
    if(x<0||y<0||x>=map.width||y>=map.height)continue;
    values.push(map.gray[y*map.width+x]);
  }
  if(!values.length)return null;
  values.sort((a,b)=>a-b);
  return values[Math.floor(values.length/2)];
}
// 取每人躯干锚点（肩/髋，visibility≥.6）的深度图中位数；四肢太容易被遮挡和透视缩短，不用。
export function personNearness(map,points){
  const values=[];
  for(const key of ['ls','rs','lhip','rhip']){
    const p=points[key];
    if(!p||p.visibility<.6||p.u<0||p.u>1||p.v<0||p.v>1)continue;
    const sample=patchMedian(map,p.u,p.v);
    if(sample!==null)values.push(sample);
  }
  if(!values.length)return null;
  values.sort((a,b)=>a-b);
  return values[Math.floor(values.length/2)];
}
// 视差近似：depth ∝ 1/nearness。用骨长估深的几何中位数定绝对锚 K，只把人与人之间的相对关系交给深度图。
// nearness 拉不开（极差<3%）时视为同深，回退骨长估深——分不出差异就别硬造差异。
// 读数与骨长偏差>2 倍判为背景/遮挡污染，直接回退骨长；偏差在 2 倍内也最多让视差把人拉开 ±25%。
export function depthHintsFromNearness(nearness,fallbacks){
  const valid=nearness.map((n,i)=>({n,f:fallbacks[i]})).filter(x=>x.n!=null&&x.n>.02&&Number.isFinite(x.f)&&x.f>0);
  if(valid.length<2)return null;
  const nearValues=valid.map(x=>x.n);
  if((Math.max(...nearValues)-Math.min(...nearValues))/Math.max(...nearValues,.001)<.03)return null;
  const anchors=valid.map(x=>x.f*x.n).sort((a,b)=>a-b);
  const k=anchors[Math.floor(anchors.length/2)];
  return nearness.map((n,i)=>{
    if(n==null||n<=.02)return fallbacks[i];
    const hint=k/n;
    if(!Number.isFinite(hint))return fallbacks[i];
    // 视差与骨长估深是两套独立估计；hint 与骨长偏差超 2 倍说明这人锚点采到了背景/遮挡，
    // 该读数不可信，回退骨长（骨长是唯一独立绝对锚，不能让一个坏读数把人甩到 14m）。
    if(hint>fallbacks[i]*2||hint<fallbacks[i]*.5)return fallbacks[i];
    // 读数可信但差异接近噪声时，也不让视差把人拉开：hint 相对骨长最多偏 ±25%。
    return Math.min(40,Math.max(.5,Math.min(fallbacks[i]*1.25,Math.max(fallbacks[i]*.75,hint))));
  });
}
// 共面地面约束：多人站在同一地面，把候选触地关节里实际最低的点贴到 y=0。
// 候选关节可由云端拆分卡的触地方式指定（跪姿给膝、坐姿给髋）；默认踝/膝退化到髋。
// 在关节精化之后再调用，免得精化把落地位置又挪走。返回要加到所有关节 y 上的平移量。
export const GROUND_CANDIDATES={feet:['la','ra','lk','rk','lhip','rhip'],knees:['lk','rk','la','ra','lhip','rhip'],seated:['lhip','rhip'],airborne:[]};
// 没有深度图时的人与人前后兜底：站在同一地面的人，画面里接地点越低通常越近。
// 只取「谁比谁低」这个次序，读数本身是 v（0 顶 1 底），不是深度，别喂给视差公式。
export function contactNearness(points,bottom){
  let best=null;
  for(const key of GROUND_CANDIDATES.feet){
    const p=points[key];
    if(!p||p.visibility<.5||p.v<0||p.v>1)continue;
    if(!best||p.v>best.v)best={v:p.v,key};
  }
  if(best)return best;
  // 踝/膝/髋全不可见（被裁切或全遮挡）才退到这个人点云包围盒下沿；手举过头顶时它是唯一可用的脚位线索。
  return Number.isFinite(bottom)?{v:bottom,key:'bounds'}:null;
}
// 接地点高低只给次序、不给幅度：最低的人按骨长再拉近 12%，最高的推远 12%，中间线性插值。
// 比深度图那套 ±25% 更保守，因为高低同时受身高、姿势和相机俯仰影响；分不出高低就返回 null 不硬造。
export function depthHintsFromContact(reads,fallbacks){
  const valid=reads.map((r,i)=>({r,f:fallbacks[i]})).filter(x=>x.r&&Number.isFinite(x.f)&&x.f>0);
  if(valid.length<2)return null;
  const vs=valid.map(x=>x.r.v);
  if(Math.max(...vs)-Math.min(...vs)<.02)return null;
  const lo=Math.min(...vs),hi=Math.max(...vs);
  return reads.map((r,i)=>{
    if(!r||!Number.isFinite(fallbacks[i])||fallbacks[i]<=0)return fallbacks[i];
    const scale=1.12-.24*((r.v-lo)/(hi-lo));
    return Math.min(40,Math.max(.5,fallbacks[i]*scale));
  });
}
export function groundContactShift(pose,points,candidates=GROUND_CANDIDATES.feet){
  let best=null;
  for(const key of candidates){
    const p=points[key];
    if(!p||p.visibility<.5||!pose[key])continue;
    if(!best||pose[key][1]<best.y)best={key,y:pose[key][1]};
  }
  if(!best||Math.abs(best.y)<.005)return null;
  return{joint:best.key,shift:-best.y};
}
