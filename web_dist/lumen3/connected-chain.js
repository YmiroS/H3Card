import * as T from 'three';
// Solve in world space without translating a child bone away from its parent.
export function solveAttachedChain(root,target,hint,a,b){
 const axis=target.clone().sub(root),raw=axis.length();
 if(raw<1e-10){axis.copy(hint).sub(root);if(axis.lengthSq()<1e-12)axis.set(0,1,0);}axis.normalize();
 const distance=T.MathUtils.clamp(raw,Math.max(1e-9,Math.abs(a-b)),a+b),end=root.clone().addScaledVector(axis,distance);
 const along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along));
 const bend=hint.clone().sub(root);bend.addScaledVector(axis,-bend.dot(axis));
 if(bend.lengthSq()<1e-12)bend.crossVectors(axis,new T.Vector3(0,0,1));
 if(bend.lengthSq()<1e-12)bend.crossVectors(axis,new T.Vector3(1,0,0));
 return{joint:root.clone().addScaledVector(axis,along).addScaledVector(bend.normalize(),height),end};
}
export function solveAttachedPolyline(points,target,passes=40){
 const p=points.map(v=>v.clone()),root=p[0].clone(),length=p.slice(1).map((v,i)=>v.distanceTo(p[i])),original=p.slice(1).map((v,i)=>v.clone().sub(p[i]).normalize()),total=length.reduce((a,b)=>a+b,0),direction=target.clone().sub(root);
 if(direction.length()>=total){direction.normalize();for(let i=0;i<length.length;i++)p[i+1].copy(p[i]).addScaledVector(direction,length[i]);return p;}
 const step=(a,b,i,sign=1)=>{const d=a.clone().sub(b);if(d.lengthSq()<1e-16)d.copy(original[i]).multiplyScalar(sign);return b.clone().addScaledVector(d.normalize(),length[i]);};
 for(let pass=0;pass<passes;pass++){
  p.at(-1).copy(target);for(let i=length.length-1;i>=0;i--)p[i].copy(step(p[i],p[i+1],i,-1));
  p[0].copy(root);for(let i=0;i<length.length;i++)p[i+1].copy(step(p[i+1],p[i],i));
  if(p.at(-1).distanceTo(target)<1e-8)break;
 }
 return p;
}
