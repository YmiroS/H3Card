// 仅运行本地 Chrome 与真实页面脚本；HTTP 夹具只提供已批准接口，不连接生产。
// NODE_PATH=/private/tmp/h3card-phone-tests.KeKBHn/node_modules CHOUKA_TEST_BROWSER=chrome node --test tests/test_monitor_page.cjs
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createServer} = require('node:http');
const {chromium} = require('playwright');
const {builtResources} = require('./helpers/admin-built-resources.cjs');
const built = builtResources(['/monitor']);
const at = Math.floor(Date.now() / 1000);
const attack = '<img src=x onerror="window.injected=1">';
const gate = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return {promise, resolve}; };
function summary() {
  return {health:{ok:true, mode:'controller', server_time:at, started_at:at-1000, sandbox:false, capabilities:37, jobs:2, comfy_online:true, llm:{ok:true, model:'测试模型'}}, status:{running_count:1, queued_count:0},
    workers:['a','b'].map((id, i) => ({id, name:'设备'+id, state:'idle', enabled:true, last_seen:at, comfy_online:true, busy:false, current_job_id:null, is_primary_node:!i, sync_status:'done', capabilities:{agent_version:5, telemetry:{hostname:'HOST-'+id, collected_at:at, gpus:[{index:0,name:'测试显卡',memory_total_bytes:24*1024**3,memory_used_bytes:6*1024**3,utilization_percent:25,temperature_c:55},{index:1,name:'第二张卡',temperature_c:64}],memory:{total_bytes:128*1024**3,used_bytes:32*1024**3}}}})),
    jobs:[{id:'j1',status:'running',capability:'video',name:'测试业务',cardName:'测试卡片',projectName:'测试项目',submitter_display_name:'测试提交人',submitter_username:'test',progress:.27,step:'采样',created:at-120,started:at-100,worker_id:'a'},{id:'j2',status:'done',name:'另一任务',progress:null}]};
}
function history(index = 0, minutes = 30) {
  return {worker_id:'a',gpu_index:index,minutes,from:at-minutes*60,to:at,gap_seconds:60,server_time:at,points:[{at:at-500,temperature_c:41+index},{at:at-450,temperature_c:null},{at:at-400,temperature_c:47+index},{at:at-200,temperature_c:51+index},{at:at-150,temperature_c:53+index}]};
}
async function fixture(run, options = {}) {
  const state = {data:summary(), status:200, user:{id:'monitor-test',username:'monitor-screen',role:'monitor',phone:''}, detailStatus:200, temperatureStatus:200, ...options};
  const requests = [], unexpected = [], errors = [], waiting = new Set();
  const server = createServer((req,res) => {
    waiting.add(res); res.once('close', () => waiting.delete(res));
    void (async () => {
      const url = new URL(req.url,'http://localhost'); const p = url.pathname;
      const json = (body,status=200) => { res.writeHead(status,{'Content-Type':'application/json'}); res.end(JSON.stringify(body)); };
      if (p.startsWith('/api/')) requests.push({path:p,search:url.search,method:req.method,headers:req.headers});
      if (p === '/api/auth/me' && req.method === 'GET') return json({user:state.user,csrf_token:'test-csrf'});
      if (p === '/api/auth/logout' && req.method === 'POST') return json({ok:true});
      if (p === '/api/monitor/summary' && req.method === 'GET') {
        state.onSummary?.();
        if (state.preview) {
          const current = Date.now()/1000;state.data.health.server_time=current;
          for(const worker of state.data.workers) if(worker.state!=='offline') {worker.last_seen=current;worker.capabilities.telemetry.collected_at=current;}
        }
        const body = structuredClone(state.data), status = state.status;
        if (state.summaryGate) await Promise.race([state.summaryGate.promise,new Promise(r=>res.once('close',r))]);
        if (!res.destroyed) json(status===200?body:{error:attack},status); return;
      }
      if (/^\/api\/monitor\/workers\/[ab]$/.test(p) && req.method === 'GET') {
        const id = p.split('/').at(-1), worker = state.data.workers.find(w=>w.id===id);
        const body = {worker,comparison_baseline:{status:'ready',worker_id:'a'},capabilities:state.caps||{node_classes:['节点'+id]},capability_comparison:{status:'missing',missing_node_classes:[attack],extra_node_classes:['额外节点'],missing_models:[],extra_models:[]}};
        if (state.detailGate && id === 'a') await Promise.race([state.detailGate.promise,new Promise(r=>res.once('close',r))]);
        if (!res.destroyed) json(state.detailStatus===200?body:{error:attack},state.detailStatus); return;
      }
      if (/^\/api\/monitor\/workers\/[ab]\/temperature$/.test(p) && req.method === 'GET') {
        const index = Number(url.searchParams.get('gpu_index'));
        if (state.tempGate && index===0) await Promise.race([state.tempGate.promise,new Promise(r=>res.once('close',r))]);
        if (!res.destroyed) json(state.temperatureStatus===200?history(index,Number(url.searchParams.get('minutes'))):{error:attack},state.temperatureStatus); return;
      }
      if (built.serve(req, res)) return;
      if (p === '/login') { res.setHeader('Content-Type','text/html'); return res.end('<!doctype html><title>登录</title><h1>重新登录</h1>'); }
      unexpected.push(req.method+' '+p); res.writeHead(404); res.end();
    })().catch(e=>{errors.push(e.message);res.destroy();});
  });
  let browser;
  try {
    await new Promise(r=>server.listen(options.preview ? Number(process.env.MONITOR_PREVIEW_PORT)||0 : 0,'127.0.0.1',r));
    const origin = 'http://127.0.0.1:'+server.address().port;
    if (options.preview) {
      console.log('仅本地合成数据预览：'+origin+'/monitor');
      console.log('不启动浏览器、不启动生产应用；Ctrl+C 关闭。');
      await new Promise(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve);});
      return;
    }
    browser = await chromium.launch({channel:process.env.CHOUKA_TEST_BROWSER||'chrome'});
    const context = await browser.newContext({viewport:{width:2560,height:1440},serviceWorkers:'block'});
    await context.route('**/*',route=>{ if(new URL(route.request().url()).origin===origin)return route.continue();unexpected.push(route.request().url());return route.abort(); });
    await context.routeWebSocket('**/*',socket=>{unexpected.push(socket.url());socket.close();});
    const page = await context.newPage(); page.setDefaultTimeout(8000); page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time:at*1000});
    await run({page,state,requests,origin});
    assert.deepEqual(unexpected,[],'只能请求白名单监控 API、认证入口与本地资源');
    assert.deepEqual(errors,[],'页面和夹具无未捕获异常');
    for(const r of requests) if(r.method!=='GET') { assert.equal(r.path,'/api/auth/logout');assert.equal(r.headers['x-csrf-token'],'test-csrf'); }
  } finally { if(browser)await browser.close();for(const res of waiting)res.destroy();server.closeAllConnections();await new Promise(r=>server.close(r)); }
}
async function ready(f) { await f.page.goto(f.origin+'/monitor');await f.page.waitForFunction(()=>document.querySelector('#worker-rows [data-node]')); }
async function refresh(f) { await f.page.locator('#refresh').click();await f.page.waitForFunction(()=>!document.querySelector('#refresh').disabled); }
async function settle(page) { await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))); }

