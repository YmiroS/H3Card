import {detectPose,closePoseDetector} from './pose-detector.js';
import {reconcilePoseDepth} from './pose-depth.js';
import {personNearness,depthHintsFromNearness,contactNearness,depthHintsFromContact,groundContactShift,GROUND_CANDIDATES} from './pose-depth-map.js';
import {SEGMENT_PALETTE,MAX_SEGMENT_PEOPLE,loadImage,masksFromSegmentImage,isolatePerson,maskBBox,maskHasPoint} from './pose-mask-split.js?v=45';
import {indexLayerFromMasks,masksFromIndexLayer,assertSegmentPeople,maskShare} from './segment-layer.js?v=45';
import {createSegmentManualUI} from './segment-manual-ui.js?v=46';
import {createPhotoPeople} from './photo-people.js?v=45';
import {estimatePhotoPerson} from './photo-person-pose.js';
import {estimateBodyProportions,DEFAULT_PROPORTIONS} from './body-proportions.js?v=45';
import {setupBodyProportionsUI} from './body-proportions-ui.js?v=45';
import {createJointDragHandle,hingeRotationDelta} from './joint-drag-handle.js?v=45';
import {placeLabels} from './landmark-labels.js?v=45';
import {fitPoseInCurrentCamera} from './fit-locked-pose.js';
import {avatarKeyChannels} from './avatar-key-channels.js';
import {timeline} from './shared-timeline.js';
import {createLightRig} from './light-rig.js?v=45';
import {installHistoryUI} from './scene-history.js?v=45';
import {installMayaNavigation} from './maya-navigation.js';
import {constrainPosture} from './posture-constraints.js';
import {validateArmLandmarks} from './arm-ik.js';
import {setupArmCorrection} from './arm-correction.js';
import {createTargetEditor} from './target-editor.js?v=45';
import {setupLightAnalysis} from './light-analysis-ui.js?v=45';
import {createCloudFlow,EXTRACT_OVERRIDES} from './cloud-confirm.js?v=45';
import {imageLightingPrompt,describeLight} from './lighting-prompt.js?v=45';
import {createLightManager,addLightIdentityControls} from './light-editing.js?v=45';
import {addLightTypeSelector,validLightType,lightTypeName,pointRange} from './light-types.js?v=45';
import {configureHelperPicking} from './viewport-picking.js?v=45';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {createDefaultAvatar as createRobotSurface} from './default-avatar.js';
import {DEFAULT_HUMAN_POSE} from './avatar-rig.js';
import {fitPerspectiveCamera} from './camera-fit.js';
import {setupGroundCalibration} from './ground-calibration.js?v=45';
const $=id=>document.getElementById(id), clone=x=>JSON.parse(JSON.stringify(x)), V=a=>new T.Vector3(...a), round=a=>a.map(x=>+x.toFixed(6));
const labels={head:'头部中心',nose:'面朝方向点',neck:'颈部',chest:'胸腔',waist:'腰部',ls:'左肩',le:'左肘',lw:'左腕',lh:'左手指向',rs:'右肩',re:'右肘',rw:'右腕',rh:'右手指向',pelvis:'骨盆',lhip:'左髋',lk:'左膝',la:'左踝',rhip:'右髋',rk:'右膝',ra:'右踝',lt:'左脚尖',rt:'右脚尖'};
const standing=DEFAULT_HUMAN_POSE;
const pairs=[['neck','head',.045],['neck','chest',.15],['chest','waist',.13],['waist','pelvis',.12],['ls','rs',.13],['lhip','rhip',.14],['ls','le',.065],['le','lw',.052],['rs','re',.065],['re','rw',.052],['lhip','lk',.09],['lk','la',.065],['rhip','rk',.09],['rk','ra',.065]];
let poseOperation=0;let sceneHistory=null;let armCorrection=null;let targetEditor=null;
const state={poseSource:'standing_placeholder',lightSource:'default_placeholder',points:{},ref:null,poseVersion:0,fitRms:null,modelScale:1,tab:'pose',joint:'head',light:0,gizmos:true,cameraLocked:true,selectionCleared:false,showJoints:false,autoBusy:false,transformMode:'translate',transformSpace:'world'};
const scene=new T.Scene();scene.background=new T.Color('#161c26');
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});const shotRenderer=new T.WebGLRenderer({canvas:$('shot-canvas'),antialias:true,preserveDrawingBuffer:true});
for(const r of [renderer,shotRenderer]){r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.shadowMap.enabled=true;r.shadowMap.type=T.PCFSoftShadowMap;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1;}$('stage').append(renderer.domElement);
const observer=new T.PerspectiveCamera(45,1,.03,60);observer.position.set(3,2.2,4);const orbit=new OrbitControls(observer,renderer.domElement);orbit.target.set(0,1,0);orbit.enableDamping=true;
const shot=new T.PerspectiveCamera(35,16/9,.03,60),cameraState={az:0,el:6,distance:3.6,tx:0,ty:1,tz:0,fov:35,roll:0};
function cameraUpdate(){const a=T.MathUtils.degToRad(cameraState.az),e=T.MathUtils.degToRad(cameraState.el),t=new T.Vector3(cameraState.tx,cameraState.ty,cameraState.tz);shot.position.set(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e)).multiplyScalar(cameraState.distance).add(t);shot.up.set(0,1,0);shot.lookAt(t);shot.rotateZ(T.MathUtils.degToRad(cameraState.roll));shot.fov=cameraState.fov;shot.updateProjectionMatrix();shot.updateMatrixWorld();cameraMarker.position.copy(shot.position);cameraMarker.quaternion.copy(shot.quaternion);const lineGeo=new T.BufferGeometry().setFromPoints([shot.position,t]);cameraLine.geometry.dispose();cameraLine.geometry=lineGeo;targetEditor?.sync();}
const floor=new T.Mesh(new T.PlaneGeometry(12,12),new T.MeshStandardMaterial({color:'#69717d',roughness:.96}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);const grid=new T.GridHelper(12,24,0x829079,0x475b4e);grid.position.y=.002;scene.add(grid);
const body=new T.Group(),helperGroup=new T.Group();scene.add(body,helperGroup);const white=new T.MeshStandardMaterial({color:0xe9e9e4,roughness:.65,metalness:0});const dark=new T.MeshStandardMaterial({color:0xadb9b1,roughness:.6});
let joints={};for(const k of Object.keys(labels)){const m=new T.Mesh(new T.SphereGeometry(.035,12,8),new T.MeshBasicMaterial({color:'#bdda96',depthTest:false}));m.visible=false;m.userData.joint=k;m.renderOrder=5;helperGroup.add(m);joints[k]=m;const op=document.createElement('option');op.value=k;op.textContent=labels[k];$('joint').append(op);}
const boneMeshes=pairs.map(()=>{const m=new T.Mesh(new T.CylinderGeometry(1,1,1,18),white);m.castShadow=true;m.receiveShadow=true;body.add(m);return m;});
function ellipsoid(scale,mat=white){const m=new T.Mesh(new T.SphereGeometry(1,28,20),mat);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;body.add(m);return m;}
const chest=ellipsoid([.22,.26,.115]),hips=ellipsoid([.16,.13,.11]),head=ellipsoid([.105,.14,.115]),face=ellipsoid([.025,.035,.045],dark);
const surfaceJoints=Object.fromEntries(['ls','le','lw','rs','re','rw','lhip','lk','la','rhip','rk','ra'].map(k=>[k,ellipsoid([.055,.055,.055])]));
const hands=[ellipsoid([.045,.085,.025]),ellipsoid([.045,.085,.025])],feet=[ellipsoid([.065,.045,.13]),ellipsoid([.065,.045,.13])];
const fingers=[[],[]];for(let side=0;side<2;side++)for(let n=0;n<5;n++){const f=new T.Mesh(new T.CapsuleGeometry(.009,.075,4,8),white);f.castShadow=true;body.add(f);fingers[side].push(f);}
body.visible=false;
let people=null;
const firstJoints=joints;
let robot=createRobotSurface(scene,joints,()=>people?.list().find(p=>p.joints===firstJoints)?.poseSource||state.poseSource);
state.personId='person-1';
people=createPhotoPeople({scene,helperGroup,createRobot:createRobotSurface,labels,initial:{robot,joints,points:state.points,poseSource:state.poseSource,modelScale:1},get:()=>({id:state.personId,joints,robot,points:state.points,poseSource:state.poseSource,modelScale:state.modelScale,showJoints:state.showJoints}),set:p=>{joints=p.joints;robot=p.robot;state.personId=p.id;state.points=p.points;state.poseSource=p.poseSource;state.modelScale=p.modelScale;$('body-scale').value=p.modelScale;},changed:()=>{document.dispatchEvent(new Event('lumen-people-change'));}});
window.lumenPeople=people;

function updateBody(){for(const[k,m]of Object.entries(surfaceJoints))m.position.copy(joints[k].position);for(let i=0;i<pairs.length;i++){const[a,b,r]=pairs[i],p=joints[a].position,q=joints[b].position,d=q.clone().sub(p);const m=boneMeshes[i];m.position.copy(p).add(q).multiplyScalar(.5);m.scale.set(r,d.length(),r);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());}chest.position.copy(joints.neck.position).lerp(joints.pelvis.position,.32);chest.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),joints.neck.position.clone().sub(joints.pelvis.position).normalize());hips.position.copy(joints.pelvis.position);head.position.copy(joints.head.position);head.lookAt(joints.nose.position);face.position.copy(joints.nose.position);const shoulderWidth=joints.ls.position.distanceTo(joints.rs.position);chest.scale.x=T.MathUtils.clamp(shoulderWidth*.5,.12,.33);for(let i=0;i<2;i++){const wrist=joints[i?'rw':'lw'].position,handTip=joints[i?'rh':'lh'].position,d=handTip.clone().sub(wrist).normalize(),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d);hands[i].position.copy(wrist).lerp(handTip,.5);hands[i].quaternion.copy(q);for(let n=0;n<5;n++){const f=fingers[i][n];const offset=new T.Vector3((n-2)*.019,.08+Math.sin(n)*.01,.008).applyQuaternion(q);f.position.copy(handTip).add(offset);f.quaternion.copy(q).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),(n-2)*.12));}feet[i].position.copy(joints[i?'ra':'la'].position).add(new T.Vector3(0,-.025,.045));}for(const[k,m]of Object.entries(joints))m.material.color.set(k===state.joint?'#f2d590':'#bdda96');invalidateFit();state.poseVersion++;syncLightTarget();people?.stash();robot.update();}
function applyPose(p,source){poseOperation++;if(!p.waist&&p.neck&&p.pelvis)p={...p,waist:V(p.pelvis).lerp(V(p.neck),.43).toArray()};if(!p.chest&&p.neck&&p.pelvis)p={...p,chest:V(p.pelvis).lerp(V(p.neck),.68).toArray()};if(source==='standing_placeholder')robot.root.scale.setScalar(1);for(const k of Object.keys(joints)){const fallback=k.endsWith('t')&&p[k[0]+'a']?V(p[k[0]+'a']).add(V(standing[k]).sub(V(standing[k[0]+'a']))).toArray():standing[k];joints[k].position.copy(V(p[k]||fallback));joints[k].quaternion.identity();}state.poseSource=source;state.modelScale=1;$('body-scale').value=1;updateBody();inspect();attach();}
// 头身与肢体比例在识别时按可见骨长的相对比例估计，改的是白模本身的体型；
// 「模型整体缩放」只负责整体大小，两者不再混用。
function matchProportions(estimate,diagnostics){if($('auto-body-proportions')?.checked===false)return null;const info=estimateBodyProportions(estimate,standing,{depthSource:diagnostics?.depth_source,current:robot.saveState().body_proportions});robot.setProportions?.(info.available?info.profile:robot.saveState().body_proportions,info);document.dispatchEvent(new Event('lumen-body-proportions'));return info;}
const cameraMarker=new T.Mesh(new T.BoxGeometry(.22,.15,.23),new T.MeshBasicMaterial({color:'#9fc8dd',wireframe:true}));cameraMarker.userData.camera=true;helperGroup.add(cameraMarker);const cameraLine=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:'#658a9a'}));helperGroup.add(cameraLine);
const lamps=[{name:'主光',pos:[-2.4,3.6,2.5],power:85,kelvin:5200,size:1.5,enabled:true,type:'area'},{name:'补光',pos:[2.5,2.4,2.4],power:20,kelvin:6500,size:2,enabled:true,type:'area'},{name:'轮廓光',pos:[1.4,2.7,-2],power:90,kelvin:4200,size:1,enabled:true,type:'area'}];
function tint(k){const t=k/100,r=t<=66?255:329.7*Math.pow(t-60,-.1332),g=t<=66?99.47*Math.log(t)-161.12:288.12*Math.pow(t-60,-.0755),b=t>=66?255:t<=19?0:138.52*Math.log(t-10)-305.04;return new T.Color().setRGB(...[r,g,b].map(v=>T.MathUtils.clamp(v,0,255)/255),T.SRGBColorSpace);}
lamps.forEach((l,i)=>{l.id=['key','fill','rim'][i];l.name=['主光','辅助光','轮廓光'][i];if(!Number.isFinite(l.range))l.range=0;});
const lampRig=createLightRig(scene,helperGroup,lamps,{tint,aim}),lampObjects=lampRig.objects;
const ambient=new T.HemisphereLight(0xffffff,0x33402e,.08);scene.add(ambient);let environment=.08;
const lightTarget=new T.Object3D();lightTarget.position.set(0,1.25,0);scene.add(lightTarget);
// 布光中心不再钉死在世界坐标：跟着「布光对象」走，默认取当前选中角色的颈-骨盆中点，
// 多人时灯距、方位、仰角都以这个人的胸腔为基准。
let lightSubjectId='auto';
function subjectControlJoints(){if(lightSubjectId==='auto')return joints;const p=people?.list().find(v=>v.id===lightSubjectId);return p&&p.joints.neck&&p.joints.pelvis?p.joints:null;}
function syncLightTarget(){const q=subjectControlJoints();if(!q)return;lightTarget.position.copy(q.neck.position.clone().lerp(q.pelvis.position,.5));}
function lightsUpdate(){lampRig.update();ambient.intensity=environment;targetEditor?.sync();listLights();if(typeof lightAnalysis!=='undefined')lightAnalysis.render();}
function replaceLightList(values,refresh=true){lamps.splice(0,lamps.length,...clone(values));lamps.forEach((l,i)=>{l.id=l.id||['key','fill','rim'][i]||'light_'+i;l.name=l.name||['主光','辅助光','轮廓光'][i]||'附加灯 '+(i+1);if(!Number.isFinite(l.range))l.range=0;if(!validLightType(l.type))l.type='area';});state.light=lamps.length?Math.max(0,Math.min(state.light,lamps.length-1)):-1;lampRig.sync();if(refresh){lightsUpdate();inspect();attach();}}
function addLight(type='area'){if(!validLightType(type))type='area';if(lamps.length>=8){toast('当前最多支持 8 盏灯。');return;}const i=lamps.length;lamps.push({id:'light_'+crypto.randomUUID(),name:'附加灯 '+(i+1),pos:lightTarget.position.clone().add(new T.Vector3(2,2,2).applyQuaternion(shot.quaternion)).toArray(),target:lightTarget.position.toArray(),power:35,kelvin:5600,size:1.5,range:0,type,enabled:true,shadow:true});state.selectionCleared=false;state.tab='light';state.light=i;lightsUpdate();inspect();attach();}
// 改名 / 删除走同一套：删除会连带清掉这盏灯的关键帧通道，Delete 键只在灯光页且不在输入框、不在编辑注视目标时生效。
const lightManager=createLightManager({lamps,state,getStore:()=>window.lumenKeys?.store,clearSelection:()=>window.lumenCurves?.clearSelection(),refresh:()=>{lightsUpdate();inspect();attach();},commit:()=>sceneHistory?.commit()});


