// 真实 React 管理页、共享工作区与会话回归；所有请求只到本地白名单夹具，不访问正式服务。
// 运行示例：CHOUKA_TEST_BROWSER=chrome node --test tests/test_admin_dashboard.cjs
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createServer} = require('node:http');
const {builtResources} = require('./helpers/admin-built-resources.cjs');
const {chromium} = require('playwright');

const built = builtResources(['/controller', '/controller/costs', '/admin/permissions', '/controller/capacity']);
const browserOptions = process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {};
const session = {id:'admin-id', username:'真实测试账号', display_name:'测试姓名', role:'admin'};
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return {promise, resolve}; }
function workers(at) {
  return [
    {id:'worker-a', name:'真实双卡节点', state:'busy', enabled:true, comfy_online:true, busy:true,
      current_job_id:'job-0', last_seen:at - 2, sync_status:'done',
      capability_comparison:{status:'missing', model_inventory_status:'missing',
        missing_node_classes:['MissingNode<script>window.injected=2</script>'], extra_node_classes:['WorkerOnlyNode'],
        missing_models:[{node_class:'CheckpointLoader', input:'ckpt_name', name:'models/<img src=x onerror="window.injected=3">.safetensors'}],
        extra_models:[{node_class:'CheckpointLoader', input:'ckpt_name', name:'models/worker-only.safetensors'}]},
      capabilities:{agent_version:5, node_classes:['A', 'B'], telemetry:{
        hostname:'WIN-A', collected_at:at - 2,
        gpus:[
          {index:0, name:'RTX 4090', utilization_percent:27, memory_used_bytes:6 * 1024 ** 3, memory_total_bytes:24 * 1024 ** 3, temperature_c:55},
          {index:1, name:'RTX 4090', utilization_percent:0, memory_used_bytes:0, memory_total_bytes:24 * 1024 ** 3, temperature_c:64},
        ], memory:{used_bytes:32 * 1024 ** 3, total_bytes:128 * 1024 ** 3},
      }}},
    {id:'worker-idle', name:'空闲节点', state:'idle', enabled:true, comfy_online:true, busy:false,
      is_primary_node:true, last_seen:at - 1,
      capability_comparison:{status:'primary', model_inventory_status:'complete', missing_node_classes:[], extra_node_classes:[], missing_models:[], extra_models:[]},
      capabilities:{agent_version:5, telemetry:{collected_at:at - 1, gpus:[{index:0, name:'未知温度显卡', utilization_percent:null, temperature_c:null}]}}},
    {id:'worker-offline', name:'离线节点', state:'offline', enabled:true, comfy_online:true, busy:false,
      last_seen:at - 80000, sync_status:'error', sync_message:'真实同步错误',
      capability_comparison:{status:'stale', model_inventory_status:'unknown', missing_node_classes:['LegacyMissingNode'], extra_node_classes:[], missing_models:[], extra_models:[]},
      capabilities:{agent_version:4, telemetry:{collected_at:at - 80000, gpus:[{index:0, name:'旧显卡', temperature_c:99, utilization_percent:99}]}}},
  ];
}
function jobs(at) {
  return Array.from({length:35}, (_, i) => ({
    id:'job-' + i, status:i === 0 ? 'running' : i === 1 ? 'error' : 'done',
    name:i === 1 ? '<img src=x onerror="window.injected=1">' : '真实任务模式',
    cardName:'真实卡片', project:'project-a', progress:i === 2 ? null : i === 0 ? .27 : 1,
    step:'真实步骤 ' + i, created:at - i * 100, started:at - i * 100,
    ended:i ? at - i * 100 + 50 : null, worker_id:'worker-a', error:i === 1 ? '真实完整错误\n第二行' : null,
  }));
}
function costData(at, days = 0) {
  const tasks = days || 2050;
  const group = [{key:'gpu', label:'真实GPU费用', tasks, retail_known_tasks:2000, retail_unknown_tasks:1,
    total_cost:456.25, retail_min:1234, retail_max:2345, retail_mid:1789.5}];
  return {
    overview:{tasks, done:2000, error:30, canceled:20, retail_min:1234, retail_max:2345, retail_mid:1789.5,
      retail_known_tasks:2000, retail_unknown_tasks:1, total_cost:456.25, actual_cost:400,
      estimated_cost:56.25, running_accrued:1.2, gpu_hours:32.75, electricity_cost:23,
      api_cost:null, failed_waste:34, unknown_cost_tasks:1},
    currency:'CNY', pricing_version:'真实-v1', period:{from:days ? at - days * 86400 : 0, to:at},
    by_category:group, by_worker:group, by_capability:group,
    jobs:Array.from({length:days || 25}, (_, i) => ({
      job_id:'cost-' + i, created_at:at - 100 * i, status:'done', category:'gpu', category_name:'GPU',
      project_name:'真实项目', card_name:'真实卡片', capability:'真实能力', worker_name:'真实节点', runtime_seconds:50,
      retail_source:i === 0 ? 'unpriced' : 'priced', retail_basis:'output_second_resolution', retail_min:1,
      retail_max:2, cost_source:i === 0 ? 'unknown' : 'actual', recognized_cost:i === 0 ? 0 : 1,
    })),
  };
}
function temperatureData(at, gpu = 0, minutes = 30, offline = false) {
  const values = gpu === 0 ? [41, null, 47, 51, 53] : [58, null, 60, 62, 63];
  return {worker_id:offline ? 'worker-offline' : 'worker-a', gpu_index:gpu, minutes,
    from:at - minutes * 60, to:at, gap_seconds:60, server_time:at,
    points:offline ? [] : [500, 450, 400, 200, 150].map((age, i) => ({at:at - age, temperature_c:values[i]})),
  };
}

