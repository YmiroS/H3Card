// Requires Playwright; optionally set CHOUKA_TEST_BROWSER=msedge.
// Serve the complete production UI with isolated API fixtures; never touch real projects/GPU jobs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createServer } = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const qwenId = 'qwen_image_edit_2511_i2i';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const capabilities = Object.fromEntries(['zimage_t2i', 'zimage_i2i', 'krea2_t2i', 'krea2_i2i',
  'flux2_klein_storyboard9', 'flux2_klein_edit', qwenId].map(id =>
  [id, JSON.parse(readFileSync(path.join(root, 'manifests', id + '.json'), 'utf8'))]));
capabilities.no_switch = {id:'no_switch', name:'独立模式', outputType:'image', inputs:[]};
const cards = JSON.parse(readFileSync(path.join(root, 'manifests', '_cards.json'), 'utf8'))
  .filter(c => ['card_image', 'card_asset'].includes(c.id));
cards.find(c => c.id === 'card_image').modes.push({id:'no_switch', name:'独立模式'});
const project = {
  id:'model-test', name:'模型菜单回归', locked:true, edges:[], groups:[], view:{x:100, y:70, k:1},
  cards:[{id:'image-card', type:'card_image', cap:'zimage_i2i', x:100, y:20, params:{}, assets:{}, outputs:[]}],
};