if (process.env.MONITOR_PREVIEW === '1') {
  const data = summary();
  data.workers[0].state='busy';data.workers[0].busy=true;data.workers[0].current_job_id='j1';
  if (process.env.MONITOR_PREVIEW_ALERTS === '1') {
    data.jobs[0].status='error';data.jobs[0].error='合成测试：显存不足';data.jobs[0].ended=at-10;
    data.status.running_count=0;data.health.comfy_online=false;
    data.workers[0].state='offline';data.workers[0].busy=false;data.workers[0].current_job_id=null;
    data.workers[0].last_seen=at-120;data.workers[0].capabilities.telemetry.collected_at=at-120;
    data.workers[1].state='error';data.workers[1].comfy_online=false;data.workers[1].sync_status='error';
  }
  fixture(null,{preview:true,data}).catch(error=>{console.error(error);process.exitCode=1;});
} else {

test('加载、真实空态、未知值、全部记录、2K与手机局部滚动', async()=>fixture(async f=>{
  const {page,state}=f;state.summaryGate=gate();await page.goto(f.origin+'/monitor');
  assert.match(await page.locator('#worker-rows').textContent(),/正在读取/);
  state.summaryGate.resolve();delete state.summaryGate;await page.waitForFunction(()=>document.querySelector('[data-node]'));
  assert.match(await page.locator('#job-rows').textContent(),/测试提交人.*测试项目.*测试卡片/s);
  assert.equal(await page.locator('#workspace-nav, #account-menu').count(),0);
  assert.equal(await page.locator('#job-rows tr').nth(1).locator('[role=meter]').count(),0);
  state.data.jobs=Array.from({length:85},(_,i)=>({...summary().jobs[0],id:'job-'+i}));await refresh(f);
  assert.equal(await page.locator('#job-rows tr').count(),85,'不能截成最近30条');
  for(const [width,height] of [[2560,1440],[2048,1152],[1707,960],[390,844],[320,844]]) {
    await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,String(width));
    if(width>1250)assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),true,'桌面一屏框架');
  }
  state.data.workers=[];state.data.jobs=[];state.data.status={};await refresh(f);
  assert.match(await page.locator('#worker-rows').textContent(),/没有执行端/);assert.match(await page.locator('#job-rows').textContent(),/没有任务/);assert.equal(await page.locator('#running-value').textContent(),'未获取');
}));