async function withFixture(options, run) {
  const at = Date.now() / 1000;
  const state = {user:{...session}, sandboxHeader:false, maintenance:false, allowedBusinessWrites:[], ...options};
  const requests = [], unexpected = [], external = [], pageErrors = [], serverErrors = [];
  const waiting = new Set();
  const handlers = {
    '/api/auth/me': () => ({body:{user:state.user, csrf_token:'fixture-csrf'}}),
    '/api/auth/presence': () => ({body:{online_users:1}}),
    '/api/auth/password': () => ({body:{ok:true}}),
    '/api/auth/logout': () => ({body:{ok:true}}),
    '/api/health': () => ({body:{ok:true, mode:'controller', online_workers:2, workers:3,
      server_time:at, started_at:at - 1000, comfy_online:true, jobs:35, capabilities:34,
      llm:{ok:true, model:'真实模型'}, sandbox:state.sandbox === true, maintenance_active:state.maintenance === true}}),
    '/api/status': () => ({body:{running_count:1, queued_count:0}}),
    '/api/workers': () => ({body:{comparison_baseline:{status:'ready', worker_id:'worker-idle', agent_version:5}, workers:workers(at)}}),
    '/api/jobs': () => ({body:{jobs:jobs(at)}}),
    '/api/projects': () => ({body:{projects:[{id:'project-a', name:'真实项目'}]}}),
    '/api/admin/workers/sync-all': () => ({body:{worker_count:3, primary_count:0, skipped_count:0}}),
    '/api/costs': request => {
      const from = Number(request.url.searchParams.get('from'));
      const days = from ? Math.round((at - from) / 86400) : 0;
      return {body:costData(at, days)};
    },
    temperature: request => ({body:temperatureData(at, Number(request.url.searchParams.get('gpu_index')),
      Number(request.url.searchParams.get('minutes')), request.url.pathname.includes('worker-offline'))}),
  };
  const server = createServer((req, res) => {
    waiting.add(res); res.once('close', () => waiting.delete(res));
    void (async () => {
      const url = new URL(req.url, 'http://localhost');
      const key = /^\/api\/workers\/[^/]+\/temperature$/.test(url.pathname) ? 'temperature' : url.pathname;
      const methodKey = req.method + ' ' + key;
      const handlerKey = Object.hasOwn(handlers, methodKey) ? methodKey : key;
      if (Object.hasOwn(handlers, handlerKey)) {
        const method = handlerKey === methodKey ? req.method : key === '/api/admin/workers/sync-all' || key.startsWith('/api/auth/') && key !== '/api/auth/me' ? 'POST' : 'GET';
        if (req.method !== method) { unexpected.push(req.method + ' ' + req.url); res.writeHead(405); return res.end(); }
        const chunks = []; for await (const chunk of req) chunks.push(chunk);
        const raw = Buffer.concat(chunks).toString();
        const request = {url, method:req.method, body:raw ? JSON.parse(raw) : null, headers:req.headers};
        requests.push(request);
        const reply = await handlers[handlerKey](request);
        if (reply.wait) await Promise.race([reply.wait, new Promise(resolve => res.once('close', resolve))]);
        if (res.destroyed) return;
        if (state.sandboxHeader && url.pathname === '/api/health') res.setHeader('X-H3Card-Sandbox', 'local-copy');
        res.writeHead(reply.status || 200, {'Content-Type':'application/json; charset=utf-8'});
        return res.end(JSON.stringify(reply.body ?? {}));
      }
      if (built.serve(req, res)) return;
      // Redirect destinations are inert markers, not synthetic admin documents.
      if (req.method === 'GET' && ['/', '/login', '/monitor'].includes(url.pathname)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end('<!doctype html><meta charset="utf-8"><link rel="icon" href="/favicon.png"><h1 id="redirect-target">本地安全跳转落点</h1>');
      }
      unexpected.push(req.method + ' ' + req.url); req.resume(); res.writeHead(404); res.end();
    })().catch(error => { serverErrors.push(error.message); res.destroy(); });
  });
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch(browserOptions);
    const context = await browser.newContext({viewport:{width:2560, height:1440}, serviceWorkers:'block'});
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      external.push(route.request().url()); return route.abort();
    });
    await context.routeWebSocket('**/*', socket => { external.push(socket.url()); socket.close(); });
    // 记录并显式触发真实 React 轮询回调；不靠固定等待，也不让后台轮询干扰交互断言。
    await context.addInitScript(() => {
      window.fixtureIntervals = []; let next = 1000000;
      window.setInterval = (fn, ms) => { const id = ++next; fixtureIntervals.push({id, fn, ms}); return id; };
      window.clearInterval = id => { window.fixtureIntervals = fixtureIntervals.filter(timer => timer.id !== id); };
      window.bluePaths = [];
      for (const name of ['beginPath', 'moveTo', 'lineTo', 'stroke']) {
        const original = CanvasRenderingContext2D.prototype[name];
        CanvasRenderingContext2D.prototype[name] = function(...args) {
          if (name === 'beginPath') this.fixturePath = [];
          if (name === 'moveTo' || name === 'lineTo') (this.fixturePath ||= []).push([name, ...args]);
          if (name === 'stroke' && this.strokeStyle === '#38bdf8') bluePaths.push(this.fixturePath);
          return original.apply(this, args);
        };
      }
    });
    const page = await context.newPage(); page.setDefaultTimeout(8000);
    page.on('pageerror', error => pageErrors.push(error.message));
    try {
      await run({page, origin, at, state, handlers, requests});
    } catch (error) {
      const ui = await page.evaluate(() => ({notices:[...document.querySelectorAll('[aria-label="操作通知"]')].map(node => node.textContent), dialogs:[...document.querySelectorAll('dialog')].map(node => ({open:node.open, text:node.textContent.slice(0,300)})), rootChildren:document.getElementById('root')?.childElementCount, tail:document.body.innerText.slice(-300)})).catch(() => null);
      console.error('Fixture diagnostics: ' + JSON.stringify({pageErrors, serverErrors, unexpected, ui}));
      throw error;
    }
    assert.deepEqual(pageErrors, [], '页面不得有未捕获 JS 错误');
    assert.deepEqual(serverErrors, [], '本地夹具服务器不得报错');
    assert.deepEqual(unexpected, [], '只访问明确列出的本地静态资源与 API');
    assert.deepEqual(external, [], '不允许 HTTP 或 WebSocket 外联');
    assert.ok(requests.some(request => request.url.pathname === '/api/auth/presence' && request.method === 'POST'), '真实 React 会话的 presence 必须继续运行');
    for (const request of requests.filter(item => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(item.method))) {
      assert.equal(request.headers['x-csrf-token'], 'fixture-csrf', '包括 presence 在内的写请求保留真实 CSRF');
      if (request.url.pathname !== '/api/auth/presence') {
        assert.ok(state.allowedBusinessWrites.includes(request.url.pathname), '不得产生额外业务写入：' + request.url.pathname);
      }
    }
  } finally {
    if (browser) await browser.close();
    for (const res of waiting) res.destroy();
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
}
const globalViewerRoute = '/api/admin/global-grants/viewer%2F%E4%B8%80';
const ownerViewerRoute = '/api/admin/grants/viewer%2F%E4%B8%80/owner-id';
const grantWrites = fixture => fixture.requests.filter(request => request.method !== 'GET' && request.url.pathname.startsWith('/api/admin/'));
async function withGrantFixture(initialGrants, run) {
  return withFixture({allowedBusinessWrites:[globalViewerRoute, ownerViewerRoute, '/api/admin/grants']}, async fixture => {
    const {page, handlers, state} = fixture;
    state.grants = structuredClone(initialGrants);
    state.users = [{...session, enabled:true},
      {id:'viewer/一', username:'访问账号', display_name:'<img src=x onerror="window.grantXss=1">', role:'user', enabled:true},
      {id:'owner-id', username:'所有者账号', role:'user', enabled:true},
      {id:'other-id', username:'其他账号', role:'user', enabled:true},
    ];
    handlers['/api/admin/users'] = () => ({body:{users:state.users}});
    handlers['/api/admin/grants'] = () => ({body:{grants:state.grants}});
    handlers['/api/admin/registrations'] = () => ({body:{requests:[], outbox:{pending:0}}});
    handlers['/api/projects'] = () => ({body:{projects:[]}});
    handlers['PUT ' + globalViewerRoute] = request => {
      assert.deepEqual(Object.keys(request.body), ['permission'], '全局请求不得发送哨兵或 owner_id/viewer_id');
      assert.ok(['read', 'operate'].includes(request.body.permission));
      state.grants = state.grants.filter(grant => !(grant.viewer_id === 'viewer/一' && grant.scope === 'all'));
      state.grants.push({viewer_id:'viewer/一', owner_id:null, scope:'all', permission:request.body.permission});
      return {body:{ok:true}};
    };
    handlers['DELETE ' + globalViewerRoute] = () => {
      state.grants = state.grants.filter(grant => !(grant.viewer_id === 'viewer/一' && grant.scope === 'all'));
      return {body:{ok:true}};
    };
    handlers['PUT /api/admin/grants'] = request => {
      assert.deepEqual(Object.keys(request.body).sort(), ['owner_id', 'permission', 'viewer_id']);
      assert.equal(request.body.viewer_id, 'viewer/一'); assert.equal(request.body.owner_id, 'owner-id');
      state.grants = state.grants.filter(grant => !(grant.viewer_id === request.body.viewer_id && grant.owner_id === request.body.owner_id));
      state.grants.push({...request.body}); return {body:{ok:true}};
    };
    handlers['DELETE ' + ownerViewerRoute] = () => {
      state.grants = state.grants.filter(grant => !(grant.viewer_id === 'viewer/一' && grant.owner_id === 'owner-id'));
      return {body:{ok:true}};
    };
    await page.goto(fixture.origin + '/admin/permissions');
    await page.waitForFunction(() => document.querySelector('#grant-submit')?.disabled === false);
    await run(fixture);
    assert.equal(await page.locator('#grants img, dialog img').count(), 0, '账号花名必须转义为文本');
    assert.equal(await page.evaluate(() => window.grantXss), undefined);
    assert.deepEqual(state.users.map(user => user.role), ['admin', 'user', 'user', 'user'], '授权不修改账号角色');
  });
}
async function confirmGrant(page) {
  await page.getByRole('dialog').getByRole('button', {name:'确认保存授权', exact:true}).click();
  await page.waitForFunction(() => !document.querySelector('dialog') && document.querySelector('#grant-submit')?.disabled === false);
}
async function dashboard(fixture) {
  await fixture.page.goto(fixture.origin + '/controller');
  await fixture.page.waitForFunction(() => document.querySelectorAll('#worker-rows tr').length === 3
    && document.querySelector('#main').getAttribute('aria-busy') === null);
}
async function costs(fixture) {
  await fixture.page.goto(fixture.origin + '/controller/costs');
  await fixture.page.waitForFunction(() => document.querySelector('#tasks')?.textContent === '2050');
}
async function tick(fixture, ms, api) {
  const response = fixture.page.waitForResponse(reply => new URL(reply.url()).pathname === api);
  await fixture.page.evaluate(ms => fixtureIntervals.filter(timer => timer.ms === ms).forEach(timer => timer.fn()), ms);
  await response;
  await fixture.page.waitForFunction(() => document.querySelector('#main').getAttribute('aria-busy') === null);
}
async function closeDialog(page) {
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog'));
}
async function settle(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function checkAccount(page) {
  assert.equal(await page.locator('#workspace-nav[data-admin-sidebar]').count(), 1);
  for (const selector of ['#account', '.account-bar', '.account-trigger', '#account-menu']) assert.equal(await page.locator(selector).count(), 1);
  assert.equal(await page.locator('.admin-mobile-account, .admin-account, .side-actions, .sidebar').count(), 0);
  const trigger = page.locator('#account .account-trigger');
  assert.equal(await trigger.isVisible(), true);
  assert.equal(await trigger.locator('.account-name').textContent(), session.display_name);
  assert.equal(await trigger.getAttribute('aria-label'), '用户菜单：' + session.display_name);
  await trigger.click();
  const menu = page.locator('#account-menu:popover-open');
  await menu.waitFor({state:'visible'});
  assert.match(await menu.locator('.account-menu-heading').textContent(), /测试姓名.*真实测试账号.*管理员/s);
  assert.deepEqual(await menu.locator('.account-action').allTextContents(), ['用户信息', '修改密码', '退出登录']);
  await page.keyboard.press('Escape');
  assert.equal(await trigger.evaluate(node => node === document.activeElement), true, '真实账号popover关闭后返回触发按钮');
}
// auth.js 的维护健康检查是独立后台请求，不能被误算为业务自动刷新。
const businessRequests = requests => requests.filter(request => !['/api/health', '/api/auth/presence'].includes(request.url.pathname));


test('运行六概览保留真实模式、多GPU比例、状态色、最近30条和未知值；离线不复用遥测', async () => {
  await withFixture({}, async fixture => {
    const {page, handlers} = fixture;
    handlers['/api/status'] = () => ({body:{running_count:null, queued_count:0}});
    await dashboard(fixture);
    assert.equal(await page.locator('.metrics .metric').count(), 6);
    assert.equal(await page.locator('#running').textContent(), '未获取');
    assert.equal(await page.locator('#queued').textContent(), '0');
    assert.equal(await page.locator('#config-rows dt').count(), 6);
    assert.equal(await page.locator('#job-rows tr').count(), 30);
    assert.match(await page.locator('#worker-rows tr').first().textContent(), /真实卡片.*真实项目/s);
    assert.match(await page.locator('#worker-rows tr').nth(1).textContent(), /未采集/);
    assert.equal(await page.locator('#worker-rows tr').last().locator('[role=meter]').count(), 0);
    assert.doesNotMatch(await page.locator('#worker-rows tr').last().textContent(), /99°C/);
    assert.equal(await page.locator('#job-rows tr').nth(2).locator('[role=meter]').count(), 0);
    assert.equal(await page.locator('#job-rows img').count(), 0);
    assert.equal(await page.evaluate(() => window.injected), undefined);
    assert.match(await page.locator('#worker-rows tr').first().textContent(), /Worker v5.*模型不全 · 缺 1 个；节点不全 · 缺 1 个/s);
    assert.match(await page.locator('#worker-rows tr').nth(1).textContent(), /Worker v5.*主节点基准/s);
    assert.match(await page.locator('#worker-rows tr').last().textContent(), /Worker v4.*节点离线 · 最后清单：模型清单未知；节点不全 · 缺 1 个/s);
    await page.locator('[data-worker="worker-a"]').click();
    const inventoryDialog = page.locator('dialog');
    assert.match(await inventoryDialog.textContent(), /清单状态.*模型不全.*比较基准.*空闲节点.*缺失节点类.*MissingNode<script>.*缺失模型.*models\/<img.*\.safetensors.*CheckpointLoader · ckpt_name.*额外节点类.*WorkerOnlyNode/s);
    assert.equal(await inventoryDialog.locator('img, script').count(), 0, '清单中的节点名与模型名只能作为文本显示');
    assert.equal(await page.evaluate(() => window.injected), undefined);
    await closeDialog(page);
    await page.locator('#worker-rows [data-worker="worker-offline"]').click();
    assert.match(await page.locator('dialog').textContent(), /模型清单未知；节点不全.*缺失节点类.*LegacyMissingNode.*缺失模型 未知.*无法判断/s);
    await closeDialog(page);
    const colors = await page.locator('.f-worker-status .f-chip').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).color));
    assert.deepEqual(colors, ['rgb(245, 201, 106)', 'rgb(123, 217, 157)', 'rgb(251, 113, 133)']);
    const receptions = await page.locator('.f-reception').allTextContents();
    assert.deepEqual(receptions, ['正在占用', '可接任务', '不可接任务']);
    const ratios = await page.locator('#worker-rows [role=meter]').evaluateAll(nodes => nodes.map(node => ({
      value:Number(node.getAttribute('aria-valuenow')), ratio:node.querySelector('i').getBoundingClientRect().width / node.getBoundingClientRect().width * 100,
    })));
    assert.equal(ratios.length, 3, '保留两张显卡的独立显存条和系统内存条，不再渲染GPU利用率条');
    assert.equal(await page.locator('.workers-table th').nth(2).textContent(), 'GPU / 显存');
    const gpuCells = page.locator('#worker-rows td:nth-child(3)');
    assert.equal(await gpuCells.locator('.utilization').count(), 0);
    assert.doesNotMatch((await gpuCells.allTextContents()).join(' '), /\d+%/);
    assert.match(await gpuCells.first().textContent(), /GPU 0 · RTX 4090.*6\.0 GB \/ 24\.0 GB.*GPU 1 · RTX 4090.*0 KB \/ 24\.0 GB/s);
    assert.deepEqual(await gpuCells.locator('[role=meter]').evaluateAll(nodes => nodes.map(node => ({value:Number(node.getAttribute('aria-valuenow')), color:getComputedStyle(node.querySelector('i')).backgroundColor}))), [{value:25, color:'rgb(56, 189, 248)'}, {value:0, color:'rgb(56, 189, 248)'}]);
    assert.equal(await page.locator('#worker-rows tr').first().locator('td').nth(4).locator('[role=meter] i').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(174, 186, 202)', '系统内存条颜色不随显存修改');
    assert.equal(await page.locator('#job-rows tr').first().locator('[role=meter]').getAttribute('aria-valuenow'), '27', '任务进度条保持不变');
    for (const item of ratios) assert.ok(Math.abs(item.value - item.ratio) < .2, JSON.stringify(item));
    await page.selectOption('#jobs-filter', 'error');
    assert.equal(await page.locator('#job-rows tr').count(), 1);
    await page.locator('[data-job-error]').click();
    assert.match(await page.locator('dialog pre').first().textContent(), /真实完整错误\n第二行/);
    await closeDialog(page);
    const button = page.locator('[data-temperature="worker-a"]'); await button.focus();
    await tick(fixture, 5000, '/api/status');
    assert.equal(await button.evaluate(node => node === document.activeElement), true, '轮询替换节点行不丢失键盘焦点');
    for (const width of [2560, 2048, 1707, 1440, 390, 320]) {
      await page.setViewportSize({width, height:1000});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, width + ' 宽度不能整页横溢');
    }
  });
});