const hierarchy={pelvis:['waist','lhip','rhip'],waist:['chest'],chest:['neck','ls','rs'],neck:['head'],head:['nose'],ls:['le'],le:['lw'],lw:['lh'],rs:['re'],re:['rw'],rw:['rh'],lhip:['lk'],lk:['la'],la:['lt'],rhip:['rk'],rk:['ra'],ra:['rt']};
function descendants(k){return (hierarchy[k]||[]).flatMap(c=>[c,...descendants(c)]);}
function poseSnapshot(k){return {key:k,native:robot.beginEdit?.(k),positions:Object.fromEntries([k,...descendants(k)].map(n=>[n,joints[n].position.clone()])),quaternions:Object.fromEntries([k,...descendants(k)].map(n=>[n,joints[n].quaternion.clone()]))};}
function translateJoint(k,p,base=null){if(k==='pelvis'&&robot.transformWhole?.(p,null,base?.native)){state.poseSource='manual_whole_character';updateBody();return;}if(robot.translateControl?.(k,p,base?.native)){state.poseSource='manual_native_ik';updateBody();return;}const delta=p.clone().sub(joints[k].position);for(const n of [k,...descendants(k)])joints[n].position.add(delta);state.poseSource='manual_hierarchical_translation';updateBody();}
function rotateJoint(k,q,base=poseSnapshot(k)){if(robot.rotateControl?.(k,q,base.native)){state.poseSource='manual_native_fk';updateBody();return;}const pivot=base.positions[k],delta=q.clone().multiply(base.quaternions[k].clone().invert()).normalize();for(const n of [k,...descendants(k)]){joints[n].position.copy(base.positions[n]).sub(pivot).applyQuaternion(delta).add(pivot);joints[n].quaternion.copy(delta).multiply(base.quaternions[n]).normalize();}state.poseSource='manual_hierarchical_rotation';updateBody();}
function aim(l){return l.target?V(l.target):lightTarget.position.clone();}
function rollFrom(q,position,target,isCamera){const base=isCamera?new T.PerspectiveCamera():new T.Object3D();base.position.copy(position);base.up.set(0,1,0);base.lookAt(target);const relative=base.quaternion.clone().invert().multiply(q).normalize();return T.MathUtils.radToDeg(2*Math.atan2(relative.z,relative.w));}
function setCameraPosition(p){const target=new T.Vector3(cameraState.tx,cameraState.ty,cameraState.tz),d=p.clone().sub(target);if(d.length()<.1)return;cameraState.distance=d.length();cameraState.az=T.MathUtils.radToDeg(Math.atan2(d.x,d.z));cameraState.el=T.MathUtils.radToDeg(Math.asin(d.y/d.length()));cameraUpdate();invalidateFit();}
function setCameraRotation(q){const p=shot.position.clone(),t=p.clone().addScaledVector(new T.Vector3(0,0,-1).applyQuaternion(q),cameraState.distance);cameraState.tx=t.x;cameraState.ty=t.y;cameraState.tz=t.z;cameraState.roll=rollFrom(q,p,t,true);setCameraPosition(p);}
function setLampRotation(index,q){const l=lamps[index],p=V(l.pos),distance=Math.max(.1,p.distanceTo(aim(l))),t=p.clone().addScaledVector(new T.Vector3(0,0,1).applyQuaternion(q),distance);l.target=t.toArray();l.roll_deg=rollFrom(q,p,t,false);lightsUpdate();state.lightSource='manual_orientation';}
function rotationControls(object,onChange){const e=new T.Euler().setFromQuaternion(object.quaternion,'XYZ');const values={x:T.MathUtils.radToDeg(e.x),y:T.MathUtils.radToDeg(e.y),z:T.MathUtils.radToDeg(e.z)};for(const axis of ['x','y','z'])control('旋转 '+axis.toUpperCase()+' °',values[axis],-360,360,1,v=>{values[axis]=v;onChange(new T.Quaternion().setFromEuler(new T.Euler(...['x','y','z'].map(a=>T.MathUtils.degToRad(values[a])),'XYZ')));});}
let dragSnapshot=null;
const modeBar=document.createElement('div');modeBar.className='transformbar';modeBar.innerHTML='<b>编辑工具</b><button id="tool-move" class="selected">位移 W</button><button id="tool-rotate">旋转 E</button><label>轴向 <select id="tool-space"><option value="world">世界</option><option value="local">局部</option></select></label><span>位移保持注视点不变 · 旋转改变朝向 · 关节带动下级</span>';document.querySelector('.viewtools').after(modeBar);const selectTool=document.createElement('button');selectTool.id='tool-select';selectTool.textContent='选择 Q';selectTool.onclick=()=>setTool('select');$('tool-move').before(selectTool);const scaleTool=document.createElement('button');scaleTool.id='tool-scale';scaleTool.textContent='缩放 R';scaleTool.onclick=()=>setTool('scale');$('tool-rotate').after(scaleTool);const modelScaleHandle=new T.Object3D();helperGroup.add(modelScaleHandle);
function setTool(mode){if(mode!=='translate'&&targetEditor?.active())return;if(mode==='scale'&&state.tab==='camera'){toast('摄像机缩放请使用视场角；Alt+右键为观察视图推拉。');return;}state.transformMode=mode;if(mode!=='select')gizmo.setMode(mode);$('tool-move').classList.toggle('selected',mode==='translate');$('tool-rotate').classList.toggle('selected',mode==='rotate');$('tool-scale')?.classList.toggle('selected',mode==='scale');$('tool-select')?.classList.toggle('selected',mode==='select');attach();}
$('tool-move').onclick=()=>setTool('translate');$('tool-rotate').onclick=()=>setTool('rotate');$('tool-space').onchange=()=>{state.transformSpace=$('tool-space').value;gizmo.setSpace(state.transformSpace);};document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey||$('handoff').open)return;if(e.key.toLowerCase()==='w')setTool('translate');if(e.key.toLowerCase()==='e')setTool('rotate');});

// 旋转手柄挂在代理物体上：肘/膝命中铰链时只留一个可转的环，转的是「屈伸角」而不是自由三轴。
const jointDrag=createJointDragHandle(helperGroup,()=>joints,()=>state.joint);
const gizmo=new TransformControls(observer,renderer.domElement);gizmo.setSize(.75);helperGroup.add(gizmo.getHelper());gizmo.addEventListener('dragging-changed',e=>orbit.enabled=!e.value);let lock=false;
gizmo.addEventListener('mouseDown',()=>{timeline.pause();if(state.tab==='pose'){dragSnapshot=poseSnapshot(state.joint);if(state.transformMode==='rotate'){const h=robot.hingeInfo?.(state.joint);if(h)dragSnapshot.hinge={...h,frame:jointDrag.object.quaternion.clone()};}}});
gizmo.addEventListener('mouseUp',()=>{dragSnapshot=null;});
gizmo.addEventListener('objectChange',()=>{if(lock)return;if(state.tab==='asset'&&window.lumenAsset){window.lumenAsset.onChange();return;}lock=true;try{if(targetEditor?.active()){targetEditor.change(targetEditor.marker.position.clone());if(state.tab==='camera')invalidateFit();}else if(state.tab==='pose'){if(state.transformMode==='scale'){const factor=Math.max(.2,Math.min(3,Math.max(modelScaleHandle.scale.x,modelScaleHandle.scale.y,modelScaleHandle.scale.z)));const ratio=factor/state.modelScale;for(const m of Object.values(joints))m.position.multiplyScalar(ratio);robot.root.scale.setScalar(factor);state.modelScale=factor;$('body-scale').value=factor;state.poseSource='manual_uniform_scale';updateBody();}else if(state.transformMode==='rotate'){const q=jointDrag.object.quaternion.clone(),h=dragSnapshot?.hinge;if(h){const angle=hingeRotationDelta(gizmo,h);robot.setFlexion(state.joint,h.angle_deg+T.MathUtils.radToDeg(angle),dragSnapshot.native);jointDrag.object.quaternion.copy(h.frame).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),angle));state.poseSource='manual_hinge_fk';updateBody();}else rotateJoint(state.joint,q,dragSnapshot||poseSnapshot(state.joint));}else{translateJoint(state.joint,jointDrag.object.position.clone(),dragSnapshot);}}else if(state.tab==='light'){const drag=lamps[state.light];if(!drag)return;if(!drag.enabled){drag.enabled=true;toast(drag.name+'原本未启用，已按本次拖拽开启。');}if(state.transformMode==='scale'){if(drag.type==='area')drag.size=T.MathUtils.clamp(Math.max(lampObjects[state.light].h.scale.x,lampObjects[state.light].h.scale.y),.05,4);lightsUpdate();state.lightSource='manual_emitter_scale';}else if(state.transformMode==='rotate')setLampRotation(state.light,lampObjects[state.light].h.quaternion.clone());else{lamps[state.light].pos=lampObjects[state.light].h.position.toArray();lightsUpdate();state.lightSource='manual_translation_target_preserved';}}else{if(state.transformMode==='rotate')setCameraRotation(cameraMarker.quaternion.clone());else setCameraPosition(cameraMarker.position.clone());}inspect();}finally{lock=false;}});

