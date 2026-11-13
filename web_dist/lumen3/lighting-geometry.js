import * as T from 'three';
export function lightGeometry(position,target,camera){
  const delta=new T.Vector3().fromArray(position).sub(new T.Vector3().fromArray(target));
  const distance=delta.length(),valid=distance>1e-6;
  const bearing=valid?delta.clone().divideScalar(distance):new T.Vector3();
  const q=new T.Quaternion().fromArray(camera.quaternion_xyzw).normalize();
  const local=bearing.clone().applyQuaternion(q.clone().invert());
  const azimuth=T.MathUtils.radToDeg(Math.atan2(local.x,local.z));
  const elevation=T.MathUtils.radToDeg(Math.atan2(local.y,Math.hypot(local.x,local.z)));
  const absolute=Math.abs(azimuth),depth=absolute<=15?'正面顺光':absolute<75?'前侧斜向照明':absolute<=105?'侧向照明':absolute<165?'后侧斜向逆光':'背面逆光';
  let targetInFront=null,targetInFrame=null;
  if(camera.position_m){const point=new T.Vector3().fromArray(target).sub(new T.Vector3().fromArray(camera.position_m)).applyQuaternion(q.clone().invert());targetInFront=point.z<-.001;if(camera.vertical_fov_deg&&camera.aspect&&targetInFront){const halfH=-point.z*Math.tan(T.MathUtils.degToRad(camera.vertical_fov_deg/2));targetInFrame=Math.abs(point.x)<=halfH*camera.aspect&&Math.abs(point.y)<=halfH;}else if(!targetInFront)targetInFrame=false;}
  return {valid,distance,delta:delta.toArray(),bearing:local.toArray(),worldBearing:bearing.toArray(),emission:bearing.clone().negate().toArray(),azimuth,elevation,depth,targetInFront,targetInFrame};
}
export function cameraParametersForTarget(position,target){
  const d=position.clone().sub(target),distance=d.length();
  if(distance<.1)return null;
  return {tx:target.x,ty:target.y,tz:target.z,distance,az:T.MathUtils.radToDeg(Math.atan2(d.x,d.z)),el:T.MathUtils.radToDeg(Math.atan2(d.y,Math.hypot(d.x,d.z)))};
}
