import * as T from 'three';
// MediaPipe world coordinates are hip-relative estimates, not camera extrinsics.
// Keep the observed image rays authoritative and use Z only as a bounded prior.
export function reconcilePoseDepth(pose,points,camera,{strength=.65,polarity=1,depthHint=null}={}){
 const V=a=>new T.Vector3().fromArray(a),forward=camera.getWorldDirection(new T.Vector3()),origin=V(pose.pelvis),local=p=>p.clone().sub(origin).dot(forward),ratios=[];
 for(const[a,b]of [['ls','rs'],['lhip','rhip'],['neck','pelvis'],['ls','lhip'],['rs','rhip']]){if(!points[a]||!points[b])continue;const pa=points[a],pb=points[b],dist=Math.hypot((pa.u-pb.u)*camera.aspect,pa.v-pb.v),delta=V(pose[a]).sub(V(pose[b])),xy=Math.sqrt(Math.max(0,delta.lengthSq()-delta.dot(forward)**2));if(dist>.04&&xy>.04)ratios.push(xy/(dist*2*Math.tan(T.MathUtils.degToRad(camera.fov/2))));}
 ratios.sort((a,b)=>a-b);const current=-camera.worldToLocal(origin.clone()).z,depth=T.MathUtils.clamp(Number.isFinite(depthHint)?depthHint:(ratios.length?ratios[Math.floor(ratios.length/2)]:current),.5,40),result=structuredClone(pose);
 for(const[k,p]of Object.entries(points)){if(!pose[k]||p.visibility<.35)continue;const z=T.MathUtils.clamp(local(V(pose[k])),-.8,.8)*strength*polarity,ray=new T.Vector3(p.u*2-1,1-p.v*2,.5).unproject(camera).sub(camera.position).normalize(),den=ray.dot(forward);if(den>.05)result[k]=camera.position.clone().addScaledVector(ray,Math.max(.15,depth+z)/den).toArray();}
 if(points.lhip&&points.rhip){const mid=V(result.lhip).lerp(V(result.rhip),.5),up=V(result.neck).sub(mid).normalize();result.pelvis=mid.addScaledVector(up,.065).toArray();}
 return{pose:result,diagnostics:{method:Number.isFinite(depthHint)?'image_rays_with_depth_map_hint':'image_rays_with_bounded_hip_relative_depth_prior',depth_m_assumption:depth,strength,polarity,depth_measured:false,occluded_joints:Object.keys(pose).filter(k=>!points[k]||points[k].visibility<.6)}};
}