function attach(){gizmo.showX=gizmo.showY=gizmo.showZ=true;gizmo.setSpace(state.transformSpace);if(state.selectionCleared){targetEditor?.sync();gizmo.detach();return;}if(state.tab==='light'&&!lamps.length){state.light=-1;targetEditor?.sync();gizmo.detach();return;}state.light=Math.max(0,Math.min(state.light,lamps.length-1));targetEditor?.sync();if(state.tab==='asset'&&window.lumenAsset){window.lumenAsset.attach();return;}lock=true;if(!state.gizmos||state.transformMode==='select'||(state.tab==='pose'&&!state.showJoints))gizmo.detach();else {if(state.tab==='pose'&&state.transformMode==='scale'){modelScaleHandle.position.copy(joints.pelvis.position);modelScaleHandle.scale.setScalar(state.modelScale);}gizmo.attach(targetEditor?.active()?targetEditor.marker:state.tab==='pose'?(state.transformMode==='scale'?modelScaleHandle:jointDrag.sync()):state.tab==='camera'?cameraMarker:lampObjects[state.light].h);const hinge=state.tab==='pose'&&state.transformMode==='rotate'&&!targetEditor?.active()?robot.hingeInfo?.(state.joint):null;if(hinge){jointDrag.object.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),hinge.axis_world);gizmo.setSpace('local');gizmo.showX=false;gizmo.showZ=false;}}lock=false;}
const ray=new T.Raycaster();renderer.domElement.addEventListener('pointerdown',e=>{if(e.altKey||e.button!==0||gizmo.dragging||(gizmo.axis&&gizmo.object))return;const r=renderer.domElement.getBoundingClientRect();configureHelperPicking(ray,r);ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),observer);const helperHits=ray.intersectObjects([...Object.values(joints),cameraMarker,...lampObjects.map(o=>o.h),...(targetEditor?[targetEditor.marker]:[])].filter(o=>helperGroup.visible&&o.visible)),hit=helperHits.find(h=>h.object.userData.joint)||helperHits[0];if(!hit){const personHit=people.hitTest(ray);if(personHit&&people.pick(ray,personHit)){let nearest=state.joint,best=Infinity;for(const[k,m]of Object.entries(joints)){const d=m.position.distanceTo(personHit.point);if(d<best){best=d;nearest=k;}}state.selectionCleared=false;state.editTarget=false;state.joint=nearest;$('joint').value=nearest;state.tab='pose';inspect();attach();return;}if(!window.lumenAsset?.pick(e))clearSelection();return;}state.selectionCleared=false;const o=hit.object;if(o.userData.aimTarget){targetEditor.editing(true);return;}state.editTarget=false;if(o.userData.joint){state.joint=o.userData.joint;state.tab='pose';$('joint').value=state.joint;}else if(o.userData.camera)state.tab='camera';else{state.tab='light';state.light=o.userData.light;}inspect();attach();});
function control(label,val,min,max,step,fn){const row=document.createElement('label');row.className='control';const span=document.createElement('span');span.textContent=label;const input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.step=step;input.value=+val.toFixed(step>=10?0:step>=1?1:2);input.setAttribute('aria-label',label);input.oninput=()=>{if(input.value===''||!Number.isFinite(input.valueAsNumber))return;timeline.pause();fn(T.MathUtils.clamp(input.valueAsNumber,min,max));};input.onchange=()=>{inspect();attach();};row.append(span,input);$('inspector').append(row);}
function inspect(){if(state.selectionCleared){targetEditor?.sync();gizmo.detach();$('inspector').replaceChildren();$('inspect-title').textContent='未选择对象';$('inspector-help').textContent='点击关节、摄像机、灯光或大纲对象进行选择。';return;}document.body.dataset.propertyTab=state.tab;document.dispatchEvent(new CustomEvent('lumen-property-tab',{detail:state.tab}));if(state.tab==='asset'&&window.lumenAsset){window.lumenAsset.inspect();return;}if($('tab-asset'))$('tab-asset').classList.remove('selected');for(const t of ['pose','camera','light'])$('tab-'+t).classList.toggle('selected',state.tab===t);$('inspector').innerHTML='';if(state.tab==='light'&&!lamps[state.light]){targetEditor?.sync();gizmo.detach();$('inspect-title').textContent='暂无灯光';$('inspector-help').textContent='在右侧「光源列表」下方选光源类型，再点「＋ 添加灯光」。';return;}$('inspect-title').textContent=state.tab==='pose'?labels[state.joint]:state.tab==='camera'?'拍摄相机':lamps[state.light]?.name;if(state.tab==='pose'){for(const a of ['x','y','z'])control('关节 '+a.toUpperCase()+' · m',joints[state.joint].position[a],-6,6,.01,v=>{const p=joints[state.joint].position.clone();p[a]=v;translateJoint(state.joint,p);});const hinge=robot.hingeInfo?.(state.joint);if(hinge)control('屈伸角 °',hinge.angle_deg,hinge.min_deg,hinge.max_deg,1,v=>{robot.setFlexion(state.joint,v);state.poseSource='manual_hinge_fk';updateBody();});else rotationControls(joints[state.joint],q=>rotateJoint(state.joint,q));if(['ls','rs'].includes(state.joint)){const follow=document.createElement('label');follow.className='check';const input=document.createElement('input');input.type='checkbox';input.checked=!!robot.info().shoulder_follow;input.onchange=()=>{robot.setShoulderFollow(input.checked);inspect();sceneHistory?.commit();};follow.append(input,document.createTextNode('抬肩时手臂随肩旋转'));$('inspector').append(follow);}const p=state.points[state.joint];$('inspector-help').textContent=p?`照片关键点：(${p.u.toFixed(3)}, ${p.v.toFixed(3)})；可信度 ${p.visibility.toFixed(2)}。Z 为待校准的深度。`:'肘、膝沿铰链屈伸，禁止反折；肩带与骨盆均有限位。骨长与关节连接固定。上下提髋时左右腿一升一降，前后移髋时脚部保持原位、腰腿自动补偿；腰部带动腰腹和上半身，胸腔带动胸甲与肩颈；超出可达范围会停止。整体移动请选骨盆。';const b=document.createElement('button');b.className='wide delete-light';b.textContent='删除此照片标点（可撤销）';b.onclick=()=>{delete state.points[state.joint];invalidateFit();inspect();};$('inspector').append(b);}else if(state.tab==='camera'){for(const a of ['x','y','z'])control('相机位置 '+a.toUpperCase()+' m',shot.position[a],-20,20,.01,v=>{const p=shot.position.clone();p[a]=v;setCameraPosition(p);});rotationControls(shot,q=>setCameraRotation(q));const fields=[['az','环绕方位 °',-180,180,1],['el','俯仰 °',-85,85,1],['distance','距观察目标 m',.3,20,.01],['fov','垂直视场角 °',12,100,.5],['roll','画面滚转 °',-180,180,1]];for(const[k,label,min,max,step]of fields)control(label,cameraState[k],min,max,step,v=>{cameraState[k]=v;cameraUpdate();invalidateFit();});targetEditor?.addInspector();$('inspector-help').textContent='位移保持注视目标不变；旋转改变朝向和注视点。自由观察视角不会改动拍摄相机。旋转数值为世界 XYZ 欧拉角；传感器高度假设 24 mm。';}else{const l=lamps[state.light];const useLamp=()=>{if(!l.enabled){l.enabled=true;toast(l.name+'原本未启用，已按本次调整开启。');}};addLightTypeSelector($('inspector'),l,()=>{state.lightSource='manual_light_type';useLamp();lightsUpdate();inspect();});addLightIdentityControls($('inspector'),l,{rename:name=>lightManager.rename(l.id,name),remove:()=>lightManager.remove(l.id),toast});const offset=V(l.pos).sub(aim(l)),d0=Math.max(.05,offset.length()),az0=T.MathUtils.radToDeg(Math.atan2(offset.x,offset.z)),el0=T.MathUtils.radToDeg(Math.atan2(offset.y,Math.hypot(offset.x,offset.z)));for(const [key,label,value,min,max,step]of [['az','世界方位 °',az0,-180,180,1],['el','世界仰角 °',el0,-85,85,1],['distance',l.type==='directional'?'方向手柄距离 · m（不影响亮度）':l.type==='point'?'距参考点 · 假设 m':'距灯光目标 · 假设 m',d0,.1,20,.05]])control(label,value,min,max,step,v=>{const p=V(l.pos).sub(aim(l));let az=Math.atan2(p.x,p.z),el=Math.atan2(p.y,Math.hypot(p.x,p.z)),distance=Math.max(.1,p.length());if(key==='az')az=T.MathUtils.degToRad(v);else if(key==='el')el=T.MathUtils.degToRad(v);else distance=v;l.pos=aim(l).add(new T.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)).multiplyScalar(distance)).toArray();useLamp();state.lightSource='manual_angle_distance';lightsUpdate();});if(l.type!=='point')rotationControls(lampObjects[state.light].h,q=>setLampRotation(state.light,q));['x','y','z'].forEach((a,i)=>control('灯光 '+a.toUpperCase()+' · m',l.pos[i],-10,10,.05,v=>{l.pos[i]=v;useLamp();lightsUpdate();state.lightSource='manual';}));for(const[k,label,min,max,step]of [['power','相对强度',0,300,1],['kelvin','色温 K',2000,12000,100],...(l.type==='area'?[['size','灯面宽高 m',.05,4,.05]]:l.type==='point'?[['range','影响范围 m · 0 表示不限',0,1000,.1]]:[])])control(label,k==='range'?pointRange(l):l[k],min,max,step,v=>{l[k]=v;useLamp();lightsUpdate();state.lightSource='manual';});control('环境填充',environment,0,1,.01,v=>{environment=v;lightsUpdate();});targetEditor?.addInspector();const d=describeLight({position_m:l.pos,target_m:aim(l).toArray(),type:l.type,range:pointRange(l),emitter:{width_m:l.size},temperature_K:l.kelvin,color_srgb_hex:'#'+tint(l.kelvin).getHexString()},{position_m:shot.position.toArray(),quaternion_xyzw:shot.quaternion.toArray(),vertical_fov_deg:shot.fov,aspect:shot.aspect});const directionText=document.createElement('p');directionText.className='hint';directionText.textContent=d.text+' 世界高度差 '+d.world_height_difference.toFixed(3)+' m。'+d.warning;$('inspector').append(directionText);$('inspector-help').textContent=l.type==='point'?'点光源从一个位置向四周照明，旋转不改变光照。参考点只用于描述来光方向，不限制照射范围；影响范围 0 表示不限。':l.type==='directional'?'平行光按本体指向目标的方向照明，无距离衰减。移动方向手柄或目标点改变光向；沿同一方向改距离不改亮度。':'面光源各有独立注视点。位移时注视点不变；旋转时更新照射方向。面积光用四点采样模拟软阴影，强度不是标定的 lux / lumen。';}}
function listLights(){$('light-list').innerHTML='';if(!lamps.length){const empty=document.createElement('p');empty.className='hint';empty.textContent='暂无灯光，选择类型后点击「＋ 添加灯光」。';$('light-list').append(empty);}lamps.forEach((l,i)=>{const row=document.createElement('div');row.className='lightrow'+(!state.selectionCleared&&state.tab==='light'&&i===state.light?' on':'');const name=document.createElement('span');name.textContent=l.name+' · '+lightTypeName(l.type);const check=document.createElement('input');check.type='checkbox';check.checked=l.enabled;check.setAttribute('aria-label','开启'+l.name);check.onchange=()=>{l.enabled=check.checked;lightsUpdate();};row.append(name,check);row.onclick=e=>{if(e.target===check)return;state.selectionCleared=false;state.editTarget=false;state.tab='light';state.light=i;inspect();attach();listLights();};$('light-list').append(row);});}
// 多人时灯距/方位要有明确基准，所以给出「布光对象」：默认跟着当前选中角色，也可锁到某一个人。
const subjectBox=document.createElement('div');subjectBox.id='light-subject-box';
const subjectBar=document.createElement('label');subjectBar.className='control';const subjectCaption=document.createElement('span');subjectCaption.textContent='布光对象';
const subjectSelect=document.createElement('select');subjectSelect.id='light-subject';subjectSelect.setAttribute('aria-label','布光对象');
const subjectHint=document.createElement('p');subjectHint.className='hint';subjectHint.textContent='灯距、来光方位和仰角都以这个人的颈-骨盆中心为基准；单人时不用改，多人时点谁的身体就切到谁，也可以在这里钉住某个人。';
subjectBar.append(subjectCaption,subjectSelect);subjectBox.append(subjectBar,subjectHint);
subjectSelect.onchange=()=>{lightSubjectId=subjectSelect.value;syncLightTarget();lightsUpdate();};
function mountSubjectBar(){const list=$('light-list'),host=list&&list.parentElement;if(host&&subjectBox.parentElement!==host)host.insertBefore(subjectBox,list);}
function syncSubjectOptions(){mountSubjectBar();const list=people?people.list():[];subjectSelect.replaceChildren(new Option('当前选中角色','auto'),...list.map(p=>new Option(p.name,p.id)));subjectSelect.value=list.some(p=>p.id===lightSubjectId)?lightSubjectId:'auto';subjectHint.hidden=list.length<2;syncLightTarget();}
document.addEventListener('lumen-people-change',syncSubjectOptions);syncSubjectOptions();
// 光源列表由 lighting-workspace 再挂一次，模块体执行时位置还没定，下一帧补挂。
requestAnimationFrame(syncSubjectOptions);
for(const t of ['pose','camera','light'])$('tab-'+t).onclick=()=>{state.selectionCleared=false;state.tab=t;inspect();attach();listLights();};$('joint').onchange=()=>{state.selectionCleared=false;state.joint=$('joint').value;state.tab='pose';updateBody();inspect();attach();};$('gizmos').onclick=()=>{state.gizmos=!state.gizmos;helperGroup.visible=state.gizmos;grid.visible=state.gizmos&&state.groundVisible!==false;syncJointToggle();$('gizmos').textContent='手柄：'+(state.gizmos?'开':'关');attach();};
$('use-view').onclick=()=>{const t=orbit.target,d=observer.position.clone().sub(t);Object.assign(cameraState,{tx:t.x,ty:t.y,tz:t.z,distance:d.length(),az:T.MathUtils.radToDeg(Math.atan2(d.x,d.z)),el:T.MathUtils.radToDeg(Math.asin(d.y/d.length())),roll:0,fov:observer.fov});cameraUpdate();state.selectionCleared=false;state.tab='camera';inspect();attach();invalidateFit();};
function resize(){const r=$('stage').getBoundingClientRect();if(r.width>0&&r.height>0){renderer.setSize(r.width,r.height);observer.aspect=r.width/r.height;observer.updateProjectionMatrix();}const b=$('matchbox').getBoundingClientRect(),aspect=state.cameraAspectOverride||(state.ref?state.ref.width/state.ref.height:16/9);shot.aspect=aspect;shot.updateProjectionMatrix();if(b.width<=0||b.height<=0)return;const w=Math.min(b.width,b.height*aspect),h=w/aspect;$('shot-wrap').style.width=w+'px';$('shot-wrap').style.height=h+'px';shotRenderer.setSize(Math.max(1,w),Math.max(1,h),false);shot.aspect=aspect;shot.updateProjectionMatrix();$('landmarks').setAttribute('viewBox',`0 0 ${w} ${h}`);}new ResizeObserver(resize).observe($('stage'));new ResizeObserver(resize).observe($('matchbox'));
function project(p){const v=p.clone().project(shot);return {u:(v.x+1)/2,v:(1-v.y)/2,behind:shot.worldToLocal(p.clone()).z>=0};}
const labelToggle=document.createElement('label');labelToggle.className='check';labelToggle.innerHTML='<input id="label-mode" type="checkbox">显示全部关键点名称';labelToggle.title='默认只标当前选中的关节，避免多人合照里名字互相压字';$('show-points').closest('label').after(labelToggle);
function markers(){const svg=$('landmarks');svg.innerHTML='';if(window.lumenAsset?.active())return;if(!$('show-points').checked)return;const r=$('shot-wrap').getBoundingClientRect();people.stash();const ns='http://www.w3.org/2000/svg';const allNames=$('label-mode')?.checked;const labelRows=[];for(const person of people.list()){const isActive=person===people.active();const personJoints=person.joints;const proxies=isActive&&person.rawEstimate?Object.fromEntries(Object.entries(personJoints).filter(([k])=>!k.endsWith('h')).map(([k,m])=>[k,{...project(m.position),visibility:0,source:'proxy_unverified'}])):{};const shown={...proxies,...person.points};for(const[k,p]of Object.entries(shown)){if(p.u<0||p.u>1||p.v<0||p.v>1)continue;const pred=project(personJoints[k].position);const x=p.u*r.width,y=p.v*r.height;const line=document.createElementNS(ns,'line');for(const[a,v]of Object.entries({x1:x,y1:y,x2:pred.u*r.width,y2:pred.v*r.height,stroke:'#e5a275','stroke-width':1}))line.setAttribute(a,v);svg.append(line);const c=document.createElementNS(ns,'circle');c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r',k===state.joint?6:isActive?4:3);c.dataset.joint=k;c.dataset.personId=person.id;c.classList.add('landmark-point');const proxy=p.source==='proxy_unverified';if(proxy){c.setAttribute('fill','none');c.setAttribute('stroke','#7896b7');c.setAttribute('stroke-width','1.4');}else c.setAttribute('fill',p.visibility>=.6?'#d5ec9e':'#e6ab7f');const tip=document.createElementNS(ns,'title');tip.textContent=(isActive?'':person.name+' · ')+labels[k]+(proxy?'（未确认的估计位置）':'');c.append(tip);svg.append(c);if(isActive&&(allNames||k===state.joint||k===dragPoint))labelRows.push({key:person.id+'/'+k,joint:k,x:x+7,y:y-6,w:labels[k].length*10+4,priority:k===state.joint?3:k===dragPoint?2:p.source==='manual'?1:0});}}for(const row of placeLabels(labelRows,{bounds:{width:r.width,height:r.height}})){if(!row.shown)continue;const text=document.createElementNS(ns,'text');text.setAttribute('x',row.x);text.setAttribute('y',row.y);text.textContent=labels[row.joint];text.dataset.joint=row.joint;svg.append(text);}}
let dragPoint=null;$('mark-mode').onchange=()=>$('landmarks').classList.toggle('mark',$('mark-mode').checked);$('landmarks').onpointerdown=e=>{if(!state.ref||!$('show-points').checked||(!e.target.dataset.joint&&!$('mark-mode').checked))return;timeline.pause();if(e.target.dataset.personId)people.select(e.target.dataset.personId);dragPoint=e.target.dataset.joint||state.joint;$('landmarks').classList.add('dragging');$('landmarks').setPointerCapture(e.pointerId);mark(e);};function mark(e){const r=$('shot-wrap').getBoundingClientRect();state.points[dragPoint]={u:T.MathUtils.clamp((e.clientX-r.left)/r.width,0,1),v:T.MathUtils.clamp((e.clientY-r.top)/r.height,0,1),visibility:1,source:'manual'};invalidateFit();state.selectionCleared=false;state.tab='pose';state.joint=dragPoint;$('joint').value=dragPoint;inspect();} $('landmarks').onpointermove=e=>{if(dragPoint)mark(e);};$('landmarks').onpointerup=()=>{const key=dragPoint;dragPoint=null;if(key)armCorrection?.advance(key);$('landmarks').classList.remove('dragging');sceneHistory?.commit();};$('landmarks').onpointercancel=()=>{dragPoint=null;$('landmarks').classList.remove('dragging');sceneHistory?.commit();};
$('opacity').oninput=()=>$('ref').style.opacity=$('opacity').value;
function toast(s){$('toast').textContent=s;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',4500);}
let photoUrl=null,photoImage=null,photoRevision=0;
$('photo').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(f.type.startsWith('video/')||/\.(mp4|webm|mov)$/i.test(f.name)){try{await window.lumenVideo?.loadFile(f);}catch(err){toast(err.message);}return;}window.lumenVideo?.clear();closePoseDetector();const rev=++photoRevision;try{if(!/^image\/(png|jpeg|webp)$/.test(f.type)||f.size>30e6)throw new Error('请使用 30 MB 以内的 JPG、PNG 或 WebP。');const u=URL.createObjectURL(f),im=new Image();await new Promise((res,rej)=>{im.onload=res;im.onerror=()=>rej(new Error('图片无法读取'));im.src=u;});if(im.width*im.height>4e7){URL.revokeObjectURL(u);throw new Error('请将图片缩小至 4000 万像素以内。');}const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await f.arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('');if(rev!==photoRevision){URL.revokeObjectURL(u);return;}if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=u;photoImage=im;sceneHistory?.reset();people.truncate(1);people.select(people.list()[0].id);state.ref={filename:f.name,width:im.width,height:im.height,sha256:hash};state.points={};state.armWarnings=[];state.armFit=null;invalidateFit();$('ref').src=u;$('ref').hidden=false;$('file-info').textContent=`${f.name} · ${im.width} × ${im.height}`;$('pose-status').textContent=window.lumenAsset?.active()?'照片已载入 · 可手动校准导入模型与拍摄相机':'已载入照片 · 点击自动估计开始匹配';resize();document.dispatchEvent(new Event('lumen-photo-loaded'));sceneHistory?.reset();toast('参考图已加载，点「自动估计人体姿态」开始匹配。');}catch(err){toast(err.message);}};
function pointOnPlane(u,v,z){const origin=shot.position.clone(),far=new T.Vector3(u*2-1,1-v*2,0).unproject(shot),dir=far.sub(origin).normalize();const normal=new T.Vector3(0,0,1).applyQuaternion(shot.quaternion),planePoint=new T.Vector3(cameraState.tx,cameraState.ty,cameraState.tz).addScaledVector(normal,z);const den=dir.dot(normal);return origin.addScaledVector(dir,planePoint.sub(origin).dot(normal)/Math.min(-.0001,den));}
function samplePose(){if(!state.cameraLocked){Object.assign(cameraState,{az:0,el:0,distance:2.8,tx:0,ty:1.3,tz:0,fov:16,roll:0});cameraUpdate();}const points={head:[.46,.25,-.02],nose:[.54,.41,.12],neck:[.41,.52,0],ls:[.245,.57,.04],le:[.37,.92,.24],lw:[.76,.45,.38],lh:[.82,.33,.4],rs:[.35,.43,-.1],re:[.255,-.04,-.28],rw:[.6,.13,-.16],rh:[.64,.18,-.14],pelvis:[.43,1.27,-.12],lhip:[.4,1.29,-.08],lk:[.35,1.6,.12],la:[.36,1.94,.04],rhip:[.48,1.27,-.1],rk:[.54,1.58,-.15],ra:[.55,1.94,-.04]};const p={};state.points={};for(const[k,a]of Object.entries(points)){p[k]=pointOnPlane(...a).toArray();if(a[1]>=0&&a[1]<=1)state.points[k]={u:a[0],v:a[1],visibility:k==='rs'?.45:.85,source:'manual_example_annotation'};}applyPose(p,'manual_example_upper_body; occluded_lower_body_assumed');$('pose-status').textContent='本例初稿 · 上半身按图手工标定，遮挡部位为假设';cameraUpdate();sampleLight();state.tab='camera';inspect();attach();jointCalibration();}
$('sample').onclick=()=>{if(!state.ref){toast('先上传参考图，保证画幅比例正确。');return;}samplePose();};$('stand').onclick=()=>{state.points={};robot.setProportions?.(DEFAULT_PROPORTIONS,{method:'reset_to_original',scale_measured:false});document.dispatchEvent(new Event('lumen-body-proportions'));applyPose(standing,'standing_placeholder');$('pose-status').textContent='站立白模 · 已恢复原始头身与肢体比例';};
const lift=document.createElement('button');lift.id='lift-pose';lift.className='wide';lift.textContent='将已标点生成平面姿态初稿';$('fit').before(lift);lift.onclick=()=>{if(Object.keys(state.points).length<4){toast('请先至少标记 4 个关节。');return;}const p={};for(const[k,m]of Object.entries(joints))p[k]=state.points[k]?pointOnPlane(state.points[k].u,state.points[k].v,0).toArray():m.position.toArray();applyPose(p,'manual_2d_lift; depth_unresolved');$('pose-status').textContent='手动标点初稿 · 已标点深度暂为同一平面';};
const poseQuality=document.createElement('label');poseQuality.innerHTML='姿态模型<select id="pose-quality"><option value="full">Full · 原版模型（图片 / 视频）</option></select>';$('auto').before(poseQuality);
const cloudPoseBtn=document.createElement('button');cloudPoseBtn.id='cloud-pose';cloudPoseBtn.className='wide';cloudPoseBtn.textContent='云端校正站位（大模型兜底）';cloudPoseBtn.disabled=true;
// 可用时的固定说明；不可用时换成真因，不留「亮着但一点就失败」的入口。
const CLOUD_POSE_HINT='先完成多人自动识别（2 人及以上）这里才可用；独立打开本页没有出图服务，会一直置灰。可用后点击会先问一次是否计费（发一次计费一次，分区图约 30–120 秒返回）：云端出人物分区图 → 本地按色块分配身份 → 按深度重排前后，是识别串人时的人工兜底入口';
cloudPoseBtn.title=CLOUD_POSE_HINT;poseQuality.after(cloudPoseBtn);
// ---- 手工修正人物分区 ----
// 云端那张分区图只能被动接受太久了：两人一色就少摆白模、背景一块色就多塞角色。这里加第三条路：
// 把这次拆出来的人显示给你看，不满意就原地涂两笔，改完直接接回「逐人估姿态」，全程不再花钱。
// 载体是索引层（像素值 = 身份号，0 是背景），一律按参考图原尺寸建；编辑器与重识别吃同一份，不重新上色回传。
let lastSegment=null,segmentColors=null;
function hostBridgeCall(name){if(window.parent===window)return null;try{const fn=window.parent.choukaLumenHost?.[name];return typeof fn==='function'?fn:null;}catch{return null;}}
// 通道「为什么没有」只有外壳知道（没登录态 / 原图没读进来 / 没落到项目 / 这页根本没接线），
// 外壳把文案推过来，这里才能把灰按钮和状态行写实，而不是静默退回整图识别。
function hostNote(name){if(window.parent===window)return null;try{const v=window.parent.choukaLumenHost?.[name];return typeof v==='string'&&v.trim()?v.trim():null;}catch{return null;}}
// 工作台里自己换过图：外壳那份原图 File 不跟着变（loadPhoto 是单向的），
// 两条拆人链路送出去的还是画布上原来那张，分区会和画面错位，所以这一步先拦住。
let localPhotoSwap=false;
function extractUnavailableNote(){
 if(localPhotoSwap)return '工作台里换过图，外壳没收到这张新图，两条拆人链路送出去的还是画布原来那张；请在画布侧换图后重新打开工作台。';
 return [hostNote('analyzePoseNote'),hostNote('extractPeopleNote')].filter((t,i,a)=>t&&a.indexOf(t)===i).join('');
}
// 两条拆人都没接上时，「没蒙版」不是「还没点识别」，是这条路在本页走不通。
function extractReady(){return cloudExtractReady()||localExtractReady();}
function segmentColorOf(index){
 if(!segmentColors){const fn=hostBridgeCall('segmentColors');if(fn){try{segmentColors=fn(MAX_SEGMENT_PEOPLE)||null;}catch{segmentColors=null;}}}
 // 外壳没给颜色出口时退回与 identityColor 同源的 6 色调色板；第 7 色起只有那边算得出，本页不另造一份色表。
 const hex=(segmentColors&&segmentColors[index-1])||SEGMENT_PALETTE[(index-1)%SEGMENT_PALETTE.length];
 const value=parseInt(hex.slice(1),16);return [(value>>16)&255,(value>>8)&255,value&255];
}
// 禁用原因一律写清缺什么，不允许静默置灰。
// no-masks 和 no-extract 的差别是「还没拆」和「这条路在本页走不通」，处置动作完全不同。
function segmentReason(){if(!photoImage)return 'no-photo';if(state.autoBusy)return 'busy';if(!hostBridgeCall('editSegment'))return 'no-host';if(!lastSegment)return extractReady()?'no-masks':'no-extract';return null;}
function segmentNote(reason){
 if(reason!=='no-extract')return null;
 return '这一版走的是本地整图识别，只出关键点、没有每人蒙版，所以这里改不动。'
  +(extractUnavailableNote()||'本页独立打开时，两条拆人通道都不在外壳手里。');
}
function renderSegmentUI(){const reason=segmentReason();segmentUI.render({layer:lastSegment?lastSegment.layer:null,people:lastSegment?lastSegment.people:[],manual:!!(lastSegment&&lastSegment.manual),reason,reasonNote:segmentNote(reason),source:lastSegment?lastSegment.source:null,sizeNote:lastSegment?lastSegment.sizeNote:null});renderLocalExtract();}
function openSegmentEditor(){
 if(segmentReason()){toast(segmentUI.button.title);return;}
 hostBridgeCall('editSegment')({width:lastSegment.layer.width,height:lastSegment.layer.height,data:lastSegment.layer.data,manual:!!lastSegment.manual,people:lastSegment.people.map((p)=>({index:p.index,label:p.label}))});
}
const segmentUI=createSegmentManualUI({getPhotoImage:()=>photoImage,colorOf:segmentColorOf,onEdit:openSegmentEditor,toast});
cloudPoseBtn.before(segmentUI.preview,segmentUI.button,segmentUI.note);
// 本地拆人入口：与云端拆人同一条后续处理，差别只在分区是谁切的、要不要花钱。
const localExtractBtn=document.createElement('button');
localExtractBtn.id='local-extract';localExtractBtn.className='wide';
localExtractBtn.textContent='本地模型拆人（不花钱）';
cloudPoseBtn.after(localExtractBtn);
localExtractBtn.onclick=()=>runLocalExtract();
renderSegmentUI(); // 起手就把禁用原因写在按钮下面，别留一颗点了没反应的灰按钮。
// 参考图是异步解完码才挂上的（外壳递图也走这条路），只在建控件时渲染一次会一直停在「先上传参考图」。
document.addEventListener('lumen-photo-loaded',renderSegmentUI);
let lastAuto=null; // 最近一次多人自动识别的上下文，云端校正复用里面的 estimates，不重跑 MediaPipe。
// 识别结果分两层：状态行只说「几个角色 + 下一步」，逐人明细收进可展开块，六段长串不再挤在一行里。
const poseDetail=document.createElement('details');poseDetail.id='pose-detail';poseDetail.className='pose-report';
const poseDetailHead=document.createElement('summary');poseDetailHead.textContent='逐人明细与后续检查';
poseDetail.append(poseDetailHead);
$('pose-status').after(poseDetail);
function poseDetailRows(lines){const rows=(lines||[]).filter(Boolean);if(!rows.length){poseDetail.hidden=true;return;}poseDetail.hidden=false;poseDetail.replaceChildren(poseDetailHead,...rows.map(t=>{const p=document.createElement('p');p.className='hint';p.textContent=t;return p;}));}
// ---- 前后排序用的深度图 ----
// 深度图只改「多人谁前谁后」，是自动识别里的一步而不是第 0 步，所以入口跟着识别按钮放在姿态面板，
// 不再压在工作台顶上。节点图与手动图都由外壳读（素材带登录态），这里只显示状态、把用户的选择交回去。
const depthRow=document.createElement('div');depthRow.id='pose-depth-row';depthRow.className='pose-depth';depthRow.hidden=true;
depthRow.setAttribute('role','group');depthRow.setAttribute('aria-label','前后排序用的深度图');
const depthNote=document.createElement('p');depthNote.className='pose-depth-note';depthNote.setAttribute('role','status');depthNote.setAttribute('aria-live','polite');
const depthOnLabel=document.createElement('label');depthOnLabel.className='check pose-depth-toggle';
const depthOnBox=document.createElement('input');depthOnBox.type='checkbox';
depthOnLabel.append(depthOnBox,document.createTextNode('按深度图定前后'));
const depthPickLabel=document.createElement('label');depthPickLabel.className='pose-depth-pick';depthPickLabel.title='深度节点不在本画布上跑时，直接选一张深度图（白近黑远）接管';
const depthPickInput=document.createElement('input');depthPickInput.type='file';depthPickInput.accept='image/png,image/webp,image/jpeg';
depthPickLabel.append(depthPickInput,document.createTextNode('用本地深度图'));
const depthReset=document.createElement('button');depthReset.type='button';depthReset.textContent='改回节点深度图';
depthRow.append(depthNote,depthOnLabel,depthPickLabel,depthReset);
$('pose-status').after(depthRow);
// 独立打开本页时外壳不在，深度图行整行隐藏（没有能接住选择的宿主，不能留点了没反应的假控件）。
function depthHostCall(name,arg){const host=window.parent!==window?window.parent.choukaLumenHost:null;const fn=host&&host[name];if(typeof fn!=='function'){toast('深度图要由外层工作台读取，本页独立打开时用不了。');return;}fn(arg);}
depthOnBox.onchange=()=>depthHostCall('setDepthEnabled',depthOnBox.checked);
depthPickInput.onchange=(e)=>{const file=e.target.files[0];e.target.value='';if(file)depthHostCall('pickDepthMap',file);};
depthReset.onclick=()=>depthHostCall('resetDepthMap');
// 外壳每次深度图状态变了推一次；不推（或推 null）就整行收起。
export function setDepthStatus(payload){
if(!payload){depthRow.hidden=true;return;}
depthRow.hidden=false;depthRow.dataset.tone=String(payload.status||'idle');
depthNote.textContent=payload.note||'没接深度图：多人前后按画面接地点高低估。';
depthOnBox.checked=!!payload.enabled;
depthOnLabel.hidden=!payload.hasMap;
depthPickLabel.hidden=!payload.pickable;
depthReset.hidden=!payload.resettable;
}
// 本地那条不花钱，只借步骤条和失败留痕；云端那条多一道事前计费确认与失败降级。
const poseFlow=createCloudFlow({kind:'pose',host:$('pose-status').parentNode,insertBefore:poseDetail,free:true});
const cloudFlow=createCloudFlow({kind:'pose',host:$('pose-status').parentNode,insertBefore:poseDetail,onDegrade:()=>toast('已保留本地摆放，可继续手动调整白模。'),onAsk:askWaitCopy});
// 正式线默认那条：先让云端把人拆出来，拆不出来后面全跑不了，所以降级只能退回不花钱的本地整图识别。
const autoCloudFlow=createCloudFlow({kind:'pose',host:$('pose-status').parentNode,insertBefore:poseDetail,overrides:EXTRACT_OVERRIDES,onDegrade:()=>runLocalExtract(),onAsk:askWaitCopy});
// 手工改完分区那条：不发云端请求、不问计费，只借同一套步骤条与失败留痕（free 流程壳）。
const manualFlow=createCloudFlow({kind:'pose',host:$('pose-status').parentNode,insertBefore:poseDetail,free:true,overrides:{steps:['按手工分区数出人物','整图识别并按分区分配身份','逐人估姿态与落地校正']}});
// 本地模型拆人那条（不花钱）：外壳发分割请求，这里只接身份层并跑免费的后续段。
const localFlow=createCloudFlow({kind:'pose',host:$('pose-status').parentNode,insertBefore:poseDetail,free:true,overrides:{steps:['本地模型逐人分割','汇成一张人物分区层','按分区逐人估姿态','落地校正与关节校准']}});
// 确认条挂出来的同时状态行要有字：只把按钮变灰，用户读到的是「点了没反应」。
function askWaitCopy(){$('pose-status').textContent='等待你确认是否花钱 · 60 秒不点会自动取消（不计费）';}
// 等确认期间没人应答也要收摊：ask() 到点自己取消，这里只负责把话说清，不顺手起跑识别。
function askCancelled(flow){if(!flow.askTimedOut())return false;$('pose-status').textContent='已取消：没确认是否花钱，本次未发送云端请求（不计费）。';return true;}
// 把一组人摆进场景：hints 给定时按 hint 重解深度，groundModes 指定每人的落地候选关节（云端拆分卡口径）。
async function placeAllPersons(firstPass,hints,groundModes,rev,notes,hintTag){
 const multi=firstPass.length>1;
 for(let i=0;i<firstPass.length;i++){const {person,estimate}=firstPass[i];if(rev!==photoRevision)return false;people.select(person.id);await robot.ready;if(rev!==photoRevision)return false;state.points=estimate.points;let reconciled=firstPass[i].reconciled;const useHint=!!(hints&&Number.isFinite(hints[i])&&Math.abs(hints[i]-reconciled.diagnostics.depth_m_assumption)>.01);if(useHint)reconciled=reconcilePoseDepth(estimate.pose,estimate.points,shot,{...depthSettings(),depthHint:hints[i]});
 let pose=reconciled.pose;
 person.rawEstimate=estimate;person.depthDiagnostics=reconciled.diagnostics;person.warnings=estimate.warnings||[];
 const propInfo=matchProportions(estimate,reconciled.diagnostics);notes.scale.push(person.name+'：'+(propInfo?.available?'约 '+propInfo.head_body_ratio+' 头身，已匹配 '+propInfo.estimated_fields.length+' 项比例':(propInfo?.reason||'自动比例开关已关闭，保留当前体型')));
 applyPose(pose,'mediapipe_multi_person; bounded_depth_prior'+(useHint?'+'+hintTag:'')+(multi?'+ground_contact':''));if(!state.cameraLocked){Object.assign(cameraState,{az:0,el:0,distance:3,tx:0,ty:1.3,tz:0,fov:40,roll:0});cameraUpdate();}
 await jointCalibration();
 if(multi){const mode=groundModes&&groundModes[i]||'feet';const candidates=GROUND_CANDIDATES[mode]||GROUND_CANDIDATES.feet;const ground=candidates.length?groundContactShift(Object.fromEntries(Object.entries(joints).map(([k,m])=>[k,m.position.toArray()])),estimate.points,candidates):null;if(ground){for(const m of Object.values(joints))m.position.y+=ground.shift;notes.ground.push(person.name+' 按「'+labels[ground.joint]+'」落地');updateBody();}else if(mode==='airborne')notes.ground.push(person.name+' 离地（跳起/被托举），不做落地校正');}
 people.stash();}
 return true;
}
let detector=null; // Full is the sole model; actual inference runs off the UI thread.
async function runAutoPose(){if(window.lumenVideo?.hasVideo()){window.lumenVideo.analyze();return;}if(!photoImage){toast('请先上传图片或视频。');return;}if(state.autoBusy)return;state.autoBusy=true;$('auto').disabled=true;$('pose-quality').disabled=true;cloudFlow.hide();autoCloudFlow.hide();const rev=photoRevision,operation=++poseOperation;lastSegment=null;renderSegmentUI();$('pose-status').textContent='正在加载原版模型并识别图片…';const run=poseFlow.start();try{const result=await detectPose(photoImage);poseFlow.step(1);
if(rev!==photoRevision||operation!==poseOperation||window.lumenAsset?.active())return;if(!result.landmarks.length||!result.worldLandmarks.length)throw new Error('未检测到完整可用的人体，请改用本例初稿或手动标点。');const estimates=result.landmarks.map((pts,i)=>{try{return estimatePhotoPerson(pts,result.worldLandmarks[i],{standing,anchor:joints.pelvis.position.clone(),cameraQuaternion:shot.quaternion,aspect:shot.aspect});}catch{return null;}}).filter(Boolean).sort((a,b)=>a.bounds.left-b.bounds.left);if(!estimates.length)throw new Error('可靠人体关键点不足，请手动修正。');
people.truncate(1);while(people.list().length<estimates.length)people.add('person-'+(people.list().length+1));
const scaleNotes=[],groundNotes=[],depthNotes=[];
const multi=estimates.length>1;if(multi){state.cameraLocked=true;syncCameraFitLock();}
const depthMap=multi?(window.__choukaDepthMap||null):null;
const firstPass=[];
for(let i=0;i<estimates.length;i++){if(rev!==photoRevision)return;const person=people.list()[i],estimate=estimates[i];people.select(person.id);await robot.ready;if(rev!==photoRevision)return;state.points=estimate.points;person.bounds=estimate.bounds;firstPass.push({person,estimate,reconciled:reconcilePoseDepth(estimate.pose,estimate.points,shot,depthSettings())});}
const depthFallbacks=firstPass.map(p=>p.reconciled.diagnostics.depth_m_assumption);
let hints=depthMap?depthHintsFromNearness(firstPass.map(p=>personNearness(depthMap,p.estimate.points)),depthFallbacks):null;
let hintTag='depth_map_hint';
if(hints)depthNotes.push('人与人相对深度已按深度图校正');
else if(depthMap)depthNotes.push('深度图人与人深度差过小，按同深处理');
else if(multi){
  // 没接深度图不等于只能躺平按骨长：同一地面的人，画面里接地点越低一般越近，用它给个保守次序。
  hints=depthHintsFromContact(firstPass.map(p=>contactNearness(p.estimate.points,p.estimate.bounds?.bottom)),depthFallbacks);
  hintTag='ground_contact_hint';
  depthNotes.push(hints?'未接深度图：人与人前后按画面接地点高低估，幅度只拉开骨长 ±12%':'接地点高低分不出前后，人与人按骨长同深处理');
}
const notes={scale:scaleNotes,ground:groundNotes};
poseFlow.step(2);
if(!await placeAllPersons(firstPass,hints,null,rev,notes,hintTag))return;
lastAuto={rev,firstPass,fallbacks:firstPass.map(p=>p.reconciled.diagnostics.depth_m_assumption)};
cloudPoseBtn.disabled=!(multi&&cloudExtractReady());
cloudPoseBtn.title=cloudPoseBtn.disabled&&multi?cloudExtractBlocked():CLOUD_POSE_HINT;
people.select(people.list()[0].id);inspect();attach();state.poseDetection=result.diagnostics||null;
const warnNotes=[];for(const person of people.list())for(const w of person.warnings||[])warnNotes.push(person.name+'：'+(w.side==='l'?'左':'右')+'臂'+w.reason);
state.armWarnings=warnNotes;
$('pose-status').textContent='已识别 '+estimates.length+' 个角色，可在左侧「角色」下拉里切换并独立修正。'+(noExtractNote?'本次没走拆人链路，没有每人蒙版，「手工改分区」改不动（原因见逐人明细）。':'')+(multi&&!depthMap?'这条链路没接深度图，人与人前后按画面接地点高低估；串人时可点上方「云端校正站位」重排（发一次计费一次）。':'');
poseDetailRows([
  noExtractNote||'',
  scaleNotes.length?'头身与肢体比例已按识别骨长估计：'+scaleNotes.join('；')+'。':'自动比例开关已关闭或有角色肩髋不可靠，体型保留原白模。',
  warnNotes.length?warnNotes.length+' 处手臂关键点不可信，已按模板回退：'+warnNotes.join('；')+'。':'手臂关键点全部可信，未做模板回退。',
  depthNotes.length?depthNotes.join('；')+'。':'',
  groundNotes.length?'落地校正：'+groundNotes.join('；')+'。':'',
]);
poseFlow.done(estimates.length+' 个角色');
}catch(err){const msg='自动匹配未完成：'+err.message;$('pose-status').textContent=msg;poseDetailRows([]);poseFlow.fail(msg,{onRetry:runAutoPose});}finally{noExtractNote=null;state.autoBusy=false;renderSegmentUI();$('pose-quality').disabled=false;sceneHistory?.commit();$('auto').disabled=!!window.lumenAsset?.active();poseFlow.abandon(run);}}
// 云端这条把同一张照片交给生图大模型重绘成「人物分区图」，本地按最近色拆出每人蒙版。
// 「自动估计人体姿态」默认先走它（人数由色块数出来）；「云端校正站位」是本地识别摆好后的事后校正（人数已知）。
// （分区图口径：左起第 i 个人 = 固定调色板第 i 色，纯黑背景，尺寸不变。）
// 姿态识别用「整图识别 + 色块身份分配」：整图重跑一次 MediaPipe，每个检出档按
// 「可见关节落在谁的色块里」分配给对应角色——拆分图管身份（不串人），整图识别管
// landmark 质量（隔离重识别实测孤立剪影检出不稳，只作整图缺档时的逐人补充）；
// 前后深度用躯干锚点深度图采样排序（与自动识别同口径），不让模型报排序（它在合照上稳定误判）。
// 分区图对不上人数、尺寸或色块占比就整张作废：事后校正那条保留本地摆放，默认第一步那条还没摆过任何东西，只能重来。
// 云端校正前置条件都在这一个函数里说清楚：按钮禁用态的 title 也照这套口径写。
function cloudPoseReady(){const ctx=lastAuto;if(!ctx||ctx.firstPass.length<2){toast('先完成多人自动识别，再云端校正。');return null;}if(ctx.rev!==photoRevision){toast('照片已更换，请重新自动识别。');return null;}if(state.autoBusy)return null;return ctx;}
cloudPoseBtn.onclick=async()=>{const ctx=cloudPoseReady();if(!ctx)return;if(!await cloudFlow.ask()){if(!askCancelled(cloudFlow))toast('未发送云端请求，本地摆放保持不变。');return;}await runCloudPose(ctx.firstPass.length);};
// 失败块里的「重试」直接再发一次：刚点过确认就不再重复问，但按钮文案写明会再计费一次。
// expectedCount 传数字 = 事后校正那条（人数已知，摆好的本地结果不能丢）；传 null = 默认第一步那条，
// 人数由分区图色块数出来，拆不出人就没有逐人估姿，opts.flow/opts.prefix/opts.kept 决定用哪条进度壳和哪种说法。
// 把一张位图按最近邻铺到目标尺寸：分区图返回尺寸 ≠ 送出尺寸时的校正。
// 不开平滑，色块边界一旦被插值糊掉，按色拆人就会多出一圈「谁都不是」的过渡色。
function resizeTo(image,width,height){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,width,height);
 return canvas;
}
// ---- 本地模型拆人（不花钱）----
// 云端那张分区图既花钱、边界又是大模型手绘的；本地分割模型直接按人出蒙版。
// 产物刻意与云端同形（同一张身份索引层），所以「二次编辑分区 → 逐人估姿态」整条复用，不另开链路。
const LOCAL_EXTRACT_HINT='用本机分割模型把图里的人逐个拆出来：不花钱，结果和云端分区图同形，可以接着手工改分区、逐人估姿态。两人紧贴时可能连成一块，靠手工分区拆开。';
function localExtractReady(){if(window.parent===window||localPhotoSwap)return false;try{return typeof window.parent.choukaLumenHost?.extractPeople==='function';}catch{return false;}}
// 灰掉时要说真因：独立打开、外壳没接这条、工作台里换过图，三种处置动作不一样。
function localExtractBlocked(){
 return localPhotoSwap?extractUnavailableNote()
  :hostNote('extractPeopleNote')||'本地拆人要由外层工作台调分割服务，单独打开本页时用不了。';
}
function cloudExtractBlocked(){
 return localPhotoSwap?extractUnavailableNote()
  :hostNote('analyzePoseNote')||'云端拆人要由外层工作台发分区图请求，单独打开本页时用不了。';
}
function renderLocalExtract(){
 const reason=!photoImage?'no-photo':state.autoBusy?'busy':localExtractReady()?null:'no-host';
 localExtractBtn.disabled=!!reason;
 localExtractBtn.title=reason==='no-photo'?'先上传参考图，本地模型才有图可拆。'
  :reason==='busy'?'正在识别，这一轮跑完就能拆。'
  :reason==='no-host'?localExtractBlocked():LOCAL_EXTRACT_HINT;
 localExtractBtn.dataset.state=reason||'ready';
}
async function runLocalExtract(){
 if(window.lumenVideo?.hasVideo()){window.lumenVideo.analyze();return;}
 if(!photoImage){toast('先上传参考图，本地模型才有图可拆。');return;}
 if(state.autoBusy)return;
 if(!localExtractReady()){markNoExtractFallback();await runAutoPose();return;}
 state.autoBusy=true;$('auto').disabled=true;$('pose-quality').disabled=true;renderLocalExtract();
 poseFlow.hide();cloudFlow.hide();autoCloudFlow.hide();manualFlow.hide();poseDetailRows([]);
 $('pose-status').textContent='正在用本地分割模型把图里的人逐个拆出来…';
 const run=localFlow.start();
 try{
  const payload=await window.parent.choukaLumenHost.extractPeople({mode:'local'});
  if(!payload||!payload.layer)throw new Error((payload&&payload.error)||'分割服务没有回人物分区层');
  const built=layerToParsed({width:payload.layer.width,height:payload.layer.height,data:payload.layer.data,identities:payload.identities},'local');
  await runCloudPose(null,{flow:localFlow,prefix:'本地拆人未完成',kept:'未应用任何识别结果',parsed:built.parsed,people:built.people,source:'local'});
 }catch(err){
  const msg='本地拆人未完成：'+err.message;
  $('pose-status').textContent=msg;
  localFlow.fail(msg,{detail:'本地分割不花钱，可以直接重试；要改让云端大模型拆人，再点一次「自动估计人体姿态」即可（发一次计费一次）。'});
  state.autoBusy=false;$('auto').disabled=!!window.lumenAsset?.active();$('pose-quality').disabled=false;
  renderSegmentUI();localFlow.abandon(run);
 }finally{
  // 成功时 runCloudPose 只按 fresh 放行「自动估计」按钮，精度档是这一条按住的，得由这一条还。
  state.autoBusy=false;$('pose-quality').disabled=false;renderLocalExtract();
 }
}
async function runCloudPose(expectedCount,opts){
const flow=(opts&&opts.flow)||cloudFlow,label=(opts&&opts.prefix)||'云端校正未应用',kept=(opts&&opts.kept)||'已保留本地摆放',fresh=expectedCount==null;
// 同一套后续处理有三种分区来源：云端大模型手绘的分区图、本地分割模型、手工涂改。
// 只有云端那条会花钱，也只有云端那条需要把分区图铺回原图尺寸。
const fromLayer=!!(opts&&opts.parsed);
const source=fromLayer?(opts.source==='local'?'local':'manual'):'cloud';
const manual=source==='manual',local=source==='local';
let sizeNote=null; // 云端返回尺寸与送出尺寸不一致时的说明，进状态行也进预览口径，不静默重采样
if(fresh){if(!photoImage){toast('请先上传参考图，再让云端拆出图里的人。');return;}
// 忙碌位是上游「本地拆人」自己占的，这里再拿它当重复点击就等于把整条链路静默堵死。
if(state.autoBusy&&!local)return;}
else{const ctx=cloudPoseReady();if(!ctx)return;expectedCount=ctx.firstPass.length;}
state.autoBusy=true;cloudPoseBtn.disabled=true;if(fresh)$('auto').disabled=true;poseFlow.hide();cloudFlow.hide();autoCloudFlow.hide();manualFlow.hide();poseDetailRows([]);const rev=photoRevision;
if(source==='cloud')$('pose-status').textContent='正在请云端大模型绘制人物分区图…';const run=flow.start();try{
// opts.parsed 给定时是「手工改完分区」那条：分区图不再请云端重发，直接吃本地这份索引层拆出的蒙版。
let parsed=opts&&opts.parsed;
if(parsed)flow.step(1);else{
const segment=await window.choukaLumen?.analyzePose?.(expectedCount);if(rev!==photoRevision)return;
flow.step(1);
if(!segment)throw new Error('外壳未提供云端分析，'+kept+'。');if(!photoImage)throw new Error('照片不可用，无法应用云端分区图。');
// 外壳连「送给网关的尺寸」一起回：分区图只有落回那一帧才谈得上和原图对齐。
// 光看宽高比 2% 检不出整幅平移或单边裁切（右边缘最多能差 20px 也不报错）。
const dataUrl=typeof segment==='string'?segment:segment.dataUrl;
const sentWidth=typeof segment==='object'?segment.sentWidth|0:0,sentHeight=typeof segment==='object'?segment.sentHeight|0:0;
let seg=await loadImage(dataUrl);
const aspectIn=photoImage.naturalWidth/photoImage.naturalHeight,aspectOut=seg.naturalWidth/seg.naturalHeight;
if(!Number.isFinite(aspectOut)||Math.abs(aspectIn-aspectOut)/aspectIn>.02)throw new Error('云端分区图与原图宽高比不符，'+kept+'。');
if(sentWidth&&sentHeight&&(seg.naturalWidth!==sentWidth||seg.naturalHeight!==sentHeight)){
 sizeNote='云端返回 '+seg.naturalWidth+'×'+seg.naturalHeight+'、与送出的 '+sentWidth+'×'+sentHeight+' 不一致，已按送出尺寸校正';
 seg=resizeTo(seg,sentWidth,sentHeight);}
parsed=masksFromSegmentImage(seg,expectedCount);}
if(!parsed)throw new Error((fresh?'分区图里数不出可信的人物色块':'云端分区图与识别结果对不上（人数或色块占比不可信）')+'，'+kept+'。');
// 这一版分区留在内存里，预览与「手工改分区」都从它起手；索引层按参考图原尺寸建，
// 云端那张被对齐到 16 的倍数改过尺寸，拿它的尺寸当原图尺寸会让包含度配对系统性偏。
lastSegment={layer:fromLayer?parsed.layer:indexLayerFromMasks({masks:parsed.masks,maskWidth:parsed.width,maskHeight:parsed.height,width:photoImage.naturalWidth,height:photoImage.naturalHeight}),manual,source,sizeNote,people:opts&&opts.people||parsed.masks.map((mask,at)=>({index:at+1,label:'人物'+(at+1),ratio:maskShare(mask),manual}))};
renderSegmentUI();
const operation=++poseOperation,depthMap=window.__choukaDepthMap||null,firstPass=[],used=new Set();
$('pose-status').textContent=(source==='cloud'?'云端分区图已返回':(source==='local'?'本地模型已拆出 '+parsed.masks.length+' 个人':'已按手工分区数出 '+parsed.masks.length+' 个人'))+'，正在整图识别并按'+(source==='cloud'?'色块':'分区')+'分配身份…';
// 默认第一步：色块数出来几个人就摆几个白模，身份顺序 = 画面左起（同色可循环复用，人数不受色数限制）。
if(fresh){people.truncate(1);while(people.list().length<parsed.masks.length)people.add('person-'+(people.list().length+1));if(parsed.masks.length>1){state.cameraLocked=true;syncCameraFitLock();}flow.step(2);}
const whole=await detectPose(photoImage);if(rev!==photoRevision||operation!==poseOperation)return;
if(!fresh)flow.step(2);
if(!whole.landmarks.length||!whole.worldLandmarks.length)throw new Error('整图未识别到可用人体，'+kept+'。');
// 先算「检出档 × 色块」包含度矩阵，再全局贪心配对：分数最高的一对先定，档与人各只能用一次，
// 避免按人顺序逐个挑把好档错配给别人的色块。
const candidateInfo=whole.landmarks.map((pts,c)=>{const vis=pts.filter(p=>(p.visibility??0)>=.5),xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);return{c,vis,area:(Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys)),scores:parsed.masks.map(mask=>{if(!vis.length)return 0;const inside=vis.filter(p=>maskHasPoint(mask,parsed.width,parsed.height,p.x,p.y)).length;return inside/vis.length;})};});
window.__cloudSegmentDebug={whole:candidateInfo.map(info=>({c:info.c,area:+info.area.toFixed(4),scores:info.scores.map(s=>+s.toFixed(2))})),people:[]};
const pairs=[];
for(let i=0;i<parsed.masks.length;i+=1)for(const info of candidateInfo){if(info.vis.length&&info.scores[i]>=.6)pairs.push({i,c:info.c,score:info.scores[i],area:info.area});}
pairs.sort((a,b)=>b.score-a.score||b.area-a.area);
const pickedByMask=new Array(parsed.masks.length).fill(null);
for(const pair of pairs){if(pickedByMask[pair.i]||used.has(pair.c))continue;pickedByMask[pair.i]=pair;used.add(pair.c);}
for(let i=0;i<parsed.masks.length;i+=1){if(rev!==photoRevision||operation!==poseOperation)return;
const mask=parsed.masks[i];const pick=pickedByMask[i];
let estimate=null,isoUsed=false,isoBest=null;
if(pick){estimate=estimatePhotoPerson(whole.landmarks[pick.c],whole.worldLandmarks[pick.c],{standing,anchor:joints.pelvis.position.clone(),cameraQuaternion:shot.quaternion,aspect:shot.aspect});}
else{
// 整图没检出这档人：多变体隔离重识别候选池——灰底 / 模糊底 / 包围盒裁剪各跑一遍，
// 每个候选按「可见关节落在本人色块内的比例」打分，取 ≥0.6 里面积最大者；
// 全无包含才退取全局面积最大（假巨人、半人档靠包含度拒收）。
isoUsed=true;
$('pose-status').textContent='第 '+(i+1)+' 个人整图未检出，正在按色块多变体隔离重识别…';
const nw=photoImage.naturalWidth,nh=photoImage.naturalHeight,bb=maskBBox(mask,parsed.width,parsed.height);
const mw=(bb[2]-bb[0])*.12,mh=(bb[3]-bb[1])*.12;
const rect=[Math.max(0,bb[0]-mw),Math.max(0,bb[1]-mh),Math.min(1,bb[2]+mw),Math.min(1,bb[3]+mh)];
const cropW=Math.max(1,Math.round((rect[2]-rect[0])*nw)),cropH=Math.max(1,Math.round((rect[3]-rect[1])*nh));
const variants=[{canvas:isolatePerson(photoImage,mask,parsed.width,parsed.height,nw,nh),rect:null},{canvas:isolatePerson(photoImage,mask,parsed.width,parsed.height,nw,nh,{blur:28}),rect:null},{canvas:isolatePerson(photoImage,mask,parsed.width,parsed.height,cropW,cropH,{rect}),rect}];
const pool=[];
for(const variant of variants){const result=await detectPose(variant.canvas);if(rev!==photoRevision||operation!==poseOperation)return;
// 裁剪变体的关节坐标是裁剪图归一化系，映射回原图归一化系再算包含度/估姿态，否则尺度全错。
const rr=variant.rect,map=rr?(p)=>({...p,x:rr[0]+p.x*(rr[2]-rr[0]),y:rr[1]+p.y*(rr[3]-rr[1])}):(p)=>p;
for(let idx=0;idx<result.landmarks.length;idx+=1){const raw=result.landmarks[idx];const pts=raw.map(map);const vis=pts.filter(p=>(p.visibility??0)>=.5);if(!vis.length||idx>=result.worldLandmarks.length)continue;
const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);let inside=0;for(const p of vis)inside+=maskHasPoint(mask,parsed.width,parsed.height,p.x,p.y)?1:0;
const spanY=Math.max(...ys)-Math.min(...ys);let legs=0;for(const j of[25,26,27,28])if((pts[j]?.visibility??0)>=.5)legs+=1;
pool.push({lm:pts,wm:result.worldLandmarks[idx],score:inside/vis.length,cover:Math.min(1,spanY/(bb[3]-bb[1])),legs,area:(Math.max(...xs)-Math.min(...xs))*spanY});}}
if(!pool.length)throw new Error('第 '+(i+1)+' 个人的色块内未识别到可用人体，'+kept+'。');
// 同包含度下优先腿脚关节全的档（落地校正要吃踝/膝可见性），再比覆盖与面积。
const contained=pool.filter(p=>p.score>=.6&&p.cover>=.6);
const best=(contained.length?contained:pool).slice().sort((a,b)=>b.legs-a.legs||b.cover-a.cover||b.area-a.area)[0];
isoBest={score:+best.score.toFixed(2),cover:+best.cover.toFixed(2),legs:best.legs,area:+best.area.toFixed(4),pool:pool.length,detail:pool.map(p=>({s:+p.score.toFixed(2),c:+p.cover.toFixed(2),l:p.legs,a:+p.area.toFixed(3)}))};
estimate=estimatePhotoPerson(best.lm,best.wm,{standing,anchor:joints.pelvis.position.clone(),cameraQuaternion:shot.quaternion,aspect:shot.aspect});}
const person=people.list()[i];people.select(person.id);await robot.ready;if(rev!==photoRevision)return;state.points=estimate.points;
firstPass.push({person,estimate,reconciled:reconcilePoseDepth(estimate.pose,estimate.points,shot,depthSettings()),mask,isoUsed,isoBest,pickScore:pick?pick.score:null,pickArea:pick?pick.area:null});}
window.__cloudSegmentDebug.people=firstPass.map(p=>({name:p.person.name,isoUsed:p.isoUsed,isoBest:p.isoBest,pickScore:p.pickScore,pickArea:p.pickArea,nearness:depthMap?personNearness(depthMap,p.estimate.points):null,fallback:p.reconciled.diagnostics.depth_m_assumption}));
// 深度排序不用蒙版全域中位数（蒙版空隙会漏进背景深度）：用躯干锚点采样，与自动识别同口径。
const depthFallbacks=firstPass.map(p=>p.reconciled.diagnostics.depth_m_assumption);let hints=depthMap?depthHintsFromNearness(firstPass.map(p=>personNearness(depthMap,p.estimate.points)),depthFallbacks):null;
// 云端这条也没接深度图时，同样退到画面接地点高低；深度图在场但分不出差异时按同深处理，不拿更弱的线索翻案。
if(!depthMap)hints=depthHintsFromContact(firstPass.map(p=>contactNearness(p.estimate.points,p.estimate.bounds?.bottom)),depthFallbacks);
const notes={scale:[],ground:[]};flow.step(3);if(!await placeAllPersons(firstPass,hints,null,rev,notes,'cloud_segment_hint'))return;lastAuto={rev,firstPass,fallbacks:firstPass.map(p=>p.reconciled.diagnostics.depth_m_assumption)};people.select(people.list()[0].id);inspect();attach();
const isoCount=firstPass.filter(p=>p.isoUsed).length;
$('pose-status').textContent=(manual?'已按手工分区重识别：':(local?'本地模型拆人完成，已逐人估好姿态：':(fresh?'云端拆人完成，已逐人估好姿态：':'云端分区校正完成：')))+parsed.masks.length+' 人已按'+(manual?'手工分区':(local?'本地分区':'色块'))+'分配身份'+(isoCount?'，其中 '+isoCount+' 人整图缺档、已隔离重识别补上':'')+'。'+(hints?'':(parsed.masks.length>1?'人与人前后仍不是测量值，请在叠图上核对。':'单个人不涉及前后排序。'))+(manual?'改分区这一步不花钱，也没再发云端请求。':(local?'本地分割这一步不花钱，也没再发云端请求。':''));
poseDetailRows([
  '相对深度：'+(depthMap?(hints?'按躯干锚点采样深度图重排。':'深度图里人与人差异过小，按同深处理。'):(hints?'未接深度图：按画面接地点高低估前后，幅度只拉开骨长 ±12%。':'接地点高低分不出前后，人与人按骨长同深处理。')),
  notes.ground.length?'落地校正：'+notes.ground.join('；')+'。':'触地按踝/膝自动落地，本次没有需要抬降的档位。',
  notes.scale.length?'头身与肢体比例：'+notes.scale.join('；')+'。':'',
  firstPass.map(p=>p.person.name+'：'+(p.isoUsed?'隔离重识别补位（包含度 '+(p.isoBest?p.isoBest.score.toFixed(2):'—')+'）':'整图直取（包含度 '+(Number.isFinite(p.pickScore)?p.pickScore.toFixed(2):'—')+'）')).join('；'),
]);
flow.done(parsed.masks.length+' 人'+(manual?'（按手工分区，未计费）':''));}catch(err){const msg=label+'：'+err.message;$('pose-status').textContent=msg;poseDetailRows([]);flow.fail(msg,{onRetry:()=>runCloudPose(expectedCount,opts),detail:manual?'手工分区重识别不花钱，可以直接重试；要退回云端那版，重新点一次「自动估计人体姿态」即可。':local?'本地分割不花钱，可以直接重试；要改让云端大模型拆人，再点一次「自动估计人体姿态」即可（发一次计费一次）。':fresh?'人物提取没成功，逐人估姿态就无从谈起；重试会再计费一次，也可以点「改用本地识别」先出个不花钱的初稿。':'本地自动识别的摆放保持不变；重试会再计费一次，也可以直接在场景里手动摆位。'});}finally{state.autoBusy=false;if(fresh)$('auto').disabled=!!window.lumenAsset?.active();cloudPoseBtn.disabled=!(lastAuto&&lastAuto.firstPass.length>1&&window.parent!==window);renderSegmentUI();sceneHistory?.commit();flow.abandon(run);}}
// 身份索引层 → 重识别入参（手工改完分区、本地模型拆完人都走这一条）。
// 尺寸一律按参考图 naturalWidth/Height 校，对不上就是「人对了位错了」，
// 宁可整次拒绝也不能拿两套尺寸混着算包含度。
function layerToParsed(payload,source){
 const from=source==='local'?'本地分割结果':'编辑器回传的分区层';
 if(!payload||!payload.data)throw new Error('没拿到'+from+'。');
 if(!photoImage)throw new Error('参考图已经不可用，请重新上传后再改分区。');
 const width=payload.width|0,height=payload.height|0;
 if(width!==photoImage.naturalWidth||height!==photoImage.naturalHeight)throw new Error('分区层是 '+width+'×'+height+'，参考图是 '+photoImage.naturalWidth+'×'+photoImage.naturalHeight+'，尺寸对不上，本次没有重识别。');
 const layer={width,height,data:payload.data instanceof Uint8Array?payload.data:new Uint8Array(payload.data)};
 const rows=masksFromIndexLayer(layer);
 assertSegmentPeople(rows.length);
 const labels=new Map((payload.identities||[]).filter((it)=>it&&Number.isInteger(it.index)).map((it)=>[it.index,String(it.label||'')]));
 const manual=source!=='local';
 return {parsed:{masks:rows.map((r)=>r.mask),width,height,layer},people:rows.map((r)=>({index:r.index,label:labels.get(r.index)||'人物'+r.index,ratio:r.ratio,manual}))};
}
// 外壳把改过的分区层原样递回来（同源按引用直传，不重新上色、不走 postMessage），这里只跑免费那段。
export async function applySegmentLayer(payload){
 let built;
 try{built=layerToParsed(payload,'manual');}catch(err){toast(err.message);renderSegmentUI();return err.message;}
 await runCloudPose(null,{flow:manualFlow,prefix:'手工分区重识别未完成',kept:'分区没改动，白模仍是上一版结果',parsed:built.parsed,people:built.people});
 return null;
}
// 编辑器里点了取消：分区一个字没动，状态行要说清「还是上一版」，不能让人以为已经生效。
export function segmentEditClosed(){renderSegmentUI();$('pose-status').textContent='分区未变，仍是'+(lastSegment&&lastSegment.manual?'上一版手工':'云端那版')+'分区；白模没重跑。';}
// 云端拆人能不能用：只有被外壳嵌着、且外壳真的注册了 analyzePose 才行（跨域访问父窗口会抛，按不可用处理）。
function cloudExtractReady(){if(window.parent===window||localPhotoSwap)return false;try{const host=window.parent.choukaLumenHost;return !!(host&&typeof host.analyzePose==='function');}catch{return false;}}
// 「自动估计人体姿态」默认那条：先让云端把图里的人拆出来，再基于色块逐人估姿态——拆不出人后面没有结果可摆。
// 视频、没传图、正在跑，或本页独立打开拿不到外壳出图通道时，都交给本地那条，由它自己提示缺什么。
// 两条拆人都不在、却又确实有图可认时，退回整图识别这件事必须留话，不能静默。
let noExtractNote=null;
function markNoExtractFallback(){noExtractNote=photoImage&&!window.lumenVideo?.hasVideo()&&!extractReady()?segmentNote('no-extract'):null;}
async function runAutoEntry(){const useCloud=!window.lumenVideo?.hasVideo()&&!!photoImage&&!state.autoBusy&&cloudExtractReady();
if(!useCloud){markNoExtractFallback();await runAutoPose();return;}
// 确认条开着时先把入口按钮按住：连点两次会挂起两个待回答的确认，后面那次永远没人接。
$('auto').disabled=true;let go=false;try{go=await autoCloudFlow.ask();}finally{$('auto').disabled=!!window.lumenAsset?.active();}
// 不花钱那条兜底现在接「本地模型拆人」：它和云端那条留同样一份每人蒙版，
// 后面才能手工改分区；旧的整图识别不留蒙版，等于把这条路堵死。
if(!go){if(askCancelled(autoCloudFlow))return;await runLocalExtract();return;}
await runCloudPose(null,{flow:autoCloudFlow,prefix:'人物提取未完成',kept:'未应用任何识别结果'});}
$('auto').onclick=runAutoEntry;
function invalidateFit(){state.fitRms=null;state.fitDiagnostics=null;$('fit-status').textContent='姿态或相机已变化；可按已标点重新拟合相机。';}
function fitCamera(){if(state.cameraLocked){toast('拟合相机已锁定，正在按当前机位拟合动作。');motionAPI.fitMarkers().then(text=>{$('fit-status').textContent=text;}).catch(e=>toast(e.message));return null;}try{
const points=Object.fromEntries(Object.entries(joints).map(([k,o])=>[k,o.position.clone()]));
const result=fitPerspectiveCamera(points,Object.fromEntries(Object.entries(state.points).filter(([k])=>!/[ewh]$/.test(k)||k==='head')),shot.aspect,cameraState,{lockFov:$('lock-fov')?.checked,viewConstraint:$('camera-view-constraint')?.value||'auto',ground:window.lumenGround?.fitConstraint()||null});
Object.assign(cameraState,result.parameters);cameraUpdate();state.fitRms=result.rms;state.fitDiagnostics=result;
const px=state.ref?result.rms*state.ref.height:null;const directionName={low:'仰视',high:'俯视',slight_high:'微俯拍',level:'平视'}[result.view_direction];
$('fit-status').textContent=`${directionName} · ${result.viewConstraint==='auto'?'自动候选（非唯一解）':'已按所选方向约束'}。${result.direction_ambiguous?'仰/俯视候选误差接近，请手动确认。':''}可见点 ${result.count} 个；RMS ${(result.rms*100).toFixed(2)}% 图高${px?'（约 '+px.toFixed(1)+' px）':''}；中位误差 ${(result.median*100).toFixed(2)}%；${result.inliers}/${result.count} 点在 4% 图高内。视场角 ${cameraState.fov.toFixed(1)}°${result.fovLocked?'（锁定）':'（估计）'}。${result.rms>.07?'当前偏差仍大，请修正标点或联合校准。':'仍需结合叠图检查，单图相机解不唯一。'}`;
state.tab='camera';inspect();attach();return result;
}catch(e){toast(e.message);return null;}}
async function jointCalibration(){if(state.cameraLocked){try{$('pose-status').textContent=await motionAPI.fitMarkers();}catch(e){toast(e.message);}return;}if(window.lumenAsset?.active())return;if(!state.ref){toast('请先上传照片并识别或标记关键点。');return;}
const button=$('joint-calibration');button.disabled=true;state.calibrationBusy=true;try{
const posture={torso:$('torso-constraint').value,head:$('head-constraint').value,headPitch:Number($('head-pitch').value),anatomical:!!robot.info().anatomical};if(posture.torso!=='auto'||posture.head!=='auto'){const p=Object.fromEntries(Object.entries(joints).map(([k,o])=>[k,o.position.toArray()]));applyPose(constrainPosture(p,posture),state.poseSource+'; explicit_posture_constraint');}
if(!fitCamera())return;
for(let i=0;i<2;i++){await new Promise(requestAnimationFrame);robot.refine(state.points,shot,{lockTorso:true,lockHead:posture.head!=='auto'});robot.refineArms(state.points,shot);state.poseSource+='; constrained_reprojection_refinement';fitCamera();}
$('pose-status').textContent=state.fitRms>.07?'固定骨长校准完成，但图像残差仍较大；请检查标点 / 深度假设。':'固定骨长的姿态与相机已联合校准；隐藏部位仍为假设。';
}finally{state.calibrationBusy=false;button.disabled=!!window.lumenAsset?.active();sceneHistory?.commit();}}

