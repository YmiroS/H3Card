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
const qwenT2iId = 'qwen_image_2512_t2i';
const qwenT2iName = 'Qwen Image 2512（双阶段）';
const qwenNegative = '低分辨率，低画质，肢体畸形，手指畸形，画面过饱和，蜡像感，人脸无细节，过度光滑，画面具有AI感。构图混乱。文字模糊，扭曲。';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const capabilities = Object.fromEntries(['zimage_t2i', 'zimage_i2i', 'krea2_t2i', 'krea2_i2i',
  'flux2_klein_storyboard9', 'flux2_klein_edit', qwenId, qwenT2iId].map(id =>
  [id, JSON.parse(readFileSync(path.join(root, 'manifests', id + '.json'), 'utf8'))]));
capabilities.no_switch = {id:'no_switch', name:'独立模式', outputType:'image', inputs:[]};
const cards = JSON.parse(readFileSync(path.join(root, 'manifests', '_cards.json'), 'utf8'))
  .filter(c => ['card_image', 'card_asset', 'card_text', 'card_style'].includes(c.id));
cards.find(c => c.id === 'card_image').modes.push({id:'no_switch', name:'独立模式'});
const project = {
  id:'model-test', name:'模型菜单回归', permission:'operate', locked:true, edges:[], groups:[], view:{x:100, y:70, k:1},
  cards:[{id:'image-card', type:'card_image', cap:'zimage_i2i', x:100, y:20, params:{}, assets:{}, outputs:[]}],
};

