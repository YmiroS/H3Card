import * as T from 'three';
import {timeline} from './shared-timeline.js';
export function setupMainCamera({collection,cameraAPI,state,refresh=()=>{}}){
 const $=id=>document.getElementById(id),select=$('main-camera-select');if(!select)return;
 let defaultFrame=cameraAPI.capture(),wasImported=!!collection.activeCamera,syncing=false;
 const originalApply=collection.cameraApply;collection.cameraApply=(frame,source)=>{if(!wasImported){defaultFrame=cameraAPI.capture();wasImported=true;}originalApply(frame,source);};
 function selectedName(){const a=collection.activeCamera,e=a&&collection.cache.get(a.assetId),c=e?.cameras.find(c=>c.path===a.path);return c?e.filename+' / '+c.name:'默认拍摄相机';}
 function render(){const value=collection.activeCamera?JSON.stringify(collection.activeCamera):'default';select.replaceChildren();const op=document.createElement('option');op.value='default';op.textContent='默认拍摄相机';select.append(op);for(const e of collection.entries)for(const c of e.cameras){const option=document.createElement('option');option.value=JSON.stringify({assetId:e.id,path:c.path});option.textContent=e.filename+' / '+c.name;select.append(option);}select.value=value;select.title='主相机：'+selectedName();}
 function restoreDefault(){const f=defaultFrame;if(!f)return;cameraAPI.apply({position:new T.Vector3().fromArray(f.position),quaternion:new T.Quaternion().fromArray(f.quaternion),target:new T.Vector3().fromArray(f.target),fov:f.fov,aspect:f.aspect,near:f.near,far:f.far},f.source||null,false);}
 function choose(value){timeline.pause();if(value==='default'){collection.activeCamera=null;collection.registerCamera();wasImported=false;restoreDefault();}else{if(!collection.activeCamera)defaultFrame=cameraAPI.capture();const a=JSON.parse(value);collection.useCamera(a.assetId,a.path);collection.syncCamera();wasImported=true;}state.selectionCleared=false;render();refresh();document.dispatchEvent(new Event('lumen-edit-committed'));}
 function sync(){if(syncing||!collection.activeCamera)return;syncing=true;try{collection.syncCamera();}finally{syncing=false;}}
 select.onchange=()=>{try{choose(select.value);}catch(e){render();document.dispatchEvent(new CustomEvent('lumen-camera-error',{detail:e.message}));}};
 document.addEventListener('lumen-selection-change',()=>{if(!collection.activeCamera&&wasImported){wasImported=false;restoreDefault();}render();});
 // Run after manual key samples, so the selected source owns the shot view.
 timeline.afterSamples.add(sync);
 const api={sync,choose,name:selectedName,selection:()=>collection.activeCamera?{...collection.activeCamera,name:selectedName()}:{type:'default',name:selectedName()},saveState:()=>({defaultFrame,selected:collection.activeCamera}),loadState(data){if(data?.defaultFrame)defaultFrame=data.defaultFrame;if(data){collection.activeCamera=data.selected||null;wasImported=!!collection.activeCamera;collection.registerCamera();if(wasImported)sync();else restoreDefault();}render();}};window.lumenMainCamera=api;render();return api;
}
