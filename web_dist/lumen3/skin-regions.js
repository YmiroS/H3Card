import * as T from 'three';
// Torso regions stay attached to their anatomical controls. The lateral chest,
// axilla and upper back receive smoothly fading ipsilateral shoulder influence.
export function repairMannequinWeights(mesh,rest){
 const geometry=mesh.geometry,p=geometry.attributes.position,index=geometry.index,skin=geometry.attributes.skinIndex,weights=geometry.attributes.skinWeight;
 let repaired=0,normalized=0;const regions=[],muscle={Left:0,Right:0};const shapeBone=new Int16Array(p.count).fill(-1),smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);
 if(mesh.name==='Alpha_Surface'){
  const parent=new Int32Array(p.count),seen=new Map();for(let i=0;i<p.count;i++)parent[i]=i;
  const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;},join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a;};
  for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',');if(seen.has(key))join(i,seen.get(key));else seen.set(key,i);}
  for(let i=0,n=index?index.count:p.count;i<n;i+=3){const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;join(a,b);join(a,c);}
  const parts=new Map(),v=new T.Vector3();
  for(let i=0;i<p.count;i++){const id=find(i);let part=parts.get(id);if(!part){part={vertices:[],box:new T.Box3(),torso:0};parts.set(id,part);}part.vertices.push(i);part.box.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld));for(let j=0;j<4;j++){const name=mesh.skeleton.bones[skin.getComponent(i,j)]?.name||'';if(/^mixamorig(Hips|Spine\d*|LeftShoulder|RightShoulder|Neck|Head)$/.test(name))part.torso+=weights.getComponent(i,j);}}
  const hip=rest.mixamorigHips.p.y,spine=rest.mixamorigSpine.p.y,chest=rest.mixamorigSpine1.p.y,neck=rest.mixamorigNeck.p.y;
  for(const part of parts.values()){
   const {box,vertices}=part;if(vertices.length<100||part.torso/vertices.length<.98||box.min.x>=0||box.max.x<=0||box.min.y<hip-.22||box.max.y>neck+.1)continue;
   const center=box.getCenter(new T.Vector3()),name=center.y<spine?'mixamorigHips':center.y<chest?'mixamorigSpine':'mixamorigSpine1',bone=mesh.skeleton.bones.findIndex(b=>b.name===name);if(bone<0)continue;
   for(const i of vertices){
    skin.setXYZW(i,bone,0,0,0);weights.setXYZW(i,1,0,0,0);
    if(name==='mixamorigSpine1'){
     shapeBone[i]=bone;const point=v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld),side=point.x>=0?'Left':'Right',arm=rest['mixamorig'+side+'Arm'].p,half=Math.abs(arm.x),height=(point.y-box.min.y)/(box.max.y-box.min.y),lateral=smooth(.24,1.03,Math.abs(point.x)/half),front=smooth(-.07,.025,point.z),upper=smooth(.16,.72,height),pec=front*upper*.46,lat=(1-front)*smooth(.08,.4,height)*(1-smooth(.72,1,height))*.3,deltoid=smooth(.65,.97,Math.abs(point.x)/half)*smooth(.58,.88,height)*.16,w=Math.min(.58,lateral*(pec+lat)+deltoid),armIndex=mesh.skeleton.bones.findIndex(b=>b.name==='mixamorig'+side+'Arm'),clavicle=mesh.skeleton.bones.findIndex(b=>b.name==='mixamorig'+side+'Shoulder');
     if(w>.0001&&armIndex>=0&&clavicle>=0){skin.setXYZW(i,bone,armIndex,clavicle,0);weights.setXYZW(i,1-w,w*.75,w*.25,0);muscle[side]++;}
    }
   }repaired+=vertices.length;regions.push({control:name,vertices:vertices.length,bind_bounds:{min:box.min.toArray(),max:box.max.toArray()}});
  }
 }
 for(let i=0;i<weights.count;i++){let sum=0;for(let j=0;j<4;j++){const valid=skin.getComponent(i,j)<mesh.skeleton.bones.length,w=weights.getComponent(i,j);const value=valid&&Number.isFinite(w)?Math.max(0,w):0;weights.setComponent(i,j,value);sum+=value;}if(sum<1e-8){skin.setXYZW(i,0,0,0,0);weights.setXYZW(i,1,0,0,0);normalized++;}else if(Math.abs(sum-1)>1e-6){for(let j=0;j<4;j++)weights.setComponent(i,j,weights.getComponent(i,j)/sum);normalized++;}}
 geometry.setAttribute('lumenShapeBone',new T.Int16BufferAttribute(shapeBone,1));skin.needsUpdate=true;weights.needsUpdate=true;return{mesh:mesh.name,repaired_vertices:repaired,normalized_vertices:normalized,regions,shoulder_muscle_vertices:muscle,shoulder_weight_max:.58,shoulder_policy:'smooth ipsilateral pectoral, deltoid, axillary and latissimus proxy influence; central chest and opposite side anchored'};
}
