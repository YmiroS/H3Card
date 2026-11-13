import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {worldUnitsPerPixel} from './viewport-picking.js?v=45';

// Thin solid strokes keep helpers pickable without wireframe triangulation or a frustum shell.
function outline(segments,radius=.004){
 const parts=[];for(const[a,b]of segments){const p=new T.Vector3().fromArray(a),q=new T.Vector3().fromArray(b),delta=q.clone().sub(p),g=new T.CylinderGeometry(radius,radius,delta.length(),6,1);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));g.translate(...p.add(q).multiplyScalar(.5).toArray());parts.push(g);}
 const geometry=mergeGeometries(parts,false);for(const p of parts)p.dispose();geometry.computeBoundingSphere();return geometry;
}
function rectangle(x,y,z){return[[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]];}
function loop(out,points){points.forEach((p,i)=>out.push([p,points[(i+1)%points.length]]));}
function box(out,x,y,z0,z1){const a=rectangle(x,y,z0),b=rectangle(x,y,z1);loop(out,a);loop(out,b);a.forEach((p,i)=>out.push([p,b[i]]));}
function ring(out,r,z,axis=2){loop(out,Array.from({length:20},(_,i)=>{const a=i*Math.PI/10,p=[Math.cos(a)*r,Math.sin(a)*r];return axis===0?[z,...p]:axis===1?[p[0],z,p[1]]:[...p,z];}));}
function arrow(out,x,y,z0,z1){out.push([[x,y,z0],[x,y,z1]],[[x-.035,y,z1-.07],[x,y,z1]],[[x+.035,y,z1-.07],[x,y,z1]]);}
let cameraGeometry;const cameraPickGeometry=new T.BoxGeometry(.36,.3,.55).translate(0,.025,.14),lightGeometries=new Map();
const lightPickBox=new T.BoxGeometry(1,1,1),lightPickSphere=new T.SphereGeometry(1,16,12),lightPickMaterial=new T.MeshBasicMaterial({side:T.DoubleSide});
export function createLightIcon({color='#a9cfef'}={}){
 const icon=new T.Mesh(lightHelperGeometry('area'),new T.MeshBasicMaterial({color})),picker=new T.Mesh(lightPickBox,lightPickMaterial),matrix=new T.Matrix4(),center=new T.Vector3(),size=new T.Vector3(),identity=new T.Quaternion();icon.userData.lightType='area';
 icon.raycast=function(ray,hits){const type=this.userData.lightType||'area',world=this.getWorldPosition(new T.Vector3()),scale=this.getWorldScale(new T.Vector3()),padding=worldUnitsPerPixel(ray,world)*(ray.params.LumenHelper?.paddingPx||8),pad=scale.toArray().map(v=>padding/Math.max(Math.abs(v),1e-8));if(type==='point'){picker.geometry=lightPickSphere;center.set(0,0,0);size.set(.25+pad[0],.25+pad[1],.25+pad[2]);}else{picker.geometry=lightPickBox;center.set(0,0,type==='directional'?.1:.02);size.set(...(type==='directional'?[.34,.34,.55]:[1.04,1.04,.10]).map((v,i)=>v+2*pad[i]));}matrix.compose(center,identity,size);picker.matrixWorld.multiplyMatrices(this.matrixWorld,matrix);const offset=hits.length;picker.raycast(ray,hits);for(let i=offset;i<hits.length;i++){hits[i].object=this;hits[i].helperVolume=true;}if(hits.length===offset)T.Mesh.prototype.raycast.call(this,ray,hits);};
 return icon;
}
export function createCameraIcon({color='#9fc8dd'}={}){
 if(!cameraGeometry){const lines=[];box(lines,.14,.095,.08,.34);ring(lines,.062,.08);ring(lines,.062,-.015);for(const x of [-.062,.062])lines.push([[x,0,.08],[x,0,-.015]]);const hoodBack=rectangle(.065,.05,-.015),hoodFront=rectangle(.105,.075,-.075);loop(lines,hoodFront);hoodBack.forEach((p,i)=>lines.push([p,hoodFront[i]]));lines.push([[-.08,.095,.27],[-.08,.17,.27]],[[-.08,.17,.27],[.08,.17,.27]],[[.08,.17,.27],[.08,.095,.27]]);box(lines,.045,.025,.35,.41);lines.push([[0,0,-.075],[0,0,-.2]],[[-.03,0,-.16],[0,0,-.2]],[[.03,0,-.16],[0,0,-.2]]);cameraGeometry=outline(lines);cameraGeometry.name='camera body lens hood handle and viewfinder outline';}
 const icon=new T.Mesh(cameraGeometry,new T.MeshBasicMaterial({color,depthTest:false}));icon.name='摄像机轮廓';icon.renderOrder=6;icon.userData.isCameraIcon=true;icon.userData.opticalForward=[0,0,-1];const picker=new T.Mesh(cameraPickGeometry,icon.material);icon.raycast=function(ray,hits){picker.matrixWorld.copy(this.matrixWorld);const offset=hits.length;picker.raycast(ray,hits);for(let i=offset;i<hits.length;i++)hits[i].object=this;};return icon;
}
export function lightHelperGeometry(type){
 if(lightGeometries.has(type))return lightGeometries.get(type);const lines=[];
 if(type==='point'){for(const axis of [0,1,2])ring(lines,.105,0,axis);for(const axis of [0,1,2])for(const sign of [-1,1]){const a=[0,0,0],b=[0,0,0];a[axis]=.14*sign;b[axis]=.23*sign;lines.push([a,b]);}}
 else if(type==='directional'){ring(lines,.13,0);for(const x of [-.1,0,.1])arrow(lines,x,0,-.12,.35);}
 else {box(lines,.5,.5,-.012,.012);arrow(lines,0,0,0,.2);}
 const g=outline(lines,type==='area'?.006:.004);g.name='light '+type+' outline';lightGeometries.set(type,g);return g;
}