test('首轮读取失败不显示假空态；断线保留快照，不把设备变离线，重试不假恢复',async()=>fixture(async f=>{
  const {page,state}=f;state.status=503;await page.goto(f.origin+'/monitor');await page.waitForFunction(()=>document.querySelector('#connection-label').textContent.includes('中断'));
  assert.match(await page.locator('#worker-rows').textContent(),/读取失败/);assert.equal(await page.locator('#connection img').count(),0);
  state.status=200;await refresh(f);state.status=503;await refresh(f);
  assert.match(await page.locator('#worker-rows').textContent(),/设备a/);assert.match(await page.locator('#connection').textContent(),/非实时/);
  assert.equal(await page.locator('#worker-rows tr.offline-row').count(),0);assert.equal(await page.locator('#worker-rows [role=meter]').count(),0);
  state.summaryGate=gate();await page.locator('#refresh').click();assert.match(await page.locator('#connection').textContent(),/非实时/);state.summaryGate.resolve();
}));

for(const status of [401,403])for(const source of ['summary','detail','temperature'])test(`${source} ${status} 立即清屏、关窗、清存储并停轮询`,async()=>fixture(async f=>{
  const {page,state,requests}=f;await ready(f);
  await page.evaluate(()=>localStorage.setItem('h3-monitor-alerts:monitor-test',JSON.stringify({secret:'旧账号'})));
  if(source==='summary'){state.status=status;await page.locator('#refresh').click();}
  if(source==='detail'){state.detailStatus=status;await page.locator('[data-node="a"]').click();}
  if(source==='temperature'){state.temperatureStatus=status;await page.locator('[data-temp="a"]').click();}
  await page.waitForFunction(()=>document.querySelector('#access-denied')&&!document.querySelector('#access-denied').hidden);
  assert.equal(await page.locator('#worker-rows, #job-rows, #detail-body, #alert-events, #event-detail').allTextContents().then(a=>a.join('')),'');
  assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('h3-monitor-alerts:monitor-test')),null);
  const n=requests.length;await page.clock.runFor(90000);assert.equal(requests.length,n);
}));

