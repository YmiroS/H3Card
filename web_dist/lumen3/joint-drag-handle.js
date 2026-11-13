import * as T from 'three';
export function createJointDragHandle(group,currentJoints,currentJoint){
 const object=new T.Object3D();object.name='Joint drag goal';group.add(object);
 return {object,sync(){const joint=currentJoints()[currentJoint()];object.position.copy(joint.position);object.quaternion.copy(joint.quaternion);object.scale.set(1,1,1);return object;}};
}
export function hideTransformGuides(controls){
 controls.getHelper().traverse(o=>{if(o.tag==='helper')for(const material of Array.isArray(o.material)?o.material:[o.material])if(material)material.visible=false;});
}
// Near a head-on hinge, use the drag-plane points rather than the unstable
// cross product of almost parallel camera and axis vectors. Unwrap successive
// samples so dragging past a half-turn stays against the anatomical stop.
export function hingeRotationDelta(controls,drag){
 if(Math.abs(drag.axis_world.dot(controls.eye))<.98)return controls.rotationAngle;
 const project=p=>p.clone().addScaledVector(drag.axis_world,-p.dot(drag.axis_world)),a=project(controls.pointStart),b=project(controls.pointEnd);
 if(a.lengthSq()<1e-10||b.lengthSq()<1e-10)return drag.dragAngle||0;
 const phase=Math.atan2(a.clone().cross(b).dot(drag.axis_world),a.dot(b)),step=phase-(drag.dragPhase||0);drag.dragAngle=(drag.dragAngle||0)+Math.atan2(Math.sin(step),Math.cos(step));drag.dragPhase=phase;return drag.dragAngle;
}
