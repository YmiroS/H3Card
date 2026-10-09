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
function realStoreReport(withModelEvidence=false) {
  // 真正调用 CapacityStore，只创建内存 SQLite；不启动服务、不读取项目数据库。
  const script = `
import json, sqlite3, sys, threading, time
from types import SimpleNamespace
sys.path.insert(0, sys.argv[1])
from server.capacity import CapacityStore, make_spec
connection = sqlite3.connect(':memory:')
connection.row_factory = sqlite3.Row
connection.executescript('''
CREATE TABLE workers (id TEXT PRIMARY KEY, name TEXT, last_seen REAL, comfy_online INTEGER, busy INTEGER, capabilities_json TEXT);
CREATE TABLE cost_events (job_id TEXT PRIMARY KEY, event_kind TEXT, capability TEXT, worker_id TEXT, status TEXT, created_at REAL, runtime_seconds REAL, dimensions_json TEXT);
''')
store = CapacityStore(SimpleNamespace(db=connection, lock=threading.RLock(), offline_seconds=30))
now = time.time()
caps = {'host_id':'contract-host','environment_id':'contract-env-v1','model_version':'contract-model-v1','telemetry':{'cpu':{'model':'契约 CPU','architecture':'x86_64','logical_cores':16},'os':{'name':'契约系统','release':'v1','version':'release-1'},'memory':{'total_bytes':64*1024**3},'gpus':[{'name':'契约 GPU','memory_total_bytes':24*1024**3}]}}
worker = {'id':'contract-worker','name':'契约机器','last_seen':now,'comfy_online':1,'busy':0,'capabilities_json':json.dumps(caps)}
connection.execute('INSERT INTO workers VALUES (:id,:name,:last_seen,:comfy_online,:busy,:capabilities_json)',worker)
profile = store.update_worker(worker['id'], {'disk':'2TB 契约磁盘','note':'契约备注不进入配置快照'})
graph = {'1':{'class_type':'CheckpointLoaderSimple','inputs':{'ckpt_name':'contract-model.safetensors'}},'2':{'class_type':'KSampler','inputs':{'model':['1',0],'steps':20,'seed':42}},'3':{'class_type':'SaveImage','inputs':{'images':['2',0],'filename_prefix':'synthetic'}}}
params = {'workflow_version':'contract-workflow-v1','model_version':'contract-model-v1','output_kind':'image','output_count':1,'steps':20}
payload = {'capability':'contract_image','graph':graph,'capacity_spec':make_spec('contract_image',params,graph,{'width':512,'height':512})}
for index, benchmark in enumerate([None,'contract-bench-a','contract-bench-b']):
    job = 'contract-job-' + str(index)
    assigned = now + index * 30 + 1
    store.enqueue(job,payload,assigned)
    store.assigned(job,worker,'lease-'+job,assigned)
    store.running(job,worker['id'],'lease-'+job,assigned+1)
    store.terminal(job,worker['id'],'lease-'+job,'done',assigned+11,released=True,outputs=[{'key':job+'-output','kind':'image','bytes':1024,'width':512,'height':512,'valid':True}],measurements={'prepare_seconds':1,'execute_seconds':8,'upload_seconds':1,'total_seconds':10,'graph_changed':False,'cached_nodes':[]})
    if benchmark:
        store.review(job,{'accepted':1,'source':'standard','benchmark_id':benchmark,'note':'人工标签'})
connection.execute('INSERT INTO cost_events VALUES (?,?,?,?,?,?,?,?)',('contract-history','generation','contract_image',worker['id'],'done',now-100,20,json.dumps({'width':512,'height':512})))
baseline = None
if sys.argv[2] == 'evidence':
    import copy
    from unittest.mock import patch
    from server import app
    connection.execute('CREATE TABLE dispatch_jobs (job_id TEXT PRIMARY KEY, payload_json TEXT)')
    for job, runtime in [('contract-history-other', 40), ('contract-history-unknown', 60)]:
        connection.execute('INSERT INTO cost_events VALUES (?,?,?,?,?,?,?,?)',(job,'generation','contract_image',worker['id'],'done',now-100,runtime,json.dumps({'width':512,'height':512})))
    baseline = store.report()
    pair = copy.deepcopy(graph)
    pair['1']['inputs'].update(ckpt_name='contract-first-bf16.safetensors',weight_dtype='fp8_e4m3fn')
    pair['4'] = {'class_type':'UNETLoader','inputs':{'unet_name':'contract-second-int8.safetensors'}}
    pair['5'] = {'class_type':'KSampler','inputs':{'model':['4',0],'latent_image':['2',0]}}
    pair['3']['inputs']['images'] = ['5',0]
    other = copy.deepcopy(graph)
    other['1']['inputs']['ckpt_name'] = 'contract-other-fp16.safetensors'
    for job, archived_graph in [('contract-history', pair), ('contract-history-other', other)]:
        connection.execute('INSERT INTO dispatch_jobs VALUES (?,?)',(job,json.dumps({'capability':'contract_image','graph':archived_graph})))
    report = store.report()
    template = copy.deepcopy(graph)
    template['1']['inputs']['ckpt_name'] = 'contract-current-fp8.safetensors'
    with patch.dict(app.CAPS, {'contract_image':{'name':'契约图像工具','graph':'graphs/contract-template.json'}}, clear=True), patch('pathlib.Path.read_text', return_value=json.dumps(template)):
        report = app.capacity_model_references(report)
else:
    report = store.report()
print(json.dumps({'report':report,'write':profile,'baseline':baseline},ensure_ascii=False))
connection.close()
`;
  return JSON.parse(execFileSync(process.env.CHOUKA_TEST_PYTHON || 'python3',['-c',script,path.join(__dirname,'..'),withModelEvidence?'evidence':'basic'],{encoding:'utf8'}));
}
const estimateResponse = {mode:'historical',quality:'technical',worker_id:'w1',total_seconds:12000,daily_capacity_seconds:19440,machines:1,price_total:null,lines:[{group_id:'h1',quantity:100,seconds_per_unit:60,daily_units:324},{group_id:'h2',quantity:100,seconds_per_unit:60,daily_units:324}],warnings:['测算响应警告一','测算响应警告二'],assumptions:['未包含模型切换','单机并发槽位为一']};
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
async function purchase(page, mode='historical') {await page.locator('#tab-purchase').click();if(mode!=='historical')await page.locator('#mode').selectOption(mode);await page.locator('.demand-quantity').first().fill('100');}
async function calculate(page) {await page.locator('#estimate-submit').click();await page.waitForFunction(() => !document.querySelector('#export-estimate').disabled);}

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
        const lines=payload.demands.map(demand=>{const group=state.data.groups.find(g=>g.id===demand.group_id);const seconds=payload.mode==='historical'?group.mean_seconds:payload.quality==='accepted'?group.qualified_seconds_per_unit:group.seconds_per_unit;return {...demand,seconds_per_unit:seconds,daily_units:19440/seconds};});
        return json({...estimateResponse,mode:payload.mode,quality:payload.quality,lines});
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
  try {
    await t.test('简明首页默认折叠技术与任务证据，仅展示当前在线和全部历史业务',async()=>{
      const {page,state}=await setup({data:summaryFixture()});
      for(const id of ['technical-details','task-evidence'])assert.equal(await page.locator('#'+id).evaluate(n=>n.open),false);
      assert.equal(await page.locator('#workers').isVisible(),false);assert.equal(await page.locator('#details').isVisible(),false);
      assert.equal(await page.locator('#online-count').innerText(),'当前在线 3 台');assert.equal(await page.locator('.machine-strip').count(),3);
      assert.equal(await page.locator('[data-summary-worker-id=w2]').count(),0);assert.equal(await page.locator('[data-summary-worker-id=w1] .business-row').count(),2);
      const main=await page.locator('#machine-summary').innerText();assert.match(main,/历史.*业务/);assert.doesNotMatch(main,/所选时间段/);assert.match(main,/不代表当前均可执行/);assert.match(main,/非纯 GPU 耗时/);assert.doesNotMatch(main,/Worker ID|config-1|runtime|eligible/);assert.match(main,/sample-main-int8\.safetensors/);
      assert.deepEqual(await page.locator('[data-summary-worker-id=w1] th').allTextContents(),['业务能力','任务规格','模型名称','模型精度','平均生成时间','样本 / 详情']);
      assert.match(await page.locator('[data-summary-worker-id=w4]').innerText(),/暂无.*记录/);assert.doesNotMatch(await page.locator('[data-summary-worker-id=w4]').innerText(),/该时间范围/);assert.equal(await page.locator('[data-summary-worker-id=w4] .business-row').count(),0);
      if(process.env.CHOUKA_TEST_SCREENSHOT){const file=path.parse(process.env.CHOUKA_TEST_SCREENSHOT);await page.screenshot({path:path.join(file.dir,file.name+'-summary-desktop.png'),fullPage:true});}
      assert.deepEqual(state.errors,[]);
    });
    await t.test('包含离线保留同名独立登记，禁用同步异常不计当前在线',async()=>{
      const input=summaryFixture();for(const state of ['disabled','syncing','error','unavailable','running'])input.workers.push({...input.workers[0],id:state,state});
      const {page,state}=await setup({data:input});assert.equal(await page.locator('#online-count').innerText(),'当前在线 4 台');assert.equal(await page.locator('.machine-strip').count(),4);
      const gets=state.gets.length;await page.locator('#include-offline').check();assert.equal(await page.locator('.machine-strip').count(),9);assert.equal(state.gets.length,gets);
      assert.equal(await page.locator('[data-summary-worker-id=w1] h3').innerText(),await page.locator('[data-summary-worker-id=w2] h3').innerText());
      assert.match(await page.locator('[data-summary-worker-id=w2]').innerText(),/离线/);await page.locator('[data-summary-worker-id=w2] .machine-more summary').click();assert.match(await page.locator('[data-summary-worker-id=w2]').innerText(),/历史速度不代表现在能执行/);
      await page.locator('#include-offline').uncheck();assert.equal(await page.locator('[data-summary-worker-id=w2]').count(),0);
    });
    await t.test('每业务保留所有独立规格与缓存组，切换联动耗时样本精度及完整证据',async()=>{
      const input=summaryFixture();input.groups[1].warnings=['警告一','警告二'];const {page}=await setup({data:input});
      const row=page.locator('[data-summary-worker-id=w1] [data-capability=depth_video]'),select=row.locator('select');
      assert.equal(await select.inputValue(),'c1');assert.equal(await select.locator('option').count(),3);
      const names=await select.locator('option').allTextContents();assert.equal(new Set(names).size,3);assert.ok(names.every(n=>!n.includes('depth-5s')));assert.match(names[0],/规格未完整记录/);
      assert.match(await row.innerText(),/1 分 18 秒/);assert.match(await row.innerText(),/INT8/);assert.match(await row.innerText(),/仅 10 次 \/ 仅供参考/);assert.match(await row.innerText(),/模型文件标记，非运行时检测/);
      await row.locator('button').click();let detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));
      for(const value of ['P90：1 分 38 秒','采集业务样本','sample-main-int8.safetensors','警告一','警告二','总样本 12','失败 1','取消 1','缓存条件','配置编号：config-1'])assert.ok((await detail.innerText()).includes(value),value);
      await select.selectOption('warm');assert.match(await row.innerText(),/32 秒/);assert.match(await detail.innerText(),/UNETLoader/);
      await select.selectOption('h1');assert.match(await row.innerText(),/1 分 0 秒/);assert.match(await row.innerText(),/历史未记录/);assert.match(await detail.innerText(),/历史运行参考/);assert.doesNotMatch(await detail.innerText(),/sample-main-int8/);
      const image=page.locator('[data-capability=qwen_image_21_multi]');assert.match(await image.innerText(),/FP8/);assert.match(await image.innerText(),/加载配置，非运行时检测/);
    });
    await t.test('模型名称跟随规格切换，多主模型完整展示，缺失来源不推断',async()=>{
      const input=summaryFixture();
      input.groups[2].model_summary={source:'task_snapshot',precision_label:null,models:[{name:'main-high-noise.safetensors'},{name:'main-low-noise.safetensors'}]};
      const {page,state}=await setup({data:input});
      const row=page.locator('[data-summary-worker-id=w1] [data-capability=depth_video]'),names=row.locator('[data-label="模型名称"]');
      assert.equal(await names.innerText(),'sample-main-int8.safetensors');
      await row.locator('select').selectOption('warm');
      assert.deepEqual(await names.locator('.model-name').allTextContents(),['main-high-noise.safetensors','main-low-noise.safetensors']);
      assert.deepEqual(await names.locator('.model-role').allTextContents(),['主模型 1','主模型 2']);
      assert.doesNotMatch(await names.innerText(),/高噪声|低噪声/);
      assert.doesNotMatch(await names.innerText(),/sample-main-int8/);
      await row.locator('button').click();
      assert.equal(await page.locator('#'+await row.locator('button').getAttribute('aria-controls')+' > td').getAttribute('colspan'),'6');
      await row.locator('select').selectOption('h1');assert.equal(await names.innerText(),'未获取到模型信息');
      assert.equal(await page.locator('[data-summary-worker-id=w3] [data-label="模型名称"]').innerText(),'未获取到模型信息');
      assert.equal(await page.locator('[data-capability=qwen_image_21_multi] [data-label="模型名称"]').innerText(),'sample-fp8.safetensors');
      assert.deepEqual(state.errors,[]);
      input.groups[1].model_summary.source='unrecorded';
      const unknown=await setup({data:input});
      assert.equal(await unknown.page.locator('[data-summary-worker-id=w1] [data-capability=depth_video] [data-label="模型名称"]').innerText(),'未获取到模型信息');
    });
    await t.test('全历史无证据时默认工具配置与耗时免责声明直接可见，不冒充历史精度',async()=>{
      const {page,state}=await setup({data:evidenceFixture()});const row=page.locator('.business-row');
      assert.equal(await row.locator('select').inputValue(),'unknown-reference');
      assert.equal(await row.locator('button').getAttribute('aria-expanded'),'false');
      for(const label of ['模型名称','模型精度']) {
        const cell=row.locator(`[data-label="${label}"]`);
        assert.match(await cell.innerText(),/当前工具默认配置（非历史执行记录）/);
        assert.equal(await cell.getByText('当前工具默认配置（非历史执行记录）',{exact:true}).isVisible(),true);
      }
      assert.match(await row.locator('[data-label="模型名称"]').innerText(),/current-main-fp8/);
      assert.match(await row.locator('[data-label="模型精度"]').innerText(),/文件标记 FP8/);
      assert.match(await row.innerText(),/模型记录覆盖 0 \/ 3,201 次/);
      assert.match(await row.locator('[data-label="平均生成时间"]').innerText(),/1 分 0 秒.*此处耗时来自历史任务，不代表当前模型速度/s);
      assert.equal(await row.locator('[data-label="平均生成时间"] .warn').isVisible(),true);
      assert.equal(await page.locator('#technical-details').evaluate(n=>n.open),false);
      const marker=await row.locator('.model-origin').first().boundingBox();assert.ok(marker.y+marker.height<1000,'桌面首屏即可看到参考来源');
      await row.locator('button').click();const detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));
      assert.match(await detail.innerText(),/不代表用户画布节点当前选中的模型/);
      assert.match(await detail.innerText(),/不覆盖历史精度/);assert.deepEqual(state.errors,[]);
    });
    await t.test('同图两主模型名称精度角色逐项对应，文件标记与加载配置冲突分别保留，历史优先',async()=>{
      const {page,state}=await setup({data:evidenceFixture()});const row=page.locator('.business-row');await row.locator('select').selectOption('pair');
      const names=row.locator('[data-label="模型名称"]'),precision=row.locator('[data-label="模型精度"]');
      assert.deepEqual(await names.locator('.model-role').allTextContents(),['高噪声 · 主模型 1','低噪声 · 主模型 2']);
      assert.deepEqual(await precision.locator('.model-role').allTextContents(),await names.locator('.model-role').allTextContents());
      assert.match(await names.locator('.model-item').nth(0).innerText(),/history-high-bf16/);assert.match(await names.locator('.model-item').nth(1).innerText(),/history-low-int8/);
      assert.match(await precision.locator('.model-item').nth(0).innerText(),/文件标记 BF16.*加载配置 FP8（fp8_e4m3fn）/s);
      assert.match(await precision.locator('.model-item').nth(1).innerText(),/文件标记 INT8.*加载配置 default（实际精度未确认）/s);
      assert.doesNotMatch(await precision.locator('.model-item').nth(1).innerText(),/BF16|FP8/);
      assert.doesNotMatch(await row.innerText(),/current-main|当前工具默认配置|aux-|统一精度/);
      assert.match(await row.innerText(),/非运行时检测/);
      await row.locator('button').click();const detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));
      for(const role of ['VAE','CLIP','LoRA'])assert.match(await detail.innerText(),new RegExp('角色：'+role));
      assert.match(await detail.innerText(),/辅助模型（不计入主模型名称或精度）/);assert.match(await detail.innerText(),/当前工具默认配置（非历史执行记录）/);
      assert.deepEqual(state.errors,[]);
    });
    await t.test('部分覆盖和多个变体是不同任务组合，不把全组均值归给任一模型；切换同步清除旧证据',async()=>{
      const {page,state}=await setup({data:evidenceFixture()});const row=page.locator('.business-row');await row.locator('select').selectOption('partial');
      assert.match(await row.innerText(),/模型记录覆盖 30 \/ 3,201 次/);
      assert.match(await row.innerText(),/不同任务的模型组合；不是每个任务同时使用全部模型/);
      assert.match(await row.innerText(),/20 次记录 \/ 18 次成功耗时/);assert.match(await row.innerText(),/10 次记录 \/ 7 次成功耗时/);
      assert.match(await row.innerText(),/不完整 \/ 未确认完整主模型链/);
      assert.match(await row.locator('[data-label="平均生成时间"]').innerText(),/全组历史任务平均，非某个模型或组合专属速度/);
      assert.doesNotMatch(await row.innerText(),/current-main|当前工具默认配置/);
      assert.equal(await row.locator('[data-label="模型名称"] .model-variant').count(),2);
      await row.locator('button').click();const detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));
      assert.match(await detail.innerText(),/每个组合内的主模型才属于同一个图/);assert.match(await detail.innerText(),/参考信息不补齐历史覆盖/);
      await row.locator('select').selectOption('unknown-reference');assert.doesNotMatch(await row.innerText(),/history-high|history-low|INT8|BF16|other-task|全组历史任务平均/);
      assert.match(await row.innerText(),/current-main-fp8/);assert.match(await row.innerText(),/文件标记 FP8/);
      await row.locator('select').selectOption('pair');assert.doesNotMatch(await row.innerText(),/current-main|不完整|不代表当前模型速度/);
      await purchase(page);await calculate(page);assert.equal(state.posts.at(-1).body.demands[0].group_id,'unknown-reference');assert.equal((await page.locator('#estimate-result').innerText()).includes('60 秒'),true);
      assertHistoryQuery(state.gets[0]);assert.deepEqual(state.errors,[]);
    });
    await t.test('真实新证据为空不回退旧汇总；模板缺失或动态选择不可识别仍明确未知',async()=>{
      const input=evidenceFixture();input.groups[0].model_summary=modelSummary([{name:'stale-summary-int8.safetensors',precision:'INT8',precision_source:'filename'}]);
      const {page,state}=await setup({data:input});const row=page.locator('.business-row');
      assert.doesNotMatch(await row.innerText(),/stale-summary|INT8/);
      await row.locator('select').selectOption('empty-reference');
      assert.match(await row.innerText(),/未获取到模型信息/);assert.match(await row.innerText(),/当前工具默认配置（非历史执行记录）/);
      assert.match(await row.innerText(),/不完整 \/ 未确认完整主模型链/);assert.match(await row.innerText(),/模型待确认，精度未确认/);
      assert.doesNotMatch(await row.innerText(),/current-main|FP8|INT8|loader/);
      await row.locator('select').selectOption('no-reference');assert.match(await row.innerText(),/未获取到模型信息/);
      assert.match(await row.innerText(),/历史未记录.*当前工具模板未提供、找不到或无法识别/s);assert.doesNotMatch(await row.innerText(),/当前工具默认配置|FP8|INT8/);
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
        assert.deepEqual(await names.locator('.model-role').allTextContents(),['主模型 1','主模型 2']);
        assert.ok((await precision.innerText()).includes('文件标记 '+ATTACK));assert.ok((await precision.innerText()).includes('加载配置 '+ATTACK));
        if(id==='unknown-reference')assert.ok((await names.innerText()).includes('工具：'+ATTACK));
        if(await row.locator('button').getAttribute('aria-expanded')==='false')await row.locator('button').click();
        assert.ok((await page.locator('#'+await row.locator('button').getAttribute('aria-controls')).innerText()).includes('角色：'+ATTACK));
        assert.equal(await page.locator('main img').count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);
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
        assert.deepEqual(await row.locator('[data-label="模型名称"] .model-role').allTextContents(),await row.locator('[data-label="模型精度"] .model-role').allTextContents());
        if(process.env.CHOUKA_TEST_SCREENSHOT){const file=path.parse(process.env.CHOUKA_TEST_SCREENSHOT);await page.screenshot({path:path.join(file.dir,file.name+`-evidence-${width}.png`),fullPage:true});}
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
      const {page}=await setup({data:input});const machine=page.locator('[data-summary-worker-id=w1]');assert.match(await machine.innerText(),/未获取到模型信息/);assert.doesNotMatch(await machine.locator('[data-capability=depth_video]').innerText(),/FP8|INT8|not-main-fp8/);assert.equal(await machine.locator('[data-capability=depth_video] [data-label="模型名称"]').innerText(),'未获取到模型信息');
      assert.match(await machine.locator('.machine-hardware').innerText(),/RTX 4090 \/ 24 GiB；系统内存 95.7 GiB/);assert.doesNotMatch(await machine.locator('.machine-hardware').innerText(),/未知|CPU/);
      await machine.locator('.machine-more summary').click();assert.match(await machine.innerText(),/升级该 Worker 后补采/);
      const modern=page.locator('[data-summary-worker-id=w3]');await modern.locator('.machine-more summary').click();assert.match(await modern.innerText(),/人工声明未填写/);assert.doesNotMatch(await modern.innerText(),/升级该 Worker|整机配置未知/);
    });
    await t.test('简明规格显示期望尺寸、时长帧率MP输入及步数，不用哈希代替',async()=>{
      const input=fixture();input.groups=[{...input.groups[3],dimensions:{duration:5,fps:24,megapixels:1.5,image_count:2,steps:20},spec:{expected:{width:1280,height:720}}}];const {page}=await setup({data:input});
      const value=await page.locator('.summary-spec option').innerText();for(const text of ['期望 1,280 × 720','时长 5 秒','24 FPS','1.5 MP','输入 2 张图','步数 20 步'])assert.ok(value.includes(text),text);
      assert.equal(await page.locator('.selected-spec').innerText(),value);
    });
    await t.test('简明首页及详情的名称模型来源配置与警告安全渲染',async()=>{
      const input=summaryFixture();input.workers[0].name=ATTACK;input.workers[0].hardware.gpus[0].name=ATTACK;const g=input.groups[1];g.capability_name=ATTACK;g.model_summary.models[0].name=ATTACK;g.model_summary.precision_label=ATTACK;g.config={cpu:ATTACK};g.warnings=[ATTACK];g.cache_condition={kind:ATTACK};
      const {page,state}=await setup({data:input});const row=page.locator('[data-summary-worker-id=w1] [data-capability=depth_video]');assert.equal(await row.locator('[data-label="模型名称"]').innerText(),ATTACK);await row.locator('button').click();assert.ok((await page.locator('#machine-summary').innerText()).includes(ATTACK));assert.equal(await page.locator('main img').count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);assert.deepEqual(state.errors,[]);
    });
    await t.test('简明首页390/320手机规格与详情可操作，长模型名称无整页横滚',async()=>{
      const input=summaryFixture(),name='long-main-model-'.repeat(12)+'int8.safetensors';
      input.groups[1].model_summary.models[0].name=name;
      const {page,state}=await setup({data:input});
      assert.equal(await page.locator('[data-summary-worker-id=w1] [data-capability=depth_video] [data-label="模型名称"]').innerText(),name);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      for(const width of [390,320]) {
        await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        const row=page.locator('[data-summary-worker-id=w1] [data-capability=depth_video]');await row.locator('select').selectOption('warm');await row.locator('button').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.match(await row.innerText(),/32 秒/);await row.locator('button').click();await row.locator('select').selectOption('c1');
      }
      await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));
      if(process.env.CHOUKA_TEST_SCREENSHOT){const file=path.parse(process.env.CHOUKA_TEST_SCREENSHOT);await page.screenshot({path:path.join(file.dir,file.name+'-summary-390.png'),fullPage:true});}
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
      await page.locator('#tab-purchase').click();const options=await page.locator('#estimate-worker option').allTextContents();assert.ok(options.includes('同名机器（w1）'));assert.ok(options.includes('同名机器（w2）'));await page.locator('#tab-machines').click();
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
      const {page,state}=await setupAdvanced();const later=new Date(NOW.getTime()+3*86400000);
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
      const {page,state}=await setupAdvanced();await purchase(page);await page.locator('#add-demand').click();await page.locator('.demand-quantity').nth(1).fill('100');await page.locator('#price').fill('19999');await calculate(page);
      const post=state.posts.at(-1);assert.equal(post.csrf,'synthetic-csrf');assert.equal(post.body.mode,'historical');assert.equal(post.body.quality,'technical');assert.equal(post.body.worker_id,'w1');assert.equal(post.body.hours,8);assert.equal(post.body.availability,.9);assert.equal(post.body.utilization,.75);assert.equal(post.body.price,19999);assert.deepEqual(post.body.demands,[{group_id:'h1',quantity:100},{group_id:'h2',quantity:100}]);assertEstimateRange(post.body,state.gets.at(-1));
      const result=await page.locator('#estimate-result').innerText();for(const warning of [...estimateResponse.warnings,...fixture().groups[0].warnings])assert.ok(result.includes(warning));assert.match(result,/不是合格日产能/);assert.match(result,/100 任务/);assert.match(result,/未计价/);
      const downloadPromise=page.waitForEvent('download');await page.locator('#export-estimate').click();const download=await downloadPromise;const csv=readFileSync(await download.path(),'utf8');assert.match(csv,/历史任务运行参考/);assert.match(csv,/缓存情况未知/);assert.match(csv,/config_id/);assert.match(csv,/未包含模型切换/);
    });
    await t.test('已验证基线隔离配置和来源，质量口径不同；证据不足禁用且不隐藏警告',async()=>{
      const {page,state}=await setupAdvanced();await purchase(page,'verified');
      let values=await page.locator('.demand-group option').evaluateAll(nodes=>nodes.map(n=>n.value));assert.deepEqual(values,['c1','c2','ineligible']);
      assert.equal(await page.locator('.demand-group option[value=ineligible]').isDisabled(),true);
      await page.locator('#quality').selectOption('accepted');await page.locator('.demand-quantity').fill('50');await calculate(page);
      assertEstimateRange(state.posts.at(-1).body,state.gets.at(-1));assert.equal(state.posts.at(-1).body.quality,'accepted');assert.equal(state.posts.at(-1).body.mode,'verified');assert.deepEqual(state.posts.at(-1).body.demands,[{group_id:'c1',quantity:50}]);
      const result=await page.locator('#estimate-result').innerText();assert.match(result,/覆盖样本仅两天/);assert.match(result,/人工验收覆盖有限/);assert.match(result,/参考样本不足/);
      await page.locator('#baseline').selectOption(JSON.stringify(['config-1','standard','bench-001']));values=await page.locator('.demand-group option').evaluateAll(nodes=>nodes.map(n=>n.value));assert.deepEqual(values,['s1']);assert.equal(await page.locator('#export-estimate').isDisabled(),true);
    });
    await t.test('每种输入变化立即清除结果，失败不保留旧台数，重复场景不发请求',async()=>{
      const {page,state}=await setupAdvanced();await purchase(page);await calculate(page);
      for(const [id,value] of [['hours','9'],['availability','80'],['utilization','60'],['price','20000']]) {await page.locator('#'+id).fill(value);assert.equal(await page.locator('#export-estimate').isDisabled(),true);assert.doesNotMatch(await page.locator('#estimate-result').innerText(),/参考机器数/);await calculate(page);}
      state.estimateError=true;await page.locator('#estimate-submit').click();await page.waitForFunction(()=>!document.querySelector('#estimate-error').hidden);assert.match(await page.locator('#estimate-error').innerText(),/合成证据不足/);assert.doesNotMatch(await page.locator('#estimate-result').innerText(),/参考机器数/);
      state.estimateError=false;await page.locator('#add-demand').click();await page.locator('.demand-group').nth(1).selectOption('h1');await page.locator('.demand-quantity').nth(1).fill('10');const count=state.posts.length;await page.locator('#estimate-submit').click();assert.match(await page.locator('#estimate-error').innerText(),/不能重复选择/);assert.equal(state.posts.length,count);
    });
    await t.test('旧 GET 响应无法覆盖新刷新，旧估算不能恢复输入已变更后的结果',async()=>{
      const {page,state}=await setupAdvanced();let release,held;
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
        const {page,state}=await setupAdvanced();let release,received;const waiting=new Promise(resolve=>received=resolve);
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
      const record=page.locator('[data-job-id="captured-job"]');await record.locator('summary').click();await record.locator('select').selectOption('standard');await record.locator('button').click();assert.match(await record.locator('[role=status]').innerText(),/标准场景编号/);assert.equal(state.posts.length,0);
      await page.clock.setFixedTime(new Date(NOW.getTime()+60000));
      await record.locator('input:not([type=number])').fill('bench-001');await record.locator('textarea').fill('人工复核，不是自动验证');await record.locator('button').click();await loaded(page);await page.waitForFunction(()=>document.querySelector('[data-job-id="captured-job"]').textContent.includes('bench-001'));
      assert.deepEqual(state.posts.at(-1).body,{accepted:null,source:'standard',benchmark_id:'bench-001',note:'人工复核，不是自动验证'});assert.equal(state.posts.at(-1).csrf,'synthetic-csrf');
      await record.locator('summary').click();await record.locator('input[type=number]').fill('0');await record.locator('button').click();await page.waitForFunction(()=>document.querySelector('[data-job-id="captured-job"]').textContent.includes('人工合格数量：0'));
      assert.equal(state.posts.at(-1).body.accepted,0);assert.equal(state.gets.length,3);for(const query of state.gets)assertHistoryQuery(query);
      await record.locator('summary').click();state.reviewError=true;await record.locator('button').click();await page.waitForFunction(()=>document.querySelector('.review-form [role=status]').textContent.includes('保存失败'));assert.match(await record.locator('[role=status]').innerText(),/合成验收保存失败/);
    });
    await t.test('所有来源文本、规格、证据、警告与错误安全渲染，不截掉警告',async()=>{
      const input=fixture();input.workers[0].name=ATTACK;input.workers[0].hardware.cpu=ATTACK;input.groups[0].capability_name=ATTACK;input.groups[0].dimensions={injected:ATTACK};input.groups[0].warnings=Array.from({length:7},(_,i)=>`${ATTACK} 警告${i}`);input.details[1].outputs=[{name:ATTACK}];input.details[1].review.note=ATTACK;
      const {page,state}=await setupAdvanced({data:input});assert.equal(await page.locator('main img').count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);
      assert.ok((await page.locator('#workers').innerText()).includes(ATTACK));const row=await page.locator('#machine-groups [data-group-id=h1]').innerText();for(const warning of input.groups[0].warnings)assert.ok(row.includes(warning));
      await page.locator('[data-job-id=captured-job] summary').click();assert.ok((await page.locator('[data-job-id=captured-job]').innerText()).includes(ATTACK));assert.deepEqual(state.errors,[]);
    });
    await t.test('空态、读取失败及全历史刷新恢复不把未知当 0，移除分组导出不影响测算导出',async()=>{
      const input={period:{},overview:{tasks:0,done:0,error:0,canceled:0},workers:[],groups:[],details:[],details_total:0};const {page,state}=await setupAdvanced({data:input});
      assert.match(await page.locator('#workers').innerText(),/暂无执行端/);assert.match(await page.locator('#machine-groups').innerText(),/暂无业务规格/);assert.equal(await page.locator('#output-metrics strong').first().innerText(),'未知');assert.equal(await page.locator('#next').isDisabled(),true);
      await page.locator('#tab-purchase').click();assert.equal(await page.locator('#estimate-submit').isDisabled(),true);state.getError=true;await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#error').hidden);assert.match(await page.locator('#error').innerText(),/合成读取失败/);
      assert.equal(await page.locator('#export-estimate').isDisabled(),true);assert.equal(await page.locator('#next').isDisabled(),true);
      state.getError=false;state.data=fixture();const later=new Date(NOW.getTime()+60000);await page.clock.setFixedTime(later);await refresh(page);assertHistoryQuery(state.gets.at(-1),later);assert.equal(await page.locator('#error').isVisible(),false);
      await purchase(page);await calculate(page);assertEstimateRange(state.posts.at(-1).body,state.gets.at(-1));
      const downloadPromise=page.waitForEvent('download');await page.locator('#export-estimate').click();const csv=readFileSync(await (await downloadPromise).path(),'utf8');assert.match(csv,/历史任务运行参考/);
      assert.equal(await page.locator('#export').count(),0);assert.deepEqual(state.exports,[]);assert.deepEqual(state.errors,[]);
    });
    await t.test('390/320 像素手机无整页横向溢出，三页签与表单可操作',async()=>{
      const {page,state}=await setupAdvanced();
      for(const width of [390,320]) {await page.setViewportSize({width,height:844});for(const id of ['machines','scenarios','purchase']){await page.locator('#tab-'+id).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width}px ${id} 不应产生整页横向滚动`);}}
      await page.setViewportSize({width:390,height:844});await page.locator('.demand-quantity').fill('15');await calculate(page);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      if(process.env.CHOUKA_TEST_SCREENSHOT){const file=path.parse(process.env.CHOUKA_TEST_SCREENSHOT);await page.screenshot({path:path.join(file.dir,file.name+'-purchase-390.png'),fullPage:true});}assert.deepEqual(state.errors,[]);
    });
    await t.test('后端日期列表、配置快照和人工来源按实际口径展示',async()=>{
      const input=fixture();input.groups[3].days=['2026-10-01','2026-10-02','2026-10-03'];input.groups[3].samples=35;input.groups[3].config={cpu:'执行时 CPU',gpus:[{name:'执行时 GPU',memory_total_bytes:8*1024**3}]};input.groups[3].config_source='manual+reported';input.groups[3].reviewed=30;input.workers[0].hardware_source='manual+reported';
      const {page}=await setupAdvanced({data:input});const row=page.locator('#machine-groups [data-group-id=c1]');assert.match(await row.innerText(),/样本 35 \/ 3 天/);assert.doesNotMatch(await row.innerText(),/参考样本不足/);assert.match(await row.innerText(),/已人工验收 30/);
      await row.locator('summary').click();assert.match(await row.innerText(),/执行时 GPU/);assert.match(await row.innerText(),/机器上报 \+ 人工声明/);assert.match(await row.innerText(),/2026-10-03/);
      await purchase(page,'verified');assert.match(await page.locator('#baseline-note').innerText(),/执行时 CPU/);assert.match(await page.locator('#baseline-note').innerText(),/当前配置仅作清单参考/);
    });
    await t.test('验收保存晚于分页或刷新返回时清空不确定依据与估算，提示立即刷新恢复全历史',async()=>{
      for(const action of ['page','refresh']) {
        const {page,state,context}=await setupAdvanced();let release,received;const saved=new Promise(resolve=>received=resolve);
        await context.route('**/api/capacity/jobs/*/review',route=>{release=()=>route.fulfill({contentType:'application/json',body:'{"ok":true}'});received();});
        await page.locator('[data-job-id=captured-job] summary').click();await page.locator('[data-job-id=captured-job] button').click();await saved;
        const later=new Date(NOW.getTime()+60000);await page.clock.setFixedTime(later);
        if(action==='page') {await page.locator('#next').click();await page.waitForSelector('[data-job-id=page-2-job]');assertHistoryQuery(state.gets.at(-1),NOW,100);}
        else {await refresh(page);assertHistoryQuery(state.gets.at(-1),later);}
        await purchase(page);await calculate(page);assertEstimateRange(state.posts.at(-1).body,state.gets.at(-1));
        await release();await page.waitForFunction(()=>document.querySelector('#refresh-state').textContent.includes('人工标记已更新'));
        assert.match(await page.locator('#refresh-state').innerText(),/立即刷新/);assert.equal(await page.locator('#export-estimate').isDisabled(),true);assert.doesNotMatch(await page.locator('#estimate-result').innerText(),/参考机器数/);
        assert.equal(await page.locator('#next').isDisabled(),true);assert.equal(await page.locator('#previous').isDisabled(),true);assert.equal(await page.locator('#details [data-job-id]').count(),0);assert.equal(await page.locator('.machine-strip').count(),0);
        await refresh(page);assertHistoryQuery(state.gets.at(-1),later);await purchase(page);await calculate(page);assertEstimateRange(state.posts.at(-1).body,state.gets.at(-1));assert.deepEqual(state.errors,[]);
      }
    });
    await t.test('新采集不完整样本与标准标签也可作 runtime 参考，单位始终为任务',async()=>{
      const input=fixture();input.groups=input.groups.filter(g=>g.source!=='historical').map(g=>({...g,eligible:false}));
      input.groups.push({...input.groups[0],id:'null-runtime',mean_seconds:null},{...input.groups[0],id:'zero-runtime',mean_seconds:0});
      const {page,state}=await setupAdvanced({data:input});await purchase(page);
      assert.equal(await page.locator('#mode').inputValue(),'historical');assert.equal(await page.locator('.demand-group option[value=c1]').isDisabled(),false);assert.equal(await page.locator('.demand-group option[value=ineligible]').isDisabled(),false);
      assert.equal(await page.locator('.demand-group option[value=null-runtime]').isDisabled(),true);assert.equal(await page.locator('.demand-group option[value=zero-runtime]').isDisabled(),true);
      assert.match(await page.locator('.demand-group option[value=c1]').innerText(),/任务（仅运行参考）/);await calculate(page);
      assert.equal(state.posts.at(-1).body.mode,'historical');assert.equal(state.posts.at(-1).body.demands[0].group_id,'c1');
      assert.match(await page.locator('#estimate-result').innerText(),/100 任务/);assert.match(await page.locator('#estimate-result').innerText(),/不是合格日产能/);assert.match(await page.locator('#estimate-result').innerText(),/完整基线证据不足/);
      await page.locator('#baseline').selectOption(JSON.stringify(['config-1','standard','bench-001']));assert.deepEqual(await page.locator('.demand-group option').evaluateAll(nodes=>nodes.map(n=>n.value)),['s1']);await page.locator('.demand-quantity').fill('12');await calculate(page);assert.equal(state.posts.at(-1).body.demands[0].group_id,'s1');assert.match(await page.locator('#estimate-result').innerText(),/12 任务/);
      await page.locator('#mode').selectOption('verified');assert.equal(await page.locator('#estimate-submit').isDisabled(),true);
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
        const {page,state,context}=await setupAdvanced();let release,received;const saved=new Promise(resolve=>received=resolve);
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
        assert.equal(await page.locator('#details [data-job-id]').count(),0);assert.equal(await page.locator('.machine-strip').count(),0);assert.equal(await page.locator('#next').isDisabled(),true);assert.equal(await page.locator('#previous').isDisabled(),true);
        const later=new Date(NOW.getTime()+60000);await page.clock.setFixedTime(later);await refresh(page);assertHistoryQuery(state.gets.at(-1),later);await purchase(page);await calculate(page);assertEstimateRange(state.posts.at(-1).body,state.gets.at(-1));assert.deepEqual(state.errors,[]);
      }
    });
    await t.test('真实 CapacityStore.report 渲染契约：对象硬件、日期数组、配置和独立标准基准',async()=>{
      const actual=realStoreReport(),report=actual.report;
      assert.ok(report.groups.every(g=>Array.isArray(g.days)));assert.equal(actual.write.source,'manual');assert.equal(actual.write.hardware.disk,'2TB 契约磁盘');assert.equal(actual.write.note,'契约备注不进入配置快照');
      const standards=report.groups.filter(g=>g.source==='standard');assert.equal(standards.length,2);assert.deepEqual(standards.map(g=>g.benchmark_id).sort(),['contract-bench-a','contract-bench-b']);
      assert.ok(report.groups.filter(g=>g.source!=='historical').every(g=>g.config_id && g.config_source==='manual+reported'));
      const {page,state}=await setupAdvanced({data:report});assert.match(await page.locator('#workers').innerText(),/契约 CPU/);assert.match(await page.locator('#workers').innerText(),/契约系统/);assert.doesNotMatch(await page.locator('#workers').innerText(),/\[object Object\]/);
      assert.match(await page.locator('#machine-groups').innerText(),/contract-bench-a/);assert.match(await page.locator('#machine-groups').innerText(),/contract-bench-b/);assert.match(await page.locator('#machine-groups').innerText(),/1 天/);
      assert.equal(await page.locator('.machine-strip').count(),1);assert.equal(await page.locator('.business-row').count(),1);assert.equal(await page.locator('.summary-spec option').count(),report.groups.length);
      for(const group of report.groups) {
        await page.locator('.summary-spec').selectOption(group.id);
        assert.equal(await page.locator('.business-row').getAttribute('data-selected-group-id'),group.id);
        assert.match(await page.locator('.business-row').innerText(),new RegExp(`${group.measured} 次`));
      }
      await page.locator('#tab-purchase').click();
      for(const group of standards) {
        const key=JSON.stringify([group.config_id,'standard',group.benchmark_id]);await page.locator('#baseline').selectOption(key);
        assert.deepEqual(await page.locator('.demand-group option').evaluateAll(nodes=>nodes.map(n=>n.value)),[group.id]);
        assert.match(await page.locator('#baseline option:checked').innerText(),new RegExp(group.benchmark_id));
      }
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
      assert.equal(history.current_model_reference.source,'current_template');assert.equal(history.current_model_reference.capability_name,'契约图像工具');
      for(const group of report.groups.filter(g=>g.source!=='historical')) {
        assert.equal(group.model_evidence.variants[0].source,'task_snapshot');
        assert.equal(group.model_evidence.variants[0].summary.models[0].name,'contract-model.safetensors');
      }
      const {page,state}=await setup({data:report});const row=page.locator('.business-row');await row.locator('select').selectOption(history.id);
      assert.match(await row.innerText(),/模型记录覆盖 2 \/ 3 次/);assert.match(await row.innerText(),/保留的原任务记录/);
      for(const name of ['contract-first-bf16','contract-second-int8','contract-other-fp16'])assert.ok((await row.innerText()).includes(name));
      assert.match(await row.innerText(),/文件标记 BF16/);assert.match(await row.innerText(),/加载配置 FP8/);assert.match(await row.innerText(),/文件标记 INT8/);assert.match(await row.innerText(),/文件标记 FP16/);
      assert.doesNotMatch(await row.innerText(),/contract-current|高噪声|低噪声/);assert.match(await row.innerText(),/40 秒/);
      assert.match(await row.innerText(),/全组历史任务平均，非某个模型或组合专属速度/);
      await row.locator('button').click();const detail=page.locator('#'+await row.locator('button').getAttribute('aria-controls'));
      assert.match(await detail.innerText(),/当前工具默认配置（非历史执行记录）/);assert.match(await detail.innerText(),/contract-current-fp8/);
      for(const warning of history.warnings)assert.ok((await detail.innerText()).includes(warning));
      assert.deepEqual(state.errors,[]);
    });
    await t.test('普通身份不能读取产能 API',async()=>{const {page,state}=await setupAdvanced({role:'user'});await page.waitForURL('http://capacity.test/');assert.equal(state.gets.length,0);});
  } finally {await Promise.all(contexts.map(context=>context.close()));await browser.close();}
});