test('详情关窗和切设备竞态；安全配置分页16k、有界、代理对和XSS完整',async()=>fixture(async f=>{
  const {page,state}=f;await ready(f);state.detailGate=gate();await page.locator('[data-node="a"]').click();
  assert.match(await page.locator('#detail-body').textContent(),/正在读取/);await page.keyboard.press('Escape');
  await page.locator('[data-node="b"]').click();await page.waitForFunction(()=>document.querySelector('#detail-body').textContent.includes('HOST-b'));state.detailGate.resolve();await settle(page);
  assert.doesNotMatch(await page.locator('#detail-body').textContent(),/HOST-a/);assert.equal(await page.locator('#detail-body img').count(),0);await page.keyboard.press('Escape');
  state.caps={long:'x'.repeat(15986)+String.fromCodePoint(0x20000)+'y'.repeat(17000),end:attack};
  await page.locator('[data-node="b"]').click();await page.locator('#safe-config summary').click();await page.locator('#safe-config pre').waitFor();
  let text='';for(let i=0;i<3;i++){const part=await page.locator('#safe-config pre').textContent();assert.ok(part.length<=16000);assert.equal(part.isWellFormed(),true);text+=part;if(i<2)await page.locator('#safe-config [data-page-next]').click();}
  assert.equal(text,JSON.stringify(state.caps,null,2));assert.equal(await page.locator('#safe-config [data-page-next]').isDisabled(),true);
  assert.equal(await page.evaluate(()=>window.injected),undefined);await page.clock.runFor(61000);assert.equal(await page.locator('#detail-dialog').evaluate(d=>d.open),false);
}));

test('温度按真实时间断线、不插值，切卡竞态与离线只读历史',async()=>fixture(async f=>{
  const {page,state}=f;await ready(f);state.tempGate=gate();await page.locator('[data-temp="a"]').click();await page.selectOption('#temp-gpu','1');
  await page.waitForFunction(()=>document.querySelector('#temp-chart svg'));state.tempGate.resolve();await settle(page);
  assert.match(await page.locator('#temp-stats').textContent(),/当前温度64.*最高54/s);
  assert.equal(await page.locator('#temp-chart [data-curve]').evaluate(n=>(n.getAttribute('d').match(/M/g)||[]).length),3);
  await page.locator('[data-range="1440"]').click();await page.waitForFunction(()=>document.querySelector('#temp-chart svg')?.getAttribute('aria-label').includes('1440'));
  await page.keyboard.press('Escape');state.data.workers[0].state='offline';await refresh(f);
  await page.locator('#alert-dialog[open]').waitFor();await page.keyboard.press('Escape');await page.locator('[data-temp="a"]').click();
  await page.waitForFunction(()=>document.querySelector('#temp-chart svg'));assert.match(await page.locator('#temp-stats').textContent(),/当前温度非实时/);
  assert.match(await page.locator('#temp-note').textContent(),/历史/);
}));

test('四类事件聚合、恢复不关闭、Esc保留未读、知晓不改变故障、全字段转义',async()=>fixture(async f=>{
  const {page,state}=f;await ready(f);
  state.data.jobs[0].status='error';state.data.jobs[0].error=attack;
  state.data.workers[0].state='offline';state.data.workers[1].comfy_online=false;state.data.workers[1].sync_status='error';
  state.data.workers[1].sync_request_id='sync-1';await refresh(f);
  // 引擎负责阈值；使用多个真实摘要观察周期，不伪造引擎返回。
  for(let i=0;i<5;i++) {
    const response=page.waitForResponse(r=>r.url()===f.origin+'/api/monitor/summary');
    await page.clock.runFor(5100);await response;
    await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
  }
  await page.locator('#alert-dialog[open]').waitFor();assert.equal(await page.locator('#alert-events [data-event-select]').count(),4);
  assert.equal(await page.locator('dialog[open]').count(),1);assert.match(await page.locator('#event-detail').textContent(),/故障状态.*提醒知晓/s);
  for(const button of await page.locator('#alert-events [data-event-select]').all()){await button.click();assert.equal(await page.locator('#event-detail img, #event-detail script').count(),0);}
  state.data.workers[0].state='idle';state.data.workers[1].comfy_online=true;state.data.workers[1].sync_status='done';await page.clock.runFor(5000);
  assert.equal(await page.locator('#alert-dialog').evaluate(d=>d.open),true);await page.clock.runFor(61000);assert.equal(await page.locator('#alert-dialog').evaluate(d=>d.open),true);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#unread-banner').isVisible(),true);await page.locator('#alerts-open').click();await page.locator('#ack-alerts').click();
  assert.equal(await page.locator('#unread-banner').isHidden(),true);assert.match(await page.locator('#job-rows').textContent(),/失败/);assert.equal(await page.evaluate(()=>window.injected),undefined);
  assert.match(await page.locator('#persistence-note').textContent(),/审计日志.*丢弃/s);
}));

