import * as T from 'three';
// 本页参考图是 object-fit:fill 铺满取景框的，归一化坐标即取景框坐标，不需要上游的 contain 信箱换算。
export function horizonOrientation(points,aspect,fov){
 if(!Array.isArray(points)||points.length!==2||points.some(p=>![p.u,p.v].every(Number.isFinite)))throw new Error('地平线需要两个有效端点');
 const t=Math.tan(T.MathUtils.degToRad(fov/2)),r=points.map(p=>new T.Vector3((2*p.u-1)*aspect*t,(1-2*p.v)*t,-1));
 const n=new T.Vector3().crossVectors(r[0],r[1]);if(n.length()<1e-5)throw new Error('地平线端点过近');n.normalize();if(n.y<0)n.negate();
 return{el:T.MathUtils.radToDeg(Math.asin(T.MathUtils.clamp(n.z,-1,1))),roll:T.MathUtils.radToDeg(Math.atan2(n.x,n.y)),normal:n.toArray()};
}
export function groundConstraint(value){
 if(!value?.enabled||!value.confirmed||!value.points||value.points.length!==2||value.points.some(p=>![p.u,p.v].every(Number.isFinite))||Math.hypot(value.points[0].u-value.points[1].u,value.points[0].v-value.points[1].v)<.02)return null;
 return{points:value.points.slice(),source:value.source||'manual_horizon',confidence:1};
}
// Conservative long horizontal edge candidate. Not a semantic ground detector:
// a floor boundary may not be the horizon, so confirmation is always required.
export function suggestHorizon({data,width,height}){
 if(width<16||height<16)return null;const scores=new Float64Array(height),bins=12;
 for(let y=3;y<height-3;y++){let strength=0,coverage=0;for(let b=0;b<bins;b++){let sum=0;for(let x=Math.floor(b*width/bins)+2;x<Math.floor((b+1)*width/bins)-2;x++){const i=((y-2)*width+x)*4,j=((y+2)*width+x)*4;sum+=Math.abs((data[j]+data[j+1]+data[j+2])-(data[i]+data[i+1]+data[i+2]))/3;}const mean=sum/(width/bins);strength+=Math.min(mean,55);if(mean>12)coverage++;}scores[y]=strength/bins*(coverage/bins)**3;}
 let best=3;for(let y=4;y<height-3;y++)if(scores[y]>scores[best])best=y;
 if(scores[best]<7)return null;return{points:[{u:.08,v:best/height},{u:.92,v:best/height}],source:'unconfirmed_horizontal_edge',confidence:Math.min(.65,scores[best]/100)};
}