test('image model menus, parameters and media limits in the complete UI', async (t) => {
  const generated = [], unexpected = [];
  let uploads = 0;
  let generateDelay = null, generateStatus = 'done', generateError = '';
  let jobs = [], savedProject = project;
  const json = (res, value) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(value));
  };
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost').pathname;
    if (url === '/api/auth/me') return json(res, {user:{id:'admin', username:'admin', role:'admin'}, csrf_token:'test-csrf'});
    if (url === '/api/cards') return json(res, {cards, capabilities, comfy_online:true});
    if (url === '/api/reload') return json(res, {ok:true});
    if (url === '/api/health') return json(res, {comfy_online:true});
    if (url === '/api/jobs') return json(res, {jobs:jobs.map(j => ({permission:'operate', ...j}))});
    if (url === '/api/projects') return json(res, {projects:[{...project, cards:1}]});
    if (url === '/api/projects/model-test') return json(res, savedProject);
    if (url === '/api/upload' && req.method === 'POST') {
      req.resume();
      const n = ++uploads;
      return json(res, {files:[{kind:'image', ref:`image-${n}.png`, url:'/fixture.png', origin:`image-${n}.png`}]});
    }
    if (url === '/api/generate' && req.method === 'POST') {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', async () => {
        generated.push(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        const id = 'test-job-' + generated.length;
        if (generateDelay) await generateDelay;
        if (generateError) {
          res.writeHead(504, {'Content-Type':'text/plain; charset=utf-8'});
          return res.end(generateError);
        }
        const job = {id, status:generateStatus, seed:42};
        if (job.status === 'queued') jobs.push(job);
        json(res, job);
      });
      return;
    }
    if (url === '/fixture.png') { res.setHeader('Content-Type', 'image/png'); return res.end(png); }
    const files = {'/':'index.html', '/app.js':'app.js', '/auth.js':'auth.js', '/style.css':'style.css', '/icon.png':'icon.png', '/favicon.png':'favicon.png'};
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

    await t.test('Qwen versions stay mode-specific; mode changes ignore stale model state; no mapping hides menu', async () => {
      await reset(qwenId, 'krea2');
      await chooseMode('文生图');
      assert.equal(await page.evaluate(() => PROJ.cards[0].cap), 'zimage_t2i');
      await modelButton.click();
      assert.deepEqual(await page.locator('#menu button span:last-child').allTextContents(),
        ['Z-Image（当前）', 'Krea2', qwenT2iName]);
      await page.locator('#menu button').filter({hasText:'Krea2'}).click();
      await page.evaluate(() => { PROJ.cards[0]._model = 'qwen2511'; });
      await chooseMode('图生图');
      assert.equal(await page.evaluate(() => PROJ.cards[0].cap), 'krea2_i2i');
      await chooseMode('独立模式');
      assert.equal(await modelButton.count(), 0);
    });

    await t.test('Qwen 2512 negative defaults, edits and clearing survive legacy model switches', async () => {
      await reset('zimage_t2i');
      await chooseModel(qwenT2iName);
      assert.equal(await page.evaluate(() => PROJ.cards[0].cap), qwenT2iId);
      assert.equal(await modelButton.locator('span').innerText(), qwenT2iName);
      const spec = capabilities[qwenT2iId].inputs.find(s => s.key === 'negative_prompt');
      assert.equal(spec.default, qwenNegative);
      const negativeBlock = page.locator('#panel .pblock').filter({hasText:spec.label});
      const negative = negativeBlock.locator('textarea');
      const positive = page.locator('#panel .pblock textarea').first();
      assert.equal(await page.locator('#panel .pblock textarea').count(), 2);
      assert.equal(await positive.inputValue(), '');
      assert.equal(await negative.inputValue(), qwenNegative);
      let payload = await submit();
      assert.equal(payload.params.prompt, '');
      assert.equal(payload.params.negative_prompt, qwenNegative);
      assert.deepEqual([payload.params.width, payload.params.height, payload.params.steps,
        payload.params.refine_steps, payload.params.cfg, payload.params.seed], [1024, 1024, 6, 2, 1.5, -1]);
      assert.deepEqual(payload.assets, {});
      await positive.fill('雨后的街道');
      await negative.fill('不要水印或模糊');
      assert.equal((await submit()).params.negative_prompt, '不要水印或模糊');
      for (const name of ['Z-Image', 'Krea2']) {
        await chooseModel(name);
        assert.equal(await negative.count(), 0, 'undeclared negative input stays hidden');
        payload = await submit();
        assert.equal(Object.hasOwn(payload.params, 'negative_prompt'), false);
        assert.equal(payload.params.prompt, '雨后的街道');
        await chooseModel(qwenT2iName);
        assert.equal(await negative.inputValue(), '不要水印或模糊');
      }
      await negativeBlock.getByRole('button', {name:'清空', exact:true}).click();
      assert.equal(await negative.inputValue(), '');
      assert.equal((await submit()).params.negative_prompt, '');
      await chooseModel('Z-Image');
      await chooseModel(qwenT2iName);
      assert.equal(await negative.inputValue(), '', 'explicit blank must not restore the preset');
      assert.equal((await submit()).params.negative_prompt, '');
      await negative.fill('临时负向');
      await negative.fill('');
      assert.equal((await submit()).params.negative_prompt, '', 'keyboard clearing also submits an explicit blank');
    });

    await t.test('negative input never inherits styles, text references or positive optimization', async () => {
      await reset(qwenT2iId);
      await page.evaluate(async () => {
        const c = PROJ.cards[0];
        const style = addCard('card_style', 700, 20);
        style.params.style = '水彩风格';
        const text = addCard('card_text', 700, 220);
        text.params.text = '远处有一座山';
        text.name = '引用文本';
        await linkTo(style, c);
        PROJ.edges.push({from:text.id, to:c.id, slot:TEXT_SLOT});
        c.params.prompt = '河边的小屋';
        openPanel(c.id);
      });
      const spec = capabilities[qwenT2iId].inputs.find(s => s.key === 'negative_prompt');
      const negativeBlock = page.locator('#panel .pblock').filter({hasText:spec.label});
      const negative = negativeBlock.locator('textarea');
      const positive = page.locator('#panel .pblock textarea').first();
      assert.equal(await positive.inputValue(), '水彩风格\n\n远处有一座山\n\n河边的小屋');
      assert.equal(await negative.inputValue(), qwenNegative);
      assert.doesNotMatch(await negativeBlock.locator('.phd').innerText(), /已并入/);
      assert.equal(await negativeBlock.locator('.tbtool.opt').count(), 0);
      assert.deepEqual(await page.evaluate(() => promptSpecs(capOf(PROJ.cards[0])).map(s => s.key)), ['prompt']);
      let payload = await submit();
      assert.match(payload.params.prompt, /水彩风格/);
      assert.equal(payload.params.negative_prompt, qwenNegative);
      await positive.fill('水彩风格\n\n远处有一座山\n\n正向 @引用文本');
      await negative.fill('不要水印 @引用文本');
      payload = await submit();
      assert.match(payload.params.prompt, /水彩风格/);
      assert.match(payload.params.prompt, /正向 远处有一座山/);
      assert.equal(payload.params.negative_prompt, '不要水印 @引用文本', 'negative text stays literal, without mention expansion');
      await negativeBlock.getByRole('button', {name:'清空', exact:true}).click();
      assert.equal(await negative.inputValue(), '');
      payload = await submit();
      assert.equal(payload.params.negative_prompt, '');
      assert.match(payload.params.prompt, /水彩风格/);
    });

    await t.test('Qwen 2512 reuses resolution controls and exposes independent 6+2 sampling steps', async () => {
      await reset(qwenT2iId);
      await paramsButton.click();
      assert.equal(await page.locator('#respop .cpick').count(), 1);
      assert.equal(await page.locator('#respop button[title^="画面比例 1:1"]').getAttribute('class'), 'on');
      const stepSpec = capabilities[qwenT2iId].inputs.find(s => s.key === 'steps');
      const refineSpec = capabilities[qwenT2iId].inputs.find(s => s.key === 'refine_steps');
      const row = label => page.locator('#respop .row').filter({has:page.getByText(label, {exact:true})});
      const steps = row(stepSpec.label);
      const refine = row(refineSpec.label);
      assert.equal(await page.locator('#respop .row').count(), 2, 'cfg and seed do not become extra controls');
      assert.equal(await steps.locator('input[type="number"]').inputValue(), '6');
      assert.equal(await refine.locator('input[type="number"]').inputValue(), '2');
      await steps.locator('input[type="number"]').fill('8');
      assert.equal(await steps.locator('input[type="range"]').inputValue(), '8');
      assert.equal(await refine.locator('input[type="number"]').inputValue(), '2');
      await refine.locator('input[type="number"]').fill('3');
      assert.equal(await refine.locator('input[type="range"]').inputValue(), '3');
      assert.equal(await steps.locator('input[type="number"]').inputValue(), '8');
      await page.locator('#respop button[title^="画面比例 16:9"]').click();
      await page.locator('#respop .cgrid.k').getByRole('button', {name:'720P', exact:true}).click();
      assert.match(await paramsButton.innerText(), /16:9.*720P/);
      await page.locator('#respop .x').click();
      await paramsButton.click();
      assert.equal(await steps.locator('input[type="number"]').inputValue(), '8');
      assert.equal(await refine.locator('input[type="number"]').inputValue(), '3');
      await page.locator('#respop .x').click();
      let payload = await submit();
      assert.deepEqual([payload.params.width, payload.params.height, payload.params.steps,
        payload.params.refine_steps, payload.params.cfg], [1280, 720, 8, 3, 1.5]);
      await chooseModel('Z-Image');
      payload = await submit();
      assert.deepEqual([payload.params.width, payload.params.height], [1280, 720]);
      assert.equal(Object.hasOwn(payload.params, 'refine_steps'), false);
      await chooseModel(qwenT2iName);
      payload = await submit();
      assert.deepEqual([payload.params.width, payload.params.height, payload.params.steps,
        payload.params.refine_steps], [1280, 720, 8, 3]);
      await chooseMode('图生图');
      assert.equal(await page.evaluate(() => PROJ.cards[0].cap), 'zimage_i2i');
      await modelButton.click();
      assert.deepEqual(await page.locator('#menu button span:last-child').allTextContents(),
        ['Z-Image（当前）', 'Krea2', 'Qwen Image Edit 2511']);
    });

    await t.test('multi-image editing modes do not acquire the text-to-image model menu', async () => {
      await reset(qwenT2iId);
      for (const [name, cap] of [['多宫格故事分镜', 'flux2_klein_storyboard9'], ['参考图编辑(保人物)', 'flux2_klein_edit']]) {
        await chooseMode(name);
        assert.equal(await page.evaluate(() => PROJ.cards[0].cap), cap);
        assert.equal(await modelButton.count(), 0);
        assert.equal(await page.locator('#panel textarea[placeholder^="负向提示词"]').count(), 0);
      }
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

    await t.test('submission pending clears old jobs, blocks repeats and only queues after acknowledgement', async () => {
      await reset('zimage_t2i');
      jobs = [{id:'old-job', status:'done', progress:1, outputs:[]}];
      await page.evaluate(() => {
        const c = PROJ.cards[0];
        c.job = 'old-job'; c.status = 'done'; c.queue_remaining = 9;
        paint(c); openPanel(c.id);
      });
      let release;
      generateDelay = new Promise(resolve => { release = resolve; });
      generateStatus = 'queued';
      const before = generated.length;
      const response = page.waitForResponse(r => r.url().endsWith('/api/generate'));
      try {
        await page.locator('#panel .go').click();
        const pending = await page.evaluate(async () => {
          await pollJobs();
          const c = PROJ.cards[0];
          return {status:c.status, job:c.job, queue:c.queue_remaining,
            text:c._el.querySelector('.st').textContent};
        });
        assert.deepEqual(pending, {status:'queued', job:null, queue:null, text:'正在提交…'});
        assert.equal(await page.locator('#panel .go').isDisabled(), true);
        assert.equal(await page.locator('#panel .cancel').count(), 0);
        await page.evaluate(() => run(PROJ.cards[0]));
      } finally {
        release(); generateDelay = null;
      }
      await response;
      await page.waitForFunction(() => !!PROJ.cards[0].job);
      assert.equal(generated.length, before + 1, 'pending repeat must not submit another request');
      assert.deepEqual(await page.evaluate(() => {
        const c = PROJ.cards[0];
        return [c.status, c.job, c._el.querySelector('.st').textContent];
      }), ['queued', 'test-job-' + generated.length, '排队中']);
      assert.equal(await page.locator('#panel .go').isDisabled(), true);
      assert.equal(await page.locator('#panel .cancel').isVisible(), true);
      await page.evaluate(async () => {
        const c = PROJ.cards[0];
        await run(c);
        c.status = 'running';
        await run(c);
        await pollJobs();
      });
      assert.equal(generated.length, before + 1, 'queued and running repeats must not submit');
      generateStatus = 'done'; jobs = [];
    });

    await t.test('Chinese submission timeout shows error and permits retry', async () => {
      await reset('zimage_t2i');
      generateError = '提交确认超时（30秒），请先检查任务列表，确认后再重试';
      const response = page.waitForResponse(r => r.url().endsWith('/api/generate'));
      await page.locator('#panel .go').click();
      assert.equal((await response).status(), 504);
      await page.waitForFunction(() => PROJ.cards[0].status === 'error');
      assert.deepEqual(await page.evaluate(() => [PROJ.cards[0].job, PROJ.cards[0].error]),
        [null, generateError]);
      assert.match(await page.locator('#panel .err').innerText(), /提交确认超时/);
      assert.equal(await page.locator('#panel .go').isDisabled(), false);
      assert.equal(await page.locator('#panel .cancel').count(), 0);
      assert.equal(await page.locator('#world .load').count(), 0);
      generateError = '';
      await submit();
    });

    await t.test('payload construction errors leave loading state without sending a request', async () => {
      await reset('zimage_t2i');
      const before = generated.length;
      await page.evaluate(() => {
        window.originalPayloadOf = payloadOf;
        payloadOf = () => { throw new Error('提交参数读取失败'); };
      });
      await page.locator('#panel .go').click();
      await page.waitForFunction(() => PROJ.cards[0].status === 'error');
      assert.equal(await page.locator('#panel .err').innerText(), '提交参数读取失败');
      assert.equal(await page.locator('#panel .go').isDisabled(), false);
      assert.equal(await page.locator('#panel .cancel').count(), 0);
      assert.equal(await page.locator('#world .load').count(), 0);
      assert.equal(await page.evaluate(() => PROJ.cards[0].job), null);
      assert.equal(generated.length, before);
      await page.evaluate(() => { payloadOf = window.originalPayloadOf; delete window.originalPayloadOf; });
      await submit();
    });

    await t.test('reloading unacknowledged queued cards recovers without changing real jobs or text cards', async () => {
      await reset('zimage_t2i');
      savedProject = await page.evaluate(() => {
        const c = PROJ.cards[0];
        c.status = 'queued'; c.job = null;
        const queued = {...plain(c), id:'real-queued', job:'saved-job', x:600};
        const text = addCard('card_text', 900, 20);
        text.status = 'queued'; text.job = null;
        return {...PROJ, cards:[plain(c), queued, plain(text)]};
      });
      jobs = [{id:'saved-job', status:'queued'}];
      try {
        await page.reload();
        await page.waitForFunction(() => PROJ && PROJ.cards[0]?._el);
        await page.evaluate(() => pick(PROJ.cards[0].id));
        assert.deepEqual(await page.evaluate(() => PROJ.cards.map(c => [c.status, c.job])),
          [['error', null], ['queued', 'saved-job'], ['queued', null]]);
        assert.equal(await page.locator('#panel .err').innerText(),
          '上次提交未取得任务编号，请先检查任务列表，确认后再重试');
        assert.equal(await page.locator('#panel .go').isDisabled(), false);
        assert.equal(await page.locator('#panel .cancel').count(), 0);
        assert.equal(await page.evaluate(() => PROJ.cards[0]._el.querySelector('.load')), null);
        await submit();
      } finally {
        savedProject = project; jobs = [];
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