test('节点详情完整显示并滚动承载长模型缺失清单', async () => {
  await withFixture({}, async fixture => {
    const {page, handlers, at} = fixture;
    handlers['/api/workers'] = () => {
      const items = workers(at);
      items[0].capability_comparison.missing_models = Array.from({length:80}, (_, index) => ({
        node_class:'CheckpointLoader', input:'ckpt_name', name:`models/version-${index}/model.safetensors`,
      }));
      return {body:{comparison_baseline:{status:'ready', worker_id:'worker-idle', agent_version:5}, workers:items}};
    };
    await dashboard(fixture);
    assert.match(await page.locator('#worker-rows tr').first().textContent(), /模型不全 · 缺 80 个/);
    await page.locator('[data-worker="worker-a"]').click();
    const models = page.locator('dialog .inventory-list').nth(1);
    assert.equal(await models.locator('li').count(), 80);
    assert.equal(await models.evaluate(node => node.scrollHeight > node.clientHeight), true, '长清单必须在详情内滚动');
    assert.match(await models.locator('li').last().textContent(), /models\/version-79\/model\.safetensors/);
  });
});

test('大节点完整配置按需分页，展开与轮询不挂载全量文本', async () => {
  await withFixture({}, async fixture => {
    const {page, handlers, at} = fixture;
    const items = workers(at);
    const caps = items[0].capabilities;
    caps.node_classes = Array.from({length:5283}, (_, i) => `SyntheticNode_${i}`);
    const models = Array.from({length:534}, (_, i) => `models/合成测试目录/version-${i}/model-${'x'.repeat(60)}.safetensors`);
    caps.input_choices = Object.fromEntries(Array.from({length:300}, (_, i) => [`Loader_${i}`, {model:models}]));
    caps.last_value = '<img src=x onerror="window.configInjected=1">配置结束';
    handlers['/api/workers'] = () => ({body:{comparison_baseline:{status:'ready', worker_id:'worker-idle', agent_version:5}, workers:items}});
    await page.addInitScript(() => {
      const stringify = JSON.stringify;
      window.configSerializations = 0;
      JSON.stringify = function(value, ...args) {
        if (value?.node_classes?.length === 5283) window.configSerializations++;
        return stringify.call(this, value, ...args);
      };
    });
    await dashboard(fixture);
    await page.locator('[data-worker="worker-a"]').click();
    assert.equal(await page.evaluate(() => configSerializations), 0, '首次展开前不序列化配置');
    const before = await page.locator('dialog details pre').allTextContents();
    const elapsed = await page.locator('dialog details').evaluate(async node => {
      const start = performance.now(); node.open = true;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return performance.now() - start;
    });
    console.log(`合成配置 ${JSON.stringify(caps).length} 字符，展开至两帧 ${Math.round(elapsed)}ms`);
    assert.equal(before.join('').length, 0, '折叠时不序列化或挂载全量配置');
    const pre = page.locator('dialog details pre');
    await page.waitForFunction(() => document.querySelector('dialog details pre')?.textContent.length > 0);
    assert.ok((await pre.textContent()).length <= 16384, '每页文本有固定上限，不能仅用CSS裁剪全量内容');
    assert.match(await pre.textContent(), /agent_version/);
    const firstPage = await pre.textContent();
    const previous = page.locator('[data-config-prev]'), next = page.locator('[data-config-next]');
    assert.equal(await previous.isDisabled(), true);
    await next.click();
    assert.notEqual(await pre.textContent(), firstPage);
    const secondPage = await pre.textContent();
    assert.ok(secondPage.length <= 16384);
    assert.match(await page.locator('[data-config-page]').textContent(), /第 2 \/ \d+ 页/);
    caps.telemetry.hostname = '刷新后的主机名';
    caps.agent_version = 6;
    await tick(fixture, 5000, '/api/status');
    assert.equal(await pre.textContent(), secondPage, '轮询不替换已打开的快照或重置页码');
    assert.equal(await next.evaluate(node => node === document.activeElement), true, '轮询不抢分页按钮焦点');
    await page.locator('dialog summary').click();
    await settle(page);
    await page.locator('dialog summary').click();
    await settle(page);
    assert.equal(await pre.textContent(), secondPage, '收起再展开保留当前页');
    assert.equal(await page.evaluate(() => configSerializations), 1, '分页和反复展开不重复序列化大配置');
    await previous.click();
    assert.equal(await pre.textContent(), firstPage);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-config-download]').click();
    const download = await downloadPromise;
    const chunks = []; for await (const chunk of await download.createReadStream()) chunks.push(chunk);
    const downloaded = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    assert.equal(download.suggestedFilename(), 'worker-capabilities.json');
    assert.deepEqual(downloaded, {...caps, agent_version:5, telemetry:{...caps.telemetry, hostname:'WIN-A'}}, '下载保留打开时的完整快照，不截断也不混入后续轮询');
    assert.equal(await page.evaluate(() => window.configInjected), undefined);
    await page.setViewportSize({width:390, height:844});
    assert.equal(await page.locator('dialog').evaluate(node => node.scrollWidth <= node.clientWidth), true, '移动端配置在文本框内横向滚动');
    await closeDialog(page);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.focusKey), 'worker-details:worker-a');
    await page.locator('[data-worker="worker-a"]').click();
    await page.locator('dialog summary').click();
    await page.waitForFunction(() => document.querySelector('dialog details pre')?.textContent.includes('"agent_version": 6'));
    assert.match(await page.locator('dialog .f-definition').textContent(), /刷新后的主机名/);
    assert.equal(await page.evaluate(() => configSerializations), 2, '重新打开详情读取新的快照');
    await closeDialog(page);
  });
});