const postureSettings=document.createElement('div');postureSettings.id='posture-constraints';postureSettings.innerHTML='<p class="hint">人物动作与摄影机是独立条件。默认分别分析动作与镜头；可添加人工约束。人物抬头不代表相机仰拍。</p><label>躯干姿态<select id="torso-constraint"><option value="upright">站立挺直 · 手动约束</option><option value="auto">自动姿态初稿</option></select></label><label>头部姿态<select id="head-constraint"><option value="up">抬头 · 手动约束</option><option value="level">平视</option><option value="down">低头</option><option value="auto">自动姿态初稿</option></select></label><label>头部俯仰幅度初稿 · °<input id="head-pitch" type="number" min="0" max="45" step="1" value="15"></label>';$('fit').before(postureSettings);
$('torso-constraint').value='auto';$('head-constraint').value='auto';
const viewConstraint=document.createElement('label');viewConstraint.innerHTML='原图镜头方向约束<select id="camera-view-constraint"><option value="slight_high">微俯拍 · 2–15°</option><option value="low">仰视 · 相机低于注视目标</option><option value="level">平视</option><option value="high">俯视 · 相机高于注视目标</option><option value="auto">自动比较 · 单图方向可能有歧义</option></select><span class="hint">先确认镜头方向，再联合校准姿态；该选项是创作/人工约束，不是已测量结果。</span>';$('fit').before(viewConstraint);$('camera-view-constraint').value='auto';$('camera-view-constraint').onchange=()=>{const mode=$('camera-view-constraint').value;if(mode==='low')cameraState.el=-Math.max(8,Math.abs(cameraState.el));if(mode==='high')cameraState.el=Math.max(8,Math.abs(cameraState.el));if(mode==='slight_high')cameraState.el=6;if(mode==='level')cameraState.el=0;cameraUpdate();invalidateFit();if(state.tab==='camera')inspect();};
const lockFov=document.createElement('label');lockFov.className='check';lockFov.innerHTML='<input id="lock-fov" type="checkbox">拟合时锁定当前视场角';$('fit').before(lockFov);const jointFit=document.createElement('button');jointFit.id='joint-calibration';jointFit.className='wide primary';jointFit.textContent='联合校准姿态与相机（固定骨长）';jointFit.onclick=jointCalibration;$('fit').after(jointFit);$('fit').onclick=fitCamera;$('body-scale').onchange=e=>{const scale=Number(e.target.value);if(!Number.isFinite(scale)||scale<.2||scale>3){e.target.value=state.modelScale;return;}for(const m of Object.values(joints))m.position.multiplyScalar(scale/state.modelScale);robot.root.scale.setScalar(scale);state.modelScale=scale;updateBody();inspect();};
function sampleLight(){const key=lamps.find(l=>l.id==='key')||lamps[0],fill=lamps.find(l=>l.id==='fill')||lamps[1];if(key)Object.assign(key,{pos:[-2.8,3.4,.3],kelvin:4200,power:110,size:.8});if(fill)Object.assign(fill,{pos:[2,2,2.5],kelvin:6200,power:12,size:2.5});state.lightSource='manual_example_visual_estimate';$('light-status').textContent='本例人工视觉初稿：画面左上方暖主光，较弱冷色填充；位置和强度待校准。';lightsUpdate();} $('sample-light').onclick=sampleLight;
targetEditor=createTargetEditor({helperGroup,state,cameraState,shot,lamps,aim,center:lightTarget,cameraUpdate:()=>{cameraUpdate();invalidateFit();},lightsUpdate,inspect,attach,control,setTool,toast});
// 地平线确认后参与相机拟合的俯仰/滚转；面板只在相机页出现。
const groundCalibration=setupGroundCalibration({state,shot,cameraState,cameraUpdate:()=>{cameraUpdate();invalidateFit();},inspect,toast});
armCorrection=setupArmCorrection({state,robot,joints,shot,project,inspect,attach,invalidateFit,toast});
const lightAnalysis=setupLightAnalysis({getPhoto:()=>photoImage,getReference:()=>state.ref,getCamera:()=>shot,getTarget:()=>lightTarget.position,lamps,getEnvironment:()=>environment,setEnvironment:v=>environment=v,applyLights:()=>{lightsUpdate();state.tab='light';state.light=Math.max(0,lamps.findIndex(l=>l.id==='key'));inspect();attach();},selectLight:i=>{state.tab='light';state.light=i;inspect();attach();},toast,getPoints:()=>state.points,state,replaceLights:replaceLightList});
$('photo').addEventListener('change',e=>{if(e.target.files.length){
// 外壳递图（loadPhoto）会先立这块牌子；没牌子就是用户在工作台里自己换的图——
// 外壳手上那份 File 还是画布原来的，两条拆人链路送出去的图和画面对不上，先拦住。
localPhotoSwap=window.__choukaPhotoFromShell!==true;window.__choukaPhotoFromShell=false;
state.lightAnalysis=null;poseFlow.hide();cloudFlow.hide();autoCloudFlow.hide();manualFlow.hide();poseDetailRows([]);lastSegment=null;renderSegmentUI();lightAnalysis.hideFlow();lightAnalysis.render();}});
// 出图用的白模截图不跟界面小框走：固定长边离屏渲染，背景换中性灰。
// 近黑背景会被模型读成「整体曝光参考」，把成片连墙面一起压暗。
const EXPORT_LONG_EDGE=1024,EXPORT_BACKGROUND='#808080';
function exportResolution(){const a=Number.isFinite(shot.aspect)&&shot.aspect>0?shot.aspect:16/9;return a>=1?{w:EXPORT_LONG_EDGE,h:Math.max(2,Math.round(EXPORT_LONG_EDGE/a))}:{w:Math.max(2,Math.round(EXPORT_LONG_EDGE*a)),h:EXPORT_LONG_EDGE};}
function snapshot(){const visible=helperGroup.visible,g=grid.visible,bg=scene.background,{w,h}=exportResolution(),ratio=shotRenderer.getPixelRatio();helperGroup.visible=false;grid.visible=false;scene.background=new T.Color(EXPORT_BACKGROUND);shotRenderer.setPixelRatio(1);shotRenderer.setSize(w,h,false);shotRenderer.render(scene,shot);const png=shotRenderer.domElement.toDataURL('image/png');scene.background=bg;shotRenderer.setPixelRatio(ratio);resize();helperGroup.visible=visible;grid.visible=g;return png;}
function download(name,data,type='application/json'){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);}
$('png').onclick=()=>{const a=document.createElement('a');a.href=snapshot();a.download='mannequin-camera-lighting.png';a.click();};
function specification(){window.lumenMainCamera?.sync();const result={schema:'lumen.pose-camera-lighting/1.0',video_recognition:window.lumenVideo?.saveState()||null,manual_keyframes:window.lumenKeys?.saveState()||null,timeline:timeline.save(),reference:state.ref,pose_detection:state.poseDetection||null,photo_characters:people.saveState(),coordinate_system:{handedness:'right',unit:'assumed_meter',axes:{x:'initial model right / initial front image right',y:'up',z:'initial model front'},origin:'standing mannequin ground center',scale_measured:false},model:{...robot.info(),posture_constraints:{torso:$('torso-constraint').value,head:$('head-constraint').value,head_pitch_assumption_deg:Number($('head-pitch').value),source:'optional_user_constraints_not_measured'},arm_landmark_warnings:state.armWarnings||[],arm_fit:state.armFit||null,ue_asset:false,pose_source:state.poseSource,scale_multiplier:state.modelScale,joints:Object.fromEntries(Object.entries(joints).map(([k,m])=>[k,{position_m:round(m.position.toArray()),rotation_quaternion_xyzw:round(m.quaternion.toArray()),photo_landmark:state.points[k]||null}])),bones:pairs.map(([a,b])=>({from:a,to:b,length_m:joints[a].position.distanceTo(joints[b].position)})),occluded_limbs:'estimated or placeholder; inspect photo_landmark visibility'},camera:{main_camera:window.lumenMainCamera?.selection()||null,position_m:round(shot.position.toArray()),quaternion_xyzw:round(shot.quaternion.toArray()),target_m:[cameraState.tx,cameraState.ty,cameraState.tz],up_world:round(new T.Vector3(0,1,0).applyQuaternion(shot.quaternion).toArray()),forward_world:round(shot.getWorldDirection(new T.Vector3()).toArray()),vertical_fov_deg:shot.fov,aspect:shot.aspect,roll_deg:cameraState.roll,sensor_height_mm_assumption:24,focal_length_mm_assuming_sensor_height:12/Math.tan(T.MathUtils.degToRad(shot.fov/2)),view_direction_constraint:$('camera-view-constraint').value,view_direction:cameraState.el< -1?'low':cameraState.el>1?'high':'level',camera_elevation_convention:'negative elevation = camera below target, looking up; positive = looking down',projection_fit_rms_normalized:state.fitRms,subject_reference_point_m:round(joints.pelvis.position.toArray()),position_relative_to_pelvis_m:round(shot.position.clone().sub(joints.pelvis.position).toArray()),projection_fit_metric:'body anchors only; image_height_units; horizontal residual scaled by image aspect',fit_diagnostics:state.fitDiagnostics||null,calibration_unique:false,import_source:state.cameraImport||null,observer_camera_excluded:true,translation_policy:'preserve target; rotation updates target'},transform_convention:{rotation_order:'XYZ Euler displayed in world frame; quaternion is authoritative',joint_rotation:'world pivot rotation moves all descendants, preserving subtree segment lengths',camera_and_light_translation:'fixed target; orientation re-aims to same target',target_translation:'fixed emitter/camera position; orientation re-aims to moved independent target',light_direction_basis:'target-local axes aligned to shot camera; not observer camera or world origin'},lights:lamps.map((l,i)=>{const type=l.type||'area',omni=type==='point',parallel=type==='directional';return{id:l.id||['key','fill','rim'][i]||'light_'+i,name:l.name,enabled:l.enabled,type,position_m:l.pos,target_m:round(aim(l).toArray()),target_role:omni?'reference_point_only':'aim_target',rotation_quaternion_xyzw:round(lampObjects[i].h.quaternion.toArray()),orientation_affects_emission:!omni,emission_direction_world:omni?null:round(aim(l).sub(V(l.pos)).normalize().toArray()),intensity:l.power,intensity_unit:'relative_art_direction',temperature_K:l.kelvin,color_srgb_hex:'#'+tint(l.kelvin).getHexString(),emitter:omni?{shape:'point',distribution:'isotropic',radius_m:0}:parallel?{shape:'parallel',position_is_direction_handle:true,angular_diameter_deg:0}:{shape:'square',width_m:l.size,height_m:l.size},attenuation:parallel?{model:'none',exponent:0,cutoff_distance_m:null}:{model:'inverse_square',exponent:2,cutoff_distance_m:omni?pointRange(l):0,zero_cutoff_means:'unlimited'},shadow:{enabled:l.shadow!==false&&l.enabled,preview:omni?'point-light cubemap with PCF shadow filtering':parallel?'directional shadow map':lampObjects[i].sampleCount+' point samples with PCF shadow maps',softness_driver:omni?'ideal point source; hard shadow with preview filtering':parallel?'hard parallel rays':'emitter size and distance'}};}),environment:{hemisphere_relative_intensity:environment,ground_visible:state.groundVisible!==false},light_estimation_method:state.lightSource,reference_roles:{photo:'identity, materials, original composition, exposure and color',mannequin_png:'target pose, camera and lighting direction only; flat neutral gray background carries no scene, exposure or color meaning; not a video endpoint'},reference_export:{long_edge_px:EXPORT_LONG_EDGE,background_srgb_hex:EXPORT_BACKGROUND,background_semantics:'neutral_gray_not_exposure_reference'},limitations:['Single-image pose, camera, scale and illumination are not uniquely recoverable.','Default asset is a skinned proxy, not a reconstruction of the photo.','No inverse rendering, calibrated photometry or automatic AI video parameter binding.','Reference photo pixels are not relit by the 3D renderer.']};const spec=(window.lumenAsset?.hasAssets?.()||window.lumenAsset?.active())?window.lumenAsset.enrich(result):result;spec.light_analysis=lightAnalysis.exportAnalysis();spec.image_editing={preserve_identity_materials_background:true,apply_pose:!!$('prompt-pose')?.checked,apply_camera:!!$('prompt-camera')?.checked,rebuild_lit_side:!!$('prompt-rebuild')?.checked,default_task:'relight_only',direction_reference:'shot_camera_not_observer'};for(const l of spec.lights){const d=describeLight(l,spec.camera);l.source_bearing_camera=round(d.bearing);if(l.type!=='point')l.emission_direction_world=round(d.emission);l.azimuth_camera_deg=d.azimuth;l.elevation_camera_deg=d.elevation;l.target_check={in_front_of_shot_camera:d.targetInFront,in_frame:d.targetInFrame,warning:d.warning};l.world_height_difference_m=d.world_height_difference;l.visual_description_zh=!l.enabled||l.intensity<=0?'关闭':d.text;}return spec;}
const promptStyle=document.createElement('style');promptStyle.textContent='dialog{max-height:92vh;overflow:auto;width:900px}#prompt{height:36vh;min-height:250px;font:13px/1.9 system-ui,Microsoft YaHei,sans-serif;resize:vertical}.prompt-options{border:1px solid #43563d;padding:14px;margin:18px 0;border-radius:6px}.prompt-options h3{font-size:15px;margin:0}.prompt-options label{display:inline-flex;gap:6px;margin:8px 18px 0 0}.prompt-options .hint{margin:4px 0}.prompt-options .rebuild-note{margin:8px 0 0;font-size:12px;line-height:1.7;opacity:.82}';document.head.append(promptStyle);
const promptOptions=document.createElement('section');promptOptions.className='prompt-options';promptOptions.innerHTML='<h3>图片编辑范围</h3><p class="hint">默认只修改灯光。文字方向依据当前拍摄相机计算；修改场景后重新导出即可更新。</p><label><input id="prompt-pose" type="checkbox">同时应用当前动作</label> <label><input id="prompt-camera" type="checkbox">同时应用当前镜头</label> <label><input id="prompt-rebuild" type="checkbox">重建受光面（允许压暗背光侧）</label><p class="rebuild-note">不勾选时提示词只描述目标灯位，模型可自行决定压暗幅度，顺光方向常常只微调、不翻边。勾选后额外点名：压制与新灯位冲突的旧高光、旧亮边和旧投影方向，在背光侧重建明暗，允许大于常规的调整幅度；整体曝光、背景与墙面色调仍保持原图水平。</p>';
$('handoff').insertBefore(promptOptions,$('prompt').previousElementSibling);
function prompt(){return imageLightingPrompt(specification(),{applyPose:$('prompt-pose').checked,applyCamera:$('prompt-camera').checked,rebuildLitSide:$('prompt-rebuild').checked});}
for(const id of ['prompt-pose','prompt-camera','prompt-rebuild'])$(id).onchange=()=>{$('prompt').value=prompt();$('spec').value=JSON.stringify(specification(),null,2);};
$('handoff').querySelector('h2').textContent='图片 AI 布光提示词 · 文字 + 矢量';
$('handoff').querySelector('p.hint').textContent='将原图、白模布光参考与提示词一起提供给图片编辑工具。默认只改光照；三维数值仅在目标接口支持时作为直接控制。';
$('export').onclick=()=>{$('prompt').value=prompt();$('spec').value=JSON.stringify(specification(),null,2);$('handoff').showModal();};$('close').onclick=()=>$('handoff').close();$('json-download').onclick=()=>download('scene.json',JSON.stringify(specification(),null,2));$('text-download').onclick=()=>download('scene-prompt.txt',prompt(),'text/plain');$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(prompt());toast('提示词已复制。');}catch{$('prompt').select();toast('请手动复制选中的提示词。');}};
$('save-session').onclick=()=>download('lumen-project.json',{toString(){return JSON.stringify({schema:'lumen.editable-project/1.0',mainCamera:window.lumenMainCamera?.saveState()||null,videoRecognition:window.lumenVideo?.saveState()||null,people:people.saveState(),shotFrame:{position:shot.position.toArray(),quaternion:shot.quaternion.toArray()},defaultAvatarSettings:robot.saveState(),asset:window.lumenAsset?.saveState()||null,pose:Object.fromEntries(Object.entries(joints).map(([k,m])=>[k,m.position.toArray()])),jointRotations:Object.fromEntries(Object.entries(joints).map(([k,m])=>[k,m.quaternion.toArray()])),keyframes:window.lumenKeys?.saveState()||null,keyframes:window.lumenKeys?.saveState()||null,cameraAsset:window.lumenCamera?.saveState()||null,timeline:timeline.save(),cameraLocked:state.cameraLocked,camera:cameraState,groundVisible:state.groundVisible!==false,cameraImport:state.cameraImport||null,cameraAspectOverride:state.cameraAspectOverride||null,cameraViewConstraint:$('camera-view-constraint').value,postureConstraints:{torso:$('torso-constraint').value,head:$('head-constraint').value,headPitch:Number($('head-pitch').value)},lights:lamps,groundCalibration:window.lumenGround?.saveState()||null,environment,points:state.points,ref:state.ref,poseSource:state.poseSource,lightSource:state.lightSource,lightAnalysis:state.lightAnalysis||null,armWarnings:state.armWarnings||[],armFit:state.armFit||null},null,2);}}.toString());
$('load-session').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const p=JSON.parse(await file.text());if(p.schema!=='lumen.editable-project/1.0'||!p.pose||!p.camera||!Array.isArray(p.lights)||p.lights.length>8)throw new Error('工程格式不正确');for(const k of Object.keys(joints))if(!Array.isArray(p.pose[k])||p.pose[k].length!==3||p.pose[k].some(x=>!Number.isFinite(x)||Math.abs(x)>30))throw new Error('关节数据不正确');for(const k of Object.keys(cameraState))if(!Number.isFinite(p.camera[k]))throw new Error('相机数据不正确');for(const l of p.lights)if(!Array.isArray(l.pos)||l.pos.length!==3||l.pos.some(x=>!Number.isFinite(x))||!Number.isFinite(l.power)||!Number.isFinite(l.kelvin)||!Number.isFinite(l.size)||!validLightType(l.type)||(l.range!==undefined&&(!Number.isFinite(l.range)||l.range<0)))throw new Error('灯光数据不正确');if(p.ref&&state.ref&&p.ref.sha256!==state.ref.sha256)toast('工程参考图与当前图不同，请重新选择工程对应的原图。');timeline.suspended=true;applyPose(p.pose,p.poseSource||'loaded_project');robot.loadState(p.defaultAvatarSettings||null);for(const[k,q]of Object.entries(p.defaultAvatarSettings?.local_rotations?{}:p.jointRotations||{}))if(joints[k]&&Array.isArray(q)&&q.length===4&&q.every(Number.isFinite)&&Math.hypot(...q)>.01)joints[k].quaternion.fromArray(q).normalize();updateBody();state.cameraLocked=p.cameraLocked!==false;syncCameraFitLock();Object.assign(cameraState,p.camera);setGroundVisible(p.groundVisible!==false);window.lumenGround?.loadState(p.groundCalibration);state.cameraImport=p.cameraImport||null;state.cameraAspectOverride=p.cameraAspectOverride||null;if(p.postureConstraints){if(Number.isFinite(p.postureConstraints.headPitch))$('head-pitch').value=T.MathUtils.clamp(p.postureConstraints.headPitch,0,45);if(['upright','auto'].includes(p.postureConstraints.torso))$('torso-constraint').value=p.postureConstraints.torso;if(['up','level','down','auto'].includes(p.postureConstraints.head))$('head-constraint').value=p.postureConstraints.head;}if(['low','high','slight_high','level','auto'].includes(p.cameraViewConstraint))$('camera-view-constraint').value=p.cameraViewConstraint;cameraState.fov=T.MathUtils.clamp(cameraState.fov,1,175);cameraState.distance=T.MathUtils.clamp(cameraState.distance,.1,1000);replaceLightList(p.lights,false);environment=T.MathUtils.clamp(p.environment??.08,0,1);state.points={};for(const[k,v]of Object.entries(p.points||{}))if(labels[k]&&[v.u,v.v,v.visibility].every(Number.isFinite))state.points[k]=v;state.lightSource=p.lightSource||'loaded_project';state.armWarnings=Array.isArray(p.armWarnings)?p.armWarnings:[];state.armFit=p.armFit||null;state.lightAnalysis=p.lightAnalysis?.schema==='lumen.equivalent-light-analysis/1.0'&&Array.isArray(p.lightAnalysis.lights)&&p.lightAnalysis.lights.length===3?p.lightAnalysis:null;window.lumenAsset?.loadState(p.asset||null);window.lumenCamera?.loadState(p.cameraAsset||null);window.lumenKeys?.loadState(p.keyframes||null);if(p.timeline)timeline.load(p.timeline);timeline.suspended=false;timeline.evaluate();cameraUpdate();if(p.people)people.loadState(p.people);window.lumenVideo?.loadState(p.videoRecognition||null);if(p.shotFrame)cameraAPI.apply({position:V(p.shotFrame.position),quaternion:new T.Quaternion().fromArray(p.shotFrame.quaternion),target:V([cameraState.tx,cameraState.ty,cameraState.tz]),fov:cameraState.fov,aspect:state.cameraAspectOverride||shot.aspect},state.cameraImport,false);window.lumenMainCamera?.loadState(p.mainCamera);window.lumenMainCamera?.sync();resize();lightsUpdate();inspect();$('pose-status').textContent='已载入工程；照片需单独选择，工程不嵌入原图。';}catch(err){timeline.suspended=false;toast('无法载入：'+err.message);}};
applyPose(standing,'standing_placeholder');cameraUpdate();lightsUpdate();attach();resize();let lastMarker=0;renderer.setAnimationLoop(time=>{window.lumenAsset?.update(time);window.lumenMainCamera?.sync();orbit.update();renderer.render(scene,observer);const h=helperGroup.visible,g=grid.visible;helperGroup.visible=false;grid.visible=false;shotRenderer.render(scene,shot);helperGroup.visible=h;grid.visible=g;if(time-lastMarker>120){markers();lastMarker=time;}});

