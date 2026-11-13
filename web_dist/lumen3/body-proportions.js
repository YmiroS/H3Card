import {repairMannequinWeights} from './skin-regions.js?v=45';
import {smoothSkinNormals} from './smooth-skin.js?v=45';
import * as T from 'three';
export const PROPORTION_FIELDS=[['head','头部大小'],['torso','躯干长度'],['shoulder_width','肩宽'],['hip_width','胯宽'],['upper_arm','上臂长度'],['forearm','前臂长度'],['thigh','大腿长度'],['shin','小腿长度']];
export const DEFAULT_PROPORTIONS=Object.fromEntries(PROPORTION_FIELDS.map(([k])=>[k,1]));
export function cleanProportions(values={}){return Object.fromEntries(PROPORTION_FIELDS.map(([k])=>[k,T.MathUtils.clamp(Number.isFinite(values[k])?values[k]:1,k==='head'?.55:.65,k==='head'?1.65:1.5)]));}
// Relative lengths only. No physical height or head top/chin measurement is available from Pose-33.
export function estimateBodyProportions(estimate,standing,{depthSource='unknown',current=DEFAULT_PROPORTIONS}={}){
 const p=estimate.pose,points=estimate.points,V=a=>new T.Vector3().fromArray(a),d=(pose,a,b)=>V(pose[a]).distanceTo(V(pose[b])),mid=(pose,a,b)=>V(pose[a]).lerp(V(pose[b]),.5);
 const torso=mid(p,'ls','rs').distanceTo(mid(p,'lhip','rhip')),baseTorso=mid(standing,'ls','rs').distanceTo(mid(standing,'lhip','rhip'));
 const usable=k=>points[k]?.visibility>=.5&&points[k].u>=0&&points[k].u<=1&&points[k].v>=0&&points[k].v<=1;
 if(!['ls','rs','lhip','rhip'].every(usable)||torso<.1)return {available:false,reason:'肩部或髋部被遮挡，保留当前比例。'};
 const priorHead=cleanProportions(current).head,factors={...DEFAULT_PROPORTIONS,head:priorHead>=.9?priorHead:1},estimated=[];let headReason=priorHead<.9?'头部证据不足，恢复原始头部比例，避免异常缩小':'耳点或正脸证据不足，保留头部原比例';
 for(const[key,a,b]of [['upper_arm','s','e'],['forearm','e','w'],['thigh','hip','k'],['shin','k','a']]){
  const values=['l','r'].filter(side=>usable(side+a)&&usable(side+b)).map(side=>d(p,side+a,side+b)/torso/(d(standing,side+a,side+b)/baseTorso));
  if(values.length){factors[key]=depthSource==='unmeasured_planar'?Math.max(...values):values.reduce((a,b)=>a+b,0)/values.length;estimated.push(key);}
 }
 factors.shoulder_width=d(p,'ls','rs')/torso/(d(standing,'ls','rs')/baseTorso);factors.hip_width=d(p,'lhip','rhip')/torso/(d(standing,'lhip','rhip')/baseTorso);estimated.push('shoulder_width','hip_width');
 // Ears supply a conservative skull-width proxy, not a claim to segment hair or identify the chin.
 if(Number.isFinite(estimate.headWidth)&&estimate.headWidth>0&&estimate.headConfidence>=.7&&estimate.headEvidence?.frontal){const candidate=estimate.headWidth*1.45/torso/(.25/baseTorso);if(candidate>=.75&&candidate<=1.5){factors.head=T.MathUtils.clamp(candidate,.9,1.2);estimated.push('head');headReason='正脸耳宽估计；自动调整限定为原白模的 0.90–1.20 倍';}else headReason='头部尺度与躯干不一致，保留头部原比例';}
 const profile=cleanProportions(factors),height=baseTorso+.22+.11+(.405*profile.thigh+.42*profile.shin)+.25*profile.head;
 return {available:true,profile,head_reason:headReason,estimated_fields:estimated,head_body_ratio:+(height/(.25*profile.head)).toFixed(1),method:'confidence_gated_relative_segment_lengths_and_ear_width_head_proxy',depth_source:depthSource,scale_measured:false,reason:'头身与肢体比例为估计；遮挡、透视缩短和发型需人工核对。'};
}

