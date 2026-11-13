import * as T from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {normalizeAsset} from './asset-core.js';
import {createAvatarRig} from './avatar-rig.js';

const source={filename:'samba.fbx',url:'assets/default-human-b9003ee5.fbx',sha256:'b9003ee562c87bf03051c3a502411b0808d3513f1d74a2011f7530d9f067069f'};
let templatePromise=null;
export function createDefaultAvatar(scene,joints,getSource){
 const root=new T.Group();root.name='Default imported human mannequin';scene.add(root);let rig=null,raw=null,saved=null,error=null;
 const material=new T.MeshStandardMaterial({color:'#e4e2dc',roughness:.63,metalness:.025,side:T.DoubleSide});
 const status=()=>document.getElementById('default-model-info');
 const manager=new T.LoadingManager();manager.setURLModifier(url=>/^(blob:|data:)/i.test(url)||url.includes(source.url)?url:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=');
 if(!templatePromise)templatePromise=new FBXLoader(manager).loadAsync(source.url).catch(e=>{templatePromise=null;throw e;});const ready=templatePromise.then(template=>{const object=cloneSkeleton(template);raw=object;const disposable=new Set();raw.traverse(o=>{if(o.isLight)o.visible=false;if(o.isMesh){for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)disposable.add(m);o.material=material;o.castShadow=true;o.receiveShadow=true;}});disposable.forEach(m=>m.dispose());const normalized=normalizeAsset(raw,1.8);root.add(normalized.root);root.updateMatrixWorld(true);rig=createAvatarRig(raw,joints,getSource,saved||{});rig.update();if(saved)rig.loadState(saved);if(status())status().textContent='默认人体：已内置白模造型，可直接匹配照片与编辑关节。';return raw;}).catch(e=>{error=e.message;if(status())status().textContent='默认人体加载失败，请刷新重试。';console.error('Default avatar:',e);return null;});
 return {root,ready,setProportions:(values,metadata)=>rig?.setProportions(values,metadata),beginEdit:key=>rig?.beginEdit(key),hingeInfo:key=>rig?.hingeInfo(key),setFlexion:(...args)=>rig?.setFlexion(...args)||false,setShoulderFollow:value=>rig?.setShoulderFollow(value),transformWhole:(...args)=>rig?.transformWhole(...args)||false,translateControl:(...args)=>rig?.translateControl(...args)||false,rotateControl:(...args)=>rig?.rotateControl(...args)||false,dispose(){root.removeFromParent();rig?.dispose();material.dispose();},update(){rig?.update();},refine(points,camera,options={}){return rig?.refine(points,camera,false,options)||{changed:false};},refineArms(points,camera){return rig?.refineArms(points,camera)||null;},info(){return {type:'bundled_skinned_human_mannequin',source_asset:source.filename,source_sha256:source.sha256,loaded:!!rig,error,retargeting:'adjustable body proportions with fixed lengths during pose editing',...(rig?.info()||{})};},saveState(){return {...(rig?.saveState()||saved),display_scale:root.scale.x};},loadState(data){saved=data;root.scale.setScalar(Number.isFinite(data?.display_scale)?data.display_scale:1);if(rig)rig.loadState(data);}};
}