const captureEdit=()=>({mainCamera:window.lumenMainCamera?.saveState()||null,videoRecognition:window.lumenVideo?.saveState()||null,people:people.saveState(),shotFrame:{position:shot.position.toArray(),quaternion:shot.quaternion.toArray()},pose:Object.fromEntries(Object.entries(joints).map(([k,o])=>[k,o.position.toArray()])),rotations:Object.fromEntries(Object.entries(joints).map(([k,o])=>[k,o.quaternion.toArray()])),avatar:robot.saveState(),keyframes:window.lumenKeys?.saveState()||null,cameraAsset:window.lumenCamera?.saveState()||null,timeline:timeline.save(),cameraLocked:state.cameraLocked,camera:{...cameraState},groundVisible:state.groundVisible!==false,groundCalibration:window.lumenGround?.saveState()||null,cameraImport:state.cameraImport||null,cameraAspectOverride:state.cameraAspectOverride||null,lights:clone(lamps),fitRms:state.fitRms,fitDiagnostics:state.fitDiagnostics||null,environment,points:clone(state.points),poseSource:state.poseSource,lightSource:state.lightSource,lightAnalysis:state.lightAnalysis||null,modelScale:state.modelScale,asset:window.lumenAsset?.saveState()||null,viewConstraint:$('camera-view-constraint').value,torso:$('torso-constraint').value,head:$('head-constraint').value,headPitch:$('head-pitch').value});
function restoreEdit(p){state.selectionCleared=false;document.dispatchEvent(new Event('lumen-history-restore'));const tab=state.tab;timeline.suspended=true;try{applyPose(p.pose,p.poseSource);robot.loadState(p.avatar);if(!p.avatar?.local_rotations){for(const[k,q]of Object.entries(p.rotations))joints[k].quaternion.fromArray(q);updateBody();}state.cameraLocked=p.cameraLocked!==false;syncCameraFitLock();Object.assign(cameraState,p.camera);setGroundVisible(p.groundVisible!==false);window.lumenGround?.loadState(p.groundCalibration);state.cameraImport=p.cameraImport||null;state.cameraAspectOverride=p.cameraAspectOverride||null;replaceLightList(p.lights,false);state.fitRms=p.fitRms;state.fitDiagnostics=p.fitDiagnostics;environment=p.environment;state.points=clone(p.points);state.lightSource=p.lightSource;state.lightAnalysis=p.lightAnalysis;state.modelScale=p.modelScale;$('body-scale').value=p.modelScale;$('camera-view-constraint').value=p.viewConstraint;$('torso-constraint').value=p.torso;$('head-constraint').value=p.head;$('head-pitch').value=p.headPitch;window.lumenAsset?.loadState(p.asset);window.lumenCamera?.loadState(p.cameraAsset||null);window.lumenKeys?.loadState(p.keyframes||null);if(p.timeline)timeline.load(p.timeline);state.tab=tab;}finally{timeline.suspended=false;}timeline.evaluate();cameraUpdate();if(p.people)people.loadState(p.people);window.lumenVideo?.loadState(p.videoRecognition||null);if(p.shotFrame)cameraAPI.apply({position:V(p.shotFrame.position),quaternion:new T.Quaternion().fromArray(p.shotFrame.quaternion),target:V([cameraState.tx,cameraState.ty,cameraState.tz]),fov:cameraState.fov,aspect:state.cameraAspectOverride||shot.aspect},state.cameraImport,false);window.lumenMainCamera?.loadState(p.mainCamera);window.lumenMainCamera?.sync();resize();lightsUpdate();inspect();attach();}
sceneHistory=installHistoryUI({capture:captureEdit,restore:restoreEdit,isBusy:()=>state.autoBusy||state.calibrationBusy});
document.addEventListener('lumen-asset-loaded',()=>sceneHistory.reset());document.addEventListener('lumen-edit-committed',()=>sceneHistory.commit());
installMayaNavigation({canvas:renderer.domElement,orbit,gizmo,setTool,focus:()=>{if(state.tab==='light'&&!lamps[state.light])return;if(state.tab==='asset'&&window.lumenAsset?.active()){window.lumenAsset.focus();return;}const center=state.tab==='pose'?joints[state.joint].position:state.tab==='camera'?shot.position:V(lamps[state.light].pos);const direction=observer.position.clone().sub(orbit.target).normalize();orbit.target.copy(center);observer.position.copy(center).addScaledVector(direction,state.tab==='pose'?2:4);orbit.update();}});
const lightingAPI={state,lamps,add:addLight,rename:lightManager.rename,remove:lightManager.remove,replace:replaceLightList,target:()=>lightTarget.position.clone(),camera:()=>shot,source:v=>state.lightSource=v};
export {motionAPI,keyframeAPI,cameraAPI,lightingAPI,scene,robot,helperGroup,joints,gizmo,orbit,observer,shot,renderer,state,control,inspect,attach,toast};

