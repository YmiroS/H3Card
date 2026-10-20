/* 费用汇总直接使用服务端全周期聚合；明细分页不参与汇总计算。 */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),E=AdminUI.escape;
 const STATUS={queued:'排队中',assigned:'已分配',running:'运行中',done:'已完成',error:'失败',canceled:'已取消',cancel_requested:'正在取消'};
 const SOURCE={actual:'实际',estimated:'历史估算',unknown:'未知'};
 const BASIS={per_job:'按次',per_segment:'按段',segment_count:'按分段数',output_second_resolution:'按输出秒和分辨率'};
 const number=value=>value==null||value===''?null:Number.isFinite(Number(value))?Number(value):null;
 const count=value=>number(value)==null?'未获取':String(value);
 let data=null,page=0,tab='category',sequence=0,inFlight=false,loadedPeriod='0';
 const pageSize=10;
 const money=value=>number(value)==null?'未知':`${!data?.currency||data.currency==='CNY'?'¥':data.currency+' '}${Number(value).toFixed(4)}`;
 const range=(low,high)=>number(low)==null||number(high)==null?'未知':Number(low)===Number(high)?money(low):`${money(low)} – ${money(high)}`;
 const when=value=>number(value)==null?'未记录':new Date(Number(value)*1000).toLocaleString('zh-CN',{hour12:false});
 const duration=value=>number(value)==null||value<0?'未记录':value<60?`${Math.round(value)}秒`:value<3600?`${Math.floor(value/60)}分${Math.floor(value%60)}秒`:`${Math.floor(value/3600)}小时${Math.floor(value%3600/60)}分`;
 const secondary=value=>`<span class="cell-secondary">${E(value)}</span>`;
 const periodLabel=value=>value==='0'?'全部记录':`最近${value}天`;
 function renderRanks(){
  document.querySelectorAll('[data-cost-tab]').forEach(node=>{const active=node.dataset.costTab===tab;node.setAttribute('aria-selected',String(active));node.tabIndex=active?0:-1;});$('cost-panel').setAttribute('aria-labelledby',`cost-tab-${tab}`);
  if(!data)return;
  const items=data[`by_${tab}`];if(!Array.isArray(items)){$('cost-panel').innerHTML='<p class="muted">构成数据未获取，不以零元替代。</p>';return;}
  const shown=items.slice(0,10),max=Math.max(0,...shown.map(item=>number(item.retail_mid)??0));
  $('cost-panel').innerHTML=shown.map(item=>{const v=number(item.retail_mid),width=v!=null&&max>0?Math.max(0,Math.min(100,v/max*100)):null;return `<div class="f-rank"><div><b title="${E(item.key)}">${E(item.label||item.key||'未记录')}</b><strong>${number(item.retail_known_tasks)==null?'未获取':item.retail_known_tasks?E(range(item.retail_min,item.retail_max)):'未定价'}</strong></div><p class="muted small">${E(count(item.tasks))} 项 · 已定价 ${E(count(item.retail_known_tasks))} · 未定价 ${E(count(item.retail_unknown_tasks))} · 已知内部成本 ${E(money(item.total_cost))}</p>${width==null?'':`<div class="f-track" role="meter" aria-label="${E(item.label||item.key)} 建议收费中值相对最大项" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${width}"><i style="width:${width}%"></i></div>`}</div>`;}).join('')||'<div class="empty-state"><b>这个周期内还没有费用构成</b><p>调整统计周期，或等待任务产生费用记录。</p></div>';
 }
 function renderJobs(){if(!data)return;const jobs=data.jobs,maxPage=Math.max(0,Math.ceil(jobs.length/pageSize)-1);page=Math.min(page,maxPage);const shown=jobs.slice(page*pageSize,(page+1)*pageSize);
  $('job-rows').innerHTML=shown.map(item=>{const priced=item.retail_source==='priced',notBillable=item.retail_source==='not_billable',basis=priced?(BASIS[item.retail_basis]||item.retail_basis||'未记录'):notBillable?'未完成':item.retail_source==='unpriced'?'未定价':'未获取';return `<tr><td>${E(when(item.created_at))}${secondary(item.job_id||'任务ID未记录')}</td><td class="${['error','canceled'].includes(item.status)?'danger':['running','queued','assigned','cancel_requested'].includes(item.status)?'warn':''}">${E(STATUS[item.status]||item.status||'未知')}${secondary(item.category_name||item.category||'类型未记录')}</td><td class="origin">${E(item.project_name||'未归属项目')}${secondary(item.card_name||'未记录卡片')}</td><td>${E(item.capability||'未记录')}</td><td>${E(item.worker_name||'未分配执行端')}</td><td>${E(duration(item.runtime_seconds))}</td><td class="${item.retail_source==='unpriced'?'warn':'muted'}">${E(basis)}</td><td>${E(priced?range(item.retail_min,item.retail_max):notBillable?'不计费':item.retail_source==='unpriced'?'未定价':'未知')}</td><td>${E(item.cost_source==='unknown'||!item.cost_source?'未知':money(item.recognized_cost))}${secondary(SOURCE[item.cost_source]||item.cost_source||'来源未记录')}</td></tr>`;}).join('')||'<tr><td colspan="9"><div class="empty-state"><b>这个周期内还没有费用记录</b><p>更换统计周期，或等待任务产生费用记录。</p></div></td></tr>';
  $('page-note').textContent=`显示 ${jobs.length?page*pageSize+1:0}–${Math.min((page+1)*pageSize,jobs.length)} / 已载入 ${jobs.length} 条`;
  $('cost-prev').disabled=page===0;$('cost-next').disabled=page>=maxPage;
  const total=number(data.overview.tasks);$('detail-note').textContent=`服务端合计 ${count(data.overview.tasks)} 条 / 明细已载入 ${jobs.length} 条${total!=null&&total>jobs.length?'（接口最多2000条，非完整明细）':''}；汇总不以当前显示页相加替代`;
 }
 function render(){const o=data.overview;
  // 只用服务端全量覆盖计数判断未定价/全未知，不从最多2000条的明细反推。
  const unpriced=number(o.retail_known_tasks)===0&&number(o.retail_unknown_tasks)>0;
  const allCostsUnknown=number(o.tasks)>0&&number(o.unknown_cost_tasks)===number(o.tasks)&&number(o.actual_cost)===0&&number(o.estimated_cost)===0;
  if(!unpriced&&number(o.retail_min)!=null&&number(o.retail_max)!=null&&Number(o.retail_min)!==Number(o.retail_max))$('retail-range').innerHTML=`<span class="cost-amount">${E(money(o.retail_min))}</span> – <span class="cost-amount">${E(money(o.retail_max))}</span>`;
  else $('retail-range').textContent=unpriced?'未定价':range(o.retail_min,o.retail_max);
  $('retail-mid').textContent=unpriced?'未定价':money(o.retail_mid);$('retail-coverage').textContent=`已定价 ${count(o.retail_known_tasks)} 项 / 未定价 ${count(o.retail_unknown_tasks)} 项`;
  $('internal-total').textContent=allCostsUnknown?'未知':money(o.total_cost);$('internal-split').textContent=allCostsUnknown?`实际与历史估算均未记录；未知 ${count(o.unknown_cost_tasks)} 项`:`实际 ${money(o.actual_cost)} / 历史估算 ${money(o.estimated_cost)}`;
  $('actual').textContent=allCostsUnknown?'未知':money(o.actual_cost);$('running').textContent=`运行中累计 ${money(o.running_accrued)}`;
  $('gpu-hours').textContent=number(o.gpu_hours)==null?'未获取':`${Number(o.gpu_hours).toFixed(2)} 小时`;$('electricity').textContent=`其中电费 ${money(o.electricity_cost)}`;
  $('api-cost').textContent=money(o.api_cost);$('waste').textContent=money(o.failed_waste);$('unknown').textContent=`已包含于总成本；未知 ${count(o.unknown_cost_tasks)} 项`;
  $('tasks').textContent=count(o.tasks);$('statuses').textContent=`完成 ${count(o.done)} / 失败 ${count(o.error)} / 取消 ${count(o.canceled)}`;
  $('pricing').textContent=`计价版本 ${data.pricing_version??'未获取'} / 币种 ${data.currency??'未获取'}`;
  $('period-note').textContent=`当前展示：${periodLabel(loadedPeriod)} · ${number(data.period?.from)===0?'全部历史':when(data.period?.from)} — ${when(data.period?.to)}（按任务创建时间）`;
  renderRanks();renderJobs();
 }
 async function refresh({periodChanged=false}={}){
  if(inFlight&&!periodChanged)return;const requestId=++sequence;inFlight=true;$('refresh').disabled=true;$('refresh-state').textContent='正在读取…';$('main').setAttribute('aria-busy','true');
  const selected=$('period').value,query=new URLSearchParams({limit:'2000'});if(Number(selected))query.set('from',String(Date.now()/1000-Number(selected)*86400));
  try {const response=await H3Auth.request(`/api/costs?${query}`,{cache:'no-store'});if(requestId!==sequence)return;
   if(!response.overview||!Array.isArray(response.jobs))throw new Error('费用接口返回的数据格式不完整');
   data=response;loadedPeriod=selected;if(periodChanged)page=0;render();$('error').hidden=true;$('refresh-state').textContent=`最后刷新 ${new Date().toLocaleTimeString('zh-CN',{hour12:false})} · 每15秒刷新`;
  }catch(error){if(requestId!==sequence)return;$('error-message').textContent=`读取费用统计失败：${error.message}`;if($('error').hidden)H3Notify.error($('error-message').textContent);$('error').hidden=false;$('refresh-state').textContent='连接失败 · 快照非实时';if(!data){$('cost-panel').innerHTML='<p class="muted">费用构成读取失败，请点击“重试读取”。</p>';$('job-rows').innerHTML='<tr><td colspan="9" class="loading-note">费用明细读取失败，请点击“重试读取”。</td></tr>';$('detail-note').textContent='明细未获取，不以空记录或零元代替。';}}
  finally{if(requestId===sequence){inFlight=false;$('refresh').disabled=false;$('main').removeAttribute('aria-busy');}}
 }
 $('cost-basis').onclick=()=>AdminUI.dialog({title:'计价与成本口径',body:'<div class="f-stack"><p>建议收费区间与中值来自计价规则，不是已收款或实际收入。</p><p>收费依据支持按次、按段、分段数、输出秒和分辨率；未定价不等于免费。未完成任务不计建议收费，但可能产生内部损耗。</p><p>内部总成本 = 已知实际 + 已知历史估算；未知成本单列，不按零元处理。失败与取消损耗已包含于总成本，不重复相加。运行中累计成本尚可能变化。</p><p>统计周期以任务创建时间为准，按服务端全量聚合。费用明细最多读取2000条，每页10条；不能把当前显示明细当完整总额，也不从明细重算概览或费用构成。</p><p>GPU用量、电费、API token成本、实际与历史估算均沿用服务端口径；未记录的字段显示未知，不由前端推测单价或补算。</p></div>'});
 $('refresh').innerHTML=AdminUI.icon('refresh')+'立即刷新';$('refresh').onclick=()=>refresh();$('retry').onclick=()=>refresh({periodChanged:$('period').value!==loadedPeriod});$('period').onchange=()=>refresh({periodChanged:true});
 $('cost-prev').onclick=()=>{page=Math.max(0,page-1);renderJobs();};$('cost-next').onclick=()=>{page++;renderJobs();};
 document.querySelectorAll('[data-cost-tab]').forEach(button=>button.onclick=()=>{tab=button.dataset.costTab;renderRanks();});
 H3Auth.requireUser(true).then(user=>{AdminUI.mount({page:'costs',user});refresh();H3Auth.request('/api/health',{cache:'no-store'}).then(health=>{$('sandbox-note').hidden=health.sandbox!==true&&document.body.dataset.adminSandbox!=='local-copy';}).catch(()=>{});H3Auth.every(()=>{if(!document.hidden)return refresh();},15000);}).catch(error=>{$('error-message').textContent=error.message;if($('error').hidden)H3Notify.error($('error-message').textContent);$('error').hidden=false;});
})();
