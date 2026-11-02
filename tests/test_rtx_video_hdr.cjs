// Complete production UI and current manifests; all APIs/media stay in memory.
// CHOUKA_TEST_BROWSER=msedge npm run test:web -- test_rtx_video_hdr.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const { createServer } = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const manifest = name => JSON.parse(readFileSync(path.join(root, 'manifests', name), 'utf8'));
const cards = manifest('_cards.json');
const capabilities = Object.fromEntries(readdirSync(path.join(root, 'manifests'))
  .filter(name => name.endsWith('.json') && !name.startsWith('_'))
  .map(name => { const cap = manifest(name); return [cap.id, cap]; }));
const hdr = capabilities.rtx_video_hdr;
const tools = cards.find(card => card.id === 'card_tools');
const numericKeys = ['contrast', 'saturation', 'middle_gray', 'luminance'];
const specOf = key => hdr.inputs.find(spec => spec.key === key);
const defaults = {contrast:100, saturation:100, middle_gray:50, luminance:650};
const video = {
  kind:'video', ref:'hdr-fixture-source.mp4', url:'/fixture/source.mp4',
  origin:'hdr-fixture-source.mp4', frames:48, fps:24, duration:2, width:1920, height:1080,
};
const project = {
  id:'hdr-browser-fixture', name:'HDR isolated regression',
  permission:'operate', locked:true, edges:[], groups:[], view:{x:100, y:70, k:1},
  cards:[{id:'tool-card', type:'card_tools', cap:tools.modes[0].id,
    x:100, y:20, params:{}, assets:{}, outputs:[]}],
};

// Independent expectations: do not reuse production payload/preset helpers.
function expectedParams(edits = {}, mode = 'on') {
  return {...defaults, ...edits, debanding_mode:mode, debanding:mode === 'on'};
}

