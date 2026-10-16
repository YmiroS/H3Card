// 使用已有临时 Playwright 与本机 Chrome；所有网络均路由到合成数据，不启动后端或访问线上。
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const {chromium} = require('playwright');
const web = path.join(__dirname, '..', 'web');
const html = readFileSync(path.join(web, 'capacity.html'), 'utf8');
const NOW = new Date('2026-10-08T10:30:00Z');
const ATTACK = '<img src=x onerror="window.injected=true">';
function fixture() {
  const historical = {id:'h1', worker_id:'w1', worker_name:'同名机器', capability:'depth_video', capability_name:'深度视频', card_name:'用户卡片名字不应作为业务名', dimensions:{duration:5, width:null}, spec_key:'depth-5s', source:'historical', samples:3201, done:3000, error:100, canceled:101, measured:2900, mean_seconds:60, p50_seconds:55, p90_seconds:80, runtime_seconds:174000, reference_per_hour:60, output_count:null, unit:'task', occupied_seconds:null, seconds_per_unit:null, qualified_seconds_per_unit:null, eligible:false, warnings:['历史缺少输出证据','缓存情况未知'], days:5, config_id:null};
  const captured = {...historical, id:'c1', source:'captured', samples:12, done:10, error:1, canceled:1, measured:10, days:2, config_id:'config-1', mean_seconds:100, p50_seconds:null, p90_seconds:null, runtime_seconds:1000, output_count:20, unit:'video_seconds', occupied_seconds:1200, seconds_per_unit:60, qualified_seconds_per_unit:80, eligible:true, warnings:['覆盖样本仅两天','人工验收覆盖有限']};
  return {
    period:{from:null,to:NOW.getTime()/1000},
    overview:{tasks:3213,done:3010,error:101,canceled:102,unknown_worker:4,historical_tasks:3201,captured_tasks:12,excluded_api:99,output_images:null,output_videos:4,output_seconds:20,unknown_outputs:3190},
    workers:[
      {id:'w1',name:'同名机器',state:'idle',last_seen:NOW.getTime()/1000-10,hardware:{host_id:'host-1',gpus:[{name:'RTX 合成 24G',memory_total_bytes:24*1024**3},{name:'RTX 合成 24G',memory_total_bytes:24*1024**3}],memory_total_bytes:96*1024**3,cpu:'合成 CPU',os:'合成系统',environment_id:'env-1'},tasks:3201,done:3000,error:100,canceled:101,runtime_seconds:174000},
      {id:'w2',name:'同名机器',state:'offline',last_seen:NOW.getTime()/1000-90000,hardware:{gpus:[{name:'合成 GPU',memory_total_bytes:null}],cpu:null,memory_total_bytes:null},tasks:12,done:10,error:1,canceled:1,runtime_seconds:null},
    ],
    groups:[historical,{...historical,id:'h2',capability:'qwen_image_21_multi',capability_name:'Qwen 多图',spec_key:'image-batch-2'}, {...historical,id:'other-worker',worker_id:'w2'},captured,{...captured,id:'c2',capability:'qwen_image_21_multi',capability_name:'Qwen 多图',spec_key:'image-batch-2',unit:'image'}, {...captured,id:'other-config',config_id:'config-2'}, {...captured,id:'s1',source:'standard',benchmark_id:'bench-001',warnings:['固定素材尚待人工复核']}, {...captured,id:'ineligible',spec_key:'unknown-spec',eligible:false,seconds_per_unit:null,qualified_seconds_per_unit:null,warnings:['产物规格未确认']}],
    details:[
      {job_id:'history-job',capability:'depth_video',worker_id:'w1',worker_name:'同名机器',status:'done',source:'historical',created_at:NOW.getTime()/1000-1000,runtime_seconds:null,attempts:null,outputs:null,review:{accepted:null},warnings:['旧记录缺少 attempts']},
      {job_id:'captured-job',capability:'depth_video',worker_id:'w1',worker_name:'同名机器',status:'done',source:'captured',created_at:NOW.getTime()/1000-50,runtime_seconds:100,attempts:[{id:1,occupied_seconds:120,status:'done'}],outputs:[{kind:'video',duration:5}],review:{accepted:null,source:'business',note:''},warnings:['部分缓存节点，不等于整体缓存命中']},
    ],details_total:3201,
  };
}
// 采购只使用真实生图/生视频路由；原工具箱 fixture 保留给模型、统计与对比回归。
const PURCHASE_MODES = [
  ['zimage_t2i','生图模式 · 文生图',['zimage_t2i','krea2_t2i','qwen_image_2512_t2i','qwen_image_21_t2i']],
  ['zimage_i2i','生图模式 · 图生图',['zimage_i2i','krea2_i2i','qwen_image_edit_2511_i2i','qwen_image_21_multi','qwen_image_21_i2i']],
  ['flux2_klein_storyboard9','生图模式 · 多宫格故事分镜',['flux2_klein_storyboard9']],
  ['flux2_klein_edit','生图模式 · 参考图编辑(保人物)',['flux2_klein_edit']],
  ['minimax_h3_character_transfer','生视频模式 · H3人物迁移',['minimax_h3_character_transfer']],
  ['minimax_h3_flf2v','生视频模式 · H3 图生视频',['minimax_h3_flf2v','minimax_h3_i2v']],
  ['minimax_h3_talk2','生视频模式 · H3 说话唱歌',['minimax_h3_talk2','minimax_h3_talk1']],
  ['minimax_h3_ref4','生视频模式 · H3图片参考',['minimax_h3_ref4']],
  ['minimax_h3_comic20','生视频模式 · 漫剧4宫格',['minimax_h3_comic20']],
  ['minimax_h3_ref9','生视频模式 · H3全能参考',['minimax_h3_ref9']],
  ['minimax_h3_ref_2pass','生视频模式 · H3全能参考(高质量)',['minimax_h3_ref_2pass']],
];
function purchaseFixture() {
  const input=fixture();
  input.groups=input.groups.map(g=>({...g,
    ...(g.capability==='depth_video'?{capability:'zimage_t2i',capability_name:'文生图'}:{}),
    dimensions:{width:1024,height:1024,image_count:g.capability==='depth_video'?0:2,steps:20},
    spec_key:'image-'+g.spec_key,unit:g.source==='historical'?'task':'image'}));
  return input;
}
function purchaseGroup(id,capability,extra={}) {
  const measured=Object.hasOwn(extra,'measured')?extra.measured:8, samples=extra.samples ?? Math.max(10,Number(measured) || 0);
  const done=Math.max(0,Number(measured) || 0), mean=Object.hasOwn(extra,'mean_seconds')?extra.mean_seconds:60;
  return {...purchaseFixture().groups[0],id,capability,capability_name:'动态名字不得污染模式',spec_key:'spec-'+id,
    samples,done,error:samples-done,canceled:0,measured,mean_seconds:mean,runtime_seconds:mean>0?mean*done:null,last_sample_at:NOW.getTime()/1000-100,...extra};
}
function purchaseData(groups,workers=purchaseFixture().workers) {
  return {...purchaseFixture(),groups,workers};
}
function bucket(g) {return JSON.stringify([g.config_id || null,g.source,g.source==='standard'?g.benchmark_id || null:null]);}
function assertFixedPayload(body) {
  assert.equal(body.mode,'historical');assert.equal(body.quality,'technical');
  assert.equal(body.availability,1);assert.equal(body.utilization,.75);
  assert.equal(Object.hasOwn(body,'from'),false);
  assert.ok(body.demands.every(d=>Object.keys(d).sort().join(',')==='group_id,quantity'));
}
async function estimateEvidence(page) {
  const details=page.locator('#estimate-result details').filter({has:page.locator('summary').filter({hasText:'计算依据'})});
  assert.equal(await details.count(),1,'结果必须保留一个计算依据折叠区');
  assert.equal(await details.evaluate(n=>n.open),false,'依据默认折叠，而非直接铺满结果');
  await details.locator(':scope > summary').click();return details;
}
function summaryFixture() {
  const input=fixture(), base=input.groups[3];
  input.workers=[
    {...input.workers[0],name:'GPU-4090-01',agent_version:3,supports_capacity_telemetry:false,hardware:{gpus:[{name:'RTX 4090',memory_total_bytes:24*1024**3}],memory_total_bytes:95.7*1024**3}},
    {...input.workers[1],name:'GPU-4090-01',agent_version:3},
    {...input.workers[0],id:'w3',name:'GPU-5090-01',state:'busy',agent_version:4,supports_capacity_telemetry:true,hardware:{...input.workers[0].hardware,gpus:[{name:'RTX 5090',memory_total_bytes:32*1024**3}]}},
    {...input.workers[0],id:'w4',name:'GPU-5090-02',state:'online',agent_version:3,hardware:{gpus:[{name:'RTX 5090',memory_total_bytes:32*1024**3}],memory_total_bytes:96*1024**3}},
  ];
  const captured={...base,dimensions:{duration:5,width:1280,height:720,fps:24,image_count:1,steps:20},last_sample_at:NOW.getTime()/1000-100,mean_seconds:78,p90_seconds:98,cache_condition:{kind:'none',nodes:[]},model_summary:{models:[{name:'sample-main-int8.safetensors',precision:'INT8',precision_source:'filename',loader_dtype:null}],precision_label:'INT8',source:'task_snapshot',runtime_verified:false}};
  input.groups=[input.groups[0],captured,{...captured,id:'warm',mean_seconds:32,cache_condition:{kind:'loaders',nodes:[{type:'UNETLoader',id:'1'}]},last_sample_at:captured.last_sample_at-30}, {...captured,id:'image',capability:'qwen_image_21_multi',capability_name:'Qwen 多图',dimensions:{width:1024,height:1024,image_count:2,steps:8},mean_seconds:14,model_summary:{models:[{name:'sample-fp8.safetensors',precision:'FP8',precision_source:'loader',loader_dtype:'fp8_e4m3fn'}],precision_label:'FP8',source:'task_snapshot',runtime_verified:false}}, {...captured,id:'other-worker',worker_id:'w2'}, {...captured,id:'worker3',worker_id:'w3',mean_seconds:61,measured:1,model_summary:undefined}];
  return input;
}
function modelSummary(models,extra={}) {
  return {models,auxiliary_models:[],source:'task_snapshot',runtime_verified:false,complete:true,precision_label:null,...extra};
}
function evidenceFixture() {
  const input=fixture(), historical=input.groups[0];
  const pair=modelSummary([
    {name:'history-high-bf16.safetensors',role:'high_noise',precision:'BF16',precision_source:'filename',loader_dtype:'fp8_e4m3fn'},
    {name:'history-low-int8.safetensors',role:'low_noise',precision:'INT8',precision_source:'filename',loader_dtype:'default'},
  ],{auxiliary_models:[{name:'aux-vae-fp16.safetensors',role:'VAE',precision:'FP16',precision_source:'filename'},{name:'aux-clip.safetensors',role:'CLIP'},{name:'aux-lora.safetensors',role:'LoRA'}],precision_label:'不得用统一精度替代各模型'});
  const reference=modelSummary([{name:'current-main-fp8.safetensors',role:'main',precision:'FP8',precision_source:'filename'}],{source:'current_template',capability_name:'深度视频'});
  const empty={total_samples:3201,recorded_samples:0,variants:[]};
  const variant={source:'archived_task',summary:pair,samples:20,measured:18};
  input.groups=[
    {...historical,id:'unknown-reference',model_summary:modelSummary([],{source:'unrecorded',complete:false}),model_evidence:empty,current_model_reference:reference},
    {...historical,id:'pair',model_evidence:{total_samples:3201,recorded_samples:3201,variants:[{...variant,samples:3201,measured:2900}]},current_model_reference:reference},
    {...historical,id:'partial',model_evidence:{total_samples:3201,recorded_samples:30,variants:[variant,{source:'task_snapshot',summary:modelSummary([{name:'other-task-fp16.safetensors',role:'unrecognized',precision:'FP16',precision_source:'filename'}],{complete:false}),samples:10,measured:7}]},current_model_reference:reference},
    {...historical,id:'empty-reference',model_evidence:empty,current_model_reference:modelSummary([],{source:'current_template',capability_name:'动态模型工具',complete:false})},
    {...historical,id:'no-reference',model_evidence:empty},
  ];
  return input;
}
function realStoreReport(withModelEvidence=false,withOutputResolution=false) {
  // 真正调用 CapacityStore，只创建内存 SQLite；不启动服务、不读取项目数据库。
  const script = `
import json, sqlite3, sys, threading, time
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0, sys.argv[1])
from server.capacity import CapacityStore, make_spec
connection = sqlite3.connect(':memory:')
connection.row_factory = sqlite3.Row
connection.executescript('''
CREATE TABLE workers (id TEXT PRIMARY KEY, name TEXT, last_seen REAL, comfy_online INTEGER, busy INTEGER, capabilities_json TEXT);
CREATE TABLE cost_events (job_id TEXT PRIMARY KEY, event_kind TEXT, capability TEXT, worker_id TEXT, status TEXT, created_at REAL, runtime_seconds REAL, dimensions_json TEXT);
''')
store = CapacityStore(SimpleNamespace(db=connection, lock=threading.RLock(), offline_seconds=30))
now = float(sys.argv[3]) - 300
caps = {'host_id':'contract-host','environment_id':'contract-env-v1','model_version':'contract-model-v1','telemetry':{'cpu':{'model':'契约 CPU','architecture':'x86_64','logical_cores':16},'os':{'name':'契约系统','release':'v1','version':'release-1'},'memory':{'total_bytes':64*1024**3},'gpus':[{'name':'契约 GPU','memory_total_bytes':24*1024**3}]}}
worker = {'id':'contract-worker','name':'契约机器','last_seen':time.time(),'comfy_online':1,'busy':0,'capabilities_json':json.dumps(caps)}
connection.execute('INSERT INTO workers VALUES (:id,:name,:last_seen,:comfy_online,:busy,:capabilities_json)',worker)
# 固定测试时钟，让人工补录先于任务发生；不回溯修改数据库或替换 Store 接口。
with patch('server.capacity.time.time', return_value=now-1):
    profile = store.update_worker(worker['id'], {'disk':'2TB 契约磁盘','note':'契约备注不进入配置快照'})
graph = {'1':{'class_type':'CheckpointLoaderSimple','inputs':{'ckpt_name':'contract-model.safetensors'}},'2':{'class_type':'KSampler','inputs':{'model':['1',0],'steps':20,'seed':42}},'3':{'class_type':'SaveImage','inputs':{'images':['2',0],'filename_prefix':'synthetic'}}}
params = {'workflow_version':'contract-workflow-v1','model_version':'contract-model-v1','output_kind':'image','output_count':1,'steps':20}
payload = {'capability':'zimage_t2i','graph':graph,'capacity_spec':make_spec('zimage_t2i',params,graph,{'width':512,'height':512})}
for index, benchmark in enumerate([None,'contract-bench-a','contract-bench-b']):
    job = 'contract-job-' + str(index)
    assigned = now + index * 30 + 1
    store.enqueue(job,payload,assigned)
    store.assigned(job,worker,'lease-'+job,assigned)
    store.running(job,worker['id'],'lease-'+job,assigned+1)
    store.terminal(job,worker['id'],'lease-'+job,'done',assigned+11,released=True,outputs=[{'key':job+'-output','kind':'image','bytes':1024,'width':512,'height':512,'valid':True}],measurements={'prepare_seconds':1,'execute_seconds':8,'upload_seconds':1,'total_seconds':10,'graph_changed':False,'cached_nodes':[]})
    if benchmark:
        store.review(job,{'accepted':1,'source':'standard','benchmark_id':benchmark,'note':'人工标签'})
connection.execute('INSERT INTO cost_events VALUES (?,?,?,?,?,?,?,?)',('contract-history','generation','zimage_t2i',worker['id'],'done',now-100,20,json.dumps({'width':512,'height':512})))
baseline = None
if sys.argv[2] == 'outputs':
    from pathlib import Path
    graph = json.loads((Path(sys.argv[1]) / 'graphs/minimax_h3_ref_2pass.api.json').read_text())
    capability = 'minimax_h3_ref_2pass'
    def output(key, kind='video', width=1280, height=720, valid=True):
        return {'key':key,'kind':kind,'bytes':1024,'width':width,'height':height,'duration':2,'valid':valid}
    cases = [
        ('actual-h3', 2, [output('720p')], 78),
        ('multi-a', 3, [output('landscape'), output('landscape-2'), output('portrait', width=720, height=1280), output('image', kind='image', width=1024, height=768)], 60),
        ('multi-b', 3, [output('landscape-b')], 100),
        ('partial-a', 4, [output('known'), output('unknown', width=None, height=None, valid=False)], 70),
        ('partial-b', 4, None, 90),
        ('all-partial', 5, [output('known'), output('unknown', width=None, height=None, valid=False)], 65),
        ('unknown-h3', 6, None, 55),
        ('recovered-h3', 7, [output('recover', width=None, height=None, valid=False)], 45),
        ('actual-h3-1312', 8, [output('actual-1312', width=1312, height=736)], 67),
        ('actual-h3-2080', 9, [output('actual-2080', width=2080, height=1152)], 69),
    ]
    for index, (job, duration, outputs, seconds) in enumerate(cases):
        dims = {'duration':duration,'megapixels':0.91,'image_count':12,'video_count':3,'audio_count':2}
        spec = make_spec(capability, {'output_kind':'video'}, graph, dims)
        assert spec['expected'] == {'kind':'video','duration':duration}
        payload = {'capability':capability,'graph':graph,'capacity_spec':spec}
        assigned = now - 1000 + index * 10
        store.enqueue(job,payload,assigned)
        store.assigned(job,worker,'lease-'+job,assigned)
        store.running(job,worker['id'],'lease-'+job,assigned+1)
        store.terminal(job,worker['id'],'lease-'+job,'done',assigned+seconds+1,released=True,outputs=outputs,measurements={'prepare_seconds':0,'execute_seconds':seconds,'upload_seconds':0,'total_seconds':seconds,'graph_changed':False,'cached_nodes':[]})
    baseline = store.report()
    store.record_output_recovery('recovered-h3', [output('recover', width=1920, height=1080)])
if sys.argv[2] == 'evidence':
    import copy
    from server import app
    app.load_caps()
    connection.execute('CREATE TABLE dispatch_jobs (job_id TEXT PRIMARY KEY, payload_json TEXT)')
    for job, runtime in [('contract-history-other', 40), ('contract-history-unknown', 60)]:
        connection.execute('INSERT INTO cost_events VALUES (?,?,?,?,?,?,?,?)',(job,'generation','zimage_t2i',worker['id'],'done',now-100,runtime,json.dumps({'width':512,'height':512})))
    baseline = store.report()
    pair = copy.deepcopy(graph)
    pair['1']['inputs'].update(ckpt_name='contract-first-bf16.safetensors',weight_dtype='fp8_e4m3fn')
    pair['4'] = {'class_type':'UNETLoader','inputs':{'unet_name':'contract-second-int8.safetensors'}}
    pair['5'] = {'class_type':'KSampler','inputs':{'model':['4',0],'latent_image':['2',0]}}
    pair['3']['inputs']['images'] = ['5',0]
    other = copy.deepcopy(graph)
    other['1']['inputs']['ckpt_name'] = 'contract-other-fp16.safetensors'
    for job, archived_graph in [('contract-history', pair), ('contract-history-other', other)]:
        connection.execute('INSERT INTO dispatch_jobs VALUES (?,?)',(job,json.dumps({'capability':'zimage_t2i','graph':archived_graph})))
    report = store.report()
    template = copy.deepcopy(graph)
    template['1']['inputs']['ckpt_name'] = 'contract-current-fp8.safetensors'
    assert app.CAPS['zimage_t2i']['kind'] == 'gen'
    with patch('pathlib.Path.read_text', return_value=json.dumps(template)):
        report = app.capacity_model_references(report)
else:
    report = store.report()
estimates = {g['id']:store.estimate({'mode':'historical','quality':'technical','worker_id':worker['id'],'to':float(sys.argv[3]),'hours':8,'availability':1,'utilization':0.75,'demands':[{'group_id':g['id'],'quantity':100}]}) for g in report['groups']}
standards = [g for g in report['groups'] if g['source'] == 'standard']
try:
    store.estimate({'mode':'historical','quality':'technical','worker_id':worker['id'],'to':float(sys.argv[3]),'hours':8,'availability':1,'utilization':0.75,'demands':[{'group_id':g['id'],'quantity':1} for g in standards]})
    raise AssertionError('真实后端不得允许跨标准编号混算')
except ValueError as error:
    mixed_error = str(error)
print(json.dumps({'report':report,'write':profile,'baseline':baseline,'estimates':estimates,'mixed_error':mixed_error},ensure_ascii=False))
connection.close()
`;
  return JSON.parse(execFileSync(process.env.CHOUKA_TEST_PYTHON || 'python3',['-c',script,path.join(__dirname,'..'),withOutputResolution?'outputs':withModelEvidence?'evidence':'basic',String(NOW.getTime()/1000)],{encoding:'utf8'}));
}
const estimateResponse = {mode:'historical',quality:'technical',worker_id:'w1',total_seconds:12000,daily_capacity_seconds:8*3600*1*.75,machines:1,price_total:null,lines:[{group_id:'h1',quantity:100,seconds_per_unit:60,daily_units:360},{group_id:'h2',quantity:100,seconds_per_unit:60,daily_units:360}],warnings:['测算响应警告一','测算响应警告二'],assumptions:['未包含模型切换','单机并发槽位为一']};
const tick = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const loaded = page => page.waitForFunction(() => document.querySelector('#refresh-state').textContent.startsWith('最后刷新'));
function assertHistoryQuery(query, to=NOW, offset=0) {
  assert.deepEqual(query,{to:String(Math.floor(to.getTime()/1000)),limit:'100',offset:String(offset)});
}
function assertEstimateRange(body, query) {
  assert.equal(body.to,Number(query.to));
  assert.equal(Object.hasOwn(body,'from'),false);
  assert.equal(Object.hasOwn(body,'capability'),false);
  assert.ok(body.worker_id,'测算仍须指定独立执行端');
}
async function refresh(page) {
  const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/capacity');
  await page.locator('#refresh').click();await response;await loaded(page);
}
async function purchase(page) {await page.locator('#tab-purchase').click();await page.locator('.demand-quantity').first().fill('100');}
async function calculate(page) {await page.locator('#estimate-submit').click();await page.waitForFunction(() => !document.querySelector('#export-estimate').disabled);}
const MATRIX_FIELDS=['任务规格','模型名称','模型精度','平均生成时间','样本与详情'];
async function assertComparisonTable(page) {
  const table=page.locator('#summary-machines table.simple-table.matrix-table');
  assert.equal(await table.count(),1);assert.equal(await page.locator('#summary-machines table').count(),1);
  assert.equal(await table.locator('thead').count(),1);assert.equal(await table.locator('thead tr').count(),1);assert.equal(await table.locator('tbody').count(),1);
  assert.equal(await table.locator('thead > tr > th.business-axis[scope=col]').innerText(),'业务能力');
  assert.equal(await page.locator('#summary-machines article.machine-strip, #summary-machines tbody.machine-group, #summary-machines [rowspan], #summary-machines [colspan]').count(),0);
  const layout=await table.evaluate(table=>{
    const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right};};
    const header=node=>({id:node.id,scope:node.scope,axis:node.classList.contains('business-axis'),worker:node.dataset.summaryWorkerId,heading:node.classList.contains('machine-heading'),...rect(node)});
    return {display:getComputedStyle(table).display,headers:[...table.tHead.rows[0].cells].map(header),rows:[...table.tBodies[0].rows].map(row=>({
      capability:row.dataset.capability,row:row.classList.contains('capability-row'),display:getComputedStyle(row).display,axis:header(row.cells[0]),
      cells:[...row.cells].slice(1).map(cell=>{
        const business=cell.querySelector('.business-row'),button=business?.querySelector('button'),detail=button?document.getElementById(button.getAttribute('aria-controls')):null;
        return {tag:cell.tagName,result:cell.classList.contains('machine-result'),worker:cell.dataset.summaryWorkerId,headers:cell.getAttribute('headers')?.split(/\s+/).filter(Boolean),...rect(cell),
          business:business?{tag:business.tagName,capability:business.dataset.capability,selected:business.dataset.selectedGroupId,select:business.querySelector('select')?.value,fields:[...business.querySelectorAll('[data-label]')].map(n=>({tag:n.tagName,label:n.dataset.label})),expanded:button.getAttribute('aria-expanded')}:null,
          detail:detail?{id:detail.id,tag:detail.tagName,summary:detail.classList.contains('summary-evidence'),sameCell:detail.parentElement===cell,next:business.nextElementSibling===detail,hidden:detail.hidden,...rect(detail)}:null};
      }),
    }))};
  });
  assert.equal(layout.display,'table');assert.ok(layout.headers.length>1);assert.ok(layout.rows.length>0);
  const machines=layout.headers.slice(1),ids=new Set(),details=new Set();
  machines.forEach((machine,index)=>{
    assert.equal(machine.id,`summary-machine-${index+1}`);assert.equal(machine.scope,'col');assert.equal(machine.heading,true);assert.ok(machine.worker);assert.equal(ids.has(machine.id),false);ids.add(machine.id);
  });
  for(const row of layout.rows) {
    assert.equal(row.row,true);assert.equal(row.display,'table-row');assert.equal(row.axis.scope,'row');assert.equal(row.axis.axis,true);assert.ok(row.axis.id);assert.equal(ids.has(row.axis.id),false);ids.add(row.axis.id);
    assert.ok(Math.abs(row.axis.left-layout.headers[0].left)<1,'业务轴与左上角保持对齐');assert.equal(row.cells.length,machines.length);
    row.cells.forEach((cell,index)=>{
      const machine=machines[index];assert.equal(cell.tag,'TD');assert.equal(cell.result,true);assert.equal(cell.worker,machine.worker);
      assert.deepEqual([...cell.headers].sort(),[machine.id,row.axis.id].sort(),'交叉格同时关联正确机器列头和业务行头');
      assert.ok(Math.abs(cell.left-machine.left)<1 && Math.abs(cell.right-machine.right)<1,'机器列与其所有业务格对齐');
      if(!cell.business){assert.equal(cell.detail,null);return;}
      assert.equal(cell.business.tag,'DIV');assert.equal(cell.business.capability,row.capability);assert.equal(cell.business.selected,cell.business.select);
      assert.deepEqual(cell.business.fields.map(field=>field.label).sort(),[...MATRIX_FIELDS].sort());assert.ok(cell.business.fields.every(field=>field.tag==='DIV'));
      const detail=cell.detail;assert.ok(detail);assert.equal(detail.tag,'DIV');assert.equal(detail.summary,true);assert.equal(detail.sameCell,true);assert.equal(detail.next,true);
      assert.equal(details.has(detail.id),false,'每格详情ID必须唯一');details.add(detail.id);assert.equal(cell.business.expanded,String(!detail.hidden));
      if(!detail.hidden)assert.ok(detail.left>=cell.left && detail.right<=cell.right,'展开详情只占本机器交叉格，不串到其它列');
    });
  }
}
async function waitMatrixScroll(page) {
  // 等键盘滚动动画自然结束，再定位截图；不能用瞬时 scrollLeft=0 掩盖仍在进行的动画。
  await page.locator('#summary-machines .scroll').evaluate(node=>new Promise((resolve,reject)=>{
    let left=node.scrollLeft,top=node.scrollTop,stable=0;const started=performance.now();
    function frame() {
      if(node.scrollLeft===left && node.scrollTop===top)stable++;else stable=0;
      left=node.scrollLeft;top=node.scrollTop;
      if(stable>=12)return resolve();
      if(performance.now()-started>4000)return reject(new Error('矩阵滚动未稳定'));
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }));
}
async function positionMatrix(page,end=false) {
  await waitMatrixScroll(page);
  await page.locator('#summary-machines .scroll').evaluate((node,end)=>node.scrollTo({left:end?node.scrollWidth:0,top:0,behavior:'instant'}),end);
  await waitMatrixScroll(page);
  assert.equal(await page.locator('#summary-machines .scroll').evaluate(node=>node.scrollLeft),end?await page.locator('#summary-machines .scroll').evaluate(node=>node.scrollWidth-node.clientWidth):0);
}
async function assertQuietModelCells(page) {
  const cells=page.locator('#summary-machines .business-row [data-label="模型名称"], #summary-machines .business-row [data-label="模型精度"]');
  assert.ok(await cells.count()>0);
  assert.equal(await cells.locator('.warn, .model-origin, .model-role, .model-context, .model-coverage').count(),0,'模型两列不能残留来源、角色、组合、覆盖或警告节点，包括隐藏节点');
  for(const cell of await cells.all()) {
    const leaves=cell.locator('.model-name, .model-label, .muted');
    assert.equal(await cell.textContent(),(await leaves.allTextContents()).join(''),'名称和精度之外不能存在可见或隐藏的说明文字');
    assert.ok(await leaves.evaluateAll(nodes=>nodes.every(node=>node.childElementCount===0)),'名称和精度须为纯文本叶节点');
  }
  const colors=await cells.evaluateAll(cells=>cells.flatMap(cell=>[cell,...cell.querySelectorAll('*')].filter(node=>node.textContent.trim()).map(node=>({text:node.textContent,color:getComputedStyle(node).color}))));
  for(const item of colors) {
    const rgb=item.color.match(/[\d.]+/g).slice(0,3).map(Number),[r,g,b]=rgb;
    assert.equal(r>140 && g>90 && b<Math.min(r,g)*.85,false,'模型列不得计算成黄色：'+item.color+' '+item.text);
  }
}
async function assertMaterialSpec(row,materials,parameters) {
  const spec=row.locator('.selected-spec');
  assert.equal(await spec.count(),1);
  assert.deepEqual(await spec.evaluate(node=>({tag:node.tagName,children:[...node.children].map(n=>n.tagName),labels:[...node.querySelectorAll('dt')].map(n=>n.textContent)})),
    {tag:'DL',children:['DT','DD','DT','DD','DT','DD'],labels:['输入素材','生成参数','实际成品']},'必须使用真实定义列表，不能用段落或样式模拟语义');
  const inputs=spec.locator(':scope > dd.input-materials'),output=spec.locator(':scope > dd.generation-parameters');
  assert.deepEqual(await inputs.locator(':scope > span').allTextContents(),materials);
  assert.equal(await inputs.textContent(),materials.join(''));
  assert.ok(await inputs.evaluate(n=>[...n.childNodes].every(s=>s.nodeName==='SPAN' && s.childNodes.length===1 && s.firstChild.nodeType===Node.TEXT_NODE)),'输入素材只能包含纯文本 span');
  assert.equal(await output.textContent(),parameters);assert.equal(await output.locator('*').count(),0);
  assert.equal(await row.locator('select option:checked').textContent(),materials.join(' + ')+'｜'+parameters);
}
async function assertModelLabels(row,names,labels) {
  const nameCell=row.locator('[data-label="模型名称"]'),precisionCell=row.locator('[data-label="模型精度"]');
  assert.deepEqual(await nameCell.locator('.model-name').allTextContents(),names);
  assert.deepEqual(await precisionCell.locator('.model-item').evaluateAll(nodes=>nodes.map(node=>[...node.querySelectorAll('.model-label')].map(label=>label.textContent))),labels);
  assert.equal(await nameCell.textContent(),names.length?names.join(''):'未获取到模型信息');
  assert.equal(await precisionCell.textContent(),labels.length?labels.flat().join(''):'无');
}

test('产能看板语法与离线路由专项', async t => {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(Boolean);
  for(const script of scripts) execFileSync(process.execPath,['--check','-'],{input:script});
  const browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER?{channel:process.env.CHOUKA_TEST_BROWSER}:{});
  const contexts=[];
  async function setup(options={}) {
    const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:options.timezone || 'Asia/Shanghai',acceptDownloads:true});contexts.push(context);
    const page=await context.newPage();page.setDefaultTimeout(7000);await page.clock.setFixedTime(NOW);
    const state={data:fixture(),gets:[],posts:[],exports:[],errors:[],getError:false,estimateError:false,reviewError:false,profileError:false,holdGet:null,holdEstimate:null};
    if(options.data)state.data=options.data;
    page.on('pageerror',e=>state.errors.push(e.message));
    await context.route('**/*',async route=>{
      const request=route.request(),url=new URL(request.url());
      assert.equal(url.origin,'http://capacity.test','测试不允许连接外部服务');
      const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
      if(url.pathname==='/auth.js')return route.fulfill({contentType:'text/javascript',body:readFileSync(path.join(web,'auth.js'),'utf8')});
      if(url.pathname==='/api/auth/me')return json({user:{id:'admin',username:'合成管理员',role:options.role || 'admin'},csrf_token:'synthetic-csrf'});
      if(url.pathname==='/api/capacity') {
        state.gets.push(Object.fromEntries(url.searchParams));
        if(state.holdGet)return state.holdGet(route,url);
        if(state.getError)return json({error:'合成读取失败'},500);
        const result=structuredClone(state.data);
        if(Number(url.searchParams.get('offset'))>=100)result.details=[{...result.details[0],job_id:'page-2-job'}];
        return json(result);
      }
      if(url.pathname==='/api/capacity/estimate') {
        state.posts.push({path:url.pathname,body:request.postDataJSON(),csrf:request.headers()['x-csrf-token']});
        if(state.holdEstimate)return state.holdEstimate(route);
        if(state.estimateError)return json({error:'合成证据不足，无法测算'},422);
        const payload=request.postDataJSON();
        assertFixedPayload(payload);
        const selected=payload.demands.map(d=>state.data.groups.find(g=>g.id===d.group_id));
        assert.ok(selected.every(g=>g && g.worker_id===payload.worker_id && g.mean_seconds>0 && g.measured>0));
        assert.equal(new Set(selected.map(bucket)).size,1,'接口不接受跨配置/来源/标准编号混算');
        assert.ok(selected.every(g=>PURCHASE_MODES.some(m=>m[2].includes(g.capability))),'工具箱、未知与 API 不得绕过模式限制');
        if(options.realEstimates) {
          assert.equal(payload.demands.length,1);assert.equal(payload.demands[0].quantity,100);assert.equal(payload.hours,8);assert.equal(payload.to,NOW.getTime()/1000);
          const actual=options.realEstimates[payload.demands[0].group_id];assert.ok(actual,'真实 CapacityStore 必须支持所选组');return json(actual);
        }
        const daily=payload.hours*3600*payload.availability*payload.utilization;
        const lines=payload.demands.map((demand,index)=>({...demand,seconds_per_unit:selected[index].mean_seconds,daily_units:daily/selected[index].mean_seconds}));
        const total=lines.reduce((sum,line)=>sum+line.quantity*line.seconds_per_unit,0),machines=Math.ceil(total/daily);
        return json({...estimateResponse,worker_id:payload.worker_id,total_seconds:total,daily_capacity_seconds:daily,machines,price_total:payload.price==null?null:machines*payload.price,lines});
      }
      if(url.pathname.startsWith('/api/capacity/workers/')) {
        const body=request.postDataJSON();state.posts.push({path:url.pathname,body,csrf:request.headers()['x-csrf-token']});
        const allowed=['host_id','cpu','memory_total_bytes','environment_id','model_version','disk','note'];
        if(Object.keys(body).some(key=>!allowed.includes(key)))return json({error:'补录含未约定字段'},400);
        if(state.profileError)return json({error:'合成配置保存失败'},400);
        const worker=state.data.workers.find(w=>w.id===decodeURIComponent(url.pathname.split('/').at(-1)));
        Object.assign(worker.hardware,body);worker.hardware_source='manual+reported';
        return json({id:'manual-config-version',worker_id:worker.id,source:'manual',hardware:worker.hardware});
      }
      if(url.pathname.endsWith('/probe-outputs')) {
        assert.equal(request.method(),'POST');
        state.posts.push({path:url.pathname,body:request.postDataJSON(),csrf:request.headers()['x-csrf-token']});
        if(state.holdProbe)return state.holdProbe(route);
        if(state.probeError)return json({error:state.probeError.message},state.probeError.status);
        return json(state.probeResult || {processed:4,recorded:3,total:6,next_offset:4});
      }
      if(url.pathname.endsWith('/review')) {
        const body=request.postDataJSON();state.posts.push({path:url.pathname,body,csrf:request.headers()['x-csrf-token']});
        if(state.reviewError)return json({error:'合成验收保存失败'},409);
        state.data.details.find(d=>d.job_id==='captured-job').review=body;return json({ok:true});
      }
      if(url.pathname==='/api/capacity/export') {state.exports.push(Object.fromEntries(url.searchParams));return route.fulfill({contentType:'text/csv',headers:{'Content-Disposition':'attachment; filename="capacity.csv"'},body:'类别,数量\n合成,1'});}
      const controllerPayloads={'/api/health':{mode:'controller',ok:true},'/api/status':{running_count:0,queued_count:0},'/api/workers':{workers:[]},'/api/jobs':{jobs:[]},'/api/projects':{projects:[]}};
      if(controllerPayloads[url.pathname])return json(controllerPayloads[url.pathname]);
      if(url.pathname==='/controller')return route.fulfill({contentType:'text/html',body:readFileSync(path.join(web,'controller.html'),'utf8')});
      if(url.pathname==='/controller/capacity')return route.fulfill({contentType:'text/html',body:html});
      return route.fulfill({contentType:'text/html',body:'<!doctype html><title>合成目标</title>'});
    });
    await page.goto('http://capacity.test'+(options.controller?'/controller':'/controller/capacity'));
    if(!options.controller && options.role!=='user') {
      await loaded(page);
      if(options.technical)await page.locator('#technical-details > summary').click();
      if(options.evidence)await page.locator('#task-evidence > summary').click();
    }
    return {page,state,context};
  }
  // 原有完整统计与编辑流程显式展开入口，简明首页用 setup 验证真实默认状态。
  const setupAdvanced = options => setup({...options,technical:true,evidence:true});
  const setupPurchase = options => setupAdvanced({data:purchaseFixture(),...options});
  try {
    await t.test('简明首页默认折叠技术与任务证据，仅展示当前在线和全部历史业务',async()=>{
      const {page,state}=await setup({data:summaryFixture()});
      for(const id of ['technical-details','task-evidence'])assert.equal(await page.locator('#'+id).evaluate(n=>n.open),false);
      assert.equal(await page.locator('#workers').isVisible(),false);assert.equal(await page.locator('#details').isVisible(),false);
      assert.equal(await page.locator('#online-count').innerText(),'当前在线 3 台');assert.equal(await page.locator('#summary-machines thead th.machine-heading').count(),3);
      assert.equal(await page.locator('[data-summary-worker-id=w2]').count(),0);assert.equal(await page.locator('[data-summary-worker-id=w1] .business-row').count(),2);
      const main=await page.locator('#machine-summary').innerText();assert.match(main,/历史.*业务/);assert.doesNotMatch(main,/所选时间段/);assert.match(main,/不代表当前均可执行/);assert.match(main,/非纯 GPU 耗时/);assert.doesNotMatch(main,/Worker ID|config-1|runtime|eligible/);assert.match(main,/sample-main-int8\.safetensors/);
      assert.equal(await page.locator('#summary-machines table').count(),1);assert.equal(await page.locator('#summary-machines thead').count(),1);
      await assertComparisonTable(page);
      assert.match(await page.locator('.summary-note').innerText(),/同一业务.*规格.*模型.*采样条件不同.*不能.*性能排名/s);
      const empty=page.locator('td.machine-result[data-summary-worker-id=w4]');assert.equal(await empty.count(),2);
      for(const text of await empty.allInnerTexts()){assert.match(text,/暂无记录；不据此推断是否支持该业务。/);assert.doesNotMatch(text,/该时间范围|0 秒|0 次/);}
      assert.equal(await empty.locator('.business-row, select').count(),0);
      if(process.env.CHOUKA_TEST_SCREENSHOT){await positionMatrix(page);const file=path.parse(process.env.CHOUKA_TEST_SCREENSHOT);await page.screenshot({path:path.join(file.dir,file.name+'-summary-desktop.png'),fullPage:true});}
      assert.deepEqual(state.errors,[]);
    });
    await t.test('机器列与业务行组成单一语义矩阵，各交叉格模型绑定正确且展开详情不串位',async()=>{
      const input=summaryFixture(),{page,state}=await setup({data:input});
      await assertComparisonTable(page);
      assert.deepEqual(await page.locator('#summary-machines thead th.machine-heading').evaluateAll(nodes=>nodes.map(n=>n.dataset.summaryWorkerId)),['w1','w3','w4']);
      const rows=page.locator('#summary-machines .business-row');
      for(let index=0;index<await rows.count();index++) {
        const row=rows.nth(index),button=row.locator('button'),detail=page.locator('#'+await button.getAttribute('aria-controls'));
        const worker=await row.evaluate(n=>n.closest('td').dataset.summaryWorkerId),capability=await row.getAttribute('data-capability');
        assert.deepEqual((await row.locator('option').evaluateAll(nodes=>nodes.map(n=>n.value))).sort(),input.groups.filter(g=>g.worker_id===worker && g.capability===capability).map(g=>g.id).sort());
        const selectedId=await row.getAttribute('data-selected-group-id'),selected=input.groups.find(g=>g.id===selectedId);
        assert.deepEqual(await row.locator('.model-name').allTextContents(),selected.model_summary?.models.map(m=>m.name) || []);
        assert.equal(await button.getAttribute('aria-expanded'),'false');assert.equal(await detail.isVisible(),false);
        const others=await rows.evaluateAll((nodes,index)=>nodes.filter((_,i)=>i!==index).map(n=>({text:n.innerText,selected:n.dataset.selectedGroupId,expanded:n.querySelector('button').getAttribute('aria-expanded')})),index);
        await button.click();assert.equal(await button.getAttribute('aria-expanded'),'true');assert.equal(await detail.isVisible(),true);
        assert.ok((await detail.innerText()).includes('采样编号：'+selected.id));
        assert.deepEqual(await rows.evaluateAll((nodes,index)=>nodes.filter((_,i)=>i!==index).map(n=>({text:n.innerText,selected:n.dataset.selectedGroupId,expanded:n.querySelector('button').getAttribute('aria-expanded')})),index),others);
        await assertComparisonTable(page);
      }
      await page.locator('th.machine-heading[data-summary-worker-id=w1] .machine-more summary').click();await assertComparisonTable(page);
      for(let index=0;index<await rows.count();index++)await rows.nth(index).locator('button').click();
      await assertComparisonTable(page);
      await page.locator('#include-offline').check();await assertComparisonTable(page);
      assert.equal(await page.locator('#summary-machines thead th.machine-heading').count(),4);assert.deepEqual(state.errors,[]);
    });
    await t.test('相同业务在不同电脑独立切换规格，名称精度耗时样本与展开详情互不串改',async()=>{
      const input=summaryFixture(),worker3=input.groups.find(g=>g.id==='worker3');
      input.groups.push({...worker3,id:'worker3-alternate',mean_seconds:19,measured:6,cache_condition:{kind:'loaders',nodes:[{id:'7',type:'UNETLoader'}]},last_sample_at:worker3.last_sample_at-60,model_summary:modelSummary([{name:'worker3-only-fp16.safetensors',precision:'FP16',precision_source:'filename'}])});
      const {page,state}=await setup({data:input});
      const first=page.locator('td.machine-result[data-summary-worker-id=w1] .business-row[data-capability=depth_video]'),other=page.locator('td.machine-result[data-summary-worker-id=w3] .business-row[data-capability=depth_video]');
      await first.locator('button').click();await other.locator('button').click();
      const firstDetail=page.locator('#'+await first.locator('button').getAttribute('aria-controls')),otherDetail=page.locator('#'+await other.locator('button').getAttribute('aria-controls'));
      assert.notEqual(await firstDetail.getAttribute('id'),await otherDetail.getAttribute('id'));
      const untouched={row:await other.innerText(),detail:await otherDetail.innerText(),selected:await other.locator('select').inputValue()};
      await first.locator('select').selectOption('warm');
      assert.equal(await first.getAttribute('data-selected-group-id'),'warm');assert.match(await first.innerText(),/32 秒/);assert.match(await firstDetail.innerText(),/采样编号：warm/);
      assert.deepEqual({row:await other.innerText(),detail:await otherDetail.innerText(),selected:await other.locator('select').inputValue()},untouched);
      const preserved={row:await first.innerText(),detail:await firstDetail.innerText()};
      await other.locator('select').selectOption('worker3-alternate');
      assert.equal(await other.getAttribute('data-selected-group-id'),'worker3-alternate');
      for(const text of ['worker3-only-fp16.safetensors','FP16','19 秒','仅 6 次'])assert.ok((await other.innerText()).includes(text),text);
      assert.match(await otherDetail.innerText(),/采样编号：worker3-alternate/);
      assert.deepEqual({row:await first.innerText(),detail:await firstDetail.innerText()},preserved);
      assert.equal(await first.locator('button').getAttribute('aria-expanded'),'true');assert.equal(await other.locator('button').getAttribute('aria-expanded'),'true');
      await assertComparisonTable(page);assert.equal(state.gets.length,1);assert.deepEqual(state.posts,[]);assert.deepEqual(state.errors,[]);
    });
    await t.test('矩阵按可见机器业务ID并集建行，同名列与同名业务不合并，离线切换和刷新重绑正确',async()=>{
      const input=summaryFixture(),base=input.groups[1];input.workers[2].name=input.workers[0].name;
      const group=(id,worker_id,capability,mean_seconds)=>({...base,id,worker_id,capability,capability_name:'同名合成业务',mean_seconds,model_summary:modelSummary([{name:id+'-fp16.safetensors',precision:'FP16',precision_source:'filename'}])});
      input.groups=[group('w1-shared','w1','shared',11),group('w3-shared','w3','shared',22),group('w3-only','w3','same-title-other-id',33),group('w2-offline','w2','offline-only',44)];
      const {page,state}=await setup({data:input});
      const axes=()=>page.locator('#summary-machines tbody > tr.capability-row').evaluateAll(nodes=>nodes.map(n=>n.dataset.capability).sort());
      const columns=()=>page.locator('#summary-machines thead .machine-heading').evaluateAll(nodes=>nodes.map(n=>n.dataset.summaryWorkerId));
      assert.deepEqual(await axes(),['same-title-other-id','shared']);assert.deepEqual(await columns(),['w1','w3','w4']);
      assert.equal(new Set(await page.locator('#summary-machines thead .machine-heading h3').allTextContents()).size,2);
      assert.deepEqual(await page.locator('#summary-machines tbody th.business-axis').allTextContents(),['同名合成业务','同名合成业务']);
      const empty=page.locator('tr.capability-row[data-capability=same-title-other-id] td[data-summary-worker-id=w1]');
      assert.equal(await empty.innerText(),'暂无记录；不据此推断是否支持该业务。');assert.equal(await empty.locator('.business-row, select, button, .summary-evidence, .mean-time').count(),0);assert.doesNotMatch(await empty.innerText(),/0|不支持/);
      await assertComparisonTable(page);
      await page.locator('#include-offline').check();assert.deepEqual(await columns(),['w1','w2','w3','w4']);assert.deepEqual(await axes(),['offline-only','same-title-other-id','shared']);await assertComparisonTable(page);
      const offline=page.locator('td[data-summary-worker-id=w2] .business-row[data-capability=offline-only]');assert.match(await offline.innerText(),/w2-offline-fp16/);assert.match(await offline.innerText(),/44 秒/);
      await page.locator('#include-offline').uncheck();assert.deepEqual(await axes(),['same-title-other-id','shared']);assert.equal(await page.locator('[data-summary-worker-id=w2]').count(),0);
      state.data.workers.find(w=>w.id==='w3').state='offline';await refresh(page);
      assert.deepEqual(await columns(),['w1','w4']);assert.deepEqual(await axes(),['shared']);assert.equal(await page.locator('[data-summary-worker-id=w3]').count(),0);await assertComparisonTable(page);
      // 重排列并让之前的空格获得业务，防止旧闭包、机器下标或详情ID错绑。
      state.data.workers=[state.data.workers[3],state.data.workers[0],state.data.workers[1],state.data.workers[2]];
      state.data.groups=[group('w4-new','w4','shared',55),group('w1-new','w1','shared',56)];await refresh(page);
      assert.deepEqual(await columns(),['w4','w1']);await assertComparisonTable(page);
      for(const [worker,id,seconds] of [['w4','w4-new',55],['w1','w1-new',56]]) {
        const content=page.locator(`td.machine-result[data-summary-worker-id=${worker}] .business-row`);
        assert.equal(await content.getAttribute('data-selected-group-id'),id);assert.equal(await content.locator('select').inputValue(),id);
        assert.equal(await content.locator('.model-name').innerText(),id+'-fp16.safetensors');assert.match(await content.innerText(),new RegExp(seconds+' 秒'));
        await content.locator('button').click();const detail=page.locator('#'+await content.locator('button').getAttribute('aria-controls'));
        assert.ok((await detail.innerText()).includes('采样编号：'+id));assert.equal(await detail.evaluate(n=>n.parentElement.dataset.summaryWorkerId),worker);
      }
      await assertComparisonTable(page);assert.deepEqual(state.errors,[]);
    });
    await t.test('在线机器无历史仍保留每列及历史记录空行，无在线机器不创建空矩阵',async()=>{
      const input=summaryFixture();input.groups=input.groups.filter(g=>g.worker_id==='w2');
      const {page,state}=await setup({data:input});await assertComparisonTable(page);
      assert.equal(await page.locator('#summary-machines tr.capability-row').count(),1);assert.equal(await page.locator('#summary-machines tbody th.business-axis').innerText(),'历史记录');
      assert.equal(await page.locator('#summary-machines td.machine-result').count(),3);
      assert.ok((await page.locator('#summary-machines td.machine-result').allInnerTexts()).every(text=>text==='暂无记录；不据此推断是否支持该业务。'));
      assert.equal(await page.locator('#summary-machines .business-row, #summary-machines select').count(),0);
      state.data.workers.forEach(w=>w.state='offline');await refresh(page);
      assert.equal(await page.locator('#summary-machines table').count(),0);assert.match(await page.locator('#summary-machines .empty').innerText(),/当前没有在线机器/);
      await page.locator('#include-offline').check();assert.equal(await page.locator('#summary-machines thead .machine-heading').count(),4);await assertComparisonTable(page);assert.deepEqual(state.errors,[]);
    });
    await t.test('所有模型状态两列仅名称与精度，部分历史链说明只在详情保留原文',async()=>{
      const input=evidenceFixture();
      input.groups.push({...input.groups[2],id:'single-incomplete',model_evidence:{total_samples:3201,recorded_samples:10,variants:[input.groups[2].model_evidence.variants[1]]}});
      const {page,state}=await setup({data:input}),row=page.locator('.business-row');
      for(const group of input.groups) {await row.locator('select').selectOption(group.id);await assertQuietModelCells(page);}
      await assertModelLabels(row,['other-task-fp16.safetensors'],[['FP16']]);
      assert.doesNotMatch(await row.textContent(),/模型记录覆盖|部分模型|任务组合|不完整 \/ 未确认完整主模型链/);
      assert.match(await row.locator('[data-label="平均生成时间"] .warn').innerText(),/全组历史任务平均，非某个模型或组合专属速度/);
      await row.locator('button').click();const detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));
      assert.match(await detail.innerText(),/模型记录覆盖 10 \/ 3,201 次/);
      assert.match(await detail.innerText(),/历史任务记录组合 1 · 任务提交记录 · 10 次记录 \/ 7 次成功耗时/);
      assert.match(await detail.innerText(),/不完整 \/ 未确认完整主模型链；动态选择或未知链路不能推断全部主模型/);
      await assertQuietModelCells(page);assert.deepEqual(state.errors,[]);
    });
    await t.test('包含离线保留同名独立登记，禁用同步异常不计当前在线',async()=>{
      const input=summaryFixture();for(const state of ['disabled','syncing','error','unavailable','running'])input.workers.push({...input.workers[0],id:state,state});
      const {page,state}=await setup({data:input});assert.equal(await page.locator('#online-count').innerText(),'当前在线 4 台');assert.equal(await page.locator('#summary-machines thead th.machine-heading').count(),4);
      const gets=state.gets.length;await page.locator('#include-offline').check();assert.equal(await page.locator('#summary-machines thead th.machine-heading').count(),9);assert.equal(state.gets.length,gets);
      assert.equal(await page.locator('th.machine-heading[data-summary-worker-id=w1] > h3').innerText(),await page.locator('th.machine-heading[data-summary-worker-id=w2] > h3').innerText());
      assert.match(await page.locator('th.machine-heading[data-summary-worker-id=w2]').innerText(),/离线/);await page.locator('[data-summary-worker-id=w2] .machine-more summary').click();assert.match(await page.locator('th.machine-heading[data-summary-worker-id=w2]').innerText(),/历史速度不代表现在能执行/);
      await page.locator('#include-offline').uncheck();assert.equal(await page.locator('[data-summary-worker-id=w2]').count(),0);
    });
    await t.test('每业务保留所有独立规格与缓存组，切换联动耗时样本精度及完整证据',async()=>{
      const input=summaryFixture();input.groups[1].warnings=['警告一','警告二'];const {page}=await setup({data:input});
      const row=page.locator('td.machine-result[data-summary-worker-id=w1] .business-row[data-capability=depth_video]'),select=row.locator('select');
      assert.equal(await select.inputValue(),'c1');assert.equal(await select.locator('option').count(),3);
      const names=await select.locator('option').allTextContents();assert.equal(new Set(names).size,3);assert.ok(names.every(n=>!n.includes('depth-5s')));assert.equal(names[0],'素材信息未记录｜请求时长 5 秒');
      assert.match(await row.innerText(),/1 分 18 秒/);await assertModelLabels(row,['sample-main-int8.safetensors'],[['INT8']]);assert.match(await row.innerText(),/仅 10 次 \/ 仅供参考/);
      await row.locator('button').click();let detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));
      for(const value of ['P90：1 分 38 秒','采集业务样本','sample-main-int8.safetensors','文件标记 INT8','非运行时检测','警告一','警告二','总样本 12','失败 1','取消 1','缓存条件','配置编号：config-1'])assert.ok((await detail.innerText()).includes(value),value);
      await select.selectOption('warm');assert.match(await row.innerText(),/32 秒/);assert.match(await detail.innerText(),/UNETLoader/);
      await select.selectOption('h1');assert.match(await row.innerText(),/1 分 0 秒/);await assertModelLabels(row,[],[]);assert.match(await detail.innerText(),/历史未记录/);assert.match(await detail.innerText(),/历史运行参考/);assert.doesNotMatch(await detail.innerText(),/sample-main-int8/);
      const image=page.locator('.business-row[data-capability=qwen_image_21_multi]');await assertModelLabels(image,['sample-fp8.safetensors'],[['FP8']]);
      await image.locator('button').click();const imageDetail=page.locator('#'+await image.locator('button').getAttribute('aria-controls'));
      assert.match(await imageDetail.innerText(),/加载配置 FP8（fp8_e4m3fn）.*非运行时检测/);await assertQuietModelCells(page);
    });
    await t.test('模型名称跟随规格切换，多主模型完整展示，缺失来源不推断',async()=>{
      const input=summaryFixture();
      input.groups[2].model_summary={source:'task_snapshot',precision_label:null,models:[{name:'main-high-noise.safetensors'},{name:'main-low-noise.safetensors'}]};
      const {page,state}=await setup({data:input});
      const row=page.locator('td.machine-result[data-summary-worker-id=w1] .business-row[data-capability=depth_video]'),names=row.locator('[data-label="模型名称"]');
      assert.equal(await names.innerText(),'sample-main-int8.safetensors');
      await row.locator('select').selectOption('warm');
      assert.deepEqual(await names.locator('.model-name').allTextContents(),['main-high-noise.safetensors','main-low-noise.safetensors']);
      await assertModelLabels(row,['main-high-noise.safetensors','main-low-noise.safetensors'],[['无'],['无']]);await assertQuietModelCells(page);
      assert.doesNotMatch(await names.innerText(),/高噪声|低噪声/);
      assert.doesNotMatch(await names.innerText(),/sample-main-int8/);
      await row.locator('button').click();
      const modelDetail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));
      for(const index of [1,2])assert.match(await modelDetail.innerText(),new RegExp(`主模型 ${index}：main-.*；精度未记录 / 待确认；非运行时检测`));
      assert.equal(await page.locator('#'+await row.locator('button').getAttribute('aria-controls')).evaluate(node=>node.matches('div.summary-evidence') && node.previousElementSibling.matches('.business-row') && node.parentElement.matches('td.machine-result') && !node.hasAttribute('colspan')),true);
      await row.locator('select').selectOption('h1');assert.equal(await names.innerText(),'未获取到模型信息');
      assert.equal(await page.locator('[data-summary-worker-id=w3] [data-label="模型名称"]').innerText(),'未获取到模型信息');
      assert.equal(await page.locator('.business-row[data-capability=qwen_image_21_multi] [data-label="模型名称"]').innerText(),'sample-fp8.safetensors');
      assert.deepEqual(state.errors,[]);
      input.groups[1].model_summary.source='unrecorded';
      const unknown=await setup({data:input});
      assert.equal(await unknown.page.locator('td.machine-result[data-summary-worker-id=w1] .business-row[data-capability=depth_video] [data-label="模型名称"]').innerText(),'未获取到模型信息');
    });
    await t.test('无历史证据时模板仅展示名称精度，时间警告仍可见且完整来源覆盖保留详情',async()=>{
      const {page,state}=await setup({data:evidenceFixture()});const row=page.locator('.business-row');
      assert.equal(await row.locator('select').inputValue(),'unknown-reference');
      assert.equal(await row.locator('button').getAttribute('aria-expanded'),'false');
      await assertModelLabels(row,['current-main-fp8.safetensors'],[['FP8']]);
      assert.doesNotMatch(await row.textContent(),/模板参考|当前工具默认配置|模型记录覆盖|工具：/);
      assert.match(await row.locator('[data-label="平均生成时间"]').innerText(),/1 分 0 秒.*此处耗时来自历史任务，不代表当前模型速度/s);
      assert.equal(await row.locator('[data-label="平均生成时间"] .warn').isVisible(),true);
      assert.equal(await page.locator('#technical-details').evaluate(n=>n.open),false);
      const marker=await row.locator('[data-label="平均生成时间"] .warn').boundingBox();assert.ok(marker.y+marker.height<1000,'桌面首屏仍可看到历史时间警告');
      await assertQuietModelCells(page);
      const detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));assert.equal(await detail.isVisible(),false);
      await row.locator('button').click();assert.equal(await detail.isVisible(),true);
      assert.match(await detail.innerText(),/模型记录覆盖 0 \/ 3,201 次/);assert.match(await detail.innerText(),/文件标记 FP8.*非运行时检测/);
      assert.match(await detail.innerText(),/当前工具默认配置（非历史执行记录）· 深度视频/);
      assert.match(await detail.innerText(),/不代表用户画布节点当前选中的模型/);
      assert.match(await detail.innerText(),/不覆盖历史精度/);assert.deepEqual(state.errors,[]);
    });
    await t.test('同图两主模型名称精度逐项对应，冲突精度分别保留，角色移入详情且历史优先',async()=>{
      const {page,state}=await setup({data:evidenceFixture()});const row=page.locator('.business-row');await row.locator('select').selectOption('pair');
      const names=row.locator('[data-label="模型名称"]'),precision=row.locator('[data-label="模型精度"]');
      await assertModelLabels(row,['history-high-bf16.safetensors','history-low-int8.safetensors'],[['文件标记 BF16','加载配置 FP8（fp8_e4m3fn）'],['INT8']]);
      assert.match(await names.locator('.model-item').nth(0).innerText(),/history-high-bf16/);assert.match(await names.locator('.model-item').nth(1).innerText(),/history-low-int8/);
      assert.doesNotMatch(await precision.locator('.model-item').nth(1).innerText(),/BF16|FP8/);
      assert.doesNotMatch(await row.innerText(),/current-main|当前工具默认配置|aux-|统一精度/);
      assert.doesNotMatch(await row.textContent(),/非运行时检测|高噪声|低噪声|default/);
      assert.equal(await row.locator('.model-context').count(),0,'单一完整历史组合不显示长来源或组合编号');
      assert.doesNotMatch(await row.innerText(),/保留的原任务记录|任务记录组合|次记录 \/ .*次成功耗时/);
      await assertQuietModelCells(page);
      await row.locator('button').click();const detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));
      assert.match(await detail.innerText(),/历史任务记录组合 1 · 保留的原任务记录 · 3,201 次记录 \/ 2,900 次成功耗时/);
      assert.match(await detail.innerText(),/高噪声 · 主模型 1：history-high-bf16.*文件标记 BF16；加载配置 FP8（fp8_e4m3fn）；非运行时检测/);
      assert.match(await detail.innerText(),/低噪声 · 主模型 2：history-low-int8.*文件标记 INT8；加载配置 default（实际精度未确认）；非运行时检测/);
      for(const role of ['VAE','CLIP','LoRA'])assert.match(await detail.innerText(),new RegExp('角色：'+role));
      assert.match(await detail.innerText(),/辅助模型（不计入主模型名称或精度）/);assert.match(await detail.innerText(),/当前工具默认配置（非历史执行记录）/);
      assert.deepEqual(state.errors,[]);
    });
    await t.test('部分覆盖和多个变体是不同任务组合，不把全组均值归给任一模型；切换同步清除旧证据',async()=>{
      const {page,state}=await setup({data:evidenceFixture()});const row=page.locator('.business-row');await row.locator('select').selectOption('partial');
      assert.doesNotMatch(await row.textContent(),/模型记录覆盖|任务组合|部分模型/);
      await assertModelLabels(row,['history-high-bf16.safetensors','history-low-int8.safetensors','other-task-fp16.safetensors'],[['文件标记 BF16','加载配置 FP8（fp8_e4m3fn）'],['INT8'],['FP16']]);
      assert.doesNotMatch(await row.innerText(),/不同任务的模型组合|次记录 \/ .*次成功耗时|不完整 \/ 未确认完整主模型链|保留的原任务记录|任务提交记录/);
      for(const label of ['模型名称','模型精度']) {
        const variants=row.locator(`[data-label="${label}"] .model-variant`);
        assert.equal(await variants.count(),2);
        assert.equal(await variants.nth(0).locator('.model-item').count(),2,'第一个历史组合保留同图两个模型');
        assert.equal(await variants.nth(1).locator('.model-item').count(),1,'第二个历史组合独立保留模型');
        assert.equal(await variants.locator('.model-context').count(),0,'组合和完整度不能以隐藏节点残留');
      }
      await assertQuietModelCells(page);
      assert.match(await row.locator('[data-label="平均生成时间"]').innerText(),/全组历史任务平均，非某个模型或组合专属速度/);
      assert.doesNotMatch(await row.innerText(),/current-main|当前工具默认配置/);
      assert.equal(await row.locator('[data-label="模型名称"] .model-variant').count(),2);
      await row.locator('button').click();const detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));
      assert.match(await detail.innerText(),/模型记录覆盖 30 \/ 3,201 次/);
      assert.match(await detail.innerText(),/不同任务记录对应不同模型组合；每个组合内的主模型才属于同一个图/);assert.match(await detail.innerText(),/参考信息不补齐历史覆盖/);
      assert.match(await detail.innerText(),/历史任务记录组合 1 · 保留的原任务记录 · 20 次记录 \/ 18 次成功耗时/);
      assert.match(await detail.innerText(),/历史任务记录组合 2 · 任务提交记录 · 10 次记录 \/ 7 次成功耗时/);
      assert.match(await detail.innerText(),/不完整 \/ 未确认完整主模型链；动态选择或未知链路不能推断全部主模型/);
      await row.locator('select').selectOption('unknown-reference');assert.doesNotMatch(await row.innerText(),/history-high|history-low|INT8|BF16|other-task|全组历史任务平均/);
      await assertModelLabels(row,['current-main-fp8.safetensors'],[['FP8']]);await assertQuietModelCells(page);
      assert.doesNotMatch(await detail.innerText(),/history-high|history-low|other-task|历史任务记录组合/);
      await row.locator('select').selectOption('pair');assert.doesNotMatch(await row.innerText(),/current-main|不完整|不代表当前模型速度/);await assertQuietModelCells(page);
      // 展示仍用原工具 capability；采购另用真实生成路由，不让工具箱继续参与采购。
      await page.locator('#tab-purchase').click();assert.equal(await page.locator('#estimate-submit').isDisabled(),true);
      const procurement=structuredClone(state.data);procurement.groups=procurement.groups.map(g=>({...g,capability:'zimage_t2i',measured:g.id==='unknown-reference'?3000:g.measured}));
      const actual=await setup({data:procurement});await purchase(actual.page);await calculate(actual.page);
      assert.equal(actual.state.posts.at(-1).body.demands[0].group_id,'unknown-reference');assert.match(await actual.page.locator('#estimate-result').innerText(),/60 秒/);
      assertHistoryQuery(state.gets[0]);assert.deepEqual(state.errors,[]);
    });
    await t.test('真实新证据为空不回退旧汇总；模板缺失或动态选择不可识别仍明确未知',async()=>{
      const input=evidenceFixture();input.groups[0].model_summary=modelSummary([{name:'stale-summary-int8.safetensors',precision:'INT8',precision_source:'filename'}]);
      const {page,state}=await setup({data:input});const row=page.locator('.business-row');
      assert.doesNotMatch(await row.innerText(),/stale-summary|INT8/);
      await row.locator('select').selectOption('empty-reference');
      assert.match(await row.innerText(),/未获取到模型信息/);
      await assertModelLabels(row,[],[]);
      assert.doesNotMatch(await row.textContent(),/模板参考|部分模型|模型待确认|精度未确认/);
      assert.doesNotMatch(await row.innerText(),/current-main|FP8|INT8|loader|当前工具默认配置|动态模型工具|不完整 \/ 未确认完整主模型链/);
      await assertQuietModelCells(page);
      await row.locator('button').click();const detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));
      assert.match(await detail.innerText(),/未获取到模型信息，模型待确认/);
      assert.match(await detail.innerText(),/当前工具默认配置（非历史执行记录）· 动态模型工具/);
      assert.match(await detail.innerText(),/不完整 \/ 未确认完整主模型链；动态选择或未知链路不能推断全部主模型/);
      await row.locator('select').selectOption('no-reference');assert.match(await row.innerText(),/未获取到模型信息/);
      assert.doesNotMatch(await detail.innerText(),/动态模型工具|当前工具默认配置|不完整 \/ 未确认完整主模型链/);
      await assertModelLabels(row,[],[]);await assertQuietModelCells(page);
      assert.match(await detail.innerText(),/历史未记录.*当前工具模板未提供、找不到或无法识别/s);assert.doesNotMatch(await row.innerText(),/当前工具默认配置|FP8|INT8/);
      assert.deepEqual(state.errors,[]);
    });
    await t.test('历史和模板的名称、角色、精度与dtype均按纯文本渲染，辅助模型仅在详情',async()=>{
      const input=evidenceFixture();const model={name:ATTACK,role:ATTACK,precision:ATTACK,precision_source:'filename',loader_dtype:ATTACK};
      input.groups[0].current_model_reference=modelSummary([model,{...model}],{source:'current_template',capability_name:ATTACK,auxiliary_models:[model]});
      input.groups[1].model_evidence.variants[0].summary=modelSummary([model,model],{auxiliary_models:[model]});
      const {page,state}=await setup({data:input});const row=page.locator('.business-row');
      for(const id of ['unknown-reference','pair']) {
        await row.locator('select').selectOption(id);
        const names=row.locator('[data-label="模型名称"]'),precision=row.locator('[data-label="模型精度"]');
        assert.deepEqual(await names.locator('.model-name').allTextContents(),[ATTACK,ATTACK]);
        await assertModelLabels(row,[ATTACK,ATTACK],[['无'],['无']]);await assertQuietModelCells(page);
        assert.equal((await precision.textContent()).includes(ATTACK),false,'恶意精度不是标准白名单值，简明区必须显示无');
        assert.equal((await names.innerText()).includes('工具：'+ATTACK),false,'模板工具名称不铺在首屏');
        if(await row.locator('button').getAttribute('aria-expanded')==='false')await row.locator('button').click();
        const detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));
        if(id==='unknown-reference')assert.ok((await detail.innerText()).includes('当前工具默认配置（非历史执行记录）· '+ATTACK),'模板工具名称在详情仍按纯文本保留');
        for(const text of ['主模型 1：'+ATTACK,'主模型 2：'+ATTACK,'角色：'+ATTACK,'文件标记 '+ATTACK,'加载配置 '+ATTACK,'辅助模型（不计入主模型名称或精度）','非运行时检测'])assert.ok((await detail.innerText()).includes(text),text);
        assert.ok(await detail.locator('.model-reference p').evaluateAll(nodes=>nodes.every(node=>node.childElementCount===0)),'完整原始证据只通过纯文本展示');
        assert.equal(await page.locator('main img').count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);
      }
      assert.deepEqual(state.errors,[]);
    });
    await t.test('模型精简合同1：文件与加载精度白名单、别名去重、不同值双项和未知值',async()=>{
      const cases=[
        ['filename-only',{precision:'INT8',precision_source:'filename'},['INT8'],['文件标记 INT8']],
        ['loader-only',{loader_dtype:'bfloat16'},['BF16'],['加载配置 BF16（bfloat16）']],
        ['loader-without-dtype',{precision:'FP8',precision_source:'loader'},['FP8'],['加载配置 FP8']],
        ['same-bf16',{precision:'BF16',precision_source:'filename',loader_dtype:'bfloat16'},['BF16'],['文件标记 BF16','加载配置 BF16（bfloat16）']],
        ['same-fp8-alias',{precision:'float8_e5m2_fast',precision_source:'filename',loader_dtype:'fp8_e4m3fn'},['FP8'],['文件标记 float8_e5m2_fast','加载配置 FP8（fp8_e4m3fn）']],
        ['fp8-suffix',{loader_dtype:'fp8_e5m2_fast'},['FP8'],['加载配置 FP8（fp8_e5m2_fast）']],
        ['fp8-alias-list',{loader_dtype:'float8_e4m3fn / fp8_e5m2_fast'},['FP8'],['加载配置 FP8（float8_e4m3fn / fp8_e5m2_fast）']],
        ['different-sources',{precision:'BF16',precision_source:'filename',loader_dtype:'fp8_e4m3fn'},['文件标记 BF16','加载配置 FP8（fp8_e4m3fn）'],['文件标记 BF16','加载配置 FP8（fp8_e4m3fn）']],
        ['known-with-default',{precision:'INT8',precision_source:'filename',loader_dtype:'default'},['INT8'],['文件标记 INT8','加载配置 default（实际精度未确认）']],
        ['default',{loader_dtype:'default'},['无'],['加载配置 default（实际精度未确认）']],
        ['auto',{loader_dtype:'auto'},['无'],['加载配置 auto（实际精度未确认）']],
        ['filename-default',{precision:'default',precision_source:'filename'},['无'],['文件标记 default']],
        ['loader-auto',{precision:'auto',precision_source:'loader'},['无'],['加载配置 auto']],
        ['empty',{precision:'',precision_source:'filename',loader_dtype:''},['无'],['精度未记录 / 待确认']],
        ['unknown',{},['无'],['精度未记录 / 待确认']],
        ['no-source',{precision:'FP8'},['无'],['精度未记录 / 待确认']],
        ['unrecognized',{loader_dtype:'not-a-dtype'},['无'],['加载配置 not-a-dtype']],
        ['not-standard',{precision:'INT8 arbitrary',precision_source:'filename'},['无'],['文件标记 INT8 arbitrary']],
        ['numeric',{precision:8,precision_source:'filename'},['无'],['文件标记 8']],
        ['int4',{precision:'int4',precision_source:'filename'},['INT4'],['文件标记 int4']],
        ['nf4',{loader_dtype:'nf4'},['NF4'],['加载配置 nf4']],
        ['q4-k-m',{precision:'q4_k_m',precision_source:'filename'},['Q4_K_M'],['文件标记 q4_k_m']],
        ['fp16',{loader_dtype:'float16'},['FP16'],['加载配置 FP16（float16）']],
      ];
      const input=fixture(),base=input.groups[0];
      input.groups=cases.map(([id,model])=>({...base,id,model_summary:modelSummary([{name:id+'.safetensors',role:'main',...model}])}));
      input.groups.push({...base,id:'unknown-name',model_summary:modelSummary([{name:''}])},{...base,id:'no-models',model_summary:modelSummary([])});
      const {page,state}=await setup({data:input}),row=page.locator('.business-row');
      await row.locator('button').click();const detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));
      for(const [id,,labels,full] of cases) {
        await row.locator('select').selectOption(id);
        await assertModelLabels(row,[id+'.safetensors'],[labels]);await assertQuietModelCells(page);
        assert.equal(await detail.isVisible(),true,'切规格保持详情展开');
        const modelDetail=detail.locator('.model-reference');assert.equal(await modelDetail.count(),1);
        for(const value of [id+'.safetensors',...full,'非运行时检测'])assert.ok((await modelDetail.innerText()).includes(value),id+'：'+value);
        assert.equal(await modelDetail.locator('p').last().textContent(),`主模型：${id}.safetensors；角色：main；${full.join('；')}；非运行时检测`,'完整精度详情不随精简展示改变');
      }
      await row.locator('select').selectOption('unknown-name');await assertModelLabels(row,['未获取到模型信息'],[['无']]);
      await row.locator('select').selectOption('no-models');await assertModelLabels(row,[],[]);await assertQuietModelCells(page);
      assert.doesNotMatch(await detail.innerText(),/fp16.safetensors|加载配置 FP16/);assert.deepEqual(state.errors,[]);
    });
    await t.test('模型精简合同2：同图双模型逐项精度、多历史块和切规格清理，桌面手机批量截图',async()=>{
      const input=evidenceFixture();
      input.groups[2].model_evidence.variants[1].summary.models.push({name:'other-task-q4_k_m.gguf',precision:'Q4_K_M',precision_source:'filename'});
      const {page,state}=await setup({data:input}),row=page.locator('.business-row');
      const pairNames=['history-high-bf16.safetensors','history-low-int8.safetensors'],pairLabels=[['文件标记 BF16','加载配置 FP8（fp8_e4m3fn）'],['INT8']];
      for(const width of [1440,390,320]) {
        await page.setViewportSize({width,height:width===1440?1000:844});
        await row.locator('select').selectOption('partial');
        await assertModelLabels(row,[...pairNames,'other-task-fp16.safetensors','other-task-q4_k_m.gguf'],[...pairLabels,['FP16'],['Q4_K_M']]);
        for(const label of ['模型名称','模型精度']) {
          const variants=row.locator(`[data-label="${label}"] .model-variant`);assert.equal(await variants.count(),2);
          assert.deepEqual(await variants.evaluateAll(nodes=>nodes.map(n=>n.querySelectorAll('.model-item').length)),[2,2]);
        }
        await row.locator('button').click();const detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));
        assert.match(await detail.innerText(),/模型记录覆盖 30 \/ 3,201 次/);assert.match(await detail.innerText(),/不完整 \/ 未确认完整主模型链/);
        for(const name of [...pairNames,'other-task-fp16.safetensors','other-task-q4_k_m.gguf'])assert.ok((await detail.innerText()).includes(name));
        await row.locator('select').selectOption('unknown-reference');await assertModelLabels(row,['current-main-fp8.safetensors'],[['FP8']]);
        assert.doesNotMatch(await detail.innerText(),/history-high|history-low|other-task|历史任务记录组合|不完整 \/ 未确认完整主模型链/);
        assert.match(await row.locator('[data-label="平均生成时间"]').innerText(),/此处耗时来自历史任务，不代表当前模型速度/);
        await row.locator('select').selectOption('no-reference');await assertModelLabels(row,[],[]);
        assert.doesNotMatch(await detail.innerText(),/current-main|当前工具默认配置|历史任务记录组合/);
        await row.locator('select').selectOption('pair');await assertModelLabels(row,pairNames,pairLabels);
        assert.doesNotMatch(await row.textContent(),/模板参考|任务组合|部分模型|模型记录覆盖|非运行时检测|不代表当前模型速度/);
        await assertQuietModelCells(page);await assertComparisonTable(page);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width}px不产生整页横滚`);
        await row.locator('button').click();
        // 单独的截图开关仅生成这一组桌面、390、320图，避免重复截取原套件所有场景。
        if(process.env.CHOUKA_TEST_MODEL_SCREENSHOT) {
          await positionMatrix(page);const file=path.parse(process.env.CHOUKA_TEST_MODEL_SCREENSHOT);
          await page.screenshot({path:path.join(file.dir,file.name+`-${width===1440?'desktop':width}.png`),fullPage:true});
        }
      }
      assert.deepEqual(state.errors,[]);
    });
    await t.test('新模型证据在三页签与390/320px可操作，长名称多变体不产生整页横滚',async()=>{
      const input=evidenceFixture();input.groups[1].model_evidence.variants[0].summary.models[0].name='long-model-name-'.repeat(16)+'.safetensors';
      const {page,state}=await setup({data:input});const row=page.locator('.business-row');
      if(process.env.CHOUKA_TEST_SCREENSHOT)await page.screenshot({path:process.env.CHOUKA_TEST_SCREENSHOT,fullPage:true});
      for(const width of [390,320]) {
        await page.setViewportSize({width,height:844});
        for(const id of ['unknown-reference','pair','partial','empty-reference','no-reference']) {
          await row.locator('select').selectOption(id);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width}px ${id}`);
          await row.locator('button').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await row.locator('button').click();
        }
        for(const tab of ['scenarios','purchase','machines']) {await page.locator('#tab-'+tab).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
        await row.locator('select').selectOption('partial');
        await assertModelLabels(row,input.groups[2].model_evidence.variants.flatMap(v=>v.summary.models.map(m=>m.name)),[['文件标记 BF16','加载配置 FP8（fp8_e4m3fn）'],['INT8'],['FP16']]);await assertQuietModelCells(page);
        if(process.env.CHOUKA_TEST_SCREENSHOT){await positionMatrix(page);const file=path.parse(process.env.CHOUKA_TEST_SCREENSHOT);await page.screenshot({path:path.join(file.dir,file.name+`-evidence-${width}.png`),fullPage:true});}
      }
      assert.deepEqual(state.errors,[]);
    });
    await t.test('默认优先成功实测最新采集，其次历史最多样本，失败和未完成不计速度',async()=>{
      const input=fixture(),base=input.groups[0];input.groups=[{...base,id:'older',measured:20,samples:30}, {...base,id:'many',measured:40,samples:50}, {...base,id:'pending',source:'captured',last_sample_at:NOW.getTime()/1000,mean_seconds:null,measured:0,done:0,error:100,samples:100,runtime_seconds:9900}];
      const {page}=await setup({data:input});const row=page.locator('.business-row'),select=row.locator('select');assert.equal(await select.inputValue(),'many');
      await select.selectOption('pending');assert.match(await row.innerText(),/暂无成功耗时/);assert.doesNotMatch(await row.innerText(),/99 秒|0 秒/);assert.match(await row.innerText(),/仅 0 次/);
      input.groups.push({...base,id:'fresh',source:'captured',last_sample_at:NOW.getTime()/1000-1,measured:1,mean_seconds:4000});
      const next=await setup({data:input});assert.equal(await next.page.locator('.summary-spec').inputValue(),'fresh');assert.match(await next.page.locator('.business-row').innerText(),/66 分 40 秒/);assert.match(await next.page.locator('.business-row').innerText(),/耗时异常/);assert.match(await next.page.locator('.business-row').innerText(),/仅 1 次/);
      input.groups.at(-1).mean_seconds=0.4;const subsecond=await setup({data:input});assert.match(await subsecond.page.locator('.business-row').innerText(),/0.4 秒/);assert.match(await subsecond.page.locator('.business-row').innerText(),/耗时异常/);
    });
    await t.test('未知模型不从业务或无关模型文件推断，旧 Worker 与人工版本缺失指引区分',async()=>{
      const input=summaryFixture();input.groups[1].model_summary=undefined;input.groups[1].spec={models:[{name:'not-main-fp8.safetensors'}]};
      const {page}=await setup({data:input});const machine=page.locator('thead .machine-heading[data-summary-worker-id=w1]'),business=page.locator('td.machine-result[data-summary-worker-id=w1] .business-row[data-capability=depth_video]');assert.match(await business.innerText(),/未获取到模型信息/);assert.doesNotMatch(await business.innerText(),/FP8|INT8|not-main-fp8/);assert.equal(await business.locator('[data-label="模型名称"]').innerText(),'未获取到模型信息');
      assert.match(await machine.locator('.machine-hardware').innerText(),/RTX 4090 \/ 24 GiB；系统内存 95.7 GiB/);assert.doesNotMatch(await machine.locator('.machine-hardware').innerText(),/未知|CPU/);
      await machine.locator('.machine-more summary').click();assert.match(await machine.innerText(),/升级该 Worker 后补采/);
      const modern=page.locator('thead .machine-heading[data-summary-worker-id=w3]');await modern.locator('.machine-more summary').click();assert.match(await modern.innerText(),/人工声明未填写/);assert.doesNotMatch(await modern.innerText(),/升级该 Worker|整机配置未知/);
    });
    await t.test('简明规格保留期望尺寸、请求时长及MP，输入独立成行，技术参数完整移入详情',async()=>{
      const input=fixture();input.groups=[{...input.groups[3],dimensions:{duration:5,fps:24,megapixels:1.5,image_count:2,steps:20,frames:121,scale_to_length:1280,batch_size:3},spec:{expected:{width:1280,height:720}}}];const {page,state}=await setup({data:input});
      const row=page.locator('.business-row'),parameters='请求时长 5 秒 / 期望 720p（1,280 × 720）';
      await assertMaterialSpec(row,['图片 2 张','视频数量未记录','音频数量未记录'],parameters);
      assert.doesNotMatch(await row.textContent(),/FPS|步数|帧数|长边|批量|depth-5s/);
      await row.locator('button').click();const detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));
      for(const text of [parameters,'像素设置 1.5 MP','帧率 24 FPS','步数 20 步','帧数 121 帧','长边 1,280 px','批量 3','生成参数不是成品实测规格'])assert.ok((await detail.innerText()).includes(text),text);
      const raw=detail.locator('details');assert.equal(await raw.evaluate(n=>n.open),false);await raw.locator('summary').click();
      const evidence=JSON.parse(await raw.locator('pre').textContent());assert.deepEqual(evidence.dimensions,input.groups[0].dimensions);assert.deepEqual(evidence.spec,input.groups[0].spec);assert.deepEqual(state.errors,[]);
    });
    await t.test('分辨率使用精确尺寸档位，MP只译为像素量，竖屏与期望来源不混淆',async()=>{
      const cases=[
        ['hd',{dimensions:{width:1280,height:720,megapixels:1}},'720p（1,280 × 720）'],
        ['full-hd',{dimensions:{width:1920,height:1080}},'1080p（1,920 × 1,080）'],
        ['qhd',{dimensions:{width:2560,height:1440}},'1440p（2,560 × 1,440）'],
        ['uhd',{dimensions:{width:3840,height:2160}},'4K（3,840 × 2,160）'],
        ['portrait-hd',{dimensions:{width:720,height:1280}},'720p 竖屏（720 × 1,280）'],
        ['portrait-full',{dimensions:{width:1080,height:1920}},'1080p 竖屏（1,080 × 1,920）'],
        ['square',{dimensions:{width:1024,height:1024,megapixels:1}},'尺寸 1,024 × 1,024'],
        ['square-720',{dimensions:{width:720,height:720}},'尺寸 720 × 720'],
        ['near-hd',{dimensions:{width:1280,height:704}},'尺寸 1,280 × 704'],
        ['wide',{dimensions:{width:2560,height:1080}},'尺寸 2,560 × 1,080'],
        ['one-mp',{dimensions:{megapixels:1}},'约 100 万像素（尺寸未记录）'],
        ['fraction-mp',{dimensions:{megapixels:.39}},'约 39 万像素（尺寸未记录）'],
        ['expected',{dimensions:{megapixels:1},spec:{expected:{width:1280,height:720}}},'期望 720p（1,280 × 720）'],
        ['expected-square',{dimensions:{},spec:{expected:{width:1024,height:1024}}},'期望 1,024 × 1,024'],
        ['output-pair',{dimensions:{width:1280,height:720,output_width:1920,output_height:1080}},'1080p（1,920 × 1,080）'],
        ['partial-output',{dimensions:{width:1280,height:720,output_width:1920}},'720p（1,280 × 720）'],
        ['partial-size',{dimensions:{width:1280,megapixels:1}},'约 100 万像素（尺寸未记录）'],
        ['resolution-setting',{dimensions:{resolution:'1280x720 (16:9)',megapixels:1}},'720p（1,280 × 720）'],
        ['portrait-setting',{dimensions:{resolution:'720x1280 (9:16)'}},'720p 竖屏（720 × 1,280）'],
        ['numeric-short-edge',{dimensions:{resolution:720}},'规格未完整记录'],
        ['input-only',{dimensions:{source_width:1280,source_height:720}},'规格未完整记录'],
        ['missing',{dimensions:{}},'规格未完整记录'],
        ['malicious',{dimensions:{width:ATTACK,height:720,megapixels:ATTACK,resolution:ATTACK}},'规格未完整记录'],
      ];
      for(const [index,value] of [0,-1,1.5,'1280',null,true,Number.MAX_SAFE_INTEGER+1].entries())cases.push(['invalid-size-'+index,{dimensions:{width:value,height:720}},'规格未完整记录']);
      for(const [index,value] of [0,-1,'1',null,true,Number.MAX_VALUE].entries())cases.push(['invalid-mp-'+index,{dimensions:{megapixels:value}},'规格未完整记录']);
      const input=fixture(),base=input.groups[0];input.groups=cases.map(([id,fields],index)=>({...base,...fields,id,mean_seconds:60+index}));
      const {page,state}=await setup({data:input}),row=page.locator('.business-row');
      await row.locator('button').click();const detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));
      for(const [index,[id,fields,label]] of cases.entries()) {
        await row.locator('select').selectOption(id);
        assert.equal(await row.locator('.generation-parameters').textContent(),label,id);
        assert.ok((await row.locator('option:checked').textContent()).startsWith('素材信息未记录｜'+label),id);
        assert.doesNotMatch(await row.locator('.selected-spec').textContent(),/ MP|NaN|Infinity|<img|undefined/);
        assert.equal(await row.locator('.mean-time').textContent(),`1 分 ${index} 秒`,id+'：分辨率展示不得合并原始耗时分组');
        if(['hd','square','one-mp','expected'].includes(id))assert.match(await detail.innerText(),/像素设置 1 MP/);
        const raw=detail.locator('details');await raw.locator('summary').click();
        const evidence=JSON.parse(await raw.locator('pre').textContent());assert.deepEqual(evidence.dimensions,fields.dimensions);assert.deepEqual(evidence.spec,fields.spec);
      }
      assert.equal(await page.locator('main img, main [onerror]').count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);assert.deepEqual(state.errors,[]);
    });
    await t.test('输入素材合同1：混合素材、明确零与逐类型未知，非法计数不强转或冒充零',async()=>{
      const cases=[
        ['image',{image_count:2,video_count:0,audio_count:0},['图片 2 张']],
        ['videos',{image_count:0,video_count:3,audio_count:0},['视频 3 段']],
        ['audio',{image_count:0,video_count:0,audio_count:2},['音频 2 段']],
        ['mixed',{image_count:2,video_count:3,audio_count:1},['图片 2 张','视频 3 段','音频 1 段']],
        ['zero',{image_count:0,video_count:0,audio_count:0},['未使用图片、视频或音频']],
        ['missing',{},['素材信息未记录']],
        ['null',{image_count:null,video_count:null,audio_count:null},['素材信息未记录']],
        ['partial',{image_count:2},['图片 2 张','视频数量未记录','音频数量未记录']],
        ['partial-zero',{image_count:0},['视频数量未记录','音频数量未记录']],
        ['partial-null',{image_count:null,video_count:2,audio_count:0},['图片数量未记录','视频 2 段']],
        ['safe-limit',{image_count:Number.MAX_SAFE_INTEGER,video_count:0,audio_count:0},['图片 9,007,199,254,740,991 张']],
      ];
      const invalid=['2','0','',true,false,[],[2],{},-1,1.5,Number.MAX_SAFE_INTEGER+1,ATTACK,{value:ATTACK}];
      for(const [index,value] of invalid.entries()) {
        cases.push(['invalid-all-'+index,{image_count:value,video_count:value,audio_count:value},['素材信息未记录']]);
        for(const [key,label] of [['image_count','图片'],['video_count','视频'],['audio_count','音频']])
          cases.push([`invalid-${key}-${index}`,{image_count:0,video_count:0,audio_count:0,[key]:value},[label+'数量未记录']]);
      }
      const input=fixture(),base=input.groups[0];input.groups=cases.map(([id,dimensions])=>({...base,id,dimensions}));
      const {page,state}=await setup({data:input}),row=page.locator('.business-row');
      // 未知组合的下拉需要来源/采样后缀区分；逐组验证前缀，不丢失原始分组。
      assert.deepEqual(await row.locator('select option').evaluateAll(nodes=>nodes.map(n=>n.value)),cases.map(c=>c[0]));
      for(const [id,,materials] of cases) {
        await row.locator('select').selectOption(id);
        assert.deepEqual(await row.locator('dd.input-materials > span').allTextContents(),materials,id);
        assert.equal(await row.locator('dd.generation-parameters').textContent(),'规格未完整记录',id);
        const label=await row.locator('option:checked').textContent(),prefix=materials.join(' + ')+'｜规格未完整记录';
        assert.ok(label===prefix || label.startsWith(prefix+' · '),id+'：下拉以素材组合开头');
        assert.doesNotMatch(await row.locator('.selected-spec').textContent(),/NaN|undefined|<img|\[object Object\]/);
      }
      assert.equal(await page.locator('main img').count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);assert.deepEqual(state.errors,[]);
      t.diagnostic(`素材计数边界共验证 ${cases.length} 组独立数据`);
    });
    await t.test('输入素材合同2：仅dimensions供给计数，spec回退与g逐字段覆盖，不从参数或成品推断',async()=>{
      const counts={image_count:2,video_count:3,audio_count:1},input=fixture(),base=input.groups[0];
      const cases=[
        ['spec-fallback',{spec:{dimensions:counts},dimensions:{}},['图片 2 张','视频 3 段','音频 1 段']],
        ['no-g-dimensions',{spec:{dimensions:counts},dimensions:undefined},['图片 2 张','视频 3 段','音频 1 段']],
        ['null-g-dimensions',{spec:{dimensions:counts},dimensions:null},['图片 2 张','视频 3 段','音频 1 段']],
        ['partial-override',{spec:{dimensions:counts},dimensions:{video_count:4}},['图片 2 张','视频 4 段','音频 1 段']],
        ['zero-override',{spec:{dimensions:counts},dimensions:{image_count:0,video_count:0,audio_count:0}},['未使用图片、视频或音频']],
        ['null-override',{spec:{dimensions:counts},dimensions:{image_count:null,video_count:0,audio_count:0}},['图片数量未记录']],
        ['invalid-override',{spec:{dimensions:counts},dimensions:{image_count:'7',video_count:0,audio_count:0}},['图片数量未记录']],
        ['no-inference',{spec:{parameters:counts,expected:counts},dimensions:{},image_count:8,video_count:9,audio_count:10,output_count:7,unit:'image'},['素材信息未记录']],
      ];
      input.groups=cases.map(([id,fields])=>({...base,id,...fields}));const {page,state}=await setup({data:input}),row=page.locator('.business-row');
      for(const [id,,expected] of cases) {
        await row.locator('select').selectOption(id);assert.deepEqual(await row.locator('.input-materials > span').allTextContents(),expected,id);
        assert.equal(await row.locator('.generation-parameters').textContent(),'规格未完整记录');
      }
      assert.deepEqual(state.errors,[]);
    });
    await t.test('输入素材合同3：首视频时长仅详情说明非合计，请求参数优先级与原始技术证据保持',async()=>{
      const input=fixture(),base=input.groups[0],dimensions={image_count:1,video_count:3,audio_count:1,source_duration:37};
      const technical={steps:20,fps:24,frames:121,scale_to_length:1280,batch_size:3};
      const cases=[
        ['source-only',{dimensions},'规格未完整记录'],
        ['technical-only',{dimensions:{...dimensions,...technical}},'规格未完整记录'],
        ['requested',{dimensions:{...dimensions,duration:5,width:1280,height:720}},'请求时长 5 秒 / 720p（1,280 × 720）'],
        ['output-request',{dimensions:{...dimensions,duration:5,output_duration:6,width:1280,height:720,output_width:1920,output_height:1080}},'请求时长 6 秒 / 1080p（1,920 × 1,080）'],
        ['expected',{dimensions,spec:{expected:{duration:7,width:640,height:480,fps:30}}},'请求时长 7 秒 / 期望 480p（640 × 480）'],
        ['parameters',{dimensions,spec:{parameters:{duration:8,...technical}}},'请求时长 8 秒'],
        ['dimension-precedence',{dimensions:{...dimensions,duration:9},spec:{dimensions:{duration:8},parameters:{duration:7}}},'请求时长 9 秒'],
      ];
      input.groups=cases.map(([id,fields])=>({...base,id,...fields}));const {page,state}=await setup({data:input}),row=page.locator('.business-row');
      await row.locator('button').click();const detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));
      for(const [id,fields,parameters] of cases) {
        await row.locator('select').selectOption(id);
        assert.equal(await row.locator('.generation-parameters').textContent(),parameters);
        assert.doesNotMatch(await row.locator('.selected-spec').textContent(),/37|111|FPS|步数|帧数|长边|批量|输入视频时长/);
        assert.ok((await row.locator('option:checked').textContent()).startsWith('图片 1 张 + 视频 3 段 + 音频 1 段｜'+parameters));
        assert.match(await detail.innerText(),/首个输入视频时长：37 秒（非多段视频合计）/);
        assert.doesNotMatch(await detail.innerText(),/请求时长 (37|111) 秒|总时长|总输入时长/);
        if(['technical-only','parameters'].includes(id))for(const text of ['帧率 24 FPS','步数 20 步','帧数 121 帧','长边 1,280 px','批量 3'])assert.ok((await detail.innerText()).includes(text),id+'：'+text);
        if(id==='expected')assert.match(await detail.innerText(),/帧率 30 FPS/);
        const raw=detail.locator('details');assert.equal(await raw.evaluate(n=>n.open),false);await raw.locator('summary').click();
        const evidence=JSON.parse(await raw.locator('pre').textContent());assert.deepEqual(evidence.dimensions,fields.dimensions);assert.deepEqual(evidence.spec,fields.spec);
      }
      assert.deepEqual(state.errors,[]);
    });
    await t.test('输入素材合同4：同参数不同视频数可区分，切组清理且原组均值、另一机器及采购互不影响',async()=>{
      const input=summaryFixture(),base=input.groups[1],dimensions={duration:5,width:1280,height:720,image_count:2,video_count:1,audio_count:1};
      input.groups=[
        {...base,id:'one-video',capability:'minimax_h3_ref9',dimensions,mean_seconds:78,measured:10},
        {...base,id:'three-videos',capability:'minimax_h3_ref9',dimensions:{...dimensions,video_count:3,source_duration:37,steps:20},mean_seconds:32,measured:8},
        {...base,id:'unknown-material',capability:'minimax_h3_ref9',dimensions:{duration:5},mean_seconds:91,measured:5},
        {...base,id:'other-one',worker_id:'w3',capability:'minimax_h3_ref9',dimensions,mean_seconds:61},
        {...base,id:'other-three',worker_id:'w3',capability:'minimax_h3_ref9',dimensions:{...dimensions,video_count:3},mean_seconds:19},
      ];
      const {page,state}=await setup({data:input}),row=page.locator('td[data-summary-worker-id=w1] .business-row'),other=page.locator('td[data-summary-worker-id=w3] .business-row');
      const options=await row.locator('option').allTextContents();assert.equal(new Set(options).size,3);
      assert.deepEqual(options.slice(0,2),[1,3].map(n=>`图片 2 张 + 视频 ${n} 段 + 音频 1 段｜请求时长 5 秒 / 720p（1,280 × 720）`));
      await purchase(page);await page.locator('.demand-group').selectOption('minimax_h3_ref9');await calculate(page);
      const before={post:structuredClone(state.posts.at(-1)),result:await page.locator('#estimate-result').textContent()};
      await page.locator('#tab-machines').click();await row.locator('button').click();await other.locator('button').click();
      const detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls')),otherDetail=page.locator('#'+await other.locator('button').getAttribute('aria-controls'));
      const otherBefore={row:await other.textContent(),detail:await otherDetail.textContent()};
      for(const [id,materials,parameters,time,count] of [
        ['three-videos',['图片 2 张','视频 3 段','音频 1 段'],'请求时长 5 秒 / 720p（1,280 × 720）','32 秒',8],
        ['unknown-material',['素材信息未记录'],'请求时长 5 秒','1 分 31 秒',5],
        ['one-video',['图片 2 张','视频 1 段','音频 1 段'],'请求时长 5 秒 / 720p（1,280 × 720）','1 分 18 秒',10],
      ]) {
        await row.locator('select').selectOption(id);await assertMaterialSpec(row,materials,parameters);
        assert.equal(await row.getAttribute('data-selected-group-id'),id);assert.equal(await row.locator('.mean-time').textContent(),time);assert.match(await row.locator('.matrix-samples').textContent(),new RegExp(`仅 ${count} 次`));
        assert.equal(await detail.isVisible(),true);assert.ok((await detail.innerText()).includes('采样编号：'+id));
        if(id!=='three-videos')assert.doesNotMatch(await detail.innerText(),/首个输入视频时长|步数 20|视频 3 段|three-videos/);
        assert.deepEqual({row:await other.textContent(),detail:await otherDetail.textContent()},otherBefore);
      }
      const firstBefore={row:await row.textContent(),detail:await detail.textContent()};await other.locator('select').selectOption('other-three');
      assert.equal(await other.locator('.mean-time').textContent(),'19 秒');assert.match(await otherDetail.innerText(),/采样编号：other-three/);
      assert.deepEqual({row:await row.textContent(),detail:await detail.textContent()},firstBefore);
      await assertComparisonTable(page);await page.locator('#tab-purchase').click();assert.equal(await page.locator('#estimate-result').textContent(),before.result);
      assert.deepEqual(state.posts,[before.post]);assert.deepEqual(before.post.body.demands,[{group_id:'one-video',quantity:100}]);
      await calculate(page);assert.deepEqual(state.posts.at(-1),before.post);assert.deepEqual(state.errors,[]);
    });
    await t.test('输入素材合同5：恶意规格只作原始文本，三尺寸真实定义列表换行且不溢出，批量截图',async()=>{
      const input=summaryFixture(),base=input.groups[1];input.groups=[{...base,id:'mixed-material',dimensions:{image_count:12,video_count:3,audio_count:2,duration:5,width:1280,height:720,steps:20,source_duration:37}},
        {...base,id:'hostile-material',dimensions:{image_count:ATTACK,video_count:2,audio_count:{value:ATTACK},duration:ATTACK,steps:ATTACK,source_duration:ATTACK},spec:{parameters:{frames:ATTACK},expected:{width:ATTACK,height:ATTACK}}}];
      const {page,state}=await setup({data:input}),row=page.locator('.business-row');
      await row.locator('select').selectOption('hostile-material');await assertMaterialSpec(row,['图片数量未记录','视频 2 段','音频数量未记录'],'规格未完整记录');
      await row.locator('button').click();const detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));await detail.locator('details summary').click();
      const raw=detail.locator('pre');assert.equal(await raw.locator('*').count(),0);const evidence=JSON.parse(await raw.textContent());
      assert.deepEqual(evidence.dimensions,input.groups[1].dimensions);assert.deepEqual(evidence.spec,input.groups[1].spec);
      assert.equal(await page.locator('main img, main script, main iframe, main [onerror]').count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);
      await row.locator('select').selectOption('mixed-material');assert.doesNotMatch(await detail.textContent(),/onerror|hostile-material/);await row.locator('button').click();
      for(const width of [1440,390,320]) {
        await page.setViewportSize({width,height:width===1440?1000:844});await positionMatrix(page);
        await assertMaterialSpec(row,['图片 12 张','视频 3 段','音频 2 段'],'请求时长 5 秒 / 720p（1,280 × 720）');await assertComparisonTable(page);
        const layout=await row.locator('.selected-spec').evaluate(node=>{
          const rect=n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
          const materials=node.querySelector('.input-materials');
          return {spec:rect(node),box:rect(materials),wrap:getComputedStyle(materials).flexWrap,client:materials.clientWidth,scroll:materials.scrollWidth,
            spans:[...materials.children].map(n=>{const range=document.createRange();range.selectNodeContents(n);return {box:rect(n),text:[...range.getClientRects()].map(r=>({left:r.left,right:r.right}))};})};
        });
        assert.equal(layout.wrap,'wrap');assert.ok(layout.scroll<=layout.client,`${width}px素材容器无横向溢出`);
        // 宽屏能完整容纳时允许单行；窄屏必须实际换行，不能靠截断或横滚隐藏素材。
        if(width===320)assert.ok(new Set(layout.spans.map(s=>Math.round(s.box.top))).size>1,'320px混合输入实际分行，而非仅声明换行样式');
        for(const span of layout.spans)for(const box of [span.box,...span.text])assert.ok(box.left>=layout.box.left-1 && box.right<=layout.box.right+1 && box.left>=layout.spec.left-1 && box.right<=layout.spec.right+1,`${width}px素材文字完整位于规格容器`);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        await row.locator('button').click();assert.equal(await detail.isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await row.locator('button').click();
        if(process.env.CHOUKA_TEST_MATERIAL_SCREENSHOT) {
          await page.evaluate(()=>document.activeElement?.blur());await positionMatrix(page);
          // 手机将矩阵移入视口，完整截到换行后的音频，而不是只截首屏上沿；不改变真实视口尺寸。
          await page.locator('#summary-machines .scroll').evaluate((node,width)=>window.scrollTo({top:width===1440?0:node.getBoundingClientRect().top+window.scrollY-16,left:0,behavior:'instant'}),width);
          assert.ok(await row.locator('.input-materials > span').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.top>=0 && r.bottom<=innerHeight;})),`${width}px截图完整包含各类输入素材`);
          const file=path.parse(process.env.CHOUKA_TEST_MATERIAL_SCREENSHOT),output=path.join(file.dir,file.name+`-${width}.png`);
          await page.screenshot({path:output,fullPage:false});t.diagnostic('合成混合输入截图：'+output);
        }
      }
      assert.deepEqual(state.errors,[]);
    });
    await t.test('实际成品合同1：真实H3报告与技术产量分离，多尺寸和覆盖不改原组均值',async()=>{
      const {report,baseline}=realStoreReport(false,true),capability='minimax_h3_ref_2pass';
      const groups=report.groups.filter(g=>g.capability===capability),byDuration=duration=>groups.find(g=>g.dimensions.duration===duration);
      assert.equal(groups.length,8);
      for(const g of groups) {
        assert.equal(g.output_count,null);assert.equal(g.eligible,false);
        assert.deepEqual(g.spec.expected,{duration:g.dimensions.duration,kind:'video'});
        const previous=baseline.groups.find(old=>old.id===g.id);
        assert.deepEqual({...g,output_resolution:null},{...previous,output_resolution:null},'补采尺寸不改变分组、均值或技术资格');
      }
      const actual=byDuration(2),multi=byDuration(3),partial=byDuration(4),allPartial=byDuration(5),unknown=byDuration(6),recovered=byDuration(7);
      assert.deepEqual(actual.output_resolution,{total_samples:1,recorded_samples:1,complete_samples:1,total_outputs:1,recorded_outputs:1,variants:[{kind:'video',width:1280,height:720,outputs:1,samples:1}]});
      assert.deepEqual(multi.output_resolution,{total_samples:2,recorded_samples:2,complete_samples:2,total_outputs:5,recorded_outputs:5,variants:[{kind:'image',width:1024,height:768,outputs:1,samples:1},{kind:'video',width:720,height:1280,outputs:1,samples:1},{kind:'video',width:1280,height:720,outputs:3,samples:2}]});
      assert.deepEqual([partial.output_resolution.total_samples,partial.output_resolution.recorded_samples,partial.output_resolution.complete_samples,partial.output_resolution.total_outputs],[2,1,0,null]);
      assert.deepEqual([allPartial.output_resolution.recorded_samples,allPartial.output_resolution.complete_samples,allPartial.output_resolution.total_outputs],[1,0,2]);
      const {page,state}=await setup({data:report});
      const row=page.locator(`.business-row[data-capability=${capability}]`),select=row.locator('select');
      await select.selectOption(actual.id);await assertMaterialSpec(row,['图片 12 张','视频 3 段','音频 2 段'],'请求时长 2 秒 / 约 91 万像素（尺寸未记录）');
      assert.deepEqual(await row.locator('.actual-resolution > span').allTextContents(),['视频 · 720p（1,280 × 720）']);
      assert.equal(await row.locator('.mean-time').textContent(),'1 分 18 秒');
      await row.locator('button').click();const detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));
      assert.match(await detail.innerText(),/1 \/ 1 次已完成任务至少有一个成品尺寸；1 \/ 1 次已完成任务的全部最终产物都有尺寸/);
      assert.match(await detail.innerText(),/与技术合格产量、人工验收和采购资格分离/);
      await select.selectOption(multi.id);
      assert.deepEqual(await row.locator('.actual-resolution .resolution-variant').allTextContents(),['图片 · 尺寸 1,024 × 768','视频 · 720p 竖屏（720 × 1,280）','视频 · 720p（1,280 × 720）']);
      assert.match(await row.locator('.actual-resolution').textContent(),/非单一尺寸/);
      assert.equal(await row.locator('.resolution-coverage').count(),0);assert.equal(await row.locator('.mean-time').textContent(),'1 分 20 秒');
      assert.match(await detail.innerText(),/720p（1,280 × 720）：3 个产物 \/ 2 次任务/);
      assert.match(await detail.innerText(),/已知尺寸产物 5 \/ 5 个/);
      for(const [g,coverage,total] of [[partial,'已知 1 / 2 次任务的部分或全部成品','已知尺寸产物 1 / 未知 个（最终清单不完整，产物总数未知）'],[allPartial,'已知 1 / 1 次任务的部分或全部成品','已知尺寸产物 1 / 2 个'],[unknown,'已知 0 / 1 次任务的部分或全部成品','已知尺寸产物 0 / 未知 个（最终清单不完整，产物总数未知）']]) {
        await select.selectOption(g.id);assert.equal(await row.locator('.resolution-coverage').textContent(),coverage);assert.ok((await detail.innerText()).includes(total));
        assert.match(await detail.innerText(),new RegExp(`0 / ${g.output_resolution.total_samples} 次已完成任务的全部最终产物都有尺寸`));
        assert.equal(await row.locator('.actual-resolution .resolution-variant').count(),g===unknown?0:1);
      }
      assert.match(await row.locator('.actual-resolution').textContent(),/^尺寸未记录/);
      assert.doesNotMatch(await row.locator('.actual-resolution').textContent(),/720p|91|MP/);
      // 线上真实形态为非标准尺寸，不能按相近短边或 MP 强标成 720p。
      for(const [duration,label] of [[8,'视频 · 尺寸 1,312 × 736'],[9,'视频 · 尺寸 2,080 × 1,152']]) {
        await select.selectOption(byDuration(duration).id);assert.equal(await row.locator('.actual-resolution').textContent(),label);
        assert.doesNotMatch(await row.locator('.actual-resolution').textContent(),/720p|1080p/);
      }
      await select.selectOption(recovered.id);assert.deepEqual(await row.locator('.resolution-variant').allTextContents(),['视频 · 1080p（1,920 × 1,080）']);
      await detail.locator('details > summary').click();assert.deepEqual(JSON.parse(await detail.locator('pre').textContent()).output_resolution,recovered.output_resolution);
      await page.locator('#task-evidence > summary').click();const task=page.locator('#details > details[data-job-id="recovered-h3"]');await task.locator(':scope > summary').click();
      assert.match(await task.locator('.output-resolution-details').innerText(),/1080p/);
      await task.locator('.output-resolution-raw > summary').click();const raw=JSON.parse(await task.locator('.output-resolution-raw pre').textContent());
      const stored=report.details.find(d=>d.job_id==='recovered-h3');assert.deepEqual(raw,{output_resolution:stored.output_resolution,recovered_outputs:stored.recovered_outputs});assert.equal(raw.recovered_outputs[0].width,1920);
      assert.deepEqual(state.posts,[]);assert.equal(state.gets.length,1);assert.deepEqual(state.errors,[]);
    });
    await t.test('实际成品合同2：不猜尺寸、严格验证和XSS安全，跨机器切换不串数据',async()=>{
      const input=summaryFixture(),base=input.groups[1];
      const resolution={total_samples:2,recorded_samples:2,complete_samples:2,total_outputs:2,recorded_outputs:2,variants:[{kind:'video',width:1280,height:720,outputs:2,samples:2}]};
      input.groups=[{...base,id:'actual',output_resolution:resolution},{...base,id:'unknown',output_resolution:undefined},
        {...base,id:'hostile',output_resolution:{...resolution,variants:[{kind:ATTACK,width:1280,height:720,outputs:ATTACK,samples:ATTACK},{kind:'video',width:ATTACK,height:720},{kind:'image',width:512,height:512,outputs:ATTACK,samples:ATTACK}]}},
        {...base,id:'other-machine',worker_id:'w3',output_resolution:{...resolution,variants:[{kind:'image',width:1536,height:864,outputs:2,samples:2}]}}];
      const {page,state}=await setup({data:input}),first=page.locator('[data-summary-worker-id=w1] > .business-row'),other=page.locator('[data-summary-worker-id=w3] > .business-row');
      await first.locator('select').selectOption('actual');await first.locator('button').click();await other.locator('button').click();
      const detail=page.locator('#'+await first.locator('button').getAttribute('aria-controls')),otherDetail=page.locator('#'+await other.locator('button').getAttribute('aria-controls'));
      const untouched={row:await other.textContent(),detail:await otherDetail.textContent()};
      await first.locator('select').selectOption('unknown');assert.equal(await first.locator('.actual-resolution').textContent(),'尺寸未记录');assert.doesNotMatch(await detail.locator('.output-resolution-details').textContent(),/720p/);
      await first.locator('select').selectOption('hostile');assert.deepEqual(await first.locator('.resolution-variant').allTextContents(),['图片 · 尺寸 512 × 512']);
      assert.match(await detail.locator('.output-resolution-details').textContent(),/未知 个产物 \/ 未知 次任务/);
      await detail.locator('details > summary').click();assert.deepEqual(JSON.parse(await detail.locator('pre').textContent()).output_resolution,input.groups[2].output_resolution);
      await first.locator('select').selectOption('actual');assert.equal(await first.locator('.actual-resolution').textContent(),'视频 · 720p（1,280 × 720）');assert.doesNotMatch(await detail.textContent(),/onerror|512 × 512/);
      assert.deepEqual({row:await other.textContent(),detail:await otherDetail.textContent()},untouched);
      state.data.groups[0].output_resolution={...resolution,variants:[{kind:'image',width:1280,height:720,outputs:1,samples:1},{kind:'video',width:1280,height:720,outputs:1,samples:1}]};
      await refresh(page);await first.locator('select').selectOption('actual');
      assert.deepEqual(await first.locator('.actual-resolution > span').allTextContents(),['图片 · 720p（1,280 × 720）','视频 · 720p（1,280 × 720）']);
      const invalid=[null,{}, {width:1280}, {width:1280,height:0}, {width:1280,height:-1}, {width:1280,height:720.5}, {width:'1280',height:720}, {width:true,height:720}, {width:1280,height:Number.MAX_SAFE_INTEGER+1}];
      for(const value of invalid) {
        state.data.groups[0].output_resolution={...resolution,variants:[value==null?null:{kind:'video',...value}]};await refresh(page);await first.locator('select').selectOption('actual');
        assert.match(await first.locator('.actual-resolution').textContent(),/^尺寸未记录/);assert.equal(await first.locator('.resolution-variant').count(),0);
      }
      assert.equal(await page.locator('main img, main script, main iframe, main [onerror]').count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);assert.deepEqual(state.posts,[]);assert.deepEqual(state.errors,[]);
    });
    await t.test('实际成品合同3：真实Store的720p在1440、390、320宽度可读且无整页溢出',async()=>{
      const {report}=realStoreReport(false,true),g=report.groups.find(g=>g.capability==='minimax_h3_ref_2pass' && g.dimensions.duration===2);
      const {page,state}=await setup({data:report}),row=page.locator('.business-row[data-capability=minimax_h3_ref_2pass]');await row.locator('select').selectOption(g.id);
      for(const width of [1440,390,320]) {
        await page.setViewportSize({width,height:width===1440?1000:844});await positionMatrix(page);
        await row.locator('.actual-resolution').scrollIntoViewIfNeeded();
        await page.locator('#summary-machines .scroll').evaluate(node=>window.scrollTo({top:Math.max(0,node.getBoundingClientRect().top+window.scrollY-16),left:0,behavior:'instant'}));
        await assertComparisonTable(page);await assertMaterialSpec(row,['图片 12 张','视频 3 段','音频 2 段'],'请求时长 2 秒 / 约 91 万像素（尺寸未记录）');
        assert.equal(await row.locator('.actual-resolution').textContent(),'视频 · 720p（1,280 × 720）');
        const bounds=await row.locator('.selected-spec').evaluate(node=>{
          const r=node.getBoundingClientRect(),size=node.querySelector('.actual-resolution');
          return {left:r.left,right:r.right,scroll:size.scrollWidth,client:size.clientWidth,lines:[...size.querySelectorAll('span')].flatMap(n=>{const range=document.createRange();range.selectNodeContents(n);return [...range.getClientRects()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}));})};
        });
        assert.ok(bounds.scroll<=bounds.client);assert.ok(bounds.lines.length>0);
        for(const line of bounds.lines)assert.ok(line.left>=bounds.left-1 && line.right<=bounds.right+1 && line.left>=0 && line.right<=width && line.top>=0 && line.bottom<=(width===1440?1000:844),`${width}px真实成品尺寸文字完整可见`);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        if(process.env.CHOUKA_TEST_MATERIAL_SCREENSHOT) {
          const file=path.parse(process.env.CHOUKA_TEST_MATERIAL_SCREENSHOT),output=path.join(file.dir,file.name+`-real-${width}.png`);
          await page.evaluate(()=>document.activeElement?.blur());await page.screenshot({path:output,fullPage:false});t.diagnostic('真实 CapacityStore 合成任务截图：'+output);
        }
      }
      assert.deepEqual(state.posts,[]);assert.deepEqual(state.errors,[]);
    });
    await t.test('成品补采合同1：仅done任务折叠详情可操作，分页手动继续、防重复且不自动刷新',async()=>{
      const input=fixture(),job='任务 /?#'+ATTACK;input.details[0].job_id=job;
      input.details.push({...input.details[0],job_id:'running-task',status:'running'},{...input.details[0],job_id:'error-task',status:'error'},{...input.details[0],job_id:'canceled-task',status:'canceled'});
      const {page,state}=await setup({data:input});assert.deepEqual(state.posts,[]);
      assert.equal(await page.locator('#summary-machines .output-probe').count(),0);assert.equal(await page.locator('.output-probe').count(),2);
      for(const button of await page.locator('.output-probe button').all())assert.equal(await button.isVisible(),false);
      await refresh(page);await page.locator('#task-evidence > summary').click();
      const task=page.locator('#details > details').first();await task.locator(':scope > summary').click();
      const probe=task.locator('.output-probe'),button=probe.locator('button'),status=probe.locator('[role=status]');
      assert.equal(await button.innerText(),'补采成品尺寸');assert.deepEqual(state.posts,[]);
      const gets=state.gets.length,summary=await page.locator('#summary-machines').textContent();
      let held;state.holdProbe=route=>{held=route;};
      await button.click();await page.waitForFunction(()=>document.querySelector('.output-probe button').disabled);
      await button.evaluate(node=>{node.click();node.dispatchEvent(new MouseEvent('click'));});await tick(page);
      assert.equal(state.posts.length,1);assert.deepEqual(state.posts[0],{path:'/api/capacity/jobs/'+encodeURIComponent(job)+'/probe-outputs',body:{offset:0},csrf:'synthetic-csrf'});
      assert.match(await status.textContent(),/正在补采/);
      assert.ok(held);state.holdProbe=null;await held.fulfill({contentType:'application/json',body:JSON.stringify({processed:4,recorded:3,total:6,next_offset:4})});
      await page.waitForFunction(()=>document.querySelector('.output-probe button').textContent==='继续补采成品尺寸');
      assert.equal(await button.isEnabled(),true);assert.match(await status.textContent(),/本批处理 4 个，成功记录尺寸 3 个；可信最终产物共 6 个/);
      await tick(page);assert.equal(state.posts.length,1);assert.equal(state.gets.length,gets);
      await task.locator(':scope > summary').click();await task.locator(':scope > summary').click();assert.equal(await button.innerText(),'继续补采成品尺寸');assert.equal(state.posts.length,1);
      state.probeResult={processed:2,recorded:1,total:6,next_offset:null};await button.click();
      await page.waitForFunction(()=>document.querySelector('.output-probe button').textContent==='补采已完成');
      assert.deepEqual(state.posts.map(p=>p.body),[{offset:0},{offset:4}]);assert.equal(await button.isDisabled(),true);
      assert.match(await status.textContent(),/本批处理 2 个，成功记录尺寸 1 个；可信最终产物共 6 个。补采已完成，刷新看板查看结果/);
      assert.equal(await task.evaluate(n=>n.open),true);assert.equal(state.gets.length,gets);assert.equal(await page.locator('#summary-machines').textContent(),summary);
      await button.evaluate(n=>n.click());await tick(page);assert.equal(state.posts.length,2);
      await refresh(page);assert.equal(state.gets.length,gets+1);assert.equal(state.posts.length,2);assert.equal(await page.locator('.output-probe button').first().textContent(),'补采成品尺寸');
      assert.equal(await page.evaluate(()=>window.injected),undefined);assert.deepEqual(state.errors,[]);
    });
    await t.test('成品补采合同2：409及失败安全显示，不自动重试，继续批次失败保留offset',async()=>{
      const {page,state}=await setup({evidence:true});const task=page.locator('#details > details').first();await task.locator(':scope > summary').click();
      const probe=task.locator('.output-probe'),button=probe.locator('button'),status=probe.locator('[role=status]');
      state.probeError={status:409,message:'没有可信 final 记录 '+ATTACK};await button.click();await page.waitForFunction(()=>document.querySelector('.output-probe [role=status]').textContent.startsWith('补采失败'));
      assert.match(await status.textContent(),/没有可信最终产物记录，不能猜测成品尺寸/);assert.ok((await status.textContent()).includes(ATTACK));assert.equal(await status.locator('*').count(),0);assert.equal(await button.isEnabled(),true);
      await tick(page);assert.equal(state.posts.length,1);assert.equal(state.gets.length,1);
      state.probeError=null;await button.click();await page.waitForFunction(()=>document.querySelector('.output-probe button').textContent==='继续补采成品尺寸');
      state.probeError={status:500,message:ATTACK};await button.click();await page.waitForFunction(()=>document.querySelector('.output-probe [role=status]').textContent.startsWith('补采失败'));
      assert.equal(await status.textContent(),'补采失败：'+ATTACK);assert.equal(await button.innerText(),'继续补采成品尺寸');assert.equal(await button.isEnabled(),true);
      await tick(page);assert.equal(state.posts.length,3);assert.equal(state.gets.length,1);
      state.probeError=null;state.probeResult={processed:2,recorded:0,total:6,next_offset:null};await button.click();await page.waitForFunction(()=>document.querySelector('.output-probe button').textContent==='补采已完成');
      assert.deepEqual(state.posts.map(p=>p.body),[{offset:0},{offset:0},{offset:4},{offset:4}]);assert.match(await status.textContent(),/成功记录尺寸 0 个/);
      assert.equal(await page.locator('main img, main script, main iframe, main [onerror]').count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);assert.deepEqual(state.errors,[]);
    });
    await t.test('简明首页及详情的名称模型来源配置与警告安全渲染',async()=>{
      const input=summaryFixture();input.workers[0].name=ATTACK;input.workers[0].hardware.gpus[0].name=ATTACK;const g=input.groups[1];g.capability_name=ATTACK;g.model_summary.models[0].name=ATTACK;g.model_summary.precision_label=ATTACK;g.config={cpu:ATTACK};g.warnings=[ATTACK];g.cache_condition={kind:ATTACK};
      const {page,state}=await setup({data:input});const row=page.locator('td.machine-result[data-summary-worker-id=w1] .business-row[data-capability=depth_video]');assert.equal(await row.locator('[data-label="模型名称"]').innerText(),ATTACK);await row.locator('button').click();assert.ok((await page.locator('#machine-summary').innerText()).includes(ATTACK));assert.equal(await page.locator('main img').count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);assert.deepEqual(state.errors,[]);
    });
    await t.test('简明首页390/320手机规格与详情可操作，长模型名称无整页横滚',async()=>{
      const input=summaryFixture(),name='long-main-model-'.repeat(12)+'int8.safetensors';
      input.groups[1].model_summary.models[0].name=name;
      const {page,state}=await setup({data:input});
      assert.equal(await page.locator('td.machine-result[data-summary-worker-id=w1] .business-row[data-capability=depth_video] [data-label="模型名称"]').innerText(),name);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      for(const width of [390,320]) {
        await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        const row=page.locator('td.machine-result[data-summary-worker-id=w1] .business-row[data-capability=depth_video]');await row.locator('select').selectOption('warm');await row.locator('button').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.match(await row.innerText(),/32 秒/);await row.locator('button').click();await row.locator('select').selectOption('c1');
      }
      await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));
      if(process.env.CHOUKA_TEST_SCREENSHOT){await positionMatrix(page);const file=path.parse(process.env.CHOUKA_TEST_SCREENSHOT);await page.screenshot({path:path.join(file.dir,file.name+'-summary-390.png'),fullPage:true});}
      assert.deepEqual(state.errors,[]);
    });
    await t.test('390/320px矩阵局部双向滚动，键盘可操作且机器表头与业务轴保持粘性定位',async()=>{
      const input=summaryFixture(),base=input.groups[1];
      input.groups.push({...base,id:'last-machine',worker_id:'w4',mean_seconds:21});
      for(let i=0;i<2;i++)input.groups.push({...base,id:'scroll-'+i,capability:'scroll-business-'+i,capability_name:'合成滚动业务 '+i});
      const {page,state}=await setup({data:input}),scroll=page.locator('#summary-machines .scroll');
      assert.equal(await scroll.count(),1);assert.equal(await scroll.getAttribute('tabindex'),'0');
      for(const width of [390,320]) {
        await page.setViewportSize({width,height:844});await positionMatrix(page);await assertComparisonTable(page);
        const size=await scroll.evaluate(node=>({client:node.clientWidth,scroll:node.scrollWidth,height:node.clientHeight,fullHeight:node.scrollHeight,maxHeight:parseFloat(getComputedStyle(node).maxHeight),overflow:getComputedStyle(node).overflowX,minWidth:parseFloat(getComputedStyle(node.querySelector('table')).minWidth),columns:node.querySelectorAll('thead .machine-heading').length,head:getComputedStyle(node.querySelector('thead')).display}));
        assert.ok(size.scroll>size.client,'手机只能在矩阵容器内横滚');assert.ok(size.fullHeight>size.height,'合成多业务触发容器纵向滚动');assert.ok(['auto','scroll'].includes(size.overflow));
        assert.equal(size.minWidth,104+(width-130)*size.columns);assert.ok(Math.abs(size.maxHeight-844*.72)<1);assert.equal(size.head,'table-header-group');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        const fixed=await scroll.evaluate(node=>({top:node.querySelector('thead th').getBoundingClientRect().top-node.getBoundingClientRect().top,left:node.querySelector('tbody th.business-axis').getBoundingClientRect().left-node.getBoundingClientRect().left}));
        await scroll.focus();assert.equal(await scroll.evaluate(node=>document.activeElement===node),true);
        await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('#summary-machines .scroll').scrollLeft>0);await waitMatrixScroll(page);
        await scroll.evaluate(node=>node.scrollTo({left:node.scrollWidth,top:240,behavior:'instant'}));await waitMatrixScroll(page);
        const sticky=await scroll.evaluate(node=>({left:node.scrollLeft,top:node.scrollTop,heads:[...node.querySelectorAll('thead th')].map(n=>({position:getComputedStyle(n).position,top:n.getBoundingClientRect().top-node.getBoundingClientRect().top})),axes:[...node.querySelectorAll('th.business-axis')].map(n=>({position:getComputedStyle(n).position,left:n.getBoundingClientRect().left-node.getBoundingClientRect().left}))}));
        assert.ok(sticky.left>0 && sticky.top>0);
        for(const head of sticky.heads){assert.equal(head.position,'sticky');assert.ok(Math.abs(head.top-fixed.top)<1,'纵向滚动时机器表头不离开容器顶部');}
        for(const axis of sticky.axes){assert.equal(axis.position,'sticky');assert.ok(Math.abs(axis.left-fixed.left)<1,'横向滚动时业务轴不离开容器左侧');}
        await assertComparisonTable(page);
        const button=page.locator('td.machine-result[data-summary-worker-id=w4] .business-row[data-capability=depth_video] button');
        await positionMatrix(page,true);await button.focus();await page.keyboard.press('Enter');assert.equal(await button.getAttribute('aria-expanded'),'true');
        const detail=page.locator('#'+await button.getAttribute('aria-controls'));assert.equal(await detail.isVisible(),true);assert.match(await detail.innerText(),/采样编号：last-machine/);
        await assertComparisonTable(page);await page.keyboard.press('Enter');assert.equal(await button.getAttribute('aria-expanded'),'false');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        await assertQuietModelCells(page);
        // 截图前取消键盘焦点；手机使用真实视口捕获，避免全页截图临时改变 vw 布局及滚动边界。
        await page.evaluate(()=>document.activeElement?.blur());
        for(const end of [false,true]) {
          await positionMatrix(page,end);await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));await waitMatrixScroll(page);
          const visible=await scroll.evaluate((node,end)=>{
            const rect=n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
            const headings=[...node.querySelectorAll('thead .machine-heading')],heading=end?headings.at(-1):headings[0];
            const cell=node.querySelector(`tr[data-capability="depth_video"] td[data-summary-worker-id="${heading.dataset.summaryWorkerId}"]`);
            const content=cell.querySelector('.business-row'),name=content.querySelector('[data-label="模型名称"]'),precision=content.querySelector('[data-label="模型精度"]');
            const items=[heading.querySelector('h3'),content.querySelector('.mean-time'),content.querySelector('button')].map(n=>{
              const range=document.createRange();range.selectNodeContents(n);
              return {text:n.textContent,box:rect(n),textRects:[...range.getClientRects()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}))};
            });
            return {container:rect(node),axis:rect(node.querySelector('thead .business-axis')),heading:rect(heading),cell:rect(cell),worker:heading.dataset.summaryWorkerId,items,name:rect(name),precision:rect(precision)};
          },end);
          assert.equal(visible.worker,end?'w4':'w1');
          const left=visible.axis.right,right=visible.container.right;
          for(const [label,box] of [['机器列头',visible.heading],['机器业务格',visible.cell]]) {
            assert.ok(box.left>=left-1,`${width}px ${label}不被固定业务轴遮挡`);assert.ok(box.right<=right+1,`${width}px ${label}完整落在容器右边界内`);
          }
          for(const item of visible.items) {
            assert.ok(item.text.trim() && item.box.width>0 && item.box.height>0);assert.ok(item.textRects.length>0);
            for(const box of [item.box,...item.textRects]) {
              assert.ok(box.left>=left-1 && box.right<=right+1,`${width}px ${item.text}的元素与文字均完整横向可见`);
              assert.ok(box.top>=visible.container.top-1 && box.bottom<=visible.container.bottom+1,`${width}px ${item.text}位于容器纵向可视范围`);
            }
          }
          assert.ok(visible.items[1].box.top>=visible.heading.bottom-1,'平均耗时不被粘性机器表头遮挡');
          assert.ok(visible.items[2].box.top>=visible.heading.bottom-1,'详情按钮不被粘性机器表头遮挡');
          assert.ok(Math.abs(visible.name.left-visible.precision.left)<1 && visible.precision.top>=visible.name.bottom-1,'手机模型名称和精度改为同一列上下展示');
          if(process.env.CHOUKA_TEST_SCREENSHOT){
            const offset=await scroll.evaluate(node=>node.scrollLeft),file=path.parse(process.env.CHOUKA_TEST_SCREENSHOT);
            await page.screenshot({path:path.join(file.dir,file.name+`-summary-${width}${end?'-last-machine':''}.png`),fullPage:false});
            assert.equal(await scroll.evaluate(node=>node.scrollLeft),offset,'截图前后不得改变矩阵横滚位置');
          }
        }
      }
      assert.deepEqual(state.errors,[]);
    });
    await t.test('运行面板入口紧邻费用统计右侧，同级同样式',async()=>{
      const {page}=await setupAdvanced({controller:true});
      const value=await page.locator('header a[href="/controller/costs"]').evaluate(node=>{
        const next=node.nextElementSibling,a=getComputedStyle(node),b=getComputedStyle(next);
        return {href:next.getAttribute('href'),label:next.textContent,tag:next.tagName,parent:next.parentNode===node.parentNode,padding:[a.padding,b.padding],border:[a.border,b.border],background:[a.backgroundColor,b.backgroundColor]};
      });
      assert.equal(value.href,'/controller/capacity');assert.equal(value.label,'产能评估');assert.equal(value.tag,'A');assert.equal(value.parent,true);
      for(const key of ['padding','border','background'])assert.equal(value[key][0],value[key][1]);
    });
    await t.test('真实 auth 鉴权；任务与产物分开，完整聚合不受 100 条分页影响',async()=>{
      const {page,state}=await setupAdvanced();
      assert.match(await page.locator('#account').innerText(),/合成管理员/);
      assert.deepEqual(await page.locator('#task-metrics strong').allTextContents(),['3,213','3,010','101','102']);
      assert.deepEqual(await page.locator('#output-metrics strong').allTextContents(),['未知','4','20','3,190']);
      assert.match(await page.locator('#coverage').innerText(),/已排除 API 99/);
      assert.equal(state.gets[0].limit,'100');assert.equal(state.gets[0].offset,'0');
      assert.match(await page.locator('#machine-groups').innerText(),/3,201/);
      assert.equal(await page.locator('#machine-groups').innerText().then(s=>s.includes('用户卡片名字')),false);
      assert.equal(await page.locator('#machine-groups [data-group-id=h1] strong').innerText(),'深度视频');
      assert.match(await page.locator('#machine-groups [data-group-id=h1]').innerText(),/能力 ID：depth_video/);
      if(process.env.CHOUKA_TEST_SCREENSHOT) {
        const file=path.parse(process.env.CHOUKA_TEST_SCREENSHOT);
        await page.screenshot({path:path.join(file.dir,file.name+'-desktop.png'),fullPage:true});
      }
      assert.deepEqual(state.errors,[]);
    });
    await t.test('同名机器保留 ID；过期硬件、单卡显存、空值和真实零不混淆',async()=>{
      const input=fixture();input.groups[0].mean_seconds=null;input.groups[0].p50_seconds=0;input.workers[1].tasks=0;
      const {page}=await setupAdvanced({data:input});
      assert.equal(await page.locator('#workers .worker').count(),2);
      for(const id of ['w1','w2'])assert.match(await page.locator(`[data-worker-id="${id}"]`).innerText(),new RegExp(id));
      await page.locator('#tab-purchase').click();assert.deepEqual(await page.locator('#estimate-worker option').evaluateAll(nodes=>nodes.map(n=>[n.value,n.textContent])),[['w1','同名机器']]);await page.locator('#tab-machines').click();
      assert.match(await page.locator('[data-worker-id="w2"]').innerText(),/过期/);assert.match(await page.locator('[data-worker-id="w2"]').innerText(),/任务 0/);
      assert.match(await page.locator('[data-worker-id="w1"]').innerText(),/单卡显存 24 GiB/);assert.doesNotMatch(await page.locator('[data-worker-id="w1"]').innerText(),/48 GiB/);
      const row=await page.locator('#machine-groups [data-group-id="h1"]').innerText();assert.match(row,/平均 未知/);assert.match(row,/P50 0 秒/);
      assert.match(await page.locator('#machine-groups [data-group-id="c1"]').innerText(),/P50 未知/);
    });
    await t.test('首载仅请求截至当前秒的全部历史，顶部筛选及分组导出完整移除',async()=>{
      const input=fixture();input.details[0].created_at=Date.parse('2020-01-01T00:00:00Z')/1000;
      const {page,state}=await setupAdvanced({data:input});assert.equal(state.gets.length,1);assertHistoryQuery(state.gets[0]);
      assert.equal(await page.locator('#filters, #period, #custom-range, #from, #to, #worker-filter, #capability-filter, #export, #period-note').count(),0);
      assert.doesNotMatch(await page.locator('main').innerText(),/应用筛选|统计周期（本地时区）|导出分组依据|最近 7 \/ 30 天|CSV 导出当前筛选/);
      assert.match(await page.locator('[data-job-id=history-job]').innerText(),/2020/);
      assert.equal(await page.locator('#refresh').isEnabled(),true);assert.equal(await page.locator('#include-offline').isVisible(),true);
      assert.equal(await page.locator('#machine-groups [data-group-id=other-worker]').count(),1);
      assert.equal(await page.locator('#machine-groups [data-group-id=h2]').count(),1);assert.deepEqual(state.exports,[]);assert.deepEqual(state.errors,[]);
    });
    await t.test('刷新跨日和夏令时仍无日期下界，结束时间使用当前秒而非本地日历',async()=>{
      const {page,state}=await setupAdvanced({timezone:'America/New_York'});assertHistoryQuery(state.gets[0]);
      for(const now of [new Date('2026-11-01T05:59:59.900Z'),new Date('2026-11-01T06:00:01.500Z'),new Date('2026-11-03T15:00:00Z')]) {
        await page.clock.setFixedTime(now);await refresh(page);assertHistoryQuery(state.gets.at(-1),now);
      }
      assert.deepEqual(state.errors,[]);
    });
    await t.test('详情翻页沿用首次结束时间和全历史，立即刷新更新结束时间并恢复首页',async()=>{
      const {page,state}=await setupPurchase();const later=new Date(NOW.getTime()+3*86400000);
      await page.clock.setFixedTime(later);await page.locator('#next').click();await page.waitForSelector('[data-job-id="page-2-job"]');
      assertHistoryQuery(state.gets.at(-1),NOW,100);assert.equal(await page.locator('#task-metrics strong').first().innerText(),'3,213');assert.match(await page.locator('#detail-count').innerText(),/3,201/);
      await page.locator('#previous').click();await page.waitForSelector('[data-job-id="history-job"]');assertHistoryQuery(state.gets.at(-1));
      await page.locator('#next').click();await page.waitForSelector('[data-job-id="page-2-job"]');assertHistoryQuery(state.gets.at(-1),NOW,100);
      await purchase(page);await calculate(page);assertEstimateRange(state.posts.at(-1).body,state.gets[0]);
      await refresh(page);assertHistoryQuery(state.gets.at(-1),later);assert.equal(await page.locator('#export-estimate').isDisabled(),true);
      await page.locator('#tab-machines').click();await page.waitForSelector('[data-job-id="history-job"]');
      await page.locator('#next').click();await page.waitForSelector('[data-job-id="page-2-job"]');assertHistoryQuery(state.gets.at(-1),later,100);
      await purchase(page);await calculate(page);assertEstimateRange(state.posts.at(-1).body,state.gets.at(-1));assert.deepEqual(state.errors,[]);
    });
    await t.test('场景按 capability/规格/来源比较，ARIA 页签支持方向键与焦点',async()=>{
      const {page}=await setupAdvanced();await page.locator('#tab-machines').focus();await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#tab-scenarios').getAttribute('aria-selected'),'true');assert.equal(await page.locator('#tab-machines').getAttribute('tabindex'),'-1');
      assert.equal(await page.locator('#panel-machines').isVisible(),false);
      assert.equal(await page.locator('#scenario-groups tr[data-group-id]').count(),2);
      assert.match(await page.locator('#scenario-groups').innerText(),/w1/);assert.match(await page.locator('#scenario-groups').innerText(),/w2/);assert.doesNotMatch(await page.locator('#scenario-groups').innerText(),/采集业务样本/);
      await page.keyboard.press('End');assert.equal(await page.locator('#tab-purchase').getAttribute('aria-selected'),'true');
      const outline=await page.locator('#tab-purchase').evaluate(node=>getComputedStyle(node).outlineStyle);assert.notEqual(outline,'none');
      await page.keyboard.press('Home');assert.equal(await page.locator('#tab-machines').getAttribute('aria-selected'),'true');
    });
    await t.test('历史多场景测算请求、CSRF、单位与完整警告及 CSV 导出',async()=>{
      const {page,state}=await setupPurchase();await purchase(page);await page.locator('#add-demand').click();await page.locator('.demand-quantity').nth(1).fill('100');await page.locator('#price').fill('19999');await calculate(page);
      const post=state.posts.at(-1);assert.equal(post.csrf,'synthetic-csrf');assertFixedPayload(post.body);assert.equal(post.body.worker_id,'w1');assert.equal(post.body.hours,8);assert.equal(post.body.price,19999);assert.deepEqual(post.body.demands,[{group_id:'h1',quantity:100},{group_id:'h2',quantity:100}]);assertEstimateRange(post.body,state.gets.at(-1));
      assert.deepEqual(await page.locator('#estimate-result > .scroll tbody tr td:first-child').allTextContents(),['生图模式 · 文生图','生图模式 · 图生图']);
      const evidence=await estimateEvidence(page),result=await page.locator('#estimate-result').innerText();for(const warning of [...estimateResponse.warnings,...fixture().groups[0].warnings])assert.ok((await evidence.innerText()).includes(warning));assert.match(result,/不是合格(?:产物)?(?:日产能|日产量)/);assert.match(result,/100 任务/);assert.match(result,/19,999/);
      const downloadPromise=page.waitForEvent('download');await page.locator('#export-estimate').click();const download=await downloadPromise;const csv=readFileSync(await download.path(),'utf8');assert.match(csv,/历史任务运行参考/);assert.match(csv,/缓存情况未知/);assert.match(csv,/config_id/);assert.match(csv,/未包含模型切换/);
    });
    await t.test('自动基线隔离配置和来源，固定 runtime 不冒充验收；无证据模式禁用且完整警告保留',async()=>{
      const groups=[purchaseGroup('captured-image','zimage_t2i',{source:'captured',config_id:'config-1',measured:40,samples:50,days:2,warnings:['覆盖样本仅两天','人工验收覆盖有限']}),
        purchaseGroup('captured-edit','zimage_i2i',{source:'captured',config_id:'config-1',measured:30}),
        purchaseGroup('other-source','zimage_t2i',{source:'standard',config_id:'config-1',benchmark_id:'bench-001',measured:999}),
        purchaseGroup('other-config','zimage_i2i',{source:'captured',config_id:'config-2',measured:999}),
        purchaseGroup('captured-storyboard','flux2_klein_storyboard9',{source:'captured',config_id:'config-1',measured:1}),
        purchaseGroup('no-evidence','flux2_klein_edit',{measured:0,mean_seconds:10})];
      const {page,state}=await setupPurchase({data:purchaseData(groups)});await purchase(page);await page.locator('.demand-quantity').fill('50');
      assert.equal(await page.locator('.demand-group option[value=flux2_klein_edit]').isDisabled(),true);
      await page.locator('#add-demand').click();await page.locator('.demand-group').nth(1).selectOption('zimage_i2i');await page.locator('.demand-quantity').nth(1).fill('10');await calculate(page);
      assertEstimateRange(state.posts.at(-1).body,state.gets.at(-1));assertFixedPayload(state.posts.at(-1).body);
      assert.deepEqual(state.posts.at(-1).body.demands,[{group_id:'captured-image',quantity:50},{group_id:'captured-edit',quantity:10}]);
      const evidence=await estimateEvidence(page);assert.match(await evidence.innerText(),/覆盖样本仅两天/);assert.match(await evidence.innerText(),/人工验收覆盖有限/);assert.match(await evidence.innerText(),/参考样本不足/);
      await page.locator('.demand-group').first().selectOption('flux2_klein_storyboard9');assert.equal(await page.locator('#export-estimate').isDisabled(),true);
    });
    await t.test('每种输入变化立即清除结果，失败不保留旧台数，重复场景不发请求',async()=>{
      const {page,state}=await setupPurchase();await purchase(page);await calculate(page);
      for(const [id,value] of [['hours','9'],['price','20000']]) {await page.locator('#'+id).fill(value);assert.equal(await page.locator('#export-estimate').isDisabled(),true);assert.doesNotMatch(await page.locator('#estimate-result').innerText(),/参考机器数/);await calculate(page);}
      state.estimateError=true;await page.locator('#estimate-submit').click();await page.waitForFunction(()=>!document.querySelector('#estimate-error').hidden);assert.match(await page.locator('#estimate-error').innerText(),/合成证据不足/);assert.doesNotMatch(await page.locator('#estimate-result').innerText(),/参考机器数/);
      state.estimateError=false;await page.locator('#add-demand').click();
      assert.equal(await page.locator('.demand-group').nth(1).locator('option[value=zimage_t2i]').isDisabled(),true,'重复模式首先在下拉禁用');
      // 绕过下拉禁用来验证提交端守卫，而不是让 Playwright 等待选择不可选 option。
      await page.locator('.demand-group').nth(1).evaluate(select=>{select.querySelector('option[value=zimage_t2i]').disabled=false;select.value='zimage_t2i';});
      await page.locator('.demand-quantity').nth(1).fill('10');const count=state.posts.length;await page.locator('#estimate-form').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
      assert.match(await page.locator('#estimate-error').innerText(),/不能重复选择/);assert.equal(state.posts.length,count);assert.equal(await page.locator('#export-estimate').isDisabled(),true);
    });
    await t.test('旧 GET 响应无法覆盖新刷新，旧估算不能恢复输入已变更后的结果',async()=>{
      const {page,state}=await setupPurchase();let release,held;
      const waiting=new Promise(resolve=>held=resolve);state.holdGet=route=>{state.holdGet=null;release=()=>route.fulfill({contentType:'application/json',body:JSON.stringify({...fixture(),overview:{tasks:999999}})});held();};
      await page.locator('#refresh').click();await waiting;const later=new Date(NOW.getTime()+60000);await page.clock.setFixedTime(later);await refresh(page);assertHistoryQuery(state.gets.at(-1),later);
      await release();await tick(page);assert.equal(await page.locator('#task-metrics strong').first().innerText(),'3,213');assert.deepEqual(state.gets.map(q=>q.to),[String(NOW.getTime()/1000),String(NOW.getTime()/1000),String(later.getTime()/1000)]);
      await purchase(page);let releaseEstimate,heldEstimate;const waitingEstimate=new Promise(resolve=>heldEstimate=resolve);state.holdEstimate=route=>{releaseEstimate=()=>route.fulfill({contentType:'application/json',body:JSON.stringify(estimateResponse)});heldEstimate();};
      await page.locator('#estimate-submit').click();await waitingEstimate;await page.locator('#hours').fill('10');await releaseEstimate();await tick(page);assert.equal(await page.locator('#export-estimate').isDisabled(),true);assert.doesNotMatch(await page.locator('#estimate-result').innerText(),/参考机器数/);
      state.holdEstimate=null;await calculate(page);await page.locator('#refresh').click();await loaded(page);assert.equal(await page.locator('#export-estimate').isDisabled(),true);
      assert.deepEqual(state.errors,[]);
    });
    await t.test('旧分页成功或失败晚于刷新返回时，不恢复旧明细、旧错误或旧测算范围',async()=>{
      for(const failed of [false,true]) {
        const {page,state}=await setupPurchase();let release,received;const waiting=new Promise(resolve=>received=resolve);
        state.holdGet=(route,url)=>{
          assert.equal(url.searchParams.get('offset'),'100');state.holdGet=null;
          const stale=fixture();stale.overview.tasks=999999;stale.details=[{...stale.details[0],job_id:'stale-page-job'}];
          release=()=>route.fulfill({status:failed?500:200,contentType:'application/json',body:JSON.stringify(failed?{error:'旧分页错误'}:stale)});received();
        };
        await page.locator('#next').click();await waiting;const later=new Date(NOW.getTime()+120000);await page.clock.setFixedTime(later);await refresh(page);
        await release();await tick(page);assertHistoryQuery(state.gets.at(-1),later);
        assert.equal(await page.locator('#task-metrics strong').first().innerText(),'3,213');assert.equal(await page.locator('[data-job-id=stale-page-job]').count(),0);assert.equal(await page.locator('[data-job-id=history-job]').count(),1);
        assert.equal(await page.locator('#error').isVisible(),false);assert.equal(await page.locator('#previous').isDisabled(),true);
        await purchase(page);await calculate(page);assertEstimateRange(state.posts.at(-1).body,state.gets.at(-1));assert.deepEqual(state.errors,[]);
      }
    });
    await t.test('历史不可验收；采集记录人工标签、未验收 null、零合格、失败与 CSRF；成功仍刷新全历史',async()=>{
      const {page,state}=await setupAdvanced();assert.equal(await page.locator('[data-job-id="history-job"] form').count(),0);
      const record=page.locator('[data-job-id="captured-job"]');await record.locator(':scope > summary').click();await record.locator('select').selectOption('standard');await record.locator('.review-form button').click();assert.match(await record.locator('.review-form [role=status]').innerText(),/标准场景编号/);assert.equal(state.posts.length,0);
      await page.clock.setFixedTime(new Date(NOW.getTime()+60000));
      await record.locator('input:not([type=number])').fill('bench-001');await record.locator('textarea').fill('人工复核，不是自动验证');await record.locator('.review-form button').click();await loaded(page);await page.waitForFunction(()=>document.querySelector('[data-job-id="captured-job"]').textContent.includes('bench-001'));
      assert.deepEqual(state.posts.at(-1).body,{accepted:null,source:'standard',benchmark_id:'bench-001',note:'人工复核，不是自动验证'});assert.equal(state.posts.at(-1).csrf,'synthetic-csrf');
      await record.locator(':scope > summary').click();await record.locator('input[type=number]').fill('0');await record.locator('.review-form button').click();await page.waitForFunction(()=>document.querySelector('[data-job-id="captured-job"]').textContent.includes('人工合格数量：0'));
      assert.equal(state.posts.at(-1).body.accepted,0);assert.equal(state.gets.length,3);for(const query of state.gets)assertHistoryQuery(query);
      await record.locator(':scope > summary').click();state.reviewError=true;await record.locator('.review-form button').click();await page.waitForFunction(()=>document.querySelector('.review-form [role=status]').textContent.includes('保存失败'));assert.match(await record.locator('.review-form [role=status]').innerText(),/合成验收保存失败/);
    });
    await t.test('所有来源文本、规格、证据、警告与错误安全渲染，不截掉警告',async()=>{
      const input=fixture();input.workers[0].name=ATTACK;input.workers[0].hardware.cpu=ATTACK;input.groups[0].capability_name=ATTACK;input.groups[0].dimensions={injected:ATTACK};input.groups[0].warnings=Array.from({length:7},(_,i)=>`${ATTACK} 警告${i}`);input.details[1].outputs=[{name:ATTACK}];input.details[1].review.note=ATTACK;
      const {page,state}=await setupAdvanced({data:input});assert.equal(await page.locator('main img').count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);
      assert.ok((await page.locator('#workers').innerText()).includes(ATTACK));const row=await page.locator('#machine-groups [data-group-id=h1]').innerText();for(const warning of input.groups[0].warnings)assert.ok(row.includes(warning));
      await page.locator('[data-job-id=captured-job] > summary').click();assert.ok((await page.locator('[data-job-id=captured-job]').innerText()).includes(ATTACK));assert.deepEqual(state.errors,[]);
    });
    await t.test('空态、读取失败及全历史刷新恢复不把未知当 0，移除分组导出不影响测算导出',async()=>{
      const input={period:{},overview:{tasks:0,done:0,error:0,canceled:0},workers:[],groups:[],details:[],details_total:0};const {page,state}=await setupAdvanced({data:input});
      assert.match(await page.locator('#workers').innerText(),/暂无执行端/);assert.match(await page.locator('#machine-groups').innerText(),/暂无业务规格/);assert.equal(await page.locator('#output-metrics strong').first().innerText(),'未知');assert.equal(await page.locator('#next').isDisabled(),true);
      assert.equal(await page.locator('#summary-machines table, #summary-machines thead, #summary-machines tbody.machine-group').count(),0);
      assert.match(await page.locator('#summary-machines .empty').innerText(),/当前没有在线机器/);
      await page.locator('#include-offline').check();assert.match(await page.locator('#summary-machines .empty').innerText(),/暂无机器记录/);assert.equal(await page.locator('#summary-machines table').count(),0);
      await page.locator('#tab-purchase').click();assert.equal(await page.locator('#estimate-submit').isDisabled(),true);state.getError=true;await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#error').hidden);assert.match(await page.locator('#error').innerText(),/合成读取失败/);
      assert.equal(await page.locator('#export-estimate').isDisabled(),true);assert.equal(await page.locator('#next').isDisabled(),true);
      state.getError=false;state.data=purchaseFixture();const later=new Date(NOW.getTime()+60000);await page.clock.setFixedTime(later);await refresh(page);assertHistoryQuery(state.gets.at(-1),later);assert.equal(await page.locator('#error').isVisible(),false);
      await purchase(page);await calculate(page);assertEstimateRange(state.posts.at(-1).body,state.gets.at(-1));
      const downloadPromise=page.waitForEvent('download');await page.locator('#export-estimate').click();const csv=readFileSync(await (await downloadPromise).path(),'utf8');assert.match(csv,/历史任务运行参考/);
      assert.equal(await page.locator('#export').count(),0);assert.deepEqual(state.exports,[]);assert.deepEqual(state.errors,[]);
    });
    await t.test('390/320 像素手机无整页横向溢出，三页签与表单可操作',async()=>{
      const {page,state}=await setupPurchase();
      for(const width of [390,320]) {await page.setViewportSize({width,height:844});for(const id of ['machines','scenarios','purchase']){await page.locator('#tab-'+id).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width}px ${id} 不应产生整页横向滚动`);}}
      await page.setViewportSize({width:390,height:844});await page.locator('.demand-quantity').fill('15');await calculate(page);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      if(process.env.CHOUKA_TEST_SCREENSHOT){const file=path.parse(process.env.CHOUKA_TEST_SCREENSHOT);await page.screenshot({path:path.join(file.dir,file.name+'-purchase-390.png'),fullPage:true});}assert.deepEqual(state.errors,[]);
    });
    await t.test('后端日期列表、配置快照和人工来源按实际口径展示',async()=>{
      const input=fixture();input.groups[3].days=['2026-10-01','2026-10-02','2026-10-03'];input.groups[3].samples=35;input.groups[3].config={cpu:'执行时 CPU',gpus:[{name:'执行时 GPU',memory_total_bytes:8*1024**3}]};input.groups[3].config_source='manual+reported';input.groups[3].reviewed=30;input.workers[0].hardware_source='manual+reported';
      const {page}=await setupAdvanced({data:input});const row=page.locator('#machine-groups [data-group-id=c1]');assert.match(await row.innerText(),/样本 35 \/ 3 天/);assert.doesNotMatch(await row.innerText(),/参考样本不足/);assert.match(await row.innerText(),/已人工验收 30/);
      await row.locator('summary').click();assert.match(await row.innerText(),/执行时 GPU/);assert.match(await row.innerText(),/机器上报 \+ 人工声明/);assert.match(await row.innerText(),/2026-10-03/);
      const procurement=structuredClone(input);procurement.groups=procurement.groups.filter(g=>g.source==='captured' && g.config_id==='config-1').map(g=>({...g,capability:g.capability==='depth_video'?'zimage_t2i':g.capability}));
      const actual=await setupPurchase({data:procurement});await purchase(actual.page);await calculate(actual.page);const evidence=await estimateEvidence(actual.page);
      assert.match(await evidence.innerText(),/执行时 CPU/);assert.match(await evidence.innerText(),/当前配置仅作清单参考/);
    });
    await t.test('验收保存晚于分页或刷新返回时清空不确定依据与估算，提示立即刷新恢复全历史',async()=>{
      for(const action of ['page','refresh']) {
        const {page,state,context}=await setupPurchase();let release,received;const saved=new Promise(resolve=>received=resolve);
        await context.route('**/api/capacity/jobs/*/review',route=>{release=()=>route.fulfill({contentType:'application/json',body:'{"ok":true}'});received();});
        await page.locator('[data-job-id=captured-job] > summary').click();await page.locator('[data-job-id=captured-job] .review-form button').click();await saved;
        const later=new Date(NOW.getTime()+60000);await page.clock.setFixedTime(later);
        if(action==='page') {await page.locator('#next').click();await page.waitForSelector('[data-job-id=page-2-job]');assertHistoryQuery(state.gets.at(-1),NOW,100);}
        else {await refresh(page);assertHistoryQuery(state.gets.at(-1),later);}
        await purchase(page);await calculate(page);assertEstimateRange(state.posts.at(-1).body,state.gets.at(-1));
        await release();await page.waitForFunction(()=>document.querySelector('#refresh-state').textContent.includes('人工标记已更新'));
        assert.match(await page.locator('#refresh-state').innerText(),/立即刷新/);assert.equal(await page.locator('#export-estimate').isDisabled(),true);assert.doesNotMatch(await page.locator('#estimate-result').innerText(),/参考机器数/);
        assert.equal(await page.locator('#next').isDisabled(),true);assert.equal(await page.locator('#previous').isDisabled(),true);assert.equal(await page.locator('#details [data-job-id]').count(),0);assert.equal(await page.locator('#summary-machines thead th.machine-heading').count(),0);
        await refresh(page);assertHistoryQuery(state.gets.at(-1),later);await purchase(page);await calculate(page);assertEstimateRange(state.posts.at(-1).body,state.gets.at(-1));assert.deepEqual(state.errors,[]);
      }
    });
    await t.test('新采集不完整样本与标准标签可作 runtime 参考；无正耗时、无实测和未知模式不按零算',async()=>{
      const groups=[purchaseGroup('captured','zimage_t2i',{source:'captured',config_id:'config-1',eligible:false}),
        purchaseGroup('null-runtime','zimage_i2i',{mean_seconds:null}),purchaseGroup('zero-runtime','flux2_klein_edit',{mean_seconds:0}),
        purchaseGroup('negative-runtime','flux2_klein_storyboard9',{mean_seconds:-1}),purchaseGroup('unmeasured','minimax_h3_ref9',{measured:0}),
        purchaseGroup('unknown','not_a_real_mode',{measured:9999})];
      const {page,state}=await setupPurchase({data:purchaseData(groups)});await purchase(page);
      assert.equal(await page.locator('.demand-group option[value=zimage_t2i]').isDisabled(),false);
      for(const id of ['zimage_i2i','flux2_klein_edit','flux2_klein_storyboard9','minimax_h3_ref9'])assert.equal(await page.locator(`.demand-group option[value=${id}]`).isDisabled(),true);
      assert.equal(await page.locator('.demand-group option[value=not_a_real_mode]').count(),0);await calculate(page);assertFixedPayload(state.posts.at(-1).body);assert.equal(state.posts.at(-1).body.demands[0].group_id,'captured');
      assert.match(await page.locator('#estimate-result').innerText(),/100 任务/);assert.match(await page.locator('#estimate-result').innerText(),/不是合格(?:产物)?(?:日产能|日产量)/);
      assert.match(await (await estimateEvidence(page)).innerText(),/完整基线证据不足/);
      state.data.groups=[purchaseGroup('standard','zimage_t2i',{source:'standard',config_id:'config-1',benchmark_id:'bench-001',eligible:false})];await refresh(page);await purchase(page);await page.locator('.demand-quantity').fill('12');await calculate(page);
      assert.equal(state.posts.at(-1).body.demands[0].group_id,'standard');assert.match(await page.locator('#estimate-result').innerText(),/12 任务/);
      await page.locator('.demand-group').evaluate(select=>{select.add(new Option('未知业务','not_a_real_mode'));select.value='not_a_real_mode';select.dispatchEvent(new Event('change',{bubbles:true}));});
      const count=state.posts.length;await page.locator('#estimate-form').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await tick(page);
      assert.equal(state.posts.length,count);assert.equal(await page.locator('#export-estimate').isDisabled(),true);assert.match(await page.locator('#estimate-error').innerText(),/业务|模式|证据|样本/);
    });
    await t.test('相同 dimensions 不合并不同规格或模型版本，跨硬件配置保持独立对比行',async()=>{
      const input=fixture(),base=input.groups[3];input.groups=[base,{...base,id:'same-spec-other-hardware',worker_id:'w2',config_id:'gpu-config-2'}, {...base,id:'different-model-spec',spec_key:'other-model-fingerprint'}, {...base,id:'different-model-config',config:{model_version:'model-v2'}}, {...base,id:'different-env',config:{environment_id:'env-v2'}}];
      const {page}=await setupAdvanced({data:input});await page.locator('#tab-scenarios').click();
      assert.equal(await page.locator('#scenario-filter option').count(),4);assert.deepEqual(await page.locator('#scenario-groups tr[data-group-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.groupId)),['c1','same-spec-other-hardware']);
      const option=await page.locator('#scenario-filter option').evaluateAll(nodes=>nodes.find(n=>n.textContent.includes('model-v2')).value);await page.locator('#scenario-filter').selectOption(option);assert.deepEqual(await page.locator('#scenario-groups tr[data-group-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.groupId)),['different-model-config']);
      assert.match(await page.locator('#scenario-groups').innerText(),/深度视频/);assert.match(await page.locator('#scenario-groups').innerText(),/depth_video/);
    });
    await t.test('同规格的冷暖缓存与未知缓存分开比较并展示原始证据',async()=>{
      const input=fixture(),base=input.groups[3];input.groups=[
        {...base,id:'cold',cache_condition:{kind:'none',nodes:[]}},
        {...base,id:'warm',cache_condition:{kind:'loaders',nodes:[{id:'1',type:'UNETLoader'}]}},
        {...base,id:'unknown',cache_condition:{kind:'unknown',nodes:[]}},
      ];
      const {page}=await setupAdvanced({data:input});await page.locator('#tab-scenarios').click();
      assert.equal(await page.locator('#scenario-filter option').count(),3);
      assert.deepEqual(await page.locator('#scenario-groups tr[data-group-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.groupId)),['cold']);
      const value=await page.locator('#scenario-filter option').evaluateAll(nodes=>nodes.find(n=>n.textContent.includes('加载节点缓存')).value);
      await page.locator('#scenario-filter').selectOption(value);await page.locator('#scenario-groups summary').click();
      assert.match(await page.locator('#scenario-groups').innerText(),/UNETLoader/);
      assert.deepEqual(await page.locator('#scenario-groups tr[data-group-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.groupId)),['warm']);
    });
    await t.test('机器补录入口、部分字段提交、GiB 转字节、人工来源及历史快照不改写',async()=>{
      const input=fixture();input.groups[3].config={cpu:'旧快照 CPU'};const {page,state}=await setupAdvanced({data:input});const worker=page.locator('[data-worker-id=w1]'),form=worker.locator('.profile-form');
      await worker.locator('.profile-details summary').click();await form.locator('button').click();assert.match(await form.locator('[role=status]').innerText(),/没有需要保存/);assert.equal(state.posts.length,0);
      await form.locator('[name=host_id]').fill('host-confirmed');await form.locator('[name=cpu]').fill('人工确认 CPU');await form.locator('[name=memory_total_bytes]').fill('128');await form.locator('[name=environment_id]').fill('env-v2');await form.locator('[name=model_version]').fill('model-v3');await form.locator('[name=disk]').fill('2TB NVMe');await form.locator('[name=note]').fill('人工盘点，不是历史快照');
      await page.clock.setFixedTime(new Date(NOW.getTime()+60000));await form.locator('button').click();await page.waitForFunction(()=>!document.querySelector('#write-status').hidden);
      assert.equal(state.gets.length,2);assertHistoryQuery(state.gets.at(-1));
      const post=state.posts.at(-1);assert.equal(post.path,'/api/capacity/workers/w1');assert.equal(post.csrf,'synthetic-csrf');assert.deepEqual(post.body,{host_id:'host-confirmed',cpu:'人工确认 CPU',memory_total_bytes:128*1024**3,environment_id:'env-v2',model_version:'model-v3',disk:'2TB NVMe',note:'人工盘点，不是历史快照'});
      assert.match(await worker.innerText(),/机器上报 \+ 人工声明/);assert.match(await worker.innerText(),/2TB NVMe/);assert.match(await page.locator('#write-status').innerText(),/不回写历史快照/);assert.deepEqual(state.data.groups[3].config,{cpu:'旧快照 CPU'});
      await worker.locator('.profile-details summary').click();await form.locator('[name=cpu]').fill('');await form.locator('[name=note]').fill('仅更新备注');await form.locator('button').click();await page.waitForFunction(()=>document.querySelector('[data-worker-id=w1]').textContent.includes('仅更新备注'));assert.deepEqual(state.posts.at(-1).body,{note:'仅更新备注'});
    });
    await t.test('机器补录失败保留输入；非法内存不发请求；手机表单无溢出',async()=>{
      const {page,state}=await setupAdvanced();await page.setViewportSize({width:320,height:844});const worker=page.locator('[data-worker-id=w2]'),form=worker.locator('.profile-form');await worker.locator('.profile-details summary').click();
      assert.equal(await form.locator('[name=memory_total_bytes]').inputValue(),'');await form.locator('[name=memory_total_bytes]').fill('-1');await form.locator('button').click();assert.equal(state.posts.length,0);
      await form.locator('[name=memory_total_bytes]').fill('9999999999999999');await form.locator('button').click();assert.match(await form.locator('[role=status]').innerText(),/安全正整数/);assert.equal(state.posts.length,0);
      await form.locator('[name=memory_total_bytes]').fill('');await form.locator('[name=cpu]').fill('待确认 CPU');state.profileError=true;await form.locator('button').click();await page.waitForFunction(()=>document.querySelector('[data-worker-id=w2] .profile-form [role=status]').textContent.includes('保存失败'));
      assert.match(await form.locator('[role=status]').innerText(),/合成配置保存失败/);assert.equal(await form.locator('[name=cpu]').inputValue(),'待确认 CPU');assert.equal(await form.locator('button').isDisabled(),false);assert.deepEqual(state.posts.at(-1).body,{cpu:'待确认 CPU'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    });
    await t.test('机器补录与分页交错时清空依据，晚到分页不能恢复过时数据或测算',async()=>{
      for(const pending of [false,true]) {
        const {page,state,context}=await setupPurchase();let release,received;const saved=new Promise(resolve=>received=resolve);
        await context.route('**/api/capacity/workers/w1',route=>{release=()=>route.fulfill({contentType:'application/json',body:'{"source":"manual"}'});received();});
        const worker=page.locator('[data-worker-id=w1]');await worker.locator('.profile-details summary').click();await worker.locator('[name=note]').fill('异步补录');await worker.locator('.profile-form button').click();await saved;
        let releasePage,receivedPage;const paged=new Promise(resolve=>receivedPage=resolve);
        if(pending)state.holdGet=route=>{state.holdGet=null;releasePage=()=>route.fulfill({contentType:'application/json',body:JSON.stringify(fixture())});receivedPage();};
        await page.locator('#next').click();
        if(pending)await paged;
        else {await page.waitForSelector('[data-job-id=page-2-job]');await purchase(page);await calculate(page);}
        assertHistoryQuery(state.gets.at(-1),NOW,100);await release();await page.waitForFunction(()=>document.querySelector('#refresh-state').textContent.includes('机器配置已更新'));
        if(pending) {await releasePage();await tick(page);}
        assert.match(await page.locator('#refresh-state').innerText(),/机器配置已更新.*立即刷新/);assert.equal(await page.locator('#export-estimate').isDisabled(),true);assert.doesNotMatch(await page.locator('#estimate-result').innerText(),/参考机器数/);
        assert.equal(await page.locator('#details [data-job-id]').count(),0);assert.equal(await page.locator('#summary-machines thead th.machine-heading').count(),0);assert.equal(await page.locator('#next').isDisabled(),true);assert.equal(await page.locator('#previous').isDisabled(),true);
        const later=new Date(NOW.getTime()+60000);await page.clock.setFixedTime(later);await refresh(page);assertHistoryQuery(state.gets.at(-1),later);await purchase(page);await calculate(page);assertEstimateRange(state.posts.at(-1).body,state.gets.at(-1));assert.deepEqual(state.errors,[]);
      }
    });
    await t.test('真实 CapacityStore.report 渲染契约：对象硬件、日期数组、配置和独立标准基准',async()=>{
      const actual=realStoreReport(),report=actual.report;
      for(const group of report.groups) {
        assert.equal(actual.estimates[group.id].daily_capacity_seconds,8*3600*1*.75);
        assert.equal(actual.estimates[group.id].lines[0].daily_units,21600/group.mean_seconds);
      }
      assert.ok(report.groups.every(g=>Array.isArray(g.days)));assert.equal(actual.write.source,'manual');assert.equal(actual.write.hardware.disk,'2TB 契约磁盘');assert.equal(actual.write.note,'契约备注不进入配置快照');
      const standards=report.groups.filter(g=>g.source==='standard');assert.equal(standards.length,2);assert.deepEqual(standards.map(g=>g.benchmark_id).sort(),['contract-bench-a','contract-bench-b']);
      assert.ok(report.groups.filter(g=>g.source!=='historical').every(g=>g.config_id && g.config_source==='manual+reported'));
      const {page,state}=await setupAdvanced({data:report,realEstimates:actual.estimates});assert.match(await page.locator('#workers').innerText(),/契约 CPU/);assert.match(await page.locator('#workers').innerText(),/契约系统/);assert.doesNotMatch(await page.locator('#workers').innerText(),/\[object Object\]/);
      assert.match(await page.locator('#machine-groups').innerText(),/contract-bench-a/);assert.match(await page.locator('#machine-groups').innerText(),/contract-bench-b/);assert.match(await page.locator('#machine-groups').innerText(),/1 天/);
      assert.equal(await page.locator('#summary-machines thead th.machine-heading').count(),1);assert.equal(await page.locator('.business-row').count(),1);assert.equal(await page.locator('.summary-spec option').count(),report.groups.length);
      for(const group of report.groups) {
        await page.locator('.summary-spec').selectOption(group.id);
        assert.equal(await page.locator('.business-row').getAttribute('data-selected-group-id'),group.id);
        assert.match(await page.locator('.business-row').innerText(),new RegExp(`${group.measured} 次`));
      }
      assert.match(actual.mixed_error,/相同来源和相同基准编号/);
      await purchase(page);await calculate(page);assertFixedPayload(state.posts.at(-1).body);
      const estimatedGroup=report.groups.find(g=>g.id===state.posts.at(-1).body.demands[0].group_id);assert.ok(estimatedGroup);
      assert.match(await page.locator('#estimate-result').innerText(),new RegExp(String(actual.estimates[estimatedGroup.id].lines[0].seconds_per_unit)+' 秒'));
      for(const group of standards) {
        state.data={...report,groups:[group]};await refresh(page);await purchase(page);
        assert.equal(await page.locator('.demand-group').inputValue(),'zimage_t2i');await calculate(page);
        assert.deepEqual(state.posts.at(-1).body.demands,[{group_id:group.id,quantity:100}]);
        const evidence=await estimateEvidence(page);assert.ok((await evidence.innerText()).includes(group.benchmark_id));
      }
      state.data=report;await refresh(page);
      await page.locator('#tab-scenarios').click();const choices=await page.locator('#scenario-filter option').evaluateAll(nodes=>nodes.map(n=>({value:n.value,text:n.textContent})));
      const selected=choices.find(c=>c.text.includes('contract-bench-a'));assert.ok(selected);await page.locator('#scenario-filter').selectOption(selected.value);assert.equal(await page.locator('#scenario-groups tr[data-group-id]').count(),1);
      await page.locator('#tab-machines').click();await page.setViewportSize({width:390,height:844});await page.locator('.profile-details summary').click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('.profile-form [name=note]').inputValue(),'契约备注不进入配置快照');assert.match(await page.locator('.profile-form [name=cpu]').inputValue(),/契约 CPU/);assert.doesNotMatch(await page.locator('#workers').innerText(),/"logical_cores"/);
      if(process.env.CHOUKA_TEST_SCREENSHOT){const file=path.parse(process.env.CHOUKA_TEST_SCREENSHOT);await page.screenshot({path:path.join(file.dir,file.name+'-contract.png'),fullPage:true});}
      assert.deepEqual(state.errors,[]);
    });
    await t.test('真实模型合同：提交快照、job归档多变体和默认模板分离，不改变分组均值与测算依据',async()=>{
      const {report,baseline}=realStoreReport(true),history=report.groups.find(g=>g.source==='historical');
      assert.deepEqual(report.groups.map(g=>[g.id,g.mean_seconds,g.eligible,g.spec_key,g.measured]),baseline.groups.map(g=>[g.id,g.mean_seconds,g.eligible,g.spec_key,g.measured]));
      assert.equal(history.model_summary.source,'unrecorded');assert.deepEqual(history.model_summary.models,[]);
      assert.equal(history.model_evidence.total_samples,3);assert.equal(history.model_evidence.recorded_samples,2);assert.equal(history.model_evidence.variants.length,2);
      assert.deepEqual(history.model_evidence.variants.map(v=>v.summary.models.length).sort(),[1,2]);
      assert.ok(history.model_evidence.variants.every(v=>v.source==='archived_task' && v.samples===1 && v.measured===1 && v.summary.runtime_verified===false));
      assert.equal(history.current_model_reference.source,'current_template');assert.equal(history.current_model_reference.capability_name,JSON.parse(readFileSync(path.join(__dirname,'..','manifests','zimage_t2i.json'),'utf8')).name);
      for(const group of report.groups.filter(g=>g.source!=='historical')) {
        assert.equal(group.model_evidence.variants[0].source,'task_snapshot');
        assert.equal(group.model_evidence.variants[0].summary.models[0].name,'contract-model.safetensors');
      }
      const {page,state}=await setup({data:report});const row=page.locator('.business-row');await row.locator('select').selectOption(history.id);
      assert.doesNotMatch(await row.textContent(),/模型记录覆盖|保留的原任务记录|任务组合/);
      for(const label of ['模型名称','模型精度'])assert.equal(await row.locator(`[data-label="${label}"] .model-variant`).count(),2);
      await assertQuietModelCells(page);
      const precisionByName={'contract-first-bf16.safetensors':['文件标记 BF16','加载配置 FP8（fp8_e4m3fn）'],'contract-second-int8.safetensors':['INT8'],'contract-other-fp16.safetensors':['FP16']};
      const recordedNames=history.model_evidence.variants.flatMap(v=>v.summary.models.map(m=>m.name));
      assert.deepEqual([...recordedNames].sort(),Object.keys(precisionByName).sort());
      await assertModelLabels(row,recordedNames,recordedNames.map(name=>precisionByName[name]));
      assert.doesNotMatch(await row.innerText(),/contract-current|高噪声|低噪声/);assert.match(await row.innerText(),/40 秒/);
      assert.match(await row.innerText(),/全组历史任务平均，非某个模型或组合专属速度/);
      await row.locator('button').click();const detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));
      assert.match(await detail.innerText(),/模型记录覆盖 2 \/ 3 次/);
      for(const text of ['文件标记 BF16','加载配置 FP8（fp8_e4m3fn）','文件标记 INT8','文件标记 FP16'])assert.ok((await detail.innerText()).includes(text),text);
      assert.match(await detail.innerText(),/当前工具默认配置（非历史执行记录）/);assert.match(await detail.innerText(),/contract-current-fp8/);
      for(const index of [1,2])assert.ok((await detail.innerText()).includes(`历史任务记录组合 ${index} · 保留的原任务记录 · 1 次记录 / 1 次成功耗时`));
      assert.match(await detail.innerText(),/不同任务记录对应不同模型组合；每个组合内的主模型才属于同一个图/);
      for(const warning of history.warnings)assert.ok((await detail.innerText()).includes(warning));
      assert.deepEqual(state.errors,[]);
    });
    await t.test('采购合同1：彻底删除可变口径控件，11模式与卡片清单及所有真实route别名对照',async()=>{
      const cards=JSON.parse(readFileSync(path.join(__dirname,'..','manifests','_cards.json'),'utf8'));
      const modes=cards.filter(c=>['card_image','card_video'].includes(c.id)).flatMap(c=>c.modes.map(m=>({id:m.id,label:(c.id==='card_image'?'生图模式':'生视频模式')+' · '+m.name,routes:[m.id,...Object.values(m.modelSwitch || {}),...Object.values(m.ladder || {})]})));
      assert.deepEqual(PURCHASE_MODES.map(m=>m.slice(0,2)),modes.map(m=>[m.id,m.label]));assert.equal(modes.length,11);
      for(const mode of modes)assert.ok(mode.routes.every(route=>PURCHASE_MODES.find(m=>m[0]===mode.id)[2].includes(route)),mode.id+' 卡片路由遗漏');
      const {page,state}=await setupPurchase();await purchase(page);
      assert.equal(await page.locator('#mode,#quality,#baseline,#availability,#utilization').count(),0,'不能以 hidden 保留旧口径 DOM');
      assert.equal(await page.locator('label').filter({has:page.locator('#estimate-worker')}).locator(':scope > span').innerText(),'电脑显卡配置选择');
      assert.deepEqual(await page.locator('.demand-group option').evaluateAll(nodes=>nodes.map(n=>[n.value,n.textContent.trim()])),PURCHASE_MODES.map(m=>m.slice(0,2)));
      assert.doesNotMatch(await page.locator('.demand-group').innerText(),/depth_video|config-|historical|captured|spec-|任务|未知|样本|[0-9a-f]{32}/);
      for(const [mode,label,aliases] of PURCHASE_MODES)for(const capability of aliases) {
        const manifest=JSON.parse(readFileSync(path.join(__dirname,'..','manifests',capability+'.json'),'utf8'));
        assert.equal(manifest.kind,'gen');assert.ok(['image','video'].includes(manifest.outputType));
        state.data=purchaseData([purchaseGroup('route-'+capability,capability,{capability_name:ATTACK})]);await refresh(page);await purchase(page);
        assert.equal(await page.locator(`.demand-group option[value=${mode}]`).isDisabled(),false,capability+' 应映射 '+mode);
        await page.locator('.demand-group').selectOption(mode);assert.equal(await page.locator('.demand-group option:checked').innerText(),label);await calculate(page);
        assert.equal(state.posts.at(-1).body.demands[0].group_id,'route-'+capability);assertFixedPayload(state.posts.at(-1).body);
        assert.equal(await page.locator('#estimate-result table tbody tr td').first().innerText(),label);
      }
      assert.equal(await page.locator('main img').count(),0);assert.deepEqual(state.errors,[]);
    });
    await t.test('采购合同2：同名在线按ID保留、离线不可伪造提交，无样本电脑可选且刷新剔除离线清旧估算',async()=>{
      const base=purchaseFixture().workers[0],workers=['idle','busy','online','running','offline','disabled','syncing','error','unavailable'].map((state,i)=>({...base,id:'worker-'+i,name:'同名电脑',state}));
      const groups=[purchaseGroup('online-group','zimage_t2i',{worker_id:'worker-0'}),purchaseGroup('offline-group','zimage_t2i',{worker_id:'worker-4'})];
      const {page,state}=await setupPurchase({data:purchaseData(groups,workers)});await purchase(page);
      assert.deepEqual(await page.locator('#estimate-worker option').evaluateAll(nodes=>nodes.map(n=>[n.value,n.textContent])),workers.slice(0,4).map(w=>[w.id,w.name]));
      await page.locator('#estimate-worker').selectOption('worker-1');assert.equal(await page.locator('#estimate-worker').inputValue(),'worker-1');assert.equal(await page.locator('#estimate-submit').isDisabled(),true);
      assert.match(await page.locator('#panel-purchase').innerText(),/暂无.*样本|没有.*样本|缺少.*样本|无.*耗时|暂无.*耗时/);
      await page.locator('#estimate-worker').selectOption('worker-0');await page.locator('.demand-quantity').fill('100');await calculate(page);
      await page.locator('#estimate-worker').evaluate(select=>{select.add(new Option('同名电脑','worker-4'));select.value='worker-4';select.dispatchEvent(new Event('change',{bubbles:true}));});
      const count=state.posts.length;await page.locator('#estimate-form').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await tick(page);assert.equal(state.posts.length,count);
      assert.equal(await page.locator('#export-estimate').isDisabled(),true);assert.match(await page.locator('#panel-purchase').innerText(),/在线|离线/);
      await refresh(page);await page.locator('#estimate-worker').selectOption('worker-0');await page.locator('.demand-quantity').fill('100');await calculate(page);
      let release,received;const pending=new Promise(resolve=>received=resolve);state.holdEstimate=route=>{release=()=>route.fulfill({contentType:'application/json',body:JSON.stringify({...estimateResponse,worker_id:'worker-0',lines:[{group_id:'online-group',quantity:100,seconds_per_unit:60,daily_units:360}]})});received();};
      await page.locator('#estimate-submit').click();await pending;
      state.data.workers[0].state='offline';await refresh(page);await release();await tick(page);state.holdEstimate=null;
      assert.equal(await page.locator('#estimate-worker option[value=worker-0]').count(),0);assert.equal(await page.locator('#export-estimate').isDisabled(),true);
      assert.doesNotMatch(await page.locator('#estimate-result').innerText(),/参考机器数/);
      state.data.workers.forEach(w=>w.state='offline');await refresh(page);assert.equal(await page.locator('#estimate-submit').isDisabled(),true);assert.match(await page.locator('#panel-purchase').innerText(),/暂无.*在线|没有.*在线|无在线/);assert.deepEqual(state.errors,[]);
    });
    await t.test('采购合同3：工具箱、未知和API不入模式；正耗时且实测次数为正才可用，不把未知或0当速度',async()=>{
      const groups=[purchaseGroup('tool','depth_video'),purchaseGroup('tool-image','rmbg_cutout'),purchaseGroup('unknown','fake_generation'),purchaseGroup('api','zimage_t2i',{source:'api'}),
        purchaseGroup('null','zimage_i2i',{mean_seconds:null}),purchaseGroup('zero','flux2_klein_edit',{mean_seconds:0}),purchaseGroup('negative','flux2_klein_storyboard9',{mean_seconds:-5}),
        purchaseGroup('unmeasured','minimax_h3_ref4',{measured:0}),purchaseGroup('negative-measured','minimax_h3_ref9',{measured:-1}),purchaseGroup('missing-measured','minimax_h3_talk1',{measured:null})];
      const {page,state}=await setupPurchase({data:purchaseData(groups)});await page.locator('#tab-purchase').click();
      assert.equal(await page.locator('.demand-group option').count(),11);assert.equal(await page.locator('.demand-group option:not(:disabled)').count(),0);assert.equal(await page.locator('#estimate-submit').isDisabled(),true);
      assert.equal(await page.locator('.demand-group').isDisabled(),true);assert.equal(await page.locator('.demand-quantity').isDisabled(),true);assert.equal(await page.locator('#add-demand').isDisabled(),true);
      assert.match(await page.locator('#panel-purchase').innerText(),/样本|耗时|证据/);assert.equal(state.posts.length,0);assert.equal(await page.locator('#export-estimate').isDisabled(),true);
      state.data.groups.push(purchaseGroup('positive','qwen_image_21_i2i',{mean_seconds:.4,measured:1}));await refresh(page);await purchase(page);await page.locator('.demand-group').selectOption('zimage_i2i');await calculate(page);
      assert.deepEqual(state.posts.at(-1).body.demands,[{group_id:'positive',quantity:100}]);assert.match(await page.locator('#estimate-result').innerText(),/0.4 秒/);assert.deepEqual(state.errors,[]);
    });
    await t.test('采购合同4：共同bucket全集而非逐模式贪心，config/source/benchmark任何一项不同都拒绝混算',async()=>{
      const groups=[purchaseGroup('local-image','zimage_t2i',{config_id:'local',source:'captured',measured:1000}),
        purchaseGroup('local-video','minimax_h3_i2v',{config_id:'different',source:'captured',measured:1000}),
        purchaseGroup('shared-image','zimage_t2i',{config_id:'common',source:'captured',measured:30}),purchaseGroup('shared-video','minimax_h3_flf2v',{config_id:'common',source:'captured',measured:20}),
        purchaseGroup('runner-image','zimage_t2i',{config_id:'runner',source:'standard',benchmark_id:'same',measured:10}),purchaseGroup('runner-video','minimax_h3_i2v',{config_id:'runner',source:'standard',benchmark_id:'same',measured:10})];
      const {page,state}=await setupPurchase({data:purchaseData(groups)});await purchase(page);await page.locator('#add-demand').click();await page.locator('.demand-group').nth(1).selectOption('minimax_h3_flf2v');await page.locator('.demand-quantity').nth(1).fill('20');await calculate(page);
      assert.deepEqual(state.posts.at(-1).body.demands,[{group_id:'shared-image',quantity:100},{group_id:'shared-video',quantity:20}]);
      for(const [left,right] of [
        [{config_id:'a',source:'captured'},{config_id:'b',source:'captured'}],
        [{config_id:'a',source:'captured'},{config_id:'a',source:'historical'}],
        [{config_id:'a',source:'standard',benchmark_id:'bench-a'},{config_id:'a',source:'standard',benchmark_id:'bench-b'}],
        [{config_id:'a',source:'captured'},{config_id:'a',source:'standard',benchmark_id:'bench-a'}],
      ]) {
        state.data.groups=[purchaseGroup('image','zimage_t2i',left),purchaseGroup('video','minimax_h3_i2v',right)];await refresh(page);await purchase(page);
        await page.locator('#add-demand').click();await page.locator('.demand-group').nth(1).selectOption('minimax_h3_flf2v');await page.locator('.demand-quantity').nth(1).fill('1');
        const count=state.posts.length;await page.locator('#estimate-form').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await tick(page);
        assert.equal(state.posts.length,count);assert.equal(await page.locator('#export-estimate').isDisabled(),true);assert.match(await page.locator('#estimate-error').innerText(),/相同|共同|同一/);
        assert.ok((await page.locator('#estimate-error').innerText()).length<180,'报错简明，不暴露配置hash堆栈');
      }
      // standard 缺编号不许借用另一个标准编号补齐共同集合。
      state.data.groups=[purchaseGroup('image','zimage_t2i',{source:'standard',benchmark_id:null}),purchaseGroup('video','minimax_h3_i2v',{source:'standard',benchmark_id:'bench'})];await refresh(page);await purchase(page);await page.locator('#add-demand').click();await page.locator('.demand-group').nth(1).selectOption('minimax_h3_flf2v');await page.locator('.demand-quantity').nth(1).fill('1');
      const count=state.posts.length;await page.locator('#estimate-form').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await tick(page);assert.equal(state.posts.length,count);assert.deepEqual(state.errors,[]);
    });
    await t.test('采购合同5：逐级挑选单个原group，冲突精确规格绝不均值合并，bucket与需求选择顺序无关稳定',async()=>{
      const base={config_id:'same',source:'captured',dimensions:{width:1024,height:1024},measured:20,samples:30,last_sample_at:100,mean_seconds:60};
      const stages=[
        [purchaseGroup('measured','zimage_t2i',{...base,measured:21,mean_seconds:90}),purchaseGroup('samples','krea2_t2i',{...base,samples:9999}), 'measured'],
        [purchaseGroup('samples','zimage_t2i',{...base,samples:31,mean_seconds:80}),purchaseGroup('fresh','krea2_t2i',{...base,last_sample_at:9999}), 'samples'],
        [purchaseGroup('fresh','zimage_t2i',{...base,last_sample_at:101,mean_seconds:70}),purchaseGroup('slow','krea2_t2i',{...base,mean_seconds:999}), 'fresh'],
        [purchaseGroup('slow','zimage_t2i',{...base,mean_seconds:65}),purchaseGroup('fast','krea2_t2i',{...base,mean_seconds:1}), 'slow'],
        [purchaseGroup('exact-cold','zimage_t2i',{...base,measured:21,mean_seconds:71,spec_key:'cold-model-a',spec:{model_version:'model-a'},cache_condition:{kind:'none',nodes:[]}}),
          purchaseGroup('exact-warm','zimage_t2i',{...base,mean_seconds:7,spec_key:'warm-model-b',spec:{model_version:'model-b'},cache_condition:{kind:'loaders',nodes:[{id:'1',type:'UNETLoader'}]}}), 'exact-cold'],
      ];
      const {page,state}=await setupPurchase();
      for(const [first,second,expected] of stages)for(const groups of [[first,second],[second,first]]) {
        state.data.groups=groups;await refresh(page);await purchase(page);await calculate(page);assert.equal(state.posts.at(-1).body.demands[0].group_id,expected);
        assert.match(await page.locator('#estimate-result').innerText(),new RegExp(first.mean_seconds+' 秒'));
      }
      const tied=[purchaseGroup('stable-a','zimage_t2i',{...base,spec_key:'model-a-hash',spec:{model_version:'model-a'},mean_seconds:65}),
        purchaseGroup('stable-b','qwen_image_2512_t2i',{...base,spec_key:'model-b-hash',spec:{model_version:'model-b'},cache_condition:{kind:'loaders',nodes:[{id:'1',type:'UNETLoader'}]},mean_seconds:65})];
      let stable;
      for(const groups of [tied,[...tied].reverse()]) {state.data.groups=groups;await refresh(page);await purchase(page);await calculate(page);const id=state.posts.at(-1).body.demands[0].group_id;assert.ok(tied.some(g=>g.id===id));if(stable)assert.equal(id,stable);stable=id;}
      const competing=[purchaseGroup('a-image','zimage_t2i',{config_id:'a',source:'captured',measured:11}),purchaseGroup('a-edit','zimage_i2i',{config_id:'a',source:'captured',measured:9}),
        purchaseGroup('b-image','krea2_t2i',{config_id:'b',source:'captured',measured:10}),purchaseGroup('b-edit','krea2_i2i',{config_id:'b',source:'captured',measured:10})];
      let selected;
      for(const reverse of [false,true]) {
        state.data.groups=reverse?[...competing].reverse():competing;await refresh(page);await purchase(page);
        await page.locator('.demand-group').selectOption(reverse?'zimage_i2i':'zimage_t2i');await page.locator('#add-demand').click();await page.locator('.demand-group').nth(1).selectOption(reverse?'zimage_t2i':'zimage_i2i');await page.locator('.demand-quantity').nth(1).fill('100');await calculate(page);
        const ids=state.posts.at(-1).body.demands.map(d=>d.group_id).sort();if(selected)assert.deepEqual(ids,selected);selected=ids;
      }
      assert.equal(selected.length,2);assert.equal(new Set(selected.map(id=>bucket(competing.find(g=>g.id===id)))).size,1);assert.deepEqual(state.errors,[]);
    });
    await t.test('采购合同6：固定100%可用与75%预留保留to/worker/hours/price，中文主表与折叠完整证据CSV一致',async()=>{
      const group=purchaseGroup('exact-evidence','krea2_t2i',{source:'captured',config_id:'exact-config',spec_key:'exact-hash',mean_seconds:90,measured:40,samples:50,
        spec:{models:[{name:'evidence-model.safetensors'}],expected:{width:1024,height:1024}},config:{cpu:'执行配置CPU',environment_id:'精确环境'},warnings:[ATTACK,'证据警告末项'],model_summary:modelSummary([{name:'evidence-model.safetensors',precision:'BF16'}])});
      const {page,state}=await setupPurchase({data:purchaseData([group])});await purchase(page);await page.locator('#hours').fill('10');await page.locator('#price').fill('25000');await calculate(page);
      const body=state.posts.at(-1).body;assertFixedPayload(body);assertEstimateRange(body,state.gets[0]);assert.equal(body.hours,10);assert.equal(body.price,25000);assert.equal(body.worker_id,'w1');
      assert.deepEqual(Object.keys(body).sort(),['availability','demands','hours','mode','price','quality','to','utilization','worker_id'].sort());
      const root=page.locator('#estimate-result');assert.equal(await root.locator('table tbody tr td').first().innerText(),'生图模式 · 文生图');
      assert.match(await root.innerText(),/单机每日可用容量时间：27,000 秒/);assert.equal(await root.locator('table tbody tr td').nth(3).innerText(),'300 任务/天');
      assert.doesNotMatch(await root.innerText(),/exact-hash|exact-config|captured|evidence-model|证据警告末项/);
      const evidence=await estimateEvidence(page);for(const text of ['exact-evidence','exact-hash','exact-config','执行配置CPU','evidence-model.safetensors',...group.warnings,...estimateResponse.warnings,...estimateResponse.assumptions])assert.ok((await evidence.innerText()).includes(text),text);
      assert.equal(await page.locator('main img').count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);
      const downloadPromise=page.waitForEvent('download');await page.locator('#export-estimate').click();const csv=readFileSync(await (await downloadPromise).path(),'utf8');
      for(const text of ['exact-evidence','exact-hash','exact-config','执行配置CPU','evidence-model.safetensors','证据警告末项','未包含模型切换','availability','utilization'])assert.ok(csv.includes(text),text);
      await page.locator('.demand-quantity').fill('101');assert.equal(await page.locator('#export-estimate').isDisabled(),true);await calculate(page);
      await page.locator('.demand-group').selectOption('zimage_t2i');await page.locator('#estimate-worker').dispatchEvent('change');assert.equal(await page.locator('#export-estimate').isDisabled(),true);assert.deepEqual(state.errors,[]);
    });
    await t.test('采购合同7：桌面390/320响应式真实交互与截图，结果依据默认折叠且展开仍无整页横滚',async()=>{
      const group=purchaseGroup('responsive','minimax_h3_talk1',{spec_key:'long-spec-'.repeat(50),config_id:'long-config-'.repeat(30),warnings:['长警告'.repeat(100)]});
      const {page,state}=await setupPurchase({data:purchaseData([group])});await purchase(page);
      for(const width of [1440,390,320]) {
        await page.setViewportSize({width,height:width===1440?1000:844});await page.locator('.demand-group').selectOption('minimax_h3_talk2');await page.locator('.demand-quantity').fill('100');await calculate(page);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,width+'px 采购结果不整页横滚');
        const details=page.locator('#estimate-result > details').filter({has:page.locator('summary').filter({hasText:'计算依据'})});assert.equal(await details.evaluate(n=>n.open),false);
        assert.equal(await page.locator('#estimate-result table tbody tr td').first().innerText(),'生视频模式 · H3 说话唱歌');
        const box=await page.locator('.demand-group').boundingBox();assert.ok(box.width>=120);assert.ok(box.x>=0 && box.x+box.width<=width);
        if(process.env.CHOUKA_TEST_SCREENSHOT) {const file=path.parse(process.env.CHOUKA_TEST_SCREENSHOT);await page.screenshot({path:width===1440?process.env.CHOUKA_TEST_SCREENSHOT:path.join(file.dir,file.name+`-purchase-${width}.png`),fullPage:true});}
        await details.locator(':scope > summary').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,width+'px 完整依据不整页横滚');await details.locator(':scope > summary').click();
      }
      assert.equal(state.posts.length,3);assert.deepEqual(state.errors,[]);
    });
    await t.test('普通身份不能读取产能 API',async()=>{const {page,state}=await setupAdvanced({role:'user'});await page.waitForURL('http://capacity.test/');assert.equal(state.gets.length,0);});
  } finally {await Promise.all(contexts.map(context=>context.close()));await browser.close();}
});
