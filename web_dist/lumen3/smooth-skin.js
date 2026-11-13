import * as T from 'three';
// Average normals by position, including duplicated vertices at UV and skin seams.
export function smoothSkinNormals(geometry){
 const p=geometry.attributes.position;if(!p)return;geometry.computeVertexNormals();
 const box=new T.Box3().setFromBufferAttribute(p),size=box.getSize(new T.Vector3()),quantize=1e5/Math.max(size.x,size.y,size.z,1),keys=[],groups=new Map();
 for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*quantize)).join(',');keys.push(key);if(!groups.has(key))groups.set(key,new T.Vector3());}
 const index=geometry.index,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 for(let i=0;i<(index?.count||p.count);i+=3){const ids=index?[index.getX(i),index.getX(i+1),index.getX(i+2)]:[i,i+1,i+2];a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);const normal=b.sub(a).cross(c.sub(a));for(const id of ids)groups.get(keys[id]).add(normal);}
 const normal=geometry.attributes.normal;for(let i=0;i<p.count;i++){const n=groups.get(keys[i]);if(n.lengthSq()>1e-20){a.copy(n).normalize();normal.setXYZ(i,a.x,a.y,a.z);}}normal.needsUpdate=true;return geometry;
}