test('完整配置分页逐字保留长字符串、特殊字符和代理对，末页可返回', async () => {
  await withFixture({}, async fixture => {
    const {page, handlers, at} = fixture;
    const items = workers(at);
    // 将非 BMP 字符精确放到第一页边界，不能拆成两个损坏字符。
    const caps = {long:'x'.repeat(15986) + String.fromCodePoint(0x20000) + 'y'.repeat(17000), last_value:'<img src=x onerror="window.configInjected=1">'};
    items[0].capabilities = caps;
    handlers['/api/workers'] = () => ({body:{workers:items}});
    await dashboard(fixture);
    await page.locator('[data-worker="worker-a"]').click();
    await page.locator('dialog summary').click();
    const pre = page.locator('dialog details pre'), next = page.locator('[data-config-next]');
    await pre.waitFor();
    let full = '';
    for (let index = 0; index < 3; index++) {
      const text = await pre.textContent();
      assert.ok(text.length <= 16001);
      assert.equal(text.isWellFormed(), true, '每页不能包含被拆开的代理对');
      full += text;
      if (index < 2) { await next.focus(); await page.keyboard.press('Enter'); }
    }
    assert.equal(await pre.evaluate(node => node === document.activeElement), true, '末页按钮禁用时焦点转到配置文本');
    assert.equal(full, JSON.stringify(caps, null, 2), '所有分页拼接必须与原始配置逐字一致');
    assert.equal(await next.isDisabled(), true);
    assert.match(await page.locator('[data-config-page]').textContent(), /第 3 \/ 3 页/);
    assert.equal(await page.locator('dialog img, dialog script').count(), 0);
    assert.equal(await page.evaluate(() => window.configInjected), undefined);
    await page.locator('[data-config-prev]').click();
    assert.match(await page.locator('[data-config-page]').textContent(), /第 2 \/ 3 页/);
    await page.locator('[data-config-prev]').focus();
    await page.keyboard.press('Enter');
    assert.match(await page.locator('[data-config-page]').textContent(), /第 1 \/ 3 页/);
    assert.equal(await pre.evaluate(node => node === document.activeElement), true, '首页按钮禁用时焦点仍保留在配置区');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.locator('[data-config-download]').evaluate(node => node === document.activeElement), true, '后续键盘导航不跳回弹窗顶部');
    await closeDialog(page);
  });
});

test('空配置仍可展开，单页分页按钮禁用且正常关闭', async () => {
  await withFixture({}, async fixture => {
    const {page, handlers, at} = fixture;
    const items = workers(at); delete items[0].capabilities;
    handlers['/api/workers'] = () => ({body:{workers:items}});
    await dashboard(fixture);
    await page.locator('[data-worker="worker-a"]').click();
    await page.locator('dialog summary').click();
    await page.locator('dialog details pre').waitFor();
    assert.equal(await page.locator('dialog details pre').textContent(), '{}');
    assert.equal(await page.locator('[data-config-prev]').isDisabled(), true);
    assert.equal(await page.locator('[data-config-next]').isDisabled(), true);
    await page.locator('dialog [data-cancel]').first().click();
    await page.waitForFunction(() => !document.querySelector('dialog'));
    assert.equal(await page.evaluate(() => document.body.classList.contains('modal-open')), false);
  });
});

test('轮询保留节点及错误入口的焦点，跨刷新关闭弹窗回到原操作且不抢弹窗焦点', async () => {
  await withFixture({}, async fixture => {
    const {page} = fixture; await dashboard(fixture);
    for (const selector of ['#worker-rows [data-worker="worker-a"]', '#attention-list [data-worker="worker-offline"]', '[data-job-error="job-1"]']) {
      const trigger = page.locator(selector); await trigger.click();
      const key = await trigger.getAttribute('data-focus-key');
      await page.locator('dialog [data-cancel]').first().focus();
      await tick(fixture, 5000, '/api/status');
      assert.equal(await page.locator('dialog').evaluate(node => node.contains(document.activeElement)), true);
      await closeDialog(page);
      assert.equal(await page.evaluate(() => document.activeElement.dataset.focusKey), key);
    }
    const error = page.locator('[data-job-error="job-1"]'); await error.focus();
    await tick(fixture, 5000, '/api/status');
    assert.equal(await error.evaluate(node => node === document.activeElement), true);
    const attention = page.locator('#attention-list [data-worker="worker-offline"]'); await attention.focus();
    await tick(fixture, 5000, '/api/status');
    assert.equal(await attention.evaluate(node => node === document.activeElement), true, '同节点关注入口不能错误跳到表格详情');
  });
});

test('异常节点局部滚动不拖长配置和任务，手机保留账号角色、可读说明及触摸入口', async () => {
  await withFixture({}, async fixture => {
    const {page, handlers, at} = fixture;
    handlers['/api/workers'] = () => ({body:{workers:Array.from({length:7}, (_, i) => ({...workers(at)[2], id:'offline-' + i, name:'离线节点' + i}))}});
    await page.goto(fixture.origin + '/controller');
    await page.waitForFunction(() => document.querySelectorAll('#attention-list button').length === 7 && !document.querySelector('#main').hasAttribute('aria-busy'));
    const layout = await page.evaluate(() => ({list:document.getElementById('attention-list').clientHeight, scroll:document.getElementById('attention-list').scrollHeight, config:document.getElementById('config-rows').getBoundingClientRect().bottom, jobs:document.getElementById('job-rows').closest('.card').getBoundingClientRect().top}));
    assert.ok(layout.list <= 360 && layout.scroll > layout.list, JSON.stringify(layout));
    assert.ok(layout.config < 1440 && layout.jobs < 1440, JSON.stringify(layout));
    await page.locator('#attention-list button').last().focus();
    assert.ok(await page.locator('#attention-list').evaluate(node => node.scrollTop > 0));
    for (const width of [390, 320]) {
      await page.setViewportSize({width, height:844});
      assert.equal(await page.locator('.admin-mobile-account').count(), 0, '不创建第二套手机账号');
      await checkAccount(page);
      assert.ok(await page.locator('.metric-note').first().evaluate(node => parseFloat(getComputedStyle(node).fontSize) >= 12));
      for (const selector of ['#refresh', '#worker-rows [data-worker]', '[data-temperature]']) {
        const box = await page.locator(selector).first().boundingBox(); assert.ok(box.height >= 44, selector);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    await costs(fixture);
    await checkAccount(page);
  });
});

const legacyGrant = {viewer_id:'viewer/一', owner_id:'owner-id', permission:'read'};
const otherGlobalGrant = {viewer_id:'other-id', owner_id:null, scope:'all', permission:'read'};
for (const permission of ['read', 'operate']) {
  test(`所有画布 ${permission}：真实确认、取消零请求、保存仅发全局PUT且保留独立授权`, async () => {
    const previousGlobal = {viewer_id:'viewer/一', owner_id:null, scope:'all', permission:permission === 'read' ? 'operate' : 'read'};
    await withGrantFixture([legacyGrant, otherGlobalGrant, previousGlobal], async fixture => {
      const {page, state} = fixture;
      assert.equal(await page.locator('#metric-grants').textContent(), '3');
      assert.equal(await page.getByRole('combobox', {name:/^所有者 \/ 授权范围/}).evaluate(node => node.tagName), 'SELECT');
      assert.equal(await page.locator('#grant [name=owner_id] option[value="*"]').textContent(), '所有画布（含以后新增）');
      assert.equal(await page.locator('#grant [name=viewer_id] option[value="*"], #assign option[value="*"]').count(), 0);
      assert.match(await page.locator('#grant-help').textContent(), /全部个人和项目组.*现有及未来新增.*包含删除.*不会成为管理员/s);
      const globalRow = page.locator('#grants tr').filter({hasText:'访问账号'}).filter({hasText:'所有画布'});
      assert.match(await globalRow.textContent(), /所有画布.*全部个人和项目组.*现有及未来新增/s);
      assert.doesNotMatch(await page.locator('#grants').textContent(), /未知账号|null|undefined/);
      await page.getByRole('combobox', {name:/^访问者 A/}).selectOption('viewer/一');
      await page.getByRole('combobox', {name:/^所有者 \/ 授权范围/}).selectOption('*');
      await page.getByRole('combobox', {name:/^权限/}).selectOption(permission);
      await page.getByRole('button', {name:'保存授权', exact:true}).click();
      const dialog = page.getByRole('dialog', {name:'确认画布授权', exact:true});
      assert.match(await dialog.textContent(), /访问账号.*所有画布.*全部个人和项目组.*现有及未来新增.*可操作包含删除.*不会成为管理员.*其他独立授权保留.*即时重新校验/s);
      assert.match(await dialog.textContent(), permission === 'read' ? /权限：只读/ : /权限：可操作（含删除）/);
      assert.equal(await dialog.locator('img').count(), 0);
      assert.equal(grantWrites(fixture).length, 0, '打开确认窗不能写入');
      await dialog.getByRole('button', {name:'取消', exact:true}).click();
      await page.waitForFunction(() => !document.querySelector('dialog')); await settle(page);
      assert.equal(grantWrites(fixture).length, 0, '取消不得发送任何授权写入');
      assert.deepEqual(state.grants, [legacyGrant, otherGlobalGrant, previousGlobal]);
      await page.getByRole('button', {name:'保存授权', exact:true}).click();
      await confirmGrant(page);
      assert.deepEqual(grantWrites(fixture).map(request => ({method:request.method, path:request.url.pathname, body:request.body})),
        [{method:'PUT', path:globalViewerRoute, body:{permission}}]);
      assert.deepEqual(state.grants, [legacyGrant, otherGlobalGrant, {...previousGlobal, permission}]);
      assert.equal(await page.locator('#metric-grants').textContent(), '3', '更新同范围授权不产生重复记录');
      assert.equal(await page.getByRole('combobox', {name:/^所有者 \/ 授权范围/}).inputValue(), '*', '刷新后保留范围选择');
      assert.equal(await globalRow.locator('td').nth(3).textContent(), permission === 'read' ? '只读' : '可操作（含删除）');
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({width, height:900});
        await page.getByRole('combobox', {name:/^所有者 \/ 授权范围/}).scrollIntoViewIfNeeded();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, width + ' 授权页无整页横溢');
        const box = await page.getByRole('combobox', {name:/^所有者 \/ 授权范围/}).boundingBox();
        assert.ok(box.width > 0 && box.x >= 0 && box.x + box.width <= width + 1, '原生范围选择框保持可见可操作');
      }
    });
  });
}

