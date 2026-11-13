import * as T from 'three';
const rad=T.MathUtils.degToRad,deg=T.MathUtils.radToDeg,Z=new T.Vector3(0,0,1);
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function twist(q,axis){const v=q.x*axis.x+q.y*axis.y+q.z*axis.z,t=new T.Quaternion(axis.x*v,axis.y*v,axis.z*v,q.w);return t.lengthSq()<1e-12?new T.Quaternion():t.normalize();}
function angle(q,axis){const t=twist(q,axis);return wrap(2*Math.atan2(t.x*axis.x+t.y*axis.y+t.z*axis.z,t.w));}
// These are conservative art-direction limits for the bundled proxy.
// They operate in the bind frame, so turning the whole character does not
// change the permitted bend direction or turn a left joint into a right joint.
export function createJointLimits(bones,rest,local){
 const B=n=>bones['mixamorig'+n],R=n=>rest['mixamorig'+n],hinges=new Map();let pelvisFrame=local.get(B('Hips')).q.clone();
 for(const side of ['Left','Right'])for(const [part,end,forward,max,twistMax] of [['ForeArm','Hand',1,150,80],['Leg','Foot',-1,145,0]]){
  const name=side+part,b=B(name),direction=R(side+end).p.clone().sub(R(name).p).normalize(),axis=direction.clone().cross(Z.clone().multiplyScalar(forward)).normalize();
  if(axis.lengthSq()<.5)axis.set(1,0,0);
  hinges.set(name,{bone:b,axis:axis.clone().applyQuaternion(R(name).q.clone().invert()).normalize(),worldAxis:axis,long:direction.clone().applyQuaternion(R(name).q.clone().invert()).normalize(),max:rad(max),twistMax:rad(twistMax)});
 }
 const delta=n=>local.get(B(n)).q.clone().invert().multiply(B(n).quaternion).normalize();
 function hinge(n){const h=hinges.get(n);if(!h)return null;const q=delta(n),t=twist(q,h.long),swing=q.clone().multiply(t.clone().invert()),flex=T.MathUtils.clamp(angle(swing,h.axis),0,h.max);return{...h,flex,twist:T.MathUtils.clamp(angle(t,h.long),-h.twistMax,h.twistMax)};}
 function setFlex(n,value){const h=hinge(n);if(!h)return false;const q=new T.Quaternion().setFromAxisAngle(h.axis,T.MathUtils.clamp(value,0,h.max)).multiply(new T.Quaternion().setFromAxisAngle(h.long,h.twist));h.bone.quaternion.copy(local.get(h.bone).q).multiply(q).normalize();h.bone.updateWorldMatrix(false,true);return true;}
 function eulerLimit(n,ranges,frame=local.get(B(n)).q){const b=B(n),basis=R(n).q,q=basis.clone().multiply(frame.clone().invert().multiply(b.quaternion)).multiply(basis.clone().invert()),e=new T.Euler().setFromQuaternion(q,'XYZ');for(const[a,min,max]of ranges)e[a]=T.MathUtils.clamp(e[a],rad(min),rad(max));b.quaternion.copy(frame).multiply(basis.clone().invert().multiply(new T.Quaternion().setFromEuler(e)).multiply(basis)).normalize();}
 function limitBone(n){const b=B(n);if(!b)return;
  if(hinges.has(n)){const h=hinge(n);setFlex(n,h.flex);return;}
  if(n==='Hips')eulerLimit(n,[['x',-25,25],['y',-45,45],['z',-20,20]],pelvisFrame);
  else if(/^Lumbar/.test(n))eulerLimit(n,[['x',-40,40],['y',-35,35],['z',-35,35]]);
  else if(/^Spine/.test(n))eulerLimit(n,[['x',-25,25],['y',-25,25],['z',-20,20]]);
  else if(/Shoulder$/.test(n)){const left=n.startsWith('Left');eulerLimit(n,[['x',-10,10],['y',-20,20],['z',left?-10:-25,left?25:10]]);}
  else if(/UpLeg$/.test(n)){const left=n.startsWith('Left');eulerLimit(n,[['x',-110,30],['y',-35,35],['z',left?-25:-45,left?45:25]]);}
  else if(/Arm$/.test(n)){const axis=R(n.replace('Arm','ForeArm')).p.clone().sub(R(n).p).normalize().applyQuaternion(R(n).q.clone().invert()),q=delta(n),t=twist(q,axis),s=q.clone().multiply(t.clone().invert()),a=s.angleTo(new T.Quaternion());if(a>rad(165))s.slerp(new T.Quaternion(),1-rad(165)/a);b.quaternion.copy(local.get(b).q).multiply(s).multiply(new T.Quaternion().setFromAxisAngle(axis,T.MathUtils.clamp(angle(t,axis),rad(-100),rad(100)))).normalize();}
  b.updateWorldMatrix(false,true);
 }
 function enforce(){for(const n of ['Hips','LumbarBase','LumbarBend','Spine','Spine1','Spine2',...['Left','Right'].flatMap(s=>[s+'Shoulder',s+'Arm',s+'UpLeg',s+'ForeArm',s+'Leg'])])limitBone(n);}
 function inferFrame(){const base=local.get(B('Hips')).q,basis=R('Hips').q,d=basis.clone().multiply(base.clone().invert().multiply(B('Hips').quaternion)).multiply(basis.clone().invert()),yaw=new T.Euler().setFromQuaternion(d,'YXZ').y;pelvisFrame.copy(base).multiply(basis.clone().invert().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw)).multiply(basis));}
 return{enforce,limitBone,setFlex,hinge:n=>{const h=hinge(n);if(!h)return null;h.bone.parent.updateWorldMatrix(true,false);return{angle_deg:deg(h.flex),min_deg:0,max_deg:deg(h.max),axis_world:h.axis.clone().applyQuaternion(local.get(h.bone).q).applyQuaternion(h.bone.parent.getWorldQuaternion(new T.Quaternion())).normalize(),rest_axis_world:h.worldAxis.clone()};},frame:()=>pelvisFrame.clone(),setFrame:q=>pelvisFrame.copy(q).normalize(),inferFrame,
  specification:()=>({basis:'shape-adjusted bind frame; whole-character frame excluded',elbow_flexion_deg:[0,150],knee_flexion_deg:[0,145],clavicle_elevation_deg:[-10,25],pelvis_pitch_deg:[-25,25],pelvis_roll_deg:[-20,20],hip_flexion_body_x_deg:[-110,30],hip_twist_deg:[-35,35],policy:'constrained IK/FK, fitting, restore and animation playback; proxy art-direction limits'})};
}
