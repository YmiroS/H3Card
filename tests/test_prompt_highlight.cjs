// 需要 Playwright；可用 CHOUKA_TEST_BROWSER 指定浏览器，执行 node --test tests/test_prompt_highlight.cjs。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createServer } = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const web = path.join(__dirname, '..', 'web');

test('prompt text has only one visible layer across variants, editing and scrolling', async () => {
  const app = readFileSync(path.join(web, 'app.js'), 'utf8');
  const promptBlock = app.slice(app.indexOf('function promptBlock('), app.indexOf('\n/** 「优化」按钮'));
  const optTabs = app.slice(app.indexOf('function optTabs('), app.indexOf('\n/** 重画面板'));
  const html = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/style.css">
    <div id="panel" style="display:block;position:relative;width:760px"><div id="fixture"></div></div>
    <pre id="result">PENDING</pre><script>
    const fixture = document.getElementById('fixture');
    const spec = {key:'prompt', label:'Prompt', default:'Example prompt @image'};
    const cap = {rewrite:true};
    const CAPS = {test:cap}, PROJ = {cards:[]};
    const styleCards = () => [], ownStyles = () => [], ownTexts = () => [], styleTexts = () => [];
    const textOf = () => '', runCap = () => 'test', capOf = () => cap;
    const promptSpecs = () => [spec], optOf = c => c.opt.prompt, save = () => {};
    const repanel = c => fixture.replaceChildren(promptBlock(c, spec));
    ${promptBlock}
    ${optTabs}
    const pause = () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 60)));
    const check = (condition, message) => { if (!condition) throw Error(message); };
    const transparent = element => getComputedStyle(element).color === 'rgba(0, 0, 0, 0)';
    const longText = ('The ambient sound of a quiet convenience store plays, featuring the low, steady hum of refrigeration units and a distant automatic sliding door. ').repeat(12);
    const card = {id:'test', params:{prompt:spec.default}, opt:{prompt:longText}, optUse:{prompt:true}};
    async function verify(label, optimized, expectedColor) {
      await pause();
      const ta = fixture.querySelector('textarea');
      const layer = fixture.querySelector('.prompt-highlight-layer');
      const layerStyle = getComputedStyle(layer);
      const layerVisible = layerStyle.display !== 'none' && layerStyle.visibility !== 'hidden' && !transparent(layer);
      check(ta.getClientRects().length > 0 && getComputedStyle(ta).visibility !== 'hidden', label + ': textarea must remain displayed');
      // 原词由镜像层显示 @标签；优化词由原生文本框显示，隐藏的镜像层不应参与可见性断言。
      check(optimized ? !transparent(ta) && !layerVisible : transparent(ta) && layerVisible, label + ': exactly the intended text layer must be visible');
      if (optimized) check(layerStyle.display === 'none', label + ': optimized mirror must be hidden');
      if (expectedColor) check(getComputedStyle(optimized ? ta : layer).color === expectedColor, label + ': visible text color lost');
      check(layer.textContent === ta.value + '\\n', label + ': highlight content differs');
      check(layerStyle.lineHeight === getComputedStyle(ta).lineHeight, label + ': line height differs');
      return {ta, layer};
    }
    (async () => {
      repanel(card);
      let {ta, layer} = await verify('optimized', true, 'rgb(205, 238, 245)');
      check(ta.value === longText, 'optimized text content differs');
      ta.focus();
      await verify('focused optimized', true);
      ta.scrollTop = ta.scrollHeight;
      ta.dispatchEvent(new Event('scroll'));
      check(ta.scrollTop > 0, 'optimized native text must scroll');
      await verify('scrolled optimized', true);
      document.getElementById('panel').style.width = '420px';
      await verify('resized optimized', true);
      ta.value = 'Edited optimized prompt ' + longText;
      ta.dispatchEvent(new Event('input'));
      await verify('edited optimized', true);
      check(card.opt.prompt === ta.value && card.params.prompt === spec.default, 'optimized editing must not overwrite original text');
      fixture.querySelector('.opttabs button').click();
      ({ta, layer} = await verify('original example', false, 'rgb(253, 230, 138)'));
      ta.value = ('Edited prompt @image ' + longText).trim();
      ta.dispatchEvent(new Event('input'));
      await verify('edited original', false);
      check(card.params.prompt === ta.value, 'editing must save the original prompt');
      check(layer.querySelector('.at-mention').textContent === '@image', 'mention highlight lost');
      ta.scrollTop = ta.scrollHeight;
      ta.dispatchEvent(new Event('scroll'));
      check(ta.scrollTop > 0 && layer.scrollTop === ta.scrollTop, 'original mirror scroll must stay synchronized');
      await verify('scrolled original', false);
      document.getElementById('panel').style.width = '760px';
      await verify('resized original', false);
      fixture.querySelectorAll('.opttabs button')[1].click();
      ({ta} = await verify('switched back to optimized', true));
      check(ta.value === card.opt.prompt, 'switching tabs must retain optimized edits');
      document.getElementById('result').textContent = 'PASS';
    })().catch(error => { document.getElementById('result').textContent = 'FAIL: ' + error.message; });
    </script>`;
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/style.css' ? 'text/css' : 'text/html; charset=utf-8');
    res.end(req.url === '/style.css' ? readFileSync(path.join(web, 'style.css')) : html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.waitForFunction(() => document.getElementById('result').textContent !== 'PENDING');
    const result = await page.locator('#result').textContent();
    assert.deepEqual(errors, []);
    assert.equal(result, 'PASS', result);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('prompt heights persist per card and field across panel rebuilds and reload', async t => {
  const app = readFileSync(path.join(web, 'app.js'), 'utf8');
  const promptBlock = app.slice(app.indexOf('function promptBlock('), app.indexOf('\n/** 「优化」按钮'));
  const optTabs = app.slice(app.indexOf('function optTabs('), app.indexOf('\n/** 重画面板'));
  const plain = app.slice(app.indexOf('const plain ='), app.indexOf('/** 保存串行化'));
  const html = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/style.css">
    <div id="panel" style="display:block;position:relative;width:620px"><div id="fixture"></div></div><script>
    const fixture = document.getElementById('fixture');
    const spec = {key:'prompt',label:'提示词'}, negative = {key:'negative_prompt',label:'负向提示词'};
    const cap = {rewrite:true}, CAPS = {test:cap};
    const PROJ = {cards:JSON.parse(localStorage.getItem('cards') || 'null') || [
      {id:'a',params:{prompt:'卡片甲',negative_prompt:'甲负向'},opt:{prompt:'优化后的词'},optUse:{prompt:false}},
      {id:'b',params:{prompt:'卡片乙',negative_prompt:'乙负向'}}
    ]};
    window.allowed = true; window.saved = 0;
    const canOperate = () => allowed;
    const styleCards = () => [], ownTexts = () => [], styleTexts = () => [], textOf = () => '', runCap = () => 'test', capOf = () => cap;
    const promptSpecs = () => [spec], optOf = (c,key) => c.opt?.[key];
    ${plain}
    const save = () => { saved++; localStorage.setItem('cards',JSON.stringify(PROJ.cards.map(plain))); };
    const repanel = c => render(c);
    ${promptBlock}
    ${optTabs}
    function render(c, s=spec) { fixture.replaceChildren(promptBlock(c,s)); }
    render(PROJ.cards[0]);
    </script>`;
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/style.css' ? 'text/css' : 'text/html; charset=utf-8');
    res.end(req.url === '/style.css' ? readFileSync(path.join(web, 'style.css')) : html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
    const page = await browser.newPage({viewport:{width:1000,height:800}});
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    const frame = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const textarea = () => page.locator('#fixture textarea');
    const height = () => textarea().evaluate(ta => ta.offsetHeight);
    async function resize(delta) {
      const r = await textarea().boundingBox();
      await page.mouse.move(r.x+r.width-4,r.y+r.height-4);
      await page.mouse.down();
      await page.mouse.move(r.x+r.width-4,r.y+r.height-4+delta,{steps:5});
      await page.mouse.up(); await frame();
    }
    let aHeight, bHeight, negativeHeight;
    await t.test('native resize saves card metadata without changing prompt parameters', async () => {
      await frame();
      const initial = await height();
      assert.equal(await page.evaluate(() => saved), 0, 'initial layout must not save');
      await resize(180); aHeight = await height();
      assert.ok(aHeight > initial + 80);
      assert.equal(await page.evaluate(() => PROJ.cards[0].promptHeights.prompt), aHeight);
      assert.deepEqual(await page.evaluate(() => PROJ.cards[0].params), {prompt:'卡片甲',negative_prompt:'甲负向'});
      assert.equal(await page.evaluate(() => PROJ.cards[1].promptHeights), undefined);
      assert.equal(await page.locator('.prompt-highlight-layer').evaluate(el => el.offsetHeight), aHeight);
    });
    await t.test('rebuilding and switching original/optimized tabs retain height without layout saves', async () => {
      const before = await page.evaluate(() => saved);
      await page.evaluate(() => render(PROJ.cards[0])); await frame();
      assert.equal(await height(), aHeight);
      assert.equal(await page.evaluate(() => saved), before);
      await page.locator('.opttabs button').nth(1).click(); await frame();
      assert.equal(await height(), aHeight);
      await page.locator('.opttabs button').first().click(); await frame();
      assert.equal(await height(), aHeight);
    });
    await t.test('different cards and positive/negative fields keep independent heights', async () => {
      await page.evaluate(() => render(PROJ.cards[1])); await frame();
      assert.notEqual(await height(), aHeight);
      await resize(65); bHeight = await height();
      assert.equal(await page.evaluate(() => PROJ.cards[1].promptHeights.prompt), bHeight);
      await page.evaluate(() => render(PROJ.cards[0],negative)); await frame();
      assert.notEqual(await height(), aHeight);
      await resize(40); negativeHeight = await height();
      assert.equal(await page.evaluate(() => PROJ.cards[0].promptHeights.negative_prompt), negativeHeight);
      await page.evaluate(() => render(PROJ.cards[0])); await frame();
      assert.equal(await height(), aHeight);
    });
    await t.test('serialized cards reload heights and hidden panels or readonly viewing do not overwrite', async () => {
      const data = await page.evaluate(() => JSON.parse(localStorage.getItem('cards')));
      assert.equal(data[0].promptHeights.prompt, aHeight);
      assert.equal(data[1].promptHeights.prompt, bHeight);
      await page.reload(); await frame();
      assert.equal(await height(), aHeight);
      assert.equal(await page.evaluate(() => saved), 0, 'restoring height must not save');
      await page.evaluate(() => { document.getElementById('panel').style.display = 'none'; }); await frame();
      await page.evaluate(() => { document.getElementById('panel').style.display = 'block'; }); await frame();
      assert.equal(await height(), aHeight);
      assert.equal(await page.evaluate(() => saved), 0);
      await page.evaluate(() => { allowed = false; });
      await resize(30);
      assert.equal(await page.evaluate(() => PROJ.cards[0].promptHeights.prompt), aHeight);
      assert.equal(await page.evaluate(() => saved), 0);
      await page.evaluate(() => render(PROJ.cards[0],negative)); await frame();
      assert.equal(await height(), negativeHeight);
    });
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
