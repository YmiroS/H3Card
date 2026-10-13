// Run from Git Bash without installing packages:
// NODE_PATH=E:/ComfyUI_Mie_V33/temp/chouka-preview-test/node_modules CHOUKA_TEST_BROWSER=msedge node --test E:/ComfyUI_Mie_V33/chouka/tests/test_alphagen.cjs
// Complete production UI + current manifests; all APIs/media are isolated in memory.
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
const alpha = capabilities.alphagen;
const tools = cards.find(card => card.id === 'card_tools');
const mediaTypes = ['image', 'audio', 'video'];
const numericKeys = ['shorter_size', 'frame_load_cap', 'skip_first_frames', 'noise_seed', 'cfg', 'strength_model'];
const presetKeys = ['enhance_prompt', 'tiled_encode'];
const specOf = key => alpha.inputs.find(spec => spec.key === key);
const video = {
  kind:'video', ref:'alphagen-fixture-source.mp4', url:'/fixture/source.mp4',
  origin:'alphagen-fixture-source.mp4', frames:241, fps:24, duration:241 / 24,
  width:1920, height:1080,
};
const project = {
  id:'alphagen-browser-fixture', name:'AlphaGen isolated regression',
  permission:'operate', locked:true, edges:[], groups:[], view:{x:100, y:70, k:1},
  cards:[{id:'tool-card', type:'card_tools', cap:tools.modes[0].id,
    x:100, y:20, params:{}, assets:{}, outputs:[]}],
};

// Expected payload uses the real manifest schema, but not production payload helpers.
function expectedParams(edits = {}) {
  const params = Object.fromEntries(alpha.inputs
    .filter(spec => !mediaTypes.includes(spec.type) && !spec.mirror && spec.default !== undefined)
    .map(spec => [spec.key, spec.default]));
  Object.assign(params, edits);
  for (const key of presetKeys) Object.assign(params, specOf(key).presets[params[key]]);
  return params;
}

