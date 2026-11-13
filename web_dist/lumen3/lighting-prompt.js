import * as T from 'three';
import {lightGeometry} from './lighting-geometry.js';
const fmt=a=>'['+a.map(v=>Number(v).toFixed(3)).join(', ')+']';
const names={key:'主光',fill:'补光',rim:'轮廓光'};
const colorName=k=>k<3000?'橙暖光':k<4500?'暖白光':k<6000?'中性偏暖白光':k<7000?'中性白光':'冷蓝白光';
export function describeLight(l,c){
  const g=lightGeometry(l.position_m,l.target_m,c),distance=g.distance,v=new T.Vector3().fromArray(g.bearing);
  const side=v.x<-.001?'画面左侧':v.x>.001?'画面右侧':'画面中央方向';
  const height=g.elevation>10?'上方':g.elevation< -10?'下方':'近水平高度';
  const depth=g.depth;
  const angle=l.type==='area'?T.MathUtils.radToDeg(2*Math.atan((l.emitter?.width_m||0)/(2*Math.max(distance,.001)))):0;
  const softness=l.type==='point'?'点光源向四周照明，按距离平方衰减，理想点光阴影较硬；旋转不改变照明':l.type==='directional'?'平行光，无距离衰减，阴影边缘较硬':angle>=20?'大角度柔光，明暗过渡宽、阴影边缘柔和':angle>=7?'中等柔光，明暗过渡适中':'小角度光源，阴影边缘较清晰';
  const rgb=(l.color_srgb_hex||'#ffffff').slice(1).match(/../g).map(x=>parseInt(x,16));
  const warning=!g.valid?(l.type==='point'?'点光源与参考点重合，参考来光方向未定义。':'灯具与注视目标重合，方向未定义。'):g.targetInFront===false?'注视目标位于拍摄相机后方；请核对目标，以下为目标处的相机轴方向，不是原图中的可见来光位置。':g.targetInFrame===false?'注视目标在拍摄画幅外；请核对是否仍指向主体。':'';
  return {...g,emission:l.type==='point'?null:g.emission,text:!g.valid?(l.type==='point'?'点光源与参考点重合，向四周照明；参考点处来光方位未定义。':'方向未定义，请先分开灯具与注视目标。'):'以'+(l.type==='point'?'参考点':'注视目标')+'为基准，'+(l.type==='point'?'光源位于':'从')+side+height+(l.type==='point'?'':'照向目标')+'（方位 '+g.azimuth.toFixed(1)+'°、仰角 '+g.elevation.toFixed(1)+'°），形成'+depth+'；'+colorName(l.temperature_K)+'，'+softness+'。',bearing:g.bearing,distance,angle,rgb,warning,world_height_difference:g.delta[1]};
}
const RAD=Math.PI/180;
const sideOf=az=>{const right=Math.sin(az*RAD)>0;return Math.abs(az)>135?right?'主体右后方（逆光）':'主体左后方（逆光）':right?'画面右侧':'画面左侧';};
function originalMainAzimuth(a){
  if(!a||!Array.isArray(a.lights)||a.reference_matches===false)return null;
  // 只认主光分量：补光/轮廓光的方位不代表原图来光侧，兜底到任意检出灯会把左右判反。
  const key=a.lights.find(l=>l.id==='key'||/主/.test(l.label||''));
  if(!key||key.detected===false)return null;
  return Number.isFinite(key.azimuth_camera_deg)?key.azimuth_camera_deg:Number.isFinite(key.azimuth)?key.azimuth:null;
}
// 只有拿到原图主光方向、且本次主光左右翻转时才点名，否则只给通用要求。
function reverseLightRewrite(s){
  const orig=originalMainAzimuth(s.light_analysis),key=s.lights.find(l=>l.id==='key')||s.lights[0];
  const next=key&&key.enabled&&key.intensity>0?key.azimuth_camera_deg:null;
  if(!Number.isFinite(orig)||!Number.isFinite(next))return null;
  const a=Math.sin(orig*RAD),b=Math.sin(next*RAD);
  if(a*b>=0||Math.min(Math.abs(a),Math.abs(b))<.342)return null;
  return ['【逆向改光要求】','本次目标主光从'+sideOf(next)+'（来光方位 '+next.toFixed(1)+'°）。原图灯光分析把原图主光判在'+sideOf(orig)+'（来光方位 '+orig.toFixed(1)+'°），两者左右相反，属于改写受光方向。','原图分析只是等效拟合初稿，可能判错左右；旧高光、旧亮边和旧投影到底在哪一侧，以原图画面里实际可见的亮部为准。',
  '这属于改写受光方向，必须：','一、找到并压制原图中与新灯位冲突的旧受光面、旧高光与旧亮边，以及对应的旧阴影和旧投影方向；',
  '二、在'+sideOf(next)+'按本次灯光重建受光面、明暗过渡与阴影，允许大于常规的调整幅度，不要为了保留原图亮部而让步；',
  '三、原图的明暗分布不是需要保留的约束；需要保留的是人物身份、五官、服装、材质纹理和背景内容；',
  '四、改写方向不等于改变曝光：整体亮度、对比度以及背景与墙面色调保持原图水平。'];
}
export function imageLightingPrompt(s,{applyPose=false,applyCamera=false,rebuildLitSide=false}={}){
  const c=s.camera,active=s.lights.filter(l=>l.enabled&&l.intensity>0),conflict=reverseLightRewrite(s);
  // 自动逆向段只在「分析判定的原图主光」与本次主光分居左右时点名；正面人像常被判成 0°，
  // 那条门槛够不到，所以额外给用户一个手动开关，勾了就无条件要求重建受光面。
  const main=s.lights.find(l=>l.id==='key')||s.lights[0];
  const mainAz=main&&main.enabled&&main.intensity>0?main.azimuth_camera_deg:null;
  const rebuild=!conflict&&rebuildLitSide
    ?(!Number.isFinite(mainAz)
      ?['【受光面重建要求】','本次勾选了重建受光面，但当前主光已关闭或强度为 0，重建要求未生效：请先在 3D 工作台把主光打开并给到非零强度。']
      :['【受光面重建要求】','用户明确要求按目标灯位重建受光面，明暗分布以本次主光为准：主光从'+sideOf(mainAz)+'照向目标（来光方位 '+mainAz.toFixed(1)+'°）。',
        '一、找到原图中与该灯位冲突的旧受光面、旧高光、旧亮边以及对应的旧阴影和旧投影方向，并压制它们；',
        '二、在'+sideOf(mainAz)+'重建受光面、明暗过渡与阴影，背光侧允许压到明显暗于原图，调整幅度可以大于常规，不要为了保留原图亮部而让步；',
        '三、原图的明暗分布不是需要保留的约束；需要保留的是人物身份、五官、服装、材质纹理和背景内容；',
        '四、重建明暗不等于改变曝光：整幅画面的平均亮度、背景与墙面色调保持原图水平，只允许亮部与暗部在人物表面重新分配，不要把整体调暗或调灰。']):null;
  const out=['【图片编辑任务】','对原图'+(s.reference?.filename?'「'+s.reference.filename+'」':'')+'重新布光。保留人物身份、五官、服装、材质纹理和背景内容，不添加灯具或其他物体。',applyPose?'应用白模参考中的目标动作；保持原人物外观。':'保持原图人物动作、身体比例和手部姿态。',applyCamera?'应用白模参考中的目标镜头与构图，参数见下文。':'保持原图视角、裁切、构图和透视，不因布光改变镜头。','','【参考图职责】','原图是唯一的外观与色调来源：人物身份、五官、服装、材质、背景内容，以及画面亮度、对比度、色彩倾向和白平衡，一律以原图为准。','白模截图只用于参考目标灯光'+(applyPose?'、动作':'')+(applyCamera?'、镜头':'')+'，即明暗落在人物的哪一侧、阴影朝哪边、边缘亮边的走向。','白模截图是三维渲染的哑光白模，背景为均匀中性灰，不含场景与环境色，也不代表任何曝光设置；禁止参考它的整体亮度、灰度、对比度、色调和背景颜色，禁止据此把成片调暗或调亮，禁止让画面往灰、往暗偏移。','不要把人物变成白模，不要将白模图当作视频首尾帧。','','【目标灯光：按拍摄画面理解】'];
  if(s.light_analysis)out.push('来源说明：原图多灯分析生成的是等效灯光候选，不是全部真实光源的测量。灯距与灯面尺寸为复现假设，色温未分离材质/白平衡；未检出不代表原图没有该光源。',s.light_analysis.current_parameters_match_analysis?'当前方案仍为分析初稿。':'当前方案已在分析初稿基础上手动修改，以当前文字和参数为准。','');
  for(const l of s.lights){const name=l.name||names[l.id]||l.id;if(!l.enabled||l.intensity<=0){out.push(name+'：关闭，不引入该灯的额外高光。');continue;}const d=describeLight(l,c);out.push(name+'：'+d.text,(d.warning?'目标检查：'+d.warning:''),'世界高度差：灯具 Y − 目标 Y = '+d.world_height_difference.toFixed(3)+' m；方向以目标为基准，而非世界原点。','颜色：'+l.temperature_K+' K，近似色卡 '+l.color_srgb_hex.toUpperCase()+'，RGB('+d.rgb.join(', ')+')；相对创作强度 '+l.intensity+'。',l.id==='rim'?'视觉意图：以朝向该灯的可见外轮廓亮边为主；实际亮边取决于遮挡和表面朝向。':'视觉意图：朝向该灯的可见表面更亮，背向光源的区域更暗；保留自然体积感和材质纹理。','');}
  if(!active.length)out.push('没有启用非零强度的直接光，仅使用环境填充。');
  out.push('环境填充：'+Number(s.environment.hemisphere_relative_intensity.toFixed(3))+'（相对值）。保留合理暗部层次。','重新计算与目标光向一致的明暗，减弱原图中与新灯光冲突的旧高光和旧阴影；当新灯位与原图可见光位左右相反时，以新灯位为准重建受光面并清除旧高光与旧投影方向；保留遮挡与接触阴影。避免整体染色、皮肤泛黄、过曝和纹理丢失，避免因白模截图而整体压暗或提亮。',...(conflict?['',...conflict]:[]),...(rebuild?['',...rebuild]:[]),'','【矢量参数：辅助约束】','右手坐标系：Y 向上，+Z 为初始模型正面，+X 为初始正面镜头的画面右侧。单位为假设米；四元数 [x,y,z,w]。','面光和平行光的世界发射方向为 normalize(目标 − 灯具)；点光源全向发射，没有单一发射方向，目标仅为描述参考。画面来光方向为相机逆旋转 × normalize(灯具 − 目标)，在目标处取拍摄相机轴为基准（+X 画面右、+Y 画面上、+Z 朝镜头），二者不能互换。');
  for(const l of active){const d=describeLight(l,c);out.push('',(l.name||names[l.id]||l.id)+' / '+l.type,'位置 position_m = '+fmt(l.position_m),(l.type==='point'?'参考点':'注视目标')+' target_m = '+fmt(l.target_m),l.type==='point'?'世界发射方向 emission_direction_world = null；全向发射，不用目标点限制照明范围。':'世界发射方向 emission_direction_world = '+fmt(d.emission),'画面来光方向 source_bearing_camera = '+fmt(d.bearing),'局部来光方位 '+d.azimuth.toFixed(1)+'°；仰角 '+d.elevation.toFixed(1)+'°（方位 0° 朝镜头、+90° 画面右、±180° 逆光）',l.type==='area'?'方形灯面 '+l.emitter.width_m+' × '+l.emitter.height_m+' m；距目标 '+d.distance.toFixed(3)+' m；目标处角宽约 '+d.angle.toFixed(1)+'°；尺寸/距离控制软硬。':l.type==='directional'?'平行光：位置仅是方向手柄；无距离衰减；当前预览为硬阴影。':'点光源：距参考点 '+d.distance.toFixed(3)+' m；全向、距离平方衰减；影响范围 '+(l.attenuation?.cutoff_distance_m||0)+' m（0 表示不限）；理想点光硬阴影。','相对强度 intensity = '+l.intensity+'；色温 temperature_K = '+l.temperature_K+'；sRGB = '+l.color_srgb_hex,l.shadow?.enabled===false?'阴影：关闭，此灯不产生投影。':'阴影：开启；预览阴影为近似过滤效果。');}
  out.push('','【主相机：'+(c.main_camera?.name||'默认拍摄相机')+'；方向解释基准】','位置 '+fmt(c.position_m)+' m；目标 '+fmt(c.target_m)+' m','四元数 '+fmt(c.quaternion_xyzw)+'；前向 '+fmt(c.forward_world),'垂直视场角 '+c.vertical_fov_deg.toFixed(2)+'°；画幅比 '+c.aspect.toFixed(4)+'；滚转 '+c.roll_deg.toFixed(2)+'°',applyCamera?'以上作为目标镜头；单图相机估计不是唯一真实解。':'以上仅解释三维参考中的画面方向，不要求图片 AI 改变原图镜头。');
  if(applyPose)out.push('','【目标动作：白模关节参数】',...Object.entries(s.model.joints||{}).map(([k,v])=>k+': '+fmt(v.position_m)+' m'),'导入资产骨骼参数（如有）见 scene.json；需结合白模截图理解。');
  out.push('','【执行范围】','按文字与白模参考实现可见效果；只有接口支持三维控制时，矢量才可作为直接控制。强度是相对创作值，不是 lux/lumen；色卡为近似 sRGB，最终颜色受曝光和材质影响。当前参数表达目标布光，不代表已恢复原图真实照明。');
  return out.join('\n');
}