test('HDR toolbox mode, real controls and isolated video submissions in complete UI', {timeout:90000}, async t => {
  assert.equal(hdr.id, 'rtx_video_hdr');
  assert.equal(hdr.name, 'HDR增强');
  assert.equal(hdr.kind, 'tool');
  assert.equal(hdr.card, 'card_tools');
  assert.equal(hdr.outputType, 'video');
  assert.deepEqual(tools.modes.filter(mode => mode.id === hdr.id).map(mode => mode.name), ['HDR增强']);
  assert.notEqual(project.cards[0].cap, hdr.id, 'enter HDR through the real bottom mode menu');
  assert.deepEqual(hdr.inputs.filter(spec => ['image', 'audio', 'video'].includes(spec.type))
    .map(({key, type, required}) => ({key, type, required})),
  [{key:'video[0]', type:'video', required:true}]);
  assert.deepEqual(hdr.slotLimits, {
    image:{min:0, max:0}, audio:{min:0, max:0}, video:{min:1, max:1},
  });
  assert.deepEqual(numericKeys.map(key => specOf(key).default), Object.values(defaults));
  assert.equal(specOf('debanding_mode').appearance, 'switch');
  assert.equal(specOf('debanding_mode').default, 'on');
  assert.equal(specOf('debanding').mirror, true);

  const generated = [], unexpected = [], external = [], errors = [];
  let uploads = 0;
  const json = (res, value) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(value));
  };
  // Explicit production asset allowlist, shared with the other isolated UI tests.
  const files = {...require('./helpers/frontend-static.cjs').canvasFiles,
    '/':'index.html', '/app.js':'app.js', '/auth.js':'auth.js',
    '/style.css':'style.css', '/icon.png':'icon.png', '/favicon.png':'favicon.png'};
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost').pathname;
    if (url === '/api/auth/presence' && req.method === 'POST') {
      req.resume(); return json(res, {online_users:1});
    }
    if (req.method === 'GET') {
      if (url === '/api/auth/me') return json(res, {user:{id:'admin', username:'admin', role:'admin'}, csrf_token:'fixture-csrf'});
      if (url === '/api/cards') return json(res, {cards, capabilities, comfy_online:true});
      if (url === '/api/health') return json(res, {comfy_online:true});
      if (url === '/api/jobs') return json(res, {jobs:[]});
      if (url === '/api/projects') return json(res, {projects:[{...project, cards:1}]});
      if (url === '/api/projects/' + project.id) return json(res, project);
      // Decline the optional collaboration WebSocket locally, like test_alphagen.cjs.
      if (url === '/api/projects/' + project.id + '/presence') { res.writeHead(426); return res.end(); }
      // Metadata/ref suffice: no video file is read, decoded or downloaded.
      if (url === video.url) { res.writeHead(204); return res.end(); }
      if (Object.hasOwn(files, url)) {
        const name = files[url];
        res.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript; charset=utf-8'
          : name.endsWith('.css') ? 'text/css' : name.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8');
        return res.end(readFileSync(path.join(root, 'web', name)));
      }
    }
    if (url === '/api/upload' && req.method === 'POST') {
      req.resume(); uploads++;
      return json(res, {files:[video]});
    }
    if (url === '/api/generate' && req.method === 'POST') {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        generated.push(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        json(res, {id:'hdr-fixture-job-' + generated.length, status:'done'});
      });
      return;
    }
    unexpected.push(req.method + ' ' + req.url);
    req.resume(); res.writeHead(404); res.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({channel:process.env.CHOUKA_TEST_BROWSER || 'msedge'});
    const context = await browser.newContext({viewport:{width:1600, height:1100}, serviceWorkers:'block'});
    const origin = 'http://127.0.0.1:' + server.address().port;
    // Fail closed: requests cannot reach the real controller or the Internet.
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      external.push(route.request().url());
      return route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    const modeButton = page.locator('#panel .foot button[title="工具箱模式 —— 点击换"]');
    const paramsButton = page.locator('#panel .foot button[title^="点开弹窗"]');
    const row = key => page.locator('#respop .row').filter({has:page.getByText(specOf(key).label, {exact:true})});
    const number = key => row(key).locator('input[type="number"]');
    const slider = key => row(key).getByRole('slider');
    const toggle = page.locator('#respop').getByRole('switch', {name:'去色带', exact:true});
    async function assertControls(values, enabled) {
      for (const key of numericKeys) {
        assert.equal(await number(key).inputValue(), String(values[key]), key + ' number persists');
        assert.equal(await slider(key).inputValue(), String(values[key]), key + ' slider stays in sync');
      }
      assert.equal(await toggle.getAttribute('aria-checked'), String(enabled));
    }
    async function submit(edits = {}, mode = 'on') {
      const before = generated.length;
      const response = page.waitForResponse(r => r.url() === origin + '/api/generate' && r.request().method() === 'POST');
      await page.locator('#panel .go').click();
      assert.equal((await response).status(), 200);
      await page.waitForFunction(() => PROJ.cards[0].status === 'done');
      assert.equal(generated.length, before + 1);
      const payload = generated.at(-1);
      assert.equal(payload.capability, 'rtx_video_hdr');
      assert.equal(payload.project, project.id);
      assert.equal(payload.card, 'tool-card');
      assert.deepEqual(payload.assets, {'video[0]':video.ref}, 'only the single source video is submitted');
      assert.deepEqual(payload.params, expectedParams(edits, mode));
      return payload;
    }

    await page.goto(origin);
    const card = page.locator('#world .card[data-id="tool-card"]');
    await card.locator('.ch .t').click();
    assert.equal(await page.locator('#panel').isVisible(), true);
    assert.equal(await page.locator('#panel > .modes').count(), 0, 'toolbox modes belong in the bottom bar');
    await modeButton.click();
    await page.locator('#menu button').filter({has:page.getByText('HDR增强', {exact:true})}).click();
    await page.waitForFunction(() => PROJ.cards[0].cap === 'rtx_video_hdr');
    assert.match(await modeButton.innerText(), /HDR增强/);
    assert.match(await card.locator('.ch .t').innerText(), /HDR增强/);
    assert.match(await page.locator('#panel .foot').innerText(), /输出：视频/);
    assert.equal(await page.locator('#panel .refhead').innerText(), '引用上限：视频 1');
    assert.equal(await page.locator('#panel .refadd').count(), 1);
    assert.match(await page.locator('#panel .refadd').innerText(), /添加视频（0\/1）/);
    assert.equal(await page.locator('#panel .refadd').filter({hasText:/图片|音频/}).count(), 0);

    await t.test('parameter button exposes four default sliders and one on switch, not the mirror', async () => {
      await paramsButton.click();
      assert.equal(await page.locator('#respop').isVisible(), true);
      assert.equal(await page.locator('#respop .row').count(), 5);
      assert.equal(await page.locator('#respop').getByRole('slider').count(), 4);
      assert.equal(await page.locator('#respop').getByRole('switch').count(), 1);
      for (const key of numericKeys) {
        assert.equal(specOf(key).type, 'slider');
        assert.equal(await slider(key).isVisible(), true, key + ' slider visible');
        assert.equal(await slider(key).isEnabled(), true, key + ' slider enabled');
        assert.equal(await number(key).isEditable(), true, key + ' number editable');
        for (const control of [slider(key), number(key)]) {
          assert.deepEqual(await control.evaluate(input => [input.min, input.max, input.step]),
            ['min', 'max', 'step'].map(name => String(specOf(key)[name])));
        }
      }
      assert.equal(await toggle.isVisible(), true);
      assert.equal(await toggle.isEnabled(), true);
      assert.equal(await toggle.locator('.param-switch-track .param-switch-thumb').isVisible(), true);
      assert.equal(await row('debanding_mode').locator('select').count(), 0, 'use a switch, not a select');
      assert.equal(await row('debanding').count(), 0, 'hidden mirror must have no row');
      assert.equal(await page.locator('#panel, #respop').getByText('去色带开关', {exact:true}).count(), 0);
      await assertControls(defaults, true);
      await page.locator('#respop .x').click();
    });

    await t.test('single video chooser fills the only required slot and submits exact defaults', async () => {
      const chooserReady = page.waitForEvent('filechooser');
      await page.locator('#panel .refadd').click();
      const chooser = await chooserReady;
      assert.equal(await chooser.element().getAttribute('accept'), 'video/*');
      assert.equal(chooser.isMultiple(), false);
      // Synthetic bytes go only to the in-memory upload endpoint.
      await chooser.setFiles({name:video.origin, mimeType:'video/mp4', buffer:Buffer.from('isolated HDR video fixture')});
      await page.waitForFunction(ref => PROJ.cards[0].assets['video[0]']?.ref === ref, video.ref);
      assert.equal(uploads, 1);
      assert.equal(await page.locator('#panel .slot.filled').count(), 1);
      const slot = page.locator('#panel .slot[data-key="video[0]"]');
      assert.equal(await slot.isVisible(), true);
      assert.match(await slot.getAttribute('title'), /必填/);
      assert.equal(await slot.locator('video').count(), 1);
      assert.equal(await page.locator('#panel .slots img, #panel .slots audio').count(), 0);
      assert.equal(await page.locator('#panel .refadd').count(), 0, 'no second video or other media input');
      assert.equal((await submit()).params.debanding, true);
    });

    const edits = {contrast:125, saturation:80, middle_gray:51, luminance:651};
    await t.test('all four real controls change, persist on reopen, and submit with debanding off', async () => {
      await paramsButton.click();
      for (const key of ['contrast', 'saturation']) await number(key).fill(String(edits[key]));
      // Exercise actual range keyboard input as well as its paired numeric input.
      for (const key of ['middle_gray', 'luminance']) {
        await slider(key).focus();
        await slider(key).press('ArrowRight');
      }
      await toggle.click();
      await assertControls(edits, false);
      await page.locator('#respop .x').click();
      await paramsButton.click();
      await assertControls(edits, false);
      await page.locator('#respop .x').click();
      assert.equal((await submit(edits, 'off')).params.debanding, false);
    });

    await t.test('switching debanding back on preserves edited sliders and restores boolean payload', async () => {
      await paramsButton.click();
      await assertControls(edits, false);
      await toggle.click();
      await assertControls(edits, true);
      await page.locator('#respop .x').click();
      await paramsButton.click();
      await assertControls(edits, true);
      assert.equal(await row('debanding').count(), 0);
      await page.locator('#respop .x').click();
      assert.equal((await submit(edits)).params.debanding, true);
    });

    assert.equal(generated.length, 3);
    assert.equal(uploads, 1);
    assert.deepEqual(errors, [], 'no browser JavaScript exceptions');
    assert.deepEqual(unexpected, [], 'no unexpected APIs, saves or real-project requests');
    assert.deepEqual(external, [], 'no requests escaped the isolated origin');
  } finally {
    try { if (browser) await browser.close(); }
    finally {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  }
});
