'use strict';
const $ = id => document.getElementById(id);
const SOURCE = {historical:'历史运行参考',captured:'采集业务样本',standard:'标准样本（人工标签）'};
const STATUS = {idle:'在线空闲',online:'在线',busy:'运行中',running:'运行中',offline:'离线',disabled:'已禁用',syncing:'同步中',unavailable:'执行环境不可用',historical:'历史执行端',error:'异常',done:'已完成',canceled:'已取消',queued:'排队中',assigned:'已分配'};
const UNIT = {task:'任务',tasks:'任务',image:'张图片',images:'张图片',video:'条视频',videos:'条视频',second:'视频秒',seconds:'视频秒',video_seconds:'视频秒'};
const PURCHASE_DEFAULTS = {mode:'historical',quality:'technical',availability:1,utilization:.75};
const PURCHASE_MODES = [
  {id:'zimage_t2i',type:'生图模式',label:'文生图',capabilities:['zimage_t2i','krea2_t2i','qwen_image_2512_t2i','qwen_image_21_t2i']},
  {id:'zimage_i2i',type:'生图模式',label:'图生图',capabilities:['zimage_i2i','krea2_i2i','qwen_image_edit_2511_i2i','qwen_image_21_multi','qwen_image_21_i2i']},
  {id:'flux2_klein_storyboard9',type:'生图模式',label:'多宫格故事分镜',capabilities:['flux2_klein_storyboard9']},
  {id:'flux2_klein_edit',type:'生图模式',label:'参考图编辑(保人物)',capabilities:['flux2_klein_edit']},
  {id:'minimax_h3_character_transfer',type:'生视频模式',label:'H3人物迁移',capabilities:['minimax_h3_character_transfer']},
  {id:'minimax_h3_flf2v',type:'生视频模式',label:'H3 图生视频',capabilities:['minimax_h3_i2v','minimax_h3_flf2v']},
  {id:'minimax_h3_talk2',type:'生视频模式',label:'H3 说话唱歌',capabilities:['minimax_h3_talk1','minimax_h3_talk2']},
  {id:'minimax_h3_ref4',type:'生视频模式',label:'H3图片参考',capabilities:['minimax_h3_ref4']},
  {id:'minimax_h3_comic20',type:'生视频模式',label:'漫剧4宫格',capabilities:['minimax_h3_comic20']},
  {id:'minimax_h3_fusion_v2',type:'生视频模式',label:'H3无损融合单采V2',capabilities:['minimax_h3_fusion_v2']},
  {id:'minimax_h3_ref9',type:'生视频模式',label:'H3全能参考',capabilities:['minimax_h3_ref9']},
  {id:'minimax_h3_ref_2pass',type:'生视频模式',label:'H3全能参考(高质量)',capabilities:['minimax_h3_ref_2pass']}
];
let data = null, applied = null, offset = 0, loadVersion = 0, estimateVersion = 0, revision = 0, ready = false, lastEstimate = null;
const workers = new Map();
const capabilityTitle = g => typeof g?.capability_name==='string' && g.capability_name.trim() ? g.capability_name : text(g?.capability);
const capabilityLabel = g => capabilityTitle(g)===g?.capability ? capabilityTitle(g) : `${capabilityTitle(g)}（${text(g?.capability)}）`;
const numeric = v => typeof v === 'number' && Number.isFinite(v);
const text = v => v == null || v === '' ? '未知' : typeof v === 'object' ? JSON.stringify(v) : String(v);
const num = v => numeric(v) ? v.toLocaleString('zh-CN',{maximumFractionDigits:2}) : '未知';
const sec = v => numeric(v) ? `${num(v)} 秒` : '未知';
const when = v => numeric(v) ? new Date(v*1000).toLocaleString('zh-CN',{hour12:false}) : '未知';
const bytes = v => numeric(v) ? `${num(v/1024**3)} GiB` : '未知';
const source = v => SOURCE[v] || `来源未知（${text(v)}）`;
const dayCount = g => Array.isArray(g.days) ? g.days.length : g.days;
const configSource = v => ({reported:'机器上报',manual:'人工声明','manual+reported':'机器上报 + 人工声明',unknown:'未知'}[v] || '未知');
function hardwareDescription(value,kind) {
  if(!value || typeof value!=='object')return text(value);
  // 兼容旧 Worker 的对象上报，也兼容后端转换后的可读字符串。
  const parts=kind==='cpu'?[value.model,value.architecture,numeric(value.logical_cores)?`${num(value.logical_cores)} 逻辑核`:null]:[value.name,value.release,value.version];
  return parts.filter(v=>v!=null && v!=='').map(text).join(' / ') || '未知';
}
function hardwareSummary(h) {
  if(!h)return '未知';
  const gpu=Array.isArray(h.gpus) && h.gpus.length?h.gpus.map(g=>`${text(g.name)} / 单卡 ${bytes(g.memory_total_bytes)}`).join('；'):'未知';
  return `GPU ${gpu}；CPU ${hardwareDescription(h.cpu,'cpu')}；内存 ${bytes(h.memory_total_bytes)}；系统 ${hardwareDescription(h.os,'os')}；环境 ${text(h.environment_id)}；模型版本 ${text(h.model_version)}；磁盘 ${text(h.disk)}；主机 ID ${text(h.host_id)}`;
}
const unit = g => g.source === 'historical' ? '任务' : UNIT[g.unit] || text(g.unit);
const estimateUnit = () => '任务';
function el(tag, value, cls) { const node=document.createElement(tag); if(value != null) node.textContent=value; if(cls) node.className=cls; return node; }
function message(id, value) { $(id).textContent=value; $(id).hidden=!value; if (value && ['error','estimate-error'].includes(id)) H3Notify.error(value); }
function list(values, cls='warn') { const root=el('ul',null,cls); for(const value of values || []) root.append(el('li',text(value))); return root; }
function groupWarnings(g) {
  const result=[...(g.warnings || [])];
  if(!numeric(g.samples) || g.samples<30 || !numeric(dayCount(g)) || dayCount(g)<3) result.push('参考样本不足：建议至少 30 个任务且跨 3 天；达到门槛也不是置信保证。');
  if(g.source==='historical') result.push('仅成功任务 runtime 参考，未计完整占机、重试及质量损耗；不是合格日产能。');
  if(g.eligible!==true) result.push('完整基线证据不足，不作为已验证采购依据。');
  return [...new Set(result)];
}
function workerName(id, name) { return `${name || workers.get(id)?.name || '未关联执行端'}（${id || 'Worker ID 未知'}）`; }
function option(select, value, label) { const node=el('option',label); node.value=value; select.append(node); }
function choose(select, items, placeholder, selected=select.value) {
  select.replaceChildren(); if(placeholder!==null) option(select,'',placeholder);
  for(const [value,label] of items) option(select,value,label);
  if([...select.options].some(o=>o.value===selected)) select.value=selected;
}
// 每份数据快照只挂载已访问区域；刷新清空旧节点，保留筛选选择供下次展开恢复。
const mountedRegions=new Set();
let scenarioSelection='', estimateWorkerSelection='';
const evidenceSelection={'evidence-group':'','evidence-status':'','evidence-source':'','evidence-size':'100'};
function mountRegion(key,render) {
  if(!ready || !data || mountedRegions.has(key))return false;
  render();mountedRegions.add(key);return true;
}
function invalidateRegions() {
  if(mountedRegions.has('scenarios'))scenarioSelection=$('scenario-filter').value;
  if(mountedRegions.has('purchase'))estimateWorkerSelection=$('estimate-worker').value;
  if(mountedRegions.has('evidence'))for(const id of Object.keys(evidenceSelection))evidenceSelection[id]=$(id).value;
  mountedRegions.clear();
  for(const id of ['summary-machines','task-metrics','output-metrics','coverage','workers','machine-groups','scenario-filter','scenario-groups','evidence-filters','details','detail-count','page-note','estimate-worker','demands'])$(id).replaceChildren();
}
function mountEvidence() {
  return mountRegion('evidence',()=>{
    $('evidence-filters').append($('evidence-filter-template').content.cloneNode(true));
    setupEvidence();
    for(const id of Object.keys(evidenceSelection)) {
      if([...$(id).options].some(option=>option.value===evidenceSelection[id]))$(id).value=evidenceSelection[id];
      $(id).onchange=()=>{if(!ready)return;evidenceOffset=0;filterEvidence();};
    }
  });
}
async function renderActiveRegions() {
  if(!ready || !data)return;
  if(!$('panel-machines').hidden) {
    mountRegion('machines',renderMachineSummary);
    if($('technical-details').open)mountRegion('technical',()=>{renderTechnicalOverview();renderWorkers();renderGroups('machine-groups',data.groups || []);});
  }
  if(!$('panel-scenarios').hidden)mountRegion('scenarios',renderScenarios);
  if(!$('panel-purchase').hidden)mountRegion('purchase',setupEstimate);
  if($('task-evidence').open && mountEvidence()) {
    if(filteredEvidence())await filterEvidence();else renderDetails();
  }
}
function mountOnOpen(details,render) {
  let mounted=false;
  details.addEventListener('toggle',()=>{
    if(details.open && !mounted){render();mounted=true;}
  });
}
function rawEvidence(title,value,cls) {
  const details=el('details',null,cls);details.append(el('summary',title));
  mountOnOpen(details,()=>details.append(el('pre',text(value))));return details;
}
function metrics(id, items) { $(id).replaceChildren(...items.map(([label,value])=>{const node=el('div',null,'metric');node.append(el('span',label),el('strong',num(value)));return node;})); }
function renderOverview() {
  const o=data.overview || {};
  metrics('capacity-stats',[['当前在线电脑',(data.workers || []).filter(isOnline).length],['真实任务记录',o.tasks],['独立原规格组',(data.groups || []).length],['产物清单未知任务',o.unknown_outputs]]);
}
function renderTechnicalOverview() {
  const o=data.overview || {};
  metrics('task-metrics',[['总任务',o.tasks],['完成',o.done],['失败',o.error],['取消',o.canceled]]);
  metrics('output-metrics',[['图片（张）',o.output_images],['视频（条）',o.output_videos],['视频总时长（秒）',o.output_seconds],['产物未知记录',o.unknown_outputs]]);
  $('coverage').textContent=`历史 ${num(o.historical_tasks)} / 新采集 ${num(o.captured_tasks)}；Worker 未关联 ${num(o.unknown_worker)}；已排除 API ${num(o.excluded_api)}。`;
}
async function mutationSaved(version,label) {
  if(version===loadVersion) await load(false);
  else {
    // 写入期间刷新或分页时，新页面也可能已读到旧数据；丢弃在途旧响应。
    loadVersion++;clearData();invalidateEstimate('证据已更新，请点击立即刷新后重新计算。');
    $('refresh-state').textContent=`${label}已更新，请点击立即刷新`;
  }
  message('write-status',`${label}已保存。人工声明不回写历史快照，也不代表自动验证通过。`);
}
function capacityDialog(title,body,submitLabel,onSubmit) {
  const dialog=AdminUI.dialog({title,body,submitLabel,onSubmit});
  dialog.classList.add('capacity-page');
  return dialog;
}
function profileForm(w) {
  const details=el('details',null,'profile-details'), button=el('button','查看 / 补录配置');button.type='button';
  details.append(el('summary','补录机器配置（人工声明）'),el('p','7 个字段仅保存非空新声明，不回写历史快照。','hint'),button);
  button.onclick=()=>openProfile(w);
  return details;
}
function openProfile(w) {
  const body=el('div',null,'capacity-operation'), fields=el('div',null,'profile-form'), h=w.hardware || {}, inputs=new Map();
  const current=el('details');current.append(el('summary','当前 / 最后上报配置'),el('p',hardwareSummary(h)),el('p',`配置来源：${configSource(w.hardware_source)}；配置备注：${text(h.note)}`));
  body.append(current,el('p','仅保存本次修改的非空字段；留空保留原值。内存以 GiB 输入、按字节保存，不是采购标称容量。新声明仅向后生效，不回写历史快照。','notice'),el('p','主机 ID 仅在人工确认属于同一物理机器时填写相同值，不按机器名称合并；同机多个 Worker 不自动代表多倍产能。','hint'),fields);
  const definitions=[['host_id','主机 ID',160],['cpu','CPU 型号',160],['memory_total_bytes','系统可见内存（GiB）'],['environment_id','执行环境版本',160],['model_version','模型版本',160],['disk','磁盘配置说明',160],['note','配置备注',500]];
  for(const [key,label,maxLength] of definitions) {
    const field=el('label',null,'field'), input=el('input');input.name=key;
    if(key==='memory_total_bytes'){input.type='number';input.min='0.000001';input.step='any';}
    else {input.type='text';input.maxLength=maxLength;}
    input.placeholder=['model_version','environment_id'].includes(key)?'填写固定版本，勿用 latest / main / unknown':'留空保留现值';
    inputs.set(key,input);field.append(el('span',label),input);fields.append(field);
  }
  body.addEventListener('input',()=>invalidateEstimate('机器配置输入已更改；请保存后重新计算，未保存内容不会进入测算。'));
  capacityDialog(`机器配置与人工补录 · ${w.name || w.id}`,body,'保存人工配置',async()=>{
    const payload={};
    for(const [key,input] of inputs) {
      const value=input.value.trim();if(!value)continue;
      if(/[\u0000-\u001f\u007f]/.test(value)){input.focus();throw Error('配置字段请使用不含控制字符的单行文本。');}
      if(key==='memory_total_bytes') {
        const converted=Math.round(Number(value)*1024**3);
        if(!Number.isSafeInteger(converted) || converted<=0){input.focus();throw Error('内存必须是能转换为安全正整数字节的 GiB 数值。');}
        if(converted!==h[key])payload[key]=converted;
      } else if(value!==(key==='cpu'?hardwareDescription(h.cpu,'cpu'):h[key]))payload[key]=value;
    }
    if(!Object.keys(payload).length)throw Error('没有需要保存的修改；留空不会删除已有配置。');
    const version=loadVersion;message('write-status','');invalidateEstimate('机器配置正在保存，旧测算已清除。');
    try {
      await H3Auth.json(`/api/capacity/workers/${encodeURIComponent(w.id)}`,'POST',payload);
      await mutationSaved(version,'机器配置');
    } catch(error) {throw Error(`保存失败：${error.message}。输入已保留，请检查字段后重试。`);}
  });
}
const isOnline = w => ['idle','busy','online','running'].includes(w.state);
const hasMean = g => numeric(g.mean_seconds) && g.mean_seconds>=0 && numeric(g.measured) && g.measured>0;
function friendlyTime(value) {
  if(!numeric(value) || value<0)return '暂无成功耗时';
  if(value<1)return `${num(value)} 秒`;
  const seconds=Math.round(value), minutes=Math.floor(seconds/60), rest=seconds%60;
  return minutes?`${num(minutes)} 分 ${rest} 秒`:`${rest} 秒`;
}
function inputMaterials(g) {
  const d={...g.spec?.dimensions,...g.dimensions};
  const counts=[['图片',d.image_count,'张'],['视频',d.video_count,'段'],['音频',d.audio_count,'段']];
  const known=value=>Number.isSafeInteger(value) && value>=0;
  if(counts.every(([,value])=>!known(value)))return ['素材信息未记录'];
  if(counts.every(([,value])=>value===0))return ['未使用图片、视频或音频'];
  return counts.flatMap(([label,value,unit])=>!known(value)?[`${label}数量未记录`]:value>0?[`${label} ${num(value)} ${unit}`]:[]);
}
function resolutionLabel(d,expected) {
  const valid=value=>Number.isSafeInteger(value) && value>0;
  const setting=typeof d.resolution==='string'?d.resolution.match(/^(\d+)\s*[x×]\s*(\d+)(?:\s*\(\d+:\d+\))?$/i):null;
  const candidates=[[d.output_width,d.output_height],[d.width,d.height],setting?[Number(setting[1]),Number(setting[2])]:[],[expected.width,expected.height,'期望 ']];
  const size=candidates.find(([width,height])=>valid(width) && valid(height));
  if(size) {
    const [width,height,prefix='']=size;
    // 只标注精确匹配的常见尺寸，不按像素总量、短边或相近尺寸猜档位。
    const levels={'640x360':'360p','640x480':'480p','854x480':'480p','1280x720':'720p','1920x1080':'1080p','2560x1440':'1440p','3840x2160':'4K'};
    const level=levels[`${Math.max(width,height)}x${Math.min(width,height)}`];
    return level?`${prefix}${level}${width<height?' 竖屏':''}（${num(width)} × ${num(height)}）`:`${prefix || '尺寸 '}${num(width)} × ${num(height)}`;
  }
  if(numeric(d.megapixels) && d.megapixels>0 && numeric(d.megapixels*100))return `约 ${num(d.megapixels*100)} 万像素（尺寸未记录）`;
  return null;
}
function generationParameters(g,detailed=false) {
  const d={...g.spec?.parameters,...g.spec?.dimensions,...g.dimensions}, expected=g.spec?.expected || {}, parts=[];
  const duration=d.output_duration ?? d.duration ?? expected.duration;
  if(numeric(duration))parts.push(`请求时长 ${num(duration)} 秒`);
  const resolution=resolutionLabel(d,expected);
  if(resolution)parts.push(resolution);
  if(detailed) {
    if(numeric(d.megapixels) && d.megapixels>0)parts.push(`像素设置 ${num(d.megapixels)} MP`);
    const values=[['帧率',d.output_fps ?? d.target_fps ?? d.fps ?? d.force_rate ?? expected.fps,' FPS'],['步数',d.steps,' 步'],['帧数',d.frames,' 帧'],['长边',d.scale_to_length,' px'],['批量',d.batch_size,'']];
    for(const [label,value,suffix] of values)if(numeric(value))parts.push(`${label} ${num(value)}${suffix}`);
  }
  return parts.join(' / ') || '规格未完整记录';
}
function outputVariants(resolution) {
  return (Array.isArray(resolution?.variants)?resolution.variants:[]).filter(v=>v && ['image','video'].includes(v.kind) && Number.isSafeInteger(v.width) && v.width>0 && Number.isSafeInteger(v.height) && v.height>0);
}
function outputVariantLabel(v) {
  // 实际成品只读取服务端产物证据，绝不混入请求、MP 或期望尺寸。
  return `${v.kind==='image'?'图片':'视频'} · ${resolutionLabel({width:v.width,height:v.height},{})}`;
}
function renderActualResolution(node,resolution) {
  const variants=outputVariants(resolution);node.replaceChildren();
  if(!variants.length)node.append(el('span','尺寸未记录'));
  else {
    if(new Set(variants.map(v=>`${v.width}x${v.height}`)).size>1)node.append(el('span','多种成品规格（非单一尺寸）','hint'));
    for(const variant of variants)node.append(el('span',outputVariantLabel(variant),'resolution-variant'));
  }
  if(numeric(resolution?.total_samples) && resolution.total_samples>0 && resolution.complete_samples!==resolution.total_samples)node.append(el('span',`已知 ${num(resolution.recorded_samples)} / ${num(resolution.total_samples)} 次任务的部分或全部成品`,'resolution-coverage hint'));
}
function appendOutputResolutionDetails(node,resolution) {
  const section=el('div',null,'output-resolution-details'), sizes=el('div',null,'actual-resolution');
  section.append(el('h3','实际成品'));renderActualResolution(sizes,resolution);section.append(sizes);
  section.append(el('p',`尺寸覆盖：${num(resolution?.recorded_samples)} / ${num(resolution?.total_samples)} 次已完成任务至少有一个成品尺寸；${num(resolution?.complete_samples)} / ${num(resolution?.total_samples)} 次已完成任务的全部最终产物都有尺寸。`));
  section.append(el('p',`已知尺寸产物 ${num(resolution?.recorded_outputs)} / ${num(resolution?.total_outputs)} 个${resolution?.total_outputs==null?'（最终清单不完整，产物总数未知）':''}。`));
  for(const variant of outputVariants(resolution))section.append(el('p',`${outputVariantLabel(variant)}：${num(variant.outputs)} 个产物 / ${num(variant.samples)} 次任务`));
  section.append(el('p','同一任务可能包含多种尺寸，各尺寸的任务数不能相加。尺寸来自最终产物记录或受控补采，与技术合格产量、人工验收和采购资格分离；有尺寸不代表技术合格。平均耗时仍为原组成功任务平均，不按尺寸重算。','hint'));
  node.append(section);
}
function simpleSpec(g) {
  return `${inputMaterials(g).join(' + ')}｜${generationParameters(g)}`;
}
function preferredGroup(groups) {
  // 只选择原分组，不重算或合并不同配置、规格、来源和缓存的均值。
  const rank=g=>hasMean(g)?g.source!=='historical' && numeric(g.last_sample_at)?3:g.source==='historical'?2:1:0;
  return [...groups].sort((a,b)=>rank(b)-rank(a) || (rank(a)===3?b.last_sample_at-a.last_sample_at:0) || (b.samples || 0)-(a.samples || 0) || (b.measured || 0)-(a.measured || 0))[0];
}
function knownHardware(w) {
  const h=w.hardware || {}, parts=[];
  for(const gpu of h.gpus || []) {
    const values=[gpu.name,numeric(gpu.memory_total_bytes)?bytes(gpu.memory_total_bytes):null].filter(Boolean);
    if(values.length)parts.push(values.join(' / '));
  }
  if(numeric(h.memory_total_bytes))parts.push(`系统内存 ${bytes(h.memory_total_bytes)}`);
  return parts.join('；') || '尚未采集硬件信息';
}
function missingHardware(w) {
  const h=w.hardware || {};
  if(!h.cpu || !h.host_id) {
    if((numeric(w.agent_version) && w.agent_version<4) || w.supports_capacity_telemetry===false)return '旧版采集程序缺少 CPU 等信息，请升级该 Worker 后补采；已有 GPU 与内存记录仍可查看。';
    return 'CPU 或主机信息尚未采集，请检查该 Worker 的采集上报。';
  }
  if(!h.environment_id || !h.model_version)return '环境或模型版本的人工声明未填写，可在“详细统计与机器配置”中补录。';
  return '当前配置不代表历史任务的执行配置；历史依据见各业务详情。';
}
function modelEvidence(g) {
  // 新合同即使为空也具有优先级，不能用旧汇总冒充已恢复的历史记录。
  const hasEvidence=Object.hasOwn(g,'model_evidence'), evidence=g.model_evidence;
  const variants=hasEvidence?(Array.isArray(evidence?.variants)?evidence.variants:[]).filter(v=>['task_snapshot','archived_task'].includes(v.source) && v.summary):
    g.model_summary?.source==='task_snapshot'?[{source:'task_snapshot',summary:g.model_summary}]:[];
  return {variants,hasEvidence,total:evidence?.total_samples,recorded:evidence?.recorded_samples,reference:g.current_model_reference?.source==='current_template'?g.current_model_reference:null};
}
const mainModels = summary => Array.isArray(summary?.models)?summary.models:[];
function modelRole(model,index,count) {
  const roles={high_noise:'高噪声',low_noise:'低噪声','高噪声':'高噪声','低噪声':'低噪声',base:'基础模型',refiner:'精修模型','生成主模型':'生成主模型','深度模型':'深度模型','放大模型':'放大模型','插帧模型':'插帧模型'};
  const role=Object.hasOwn(roles,model.role)?roles[model.role]:null;
  return role?`${role} · 主模型 ${index+1}`:count>1?`主模型 ${index+1}`:'';
}
function modelPrecision(model) {
  const parts=[];
  if(model.precision && model.precision_source==='filename')parts.push(`文件标记 ${text(model.precision)}`);
  if(model.loader_dtype) {
    const dtype=text(model.loader_dtype), tokens=dtype.split(/\s*\/\s*/).map(value=>value.match(/^(bfloat16|bf16|float(?:8|16|32|64)|fp(?:8|16|32|64))(?:_e4m3fn|_e5m2)?(?:_fast)?$/i)?.[1]);
    const normalized=tokens.every(Boolean)?[...new Set(tokens.map(value=>value.toUpperCase().replace('BFLOAT16','BF16').replace('FLOAT','FP')))].join(' / '):null;
    parts.push(`加载配置 ${normalized?`${normalized}（${dtype}）`:dtype}${['default','auto'].includes(dtype.toLowerCase())?'（实际精度未确认）':''}`);
  } else if(model.precision && model.precision_source==='loader')parts.push(`加载配置 ${text(model.precision)}`);
  if(!parts.length)parts.push('精度未记录 / 待确认');
  return parts;
}
function compactModelPrecision(model) {
  const normalize=value=>{
    if(typeof value!=='string')return null;
    const tokens=value.split(/\s*\/\s*/).map(part=>part.trim().match(/^(bfloat16|float(?:8|16|32|64)|bf16|fp(?:4|8|16|32|64)|int(?:4|8|16)|nf4|q[2-8]_(?:k(?:_[sml])?|[01]))(?:_e4m3fn|_e5m2)?(?:_fast)?$/i)?.[1]);
    return tokens.every(Boolean)?[...new Set(tokens.map(token=>token.toUpperCase().replace('BFLOAT16','BF16').replace('FLOAT','FP')))].sort().join(' / '):null;
  };
  const file=model.precision_source==='filename'?normalize(model.precision):null;
  const loader=normalize(model.loader_dtype) || (model.precision_source==='loader'?normalize(model.precision):null);
  // 简览仅展示可识别声明；文件与加载配置即使相同也分别保留，未知原文只在证据详情呈现。
  const parts=modelPrecision(model).filter(part=>part.startsWith('文件标记 ')?Boolean(file):part.startsWith('加载配置 ')?Boolean(loader) || ['default','auto'].includes(String(model.loader_dtype).toLowerCase()):false);
  if(!parts.some(part=>part.startsWith('文件标记 ')))parts.unshift('文件标记未记录 / 待确认');
  if(!parts.some(part=>part.startsWith('加载配置 ')))parts.push('加载配置未记录 / 待确认');
  return parts;
}
function modelColumns(summary) {
  const names=el('div',null,'model-variant'), precision=el('div',null,'model-variant'), models=mainModels(summary);
  models.forEach(model=>{
    const name=el('div',null,'model-item'), dtype=el('div',null,'model-item');
    name.append(el('p',model.name || '未获取到模型信息','model-name'));
    // 文件声明与加载配置始终分开显示，不合并为运行时精度结论。
    for(const part of compactModelPrecision(model))dtype.append(el('p',part,'model-label'));
    names.append(name);precision.append(dtype);
  });
  if(!models.length) {names.append(el('p','未获取到模型信息','muted'));precision.append(el('p','无','muted'));}
  return [names,precision];
}
function renderModelCells(g,nameCell,precisionCell,timeCell) {
  const evidence=modelEvidence(g), {variants,reference}=evidence;
  const rows=variants.length?variants.reduce((count,variant)=>count+Math.max(1,mainModels(variant.summary).length),0):Math.max(1,mainModels(reference).length);
  nameCell.parentElement.style.setProperty('--model-rows',rows+1);
  nameCell.replaceChildren();precisionCell.replaceChildren();
  if(variants.length) {
    variants.forEach(variant=>{
      const [names,precision]=modelColumns(variant.summary);nameCell.append(names);precisionCell.append(precision);
    });
    if(variants.length>1 || evidence.hasEvidence && evidence.recorded<evidence.total || variants.some(v=>v.summary.complete===false))timeCell.append(el('p','全组历史任务平均，非某个模型或组合专属速度。','warn hint'));
  } else if(reference) {
    const [names,precision]=modelColumns(reference);
    nameCell.append(names);precisionCell.append(precision);
    timeCell.append(el('p','此处耗时来自历史任务，不代表当前模型速度。','warn hint'));
  } else {
    nameCell.append(el('span','未获取到模型信息','muted'));
    precisionCell.append(el('p','无','muted'));
  }
}
function appendModelDetails(node,summary,origin) {
  const section=el('div',null,'model-reference');section.append(el('p',origin,'model-origin'));
  if(summary.complete===false)section.append(el('p','不完整 / 未确认完整主模型链；动态选择或未知链路不能推断全部主模型。','warn'));
  const models=mainModels(summary);
  if(!models.length)section.append(el('p','未获取到模型信息，模型待确认。'));
  models.forEach((model,index)=>section.append(el('p',`${modelRole(model,index,models.length) || '主模型'}：${text(model.name)}；角色：${text(model.role)}；${modelPrecision(model).join('；')}；非运行时检测`)));
  const auxiliary=Array.isArray(summary.auxiliary_models)?summary.auxiliary_models:[];
  if(auxiliary.length) {
    section.append(el('p','辅助模型（不计入主模型名称或精度）','hint'));
    for(const model of auxiliary)section.append(el('p',`角色：${text(model.role)}；${text(model.name)}；${modelPrecision(model).join('；')}`,'hint'));
  }
  node.append(section);
}
function summaryEvidence(g) {
  const node=el('div',null,'pad');
  node.append(el('p',`输入素材：${inputMaterials(g).join(' / ')}`),el('p',`生成参数：${generationParameters(g,true)}`));
  const d={...g.spec?.dimensions,...g.dimensions};
  if(numeric(d.source_duration))node.append(el('p',`首个输入视频时长：${num(d.source_duration)} 秒（非多段视频合计）`,'hint'));
  node.append(el('p','素材数量按任务输入槽位计，同一文件被多次引用也会分别计数；生成参数不是成品实测规格。','hint'));
  node.append(el('p',`来源：${source(g.source)}；有效耗时样本 ${num(g.measured)} / 总样本 ${num(g.samples)}；成功 ${num(g.done)} / 失败 ${num(g.error)} / 取消 ${num(g.canceled)}`),el('p',`mean：${sec(g.mean_seconds)}；P50：${sec(g.p50_seconds)}；P90：${sec(g.p90_seconds)}；最近成功样本：${when(g.last_sample_at)}`),el('p','平均值仅使用该组成功任务执行耗时；不包含排队，不等于纯 GPU 计算时间，也不是合格日产能。','hint'));
  node.append(el('p',`执行时配置：${hardwareSummary(g.config)}（${configSource(g.config_source)}）`),el('p',`缓存条件：${text(g.cache_condition)}`));
  node.append(el('p',`成功 runtime 合计：${sec(g.runtime_seconds)}；占机合计：${sec(g.occupied_seconds)}；实际产出：${num(g.output_count)} ${unit(g)}。`),el('p',`单位技术交付：${sec(g.seconds_per_unit)} / ${unit(g)}；单位人工合格：${sec(g.qualified_seconds_per_unit)} / ${unit(g)}；已人工验收：${num(g.reviewed)}；全组人工合格数量：${num(g.accepted)}。`),el('p',`技术基线资格：${g.eligible===true?'服务端判定具备完整基线证据':g.eligible===false?'证据不足，不作为已验证采购依据':'未记录'}；标准场景编号：${text(g.benchmark_id)}。`,'hint'));
  appendOutputResolutionDetails(node,g.output_resolution);
  const evidence=modelEvidence(g);
  if(evidence.hasEvidence)node.append(el('p',`模型记录覆盖 ${num(evidence.recorded)} / ${num(evidence.total)} 次；覆盖数不是完整主模型链的确认。`));
  if(evidence.variants.length>1)node.append(el('p','不同任务记录对应不同模型组合；每个组合内的主模型才属于同一个图。全组平均耗时不代表任一组合的专属速度。','warn'));
  if(!evidence.variants.length)node.append(el('p','历史未记录可用主模型证据；不能用当前模板补写历史模型与精度。'));
  evidence.variants.forEach((variant,index)=>appendModelDetails(node,variant.summary,`历史任务记录组合 ${index+1} · ${variant.source==='archived_task'?'保留的原任务记录':'任务提交记录'}${evidence.hasEvidence?` · ${num(variant.samples)} 次记录 / ${num(variant.measured)} 次成功耗时`:''}`));
  if(evidence.reference) {
    appendModelDetails(node,evidence.reference,`当前工具默认配置（非历史执行记录）· ${text(evidence.reference.capability_name)}`);
    node.append(el('p','仅为工具模板默认值，不代表用户画布节点当前选中的模型。历史耗时不代表当前模型速度；参考信息不补齐历史覆盖，也不覆盖历史精度。','warn hint'));
  } else if(!evidence.variants.length)node.append(el('p','未获取到模型信息：当前工具模板未提供、找不到或无法识别。','hint'));
  node.append(list(groupWarnings(g)),el('p',`采样日期：${text(g.days)}；配置编号：${text(g.config_id)}；采样编号：${text(g.id)}`,'hint'));
  node.append(rawEvidence('原始规格与证据',{dimensions:g.dimensions,spec:g.spec,output_resolution:g.output_resolution,recovered_outputs:g.recovered_outputs,model_summary:g.model_summary,model_evidence:g.model_evidence,current_model_reference:g.current_model_reference,cache_condition:g.cache_condition}));
  return node;
}
function renderMachineSummary() {
  const root=$('summary-machines');root.replaceChildren();
  const all=data?.workers || [], online=all.filter(isOnline), visible=$('include-offline').checked?all:online;
  $('online-count').textContent=`当前在线 ${online.length} 台`;
  if(!visible.length) {
    root.append(el('p',$('include-offline').checked?'暂无机器记录。':'当前没有在线机器，可勾选“包含离线”查看已登记记录。','empty'));
    return;
  }
  const visibleIds=new Set(visible.map(w=>w.id)), capabilities=new Map();
  for(const g of data?.groups || [])if(visibleIds.has(g.worker_id)) {
    if(!capabilities.has(g.capability))capabilities.set(g.capability,{title:capabilityTitle(g),machines:new Map()});
    const machines=capabilities.get(g.capability).machines;
    if(!machines.has(g.worker_id))machines.set(g.worker_id,[]);
    machines.get(g.worker_id).push(g);
  }
  const wrap=el('div',null,'scroll comparison-scroll'), tableNode=el('table',null,'simple-table matrix-table'), columns=el('colgroup'), thead=el('thead'), header=el('tr'), body=el('tbody');
  wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','机器产能对比表，可横向滚动');
  tableNode.setAttribute('aria-label','机器与业务能力对比');tableNode.style.setProperty('--machine-count',visible.length);
  columns.append(el('col',null,'matrix-axis-col'));
  const corner=el('th','业务能力','business-axis');corner.scope='col';header.append(corner);
  visible.forEach((w,index)=>{
    columns.append(el('col'));
    const heading=el('th',null,'machine-heading');heading.scope='col';heading.id=`summary-machine-${index+1}`;heading.dataset.summaryWorkerId=w.id;
    heading.append(el('h3',w.name || '未命名机器'),el('span',STATUS[w.state] || '状态待确认',['busy','running'].includes(w.state)?'warn':isOnline(w)?'online-state':'muted'),el('p',knownHardware(w),'machine-hardware'));
    const details=el('details',null,'machine-more');details.append(el('summary','机器详情'),el('p',missingHardware(w)),el('p',`最后上报：${when(w.last_seen)}；Worker ID：${text(w.id)}；采集程序版本：${text(w.agent_version)}`,'hint'));
    if(!isOnline(w))details.append(el('p','此记录当前不可用，配置为最后上报信息，历史速度不代表现在能执行。','hint'));
    const configButton=el('button','查看配置');configButton.type='button';configButton.onclick=()=>w.state==='historical'?capacityDialog('历史执行端配置',el('p',hardwareSummary(w.hardware)),'关闭',async()=>{}):openProfile(w);details.append(configButton);
    heading.append(details);header.append(heading);
  });
  thead.append(header);tableNode.append(columns,thead,body);wrap.append(tableNode);root.append(wrap);
  // 空历史也保留所有机器列；空格不能被解读为不支持或零耗时。
  if(!capabilities.size)capabilities.set(null,{title:'历史记录',machines:new Map()});
  let rowNumber=0, detailNumber=0;
  for(const [capability,{title,machines}] of capabilities) {
    const row=el('tr',null,'capability-row'), business=el('th',null,'business-axis');
    if(capability!=null)row.dataset.capability=capability;
    business.scope='row';business.id=`summary-business-${++rowNumber}`;business.append(el('span',title,'business-title'));row.append(business);body.append(row);
    visible.forEach((w,index)=>{
      const result=el('td',null,'machine-result');result.dataset.summaryWorkerId=w.id;result.setAttribute('headers',`summary-machine-${index+1} ${business.id}`);row.append(result);
      const entries=machines.get(w.id);
      if(!entries) {result.append(el('p','暂无记录；不据此推断是否支持该业务。','matrix-empty'));return;}
      const content=el('div',null,'business-row');content.dataset.capability=capability;
      const field=label=>{const node=el('div',null,'matrix-field');node.dataset.label=label;return node;};
      const time=field('平均生成时间'), spec=field('任务规格'), namesCell=field('模型名称'), precisionCell=field('模型精度'), models=el('div',null,'matrix-models');
      models.append(namesCell,precisionCell);
      const select=el('select',null,'summary-spec');select.setAttribute('aria-label',`${w.name || '机器'} ${title}任务规格`);
      const names=entries.map(simpleSpec), nameCounts=new Map();
      for(const name of names)nameCounts.set(name,(nameCounts.get(name) || 0)+1);
      entries.forEach((g,i)=>option(select,g.id,`${names[i]}${nameCounts.get(names[i])>1?` · ${source(g.source)} · ${numeric(g.last_sample_at)?when(g.last_sample_at):'日期未记录'} · 采样 ${i+1}`:''}`));
      const selectedSpec=el('dl',null,'selected-spec'), materials=el('dd',null,'input-materials'), parameters=el('dd',null,'generation-parameters'), actual=el('dd',null,'actual-resolution');
      selectedSpec.append(el('dt','输入素材'),materials,el('dt','生成参数'),parameters,el('dt','实际成品'),actual);
      select.value=preferredGroup(entries).id;spec.append(select,selectedSpec);
      const evidence=el('div',null,'summary-evidence');evidence.hidden=true;evidence.id=`summary-evidence-${++detailNumber}`;
      const sample=el('div',null,'matrix-samples'), count=el('p'), button=el('button','查看详情','summary-detail-toggle');sample.dataset.label='样本与详情';
      button.type='button';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',evidence.id);sample.append(count,button);
      const mountSummaryEvidence=()=>{if(!evidence.childElementCount){taskButton.disabled=!ready;evidence.append(summaryEvidence(entries.find(g=>g.id===select.value)),taskButton);}};
      button.onclick=()=>{evidence.hidden=!evidence.hidden;if(!evidence.hidden)mountSummaryEvidence();button.setAttribute('aria-expanded',String(!evidence.hidden));button.textContent=evidence.hidden?'查看详情':'收起详情';};
      const taskButton=el('button','任务证据');taskButton.type='button';taskButton.dataset.evidenceEntry='';taskButton.disabled=!ready;taskButton.onclick=()=>showEvidence(select.value);
      const update=()=>{
        const g=entries.find(item=>item.id===select.value);content.dataset.selectedGroupId=g.id;
        materials.replaceChildren(...inputMaterials(g).map(value=>el('span',value)));
        parameters.textContent=generationParameters(g);
        renderActualResolution(actual,g.output_resolution);
        time.replaceChildren(el('span',hasMean(g)?friendlyTime(g.mean_seconds):'暂无成功耗时',hasMean(g)?'mean-time':'muted'));
        renderModelCells(g,namesCell,precisionCell,time);
        if(hasMean(g) && (g.mean_seconds<1 || g.mean_seconds>3600))time.append(el('p','耗时异常，请核对详情','warn hint'));
        count.textContent=numeric(g.measured)?g.measured<30?`仅 ${num(g.measured)} 次 / 仅供参考`:`${num(g.measured)} 次成功实测`:'样本数未记录';
        count.textContent+=` · ${source(g.source)}`;
        count.className=!numeric(g.measured) || g.measured<30?'warn hint':'hint';
        select.title=`原组 ${text(g.id)} / 配置 ${text(g.config_id)} / ${source(g.source)} / 规格键 ${text(g.spec_key)}`;
        evidence.replaceChildren();if(!evidence.hidden)mountSummaryEvidence();
      };
      select.onchange=update;update();content.append(time,sample,spec,models);result.append(content,evidence);
    });
  }
}
function renderWorkers() {
  $('workers').replaceChildren();
  for(const w of data.workers || []) {
    const h=w.hardware || {}, card=el('article',null,'worker'); card.dataset.workerId=w.id;
    const stale=['offline','disabled'].includes(w.state) || !numeric(w.last_seen) || Date.now()/1000-w.last_seen>120;
    card.append(el('h3',text(w.name)),el('p',`Worker ID：${text(w.id)}`,'hint'),el('span',STATUS[w.state] || text(w.state),'badge'),el('p',`最后心跳：${when(w.last_seen)}${stale?'；状态 / 配置快照已过期或无法确认，请勿视为实时。':''}`,stale?'warn':'hint'));
    const dl=el('dl');
    const gpu=Array.isArray(h.gpus) && h.gpus.length ? h.gpus.map((g,i)=>`GPU ${i+1}：${text(g.name)} / 单卡显存 ${bytes(g.memory_total_bytes)}`).join('\n') : '未知';
    for(const [key,value] of [['GPU',gpu],['GPU 数量',Array.isArray(h.gpus) && h.gpus.length?num(h.gpus.length):'未知'],['CPU',hardwareDescription(h.cpu,'cpu')],['内存',bytes(h.memory_total_bytes)],['系统',hardwareDescription(h.os,'os')],['环境',text(h.environment_id)],['模型版本',text(h.model_version)],['主机 ID',text(h.host_id)],['磁盘',text(h.disk)],['配置备注',text(h.note)]]) dl.append(el('dt',key),el('dd',value));
    card.append(dl,el('p',`配置来源：${configSource(w.hardware_source)}。人工补录不回写历史快照。`,'hint'),el('p',`任务 ${num(w.tasks)} / 完成 ${num(w.done)} / 失败 ${num(w.error)} / 取消 ${num(w.canceled)}`),el('p',`累计 runtime：${sec(w.runtime_seconds)}`,'hint'));
    if(w.id && w.state!=='historical')card.append(profileForm(w));
    else card.append(el('p','历史执行端未关联现存注册记录，不能补录配置。','hint'));
    $('workers').append(card);
  }
  if(!(data.workers || []).length) $('workers').append(el('p','暂无执行端信息；无法关联的历史任务不会按名称猜测机器。','empty'));
}
function table(headers, rows) {
  const wrap=el('div',null,'scroll'); wrap.tabIndex=0; wrap.setAttribute('role','region'); wrap.setAttribute('aria-label',headers.join(' / '));
  const node=el('table'), thead=el('thead'), tr=el('tr');
  headers.forEach(h=>{const th=el('th',h);th.scope='col';tr.append(th);}); thead.append(tr); node.append(thead);
  const body=el('tbody'); rows.forEach(row=>body.append(row)); node.append(body); wrap.append(node); return wrap;
}
function cell(row, value, cls) { const td=el('td',null,cls); td.append(value instanceof Node?value:el('span',text(value)));row.append(td);return td; }
function renderGroups(id, groups) {
  const root=$(id); root.replaceChildren();
  if(!groups.length) {root.append(el('p','暂无业务规格样本；未测试场景不能推算产能。','empty'));return;}
  const rows=groups.map(g=>{
    const row=el('tr'); row.dataset.groupId=g.id;
    const identity=el('div'); identity.append(el('strong',capabilityTitle(g)),el('p',`能力 ID：${text(g.capability)}`,'hint'),el('p',workerName(g.worker_id,g.worker_name),'hint'),el('span',source(g.source),'badge'),el('p',`配置：${text(g.config_id)}`,'hint'));
    if(g.source==='standard')identity.append(el('p',`标准场景编号：${text(g.benchmark_id)}`,'hint'));
    const specification=el('div'); specification.append(el('p',`规格键：${text(g.spec_key)}`),el('p',`已知规格：${text(g.dimensions)}`,'hint'));
    const evidence=el('details'), evidenceTitle=el('summary','配置 / 规格 / 日期证据');
    evidence.append(evidenceTitle);
    mountOnOpen(evidence,()=>evidence.append(el('p',`执行时配置：${hardwareSummary(g.config)}`),el('p',`配置来源：${configSource(g.config_source)}`),el('p',`采样日期（服务端记录）：${text(g.days)}`),el('p',`缓存条件：${text(g.cache_condition)}`),el('pre',text(g.spec))));
    specification.append(evidence);
    const samples=el('div'); samples.append(el('p',`样本 ${num(g.samples)} / ${num(dayCount(g))} 天`),el('p',`完成 ${num(g.done)} / 失败 ${num(g.error)} / 取消 ${num(g.canceled)}`),el('p',`有效耗时样本 ${num(g.measured)}；已人工验收 ${num(g.reviewed)}`,'hint'));
    const runtime=el('div'); runtime.append(el('p',`平均 ${sec(g.mean_seconds)}`),el('p',`P50 ${sec(g.p50_seconds)}`),el('p',`P90 ${sec(g.p90_seconds)}`));
    const throughput=el('div');
    throughput.append(el('p',`成功任务 runtime 合计 ${sec(g.runtime_seconds)}`));
    throughput.append(el('p',`成功任务 / 运行小时（仅 runtime 参考）：${num(g.reference_per_hour)}`));
    if(g.source!=='historical') throughput.append(el('p',`占机合计 ${sec(g.occupied_seconds)}`),el('p',`实际产出 ${num(g.output_count)} ${unit(g)}`),el('p',`单位技术交付 ${sec(g.seconds_per_unit)} / ${unit(g)}`),el('p',`单位人工合格 ${sec(g.qualified_seconds_per_unit)} / ${unit(g)}`));
    cell(row,identity,'wide');cell(row,specification,'wide');cell(row,samples);cell(row,runtime);cell(row,throughput,'wide');cell(row,list(groupWarnings(g)),'wide');return row;
  });
  root.append(table(['业务 / 执行端 / 来源','精确业务规格','样本覆盖','成功任务耗时分布','运行参考 / 产出口径','警告与限制'],rows));
}
function scenarioKey(g) {
  // spec_key 包含模型与工作流规格，不能退化为 dimensions。缺键时不同组保持隔离。
  // 跨机器比较保留独立配置行，不按硬件 config_id 限制为同机；已知软件版本不同则分开比较。
  return JSON.stringify([g.capability,g.spec_key || `unknown:${g.id}`,g.source,g.spec?.model_version || null,g.config?.model_version || null,g.config?.environment_id || null,g.source==='standard'?(g.benchmark_id || `unknown:${g.id}`):null,g.cache_condition || null]);
}
function renderScenarios() {
  const choices=new Map(); for(const g of data.groups || []) choices.set(scenarioKey(g),`${capabilityLabel(g)} / ${text(g.spec_key)} / ${source(g.source)} / 模型 ${text(g.spec?.model_version || g.config?.model_version)} / 环境 ${text(g.config?.environment_id)} / 缓存 ${{none:'无节点结果缓存',loaders:'加载节点缓存',execution:'执行节点缓存',unknown:'未知',mixed:'混合条件'}[g.cache_condition?.kind] || '未知'}${g.source==='standard'?` / 基准 ${text(g.benchmark_id)}`:''}`);
  choose($('scenario-filter'),[...choices],choices.size?null:'暂无场景',scenarioSelection);
  renderGroups('scenario-groups',(data.groups || []).filter(g=>scenarioKey(g)===$('scenario-filter').value));
}
function reviewForm(d) {
  const button=el('button','人工验收 / 样本标签','review-open');button.type='button';button.onclick=()=>openReview(d);return button;
}
function openReview(d) {
  const body=el('div',null,'review-form'), fields=el('div',null,'review-fields');
  function field(label,node) {const root=el('label',null,'field');root.append(el('span',label),node);fields.append(root);return node;}
  const accepted=field('人工合格产物数量（留空为未验收）',el('input'));accepted.name='accepted';accepted.type='number';accepted.min='0';accepted.step='1';accepted.value=numeric(d.review?.accepted)?d.review.accepted:'';
  const reviewSource=field('人工样本标签',el('select'));reviewSource.name='source';option(reviewSource,'business','业务样本');option(reviewSource,'standard','标准样本（人工声明）');reviewSource.value=d.review?.source==='standard'?'standard':'business';
  const benchmark=field('标准场景编号（标准样本请填写）',el('input'));benchmark.name='benchmark_id';benchmark.value=d.review?.benchmark_id || '';benchmark.maxLength=100;
  const note=el('textarea');note.name='note';note.rows=2;note.maxLength=500;note.value=d.review?.note || '';
  const noteLabel=el('label',null,'field');noteLabel.append(el('span','验收备注 / 固定条件说明'),note);
  body.append(el('p',`任务 ${text(d.job_id)}；原采集来源：${source(d.source)}。`),fields,noteLabel,el('p','此操作只保存人工声明，不会自动确认技术规格、缓存条件或标准测试通过；不会将历史记录补写为完整采集证据。','notice'));
  body.addEventListener('input',()=>invalidateEstimate('人工验收输入已变更；未保存内容不会进入测算。'));
  capacityDialog(`人工验收 · ${d.job_id}`,body,'保存人工标记',async()=>{
    const count=accepted.value===''?null:Number(accepted.value);
    if(count!==null && (!Number.isSafeInteger(count) || count<0)){accepted.focus();throw Error('请输入非负整数，或留空表示未验收。');}
    if(reviewSource.value==='standard' && !benchmark.value.trim()){benchmark.focus();throw Error('标准样本需要填写标准场景编号；标签不代表自动验证。');}
    if(/[\u0000-\u001f\u007f]/.test(note.value.trim()) || /[\u0000-\u001f\u007f]/.test(benchmark.value.trim())){note.focus();throw Error('验收备注和标准场景编号请使用单行文本，不含换行或控制字符。');}
    const payload={accepted:count,source:reviewSource.value,benchmark_id:benchmark.value.trim(),note:note.value.trim()};
    invalidateEstimate();const version=loadVersion;
    try {
      await H3Auth.json(`/api/capacity/jobs/${encodeURIComponent(d.job_id)}/review`,'POST',payload);
      await mutationSaved(version,'人工标记');
    } catch(error) {throw Error(`保存失败：${error.message}`);}
  });
}
function outputProbe(d) {
  const node=el('div',null,'output-probe'), button=el('button','补采成品尺寸'), status=el('p',null,'hint');
  button.type='button';status.setAttribute('role','status');
  node.append(el('p','仅按可信最终产物清单补采，每次最多 4 个；不会从输入素材或请求参数猜测尺寸。','hint'),button,status);
  let nextOffset=0;
  button.onclick=()=>{
    if(button.disabled || !node.isConnected || nextOffset===null)return;
    const batchOffset=nextOffset, version=loadVersion, body=el('div',null,'capacity-operation');
    body.append(el('p',`任务 ${text(d.job_id)}；本批偏移 ${batchOffset}，最多处理 4 个可信最终产物。`,'notice'),el('p','补采仅添加成品尺寸证据，不修改技术资格、原生成参数、人工合格量或标准标签。最终清单由服务端核验；不会扫描目录，也不会从请求猜测尺寸。'));
    const raw=el('details');raw.append(el('summary','本页已记录的最终产物（最终以服务端可信清单为准）'),el('pre',text(d.outputs)));body.append(raw);
    capacityDialog(`确认受控补采 · ${d.job_id}`,body,'确认本批补采',async()=>{
      if(!node.isConnected || version!==loadVersion || nextOffset!==batchOffset)throw Error('证据页面或批次已变化，请关闭后重新打开。');
      button.disabled=true;status.textContent='正在补采本批成品尺寸…';invalidateEstimate('成品尺寸正在补采，旧测算已清除。');
      try {
        const result=await H3Auth.json(`/api/capacity/jobs/${encodeURIComponent(d.job_id)}/probe-outputs`,'POST',{offset:batchOffset});
        revision++;ready=false;updateEvidenceControls();invalidateEstimate('成品尺寸证据已更新，请刷新看板后重新计算。');
        if(!node.isConnected)return;
        const count=value=>Number.isSafeInteger(value) && value>=0;
        if(!result || !count(result.processed) || result.processed>4 || !count(result.recorded) || result.recorded>result.processed || !count(result.total) || !(result.next_offset===null || count(result.next_offset) && result.next_offset>batchOffset && result.next_offset<result.total))throw Error('补采响应格式无效，请刷新看板核对结果');
        nextOffset=result.next_offset;
        status.textContent=`本批处理 ${num(result.processed)} 个，成功记录尺寸 ${num(result.recorded)} 个；可信最终产物共 ${num(result.total)} 个。${nextOffset===null?'补采已完成，刷新看板查看结果。':'尚有后续产物，请点击继续补采；刷新看板查看结果。'}`;
        button.textContent=nextOffset===null?'补采已完成':'继续补采成品尺寸';
      } catch(error) {
        const reason=`补采失败：${error.message}${error.status===409?'。没有可信最终产物记录，不能猜测成品尺寸。':''}`;
        if(node.isConnected)status.textContent=reason;
        throw Error(reason);
      } finally {button.disabled=nextOffset===null;}
    });
  };
  return node;
}
let evidenceSnapshot=null, evidenceCache=null, evidencePending=null, evidenceVersion=0, evidenceOffset=0;
// 版本属于请求，快照只在聚合提交后建立；刷新窗口里的旧 data 不能借用新版本。
const currentEvidenceSnapshot=snapshot=>Boolean(ready && snapshot && snapshot===evidenceSnapshot && snapshot.version===loadVersion && snapshot.data===data && snapshot.range===applied);
function updateEvidenceControls() {
  for(const node of document.querySelectorAll('#evidence-filters select, #scenario-filter, #include-offline, .summary-spec, [data-evidence-entry], #open-evidence'))node.disabled=!ready;
  if(!ready)for(const id of ['previous','next'])if($(id))$(id).disabled=true;
}
const evidencePageSize=()=>Number($('evidence-size')?.value || evidenceSelection['evidence-size']) || 100;
const filteredEvidence=()=>Boolean(($('evidence-group')?.value ?? evidenceSelection['evidence-group']) || ($('evidence-status')?.value ?? evidenceSelection['evidence-status']) || ($('evidence-source')?.value ?? evidenceSelection['evidence-source']) || evidencePageSize()!==100);
function setupEvidence() {
  choose($('evidence-group'),(data.groups || []).map(g=>[g.id,`${capabilityTitle(g)} / ${workerName(g.worker_id,g.worker_name)} / ${source(g.source)} / ${g.config_id || '配置未知'} / ${g.id}`]),'全部原分组');
}
async function allEvidence(snapshot=evidenceSnapshot) {
  if(!currentEvidenceSnapshot(snapshot))return null;
  if(evidenceCache?.snapshot===snapshot)return evidenceCache.records;
  if(evidencePending?.snapshot===snapshot)return evidencePending.promise;
  const total=snapshot.data.details_total, initialOffset=snapshot.offset, initial=snapshot.data.details || [];
  const pending={snapshot,promise:null};
  pending.promise=(async()=>{
    if(!Number.isSafeInteger(total) || total<0)throw Error('明细总数无效，请刷新后重试。');
    const records=[];
    for(let start=0;start<total;start+=100) {
      if(!currentEvidenceSnapshot(snapshot))return null;
      const response=start===initialOffset?{details:initial,details_total:total}:await H3Auth.request(`/api/capacity?${new URLSearchParams({...snapshot.range,limit:100,offset:start})}`,{cache:'no-store'});
      if(!currentEvidenceSnapshot(snapshot))return null;
      if(response.details_total!==total || !Array.isArray(response.details) || response.details.length!==Math.min(100,total-start))throw Error('任务证据在读取期间变化或分页不完整，请刷新后重新筛选。');
      records.push(...response.details);
      if(filteredEvidence())message('evidence-state',`正在读取真实分页证据 ${records.length} / ${total} 条；聚合统计保持不变。`);
    }
    if(new Set(records.map(d=>d.job_id)).size!==records.length)throw Error('任务证据分页出现重复，请刷新后重试。');
    if(!currentEvidenceSnapshot(snapshot))return null;
    evidenceCache={snapshot,records};return records;
  })();
  evidencePending=pending;
  try {return await pending.promise;} finally {if(evidencePending===pending)evidencePending=null;}
}
async function filterEvidence() {
  const snapshot=evidenceSnapshot;
  if(!currentEvidenceSnapshot(snapshot) || !mountedRegions.has('evidence'))return;
  const filterVersion=++evidenceVersion;
  if(!filteredEvidence()) {
    message('evidence-state','');
    if(offset!==0){offset=0;await load(false);}else renderDetails();
    return;
  }
  $('previous').disabled=true;$('next').disabled=true;$('details').replaceChildren();
  message('evidence-state','正在读取同一截止时间下的真实分页证据，完成后筛选；不会按当前页冒充全部任务。');
  try {
    const records=await allEvidence(snapshot);
    if(!records || !currentEvidenceSnapshot(snapshot) || filterVersion!==evidenceVersion)return;
    const matches=records.filter(d=>(!$('evidence-group').value || d.group_id===$('evidence-group').value) && (!$('evidence-status').value || d.status===$('evidence-status').value) && (!$('evidence-source').value || d.source===$('evidence-source').value));
    const size=evidencePageSize();evidenceOffset=Math.min(evidenceOffset,Math.max(0,Math.ceil(matches.length/size)-1)*size);
    renderDetails(matches.slice(evidenceOffset,evidenceOffset+size),matches.length,evidenceOffset,size);
    message('evidence-state',`筛选 ${matches.length} / 全集 ${records.length} 条；只改变明细，聚合统计不受筛选或分页影响。`);
  } catch(error) {
    if(!currentEvidenceSnapshot(snapshot) || filterVersion!==evidenceVersion)return;
    message('evidence-state',`证据筛选失败：${error.message}。请立即刷新后重试。`);
    $('detail-count').textContent='筛选未完成';$('page-note').textContent='';
  }
}
function showEvidence(group='') {
  if(!currentEvidenceSnapshot(evidenceSnapshot))return;
  $('task-evidence').open=true;mountEvidence();$('evidence-group').value=group;$('evidence-status').value='';$('evidence-source').value='';evidenceOffset=0;
  filterEvidence();$('task-evidence').scrollIntoView({block:'start'});
}
function renderDetails(details=data.details || [],total=data.details_total,start=offset,size=100) {
  $('details').replaceChildren();
  for(const d of details) {
    const node=el('details',null,'evidence'), summary=el('summary');node.dataset.jobId=d.job_id;
    summary.append(el('strong',text(d.job_id)),el('span',source(d.source),'badge'),el('span',` ${STATUS[d.status] || text(d.status)} / ${text(d.capability)} / ${workerName(d.worker_id,d.worker_name)} / ${when(d.created_at)}`));
    const content=el('div',null,'evidence-content');node.append(summary,content);
    mountOnOpen(node,()=>{
    content.append(el('p',`任务 runtime：${sec(d.runtime_seconds)}；占机：${sec(d.occupied_seconds)}；原分组：${text(d.group_id)}`),list(d.warnings));
    const layers=el('div',null,'f-grid3');
    for(const [label,value] of [['输入素材',inputMaterials(d).join(' / ')],['生成参数',generationParameters(d,true)],['技术与人工口径','技术资格以原采集证据及服务端校验为准；尺寸补采与人工标签不修改它。']]){const layer=el('div');layer.append(el('h3',label),el('p',value));layers.append(layer);}
    content.append(layers);
    content.append(rawEvidence('执行尝试（包含重试）',d.attempts),el('h3','实际输出证据'));
    if(Array.isArray(d.outputs) && d.outputs.length) {
      content.append(table(['产物标识','类型','实际尺寸','视频时长','技术记录'],d.outputs.map(output=>{const row=el('tr');cell(row,output.key || output.id || '未记录');cell(row,output.kind);cell(row,outputVariants({variants:[output]}).length?outputVariantLabel(output):'尺寸未记录');cell(row,sec(output.duration));cell(row,output.valid===true?'采集记录标记有效':output.valid===false?'未通过 / 待确认':'未记录');return row;})));
    } else content.append(el('p','最终产物清单未记录；不能按请求猜测，也不按零产物处理。','notice'));
    content.append(rawEvidence('实际输出原始证据',d.outputs),el('p',`人工合格数量：${num(d.review?.accepted)}；样本标签：${d.review?.source==='standard'?'标准样本（人工声明）':d.review?.source==='business'?'业务样本':'未标记'}；标准场景编号：${text(d.review?.benchmark_id)}；备注：${text(d.review?.note)}`));
    appendOutputResolutionDetails(content,d.output_resolution);
    content.append(rawEvidence('成品尺寸原始证据',{output_resolution:d.output_resolution,recovered_outputs:d.recovered_outputs},'output-resolution-raw'));
    if(d.status==='done')content.append(outputProbe(d));
    if(['captured','standard'].includes(d.source))content.append(reviewForm(d));
    else content.append(el('p','历史任务不能补写为完整采集证据，不提供采集验收表单。','hint'));
    });
    $('details').append(node);
  }
  if(!details.length) $('details').append(el('p','当前页没有任务证据。可立即刷新，或返回上一页。','empty'));
  $('detail-count').textContent=`当前 ${details.length} / 总计 ${num(total)} 条；聚合不受分页截断`;
  $('page-note').textContent=`第 ${Math.floor(start/size)+1} 页`;
  $('previous').disabled=!ready || start===0;
  $('next').disabled=!ready || !numeric(total) || start+size>=total;
}
function clearData() {
  invalidateRegions();data=null;ready=false;evidenceVersion++;evidenceSnapshot=null;evidenceCache=null;evidencePending=null;updateEvidenceControls();
  $('capacity-stats').replaceChildren();
  $('online-count').textContent='当前在线 — 台';
  $('previous').disabled=true;$('next').disabled=true;$('estimate-submit').disabled=true;
}
function invalidateEstimate(note='输入或证据已变更，请重新计算。') {
  estimateVersion++;lastEstimate=null;$('export-estimate').disabled=true;message('estimate-error','');
  $('estimate-result').replaceChildren(el('p',note,'muted'));updateDemandControls();
}
async function load(reset=true) {
  const version=++loadVersion;ready=false;evidenceVersion++;evidenceSnapshot=null;evidenceCache=null;evidencePending=null;updateEvidenceControls();invalidateEstimate('证据正在刷新，旧测算已清除。');message('error','');message('evidence-state','');
  // 不限制历史起点；翻页与测算沿用同一截止时间，刷新时再纳入新任务。
  const range=reset?{to:Math.floor(Date.now()/1000)}:applied;
  if(reset)offset=0;
  $('previous').disabled=true;$('next').disabled=true;
  $('refresh-state').textContent='正在读取全部历史聚合与本页证据…';
  try {
    const result=await H3Auth.request(`/api/capacity?${new URLSearchParams({...range,limit:100,offset})}`,{cache:'no-store'});
    // H3Auth.request 返回已解析数据；请求序号保护刷新与分页，旧响应不能覆盖新状态。
    if(version!==loadVersion)return;
    data=result;applied=Object.freeze({...range});revision++;ready=true;
    evidenceSnapshot=Object.freeze({data,range:applied,version,offset});updateEvidenceControls();
    workers.clear();
    for(const w of data.workers || [])workers.set(w.id,w);
    for(const g of data.groups || [])if(g.worker_id && !workers.has(g.worker_id))workers.set(g.worker_id,{id:g.worker_id,name:g.worker_name});
    invalidateRegions();renderOverview();await renderActiveRegions();
    if(version!==loadVersion)return;
    $('refresh-state').textContent=`最后刷新：${new Date().toLocaleTimeString('zh-CN',{hour12:false})}`;
  } catch(error) {
    if(version!==loadVersion)return;clearData();message('error',`读取产能数据失败：${error.message}。请点击立即刷新重试。`);$('refresh-state').textContent='读取失败';
  }
}
function baselineKey(g) {return JSON.stringify(g.source==='standard'?[g.config_id || null,g.source,g.benchmark_id || `unknown:${g.id}`]:[g.config_id || null,g.source]);}
const purchaseMode = capability => PURCHASE_MODES.find(mode=>mode.capabilities.includes(capability));
const onlineWorker = id => (data?.workers || []).find(w=>w.id===id && isOnline(w));
function usable(g) {return numeric(g.mean_seconds) && g.mean_seconds>0 && numeric(g.measured) && g.measured>0;}
function purchaseGroups(workerId) {
  if(!onlineWorker(workerId))return [];
  return (data?.groups || []).filter(g=>g.worker_id===workerId && ['historical','captured','standard'].includes(g.source) && purchaseMode(g.capability) && usable(g));
}
function candidateGroups() {return purchaseGroups($('estimate-worker').value);}
function hasUsableMode(mode,groups=candidateGroups()) {return groups.some(g=>mode.capabilities.includes(g.capability) && usable(g));}
function setupEstimate() {
  const online=(data?.workers || []).filter(isOnline), previous=estimateWorkerSelection;
  const selected=online.some(w=>w.id===previous)?previous:(online.find(w=>purchaseGroups(w.id).length) || online[0])?.id || '';
  choose($('estimate-worker'),online.map(w=>[w.id,w.name || '未命名电脑']),online.length?null:'暂无在线电脑',selected);
  resetDemands();
}
function updateDemandControls() {
  const groups=candidateGroups(), selects=[...$('demands').querySelectorAll('select')], used=new Set(selects.map(select=>select.value));
  for(const select of selects)for(const item of select.options) {
    const mode=PURCHASE_MODES.find(mode=>mode.id===item.value);
    item.disabled=!mode || !hasUsableMode(mode,groups) || selects.some(other=>other!==select && other.value===item.value);
  }
  $('add-demand').disabled=!ready || !PURCHASE_MODES.some(mode=>!used.has(mode.id) && hasUsableMode(mode,groups));
  $('estimate-submit').disabled=!ready || !groups.length || !selects.length;
  $('demand-note').textContent=!ready?'请先刷新并读取电脑状态。':!onlineWorker($('estimate-worker').value)?'当前没有在线电脑，请稍后刷新。':!groups.length?'这台电脑暂无这些模式的成功耗时记录，请换一台电脑。':'';
}
function resetDemands() {
  $('demands').replaceChildren();addDemand();invalidateEstimate();
}
function addDemand() {
  const groups=candidateGroups(), used=new Set([...$('demands').querySelectorAll('select')].map(select=>select.value));
  const first=PURCHASE_MODES.find(mode=>!used.has(mode.id) && hasUsableMode(mode,groups));
  if(!ready || !first && $('demands').children.length){updateDemandControls();return;}
  const row=el('div',null,'demand'), select=el('select');select.className='demand-group';select.required=true;select.setAttribute('aria-label','需求业务模式');
  for(const type of ['生图模式','生视频模式']) {
    const category=el('optgroup');category.label=type;
    for(const mode of PURCHASE_MODES.filter(mode=>mode.type===type))option(category,mode.id,`${mode.type} · ${mode.label}`);
    select.append(category);
  }
  select.value=first?.id || '';select.disabled=!first;select.onchange=()=>invalidateEstimate();
  const quantity=el('input');quantity.className='demand-quantity';quantity.type='number';quantity.min='0.01';quantity.step='any';quantity.required=true;quantity.placeholder='任务/天';quantity.setAttribute('aria-label','每日需求数量（任务/天）');quantity.disabled=!first;
  const remove=el('button','移除');remove.type='button';remove.onclick=()=>{row.remove();invalidateEstimate();};
  row.append(select,quantity,remove);$('demands').append(row);updateDemandControls();
}
const stableCompare = (a,b) => a<b?-1:a>b?1:0;
function comparePurchaseGroups(a,b) {
  const value=(g,key)=>numeric(g[key])?g[key]:0;
  return b.measured-a.measured || value(b,'samples')-value(a,'samples') || value(b,'last_sample_at')-value(a,'last_sample_at') || b.mean_seconds-a.mean_seconds || stableCompare(a.id,b.id);
}
function selectDemandGroups(demands,groups=candidateGroups()) {
  // 同配置、来源与基准编号内选择具体原分组，绝不融合不同模型、尺寸或缓存的均值。
  const buckets=new Map();
  for(const g of groups) {const key=baselineKey(g);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(g);}
  const choices=[];
  for(const [key,entries] of buckets) {
    const selected=demands.map(demand=>{
      const mode=PURCHASE_MODES.find(mode=>mode.id===demand.mode_id);
      return entries.filter(g=>mode.capabilities.includes(g.capability)).sort(comparePurchaseGroups)[0];
    });
    if(selected.every(Boolean))choices.push({key,groups:selected,measured:selected.reduce((sum,g)=>sum+g.measured,0)});
  }
  choices.sort((a,b)=>b.measured-a.measured || stableCompare(a.key,b.key));
  if(!choices.length)throw Error('所选模式没有同一电脑、同一配置和来源的共同实测记录，请减少模式或换一台电脑');
  return choices[0].groups;
}
function estimatePayload() {
  if(!ready || !applied)throw Error('请先点击立即刷新并成功读取证据。');
  const worker_id=$('estimate-worker').value;
  if(!onlineWorker(worker_id))throw Error('所选电脑当前不在线，请刷新后重新选择。');
  const groups=candidateGroups(), seen=new Set();
  const requested=[...$('demands').children].map(row=>{
    const mode_id=row.querySelector('select').value, quantity=Number(row.querySelector('input').value), mode=PURCHASE_MODES.find(mode=>mode.id===mode_id);
    if(!mode || !hasUsableMode(mode,groups))throw Error('所选模式没有成功耗时记录，请换一个模式或电脑。');
    if(seen.has(mode_id))throw Error('同一模式请合并每日需求，不能重复选择。');seen.add(mode_id);
    if(!numeric(quantity) || quantity<=0)throw Error('每日需求必须是大于零的有限任务数量。');return {mode_id,quantity};
  });
  if(!requested.length)throw Error('请至少添加一个有样本的业务模式。');
  const selected=selectDemandGroups(requested,groups), demands=requested.map((demand,index)=>({group_id:selected[index].id,quantity:demand.quantity}));
  const payload={...applied,...PURCHASE_DEFAULTS,worker_id,hours:Number($('hours').value),demands};
  if($('price').value!=='')payload.price=Number($('price').value);
  return payload;
}
function renderEstimate(result,payload) {
  const root=$('estimate-result');root.replaceChildren();
  root.append(el('p','成功任务处理参考，不是合格产物日产量或采购承诺','warn'),el('p',`参考机器数：${num(result.machines)} 台`,'result-number'),el('p',`每日所需参考运行时间：${sec(result.total_seconds)}`),el('p',`单机每日可用容量时间：${sec(result.daily_capacity_seconds)}`),el('p',`整机采购小计：${numeric(result.price_total)?`¥${num(result.price_total)}`:'未计价'}`));
  const rows=(result.lines || []).map(line=>{
    const row=el('tr'), g=(data.groups || []).find(g=>g.id===line.group_id), mode=purchaseMode(g?.capability);
    cell(row,mode?`${mode.type} · ${mode.label}`:'业务模式','wide');cell(row,`${num(line.quantity)} ${estimateUnit()}/天`);cell(row,sec(line.seconds_per_unit));cell(row,`${num(line.daily_units)} ${estimateUnit()}/天`);return row;
  });
  root.append(table(['业务模式','每日需求','平均任务耗时','单机场景参考日处理量'],rows),el('p','每个模式只参考自动选中的一个实测分组，不保证任意模型、尺寸或缓存规格的产能。','hint'));
  const basis=el('details');basis.append(el('summary','计算依据'),el('h3','警告与覆盖限制'),list(result.warnings));
  basis.append(el('p','仅按成功任务平均 runtime 估算；不含完整失败、准备、重试或质量损耗。按同一电脑、配置和来源选择具体原分组，不合并均值。','hint'),el('p','台数 = 向上取整〔各模式任务数量 × 平均任务耗时之和 ÷（小时 × 3600 × 可用时间比例 × 生产容量比例）〕。容量预留不是 GPU 利用率；业务组合与模型切换可能增加损耗，不保证峰值 SLA。','hint'));
  for(const demand of payload.demands) {
    const g=(data.groups || []).find(g=>g.id===demand.group_id);
    if(g)basis.append(el('h3',purchaseMode(g.capability)?.label || '业务模式'),el('p',`${capabilityLabel(g)} / ${text(g.spec_key)}：${source(g.source)}；样本 ${num(g.samples)}；${num(dayCount(g))} 天；配置 ${text(g.config_id)}${g.source==='standard'?`；标准场景编号 ${text(g.benchmark_id)}`:''}`),summaryEvidence(g));
  }
  basis.append(el('h3','计算假设'),el('pre',text(result.assumptions)),el('p',`Worker ID：${payload.worker_id}；当前在线仅为本次数据快照，不承诺未来状态；当前配置仅作清单参考：${hardwareSummary(workers.get(payload.worker_id)?.hardware)}；时间：全部历史 至 ${when(payload.to)}；${payload.hours} 小时 / 可用 ${num(payload.availability*100)}% / 生产容量 ${num(payload.utilization*100)}%`,'hint'));
  root.append(basis);
}
$('estimate-form').onsubmit=async event=>{
  event.preventDefault();invalidateEstimate('正在计算…');let payload;
  try {if(!$('estimate-form').reportValidity())return;payload=estimatePayload();}
  catch(error) {message('estimate-error',error.message);return;}
  const version=estimateVersion, evidenceRevision=revision;$('estimate-submit').disabled=true;
  try {
    const result=await H3Auth.json('/api/capacity/estimate','POST',payload);
    if(version!==estimateVersion || evidenceRevision!==revision || !ready)return;
    renderEstimate(result,payload);lastEstimate={result,payload,groups:(data.groups || []).filter(g=>payload.demands.some(d=>d.group_id===g.id)),hardware:Object.fromEntries(Object.entries(workers.get(payload.worker_id)?.hardware || {}).filter(([key])=>key!=='note'))};$('export-estimate').disabled=false;
  } catch(error) {if(version===estimateVersion){$('estimate-result').replaceChildren(el('p','本次未产生测算结果，请检查证据与输入后重试。','muted'));message('estimate-error',`测算失败：${error.message}`);}}
  finally {if(version===estimateVersion)updateDemandControls();}
};
function csvCell(value) {
  let string=value==null?'':typeof value==='object'?JSON.stringify(value):String(value);
  // 导出仍是外部数据：阻断表格公式，保留引号、换行与完整警告。
  if(/^[\s]*[=+\-@]/.test(string))string="'"+string;
  return '"'+string.replace(/"/g,'""')+'"';
}
$('export-estimate').onclick=()=>{
  if(!lastEstimate)return;const {result,payload,groups,hardware}=lastEstimate;
  const rows=[['类别','内容'],['测算口径',payload.mode==='historical'?'历史任务运行参考，不是合格日产能':'已验证基线条件测算'],['输入与时间范围',payload],['当前机器配置（非历史快照）',hardware],['测算结果',result],...groups.map(g=>['场景证据',{...g,warnings:groupWarnings(g)}])];
  const blob=new Blob(['\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=el('a');
  link.href=url;link.download='capacity-estimate.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
for(const tab of document.querySelectorAll('[role="tab"]')) {
  tab.onclick=()=>{for(const other of document.querySelectorAll('[role="tab"]')){const active=other===tab;other.setAttribute('aria-selected',String(active));other.tabIndex=active?0:-1;$(other.getAttribute('aria-controls')).hidden=!active;}renderActiveRegions();};
  tab.onkeydown=event=>{const tabs=[...document.querySelectorAll('[role="tab"]')],index=tabs.indexOf(tab);let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next!==undefined){event.preventDefault();tabs[next].click();tabs[next].focus();}};
}
$('refresh').onclick=()=>load();
$('include-offline').onchange=()=>{if(ready)renderMachineSummary();};
for(const id of ['technical-details','task-evidence'])$(id).addEventListener('toggle',()=>renderActiveRegions());
$('open-purchase').onclick=()=>{$('tab-purchase').click();$('panel-purchase').focus();};
$('open-evidence').onclick=()=>showEvidence();
$('previous').onclick=()=>{if(!ready || $('previous').disabled || !mountedRegions.has('evidence'))return;if(filteredEvidence()){evidenceOffset=Math.max(0,evidenceOffset-evidencePageSize());filterEvidence();}else{offset=Math.max(0,offset-100);load(false);}};
$('next').onclick=()=>{if(!ready || $('next').disabled || !mountedRegions.has('evidence'))return;if(filteredEvidence()){evidenceOffset+=evidencePageSize();filterEvidence();}else{offset+=100;load(false);}};
$('scenario-filter').onchange=()=>{if(ready)renderGroups('scenario-groups',(data?.groups || []).filter(g=>scenarioKey(g)===$('scenario-filter').value));};
$('estimate-form').addEventListener('input',()=>invalidateEstimate());
$('estimate-form').addEventListener('change',()=>invalidateEstimate());
$('estimate-worker').onchange=resetDemands;
$('add-demand').onclick=()=>{addDemand();invalidateEstimate();};
window.addEventListener('h3auth:expired',()=>{loadVersion++;clearData();invalidateEstimate('登录已失效，请重新登录。');});
H3Auth.requireUser(true).then(user=>{AdminUI.mount({page:'capacity',user});load();}).catch(error=>message('error',error.message));