test('全局与所有者授权分别撤销：取消零请求、路由按scope区分且其他授权保留', async () => {
  const globalGrant = {viewer_id:'viewer/一', owner_id:null, scope:'all', permission:'operate'};
  await withGrantFixture([legacyGrant, globalGrant, otherGlobalGrant], async fixture => {
    const {page, state} = fixture;
    const globalRow = page.locator('#grants tr').filter({hasText:'访问账号'}).filter({hasText:'所有画布'});
    await globalRow.getByRole('button', {name:'撤销', exact:true}).click();
    assert.match(await page.getByRole('dialog').textContent(), /所有画布.*全部个人和项目组.*现有及未来新增.*可操作（含删除）.*即时重新校验.*不会使其成为管理员.*其他独立授权不受影响/s);
    assert.doesNotMatch(await page.getByRole('dialog').textContent(), /未知账号|null/);
    await closeDialog(page); await settle(page);
    assert.equal(grantWrites(fixture).length, 0);
    assert.deepEqual(state.grants, [legacyGrant, globalGrant, otherGlobalGrant]);
    await globalRow.getByRole('button', {name:'撤销', exact:true}).click();
    await page.getByRole('dialog').getByRole('button', {name:'确认撤销授权', exact:true}).click();
    await page.waitForFunction(() => !document.querySelector('dialog') && document.querySelector('#metric-grants').textContent === '2');
    assert.deepEqual(state.grants, [legacyGrant, otherGlobalGrant]);
    assert.equal(await page.locator('#grants tr').filter({hasText:'所有画布'}).count(), 1);
    const ownerRow = page.locator('#grants tr').filter({hasText:'所有者账号'});
    assert.match(await ownerRow.textContent(), /访问账号.*所有者账号.*只读/s);
    await ownerRow.getByRole('button', {name:'撤销', exact:true}).click();
    assert.match(await page.getByRole('dialog').textContent(), /所有者账号/);
    assert.doesNotMatch(await page.getByRole('dialog').textContent(), /所有画布/);
    await page.getByRole('dialog').getByRole('button', {name:'确认撤销授权', exact:true}).click();
    await page.waitForFunction(() => !document.querySelector('dialog') && document.querySelector('#metric-grants').textContent === '1');
    assert.deepEqual(state.grants, [otherGlobalGrant]);
    assert.deepEqual(grantWrites(fixture).map(request => ({method:request.method, path:request.url.pathname, body:request.body})),
      [{method:'DELETE', path:globalViewerRoute, body:null}, {method:'DELETE', path:ownerViewerRoute, body:null}]);
    assert.doesNotMatch(await page.locator('#grants').textContent(), /未知账号|null|undefined/);
  });
});

test('旧所有者授权兼容：必填与自授权拦截、取消无请求、read和operate仍走旧PUT', async () => {
  await withGrantFixture([otherGlobalGrant], async fixture => {
    const {page, state} = fixture;
    await page.getByRole('button', {name:'保存授权', exact:true}).click(); await settle(page);
    assert.equal(await page.locator('dialog').count(), 0);
    assert.equal(await page.locator('#grant').evaluate(form => form.checkValidity()), false);
    await page.getByRole('combobox', {name:/^访问者 A/}).selectOption('viewer/一');
    await page.getByRole('combobox', {name:/^所有者 \/ 授权范围/}).selectOption('viewer/一');
    await page.getByRole('button', {name:'保存授权', exact:true}).click();
    assert.match(await page.locator('#grant-error').textContent(), /不能是同一个账号/);
    assert.equal(grantWrites(fixture).length, 0);
    for (const permission of ['read', 'operate']) {
      await page.getByRole('combobox', {name:/^所有者 \/ 授权范围/}).selectOption('owner-id');
      await page.getByRole('combobox', {name:/^权限/}).selectOption(permission);
      await page.getByRole('button', {name:'保存授权', exact:true}).click();
      assert.equal(await page.locator('#grant-error').textContent(), '');
      assert.match(await page.getByRole('dialog').textContent(), /所有者账号.*当前和以后创建.*可操作包含删除.*不会成为管理员/s);
      assert.doesNotMatch(await page.getByRole('dialog').textContent(), /所有画布|全部个人和项目组/);
      const before = grantWrites(fixture).length;
      await closeDialog(page); await settle(page);
      assert.equal(grantWrites(fixture).length, before);
      await page.getByRole('button', {name:'保存授权', exact:true}).click();
      await confirmGrant(page);
      assert.deepEqual(state.grants, [otherGlobalGrant, {...legacyGrant, permission}]);
      assert.equal(await page.locator('#grants tr').filter({hasText:'所有者账号'}).locator('td').nth(3).textContent(), permission === 'read' ? '只读' : '可操作（含删除）');
    }
    assert.deepEqual(grantWrites(fixture).map(request => ({method:request.method, path:request.url.pathname, body:request.body})),
      ['read', 'operate'].map(permission => ({method:'PUT', path:'/api/admin/grants', body:{viewer_id:'viewer/一', owner_id:'owner-id', permission}})));
  });
});

test('权限长列表保持全部记录且限高，分区锚点可定位并保留移动管理员身份', async () => {
  await withFixture({}, async fixture => {
    const {page, handlers} = fixture;
    handlers['/api/admin/users'] = () => ({body:{users:Array.from({length:60}, (_, i) => ({...session, id:'user-' + i, username:'账号' + i, enabled:true}))}});
    handlers['/api/admin/grants'] = () => ({body:{grants:[]}});
    handlers['/api/admin/registrations'] = () => ({body:{requests:Array.from({length:45}, (_, i) => ({username:'申请' + i, status:'approved', created_at:1})), outbox:{pending:0}}});
    handlers['/api/projects'] = () => ({body:{projects:[]}});
    await page.goto(fixture.origin + '/admin/permissions');
    await page.waitForFunction(() => document.querySelectorAll('#users tr').length === 60 && document.querySelectorAll('#registrations tr').length === 45);
    for (const selector of ['.accounts-scroll', '.registrations-scroll']) {
      const size = await page.locator(selector).evaluate(node => ({client:node.clientHeight, scroll:node.scrollHeight}));
      assert.ok(size.client <= 520 && size.scroll > size.client, JSON.stringify(size));
    }
    await page.locator('.section-nav a[href="#history-heading"]').click();
    assert.equal(await page.locator('#history-heading').evaluate(node => node === document.activeElement), true);
    const heading = await page.locator('#history-heading').boundingBox();
    assert.ok(heading.y >= 0 && heading.y + heading.height <= page.viewportSize().height, '分区标题定位到可见视口；短列表无需强行滚到页面无法到达的顶部');
    await page.setViewportSize({width:390, height:844});
    await checkAccount(page);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.locator('#users tr').count(), 60, '局部滚动不能截断账号');
  });
});

test('温度按真实at绘图，null和超出gap断线；全视口弹窗、多卡、周期、键盘和离线状态有效', async () => {
  await withFixture({}, async fixture => {
    const {page, requests} = fixture; await dashboard(fixture);
    await page.locator('[data-temperature="worker-a"]').click();
    await page.waitForFunction(() => bluePaths.length > 0);
    const commands = await page.evaluate(() => bluePaths.at(-1));
    assert.deepEqual(commands.map(command => command[0]), ['moveTo', 'moveTo', 'moveTo', 'lineTo']);
    assert.ok(Math.abs((commands[2][1] - commands[1][1]) / (commands[3][1] - commands[2][1]) - 4) < .001, '200秒和50秒横向距离严格按4:1');
    assert.match(await page.locator('[data-temp-stats]').textContent(), /当前温度55.*最高53.*最低41/s);
    const box = await page.locator('dialog').boundingBox();
    assert.ok(Math.abs(box.x + box.width / 2 - 1280) < 1);
    assert.ok(Math.abs(box.y + box.height / 2 - 720) < 1);
    assert.equal(await page.evaluate(() => !!document.getElementById(document.querySelector('dialog').getAttribute('aria-labelledby'))), true);
    await page.selectOption('[data-temp-gpu]', '1');
    await page.waitForFunction(() => document.querySelector('[data-temp-stats]').textContent.includes('最高63'));
    await page.locator('[data-range="1440"]').click();
    await page.waitForFunction(() => document.querySelector('canvas').getAttribute('aria-label').includes('1440分钟'));
    await page.locator('canvas').focus(); await page.keyboard.press('End');
    assert.match(await page.locator('.chart-tooltip').textContent(), /63°C/);
    for (let i = 0; i < 18; i++) {
      await page.keyboard.press(i % 2 ? 'Shift+Tab' : 'Tab');
      assert.equal(await page.locator('dialog').evaluate(node => node.contains(document.activeElement)), true);
    }
    await closeDialog(page);
    assert.equal(await page.locator('[data-temperature="worker-a"]').evaluate(node => node === document.activeElement), true);
    await page.locator('[data-temperature="worker-offline"]').click();
    await page.waitForFunction(() => document.querySelector('[data-temp-empty]').textContent.includes('暂无有效温度'));
    assert.equal(await page.locator('canvas').isHidden(), true);
    assert.match(await page.locator('[data-temp-stats]').textContent(), /当前温度非实时.*最高未采集/s);
    await closeDialog(page);
    assert.ok(requests.some(request => request.url.pathname.includes('/temperature') && request.url.searchParams.get('gpu_index') === '1' && request.url.searchParams.get('minutes') === '1440'));
  });
});