test('5秒不重叠、15秒超时、退避最高30秒；隐藏暂停与恢复保留焦点滚动',async()=>fixture(async f=>{
  const {page,state,requests}=f;await ready(f);state.summaryGate=gate();const started=gate();state.onSummary=started.resolve;
  await page.locator('#refresh').click();await started.promise;
  const count=()=>requests.filter(r=>r.path==='/api/monitor/summary').length;const before=count();await page.clock.runFor(14000);assert.equal(count(),before);
  await page.clock.runFor(1100);await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);assert.match(await page.locator('#connection').textContent(),/中断/);
  state.summaryGate.resolve();delete state.summaryGate;state.status=503;
  for(let i=0;i<5;i++){await page.clock.runFor(30000);await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);}
  const n=count();await page.clock.runFor(30000);await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);assert.ok(count()>=n+1,'最高30秒继续重试');
  await page.keyboard.press('Escape');state.status=200;await refresh(f);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  const hiddenCount=count();await page.clock.runFor(90000);assert.equal(count(),hiddenCount);
  await page.locator('[data-node="b"]').focus();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);assert.equal(await page.evaluate(()=>document.activeElement.dataset.key),'node:b');
}));

test('存储不可用和丢弃数量可见，历史异常不自动弹窗，错误字符串仅文本显示',async()=>fixture(async f=>{
  const {page,state}=f;
  await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('禁止存储','QuotaExceededError');};});
  state.data.jobs=Array.from({length:205},(_,i)=>({...summary().jobs[0],id:'history-'+i,status:'error',error:attack}));
  await ready(f);assert.equal(await page.locator('#alert-dialog').evaluate(d=>d.open),false);
  assert.match(await page.locator('#persistence-note').textContent(),/已丢弃 5 条.*本地存储不可用/);
  await page.locator('#alerts-open').click();assert.equal(await page.locator('#alert-events button').count(),200);
  assert.match(await page.locator('#event-detail').textContent(),/<img src=x/);assert.equal(await page.locator('#event-detail img').count(),0);
  await page.keyboard.press('Escape');await page.locator('[data-job-error]').first().click();
  assert.match(await page.locator('#detail-body').textContent(),/<img src=x/);assert.equal(await page.locator('#detail-body img').count(),0);
  assert.equal(await page.evaluate(()=>window.injected),undefined);
}));

test('轮询保持表格滚动和data-key焦点，超过60秒遥测不显示当前数值',async()=>fixture(async f=>{
  const {page,state}=f;state.data.jobs=Array.from({length:80},(_,i)=>({...summary().jobs[0],id:'scroll-'+i}));await ready(f);
  await page.locator('[data-node="b"]').focus();await page.locator('#job-scroll').evaluate(n=>{n.scrollTop=120;});
  const top=await page.locator('#job-scroll').evaluate(n=>n.scrollTop);
  await page.clock.runFor(5000);await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.key),'node:b');assert.equal(await page.locator('#job-scroll').evaluate(n=>n.scrollTop),top);
  state.data.workers[0].capabilities.telemetry.collected_at=at-61;await refresh(f);
  assert.match(await page.locator('#worker-rows tr').first().textContent(),/遥测未采集或已过期/);
  assert.equal(await page.locator('#worker-rows tr').first().locator('[role=meter]').count(),0);
  assert.doesNotMatch(await page.locator('#worker-rows tr').first().textContent(),/55°C|64°C/);
}));

test('管理员也只读且退出仅POST logout，普通角色拒绝且不读取摘要',async()=>{
  await fixture(async f=>{f.state.user.role='admin';f.state.user.phone='';await ready(f);assert.equal(await f.page.locator('#phone-dialog').count(),0);assert.equal(await f.page.locator('#workspace-nav, #account-menu, [data-delete-worker]').count(),0);await f.page.locator('#logout').click();await f.page.waitForURL(f.origin+'/login');});
  await fixture(async f=>{f.state.user.role='user';f.state.user.phone='13800138000';await f.page.goto(f.origin+'/monitor');await f.page.locator('#access-denied').waitFor();assert.equal(f.requests.filter(r=>r.path.startsWith('/api/monitor/')).length,0);});
});
}
