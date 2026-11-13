import * as T from 'three';
import {solveAttachedPolyline} from './connected-chain.js?v=45';
const Y=new T.Vector3(0,1,0);

// Two unweighted lumbar pivots give the waist a curved, connected rest chain.
// Existing weighted bones keep exactly the same bind-world transforms.
export function addLumbarPivots(raw){
 let spine;raw.traverse(b=>{if(!spine&&b.isBone&&b.name==='mixamorigSpine'&&b.parent?.name==='mixamorigHips')spine=b;});
 if(!spine)return;
 raw.updateMatrixWorld(true);const hips=spine.parent,p=hips.getWorldPosition(new T.Vector3()),end=spine.getWorldPosition(new T.Vector3()),middle=p.clone().lerp(end,.4).add(new T.Vector3(0,0,-p.distanceTo(end)*.35)),offset=hips.worldToLocal(middle);
 const base=new T.Bone(),bend=new T.Bone();base.name='mixamorigLumbarBase';bend.name='mixamorigLumbarBend';hips.add(base);base.add(bend);bend.position.copy(offset);bend.add(spine);spine.position.sub(offset);raw.updateMatrixWorld(true);
}

export function createPelvisCoupling({B,constraints,restoreNative,worldRotation,alignCurrent,solveLeg}){
 let last=null;
 function compensate(base,lift=null){
  const chest=base.controls.chest.p,chestQ=base.world.mixamorigSpine1;
  worldRotation('LumbarBase',base.world.mixamorigLumbarBase);
  const chain=['LumbarBase','LumbarBend','Spine','Spine1'];
  for(let pass=0;pass<8;pass++){
   const points=chain.map(n=>B(n).getWorldPosition(new T.Vector3())),solved=solveAttachedPolyline(points,chest);
   for(let i=0;i<3;i++)alignCurrent(chain[i],B(chain[i+1]).getWorldPosition(new T.Vector3()),solved[i+1]);
   if(B('Spine1').getWorldPosition(new T.Vector3()).distanceTo(chest)<1e-7)break;
  }
  worldRotation('Spine1',chestQ);
  const feet={};
  for(const side of ['Left','Right']){
   const key=base.anatomical?(side==='Left'?'l':'r'):(side==='Left'?'r':'l'),root=B(side+'UpLeg').getWorldPosition(new T.Vector3()),dy=lift?lift[side]:root.y-base.controls[key+'hip'].p.y,target=base.controls[key+'a'].p.clone().addScaledVector(Y,dy);
   solveLeg(side,target,base.controls[key+'k'].p.clone().addScaledVector(Y,dy));worldRotation(side+'Foot',base.world['mixamorig'+side+'Foot']);feet[side]=target;
  }
  constraints.enforce();
  const chestError=B('Spine1').getWorldPosition(new T.Vector3()).distanceTo(chest),orientationError=B('Spine1').getWorldQuaternion(new T.Quaternion()).angleTo(chestQ),footError=Math.max(...Object.entries(feet).map(([side,p])=>B(side+'Foot').getWorldPosition(new T.Vector3()).distanceTo(p)));
  return{chestError,orientationError,footError,valid:chestError<3e-5&&orientationError<1e-5&&footError<3e-5};
 }
 function edit(base,apply,verticalOnly=null){
  const attempt=t=>{let lift=null;if(verticalOnly){restoreNative(base);verticalOnly(t);lift=Object.fromEntries(['Left','Right'].map(side=>{const key=base.anatomical?(side==='Left'?'l':'r'):(side==='Left'?'r':'l');return[side,B(side+'UpLeg').getWorldPosition(new T.Vector3()).y-base.controls[key+'hip'].p.y];}));}restoreNative(base);apply(t);return compensate(base,lift);};
  let result=attempt(1),fraction=1;const requested=result;
  if(!result.valid){let low=0,high=1;for(let i=0;i<13;i++){const middle=(low+high)/2;if(attempt(middle).valid)low=middle;else high=middle;}fraction=low;result=attempt(fraction);if(!result.valid||fraction<.001){restoreNative(base);fraction=0;result={chestError:0,orientationError:0,footError:0,valid:true};}}
  last={limited:fraction<.999,fraction,...result,requested_errors:{chest_m:requested.chestError,orientation_rad:requested.orientationError,foot_m:requested.footError}};return last;
 }
 return{edit,clear:()=>{last=null;},info:()=>last};
}
