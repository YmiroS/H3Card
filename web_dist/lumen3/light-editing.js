const roleIds=['key','fill','rim'],roleNames=['主光','补光','轮廓光'];
const owns=(channel,id)=>channel.id==='light:'+id||channel.id==='target:light:'+id||['light','aim-target'].includes(channel.kind)&&channel.meta?.lightId===id;
export function createLightManager({lamps,state,getStore=()=>null,clearSelection=()=>{},refresh=()=>{},commit=()=>{},document:doc=globalThis.document}){
 function changed(){refresh();doc?.dispatchEvent(new Event('lumen-selection-change'));commit();}
 function rename(id,value){const light=lamps.find(l=>l.id===id);if(!light)return false;const name=String(value??'').trim();if(!name||name.length>80)throw new Error('灯光名称须为 1–80 个字符。');if(light.name===name)return false;light.name=name;const store=getStore();if(store){for(const c of store.channels.values())if(owns(c,id))c.label=name+(c.kind==='aim-target'?' / 注视目标':'');store.notify();}state.lightSource='manual_rename_light';changed();return true;}
 function remove(id){const index=lamps.findIndex(l=>l.id===id);if(index<0)return false;clearSelection();lamps.splice(index,1);const store=getStore();if(store){let dirty=false;for(const[key,c]of store.channels)if(owns(c,id)){store.channels.delete(key);dirty=true;}if(dirty)store.notify();}state.tab='light';state.light=Math.min(index,lamps.length-1);state.selectionCleared=false;state.selectionKind='object';state.editTarget=false;state.lightSource='manual_delete_light';changed();return true;}
 const keydown=e=>{if(e.defaultPrevented||e.key!=='Delete'||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||e.repeat||e.isComposing||e.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable=false]),[role=textbox]')||doc.querySelector('dialog[open]')||state.tab!=='light'||state.selectionCleared||state.editTarget||globalThis.window?.lumenCurves?.active())return;const light=lamps[state.light];if(light){e.preventDefault();remove(light.id);}};
 doc?.addEventListener('keydown',keydown);return{rename,remove,dispose:()=>doc?.removeEventListener('keydown',keydown)};
}
export function addLightIdentityControls(container,light,{rename,remove,toast}){
 const row=document.createElement('label');row.textContent='灯光名称';const input=document.createElement('input');input.id='light-name';input.type='text';input.maxLength=80;input.value=light.name;input.setAttribute('aria-label','灯光名称');input.onchange=()=>{try{rename(input.value);}catch(e){input.value=light.name;toast(e.message);}};input.onkeydown=e=>{if(e.isComposing)return;if(e.key==='Enter'){e.preventDefault();input.blur();}else if(e.key==='Escape'){input.value=light.name;input.blur();}};row.append(input);const button=document.createElement('button');button.type='button';button.id='delete-light';button.className='wide delete-light';button.textContent='删除当前灯光（可撤销）';button.onclick=remove;container.append(row,button);return input;
}
export function ensureAnalysisRoleLights(lamps){
 const missing=roleIds.filter(id=>!lamps.some(l=>l.id===id));if(lamps.length+missing.length>8)throw new Error('补齐分析用主光、补光、轮廓光前，请先删除 '+(lamps.length+missing.length-8)+' 盏灯。');
 return roleIds.map((id,i)=>{let light=lamps.find(l=>l.id===id);if(!light){light={id,name:roleNames[i],pos:[0,2,2],target:[0,1.25,0],power:0,kelvin:5600,size:1,range:0,type:'area',enabled:false,shadow:true};lamps.push(light);}return light;});
}
// 云端卡片常常只判得出部分方向。没被写到的角色灯必须停用：起手那三盏的默认灯位不是识别结果，
// 留着会让「分析过了」和「没分析」两种场景在出图上看不出区别。返回值只报原本亮着的那些，供状态行点名。
export function applyCloudCardLights({roles,lights,place}){
 const written=new Set(),stopped=[];
 lights.forEach((l,i)=>{const roleIndex=roleIds.indexOf(l.role),lamp=roles[roleIndex>=0?roleIndex:Math.min(i,roles.length-1)];if(!lamp)return;
  Object.assign(lamp,place(l,i));written.add(lamp);l.scene_light_id=lamp.id;l.position_world_assumed=lamp.pos;l.target_world=lamp.target;});
 roles.forEach((lamp)=>{if(!written.has(lamp)){if(lamp.enabled)stopped.push(lamp.name);lamp.enabled=false;}});
 return stopped;
}
