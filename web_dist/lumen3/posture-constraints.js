import * as T from 'three';
export function constrainPosture(pose,{torso='auto',head='auto',headPitch=15,anatomical=false}={}){
 const p=Object.fromEntries(Object.entries(pose).map(([k,v])=>[k,new T.Vector3().fromArray(v)]));
 if(!p.pelvis||!p.neck)return pose;
 const up=new T.Vector3(0,1,0),lateral=(anatomical?p.ls.clone().sub(p.rs):p.rs.clone().sub(p.ls));lateral.y=0;if(lateral.lengthSq()<1e-6)lateral.set(1,0,0);lateral.normalize();
 const forward=lateral.clone().cross(up).normalize();
 if(torso==='upright')p.neck.copy(p.pelvis).addScaledVector(up,.4983).addScaledVector(forward,-.03474);
 if(head!=='auto'){const amount=T.MathUtils.clamp(Number.isFinite(headPitch)?Math.abs(headPitch):15,0,45),pitch=head==='up'?amount:head==='down'?-amount:0;p.head=p.neck.clone().addScaledVector(up,.18587).addScaledVector(forward,.06113);p.nose=p.head.clone().addScaledVector(forward,.14*Math.cos(T.MathUtils.degToRad(pitch))).addScaledVector(up,.14*Math.sin(T.MathUtils.degToRad(pitch)));}
 return Object.fromEntries(Object.entries(p).map(([k,v])=>[k,v.toArray()]));
}
