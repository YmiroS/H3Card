export const scanRegions=()=>[0,.25,.5].map(x=>({x,y:0,w:.5,h:1})).concat([0,.25,.5].map(x=>({x,y:.2,w:.5,h:.8})));
export function cropCandidate(landmarks,world,region={x:0,y:0,w:1,h:1}){return{landmarks:landmarks.map(p=>({...p,x:region.x+p.x*region.w,y:region.y+p.y*region.h,z:(p.z||0)*region.w})),world};}
const confidence=p=>Math.min(p?.visibility??0,p?.presence??1);
const torso=[11,12,23,24],anchors=[0,11,12,23,24,25,26];
// 合格人体锚点：允许「头/鼻 + 双肩 + 双髋」里任意 3 个，半身像和风格化角色不再被整条丢弃。
const core=[0,7,8,11,12,23,24];
function center(c){const points=torso.map(i=>c.landmarks[i]).filter(p=>confidence(p)>=.3);return{x:points.reduce((a,p)=>a+p.x,0)/Math.max(1,points.length),y:points.reduce((a,p)=>a+p.y,0)/Math.max(1,points.length)};}
function score(c){return anchors.reduce((sum,i)=>sum+confidence(c.landmarks[i])*(c.landmarks[i]?.x>=0&&c.landmarks[i]?.x<=1&&c.landmarks[i]?.y>=0&&c.landmarks[i]?.y<=1?1:0),0);}
export function samePerson(a,b){const common=core.filter(i=>confidence(a.landmarks[i])>=.3&&confidence(b.landmarks[i])>=.3);if(common.length<3)return false;const distance=common.reduce((sum,i)=>sum+Math.hypot(a.landmarks[i].x-b.landmarks[i].x,a.landmarks[i].y-b.landmarks[i].y),0)/common.length;const span=c=>{const ys=core.map(i=>c.landmarks[i]).filter(p=>confidence(p)>=.3).map(p=>p.y);return ys.length?Math.max(...ys)-Math.min(...ys):0;};return distance<Math.max(.025,Math.min(.1,Math.max(span(a),span(b))*.4));}
export function mergePoseCandidates(candidates,max=6){const result=[];for(const c of [...candidates].sort((a,b)=>score(b)-score(a))){if(!c.world||core.filter(i=>confidence(c.landmarks[i])>=.3).length<3)continue;if(!result.some(p=>samePerson(p,c)))result.push(c);}return result.sort((a,b)=>center(a).x-center(b).x).slice(0,max);}