test('慢温度请求不阻塞五秒刷新，快速切卡拒绝晚到响应；失败和暂停后仍正确判断当前温度新鲜度', async () => {
  await withFixture({}, async fixture => {
    const {page, handlers, at, requests} = fixture, gate = deferred(); let slow = true;
    handlers.temperature = request => ({body:temperatureData(at, Number(request.url.searchParams.get('gpu_index')),
      Number(request.url.searchParams.get('minutes'))), ...(slow ? {wait:gate.promise} : {})});
    await dashboard(fixture);
    await page.locator('[data-temperature="worker-a"]').click();
    await page.waitForFunction(() => document.querySelector('[data-temp-empty]').textContent.includes('正在读取'));
    assert.match(await page.locator('[data-temp-stats]').textContent(), /当前温度55/);
    await tick(fixture, 5000, '/api/status');
    assert.equal(requests.filter(request => request.url.pathname.includes('/temperature')).length, 1, '未完成的同一历史请求不因轮询重复');
    slow = false; await page.selectOption('[data-temp-gpu]', '1');
    await page.waitForFunction(() => document.querySelector('[data-temp-stats]').textContent.includes('最高63'));
    gate.resolve(); await settle(page);
    assert.match(await page.locator('[data-temp-stats]').textContent(), /当前温度64.*最高63/s);
    handlers.temperature = () => ({status:500, body:{error:'真实历史读取失败'}});
    await page.locator('[data-range="120"]').click();
    await page.waitForFunction(() => document.querySelector('[data-temp-empty]').textContent.includes('温度历史读取失败'));
    assert.match(await page.locator('[data-temp-stats]').textContent(), /当前温度64.*最高未获取/s);
    // Reopening starts at GPU 0 / 30 minutes; every response must match its requested selection.
    handlers.temperature = request => ({body:temperatureData(at, Number(request.url.searchParams.get('gpu_index')), Number(request.url.searchParams.get('minutes')))});
    await page.locator('[data-temp-empty] button').click();
    await page.waitForFunction(() => !document.querySelector('canvas').hidden);
    await closeDialog(page);
    await page.locator('#auto-refresh').uncheck();
    await page.locator('[data-temperature="worker-a"]').click();
    await page.waitForFunction(() => !document.querySelector('canvas').hidden);
    assert.ok(await page.locator('#worker-rows tr').first().locator('[role=meter]').count() > 0);
    const before = businessRequests(requests).length;
    const healthBefore = requests.filter(request => request.url.pathname === '/api/health').length;
    await page.locator('dialog [data-cancel]').first().focus();
    let healthReply = page.waitForResponse(reply => new URL(reply.url()).pathname === '/api/health');
    await page.evaluate(() => { const original = Date.now; Date.now = () => original() + 61000; fixtureIntervals.filter(timer => timer.ms === 5000).forEach(timer => timer.fn()); });
    await healthReply; await settle(page);
    assert.match(await page.locator('[data-temp-stats]').textContent(), /当前温度未采集/);
    assert.equal(await page.locator('#worker-rows tr').first().locator('[role=meter]').count(), 0);
    const expired = await page.locator('#worker-rows tr').first().textContent();
    assert.match(expired, /遥测未采集或已过期/);
    assert.doesNotMatch(expired, /55°C|64°C|27%|32\.0 GB/);
    assert.equal(await page.locator('dialog [data-cancel]').first().evaluate(node => node === document.activeElement), true, '本地过期重绘不抢弹窗焦点');
    await closeDialog(page);
    const trigger = page.locator('[data-temperature="worker-a"]');
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
    healthReply = page.waitForResponse(reply => new URL(reply.url()).pathname === '/api/health');
    await page.evaluate(() => fixtureIntervals.filter(timer => timer.ms === 5000).forEach(timer => timer.fn()));
    await healthReply; await settle(page);
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true, '暂停时重绘也保持表内焦点');
    assert.equal(businessRequests(requests).length, before, '暂停时不得增加任务、节点、历史或其他业务请求');
    assert.equal(requests.filter(request => request.url.pathname === '/api/health').length, healthBefore + 2, '维护health独立于业务暂停继续执行');
  });
});

test('更新并重启使用真实确认和CSRF；失败可重试；读取失败清除实时读数并禁止提交', async () => {
  await withFixture({allowedBusinessWrites:['/api/admin/workers/sync-all']}, async fixture => {
    const {page, handlers, requests} = fixture; await dashboard(fixture);
    assert.match(await page.locator('#worker-rows tr').first().textContent(), /更新重启完成/);
    assert.match(await page.locator('#worker-rows tr').last().textContent(), /更新重启失败/);
    handlers['/api/admin/workers/sync-all'] = () => ({status:500, body:{error:'真实同步失败'}});
    assert.equal(await page.locator('#sync-all').textContent(), '一键更新全部节点');
    await page.locator('#sync-all').click();
    assert.match(await page.locator('dialog').textContent(), /更新全部节点.*ComfyUI.*models.*user.*chouka.*重启.*ComfyUI.*Worker/s);
    assert.equal(await page.locator('dialog [type=submit]').textContent(), '确认更新');
    assert.match(await page.locator('dialog').textContent(), /主节点.*不会参与更新/);
    assert.doesNotMatch(await page.locator('dialog').textContent(), /手动更新 requirements/);
    assert.equal(requests.filter(request => request.url.pathname.includes('sync-all')).length, 0, '打开确认窗不能立即写入');
    await page.locator('dialog [type=submit]').click();
    await page.waitForFunction(() => document.querySelector('dialog [role=alert]')?.textContent.includes('真实同步失败'));
    handlers['/api/admin/workers/sync-all'] = () => ({body:{worker_count:3, primary_count:1, skipped_count:1}});
    await page.locator('dialog [type=submit]').click();
    await page.waitForFunction(() => !document.querySelector('dialog'));
    assert.match(await page.locator('#h3-errors .h3-error-message').textContent(), /3.*主节点.*1.*旧版.*1/s);
    handlers['/api/status'] = () => ({status:500, body:{error:'状态读取失败'}});
    await page.locator('#refresh').click();
    await page.waitForFunction(() => !document.querySelector('#error').hidden);
    assert.match(await page.locator('#worker-rows tr').first().textContent(), /遥测未采集或已过期/);
    assert.equal(await page.locator('#sync-all').isDisabled(), true);
    assert.equal(requests.filter(request => request.url.pathname.includes('sync-all')).length, 2);
  });
});

test('费用八概览取服务端全量合计而非明细相加，未知不是零；分页、tab、15秒刷新和窄屏均正常', async () => {
  await withFixture({}, async fixture => {
    const {page} = fixture; await costs(fixture);
    assert.equal(await page.locator('.metrics .metric').count(), 8);
    assert.equal(await page.locator('#internal-total').textContent(), '¥456.2500');
    assert.equal(await page.locator('#api-cost').textContent(), '未知');
    assert.equal(await page.locator('#job-rows tr').count(), 10);
    assert.match(await page.locator('#job-rows tr').first().textContent(), /未定价.*未知/s);
    assert.match(await page.locator('#detail-note').textContent(), /2050.*25.*非完整明细/s);
    await page.locator('#cost-next').click();
    assert.match(await page.locator('#page-note').textContent(), /11–20/);
    await tick(fixture, 15000, '/api/costs');
    assert.match(await page.locator('#page-note').textContent(), /11–20/);
    assert.equal(await page.locator('#internal-total').textContent(), '¥456.2500');
    await page.locator('[data-cost-tab="category"]').focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[data-cost-tab="capability"]').getAttribute('aria-selected'), 'true');
    await page.locator('#cost-basis').click();
    assert.match(await page.locator('dialog').textContent(), /不是已收款或实际收入.*未知成本.*2000/s);
    await closeDialog(page);
    for (const width of [2560, 2048, 1707, 1440, 390, 320]) {
      await page.setViewportSize({width, height:1000});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, width + ' 费用页不能整页横溢');
    }
  });
});

