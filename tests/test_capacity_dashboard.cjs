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
    period:{from:1790870400,to:1791455400},
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
function realStoreReport() {
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
report = store.report()
print(json.dumps({'report':report,'write':profile},ensure_ascii=False))
connection.close()
`;
  return JSON.parse(execFileSync(process.env.CHOUKA_TEST_PYTHON || 'python3',['-c',script,path.join(__dirname,'..')],{encoding:'utf8'}));
}
const estimateResponse = {mode:'historical',quality:'technical',worker_id:'w1',total_seconds:12000,daily_capacity_seconds:19440,machines:1,price_total:null,lines:[{group_id:'h1',quantity:100,seconds_per_unit:60,daily_units:324},{group_id:'h2',quantity:100,seconds_per_unit:60,daily_units:324}],warnings:['测算响应警告一','测算响应警告二'],assumptions:['未包含模型切换','单机并发槽位为一']};
const tick = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const loaded = page => page.waitForFunction(() => document.querySelector('#refresh-state').textContent.startsWith('最后刷新'));
async function apply(page) {await page.locator('#filters button[type=submit]').click();await loaded(page);}
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
    if(!options.controller && options.role!=='user')await loaded(page);
    return {page,state,context};
  }
  try {
    await t.test('运行面板入口紧邻费用统计右侧，同级同样式',async()=>{
      const {page}=await setup({controller:true});
      const value=await page.locator('header a[href="/controller/costs"]').evaluate(node=>{
        const next=node.nextElementSibling,a=getComputedStyle(node),b=getComputedStyle(next);
        return {href:next.getAttribute('href'),label:next.textContent,tag:next.tagName,parent:next.parentNode===node.parentNode,padding:[a.padding,b.padding],border:[a.border,b.border],background:[a.backgroundColor,b.backgroundColor]};
      });
      assert.equal(value.href,'/controller/capacity');assert.equal(value.label,'产能评估');assert.equal(value.tag,'A');assert.equal(value.parent,true);
      for(const key of ['padding','border','background'])assert.equal(value[key][0],value[key][1]);
    });
    await t.test('真实 auth 鉴权；任务与产物分开，完整聚合不受 100 条分页影响',async()=>{
      const {page,state}=await setup();
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
      const {page}=await setup({data:input});
      assert.equal(await page.locator('#workers .worker').count(),2);
      const options=await page.locator('#worker-filter option').allTextContents();assert.ok(options.includes('同名机器（w1）'));assert.ok(options.includes('同名机器（w2）'));
      assert.match(await page.locator('[data-worker-id="w2"]').innerText(),/过期/);assert.match(await page.locator('[data-worker-id="w2"]').innerText(),/任务 0/);
      assert.match(await page.locator('[data-worker-id="w1"]').innerText(),/单卡显存 24 GiB/);assert.doesNotMatch(await page.locator('[data-worker-id="w1"]').innerText(),/48 GiB/);
      const row=await page.locator('#machine-groups [data-group-id="h1"]').innerText();assert.match(row,/平均 未知/);assert.match(row,/P50 0 秒/);
      assert.match(await page.locator('#machine-groups [data-group-id="c1"]').innerText(),/P50 未知/);
    });
    await t.test('今日、7/30天、全部、自定义按本地时区发送并保留 Worker ID 和业务筛选',async()=>{
      const {page,state}=await setup();
      const localUnix=value=>Date.parse(value+'+08:00')/1000;
      assert.equal(Number(state.gets.at(-1).from),localUnix('2026-10-02T00:00:00'));
      for(const [value,expected] of [['today','2026-10-08T00:00:00'],['30','2026-09-09T00:00:00']]) {
        await page.locator('#period').selectOption(value);await apply(page);assert.equal(Number(state.gets.at(-1).from),localUnix(expected));
      }
      await page.locator('#period').selectOption('all');await apply(page);assert.equal(state.gets.at(-1).from,undefined);
      await page.locator('#period').selectOption('custom');await page.locator('#from').fill('2026-10-01T09:30');await page.locator('#to').fill('2026-10-03T18:00');
      await page.locator('#worker-filter').selectOption('w2');await page.locator('#capability-filter').selectOption('depth_video');await apply(page);
      assert.deepEqual(state.gets.at(-1),{from:String(localUnix('2026-10-01T09:30:00')),to:String(localUnix('2026-10-03T18:00:00')),worker_id:'w2',capability:'depth_video',limit:'100',offset:'0'});
      const before=state.gets.length;await page.locator('#to').fill('2026-09-01T09:30');await page.locator('#filters button').click();await page.waitForFunction(()=>!document.querySelector('#error').hidden);
      assert.match(await page.locator('#error').innerText(),/开始时间必须早于/);assert.equal(state.gets.length,before);
      assert.equal(await page.locator('#export').getAttribute('href'),null);assert.equal(await page.locator('#next').isDisabled(),true);
    });
    await t.test('跨夏令时的本地日历边界不按固定 86400 秒回推',async()=>{
      const {page,state}=await setup({timezone:'America/New_York'});
      await page.clock.setFixedTime(new Date('2026-11-03T15:00:00Z'));await page.locator('#refresh').click();await loaded(page);
      assert.equal(Number(state.gets.at(-1).from),Date.parse('2026-10-28T00:00:00-04:00')/1000);
      assert.equal(Number(state.gets.at(-1).to),Date.parse('2026-11-03T15:00:00Z')/1000);
    });
    await t.test('详情分页保持全量聚合与筛选，新筛选恢复首页',async()=>{
      const {page,state}=await setup();await page.locator('#next').click();await page.waitForSelector('[data-job-id="page-2-job"]');
      assert.equal(state.gets.at(-1).offset,'100');assert.equal(await page.locator('#task-metrics strong').first().innerText(),'3,213');assert.match(await page.locator('#detail-count').innerText(),/3,201/);
      await page.locator('#previous').click();await page.waitForSelector('[data-job-id="history-job"]');assert.equal(state.gets.at(-1).offset,'0');
      await page.locator('#next').click();await page.waitForSelector('[data-job-id="page-2-job"]');await page.locator('#worker-filter').selectOption('w1');await apply(page);assert.equal(state.gets.at(-1).offset,'0');
    });
    await t.test('场景按 capability/规格/来源比较，ARIA 页签支持方向键与焦点',async()=>{
      const {page}=await setup();await page.locator('#tab-machines').focus();await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#tab-scenarios').getAttribute('aria-selected'),'true');assert.equal(await page.locator('#tab-machines').getAttribute('tabindex'),'-1');
      assert.equal(await page.locator('#panel-machines').isVisible(),false);
      assert.equal(await page.locator('#scenario-groups tr[data-group-id]').count(),2);
      assert.match(await page.locator('#scenario-groups').innerText(),/w1/);assert.match(await page.locator('#scenario-groups').innerText(),/w2/);assert.doesNotMatch(await page.locator('#scenario-groups').innerText(),/采集业务样本/);
      await page.keyboard.press('End');assert.equal(await page.locator('#tab-purchase').getAttribute('aria-selected'),'true');
      const outline=await page.locator('#tab-purchase').evaluate(node=>getComputedStyle(node).outlineStyle);assert.notEqual(outline,'none');
      await page.keyboard.press('Home');assert.equal(await page.locator('#tab-machines').getAttribute('aria-selected'),'true');
    });
    await t.test('历史多场景测算请求、CSRF、单位与完整警告及 CSV 导出',async()=>{
      const {page,state}=await setup();await purchase(page);await page.locator('#add-demand').click();await page.locator('.demand-quantity').nth(1).fill('100');await page.locator('#price').fill('19999');await calculate(page);
      const post=state.posts.at(-1);assert.equal(post.csrf,'synthetic-csrf');assert.equal(post.body.mode,'historical');assert.equal(post.body.quality,'technical');assert.equal(post.body.worker_id,'w1');assert.equal(post.body.hours,8);assert.equal(post.body.availability,.9);assert.equal(post.body.utilization,.75);assert.equal(post.body.price,19999);assert.deepEqual(post.body.demands,[{group_id:'h1',quantity:100},{group_id:'h2',quantity:100}]);assert.equal(post.body.capability,undefined);
      const result=await page.locator('#estimate-result').innerText();for(const warning of [...estimateResponse.warnings,...fixture().groups[0].warnings])assert.ok(result.includes(warning));assert.match(result,/不是合格日产能/);assert.match(result,/100 任务/);assert.match(result,/未计价/);
      const downloadPromise=page.waitForEvent('download');await page.locator('#export-estimate').click();const download=await downloadPromise;const csv=readFileSync(await download.path(),'utf8');assert.match(csv,/历史任务运行参考/);assert.match(csv,/缓存情况未知/);assert.match(csv,/config_id/);assert.match(csv,/未包含模型切换/);
    });
    await t.test('已验证基线隔离配置和来源，质量口径不同；证据不足禁用且不隐藏警告',async()=>{
      const {page,state}=await setup();await purchase(page,'verified');
      let values=await page.locator('.demand-group option').evaluateAll(nodes=>nodes.map(n=>n.value));assert.deepEqual(values,['c1','c2','ineligible']);
      assert.equal(await page.locator('.demand-group option[value=ineligible]').isDisabled(),true);
      await page.locator('#quality').selectOption('accepted');await page.locator('.demand-quantity').fill('50');await calculate(page);
      assert.equal(state.posts.at(-1).body.quality,'accepted');assert.equal(state.posts.at(-1).body.mode,'verified');assert.deepEqual(state.posts.at(-1).body.demands,[{group_id:'c1',quantity:50}]);
      const result=await page.locator('#estimate-result').innerText();assert.match(result,/覆盖样本仅两天/);assert.match(result,/人工验收覆盖有限/);assert.match(result,/参考样本不足/);
      await page.locator('#baseline').selectOption(JSON.stringify(['config-1','standard','bench-001']));values=await page.locator('.demand-group option').evaluateAll(nodes=>nodes.map(n=>n.value));assert.deepEqual(values,['s1']);assert.equal(await page.locator('#export-estimate').isDisabled(),true);
    });
    await t.test('每种输入变化立即清除结果，失败不保留旧台数，重复场景不发请求',async()=>{
      const {page,state}=await setup();await purchase(page);await calculate(page);
      for(const [id,value] of [['hours','9'],['availability','80'],['utilization','60'],['price','20000']]) {await page.locator('#'+id).fill(value);assert.equal(await page.locator('#export-estimate').isDisabled(),true);assert.doesNotMatch(await page.locator('#estimate-result').innerText(),/参考机器数/);await calculate(page);}
      state.estimateError=true;await page.locator('#estimate-submit').click();await page.waitForFunction(()=>!document.querySelector('#estimate-error').hidden);assert.match(await page.locator('#estimate-error').innerText(),/合成证据不足/);assert.doesNotMatch(await page.locator('#estimate-result').innerText(),/参考机器数/);
      state.estimateError=false;await page.locator('#add-demand').click();await page.locator('.demand-group').nth(1).selectOption('h1');await page.locator('.demand-quantity').nth(1).fill('10');const count=state.posts.length;await page.locator('#estimate-submit').click();assert.match(await page.locator('#estimate-error').innerText(),/不能重复选择/);assert.equal(state.posts.length,count);
    });
    await t.test('旧 GET 响应无法覆盖新筛选，旧估算不能恢复输入已变更后的结果',async()=>{
      const {page,state}=await setup();let release,held;
      const waiting=new Promise(resolve=>held=resolve);state.holdGet=route=>{state.holdGet=null;release=()=>route.fulfill({contentType:'application/json',body:JSON.stringify({...fixture(),overview:{tasks:999999}})});held();};
      await page.locator('#refresh').click();await waiting;await page.locator('#period').selectOption('today');await apply(page);await release();await tick(page);assert.equal(await page.locator('#task-metrics strong').first().innerText(),'3,213');
      await purchase(page);let releaseEstimate,heldEstimate;const waitingEstimate=new Promise(resolve=>heldEstimate=resolve);state.holdEstimate=route=>{releaseEstimate=()=>route.fulfill({contentType:'application/json',body:JSON.stringify(estimateResponse)});heldEstimate();};
      await page.locator('#estimate-submit').click();await waitingEstimate;await page.locator('#hours').fill('10');await releaseEstimate();await tick(page);assert.equal(await page.locator('#export-estimate').isDisabled(),true);assert.doesNotMatch(await page.locator('#estimate-result').innerText(),/参考机器数/);
      state.holdEstimate=null;await calculate(page);await page.locator('#refresh').click();await loaded(page);assert.equal(await page.locator('#export-estimate').isDisabled(),true);
      assert.deepEqual(state.errors,[]);
    });
    await t.test('历史不可验收；采集记录人工标签、未验收 null、零合格、失败与 CSRF',async()=>{
      const {page,state}=await setup();assert.equal(await page.locator('[data-job-id="history-job"] form').count(),0);
      const record=page.locator('[data-job-id="captured-job"]');await record.locator('summary').click();await record.locator('select').selectOption('standard');await record.locator('button').click();assert.match(await record.locator('[role=status]').innerText(),/标准场景编号/);assert.equal(state.posts.length,0);
      await record.locator('input:not([type=number])').fill('bench-001');await record.locator('textarea').fill('人工复核，不是自动验证');await record.locator('button').click();await loaded(page);await page.waitForFunction(()=>document.querySelector('[data-job-id="captured-job"]').textContent.includes('bench-001'));
      assert.deepEqual(state.posts.at(-1).body,{accepted:null,source:'standard',benchmark_id:'bench-001',note:'人工复核，不是自动验证'});assert.equal(state.posts.at(-1).csrf,'synthetic-csrf');
      await record.locator('summary').click();await record.locator('input[type=number]').fill('0');await record.locator('button').click();await page.waitForFunction(()=>document.querySelector('[data-job-id="captured-job"]').textContent.includes('人工合格数量：0'));
      assert.equal(state.posts.at(-1).body.accepted,0);
      await record.locator('summary').click();state.reviewError=true;await record.locator('button').click();await page.waitForFunction(()=>document.querySelector('.review-form [role=status]').textContent.includes('保存失败'));assert.match(await record.locator('[role=status]').innerText(),/合成验收保存失败/);
    });
    await t.test('所有来源文本、规格、证据、警告与错误安全渲染，不截掉警告',async()=>{
      const input=fixture();input.workers[0].name=ATTACK;input.workers[0].hardware.cpu=ATTACK;input.groups[0].capability_name=ATTACK;input.groups[0].dimensions={injected:ATTACK};input.groups[0].warnings=Array.from({length:7},(_,i)=>`${ATTACK} 警告${i}`);input.details[1].outputs=[{name:ATTACK}];input.details[1].review.note=ATTACK;
      const {page,state}=await setup({data:input});assert.equal(await page.locator('main img').count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);
      assert.ok((await page.locator('#workers').innerText()).includes(ATTACK));const row=await page.locator('#machine-groups [data-group-id=h1]').innerText();for(const warning of input.groups[0].warnings)assert.ok(row.includes(warning));
      await page.locator('[data-job-id=captured-job] summary').click();assert.ok((await page.locator('[data-job-id=captured-job]').innerText()).includes(ATTACK));assert.deepEqual(state.errors,[]);
    });
    await t.test('空态、读取失败及恢复不把未知当 0；下载走同源 GET 免 fetch',async()=>{
      const input={period:{},overview:{tasks:0,done:0,error:0,canceled:0},workers:[],groups:[],details:[],details_total:0};const {page,state}=await setup({data:input});
      assert.match(await page.locator('#workers').innerText(),/暂无执行端/);assert.match(await page.locator('#machine-groups').innerText(),/暂无业务规格/);assert.equal(await page.locator('#output-metrics strong').first().innerText(),'未知');assert.equal(await page.locator('#next').isDisabled(),true);
      await page.locator('#tab-purchase').click();assert.equal(await page.locator('#estimate-submit').isDisabled(),true);state.getError=true;await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#error').hidden);assert.match(await page.locator('#error').innerText(),/合成读取失败/);assert.equal(await page.locator('#export').getAttribute('href'),null);
      state.getError=false;await page.locator('#refresh').click();await loaded(page);const download=page.waitForEvent('download');await page.locator('#export').click();assert.equal((await download).suggestedFilename(),'capacity.csv');assert.equal(state.exports.length,1);assert.equal(state.exports[0].limit,undefined);assert.equal(state.exports[0].offset,undefined);
    });
    await t.test('390/320 像素手机无整页横向溢出，三页签与表单可操作',async()=>{
      const {page,state}=await setup();
      for(const width of [390,320]) {await page.setViewportSize({width,height:844});for(const id of ['machines','scenarios','purchase']){await page.locator('#tab-'+id).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width}px ${id} 不应产生整页横向滚动`);}}
      await page.setViewportSize({width:390,height:844});await page.locator('.demand-quantity').fill('15');await calculate(page);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      if(process.env.CHOUKA_TEST_SCREENSHOT)await page.screenshot({path:process.env.CHOUKA_TEST_SCREENSHOT,fullPage:true});assert.deepEqual(state.errors,[]);
    });
    await t.test('后端日期列表、配置快照和人工来源按实际口径展示',async()=>{
      const input=fixture();input.groups[3].days=['2026-10-01','2026-10-02','2026-10-03'];input.groups[3].samples=35;input.groups[3].config={cpu:'执行时 CPU',gpus:[{name:'执行时 GPU',memory_total_bytes:8*1024**3}]};input.groups[3].config_source='manual+reported';input.groups[3].reviewed=30;input.workers[0].hardware_source='manual+reported';
      const {page}=await setup({data:input});const row=page.locator('#machine-groups [data-group-id=c1]');assert.match(await row.innerText(),/样本 35 \/ 3 天/);assert.doesNotMatch(await row.innerText(),/参考样本不足/);assert.match(await row.innerText(),/已人工验收 30/);
      await row.locator('summary').click();assert.match(await row.innerText(),/执行时 GPU/);assert.match(await row.innerText(),/机器上报 \+ 人工声明/);assert.match(await row.innerText(),/2026-10-03/);
      await purchase(page,'verified');assert.match(await page.locator('#baseline-note').innerText(),/执行时 CPU/);assert.match(await page.locator('#baseline-note').innerText(),/当前配置仅作清单参考/);
    });
    await t.test('验收保存与筛选交错时废弃旧依据，不恢复旧筛选或旧估算',async()=>{
      const {page,state,context}=await setup();let release,received;const saved=new Promise(resolve=>received=resolve);
      await context.route('**/api/capacity/jobs/*/review',route=>{release=()=>route.fulfill({contentType:'application/json',body:'{"ok":true}'});received();});
      await page.locator('[data-job-id=captured-job] summary').click();await page.locator('[data-job-id=captured-job] button').click();await saved;
      await page.locator('#period').selectOption('today');await apply(page);await purchase(page);await calculate(page);assert.equal(state.posts.at(-1).body.mode,'historical');
      await release();await page.waitForFunction(()=>document.querySelector('#refresh-state').textContent.includes('人工标记已更新'));
      assert.equal(await page.locator('#period').inputValue(),'today');assert.equal(await page.locator('#export-estimate').isDisabled(),true);assert.doesNotMatch(await page.locator('#estimate-result').innerText(),/参考机器数/);assert.equal(await page.locator('#next').isDisabled(),true);
    });
    await t.test('新采集不完整样本与标准标签也可作 runtime 参考，单位始终为任务',async()=>{
      const input=fixture();input.groups=input.groups.filter(g=>g.source!=='historical').map(g=>({...g,eligible:false}));
      input.groups.push({...input.groups[0],id:'null-runtime',mean_seconds:null},{...input.groups[0],id:'zero-runtime',mean_seconds:0});
      const {page,state}=await setup({data:input});await purchase(page);
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
      const {page}=await setup({data:input});await page.locator('#tab-scenarios').click();
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
      const {page}=await setup({data:input});await page.locator('#tab-scenarios').click();
      assert.equal(await page.locator('#scenario-filter option').count(),3);
      assert.deepEqual(await page.locator('#scenario-groups tr[data-group-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.groupId)),['cold']);
      const value=await page.locator('#scenario-filter option').evaluateAll(nodes=>nodes.find(n=>n.textContent.includes('加载节点缓存')).value);
      await page.locator('#scenario-filter').selectOption(value);await page.locator('#scenario-groups summary').click();
      assert.match(await page.locator('#scenario-groups').innerText(),/UNETLoader/);
      assert.deepEqual(await page.locator('#scenario-groups tr[data-group-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.groupId)),['warm']);
    });
    await t.test('机器补录入口、部分字段提交、GiB 转字节、人工来源及历史快照不改写',async()=>{
      const input=fixture();input.groups[3].config={cpu:'旧快照 CPU'};const {page,state}=await setup({data:input});const worker=page.locator('[data-worker-id=w1]'),form=worker.locator('.profile-form');
      await worker.locator('.profile-details summary').click();await form.locator('button').click();assert.match(await form.locator('[role=status]').innerText(),/没有需要保存/);assert.equal(state.posts.length,0);
      await form.locator('[name=host_id]').fill('host-confirmed');await form.locator('[name=cpu]').fill('人工确认 CPU');await form.locator('[name=memory_total_bytes]').fill('128');await form.locator('[name=environment_id]').fill('env-v2');await form.locator('[name=model_version]').fill('model-v3');await form.locator('[name=disk]').fill('2TB NVMe');await form.locator('[name=note]').fill('人工盘点，不是历史快照');
      await form.locator('button').click();await page.waitForFunction(()=>!document.querySelector('#write-status').hidden);
      const post=state.posts.at(-1);assert.equal(post.path,'/api/capacity/workers/w1');assert.equal(post.csrf,'synthetic-csrf');assert.deepEqual(post.body,{host_id:'host-confirmed',cpu:'人工确认 CPU',memory_total_bytes:128*1024**3,environment_id:'env-v2',model_version:'model-v3',disk:'2TB NVMe',note:'人工盘点，不是历史快照'});
      assert.match(await worker.innerText(),/机器上报 \+ 人工声明/);assert.match(await worker.innerText(),/2TB NVMe/);assert.match(await page.locator('#write-status').innerText(),/不回写历史快照/);assert.deepEqual(state.data.groups[3].config,{cpu:'旧快照 CPU'});
      await worker.locator('.profile-details summary').click();await form.locator('[name=cpu]').fill('');await form.locator('[name=note]').fill('仅更新备注');await form.locator('button').click();await page.waitForFunction(()=>document.querySelector('[data-worker-id=w1]').textContent.includes('仅更新备注'));assert.deepEqual(state.posts.at(-1).body,{note:'仅更新备注'});
    });
    await t.test('机器补录失败保留输入；非法内存不发请求；手机表单无溢出',async()=>{
      const {page,state}=await setup();await page.setViewportSize({width:320,height:844});const worker=page.locator('[data-worker-id=w2]'),form=worker.locator('.profile-form');await worker.locator('.profile-details summary').click();
      assert.equal(await form.locator('[name=memory_total_bytes]').inputValue(),'');await form.locator('[name=memory_total_bytes]').fill('-1');await form.locator('button').click();assert.equal(state.posts.length,0);
      await form.locator('[name=memory_total_bytes]').fill('9999999999999999');await form.locator('button').click();assert.match(await form.locator('[role=status]').innerText(),/安全正整数/);assert.equal(state.posts.length,0);
      await form.locator('[name=memory_total_bytes]').fill('');await form.locator('[name=cpu]').fill('待确认 CPU');state.profileError=true;await form.locator('button').click();await page.waitForFunction(()=>document.querySelector('[data-worker-id=w2] .profile-form [role=status]').textContent.includes('保存失败'));
      assert.match(await form.locator('[role=status]').innerText(),/合成配置保存失败/);assert.equal(await form.locator('[name=cpu]').inputValue(),'待确认 CPU');assert.equal(await form.locator('button').isDisabled(),false);assert.deepEqual(state.posts.at(-1).body,{cpu:'待确认 CPU'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    });
    await t.test('机器补录与筛选交错保存成功后清掉已过时估算',async()=>{
      const {page,context}=await setup();let release,received;const saved=new Promise(resolve=>received=resolve);
      await context.route('**/api/capacity/workers/w1',route=>{release=()=>route.fulfill({contentType:'application/json',body:'{"source":"manual"}'});received();});
      const worker=page.locator('[data-worker-id=w1]');await worker.locator('.profile-details summary').click();await worker.locator('[name=note]').fill('异步补录');await worker.locator('.profile-form button').click();await saved;
      await page.locator('#period').selectOption('today');await apply(page);await purchase(page);await calculate(page);await release();await page.waitForFunction(()=>document.querySelector('#refresh-state').textContent.includes('机器配置已更新'));
      assert.equal(await page.locator('#period').inputValue(),'today');assert.equal(await page.locator('#export-estimate').isDisabled(),true);assert.doesNotMatch(await page.locator('#estimate-result').innerText(),/参考机器数/);
    });
    await t.test('真实 CapacityStore.report 渲染契约：对象硬件、日期数组、配置和独立标准基准',async()=>{
      const actual=realStoreReport(),report=actual.report;
      assert.ok(report.groups.every(g=>Array.isArray(g.days)));assert.equal(actual.write.source,'manual');assert.equal(actual.write.hardware.disk,'2TB 契约磁盘');assert.equal(actual.write.note,'契约备注不进入配置快照');
      const standards=report.groups.filter(g=>g.source==='standard');assert.equal(standards.length,2);assert.deepEqual(standards.map(g=>g.benchmark_id).sort(),['contract-bench-a','contract-bench-b']);
      assert.ok(report.groups.filter(g=>g.source!=='historical').every(g=>g.config_id && g.config_source==='manual+reported'));
      const {page,state}=await setup({data:report});assert.match(await page.locator('#workers').innerText(),/契约 CPU/);assert.match(await page.locator('#workers').innerText(),/契约系统/);assert.doesNotMatch(await page.locator('#workers').innerText(),/\[object Object\]/);
      assert.match(await page.locator('#machine-groups').innerText(),/contract-bench-a/);assert.match(await page.locator('#machine-groups').innerText(),/contract-bench-b/);assert.match(await page.locator('#machine-groups').innerText(),/1 天/);
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
    await t.test('普通身份不能读取产能 API',async()=>{const {page,state}=await setup({role:'user'});await page.waitForURL('http://capacity.test/');assert.equal(state.gets.length,0);});
  } finally {await Promise.all(contexts.map(context=>context.close()));await browser.close();}
});
