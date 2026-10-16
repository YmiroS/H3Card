// Requires Playwright; optionally set CHOUKA_TEST_BROWSER=msedge.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createServer } = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

test('recent jobs show their recorded mode separately from card names', async () => {
  const html = readFileSync(path.join(__dirname, '..', 'web', 'controller.html'));
  const base = {project:'project-1', cardName:'生视频', created:1789535317, progress:1};
  const jobs = [
    {...base, id:'high-quality', status:'done', capability:'minimax_h3_ref_2pass', name:'H3全能参考(高质量)'},
    {...base, id:'image-video', status:'running', capability:'minimax_h3_i2v', name:'H3图生视频', progress:0.5},
    {...base, id:'legacy-id', status:'queued', capability:'legacy_video_mode', progress:0},
    {...base, id:'legacy-unknown', status:'done'},
    {...base, id:'escaped-name', status:'error', name:'<img src=x onerror="window.injected=true">'},
  ];
  const payloads = {
    '/api/auth/me': {user:{id:'admin', username:'admin', role:'admin'}, csrf_token:'test-csrf'},
    '/api/health': {ok:true, mode:'controller', server_time:1789535400, started_at:1789535300},
    '/api/status': {running_count:1, queued_count:1},
    '/api/workers': {workers:[]},
    '/api/jobs': {jobs},
    '/api/projects': {projects:[{id:'project-1', name:'模式展示测试'}]},
  };
  const server = createServer((req, res) => {
    if (req.url === '/auth.js') {
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      return res.end(readFileSync(path.join(__dirname, '..', 'web', 'auth.js')));
    }
    if (Object.hasOwn(payloads, req.url)) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(payloads[req.url]));
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(html);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
    const page = await browser.newPage({viewport:{width:1440, height:1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port + '/controller');
    await page.waitForFunction(() => document.querySelectorAll('#job-rows tr').length === 5);
    assert.deepEqual(await page.locator('thead th').allTextContents(),
      ['状态', '项目 / 卡片', '模式', '过程进度', '执行端', '创建时间', '耗时 / 错误']);
    assert.deepEqual(await page.locator('#job-rows .job-mode').allTextContents(),
      ['H3全能参考(高质量)', 'H3图生视频', 'legacy_video_mode', '未记录', jobs[4].name]);
    assert.equal(await page.locator('#job-rows .job-mode').first().getAttribute('title'), 'minimax_h3_ref_2pass');
    assert.equal(await page.locator('#job-rows .job-origin').first().innerText(), '模式展示测试\n卡片 · 生视频');
    assert.equal(await page.locator('#job-rows tr').first().locator('td').count(), 7);
    assert.equal(await page.locator('#job-rows img').count(), 0);
    assert.equal(await page.evaluate(() => window.injected), undefined);
    jobs[0].cardName = '已改名的卡片';
    await page.locator('#refresh').click();
    await page.waitForFunction(() => document.querySelector('#job-rows .job-origin').textContent.includes('已改名的卡片'));
    assert.equal(await page.locator('#job-rows .job-mode').first().textContent(), 'H3全能参考(高质量)');
    if (process.env.CHOUKA_TEST_SCREENSHOT) {
      await page.screenshot({path:process.env.CHOUKA_TEST_SCREENSHOT, fullPage:true});
    }
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('H3 two-pass exposes a default-off stable switch and hides independent LoRA and TE', () => {
  const cap = JSON.parse(readFileSync(path.join(__dirname, '..', 'manifests', 'minimax_h3_ref_2pass.json'), 'utf8'));
  const spec = cap.inputs.find(input => input.key === 'stable_mode');
  assert.ok(spec, 'two-pass manifest must declare stable_mode');
  assert.equal(spec.type, 'select');
  assert.equal(spec.appearance, 'switch');
  assert.ok(!spec.mirror);
  assert.equal(spec.default, 'off');
  assert.deepEqual(spec.options, [{value:'on', label:'开启'}, {value:'off', label:'关闭'}]);
  assert.deepEqual(spec.presets, {
    on:{strength_model:0, processing_control_value:0},
    off:{strength_model:1, processing_control_value:0.12},
  }, 'must only change LoRA and TE, never steps');
  assert.equal(spec.target.kind, 'preset');
  assert.equal(spec.showHint, true);
  for (const key of ['strength_model', 'processing_control_value']) {
    assert.equal(cap.inputs.find(input => input.key === key).mirror, true);
  }
  assert.ok(!cap.inputs.some(input => input.key === 'lora_acceleration'));
  for (const word of ['LoRA', 'TE', '0.12', '稳定优先', '速度优先', '不保证']) assert.ok(spec.hint.includes(word));
});

test('H3 stable switch persists across reloads and supports keyboard with real payload mapping', {timeout:60000}, async () => {
  const root = path.join(__dirname, '..');
  const load = name => JSON.parse(readFileSync(path.join(root, 'manifests', name), 'utf8'));
  const cards = load('_cards.json');
  const capabilities = Object.fromEntries(require('node:fs').readdirSync(path.join(root, 'manifests'))
    .filter(name => name.endsWith('.json') && !name.startsWith('_'))
    .map(name => { const cap = load(name); return [cap.id, cap]; }));
  const cap = capabilities.minimax_h3_ref_2pass;
  const project = {
    id:'h3-acceleration-fixture', name:'H3 acceleration isolated regression', permission:'operate',
    rev:0, edges:[], groups:[], view:{x:80, y:70, k:1},
    cards:[
      {id:'two-pass', type:'card_video', cap:cap.id, x:60, y:20,
        params:{lora_acceleration:'off', strength_model:0, steps:27, processing_control_value:0.085, duration:7, seed:12345}, assets:{}, outputs:[]},
      {id:'normal-ref9', type:'card_video', cap:'minimax_h3_ref9', x:460, y:20,
        params:{}, assets:{}, outputs:[]},
    ],
  };
  const errors = [], unexpected = [], external = [], saved = [];
  const json = (res, value) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(value));
  };
  const files = {'/':'index.html', '/app.js':'app.js', '/auth.js':'auth.js',
    '/style.css':'style.css', '/icon.png':'icon.png', '/favicon.png':'favicon.png'};
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'GET') {
      if (url === '/api/auth/me') return json(res, {user:{id:'admin', username:'admin', role:'admin'}, csrf_token:'fixture-csrf'});
      if (url === '/api/cards') return json(res, {cards, capabilities, comfy_online:true});
      if (url === '/api/health') return json(res, {comfy_online:true});
      if (url === '/api/jobs') return json(res, {jobs:[]});
      if (url === '/api/projects') return json(res, {projects:[{...project, cards:project.cards.length}]});
      if (url === '/api/projects/' + project.id) return json(res, project);
      if (url === '/api/projects/' + project.id + '/presence') { res.writeHead(426); return res.end(); }
      if (Object.hasOwn(files, url)) {
        const name = files[url];
        res.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript; charset=utf-8'
          : name.endsWith('.css') ? 'text/css' : name.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8');
        return res.end(readFileSync(path.join(root, 'web', name)));
      }
    }
    if (req.method === 'POST' && url === '/api/auth/presence') {
      req.resume(); return json(res, {online_users:1});
    }
    if (req.method === 'PUT' && url === '/api/projects/' + project.id) {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        saved.push(payload);
        Object.assign(project, payload, {rev:project.rev + 1});
        json(res, {rev:project.rev});
      });
      return;
    }
    if (req.method === 'PUT' && url === '/api/projects/' + project.id + '/view') {
      req.resume(); return json(res, {ok:true});
    }
    // In particular, /api/generate is never forwarded to any real backend.
    unexpected.push(req.method + ' ' + req.url);
    req.resume(); res.writeHead(404); res.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
    const context = await browser.newContext({viewport:{width:1600, height:1100}, serviceWorkers:'block'});
    const origin = 'http://127.0.0.1:' + server.address().port;
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      external.push(route.request().url()); return route.abort();
    });
    await context.routeWebSocket('**/*', socket => {
      if (new URL(socket.url()).host !== new URL(origin).host) external.push(socket.url());
      socket.close();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const paramsButton = page.locator('#panel .foot button[title^="点开弹窗"]');
    const popup = page.locator('#respop');
    const payload = () => page.evaluate(() => payloadOf(PROJ.cards.find(card => card.id === 'two-pass')));
    const stored = () => page.evaluate(() => PROJ.cards.find(card => card.id === 'two-pass').params);
    const saveResponse = value => page.waitForResponse(response => {
      if (response.url() !== origin + '/api/projects/' + project.id || response.request().method() !== 'PUT') return false;
      return response.request().postDataJSON().cards.find(card => card.id === 'two-pass').params.stable_mode === value;
    });
    await page.goto(origin + '/?project=' + project.id);
    await page.locator('#world .card[data-id="two-pass"] .ch .t').click();
    assert.equal(await page.locator('#panel').isVisible(), true, 'real card click opens parameter panel');
    await paramsButton.click();
    assert.equal(await popup.isVisible(), true, 'real bottom parameter button opens the existing popup');
    const spec = cap.inputs.find(input => input.key === 'stable_mode');
    const row = popup.locator('.row').filter({has:page.getByText(spec.label, {exact:true})});
    const toggle = row.getByRole('switch', {name:spec.label, exact:true});
    assert.equal(await toggle.isVisible(), true, 'stable mode uses the existing switch control');
    assert.equal(await toggle.evaluate(element => element.tagName), 'BUTTON');
    assert.equal(await toggle.getAttribute('aria-checked'), 'false', 'stable mode defaults off');
    assert.equal(await toggle.textContent(), '关闭');
    async function checkAppearance(enabled) {
      await page.waitForFunction(({id, enabled}) => {
        const button = document.getElementById(id);
        const track = button.querySelector('.param-switch-track').getBoundingClientRect();
        const thumb = button.querySelector('.param-switch-thumb').getBoundingClientRect();
        return Math.abs(thumb.left - track.left - (enabled ? 22 : 2)) < 0.1;
      }, {id:await toggle.getAttribute('id'), enabled});
      const bounds = await toggle.boundingBox();
      assert.ok(bounds.width >= 44 && bounds.height >= 44, 'switch has a 44px minimum hit area');
      const shape = await toggle.locator('.param-switch-track').evaluate(element => {
        const style = getComputedStyle(element);
        return {radius:parseFloat(style.borderRadius), height:element.getBoundingClientRect().height};
      });
      assert.ok(shape.radius >= shape.height / 2, 'track is a rounded iPhone-style pill');
    }
    await checkAppearance(false);
    const offColor = await toggle.locator('.param-switch-track').evaluate(element => getComputedStyle(element).backgroundColor);
    await popup.screenshot({path:path.resolve(root, '..', 'temp', 'chouka-h3-stable-mode-off.png')});
    assert.equal(await row.locator('.knobnote').isVisible(), true, 'trade-off is visible without hovering');
    assert.equal(await row.locator('.knobnote').textContent(), spec.hint);
    assert.equal(await toggle.getAttribute('aria-describedby'), await row.locator('.knobnote').getAttribute('id'));
    assert.equal(await popup.getByRole('switch').count(), 1);
    for (const label of ['加速模型强度', 'TE 缓存加速', 'LoRA 加速']) {
      assert.equal(await page.locator('#panel .row, #respop .row')
        .filter({has:page.getByText(label, {exact:true})}).count(), 0, 'independent controls are absent');
    }
    const baseline = await payload();
    const originalParams = await stored();
    assert.equal(originalParams.strength_model, 0, 'fixture retains stale raw values');
    assert.equal(baseline.params.stable_mode, 'off');
    assert.equal(baseline.params.lora_acceleration, undefined, 'removed legacy preset cannot compete');
    assert.equal(baseline.params.strength_model, 1);
    assert.equal(baseline.params.processing_control_value, 0.12);
    assert.equal(baseline.params.steps, 27);
    assert.equal(baseline.params.duration, 7);
    assert.equal(baseline.params.seed, 12345);
    async function check(value) {
      const enabled = value === 'on';
      assert.equal(await toggle.getAttribute('aria-checked'), String(enabled));
      assert.equal(await toggle.textContent(), enabled ? '开启' : '关闭');
      await checkAppearance(enabled);
      const color = await toggle.locator('.param-switch-track').evaluate(element => getComputedStyle(element).backgroundColor);
      assert.equal(color === offColor, !enabled, 'enabled track changes color as the thumb moves right');
      assert.deepEqual(await stored(), {...originalParams, stable_mode:value}, 'only the mode is saved on the card');
      assert.deepEqual(await payload(), {...baseline,
        params:{...baseline.params, stable_mode:value,
          strength_model:enabled ? 0 : 1, processing_control_value:enabled ? 0 : 0.12}},
      'both effective values change; steps, seed, duration and every unrelated parameter stay unchanged');
    }
    let saving = saveResponse('on');
    await toggle.click();
    await check('on');
    assert.equal((await saving).status(), 200, 'mode persists through the isolated save API');
    assert.equal(saved.at(-1).cards.find(card => card.id === 'two-pass').params.stable_mode, 'on');
    await popup.locator('.x').click();
    assert.equal(await popup.isVisible(), false);
    await paramsButton.click();
    await check('on');
    await page.screenshot({path:path.resolve(root, '..', 'temp', 'chouka-h3-stable-mode.png'), fullPage:true});
    await page.reload();
    await page.locator('#world .card[data-id="two-pass"] .ch .t').click();
    await paramsButton.click();
    await check('on');
    saving = saveResponse('off');
    await toggle.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await toggle.evaluate(element => element === document.activeElement
      && getComputedStyle(element).outlineStyle !== 'none'), true, 'keyboard focus is visible');
    await page.keyboard.press('Space');
    await check('off');
    assert.equal((await saving).status(), 200, 'Space toggles and saves the switch');
    saving = saveResponse('on');
    await page.keyboard.press('Enter');
    await check('on');
    await saving;
    saving = saveResponse('off');
    await page.keyboard.press('Space');
    await check('off');
    await saving;
    await page.reload();
    await page.locator('#world .card[data-id="two-pass"] .ch .t').click();
    await paramsButton.click();
    await check('off');
    await page.emulateMedia({reducedMotion:'reduce'});
    for (const selector of ['.param-switch-track', '.param-switch-thumb']) {
      assert.equal(await toggle.locator(selector).evaluate(element => getComputedStyle(element).transitionDuration), '0s');
    }
    saving = saveResponse('on');
    await toggle.click();
    await check('on');
    await saving;
    saving = saveResponse('off');
    await toggle.click();
    await check('off');
    await saving;
    await page.evaluate(() => {
      const card = PROJ.cards.find(item => item.id === 'two-pass');
      delete card.params.stable_mode;
      openResPop(card, document.querySelector('#panel .foot button[title^="点开弹窗"]'));
    });
    assert.equal(await toggle.getAttribute('aria-checked'), 'false', 'missing mode uses default off');
    assert.equal((await payload()).params.strength_model, 1);
    assert.equal((await payload()).params.processing_control_value, 0.12);
    await popup.locator('.x').click();
    await page.locator('#world .card[data-id="normal-ref9"] .ch .t').click();
    await paramsButton.click();
    assert.equal(await popup.isVisible(), true);
    assert.equal(await popup.getByRole('switch').count(), 0, 'ordinary ref9 does not gain the two-pass switch');
    assert.equal(await popup.getByText(spec.label, {exact:true}).count(), 0);
    assert.deepEqual(errors, [], 'no browser JavaScript or console errors');
    assert.deepEqual(unexpected, [], 'no unexpected APIs or real generation');
    assert.deepEqual(external, [], 'HTTP and WebSocket traffic cannot leave the isolated fixture');
  } finally {
    try { if (browser) await browser.close(); }
    finally {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  }
});