test('手机费用保留完整精度，金额单元不拆行，极长金额仅局部滚动', async () => {
  await withFixture({}, async fixture => {
    const {page, handlers, at} = fixture, response = costData(at);
    Object.assign(response.overview, {total_cost:2121.834425, retail_min:6379.124, retail_max:10170.148});
    handlers['/api/costs'] = () => ({body:response});
    await costs(fixture);
    for (const width of [320, 390]) {
      await page.setViewportSize({width, height:844});
      assert.equal(await page.locator('#internal-total').textContent(), '¥2121.8344');
      assert.equal(await page.locator('#retail-range').textContent(), '¥6379.1240 – ¥10170.1480');
      const rows = await page.locator('#retail-range .cost-amount, #internal-total').evaluateAll(nodes => nodes.map(node => {
        const text = node.firstChild, tops = [];
        for (let i = 0; i < text.length; i++) { const range = document.createRange(); range.setStart(text, i); range.setEnd(text, i + 1); tops.push(range.getBoundingClientRect().top); }
        return new Set(tops).size;
      }));
      assert.deepEqual(rows, [1, 1, 1], '币种和小数尾数必须在同一行');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    response.overview.total_cost = 1234567890123456;
    await page.locator('#refresh').click();
    await page.waitForFunction(() => document.getElementById('internal-total').textContent === '¥1234567890123456.0000');
    assert.equal(await page.locator('#internal-total').evaluate(node => {
      node.scrollLeft = node.scrollWidth;
      return node.scrollWidth > node.clientWidth && node.scrollLeft > 0;
    }), true, '极长金额完整保留且可局部滚动查看尾数');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  });
});

test('全部未定价或成本全未知不能显示为免费；真实空周期和已知零成本仍保留零', async () => {
  await withFixture({}, async fixture => {
    const {page, handlers, at} = fixture;
    const response = costData(at);
    Object.assign(response.overview, {tasks:34, done:34, error:0, canceled:0,
      retail_min:0, retail_max:0, retail_mid:0, retail_known_tasks:0, retail_unknown_tasks:34,
      actual_cost:0, estimated_cost:0, total_cost:0, unknown_cost_tasks:34});
    // 明细故意与全量概览不一致，确保前端不拿分页覆盖服务端全量计数。
    response.jobs = [{job_id:'only-detail', status:'done', cost_source:'actual', recognized_cost:0}];
    handlers['/api/costs'] = () => ({body:response});
    await page.goto(fixture.origin + '/controller/costs');
    await page.waitForFunction(() => document.querySelector('#tasks')?.textContent === '34');
    assert.equal(await page.locator('#retail-range').textContent(), '未定价');
    assert.equal(await page.locator('#retail-mid').textContent(), '未定价');
    assert.equal(await page.locator('#internal-total').textContent(), '未知');
    assert.equal(await page.locator('#actual').textContent(), '未知');
    assert.match(await page.locator('#internal-split').textContent(), /均未记录.*34/s);
    // 有已知的零成本任务时，未知计数不覆盖全体，不得反向把真实零元改成未知。
    response.overview.unknown_cost_tasks = 33;
    await page.locator('#refresh').click();
    await page.waitForFunction(() => document.querySelector('#internal-total').textContent === '¥0.0000');
    // 空周期是服务端已知的空集合，0 不属于伪造未知值。
    for (const key of Object.keys(response.overview)) response.overview[key] = 0;
    response.jobs = []; response.by_category = []; response.by_capability = []; response.by_worker = [];
    await page.locator('#refresh').click();
    await page.waitForFunction(() => document.querySelector('#tasks').textContent === '0');
    assert.equal(await page.locator('#retail-range').textContent(), '¥0.0000');
    assert.equal(await page.locator('#retail-mid').textContent(), '¥0.0000');
    assert.equal(await page.locator('#internal-total').textContent(), '¥0.0000');
    assert.match(await page.locator('#job-rows').textContent(), /这个周期内还没有费用记录/);
  });
});

test('费用周期切换不被旧响应覆盖，失败保留原周期及汇总，重试成功再切换', async () => {
  await withFixture({}, async fixture => {
    const {page, handlers, at} = fixture, gate = deferred(); await costs(fixture);
    handlers['/api/costs'] = request => {
      const days = Math.round((at - Number(request.url.searchParams.get('from'))) / 86400);
      return {body:costData(at, days), ...(days === 7 ? {wait:gate.promise} : {})};
    };
    await page.selectOption('#period', '7'); await page.selectOption('#period', '30');
    await page.waitForFunction(() => document.querySelector('#tasks').textContent === '30');
    gate.resolve(); await settle(page);
    assert.equal(await page.locator('#tasks').textContent(), '30');
    handlers['/api/costs'] = () => ({status:500, body:{error:'真实费用错误'}});
    await page.selectOption('#period', '90');
    await page.waitForFunction(() => !document.querySelector('#error').hidden);
    assert.equal(await page.locator('#tasks').textContent(), '30');
    assert.match(await page.locator('#period-note').textContent(), /最近30天/);
    handlers['/api/costs'] = () => ({body:costData(at, 90)});
    await page.locator('#retry').click();
    await page.waitForFunction(() => document.querySelector('#tasks').textContent === '90');
    assert.equal(await page.locator('#error').isHidden(), true);
    assert.match(await page.locator('#period-note').textContent(), /最近90天/);
    assert.equal(await page.locator('#cost-prev').isDisabled(), true);
  });
});

test('真实权限弹窗保留完整FormData、busy防重及禁止关闭，失败保输入，完成和取消清密码并恢复焦点', async () => {
  await withFixture({allowedBusinessWrites:['/api/admin/users']}, async fixture => {
    const {page, handlers, requests} = fixture;
    const unsafe = '<img src=x onerror="window.dialogXss=1">';
    const users = [{...session, enabled:true}, {id:'target', username:unsafe, role:'user', enabled:true}];
    handlers['/api/admin/users'] = () => ({body:{users}});
    handlers['/api/admin/grants'] = () => ({body:{grants:[]}});
    handlers['/api/admin/registrations'] = () => ({body:{requests:[]}});
    handlers['/api/projects'] = () => ({body:{projects:[]}});
    let gate = deferred(), received = deferred(), failed = true;
    handlers['POST /api/admin/users'] = request => {
      received.resolve();
      if (failed) return {status:409, body:{error:'真实提交失败 ' + unsafe}, wait:gate.promise};
      users.push({id:'created', username:request.body.username, role:request.body.role, enabled:true, team_leader:request.body.team_leader});
      return {body:{ok:true}, wait:gate.promise};
    };
    await page.goto(fixture.origin + '/admin/permissions');
    const trigger = page.getByRole('button', {name:'新建账号', exact:true});
    await page.waitForFunction(() => !document.querySelector('#create-user')?.disabled);
    await trigger.click();
    const dialog = page.getByRole('dialog', {name:'新建账号', exact:true});
    await dialog.locator('[name=username]').fill('真实契约账号');
    await dialog.locator('[name=password]').fill('retained-test-password');
    await dialog.locator('[name=role]').selectOption('admin');
    await dialog.locator('[name=team_leader]').check();
    const savedPassword = await dialog.locator('[name=password]').elementHandle();
    const expected = {username:'真实契约账号', password:'retained-test-password', role:'admin', team_leader:true};
    await dialog.getByRole('button', {name:'创建账号', exact:true}).click(); await received.promise;
    assert.deepEqual(grantWrites(fixture).map(request => request.body), [expected], '真实请求必须包含密码、角色和checkbox，不能禁用字段导致FormData丢失');
    assert.equal(await dialog.locator('form').getAttribute('aria-busy'), 'true');
    assert.equal(await dialog.locator('[data-dialog-content]').evaluate(node => node.inert), true);
    assert.deepEqual(await dialog.locator('form').evaluate(form => Object.fromEntries(new FormData(form))),
      {username:expected.username, password:expected.password, role:expected.role, team_leader:'on'}, 'busy只设inert，不得禁用字段破坏异步FormData读取');
    assert.equal(await dialog.getByRole('button', {name:'正在提交…', exact:true}).isDisabled(), true);
    assert.equal(await dialog.getByRole('button', {name:'取消', exact:true}).isDisabled(), true);
    await dialog.evaluate(node => { node.querySelector('form').dispatchEvent(new Event('submit', {bubbles:true, cancelable:true})); node.close(); });
    await page.keyboard.press('Escape'); await settle(page);
    assert.equal(await dialog.evaluate(node => node.open && node.matches(':modal')), true, '提交中原生close和Esc均不能关闭或降级为非模态');
    assert.equal(grantWrites(fixture).length, 1, '重复submit不产生第二个网络写入');
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true);
    }
    gate.resolve();
    await page.waitForFunction(() => document.querySelector('dialog [role=alert]')?.textContent.includes('真实提交失败'));
    assert.equal(await dialog.locator('[name=username]').inputValue(), expected.username);
    assert.equal(await dialog.locator('[name=password]').inputValue(), expected.password);
    assert.equal(await dialog.locator('[name=role]').inputValue(), expected.role);
    assert.equal(await dialog.locator('[name=team_leader]').isChecked(), true);
    assert.equal(await dialog.locator('[data-dialog-content]').evaluate(node => node.inert), false);
    assert.equal(await dialog.locator('[data-operation-status]').evaluate(node => node === document.activeElement), true);
    assert.ok((await dialog.locator('[role=alert]').textContent()).includes(unsafe));
    assert.equal(await dialog.locator('img, script').count(), 0, '服务端错误必须按文本展示');
    gate = deferred(); received = deferred(); failed = false;
    await dialog.getByRole('button', {name:'创建账号', exact:true}).click(); await received.promise;
    assert.deepEqual(grantWrites(fixture).map(request => request.body), [expected, expected]);
    gate.resolve(); await dialog.waitFor({state:'detached'});
    assert.equal(await savedPassword.evaluate(node => node.value), '');
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
    const target = page.locator('#users tr').filter({hasText:unsafe}).getByRole('button', {name:'重置密码', exact:true});
    await target.click();
    const reset = page.getByRole('dialog', {name:'重置密码', exact:true});
    assert.ok((await reset.textContent()).includes(unsafe));
    assert.equal(await reset.locator('h2 img, [data-dialog-content] img, script').count(), 0);
    await reset.locator('[name=password]').fill('cancel-test-password');
    const canceledPassword = await reset.locator('[name=password]').elementHandle();
    await closeDialog(page);
    assert.equal(await canceledPassword.evaluate(node => node.value), '');
    assert.equal(await target.evaluate(node => node === document.activeElement), true);
    await trigger.click();
    await dialog.locator('[name=role]').selectOption('monitor');
    assert.equal(await dialog.locator('[name=team_leader]').isDisabled(), true);
    await closeDialog(page);
    handlers['/api/admin/users'] = () => ({status:500, body:{error:'真实读取失败 ' + unsafe}});
    await page.locator('#refresh').click();
    await page.waitForFunction(() => document.querySelector('#h3-errors')?.textContent.includes('真实读取失败'));
    assert.ok((await page.locator('#h3-errors').textContent()).includes(unsafe));
    assert.equal(await page.locator('#h3-errors img, #h3-errors script').count(), 0, '真实错误通知不能解释服务端HTML');
    assert.equal(requests.filter(request => request.method !== 'GET' && request.url.pathname !== '/api/auth/presence').length, 2, '取消重置和创建不得写入');
    assert.equal(await page.evaluate(() => window.dialogXss), undefined);
    assert.deepEqual(await page.evaluate(() => ['H3Auth', 'AdminUI', 'H3Notify'].filter(key => key in window)), [], 'React管理页不重新引入共享全局');
  });
});

