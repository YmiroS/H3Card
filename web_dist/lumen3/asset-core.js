import {readFbxSettings} from './scene-coordinates.js';
import {readFbxCameraMetadata,maskPrematureLookAt,attachFbxCameraMetadata} from './fbx-camera-metadata.js';
import {cleanAssetPath} from './local-asset-files.js';
import * as T from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js';

export async function parseRawAsset(main,files,manager=new T.LoadingManager()){
 if(/\.fbx$/i.test(main.name)){const buffer=await main.arrayBuffer(),metadata=readFbxCameraMetadata(buffer),object=new FBXLoader(manager).parse(maskPrematureLookAt(buffer,metadata),'');object.userData.sourceSettings=readFbxSettings(buffer);object.userData.sourceFormat='FBX';attachFbxCameraMetadata(object,metadata);return{object,format:'FBX'};}
 if(!/\.obj$/i.test(main.name))throw new Error('主模型必须为 FBX 或 OBJ。');
 const text=await main.text(),loader=new OBJLoader(manager),references=[...text.matchAll(/^mtllib\s+(.+)$/gm)].map(m=>m[1].trim().toLowerCase()),mtls=files.filter(f=>/\.mtl$/i.test(f.name)&&(!references.length||references.some(r=>r.includes(f.name.toLowerCase()))));
 if(mtls.length){const creators=await Promise.all(mtls.map(async f=>{const path=cleanAssetPath(f.webkitRelativePath||f.name).split('/').slice(0,-1).join('/');const creator=new MTLLoader(manager).parse(await f.text(),path?path+'/':'');creator.preload();return creator;}));loader.setMaterials({create(name){const creator=creators.find(c=>Object.hasOwn(c.materialsInfo,name));return creator?creator.create(name):new T.MeshPhongMaterial({name});}});}
 const object=loader.parse(text);object.userData.sourceFormat='OBJ';return {object,format:'OBJ'};
}
export function boundsFor(root){root.updateMatrixWorld(true);root.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});return new T.Box3().setFromObject(root,true);}
export function normalizeAsset(raw,targetHeight){
 if(!Number.isFinite(targetHeight)||targetHeight<.01||targetHeight>100)throw new Error('显示高度无效。');
 const nativeBounds=boundsFor(raw),size=nativeBounds.getSize(new T.Vector3()),center=nativeBounds.getCenter(new T.Vector3());
 if(nativeBounds.isEmpty()||![size.x,size.y,size.z].every(Number.isFinite)||Math.max(size.x,size.y,size.z)<1e-8)throw new Error('模型的边界或尺寸无效。');
 const extent=size.y>1e-6?size.y:Math.max(size.x,size.z),factor=targetHeight/extent;
 const root=new T.Group();root.name='Imported asset transform';const normalization=new T.Group();normalization.name='Unit normalization';normalization.scale.setScalar(factor);normalization.position.set(-center.x*factor,-nativeBounds.min.y*factor,-center.z*factor);normalization.add(raw);root.add(normalization);root.updateMatrixWorld(true);
 return {root,normalization,factor,nativeBounds};
}