function setGroundVisible(visible){state.groundVisible=!!visible;floor.visible=!!visible;grid.visible=!!visible&&state.gizmos;const button=$('ground-toggle');if(button){button.textContent=visible?'地面：显示':'地面：隐藏';button.setAttribute('aria-pressed',String(!!visible));}}
const groundButton=document.createElement('button');groundButton.id='ground-toggle';groundButton.title='显示或隐藏地面与网格';groundButton.onclick=()=>setGroundVisible(state.groundVisible===false);document.querySelector('.viewtools').append(groundButton);setGroundVisible(true);
const cameraAPI={capture(){return{position:shot.position.toArray(),quaternion:shot.quaternion.toArray(),target:[cameraState.tx,cameraState.ty,cameraState.tz],fov:shot.fov,aspect:shot.aspect,near:shot.near,far:shot.far,source:state.cameraImport||null};},apply(frame,source,refresh=true){const d=frame.position.clone().sub(frame.target);Object.assign(cameraState,{tx:frame.target.x,ty:frame.target.y,tz:frame.target.z,distance:d.length(),az:T.MathUtils.radToDeg(Math.atan2(d.x,d.z)),el:T.MathUtils.radToDeg(Math.asin(T.MathUtils.clamp(d.y/d.length(),-1,1))),fov:frame.fov,roll:rollFrom(frame.quaternion,frame.position,frame.target,true)});state.cameraImport=source;state.cameraAspectOverride=frame.aspect;$('camera-view-constraint').value='auto';shot.position.copy(frame.position);shot.quaternion.copy(frame.quaternion).normalize();shot.up.set(0,1,0);shot.fov=frame.fov;if(Number.isFinite(frame.near)&&frame.near>0)shot.near=frame.near;if(Number.isFinite(frame.far)&&frame.far>shot.near)shot.far=frame.far;shot.updateProjectionMatrix();shot.updateMatrixWorld(true);cameraMarker.position.copy(shot.position);cameraMarker.quaternion.copy(shot.quaternion);cameraLine.geometry.dispose();cameraLine.geometry=new T.BufferGeometry().setFromPoints([shot.position,frame.target]);targetEditor?.sync();resize();invalidateFit();if(refresh){state.tab='camera';inspect();attach();document.dispatchEvent(new Event('lumen-edit-committed'));}}};

