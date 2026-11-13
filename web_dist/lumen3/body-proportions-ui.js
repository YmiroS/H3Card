import {PROPORTION_FIELDS,DEFAULT_PROPORTIONS} from './body-proportions.js?v=45';
// 上游把这块挂在运动工作台的分类页里；本页左栏是扁平的，所以跟着「尺度与假设」一起排。
export function setupBodyProportionsUI({mediaAPI,motionAPI,state}){
 const $=id=>document.getElementById(id),host=$('body-scale')?.closest('details');if(!host)return;
 const auto=document.createElement('label');auto.className='check';auto.innerHTML='<input id="auto-body-proportions" type="checkbox" checked>识别时自动匹配头身与肢体比例';$('auto').before(auto);
 const panel=document.createElement('details');panel.className='body-proportions-panel';panel.innerHTML='<summary>头身与肢体比例</summary><p id="body-proportions-status" class="hint" role="status">识别后估计比例；遮挡和透视较强时请人工核对。</p><div id="body-proportion-fields"></div><div class="rowbuttons"><button id="body-proportions-refit">重新估计比例</button><button id="body-proportions-reset">恢复原始比例</button></div><p class="hint">数值为相对原始白模的倍率。头部大小根据面部关键点估计，不能精确识别头顶与下巴；不改变导入 FBX 的体型。</p>';
 host.after(panel);const fields=$('body-proportion-fields');
 for(const[key,name]of PROPORTION_FIELDS){const row=document.createElement('label');row.className='control';const caption=document.createElement('span');caption.textContent=name;const input=document.createElement('input');input.id='proportion-'+key;input.type='number';input.min=key==='head'?'0.55':'0.65';input.max=key==='head'?'1.65':'1.5';input.step='.02';input.value=1;let timer;const commit=()=>{const value=Number(input.value);if(!Number.isFinite(value))return;const profile={...(mediaAPI.bodyProportions?.().body_proportions||DEFAULT_PROPORTIONS),[key]:value};try{mediaAPI.setBodyProportions(profile);}catch(e){motionAPI.toast(e.message);}};input.onchange=commit;input.oninput=()=>{clearTimeout(timer);timer=setTimeout(commit,180);};row.append(caption,input);fields.append(row);}
 function sync(){const unavailable=motionAPI.imported()||!!window.lumenAsset?.active();panel.hidden=unavailable;auto.hidden=unavailable;if(unavailable)return;const snapshot=mediaAPI.bodyProportions?.()||{},profile=snapshot.body_proportions||DEFAULT_PROPORTIONS,info=snapshot.proportion_estimate;for(const[key]of PROPORTION_FIELDS){const input=$('proportion-'+key);if(document.activeElement!==input)input.value=profile[key]??1;}
  const ratio=(1.908+.503*(profile.torso-1)+.405*(profile.thigh-1)+.42*(profile.shin-1)+.25*(profile.head-1))/(.25*profile.head);
  $('body-proportions-status').textContent=info?.available?'估计约 '+info.head_body_ratio+' 头身 · 已匹配 '+info.estimated_fields.length+' 项比例。'+(info.head_reason||''):info?.method==='manual_proportions'?'当前约 '+ratio.toFixed(1)+' 头身 · 人工调整':info?.reason||'当前原始比例；识别后将自动估计。';
  $('body-proportions-refit').hidden=!window.lumenPeople?.active()?.rawEstimate;}
 $('body-proportions-refit').onclick=()=>{try{mediaAPI.estimateProportions();sync();}catch(e){motionAPI.toast(e.message);}};
 $('body-proportions-reset').onclick=()=>{try{mediaAPI.setBodyProportions(DEFAULT_PROPORTIONS);sync();}catch(e){motionAPI.toast(e.message);}};
 for(const event of ['lumen-body-proportions','lumen-people-change','lumen-asset-visibility','lumen-history-restore','lumen-photo-loaded'])document.addEventListener(event,()=>queueMicrotask(sync));
 document.addEventListener('lumen-edit-committed',()=>queueMicrotask(sync));
 sync();
}