test('image model menus, parameters and media limits in the complete UI', async (t) => {
  const generated = [], unexpected = [];
  let uploads = 0;
  const json = (res, value) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(value));
  };
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost').pathname;
    if (url === '/api/cards') return json(res, {cards, capabilities, comfy_online:true});
    if (url === '/api/reload') return json(res, {ok:true});
    if (url === '/api/health') return json(res, {comfy_online:true});
    if (url === '/api/jobs') return json(res, {jobs:[]});
    if (url === '/api/projects') return json(res, {projects:[{...project, cards:1}]});
    if (url === '/api/projects/model-test') return json(res, project);
    if (url === '/api/upload' && req.method === 'POST') {
      req.resume();
      const n = ++uploads;
      return json(res, {files:[{kind:'image', ref:`image-${n}.png`, url:'/fixture.png', origin:`image-${n}.png`}]});
    }
    if (url === '/api/generate' && req.method === 'POST') {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        generated.push(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        json(res, {id:'test-job-' + generated.length, status:'done', seed:42});
      });
      return;
    }
    if (url === '/fixture.png') { res.setHeader('Content-Type', 'image/png'); return res.end(png); }
    const files = {'/':'index.html', '/app.js':'app.js', '/style.css':'style.css', '/icon.png':'icon.png', '/favicon.png':'favicon.png'};
    if (Object.hasOwn(files, url)) {
      const name = files[url];
      res.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript; charset=utf-8'
        : name.endsWith('.css') ? 'text/css' : name.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8');
      return res.end(readFileSync(path.join(root, 'web', name)));
    }
    unexpected.push(req.method + ' ' + url);
    res.writeHead(404); res.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
    const page = await browser.newPage({viewport:{width:1600, height:1100}});
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const origin = 'http://127.0.0.1:' + server.address().port;
    const modelButton = page.locator('#panel button[title="生图模型 —— 点击换"]');
    const paramsButton = page.locator('#panel button[title^="点开弹窗"]');
    async function reset(cap = 'zimage_i2i', staleModel = 'krea2') {
      await page.goto(origin);
      await page.waitForFunction(() => PROJ && PROJ.cards[0]?._el);
      await page.evaluate(({cap, staleModel}) => {
        const c = PROJ.cards[0]; c.cap = cap; c._model = staleModel;
        paintTitle(c); pick(c.id);
      }, {cap, staleModel});
      assert.equal(await page.locator('#panel').isVisible(), true);
    }
    async function chooseModel(name) {
      await modelButton.click();
      await page.locator('#menu button').filter({hasText:name}).click();
    }
    async function chooseMode(name) {
      await page.locator('#panel button[title="生图模式 —— 点击换"]').click();
      await page.locator('#menu button').filter({hasText:name}).click();
    }
    async function submit() {
      const response = page.waitForResponse(r => r.url().endsWith('/api/generate'));
      await page.locator('#panel .go').click();
      await response;
      await page.waitForFunction(() => PROJ.cards[0].status === 'done');
      return generated.at(-1);
    }

    await t.test('menu derives current model from cap and enumerates only the current mode mapping', async () => {
      await reset();
      assert.match(await modelButton.innerText(), /^Z-Image/);
      await modelButton.click();
      assert.deepEqual(await page.locator('#menu button span:last-child').allTextContents(),
        ['Z-Image（当前）', 'Krea2', 'Qwen Image Edit 2511']);
      await page.locator('#menu button').filter({hasText:'Qwen Image Edit 2511'}).click();
      assert.equal(await page.evaluate(() => PROJ.cards[0].cap), qwenId);
      assert.match(await modelButton.innerText(), /^Qwen Image Edit 2511/);
      await page.evaluate(() => { PROJ.cards[0]._model = 'zimage'; openPanel(PROJ.cards[0].id); });
      await modelButton.click();
      assert.deepEqual(await page.locator('#menu button span:last-child').allTextContents(),
        ['Z-Image', 'Krea2', 'Qwen Image Edit 2511（当前）']);
      await page.locator('#menu button').filter({hasText:'Krea2'}).click();
      assert.equal(await page.evaluate(() => PROJ.cards[0].cap), 'krea2_i2i');
      await chooseModel('Z-Image');
      assert.equal(await page.evaluate(() => PROJ.cards[0].cap), 'zimage_i2i');
      // A capability without any _i2i suffix must work without changing frontend code.
      await page.evaluate(() => {
        CAPS.custom_edit = {...CAPS.zimage_i2i, id:'custom_edit'};
        modeOf(PROJ.cards[0]).modelSwitch.custom = 'custom_edit';
        openPanel(PROJ.cards[0].id);
      });
      await chooseModel('custom');
      assert.equal(await page.evaluate(() => PROJ.cards[0].cap), 'custom_edit');
      assert.match(await modelButton.innerText(), /^custom/);
    });

    await t.test('Qwen remains i2i-only; mode changes ignore stale model state; no mapping hides menu', async () => {
      await reset(qwenId, 'krea2');
      await chooseMode('文生图');
      assert.equal(await page.evaluate(() => PROJ.cards[0].cap), 'zimage_t2i');
      await modelButton.click();
      assert.deepEqual(await page.locator('#menu button span:last-child').allTextContents(), ['Z-Image（当前）', 'Krea2']);
      await page.locator('#menu button').filter({hasText:'Krea2'}).click();
      await page.evaluate(() => { PROJ.cards[0]._model = 'qwen2511'; });
      await chooseMode('图生图');
      assert.equal(await page.evaluate(() => PROJ.cards[0].cap), 'krea2_i2i');
      await chooseMode('独立模式');
      assert.equal(await modelButton.count(), 0);
    });

    await t.test('Qwen parameters are editable, summarized and sent through the real run button', async () => {
      await reset(qwenId);
      await paramsButton.click();
      assert.equal(await page.locator('#respop').isVisible(), true);
      const length = page.locator('#respop .cpick input[type="number"]');
      assert.equal(await length.inputValue(), '2048');
      assert.deepEqual(await length.evaluate(e => [e.min, e.max, e.step]), ['256', '4096', '8']);
      await length.fill('1536');
      assert.match(await paramsButton.innerText(), /1536px/);
      const steps = page.locator('#respop .row').filter({hasText:'采样步数'});
      await steps.locator('input[type="number"]').fill('12');
      assert.equal(await steps.locator('input[type="range"]').inputValue(), '12');
      assert.equal(await page.locator('#respop .row').count(), 1, 'advanced and seed controls stay hidden');
      await page.locator('#respop .x').click();
      await paramsButton.click();
      assert.equal(await length.inputValue(), '1536');
      assert.equal(await steps.locator('input[type="number"]').inputValue(), '12');
      await page.locator('#respop .x').click();
      const prompt = page.locator('#panel .pblock textarea').first();
      await prompt.fill('将三张参考图合成一幅画');
      // A real input is required by the capability; upload rather than invent card state.
      const chooser = page.waitForEvent('filechooser');
      await page.locator('#panel .refadd').click();
      await (await chooser).setFiles({name:'reference.png', mimeType:'image/png', buffer:png});
      await page.waitForFunction(() => !!PROJ.cards[0].assets['images[0]']);
      const payload = await submit();
      assert.equal(payload.capability, qwenId);
      assert.equal(payload.params.scale_to_length, 1536);
      assert.equal(payload.params.steps, 12);
      assert.equal(payload.params.prompt, '将三张参考图合成一幅画');
      assert.equal(payload.params.seed, -1);
      assert.deepEqual(Object.keys(payload.assets), ['images[0]']);
    });

    await t.test('three uploads fill Qwen; returning to each legacy model submits only its single image', async () => {
      await reset(qwenId);
      const before = uploads;
      const refs = [];
      for (let i = 0; i < 3; i++) {
        assert.match(await page.locator('#panel .refhead').innerText(), /图片 3/);
        assert.match(await page.locator('#panel .refadd').innerText(), new RegExp(i + '/3'));
        const chooser = page.waitForEvent('filechooser');
        await page.locator('#panel .refadd').click();
        await (await chooser).setFiles({name:`reference-${i}.png`, mimeType:'image/png', buffer:png});
        await page.waitForFunction(i => !!PROJ.cards[0].assets[`images[${i}]`], i);
        refs.push(`image-${before + i + 1}.png`);
        assert.equal(await page.locator('#panel .slot.filled').count(), i + 1);
      }
      assert.equal(uploads - before, 3);
      assert.equal(await page.locator('#panel .refadd').count(), 0);
      const assets = Object.fromEntries(refs.map((ref, i) => [`images[${i}]`, ref]));
      assert.deepEqual((await submit()).assets, assets);
      for (const [name, cap] of [['Z-Image', 'zimage_i2i'], ['Krea2', 'krea2_i2i']]) {
        await paramsButton.click();
        await chooseModel(name);
        assert.equal(await page.locator('#respop').isVisible(), false, 'model selection closes obsolete controls');
        assert.match(await page.locator('#panel .refhead').innerText(), /图片 1/);
        assert.equal(await page.locator('#panel .slot.filled').count(), 1);
        assert.equal(await page.locator('#panel .refadd').count(), 0);
        await paramsButton.click();
        assert.equal(await page.locator('#respop').isVisible(), true);
        if (cap === 'zimage_i2i') {
          const denoise = page.locator('#respop .row').filter({hasText:'重绘幅度'});
          await denoise.locator('input[type="number"]').fill('0.5');
        } else {
          await page.locator('#respop button[title^="画面比例 16:9"]').click();
        }
        await page.locator('#respop .x').click();
        const payload = await submit();
        assert.equal(payload.capability, cap);
        assert.deepEqual(payload.assets, {'images[0]':refs[0]});
        assert.equal(Object.hasOwn(payload.params, 'scale_to_length'), false);
        if (cap === 'zimage_i2i') assert.equal(payload.params.denoise, 0.5);
        else assert.ok(payload.params.width > payload.params.height);
        await chooseModel('Qwen Image Edit 2511');
        assert.equal(await page.locator('#panel .slot.filled').count(), 3, 'switching back restores references');
      }
      await chooseMode('文生图');
      assert.equal(await page.locator('#panel .slot').count(), 0);
      assert.deepEqual((await submit()).assets, {}, 't2i must not submit hidden i2i assets');
    });

    await t.test('upstream image references reject a fourth image and respect legacy single-image limits', async () => {
      await reset(qwenId);
      await page.evaluate(async () => {
        for (let i = 0; i < 4; i++) {
          const from = addCard('card_asset', 700, 20 + i * 100);
          from.outputs = [{kind:'image', ref:`linked-${i}.png`, url:'/fixture.png'}];
          await linkTo(from, PROJ.cards[0]);
        }
        pick(PROJ.cards[0].id);
      });
      assert.equal(await page.evaluate(() => PROJ.edges.length), 3);
      assert.equal(await page.locator('#panel .slot.filled').count(), 3);
      assert.match(await page.locator('#toast').innerText(), /图片引用已达上限 3/);
      await chooseModel('Z-Image');
      await page.evaluate(() => linkTo(PROJ.cards.at(-1), PROJ.cards[0]));
      assert.equal(await page.evaluate(() => PROJ.edges.length), 3);
      assert.match(await page.locator('#toast').innerText(), /图片引用已达上限 1/);
      assert.deepEqual((await submit()).assets, {'images[0]':'linked-0.png'});
    });

    await t.test('legacy text-to-image automatically switches on incoming image, retaining its model', async () => {
      for (const model of ['zimage', 'krea2']) {
        await reset(model + '_t2i', 'qwen2511');
        await page.evaluate(async () => {
          const from = addCard('card_asset', 700, 20);
          from.outputs = [{kind:'image', ref:'legacy.png', url:'/fixture.png'}];
          await linkTo(from, PROJ.cards[0]);
          pick(PROJ.cards[0].id);
        });
        assert.equal(await page.evaluate(() => PROJ.cards[0].cap), model + '_i2i');
        assert.match(await modelButton.innerText(), model === 'zimage' ? /^Z-Image/ : /^Krea2/);
        assert.deepEqual((await submit()).assets, {'images[0]':'legacy.png'});
      }
    });

    assert.deepEqual(errors, []);
    assert.deepEqual(unexpected, []);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