export function createProportionShape(raw,local,rest,onRestChanged){
 const baseLocal=new Map([...local].map(([b,v])=>[b,{p:v.p.clone(),q:v.q.clone(),s:v.s.clone()}]));
 raw.updateMatrixWorld(true);const bindRaw=raw.matrixWorld.clone(),baseWorld=new Map([...local.keys()].map(b=>[b,b.matrixWorld.clone()])),meshes=[];
 const independent=new Set();raw.traverse(m=>{if(!m.isSkinnedMesh)return;if(!independent.has(m.skeleton)){m.skeleton.boneInverses=m.skeleton.boneInverses.map(matrix=>matrix.clone());independent.add(m.skeleton);}const geometry=m.geometry.clone();smoothSkinNormals(geometry);m.geometry=geometry;meshes.push({m,geometry,positions:geometry.attributes.position.array.slice(),world:m.matrixWorld.clone()});});
 const binding=meshes.map(({m})=>repairMannequinWeights(m,rest));
 let profile={...DEFAULT_PROPORTIONS},metadata=null;
 const canonical=new Map();for(const b of local.keys())if(!canonical.has(b.name))canonical.set(b.name,b);
 function segmentDirection(b,base){const suffix=b.name.replace(/^mixamorig/,''),match=suffix.match(/^(Left|Right)(ForeArm|Arm|UpLeg|Leg|Shoulder)$/),direct={Spine:'Spine1',Spine1:'Spine2',Spine2:'Neck',Neck:'Head'},chain={ForeArm:'Hand',Arm:'ForeArm',UpLeg:'Leg',Leg:'Foot',Shoulder:'Arm'};const next=direct[suffix]||(match?match[1]+chain[match[2]]:null),child=next?canonical.get('mixamorig'+next):null;if(child)return new T.Vector3().setFromMatrixPosition(baseWorld.get(child)).applyMatrix4(base.clone().invert());return new T.Vector3(0,1,0);}

 const axisStretch=(direction,scale)=>{const v=direction.clone().normalize(),m=new T.Matrix4(),e=m.elements,a=[v.x,v.y,v.z];for(let row=0;row<3;row++)for(let col=0;col<3;col++)e[col*4+row]+=(scale-1)*a[row]*a[col];return m;};
 function segmentScale(name){return /ForeArm$/.test(name)?profile.forearm:/Arm$/.test(name)?profile.upper_arm:/UpLeg$/.test(name)?profile.thigh:/Leg$/.test(name)?profile.shin:/Shoulder$/.test(name)?profile.shoulder_width:/^(Spine\d*|Neck)$/.test(name)?profile.torso:1;}
 function apply(values,info=null){const next=cleanProportions(values);metadata=info;if(JSON.stringify(next)===JSON.stringify(profile))return false;profile=next;
  for(const[b,v]of baseLocal){b.position.copy(v.p);b.quaternion.copy(v.q);b.scale.copy(v.s);const name=b.name.replace(/^mixamorig/,'');
   const factor=/ForeArm$/.test(name)?profile.upper_arm:/Hand$/.test(name)?profile.forearm:/Leg$/.test(name)&&!/UpLeg$/.test(name)?profile.thigh:/Foot$/.test(name)?profile.shin:/Arm$/.test(name)&&!/ForeArm$/.test(name)?profile.shoulder_width:/^(Spine\d*|LumbarBase|LumbarBend|Neck|Head)$/.test(name)?profile.torso:/HeadTop_End$/.test(name)?profile.head:1;
   b.position.multiplyScalar(factor);if(/UpLeg$/.test(name))b.position.x*=profile.hip_width;
   local.set(b,{p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()});
  }
  raw.updateMatrixWorld(true);const toBind=bindRaw.clone().multiply(raw.matrixWorld.clone().invert()),deform=new Map();
  for(const[b,base]of baseWorld){const name=b.name.replace(/^mixamorig/,''),direction=segmentDirection(b,base);let stretch=axisStretch(direction||new T.Vector3(0,1,0),segmentScale(name));
   if(name==='Head')stretch.makeScale(profile.head,profile.head,profile.head);if(name==='Hips')stretch.makeScale(profile.hip_width,1,1);
   deform.set(b,toBind.clone().multiply(b.matrixWorld).multiply(stretch).multiply(base.clone().invert()));
   const world=toBind.clone().multiply(b.matrixWorld);if(rest[b.name]&&baseWorld.has(b)){rest[b.name].p.setFromMatrixPosition(world);world.decompose(new T.Vector3(),rest[b.name].q,new T.Vector3());}
  }
  for(const {m,geometry,positions,world}of meshes){const matrices=m.skeleton.bones.map(b=>world.clone().invert().multiply(deform.get(b)||new T.Matrix4()).multiply(world)),position=geometry.attributes.position,index=geometry.attributes.skinIndex,weight=geometry.attributes.skinWeight,v=new T.Vector3(),sum=new T.Vector3();
   for(let i=0;i<position.count;i++){v.fromArray(positions,i*3);sum.set(0,0,0);let total=0;const shapeBone=geometry.getAttribute('lumenShapeBone')?.getX(i);if(shapeBone>=0&&matrices[shapeBone]){sum.copy(v).applyMatrix4(matrices[shapeBone]);total=1;}else for(let j=0;j<4;j++){const w=weight.getComponent(i,j),bone=index.getComponent(i,j);if(w>0&&matrices[bone]){sum.addScaledVector(v.clone().applyMatrix4(matrices[bone]),w);total+=w;}}if(!total)sum.copy(v);position.setXYZ(i,sum.x,sum.y,sum.z);}
   position.needsUpdate=true;m.boundingBox=null;m.boundingSphere=null;smoothSkinNormals(geometry);geometry.computeBoundingBox();geometry.computeBoundingSphere();
  }
  const skeletons=new Set(meshes.map(x=>x.m.skeleton));for(const skeleton of skeletons)skeleton.calculateInverses();for(const {m}of meshes)m.bind(m.skeleton,m.matrixWorld.clone());onRestChanged();return true;
 }
 return {apply,binding:()=>binding,profile:()=>({...profile}),metadata:()=>metadata,dispose(){for(const {geometry}of meshes)geometry.dispose();}};
}