test('四个真实React管理页从响应头识别隔离副本，唯一导航不覆盖各页业务错误', async () => {
  await withFixture({sandboxHeader:true}, async fixture => {
    const {page, handlers, requests} = fixture;
    handlers['/api/health'] = () => ({body:{mode:'controller', maintenance_active:false}});
    handlers['/api/capacity'] = () => ({body:{overview:{}, workers:[], groups:[], details:[], details_total:0}});
    handlers['/api/admin/users'] = () => ({body:{users:[{...session, enabled:true}]}});
    handlers['/api/admin/grants'] = () => ({body:{grants:[]}});
    handlers['/api/admin/registrations'] = () => ({body:{requests:[]}});
    for (const [key, route, api, title] of [
      ['capacity', '/controller/capacity', '/api/capacity', '产能评估'],
      ['permissions', '/admin/permissions', '/api/admin/users', '账号与权限'],
      ['controller', '/controller', '/api/status', '运行面板'],
      ['costs', '/controller/costs', '/api/costs', '费用统计'],
    ]) {
      const original = handlers[api], message = key + '真实业务读取失败';
      handlers[api] = () => ({status:500, body:{error:message}});
      await page.goto(fixture.origin + route);
      await page.locator('#sandbox-note').waitFor({state:'visible'});
      await page.waitForFunction(message => document.querySelector('#error')?.textContent.includes(message), message);
      assert.equal(await page.locator('#sandbox-note').count(), 1);
      assert.match(await page.locator('#sandbox-note').textContent(), /本地隔离数据副本/);
      assert.equal(await page.getByRole('heading', {name:title, exact:true}).count(), 1, '共享工作区保留真实业务标题');
      assert.equal(await page.locator('#error').isVisible(), true);
      assert.equal(await page.locator('body').getAttribute('data-workspace'), key);
      assert.equal(await page.locator('#workspace-nav .workspace-link[aria-current=page]').getAttribute('href'), route);
      assert.deepEqual(await page.locator('#workspace-nav .workspace-link').evaluateAll(links => links.map(link => link.getAttribute('aria-label'))),
        ['画布', '导演工作台', '项目组', '运行面板', '账号与权限', '费用评估', '产能统计']);
      assert.equal(await page.locator('#workspace-nav[data-admin-sidebar]').count(), 1);
      assert.equal(await page.locator('#account .account-trigger').count(), 1);
      assert.equal(await page.locator('.sidebar, .side-actions, .admin-mobile-account').count(), 0);
      const health = page.waitForResponse(response => new URL(response.url()).pathname === '/api/health');
      await page.evaluate(() => fixtureIntervals.filter(timer => timer.ms === 5000).forEach(timer => timer.fn()));
      await health; await settle(page);
      assert.ok((await page.locator('#error').textContent()).includes(message), '后续副本识别不得清空真实业务错误');
      assert.equal(await page.locator('#sandbox-note').count(), 1, '重复健康响应不重复挂载副本提示');
      handlers[api] = original;
    }
    await dashboard(fixture);
    await page.locator('#sandbox-note').waitFor({state:'visible'});
    assert.equal(await page.locator('#sandbox-note').count(), 1, '运行页复用共享提示');
    assert.equal(await page.locator('#sync-all').isDisabled(), true, '响应头显示副本时即使JSON无sandbox也禁止同步');
    await page.locator('#refresh').click();
    await page.waitForFunction(() => document.querySelector('#main').getAttribute('aria-busy') === null);
    assert.equal(await page.locator('#sandbox-note').isVisible(), true);
    assert.equal(await page.locator('#sync-all').isDisabled(), true);
    await costs(fixture); await page.locator('#sandbox-note').waitFor({state:'visible'});
    assert.equal(await page.locator('#sandbox-note').count(), 1, '费用页复用共享提示');
    assert.equal(requests.filter(request => request.method !== 'GET' && request.url.pathname !== '/api/auth/presence').length, 0, '读取失败和副本识别不发业务写入');
  });
});

test('真实重新加载及跨页导航保留唯一工作区、账号popover、键盘焦点与品牌', async () => {
  await withFixture({}, async fixture => {
    const {page, handlers} = fixture; await dashboard(fixture);
    handlers['/api/admin/users'] = () => ({body:{users:[{...session, enabled:true}]}});
    handlers['/api/admin/grants'] = () => ({body:{grants:[]}});
    handlers['/api/admin/registrations'] = () => ({body:{requests:[]}});
    for (const [route, key] of [['/controller', 'controller'], ['/controller/costs', 'costs'], ['/admin/permissions', 'permissions'], ['/controller', 'controller']]) {
      if (new URL(page.url()).pathname !== route) {
        await page.locator('#workspace-nav .workspace-link[href="' + route + '"]').click();
        await page.waitForURL(fixture.origin + route);
      }
      await page.locator('#account .account-trigger').waitFor();
      await page.reload();
      await page.locator('#account .account-trigger').waitFor();
      assert.equal(await page.locator('body').getAttribute('data-workspace'), key);
      assert.equal(await page.locator('#workspace-nav .workspace-links').count(), 1);
      assert.equal(await page.locator('.workspace-link[aria-current=page]').getAttribute('href'), route);
      assert.equal(await page.locator('.workspace-brand').getAttribute('href'), '/');
      assert.equal(await page.locator('.workspace-brand img').getAttribute('src'), '/icon.png');
      assert.ok((await page.locator('.workspace-brand > span').textContent()).trim(), '品牌文字不得丢失');
      assert.equal(await page.locator('.workspace-footer .workspace-presence b').count(), 1);
      assert.equal(await page.locator('.workspace-footer #account.account-bar').count(), 1);
      await checkAccount(page);
      assert.deepEqual(await page.evaluate(() => ['H3Auth', 'AdminUI', 'H3Notify'].filter(key => key in window)), []);
    }
    const trigger = page.locator('.account-trigger');
    await trigger.focus(); await page.keyboard.press('Enter');
    const infoAction = page.getByRole('menuitem', {name:'用户信息', exact:true});
    assert.equal(await infoAction.evaluate(node => node === document.activeElement), true, '打开菜单后焦点进入第一个真实菜单项');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.getByRole('menuitem', {name:'修改密码', exact:true}).evaluate(node => node === document.activeElement), true);
    await page.keyboard.press('Home');
    assert.equal(await infoAction.evaluate(node => node === document.activeElement), true);
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.getByRole('dialog', {name:'用户信息', exact:true}).locator('dd').allTextContents(),
      ['测试姓名', '真实测试账号', '未填写', '管理员', session.id]);
    await closeDialog(page);
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
    await trigger.click(); await page.locator('#account-menu .account-action').filter({hasText:'修改密码'}).click();
    const password = page.getByRole('dialog', {name:'修改密码', exact:true});
    assert.equal(await password.locator('[name=current_password]').isVisible(), true);
    assert.equal(await password.locator('[name=confirm_password]').isVisible(), true, '使用真实auth改密而非旧版壳层弹窗');
    await password.getByRole('button', {name:'取消', exact:true}).click();
    await password.waitFor({state:'detached'});
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
  });
});

test('维护health真和假与本地隔离、温度history并存，暂停业务刷新不禁维护且绝不同步', async () => {
  await withFixture({sandbox:true, maintenance:true}, async fixture => {
    const {page, state, requests} = fixture; await dashboard(fixture);
    const banner = page.locator('#maintenance-banner'); await banner.waitFor({state:'visible'});
    assert.equal(await banner.count(), 1);
    assert.equal(await banner.getAttribute('role'), 'status');
    assert.equal(await banner.getAttribute('aria-live'), 'polite');
    assert.equal(await page.locator('#sandbox-note').isVisible(), true);
    assert.equal(await page.locator('#sync-all').isDisabled(), true);
    await page.locator('#auto-refresh').uncheck();
    await page.locator('[data-temperature="worker-a"]').click();
    await page.waitForFunction(() => document.querySelector('[data-temp-stats]').textContent.includes('最高53'));
    const before = businessRequests(requests).length;
    await page.locator('dialog [data-cancel]').first().focus();
    for (const active of [false, true, false]) {
      state.maintenance = active;
      const reply = page.waitForResponse(response => new URL(response.url()).pathname === '/api/health');
      await page.evaluate(() => fixtureIntervals.filter(timer => timer.ms === 5000).forEach(timer => timer.fn()));
      await reply; await settle(page);
      assert.equal(await banner.isVisible(), active);
      assert.equal(await page.locator('dialog').evaluate(node => node.contains(document.activeElement)), true);
      assert.match(await page.locator('[data-temp-stats]').textContent(), /当前温度55.*最高53/s);
      assert.equal(await page.locator('#sandbox-note').isVisible(), true);
      assert.equal(await page.locator('#sync-all').isDisabled(), true);
      assert.equal(businessRequests(requests).length, before, '维护检查不能触发历史、任务或节点业务读取');
    }
    await closeDialog(page);
    // DOM属性虽可被修改，React仍按受控disabled prop抑制click；不会进入handler，也不应期待旧壳guard-toast。
    await page.locator('#sync-all').evaluate(button => { button.disabled = false; button.click(); });
    await settle(page);
    assert.equal(await page.locator('#sync-all').isEnabled(), true, '确实解除原生DOM禁用后再检验React事件保护');
    assert.equal(await page.locator('dialog').count(), 0);
    assert.equal(await page.locator('#sandbox-note').isVisible(), true, '绕过DOM属性不解除隔离状态');
    assert.equal(requests.filter(request => request.url.pathname.includes('sync-all')).length, 0);
    assert.equal(await page.locator('[data-delete-worker]').evaluateAll(buttons=>buttons.length>0&&buttons.every(button=>button.disabled)),true,'隔离副本禁用设备删除');
    await page.locator('[data-delete-worker]').first().evaluate(button=>{button.disabled=false;button.click();});
    assert.equal(requests.filter(request=>request.method==='DELETE').length,0,'绕过禁用控件也不能删除副本设备');
    assert.equal(requests.filter(request => request.url.pathname.includes('/temperature')).length, 1);
  });
});

test('正式环境无副本提示；真实管理入口在任何业务读取前将普通用户和监控展示员分别重定向', async () => {
  await withFixture({}, async fixture => {
    const {page, state, requests} = fixture;
    await dashboard(fixture); await settle(page);
    assert.equal(await page.locator('#sandbox-note').count(), 0);
    for (const [role, teamLeader, destination] of [['user', false, '/'], ['user', true, '/'], ['monitor', false, '/monitor']]) {
      state.user = {...session, role, team_leader:teamLeader};
      const before = requests.length;
      await page.goto(fixture.origin + '/controller');
      await page.waitForURL(fixture.origin + destination);
      assert.equal(await page.locator('#redirect-target').isVisible(), true, '落点只验证跳转，不启动目标页独立业务');
      assert.equal(await page.locator('#workspace-nav, #account .account-trigger').count(), 0, '未授权账号不能先挂载管理员工作区');
      assert.deepEqual(requests.slice(before).map(request => ({method:request.method, path:request.url.pathname})),
        [{method:'GET', path:'/api/auth/me'}], '角色检查前不得读取health、节点、任务、项目或启动presence，更不得写入业务');
    }
  });
});