const motionAPI={imported:()=>!!window.lumenAsset?.active(),hasPhoto:()=>!!state.ref,toast,
jointsVisible(on){const changed=state.showJoints!==on;state.showJoints=on;for(const m of Object.values(joints))m.visible=on&&!window.lumenAsset?.active();window.lumenAsset?.showJoints(on);if(on){state.gizmos=true;helperGroup.visible=true;}syncJointToggle();if(changed&&on){state.selectionCleared=false;state.tab=window.lumenAsset?.active()?'asset':'pose';setTool('translate');inspect();}attach();},
markersVisible(on){$('show-points').checked=on&&!window.lumenAsset?.active();$('mark-mode').checked=$('show-points').checked;$('landmarks').classList.toggle('mark',$('show-points').checked);if(!$('show-points').checked){dragPoint=null;$('landmarks').innerHTML='';}markers();},
async fitMarkers(){if(window.lumenAsset?.active())throw new Error('照片拟合适用于默认人体；导入骨架请直接编辑三维关节。');if(!state.ref)throw new Error('请先加载照片。');if(!robot.info().loaded)throw new Error('人体模型仍在加载，请稍后拟合。');timeline.pause();const fit=fitPoseInCurrentCamera({robot,joints,points:state.points,camera:shot,moveRoot:delta=>translateJoint('pelvis',joints.pelvis.position.clone().add(delta))});state.selectionCleared=false;state.tab='pose';state.poseSource='manual_marker_fit_camera_locked';invalidateFit();inspect();attach();sceneHistory?.commit();return '已按 '+fit.count+' 个标记点拟合动作；镜头保持不变。投影 RMS '+(fit.rms*100).toFixed(2)+'% 图高；可继续调整后再次拟合。';}};
function cameraKey(){return{id:'camera:shot',label:'拍摄相机',kind:'camera',meta:{},value:{position:shot.position.toArray(),quaternion:shot.quaternion.toArray(),distance:cameraState.distance,fov:shot.fov,aspect:shot.aspect}};}
function lampKey(l,i){return{id:'light:'+l.id,label:l.name,kind:'light',meta:{lightId:l.id},value:{position:l.pos,quaternion:lampObjects[i].h.quaternion.toArray(),distance:V(l.pos).distanceTo(aim(l)),power:l.power,kelvin:l.kelvin,size:l.size,enabled:l.enabled,type:l.type,shadow:l.shadow!==false}};}
const keyframeAPI={toast,refresh(){inspect();attach();},
selection(){if(state.selectionCleared)return{label:'未选择对象',targets:[]};if(state.tab==='camera')return{label:'拍摄相机',targets:[cameraKey()]};if(state.tab==='light')return{label:lamps[state.light].name,targets:[lampKey(lamps[state.light],state.light)]};if(state.tab==='asset')return window.lumenAsset?.keySelection()||{label:'未选择资产',targets:[]};return{label:labels[state.joint],targets:robot.info().loaded?(window.lumenPeople?.keys(false,state.joint)||avatarKeyChannels(robot.saveState(),state.joint)):[]};},
all(){return{label:'全部关节、相机与灯光',targets:[...(window.lumenAsset?.keySelection?.(true)?.targets||[]),...(!window.lumenAsset?.active()&&robot.info().loaded?(window.lumenPeople?.keys(true)||avatarKeyChannels(robot.saveState(),null,true)):[]),cameraKey(),...lamps.map(lampKey)]};},
apply(samples){if(window.lumenPeople&&!window.lumenAsset?.active()){window.lumenPeople.applyKeys(samples);samples=samples.filter(c=>!['avatar','avatar-scale'].includes(c.kind));}const avatar=robot.saveState();let avatarChanged=false,lightsChanged=false;for(const c of [...samples].sort((a,b)=>(a.kind==='camera'?1:0)-(b.kind==='camera'?1:0))){const v=c.value;if(c.kind==='avatar'&&!window.lumenAsset?.active()){avatar.local_rotations=avatar.local_rotations||{};avatar.local_rotations[c.meta.bone]=v.quaternion;if(v.position)avatar.hip_position_local=v.position;avatar.anatomical=c.meta.anatomical;avatarChanged=true;}else if(c.kind==='avatar-scale'&&!window.lumenAsset?.active()){avatar.display_scale=v.display_scale;state.modelScale=v.display_scale;$('body-scale').value=v.display_scale;avatarChanged=true;}else if(c.kind==='camera'){const q=new T.Quaternion().fromArray(v.quaternion),p=V(v.position);cameraAPI.apply({position:p,quaternion:q,target:p.clone().addScaledVector(new T.Vector3(0,0,-1).applyQuaternion(q),v.distance),fov:v.fov,aspect:v.aspect},{source:'manual_keyframes',time_s:timeline.time},false);}else if(c.kind==='light'){const l=lamps.find(l=>l.id===c.meta.lightId);if(!l)continue;const q=new T.Quaternion().fromArray(v.quaternion),p=V(v.position),target=p.clone().addScaledVector(new T.Vector3(0,0,1).applyQuaternion(q),v.distance);Object.assign(l,{pos:v.position,target:target.toArray(),power:v.power,kelvin:v.kelvin,size:v.size,enabled:v.enabled,type:v.type,shadow:v.shadow,roll_deg:rollFrom(q,p,target,false)});lightsChanged=true;}else if(c.kind==='asset')window.lumenAsset?.applyKey(c);}
if(avatarChanged){robot.loadState(avatar);state.poseSource='manual_keyframes';}if(lightsChanged){state.lightSource='manual_keyframes';lightsUpdate();}window.lumenAsset?.updateJointHandles();}};