test('AlphaGen toolbox mode, editable parameters and isolated submissions in complete UI', {timeout:90000}, async t => {
  assert.equal(alpha.id, 'alphagen');
  assert.equal(alpha.name, 'AlphaGen');
  assert.equal(alpha.kind, 'tool');
  assert.equal(alpha.outputType, 'video');
  assert.equal(alpha.compare, false);
  assert.deepEqual(Object.keys(alpha.output), ['node'], 'only one declared mask output');
  assert.deepEqual(tools.modes.filter(mode => mode.id === 'alphagen').map(mode => mode.name), ['AlphaGen']);
  assert.notEqual(project.cards[0].cap, 'alphagen', 'must enter AlphaGen through the real mode menu');
  assert.deepEqual(alpha.inputs.filter(spec => mediaTypes.includes(spec.type))
    .map(({key, type, required}) => ({key, type, required})),
    [{key:'video[0]', type:'video', required:true}]);
  assert.deepEqual(alpha.slotLimits, {
    image:{min:0, max:0}, audio:{min:0, max:0}, video:{min:1, max:1},
  });
  assert.deepEqual(numericKeys.map(key => specOf(key).default), [576, 241, 0, 42, 1, 1]);
  for (const key of presetKeys) {
    assert.equal(specOf(key).default, 'off');
    assert.deepEqual(specOf(key).options.map(option => option.value), ['off', 'on']);
  }

  const generated = [], unexpected = [], external = [], errors = [];
  let uploads = 0;
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
      if (url === '/api/projects') return json(res, {projects:[{...project, cards:1}]});
      if (url === '/api/projects/' + project.id) return json(res, project);
      // This fixture has no collaborators; decline its optional WebSocket handshake locally.
      if (url === '/api/projects/' + project.id + '/presence') { res.writeHead(426); return res.end(); }
      // No real video is read or downloaded: only metadata/ref are needed for this test.
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
        json(res, {id:'alphagen-fixture-job-' + generated.length, status:'done', seed:42});
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
    // Fail closed: never forward a browser request to the real backend or Internet.
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
    const select = key => row(key).locator('select');
    async function submit(edits = {}) {
      const before = generated.length;
      const response = page.waitForResponse(r => r.url() === origin + '/api/generate' && r.request().method() === 'POST');
      await page.locator('#panel .go').click();
      assert.equal((await response).status(), 200);
      await page.waitForFunction(() => PROJ.cards[0].status === 'done');
      assert.equal(generated.length, before + 1);
      const payload = generated.at(-1);
      assert.equal(payload.capability, 'alphagen');
      assert.equal(payload.project, project.id);
      assert.equal(payload.card, 'tool-card');
      assert.deepEqual(payload.assets, {'video[0]':video.ref});
      assert.deepEqual(payload.params, expectedParams(edits));
      return payload;
    }

    await page.goto(origin);
    const card = page.locator('#world .card[data-id="tool-card"]');
    await card.locator('.ch .t').click();
    assert.equal(await page.locator('#panel').isVisible(), true);
    assert.equal(await page.locator('#panel > .modes').count(), 0, 'toolbox modes belong in the bottom bar');
    await modeButton.click();
    await page.locator('#menu button').filter({has:page.getByText('AlphaGen', {exact:true})}).click();
    await page.waitForFunction(() => PROJ.cards[0].cap === 'alphagen');
    assert.match(await modeButton.innerText(), /AlphaGen/);
    assert.match(await card.locator('.ch .t').innerText(), /AlphaGen/);
    assert.match(await page.locator('#panel .foot').innerText(), /输出：视频/);
    assert.equal(await page.locator('#panel .refhead').innerText(), '引用上限：视频 1');
    assert.equal(await page.locator('#panel .refadd').count(), 1);
    assert.match(await page.locator('#panel .refadd').innerText(), /添加视频（0\/1）/);
    assert.equal(await page.locator('#panel .refadd').filter({hasText:/图片|音频/}).count(), 0);

    await t.test('real parameter button exposes all defaults and hides internal preset mirrors', async () => {
      await paramsButton.click();
      assert.equal(await page.locator('#respop').isVisible(), true);
      assert.equal(await page.locator('#respop .row').count(), numericKeys.length + presetKeys.length);
      for (const key of numericKeys) {
        await number(key).scrollIntoViewIfNeeded();
        assert.equal(await number(key).isVisible(), true, key + ' visible');
        assert.equal(await number(key).isEditable(), true, key + ' editable');
        assert.equal(await number(key).inputValue(), String(specOf(key).default), key + ' default');
        if (specOf(key).type === 'slider') {
          assert.deepEqual(await number(key).evaluate(input => [input.min, input.max, input.step]),
            ['min', 'max', 'step'].map(name => String(specOf(key)[name])));
        }
      }
      for (const key of presetKeys) {
        await select(key).scrollIntoViewIfNeeded();
        assert.equal(await select(key).isVisible(), true);
        assert.equal(await select(key).isEnabled(), true);
        assert.equal(await select(key).inputValue(), 'off');
        assert.deepEqual(await select(key).locator('option').evaluateAll(options => options.map(o => o.value)), ['off', 'on']);
      }
      for (const key of ['enhance_enabled', 'use_tiled_encode']) assert.equal(await row(key).count(), 0);
      assert.equal(await row('frame_load_cap').locator('.paramwarn').isVisible(), true);
      await page.locator('#respop .x').click();
    });

    await t.test('video-only file chooser accepts one fixture ref and default payload is exact', async () => {
      const chooserReady = page.waitForEvent('filechooser');
      await page.locator('#panel .refadd').click();
      const chooser = await chooserReady;
      assert.equal(await chooser.element().getAttribute('accept'), 'video/*');
      assert.equal(chooser.isMultiple(), false);
      // Bytes are sent only to the in-memory upload stub; no actual video decode is needed.
      await chooser.setFiles({name:video.origin, mimeType:'video/mp4', buffer:Buffer.from('isolated video fixture')});
      await page.waitForFunction(ref => PROJ.cards[0].assets['video[0]']?.ref === ref, video.ref);
      assert.equal(uploads, 1);
      assert.equal(await page.locator('#panel .slot.filled').count(), 1);
      const slot = page.locator('#panel .slot[data-key="video[0]"]');
      assert.equal(await slot.isVisible(), true);
      assert.match(await slot.getAttribute('title'), /必填/);
      assert.equal(await slot.locator('video').count(), 1);
      assert.equal(await page.locator('#panel .slots img, #panel .slots audio').count(), 0);
      assert.equal(await page.locator('#panel .refadd').count(), 0, 'one video fills the only input');
      const payload = await submit();
      assert.equal(payload.params.noise_seed, 42, 'fixed AlphaGen seed must not become random -1');
      assert.equal(payload.params.enhance_enabled, false);
      assert.equal(payload.params.use_tiled_encode, false);
    });

    const edits = {shorter_size:768, frame_load_cap:121, skip_first_frames:8, noise_seed:12345,
      cfg:1.2, strength_model:0.75, enhance_prompt:'on', tiled_encode:'on',
      prompt:'保留前景人物，生成遮罩', negative_prompt:'不要背景残留'};
    await t.test('every numeric control edits, persists after reopening, and submits with presets on', async () => {
      await paramsButton.click();
      assert.equal(await page.locator('#respop').isVisible(), true);
      for (const key of numericKeys) {
        await number(key).fill(String(edits[key]));
        assert.equal(await number(key).inputValue(), String(edits[key]));
        if (specOf(key).type === 'slider') {
          assert.equal(await row(key).locator('input[type="range"]').inputValue(), String(edits[key]));
        }
      }
      assert.equal(await row('frame_load_cap').locator('.paramwarn').isVisible(), false);
      for (const key of presetKeys) await select(key).selectOption('on');
      await page.locator('#respop .x').click();
      for (const key of ['prompt', 'negative_prompt']) {
        await page.locator('#panel .pblock').filter({hasText:specOf(key).label}).locator('textarea').fill(edits[key]);
      }
      await paramsButton.click();
      for (const key of numericKeys) assert.equal(await number(key).inputValue(), String(edits[key]), key + ' persists');
      for (const key of presetKeys) assert.equal(await select(key).inputValue(), 'on');
      await page.locator('#respop .x').click();
      const payload = await submit(edits);
      assert.equal(payload.params.enhance_enabled, true);
      assert.equal(payload.params.use_tiled_encode, true);
    });

    await t.test('preset toggles independently clear booleans without leaking hidden assets or parameters', async () => {
      // Stale values simulate a reused toolbox card. All tested parameter changes above used real controls.
      await page.evaluate(() => {
        const c = PROJ.cards[0];
        c.assets['images[0]'] = {kind:'image', ref:'must-not-submit.png'};
        c.assets['audio[0]'] = {kind:'audio', ref:'must-not-submit.wav'};
        c.assets['video[1]'] = {kind:'video', ref:'must-not-submit.mp4'};
        Object.assign(c.params, {enhance_enabled:true, use_tiled_encode:true, width:4096, seed:-1});
      });
      await paramsButton.click();
      await select('enhance_prompt').selectOption('off');
      await page.locator('#respop .x').click();
      let payload = await submit({...edits, enhance_prompt:'off'});
      assert.equal(payload.params.enhance_enabled, false);
      assert.equal(payload.params.use_tiled_encode, true);
      await paramsButton.click();
      await select('tiled_encode').selectOption('off');
      await page.locator('#respop .x').click();
      payload = await submit({...edits, enhance_prompt:'off', tiled_encode:'off'});
      assert.equal(payload.params.enhance_enabled, false);
      assert.equal(payload.params.use_tiled_encode, false);
      assert.equal(await page.locator('#panel .slot.filled').count(), 1);
      assert.equal(await page.locator('#panel .refadd').count(), 0);
    });

    await t.test('canvas Ctrl+Z and Mac Cmd+Z undo; redo restores parameter, move and deletion', async () => {
      await paramsButton.click();
      await number('shorter_size').fill('640');
      await page.locator('#respop .x').click();
      await card.locator('.ch .t').click();
      await page.keyboard.press('Control+z');
      assert.equal(await page.evaluate(() => PROJ.cards[0].params.shorter_size), 768);
      await page.keyboard.press('Control+Shift+z');
      assert.equal(await page.evaluate(() => PROJ.cards[0].params.shorter_size), 640);
      await page.evaluate(() => Object.defineProperty(navigator, 'platform', {configurable:true, value:'MacIntel'}));
      await page.keyboard.press('Control+z');
      assert.equal(await page.evaluate(() => PROJ.cards[0].params.shorter_size), 640);
      await page.keyboard.press('Meta+z');
      assert.equal(await page.evaluate(() => PROJ.cards[0].params.shorter_size), 768);
      await page.keyboard.press('Meta+Shift+z');
      assert.equal(await page.evaluate(() => PROJ.cards[0].params.shorter_size), 640);
      await page.evaluate(() => Object.defineProperty(navigator, 'platform', {configurable:true, value:'Win32'}));
      const before = await page.evaluate(() => [PROJ.cards[0].x, PROJ.cards[0].y]);
      const title = await card.locator('.ch .t').boundingBox();
      await page.mouse.move(title.x + title.width / 2, title.y + title.height / 2);
      await page.mouse.down();
      await page.mouse.move(title.x + title.width / 2 + 80, title.y + title.height / 2 + 40, {steps:4});
      await page.mouse.up();
      assert.notDeepEqual(await page.evaluate(() => [PROJ.cards[0].x, PROJ.cards[0].y]), before);
      await page.keyboard.press('Control+z');
      assert.deepEqual(await page.evaluate(() => [PROJ.cards[0].x, PROJ.cards[0].y]), before);
      page.once('dialog', dialog => void dialog.accept());
      await card.locator('.ch .x').click();
      assert.equal(await page.locator('#world .card').count(), 0);
      await page.keyboard.press('Control+z');
      assert.equal(await page.locator('#world .card').count(), 1);
      await page.keyboard.press('Control+Shift+z');
      assert.equal(await page.locator('#world .card').count(), 0);
    });

    assert.equal(generated.length, 4);
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
