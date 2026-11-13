import * as T from 'three';

export function configureHelperPicking(ray,rect){ray.params.LumenHelper={width:rect.width,height:rect.height,paddingPx:8};return ray;}
export function worldUnitsPerPixel(ray,position){
 const camera=ray.camera,height=ray.params.LumenHelper?.height;if(!camera||!(height>0))return 0;
 if(camera.isOrthographicCamera)return Math.abs(camera.top-camera.bottom)/(Math.max(camera.zoom,.0001)*height);
 if(!camera.isPerspectiveCamera)return 0;const depth=-position.clone().applyMatrix4(camera.matrixWorldInverse).z;
 return depth>0?2*depth*Math.tan(T.MathUtils.degToRad(camera.getEffectiveFOV()/2))/height:0;
}
function visible(object){for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;}
export function hitMotionCurvePoints(ray,points){
 const nodes=[...points].filter(visible),camera=ray.camera,settings=ray.params.LumenHelper;if(!camera||!settings?.width||!settings?.height)return ray.intersectObjects(nodes)[0]||null;
 camera.updateMatrixWorld();const cursor=ray.ray.origin.clone().add(ray.ray.direction).project(camera);let best=null;
 for(const object of nodes){const world=object.getWorldPosition(new T.Vector3()),along=world.clone().sub(ray.ray.origin).dot(ray.ray.direction),p=world.clone().project(camera);if(along<ray.near||along>ray.far||p.z< -1||p.z>1)continue;const units=worldUnitsPerPixel(ray,world);if(!units)continue;if(!object.geometry.boundingSphere)object.geometry.computeBoundingSphere();const radius=object.geometry.boundingSphere.radius*Math.max(...object.getWorldScale(new T.Vector3()).toArray()),tolerance=Math.max(settings.paddingPx||8,radius/units),pixels=Math.hypot((p.x-cursor.x)*settings.width/2,(p.y-cursor.y)*settings.height/2);if(pixels>tolerance)continue;if(!best||pixels<best.pixels-.01||Math.abs(pixels-best.pixels)<.01&&along<best.distance)best={object,pixels,distance:along,point:world};}
 return best;
}
// Capture only trajectory selection, before TransformControls starts a drag.
export function installCurvePickingPriority(canvas,{gizmo,camera,curves}){
 const ray=new T.Raycaster();const handler=event=>{if(event.altKey||event.button!==0||gizmo.dragging)return;const api=curves(),rect=canvas.getBoundingClientRect();if(!api?.hitTest||!rect.width||!rect.height)return;configureHelperPicking(ray,rect);ray.setFromCamera(new T.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);const hit=api.hitTest(ray);if(!hit)return;if(gizmo.axis&&gizmo.object===hit.object&&api.active())return;event.preventDefault();event.stopImmediatePropagation();api.choose(hit.object.userData.curveTime);};canvas.addEventListener('pointerdown',handler,true);return()=>canvas.removeEventListener('pointerdown',handler,true);
}
