import {setupMainCamera} from './main-camera.js';
import {collection} from './asset-workspace.js';
import {cameraAPI} from './pose.js';
import {setupVideoRecognition} from './video-recognition.js';
import {mediaAPI} from './pose.js';
import {setupMotionWorkspace} from './motion-workspace.js';
import {setupKeyframeWorkspace} from './keyframe-workspace.js';
import {motionAPI,keyframeAPI,state} from './pose.js';
import {setupTimeline} from './timeline-ui.js?v=45';
import './asset-workspace.js';
import {setupWorkspaceShell} from './workspace-shell.js?v=45';
import {setupLightingWorkspace} from './lighting-workspace.js?v=45';
import {lightingAPI} from './pose.js';
setupTimeline();
setupWorkspaceShell();
setupLightingWorkspace(lightingAPI);

setupMotionWorkspace(motionAPI);
setupKeyframeWorkspace(keyframeAPI);
const keyStyle=document.createElement('link');keyStyle.rel='stylesheet';keyStyle.href='keyframe-workspace.css';document.head.append(keyStyle);

const viewportJoints=document.getElementById('stage-joints-toggle');
function syncViewportJoints(){if(!viewportJoints)return;const visible=!!state.showJoints&&state.gizmos!==false;viewportJoints.textContent=visible?'隐藏关节点':'显示关节点';viewportJoints.setAttribute('aria-pressed',String(visible));}
if(viewportJoints)viewportJoints.onclick=()=>{motionAPI.jointsVisible(!(state.showJoints&&state.gizmos!==false));syncViewportJoints();};
document.addEventListener('click',e=>{if(e.target.closest?.('#joints-toggle,#gizmos'))queueMicrotask(syncViewportJoints);});
document.addEventListener('change',e=>{if(e.target.id==='show-joints')queueMicrotask(syncViewportJoints);});
syncViewportJoints();

const photoMarkers=document.getElementById('photo-markers-toggle'),personSelect=document.getElementById('photo-person-select');
function syncPhotoControls(){if(photoMarkers){const on=document.getElementById('show-points').checked;photoMarkers.textContent=on?'隐藏照片标记点':'显示照片标记点';photoMarkers.setAttribute('aria-pressed',String(on));photoMarkers.disabled=motionAPI.imported();}if(personSelect&&window.lumenPeople){const people=window.lumenPeople.list();personSelect.replaceChildren(...people.map(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name;return o;}));personSelect.value=state.personId;personSelect.hidden=people.length<2;}}
if(photoMarkers)photoMarkers.onclick=()=>{motionAPI.markersVisible(!document.getElementById('show-points').checked);syncPhotoControls();};
if(personSelect)personSelect.onchange=()=>{window.lumenPeople.select(personSelect.value);state.selectionCleared=false;state.tab='pose';motionAPI.jointsVisible(state.showJoints);keyframeAPI.refresh();document.dispatchEvent(new Event('lumen-edit-committed'));};
for(const event of ['lumen-people-change','lumen-asset-visibility','lumen-photo-loaded'])document.addEventListener(event,syncPhotoControls);syncPhotoControls();
const photoStyle=document.createElement('style');photoStyle.textContent='.match{grid-template-rows:auto minmax(0,1fr) 31px}.match-title{min-height:48px}.match-controls{flex-wrap:wrap}.match-title{gap:12px;flex-wrap:wrap}.match-controls{margin-left:auto;display:flex;align-items:center;gap:12px}.match-controls label{display:flex;gap:8px;align-items:center}.match-controls input{width:96px}.match-controls select{max-width:130px}.match-controls button{white-space:nowrap;font-size:12px;padding:8px 12px}';document.head.append(photoStyle);

setupVideoRecognition({mediaAPI,motionAPI,state});

setupMainCamera({collection,cameraAPI,state,refresh:()=>keyframeAPI.refresh()});
const mainCameraStyle=document.createElement("style");mainCameraStyle.textContent=".match-title .main-camera-picker{display:flex;align-items:center;gap:6px;margin:0}.main-camera-picker select{width:190px;max-width:30vw;margin:0;font:11px system-ui;min-height:30px}.main-camera-picker{color:#a7bdd7}";document.head.append(mainCameraStyle);
