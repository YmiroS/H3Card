// Requires Playwright and its Chromium browser; run node --test tests/test_prompt_highlight.cjs.
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
    async function verify(label, expectedLayerColor) {
      await pause();
      const ta = fixture.querySelector('textarea');
      const layer = fixture.querySelector('.prompt-highlight-layer');
      check(transparent(ta), label + ': native textarea text must stay transparent');
      check(!transparent(layer), label + ': highlight text must remain visible');
      if (expectedLayerColor) check(getComputedStyle(layer).color === expectedLayerColor, label + ': theme color lost');
      check(layer.textContent === ta.value + '\\n', label + ': highlight content differs');
      check(getComputedStyle(layer).lineHeight === getComputedStyle(ta).lineHeight, label + ': line height differs');
      return {ta, layer};
    }
    (async () => {
      repanel(card);
      let {ta, layer} = await verify('optimized', 'rgb(219, 234, 254)');
      ta.focus();
      await verify('focused optimized');
      ta.scrollTop = ta.scrollHeight;
      ta.dispatchEvent(new Event('scroll'));
      check(ta.scrollTop > 0 && layer.scrollTop === ta.scrollTop, 'scroll must stay synchronized');
      document.getElementById('panel').style.width = '420px';
      await verify('resized optimized');
      fixture.querySelector('.opttabs button').click();
      ({ta, layer} = await verify('original example', 'rgb(253, 230, 138)'));
      ta.value = 'Edited prompt @image';
      ta.dispatchEvent(new Event('input'));
      await verify('edited original');
      check(card.params.prompt === ta.value, 'editing must save the original prompt');
      check(layer.querySelector('.at-mention').textContent === '@image', 'mention highlight lost');
      fixture.querySelectorAll('.opttabs button')[1].click();
      await verify('switched back to optimized');
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
    browser = await chromium.launch();
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
