import * as T from 'three';
import {analyzeLighting} from './light-analysis.js?v=45';
import {createCloudFlow, rangeText} from './cloud-confirm.js?v=45';
import {ensureAnalysisRoleLights,applyCloudCardLights} from './light-editing.js?v=45';
export function setupLightAnalysis({getPhoto,getReference,getCamera,getTarget,lamps,getEnvironment,setEnvironment,applyLights,selectLight,toast,getPoints,state,replaceLights}){
  const $=id=>document.getElementById(id),names=['主光','补光','轮廓光'];
  // 禁用态要说清缺什么，别让人对着灰按钮猜。
  const UNDO_OFF='先点「分析灯光并应用」，成功后这里才能一键退回分析前的布光。';
  const UNDO_ON='把灯位、强度与环境填充退回本次分析前的状态。';
  const syncUndoHint=(disabled)=>{const b=$('analysis-undo');if(!b)return;b.title=disabled?UNDO_OFF:UNDO_ON;};
  const panel=document.createElement('section');panel.className='light-analysis-panel';
  panel.innerHTML='<h3>原图灯光分析</h3><p class="hint">本地按取样区域拟合亮度，云端请大模型看图判断光位；两条都只给等效初稿，测不出真实灯数与灯距。</p><label>分析方式<select id="analysis-mode"><option value="local">本地等效拟合 · 不联网</option><option value="cloud" disabled>云端看图分析 · 调用大模型（发一次计费一次）</option></select></label><p class="hint" id="analysis-mode-hint"></p><div id="analysis-local-only"><label>取样范围<select id="analysis-region"><option value="center">主体中央区域</option><option value="full">整张图片</option><option value="points">照片关键点包围区域</option><option value="custom">自定义百分比区域</option></select></label><div id="analysis-crop"><label>左 %<input id="analysis-x" type="number" value="15" min="0" max="95"></label><label>上 %<input id="analysis-y" type="number" value="10" min="0" max="95"></label><label>宽 %<input id="analysis-w" type="number" value="70" min="5" max="100"></label><label>高 %<input id="analysis-h" type="number" value="80" min="5" max="100"></label></div><canvas id="analysis-preview" width="260" height="130" aria-label="取样区域预览" style="width:100%;display:none"></canvas></div><label>统一灯距假设 · m<input id="analysis-distance" type="number" value="3" min=".3" max="20" step=".1"></label><p class="hint">灯距不是识别结果。默认 3 m；灯面尺寸采用初始假设，后续可逐灯修改。尽量只取主体，避免天空、窗户和大面积背景。</p><button id="analysis-undo" class="wide" disabled>撤销本次分析应用</button><div id="light-analysis-report" aria-live="polite"></div>';
  $('estimate-light').before(panel);panel.insertBefore($('estimate-light'),$('analysis-undo'));syncUndoHint($('analysis-undo').disabled);
  // 按钮文字由 syncMode() 按当前档位给，这里不再单独设一次。
  const style=document.createElement('style');style.textContent='.light-analysis-panel{border:1px solid #43563d;border-radius:6px;padding:12px;margin-top:16px}.light-analysis-panel h3{font-size:16px}#analysis-crop{display:grid;grid-template-columns:1fr 1fr;gap:0 8px}#analysis-crop label{margin:5px 0}#analysis-crop[hidden]{display:none}.analysis-result{border-top:1px solid #43563d;margin-top:12px;padding-top:10px}.analysis-result p{font-size:11px;line-height:1.8;margin:5px 0;white-space:pre-line}.analysis-result button{font-size:11px;width:100%;text-align:left}.analysis-warning{color:#efc392;font-size:11px;line-height:1.8}';document.head.append(style);
  let undo=null,cloudReady=false;
  const LOCAL_LABEL='自动估算场景灯光（本地等效拟合）';
  const CLOUD_LABEL='自动估算场景灯光（云端看图，约 '+rangeText('light')+'）';
  const CLOUD_OPTION='云端看图分析 · 调用大模型（发一次计费一次）';
  const CLOUD_OFF='云端看图分析要由外层页面接上出图服务才发得出请求，当前入口没接上；先用本地等效拟合。';
  const modeOf=()=>($('analysis-mode').value==='cloud'?'cloud':'local');
  function syncMode(){const sel=$('analysis-mode');if(sel.value==='cloud'&&!cloudReady)sel.value='local';const cloud=sel.value==='cloud';$('analysis-local-only').hidden=cloud;const hint=$('analysis-mode-hint');hint.textContent=cloud?('发请求前会先问一句是否计费（约 '+rangeText('light')+'，超时只停止等待、不会自动重试）：判出的光位按照明占比折成功率写进灯位，方向判不明的光不补灯。'):'本地只用取样框里的像素做拟合：框住人、避开天空和窗户更准；不联网、不花钱。';$('estimate-light').textContent=cloud?CLOUD_LABEL:LOCAL_LABEL;}
  function setCloudMode(available){cloudReady=!!available;const opt=$('analysis-mode').querySelector('option[value="cloud"]');if(opt){opt.disabled=!cloudReady;opt.textContent=cloudReady?CLOUD_OPTION:CLOUD_OPTION+'（当前入口不可用）';opt.title=cloudReady?'请求由外层页面代发，发一次计费一次；判出的灯位是等效初稿。':CLOUD_OFF;}syncMode();}
  const summary=document.createElement('dialog');summary.id='analysis-summary';summary.style.cssText='width:1000px;max-width:95vw;max-height:90vh;overflow:auto';document.body.append(summary);
  function showSummary(){if(state.cloudAnalysis)return showCloudSummary();const a=state.lightAnalysis;if(!a)return;summary.replaceChildren();const header=el('div','','dialoghead');header.append(el('h2','原图多灯分析 · 等效布光汇总'));const close=el('button','关闭汇总');close.onclick=()=>summary.close();header.append(close);summary.append(header,el('p','单图只能给出等效候选；无法确定全部真实灯具，也无法测量真实灯距。角度以分析时的拍摄相机为基准。','analysis-warning'));const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px;line-height:1.9';const head=document.createElement('tr');for(const t of ['光照分量','识别线索','来光方位 / 仰角','灯距','色温'])head.append(el('th',t));table.append(head);a.lights.forEach((l,i)=>{const row=document.createElement('tr');const angle=l.detected?l.azimuth_camera_deg.toFixed(1)+'° / '+l.elevation_camera_deg.toFixed(1)+'°':'未辨识';for(const t of [names[i],l.detected?l.confidence:'未检出独立分量',angle,l.detected?a.distance_assumption_m.toFixed(1)+' m（假设）':'无法识别',l.detected?l.kelvin+' K（近似）':'—']){const td=el('td',t);td.style.cssText='padding:14px 9px;border-bottom:1px solid #43563d';row.append(td);}table.append(row);});const env=document.createElement('tr');for(const t of ['环境填充','低可信等效值 '+a.environment.relative_intensity.toFixed(3),'无唯一方向','无法识别','未分离']){const td=el('td',t);td.style.cssText='padding:14px 9px;border-bottom:1px solid #43563d';env.append(td);}table.append(env);summary.append(table,el('p','灯距统一采用 '+a.distance_assumption_m.toFixed(1)+' m 复现假设。灯面大小同样是假设；色温受物体固有色、白平衡与曝光影响。','analysis-warning'));a.lights.forEach((l,i)=>summary.append(el('p',names[i]+'：'+l.evidence+'。','hint')));summary.append(el('p','可在三维视图继续调整；原图分析、当前修改状态及假设会随 JSON / 工程保存。','hint'));summary.showModal();}
  const snapshot=()=>({lamps:structuredClone(lamps),environment:getEnvironment()});
  const signature=()=>JSON.stringify(snapshot());
  function roi(){const mode=$('analysis-region').value;if(mode==='full')return{x:0,y:0,w:1,h:1};if(mode==='custom'){let x=Number($('analysis-x').value)/100,y=Number($('analysis-y').value)/100,w=Number($('analysis-w').value)/100,h=Number($('analysis-h').value)/100;if(![x,y,w,h].every(Number.isFinite)||x<0||y<0||w<.05||h<.05||x+w>1||y+h>1)throw new Error('区域须在图片内，宽高至少 5%。');return{x,y,w,h};}if(mode==='points'){const p=Object.values(getPoints()).filter(p=>p.visibility>=.6&&p.u>=0&&p.u<=1&&p.v>=0&&p.v<=1);if(p.length<4)throw new Error('至少需要 4 个可靠照片标点，或改选中央/自定义区域。');const x=Math.max(0,Math.min(...p.map(p=>p.u))-.08),y=Math.max(0,Math.min(...p.map(p=>p.v))-.08);return{x,y,w:Math.min(1-x,Math.max(.15,Math.max(...p.map(p=>p.u))-x+.08)),h:Math.min(1-y,Math.max(.15,Math.max(...p.map(p=>p.v))-y+.08))};}return{x:.15,y:.1,w:.7,h:.8};}
  function preview(){$('analysis-crop').hidden=$('analysis-region').value!=='custom';const image=getPhoto(),canvas=$('analysis-preview');if(!image){canvas.style.display='none';return;}try{const r=roi(),ctx=canvas.getContext('2d');canvas.style.display='block';ctx.clearRect(0,0,260,130);const ratio=Math.min(260/image.naturalWidth,130/image.naturalHeight),w=image.naturalWidth*ratio,h=image.naturalHeight*ratio,x=(260-w)/2,y=(130-h)/2;ctx.drawImage(image,x,y,w,h);ctx.strokeStyle='#d2ebaa';ctx.lineWidth=2;ctx.strokeRect(x+r.x*w,y+r.y*h,r.w*w,r.h*h);}catch{}}
  for(const id of ['analysis-region','analysis-x','analysis-y','analysis-w','analysis-h'])$(id).onchange=preview;
  $('analysis-mode').onchange=syncMode;syncMode();
  const el=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;};
  // 分析结果按「主光/补光/轮廓光」三个角色写灯，回显时要按 id 找当前灯：灯可能已被改名或删掉。
  const roleId=(l,i)=>l.scene_light_id||['key','fill','rim'][i];
  function render(){const root=$('light-analysis-report'),a=state.lightAnalysis;preview();root.replaceChildren();if(state.cloudAnalysis)return renderCloud(root);if(!a)return;const stale=a.reference_sha256!==getReference()?.sha256,changed=a.applied_signature!==signature();const show=el('button','查看全部灯光汇总');show.className='wide primary';show.onclick=showSummary;root.append(show);root.append(el('p',stale?'参考图已变化，请重新分析。':changed?'当前布光已手动修改；下方保留的是原图分析初稿。':'已应用等效分析初稿；不是原始灯位测量。','analysis-warning'));
    a.lights.forEach((l,i)=>{const id=roleId(l,i),at=lamps.findIndex(v=>v.id===id),row=el('div','','analysis-result'),b=el(at>=0?'button':'span',(at>=0?lamps[at].name:names[i]+'（已删除）')+' · '+(l.detected?'候选 / '+l.confidence:'未检出可靠独立分量'));if(at>=0)b.onclick=()=>{const cur=lamps.findIndex(v=>v.id===id);if(cur>=0)selectLight(cur);};row.append(b);if(l.detected){const v=l.direction_camera,az=Math.atan2(v[0],v[2])*180/Math.PI,ev=Math.atan2(v[1],Math.hypot(v[0],v[2]))*180/Math.PI;row.append(el('p','来光方位 '+az.toFixed(1)+'° / 仰角 '+ev.toFixed(1)+'°\n角度不确定范围提示 ±'+l.angle_uncertainty_deg+'°（启发式，非统计置信区间）\n灯距 '+a.distance_assumption_m.toFixed(1)+' m【假设，无法识别】\n灯面 '+l.size.toFixed(1)+' m【假设】；色温 '+l.kelvin+' K【近似】'));}row.append(el('p',l.evidence+'。','hint'));root.append(row);});root.append(el('p','环境填充 '+a.environment.relative_intensity.toFixed(3)+'【低可信等效值】；无唯一方向/距离。','analysis-warning'));root.append(el('p','代理亮度拟合 RMSE '+a.fit_rmse.toFixed(3)+'，不是灯位准确率。背景、固有色与白平衡可能干扰；未检出不等于原图无该光源。','hint'));}
  async function analyzeLocally(){const image=getPhoto();if(!image){toast('请先上传图片。');return;}const button=$('estimate-light');button.disabled=true;button.textContent='正在分析多个光照分量…';await new Promise(requestAnimationFrame);try{const region=roi(),distance=Number($('analysis-distance').value);if(!Number.isFinite(distance)||distance<.3||distance>20)throw new Error('灯距假设应在 0.3–20 m。');const canvas=document.createElement('canvas');const scale=Math.min(1,320/Math.max(image.naturalWidth,image.naturalHeight));canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,canvas.width,canvas.height);const result=analyzeLighting(ctx.getImageData(0,0,canvas.width,canvas.height),region);undo={snapshot:snapshot(),analysis:state.lightAnalysis||null,cloud:state.cloudAnalysis||null,source:state.lightSource};const target=getTarget().clone(),q=getCamera().quaternion;const roles=ensureAnalysisRoleLights(lamps);const hiddenExtra=lamps.filter(l=>!roles.includes(l)&&l.enabled).length;result.extra_lights_disabled=hiddenExtra;lamps.filter(l=>!roles.includes(l)).forEach(l=>l.enabled=false);result.lights.forEach((l,i)=>{const direction=new T.Vector3().fromArray(l.direction_camera).applyQuaternion(q);Object.assign(roles[i],{pos:target.clone().addScaledVector(direction,distance).toArray(),target:target.toArray(),type:'area',power:l.power,kelvin:l.kelvin,size:l.size,enabled:l.detected});l.azimuth_camera_deg=Math.atan2(l.direction_camera[0],l.direction_camera[2])*180/Math.PI;l.elevation_camera_deg=Math.atan2(l.direction_camera[1],Math.hypot(l.direction_camera[0],l.direction_camera[2]))*180/Math.PI;l.distance_assumption_m=distance;l.scene_light_id=roles[i].id;l.position_world_assumed=roles[i].pos;l.target_world=target.toArray();});setEnvironment(result.environment.relative_intensity);result.distance_assumption_m=distance;result.reference_sha256=getReference()?.sha256;result.camera_quaternion_at_analysis=getCamera().quaternion.toArray();result.applied_signature=signature();state.cloudAnalysis=null;state.lightAnalysis=result;state.lightSource='equivalent_multilight_image_fit_with_assumed_distance';applyLights();render();$('analysis-undo').disabled=false;syncUndoHint(false);$('light-status').textContent='已分析主光、补光、轮廓光与环境填充。点击候选查看与调整；距离/灯面均为假设。';}catch(e){toast('多灯分析未完成：'+e.message);}finally{button.disabled=false;syncMode();}}
  const dirFromAngle=(az,el)=>{const a=az*Math.PI/180,e=el*Math.PI/180;return new T.Vector3(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e));};
  // 云端那条只负责「要结果 + 写灯 + 报告」，请求由外壳（React）发，因为登录态和 CSRF 都在它那边。
  // 计费确认、进行中的步骤与秒数、失败后的重试按钮由 cloud-confirm 壳给；降级就是回到不花钱的本地拟合。
  const flow=createCloudFlow({kind:'light',host:panel,insertBefore:$('analysis-undo'),onDegrade:useLocalInstead,onAsk:askWaitCopy});
  function useLocalInstead(){$('analysis-mode').value='local';syncMode();analyzeLocally();}
  // 确认条只有几行高，滚动位置不对时看不见；状态行是常驻的，这里同步写一句「在等你点」。
  function askWaitCopy(){$('light-status').textContent='等待你确认是否花钱 · 60 秒不点会自动取消（不计费）';}
  async function analyzeWithCloud(){
    const host=window.parent&&window.parent.choukaLumenHost;
    if(!host||!host.analyzeLight){flow.hide();$('light-status').textContent=CLOUD_OFF;toast(CLOUD_OFF);return;}
    // 你点「不花钱」才降级到本地拟合；60 秒没点是取消，不替你擅自跑分析。
    if(!await flow.ask()){if(flow.askTimedOut()){$('light-status').textContent='已取消：没确认是否花钱，本次未发送云端请求（不计费）。';return;}useLocalInstead();return;}
    await sendCloudLight(host);
  }
  // 重试只在这块面板上手动点：客户端超时不等于服务端没收到，自动重发会变成连点两下扣两次。
  async function sendCloudLight(host){
    const button=$('estimate-light');button.disabled=true;button.textContent='正在请云端看图分析…';
    flow.start();
    try{
      const distance=Number($('analysis-distance').value);if(!Number.isFinite(distance)||distance<.3||distance>20)throw new Error('灯距假设应在 0.3–20 m。');
      const payload=await host.analyzeLight({distance});
      if(!payload||!Array.isArray(payload.lights))throw new Error('云端没返回可用的灯位清单。');
      flow.step(1);
      payload.distance_assumption_m=distance;payload.reference_sha256=getReference()?.sha256;
      undo={snapshot:snapshot(),analysis:state.lightAnalysis||null,cloud:state.cloudAnalysis||null,source:state.lightSource};
      const roles=ensureAnalysisRoleLights(lamps);
      payload.extra_lights_disabled=lamps.filter(l=>!roles.includes(l)&&l.enabled).length;
      let rolesOff=[];
      if(payload.lights.length){
        const target=getTarget().clone(),q=getCamera().quaternion;
        lamps.filter(l=>!roles.includes(l)).forEach(l=>l.enabled=false);
        rolesOff=applyCloudCardLights({roles,lights:payload.lights,place:(l)=>({pos:target.clone().addScaledVector(dirFromAngle(l.azimuth,l.elevation).applyQuaternion(q),distance).toArray(),target:target.toArray(),type:'area',power:l.power,kelvin:l.kelvin,size:l.size,enabled:true})});
      }
      payload.roles_disabled=rolesOff;
      payload.applied_signature=signature();
      state.cloudAnalysis=payload;state.lightAnalysis=null;state.lightSource=payload.lightSource||'cloud_vision_light_card_with_assumed_distance';
      applyLights();render();$('analysis-undo').disabled=false;syncUndoHint(false);
      const offText=rolesOff.length?('；原图没判出方向的'+rolesOff.join('、')+'已停用，要的话手动摆灯。'):'。';
      $('light-status').textContent=payload.lights.length?('云端写入 '+payload.lights.length+' 盏灯；灯距 '+distance.toFixed(1)+' m 是假设，可逐灯再调'+offText):'云端没判出方向明确的灯，灯位保持原样。';
      flow.done(payload.lights.length?('写入 '+payload.lights.length+' 盏灯'+(rolesOff.length?'，停用 '+rolesOff.length+' 盏':'')):'灯位未改动');
    }catch(e){
      const msg='云端分析未完成：'+(e&&e.message||e);
      $('light-status').textContent=msg;
      flow.fail(msg,{onRetry:()=>sendCloudLight(host)});
    }
    finally{button.disabled=false;syncMode();}
  }
  function cloudStaleLine(p){return p.reference_sha256!==getReference()?.sha256?'原图已变化，请重新分析。':p.applied_signature!==signature()?'当前布光已手动修改；下方保留的是云端分析初稿。':'已写入云端分析初稿；灯距与灯面尺寸为假设。';}
  function renderCloud(root){
    const p=state.cloudAnalysis;
    const show=el('button','查看云端分析汇总');show.className='wide primary';show.onclick=showCloudSummary;root.append(show);
    root.append(el('p',cloudStaleLine(p),'analysis-warning'));
    if(!p.lights.length)root.append(el('p','云端没判出方向明确的灯，本次没有改动灯位；可以改选本地，或手动摆灯。','analysis-warning'));
    p.lights.forEach((l,i)=>{const id=roleId(l,i),at=lamps.findIndex(v=>v.id===id),row=el('div','','analysis-result'),b=el(at>=0?'button':'span',(at>=0?lamps[at].name:l.label+'（已删除）')+' · 方位 '+Math.round(l.azimuth)+'° / 仰角 '+Math.round(l.elevation)+'°');if(at>=0)b.onclick=()=>{const cur=lamps.findIndex(v=>v.id===id);if(cur>=0)selectLight(cur);};row.append(b);row.append(el('p','功率 '+l.power+' W（按照明占比折算）\n色温 '+l.kelvin+' K（暖 / 中性 / 冷三档近似）\n灯距 '+p.distance_assumption_m.toFixed(1)+' m【假设】· 灯面 '+l.size.toFixed(1)+' m【假设】'));if(l.note)row.append(el('p',l.note,'hint'));root.append(row);});
    if(p.skipped&&p.skipped.length)root.append(el('p','方向不明、未写入灯位：'+p.skipped.map(s=>s.label+'（'+s.reason+'）').join('、'),'hint'));
    if(p.extra_lights_disabled)root.append(el('p','场景里其余 '+p.extra_lights_disabled+' 盏灯已临时关闭（分析只写主光、补光、轮廓光三个角色），点「撤销本次分析应用」可退回。','analysis-warning'));
    if(p.roles_disabled&&p.roles_disabled.length)root.append(el('p','云端没判出方向的 '+p.roles_disabled.join('、')+' 已停用；起手灯位不算识别结果，需要就手动摆灯或用「重建受光面」。','analysis-warning'));
    if(p.summary)root.append(el('p','模型总结：'+p.summary,'hint'));
    if(p.lookNotes)root.append(el('p','光效补充（灯位装不下的部分，可复制进出图提示词）：'+p.lookNotes,'hint'));
    if(p.evidence&&p.evidence.length)root.append(el('p','画面依据：'+p.evidence.join('；'),'hint'));
    (p.warnings||[]).forEach(w=>root.append(el('p','注意：'+w,'analysis-warning')));
    root.append(el('p',p.confidenceText+' · 模型 '+(p.model||'未知')+' · 本次请求 '+(p.elapsedMs/1000).toFixed(1)+' 秒'+(p.requestId?' · 请求号 '+p.requestId:''),'hint'));
  }
  function showCloudSummary(){
    const p=state.cloudAnalysis;if(!p)return;summary.replaceChildren();
    const header=el('div','','dialoghead');header.append(el('h2','云端看图分析 · 灯位汇总'));
    const close=el('button','关闭汇总');close.onclick=()=>summary.close();header.append(close);
    summary.append(header,el('p','大模型只看画面判断光位，给的是等效初稿。灯距与灯面尺寸是复现假设，色温只分暖 / 中性 / 冷三档。','analysis-warning'));
    const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px;line-height:1.9';
    const head=document.createElement('tr');for(const t of ['光照分量','来光方位 / 仰角','功率','色温','灯距（假设）','判断依据'])head.append(el('th',t));table.append(head);
    const cells=(list)=>{const row=document.createElement('tr');for(const t of list){const td=el('td',t);td.style.cssText='padding:14px 9px;border-bottom:1px solid #43563d';row.append(td);}table.append(row);};
    p.lights.forEach((l)=>cells([l.label,Math.round(l.azimuth)+'° / '+Math.round(l.elevation)+'°',l.power+' W',l.kelvin+' K',p.distance_assumption_m.toFixed(1)+' m',l.note||'—']));
    if(p.skipped&&p.skipped.length)cells(['未写入的光','方向不明','—','—','—',p.skipped.map(s=>s.label+'：'+s.reason).join('；')]);
    summary.append(table);
    if(p.summary)summary.append(el('p','模型总结：'+p.summary,'hint'));
    if(p.lookNotes)summary.append(el('p','光效补充：'+p.lookNotes,'hint'));
    (p.warnings||[]).forEach(w=>summary.append(el('p','注意：'+w,'analysis-warning')));
    summary.append(el('p',p.confidenceText+' · 模型 '+(p.model||'未知')+' · 请求号 '+(p.requestId||'无')+' · 耗时 '+(p.elapsedMs/1000).toFixed(1)+' 秒。','hint'));
    summary.showModal();
  }
  $('estimate-light').onclick=async()=>{if(modeOf()==='cloud')return analyzeWithCloud();return analyzeLocally();};
  $('analysis-undo').onclick=()=>{if(!undo)return;if(replaceLights)replaceLights(undo.snapshot.lamps,false);else undo.snapshot.lamps.forEach((l,i)=>{for(const key of Object.keys(lamps[i]))delete lamps[i][key];Object.assign(lamps[i],l);});setEnvironment(undo.snapshot.environment);state.lightAnalysis=undo.analysis;state.cloudAnalysis=undo.cloud||null;state.lightSource=undo.source;undo=null;$('analysis-undo').disabled=true;syncUndoHint(true);applyLights();render();$('light-status').textContent='已恢复分析前的布光。';};
  return {render,setCloudMode,hideFlow:()=>flow.hide(),exportAnalysis:()=>{const src=state.lightAnalysis||state.cloudAnalysis;if(!src)return null;return {...src,current_parameters_match_analysis:src.applied_signature===signature(),reference_matches:src.reference_sha256===getReference()?.sha256,applied_signature:undefined};}};
}
