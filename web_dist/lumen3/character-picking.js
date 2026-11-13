import * as T from 'three';
import {worldUnitsPerPixel} from './viewport-picking.js?v=45';

const point=(joints,key)=>joints[key]?.position?.clone();
function shown(object){for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;}
export function characterSelectionRegions(joints){
 const distance=(a,b)=>joints[a]&&joints[b]?joints[a].position.distanceTo(joints[b].position):0,shoulder=distance('ls','rs')||distance('lhip','rhip')*1.6||.42,hip=distance('lhip','rhip')||shoulder*.6,regions=[];
 const add=(name,a,b,radius)=>{const start=point(joints,a),end=point(joints,b);if(start&&end&&[...start,...end,radius].every(Number.isFinite))regions.push({name,start,end,radius});};
 add('head','head','head',T.MathUtils.clamp(distance('neck','head')*.8,shoulder*.20,shoulder*.32));add('neck','neck','head',shoulder*.13);add('pelvis','lhip','rhip',hip*.4);add('lower torso','pelvis',joints.waist?'waist':'neck',Math.max(hip*.62,shoulder*.36));add('upper torso',joints.waist?'waist':'pelvis','neck',shoulder*.38);add('shoulders','ls','rs',shoulder*.18);
 for(const side of ['l','r']){add(side+' upper arm',side+'s',side+'e',shoulder*.17);add(side+' forearm',side+'e',side+'w',shoulder*.13);add(side+' hand',side+'w',side+'h',shoulder*.11);add(side+' thigh',side+'hip',side+'k',hip*.39);add(side+' calf',side+'k',side+'a',hip*.29);add(side+' foot',side+'a',side+'t',hip*.25);}
 return regions;
}
function hitCapsule(ray,start,end,radius){
 const origin=ray.ray.origin,direction=ray.ray.direction,axis=end.clone().sub(start),length=axis.length(),relative=origin.clone().sub(start);let best=Infinity;
 const accept=t=>{if(t>=ray.near&&t<=ray.far&&t<best)best=t;};
 if(length>1e-8){axis.divideScalar(length);const along=direction.dot(axis),offset=relative.dot(axis),d=direction.clone().addScaledVector(axis,-along),m=relative.clone().addScaledVector(axis,-offset),a=d.lengthSq(),b=2*d.dot(m),c=m.lengthSq()-radius*radius,discriminant=b*b-4*a*c;if(a>1e-12&&discriminant>=0)for(const t of [(-b-Math.sqrt(discriminant))/(2*a),(-b+Math.sqrt(discriminant))/(2*a)]){const y=offset+t*along;if(y>=0&&y<=length)accept(t);}}
 for(const center of length>1e-8?[start,end]:[start]){const delta=origin.clone().sub(center),b=delta.dot(direction),d=b*b-delta.lengthSq()+radius*radius;if(d>=0){accept(-b-Math.sqrt(d));accept(-b+Math.sqrt(d));}}
 return Number.isFinite(best)?{distance:best,point:ray.ray.at(best,new T.Vector3())}:null;
}
export function hitCharacter(ray,{root,joints}){
 if(!root||!shown(root))return null;const meshes=[];root.traverseVisible(o=>{if(o.isMesh)meshes.push(o);});if(!meshes.length)return null;
 const regions=characterSelectionRegions(joints),box=new T.Box3(),mid=new T.Vector3();let padding=0;for(const r of regions){box.expandByPoint(r.start);box.expandByPoint(r.end);mid.copy(r.start).add(r.end).multiplyScalar(.5);padding=Math.max(padding,r.radius+worldUnitsPerPixel(ray,mid)*6);}if(regions.length&&!ray.ray.intersectsBox(box.expandByScalar(padding)))return null;
 root.parent?.updateWorldMatrix(true,false);root.updateMatrixWorld(true);
 // Skinning changes vertex positions without updating Three's cached raycast bounds.
 for(const mesh of meshes)if(mesh.isSkinnedMesh){mesh.boundingSphere=null;mesh.boundingBox=null;}
 const surface=ray.intersectObjects(meshes,false)[0];if(surface)return{...surface,kind:'surface'};
 let best=null;for(const r of regions){mid.copy(r.start).add(r.end).multiplyScalar(.5);const hit=hitCapsule(ray,r.start,r.end,r.radius+worldUnitsPerPixel(ray,mid)*6);if(hit&&(!best||hit.distance<best.distance))best={...hit,kind:'body-region',region:r.name,object:root};}return best;
}
