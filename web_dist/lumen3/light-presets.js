export const LIGHT_PRESETS=[
 {id:'three',name:'经典三点布光',description:'前侧主光、弱补光与后侧轮廓光。',lights:[[-2.5,2.5,2.8,85,5200,1.2],[2.5,1.5,2.8,20,6500,2],[1.7,2,-2.5,65,5600,.8]]},
 {id:'rembrandt',name:'伦勃朗',description:'高位约45°主光，少量补光；脸颊光斑取决于人物朝向。',lights:[[-2.8,2.8,2.8,95,4800,1],[2,1,2.5,9,6000,2],[1,2,-3,20,5200,.7]]},
 {id:'butterfly',name:'蝴蝶光',description:'正前上方主光，柔和低位填充。',lights:[[0,2.8,3,90,5600,1.7],[0,-.5,2.5,18,5600,2],[1.5,1.8,-3,25,5600,1]]},
 {id:'split',name:'分割光',description:'侧向主光，暗侧仅少量补光。',lights:[[-3,1,0,90,5200,.8],[2,1,2,5,6500,2],[0,2,-3,15,5200,.6]]},
 {id:'loop',name:'环形侧前光',description:'侧前上方小角度主光与宽面补光。',lights:[[-1.5,2,3,85,5200,1.3],[2,1.4,3,18,6000,2.3],[1.5,2,-2.5,35,5400,1]]},
 {id:'gel',name:'冷暖双色',description:'暖色主光与冷色后侧轮廓光。',lights:[[-2.5,1.5,2,70,3000,1.2],[2,1,2,8,6500,2],[2,1.8,-2,85,10000,1]]}
];
export function presetLights(preset,target,quaternion,Vector3){return preset.lights.map((v,i)=>({id:['key','fill','rim'][i],name:['主光','辅助光','轮廓光'][i],pos:new Vector3(v[0],v[1],v[2]).applyQuaternion(quaternion).add(target).toArray(),target:target.toArray(),power:v[3],kelvin:v[4],size:v[5],enabled:true,type:'area',shadow:true}));}