function clearSelection(){state.selectionCleared=true;state.editTarget=false;gizmo.detach();window.lumenAsset?.clearSelection?.();targetEditor?.sync();inspect();listLights();document.dispatchEvent(new Event('lumen-selection-change'));}
function syncJointToggle(){window.lumenPeople?.refresh();const visible=state.showJoints&&helperGroup.visible;const button=$('joints-toggle');if(button){button.textContent=visible?'关节：显示':'关节：隐藏';button.setAttribute('aria-pressed',String(visible));}const overlay=$('stage-joints-toggle');if(overlay){overlay.textContent=visible?'隐藏关节点':'显示关节点';overlay.setAttribute('aria-pressed',String(visible));}if($('show-joints'))$('show-joints').checked=visible;}
const jointToggle=document.createElement('button');jointToggle.id='joints-toggle';jointToggle.title='显示 / 隐藏三维关节点，显示后即可编辑';jointToggle.onclick=()=>motionAPI.jointsVisible(!(state.showJoints&&helperGroup.visible));if($('stage-joints-toggle'))$('stage-joints-toggle').onclick=jointToggle.onclick;$('gizmos').before(jointToggle);syncJointToggle();
function syncCameraFitLock(){const button=$('camera-fit-lock');if(button){button.textContent=state.cameraLocked?'拟合锁定相机：开':'拟合锁定相机：关';button.setAttribute('aria-pressed',String(state.cameraLocked));}if($('lock-fov'))$('lock-fov').disabled=state.cameraLocked||!!window.lumenAsset?.active();if($('fit'))$('fit').textContent=state.cameraLocked?'按当前机位拟合动作':'按标记拟合相机';if($('joint-calibration'))$('joint-calibration').textContent=state.cameraLocked?'在当前机位校准动作':'联合校准动作与相机';}
const fitLockButton=document.createElement('button');fitLockButton.id='camera-fit-lock';fitLockButton.title='开启时只拟合人物动作，保留手动相机位置、朝向和视场角';fitLockButton.onclick=()=>{state.cameraLocked=!state.cameraLocked;syncCameraFitLock();};jointToggle.after(fitLockButton);syncCameraFitLock();

function depthSettings(){return{strength:Number($('pose-depth-strength')?.value??.65),polarity:Number($('pose-depth-polarity')?.value??1)};}
let videoPoseCamera=null;
const mediaAPI={
beginVideo(){videoPoseCamera=shot.clone();videoPoseCamera.updateMatrixWorld(true);},endVideo(){videoPoseCamera=null;},
 bodyProportions:()=>robot.saveState(),
 setBodyProportions(profile){if(window.lumenAsset?.active())throw new Error('导入资产保留原比例。');robot.setProportions?.(profile,{method:'manual_proportions',scale_measured:false});state.poseSource='manual_body_proportions';people.stash();inspect();attach();document.dispatchEvent(new Event('lumen-body-proportions'));sceneHistory?.commit();},
 estimateProportions(){const estimate=people.active().rawEstimate;if(!estimate)throw new Error('请先识别图片或视频。');const info=estimateBodyProportions(estimate,standing,{depthSource:state.poseDetection?.depth_source});if(!info.available)throw new Error(info.reason);robot.setProportions?.(info.profile,info);people.stash();inspect();attach();document.dispatchEvent(new Event('lumen-body-proportions'));sceneHistory?.commit();return info;},
 detect:detectPose,cancel:closePoseDetector,sampleKeys:samples=>people.applyKeys(samples),
 reference(ref,image){photoRevision++;state.ref=ref;photoImage=image;state.points={};resize();document.dispatchEvent(new Event('lumen-photo-loaded'));},
 async applyResult(result,{video=false}={}){if(window.lumenAsset?.active())throw new Error('请先切换为默认人体再识别。');const camera=videoPoseCamera&&video?videoPoseCamera:shot;const estimates=result.landmarks.map((pts,i)=>{try{return estimatePhotoPerson(pts,result.worldLandmarks[i],{standing,anchor:joints.pelvis.position.clone(),cameraQuaternion:camera.quaternion,aspect:camera.aspect});}catch{return null;}}).filter(Boolean);if(!estimates.length)return 0;
 if(!video){people.truncate(1);while(people.list().length<estimates.length)people.add('person-'+(people.list().length+1));}
 const assigned=new Set();for(const estimate of estimates){let person=people.list().filter(p=>!assigned.has(p.id)).sort((a,b)=>{const center=p=>p.bounds?(p.bounds.left+p.bounds.right)/2:.5;const u=(estimate.bounds.left+estimate.bounds.right)/2;return Math.abs(center(a)-u)-Math.abs(center(b)-u);})[0];if(!person&&people.list().length<16)person=people.add('person-'+(people.list().length+1));if(!person)continue;assigned.add(person.id);people.select(person.id);await robot.ready;if(!robot.info().loaded)throw new Error('人体模型加载失败');
 if(video&&person.rawEstimate){const prior=person.rawEstimate.pose,oldOrigin=prior.pelvis,newOrigin=estimate.pose.pelvis;for(const[k,p]of Object.entries(estimate.pose)){if(prior[k])for(let axis=0;axis<3;axis++)p[axis]=newOrigin[axis]+(p[axis]-newOrigin[axis])*.7+(prior[k][axis]-oldOrigin[axis])*.3;}for(const[k,p]of Object.entries(estimate.points)){const old=person.rawEstimate.points[k];if(old){const distance=Math.hypot(p.u-old.u,p.v-old.v),alpha=distance>.08?.9:.65;p.u=old.u+(p.u-old.u)*alpha;p.v=old.v+(p.v-old.v)*alpha;}}}
 person.rawEstimate=estimate;person.bounds=estimate.bounds;state.points=estimate.points;const reconciled=reconcilePoseDepth(estimate.pose,estimate.points,camera,depthSettings());person.depthDiagnostics=reconciled.diagnostics;if(!video)matchProportions(estimate,reconciled.diagnostics);applyPose(reconciled.pose,'mediapipe_video_or_image; bounded_depth_prior');fitPoseInCurrentCamera({robot,joints,points:state.points,camera,iterations:video?1:4,moveRoot:delta=>translateJoint('pelvis',joints.pelvis.position.clone().add(delta))});people.stash();}people.refresh();return assigned.size;},
 resetPeople(){people.truncate(1);people.select(people.list()[0].id);people.active().rawEstimate=null;},
 snapshot:()=>people.saveState(),restore:data=>people.loadState(data),keys:()=>people.keys(true),
 async refitDepth(){const person=people.active(),estimate=person.rawEstimate;if(!estimate)throw new Error('请先运行图片识别或视频识别。');const result=reconcilePoseDepth(estimate.pose,state.points,shot,depthSettings());person.depthDiagnostics=result.diagnostics;matchProportions(estimate,result.diagnostics);applyPose(result.pose,'mediapipe_manual_depth_constraint');await motionAPI.fitMarkers();people.stash();},
 commit(){document.dispatchEvent(new Event('lumen-edit-committed'));},refresh(){inspect();attach();resize();},
 digest:()=>{try{return JSON.stringify(captureEdit());}catch(e){return null;}},
};
export {mediaAPI};
setupBodyProportionsUI({mediaAPI,motionAPI,state});

export {snapshot, prompt, specification, setGroundVisible, shotRenderer, people, lightsUpdate, lightAnalysis};
