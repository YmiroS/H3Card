import * as T from 'three';
// Fixed lengths; elbow hint selects the bend plane rather than moving bones apart.
export function solveTwoBone(root,wrist,hint,a,b){
 const axis=wrist.clone().sub(root),raw=axis.length();if(raw<1e-6)axis.set(0,-1,0);else axis.divideScalar(raw);
 const distance=T.MathUtils.clamp(raw,Math.abs(a-b)+.005,a+b-.002),end=root.clone().addScaledVector(axis,distance);
 const along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along));
 const bend=hint.clone().sub(root).addScaledVector(axis,-hint.clone().sub(root).dot(axis));
 if(bend.lengthSq()<1e-8)bend.crossVectors(axis,new T.Vector3(0,0,1));if(bend.lengthSq()<1e-8)bend.crossVectors(axis,new T.Vector3(1,0,0));bend.normalize();
 return {elbow:root.clone().addScaledVector(axis,along).addScaledVector(bend,height),wrist:end,clamped:Math.abs(raw-distance)>.005};
}
export function validateArmLandmarks(points,world,aspect=1){
 const warnings=[];
 for(const k of ['l','r']){const keys=[k+'s',k+'e',k+'w'],p=keys.map(key=>points[key]);if(p.some(p=>!p)){warnings.push({side:k,reason:'肩、肘、腕未完整可靠识别'});continue;}
 const delta=(a,b)=>new T.Vector2((b.u-a.u)*aspect,a.v-b.v),upper=delta(p[0],p[1]),lower=delta(p[1],p[2]);
 let reason='';if(Math.min(upper.length(),lower.length())<.025)reason='肘腕标点过近或严重缩短';
 if(Math.max(upper.length(),lower.length())/Math.max(.001,Math.min(upper.length(),lower.length()))>3.8)reason='上臂与前臂投影比例异常，可能被武器/服装干扰';
 for(let i=0;i<2;i++){const a=world[keys[i]],b=world[keys[i+1]];if(!a||!b)continue;const d=new T.Vector2(b[0]-a[0],b[1]-a[1]),v=i?lower:upper;if(d.length()>.03&&v.length()>.025&&d.normalize().dot(v.clone().normalize())<.25)reason='二维标点与三维预测的手臂方向冲突';}
 if(reason)warnings.push({side:k,reason});
 }
 return warnings;
}
