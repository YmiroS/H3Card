// Requires Playwright; optionally set CHOUKA_TEST_BROWSER=msedge.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createServer } = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const web = path.join(__dirname, '..', 'web');
const source = readFileSync(path.join(web, 'app.js'), 'utf8');
function block(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, start);
  return source.slice(from, to);
}

test('filled asset slots preview on click and replace/download through the context menu', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const html = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/style.css">
    <div id="panel" style="display:block;position:relative;width:760px"><div id="fixture" style="display:flex;gap:12px"></div></div>
    <div id="menu" style="display:none"></div><div id="view" style="display:none"><div class="vbox"></div></div>
    <input id="picker" type="file" hidden><script>
    const el = {menu:document.getElementById('menu'), view:document.getElementById('view'),
      vbox:document.querySelector('.vbox'), picker:document.getElementById('picker')};
    const api = async (url, options) => { const r = await fetch(url, options); if (!r.ok) throw Error('HTTP ' + r.status); return r.json(); };
    const slotName = s => s.label, gridWord = () => false, modeOf = () => null, tipHide = () => {};
    const toast = message => { throw Error(message); };
    window.saved = 0; window.detached = [];
    const save = () => window.saved++;
    const detachSlotEdges = (id, key) => window.detached.push([id, key]);
    const paintKind = () => {}, drawWires = () => {}, paintStyles = () => {};
    const putAsset = (c, s, item) => { c.assets[s.key] = item; };
    const openPanel = () => render();
    ${block('function showMenu(', '/** 面板底部工具条')}
    ${block('const VIEW_WORD =', 'function cardMenu(')}
    ${block('function downloadOut(', 'function resetSize(')}
    ${block('const VIDEO_PREVIEWS =', '/* ================= 右侧历史产物栏')}
    ${block('function slotEl(', '/* 时间码')}
    ${block('function pickFile(', '/** 给素材节点选文件')}
    window.card = {id:'test-card', assets:{
      image:{kind:'image', url:'/api/upload/original.png', origin:'参考图片.png'},
      video:{kind:'video', url:'/api/upload/original.mov', origin:'原始视频.mov'},
      audio:{kind:'audio', url:'/api/upload/original.wav', filename:'linked/audio.wav'},
    }};
    const specs = ['image','video','audio','empty'].map(key => ({key, type:key==='empty'?'image':key, label:key}));
    function render() {
      document.getElementById('fixture').replaceChildren(...specs.map(s => {
        const slot = slotEl(card, s); slot.dataset.key = s.key; return slot;
      }));
    }
    render();
    </script>`;
  let uploads = 0;
  const server = createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/upload') {
      uploads++;
      req.resume();
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({files:[{kind:'image', origin:'replacement.png', url:'/api/upload/replacement.png'}]}));
    } else if (req.url.startsWith('/api/preview/') && !req.url.endsWith('/file')) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({status:'ready', url:'/api/preview/original.mov/file'}));
    } else if (req.url.startsWith('/api/upload/') || req.url.endsWith('/file')) {
      res.setHeader('Content-Type', req.url.endsWith('.png') ? 'image/png' : 'application/octet-stream');
      res.end(png);
    } else if (req.url === '/style.css') {
      res.setHeader('Content-Type', 'text/css'); res.end(readFileSync(path.join(web, 'style.css')));
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
    const page = await browser.newPage();
    const errors = [], choosers = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('filechooser', chooser => choosers.push(chooser));
    await page.goto('http://127.0.0.1:' + server.address().port);
    for (const [kind, tag, filename] of [['image','img','参考图片.png'], ['video','video','原始视频.mov'], ['audio','audio','audio.wav']]) {
      const slot = page.locator('.slot[data-key="' + kind + '"]');
      await slot.click();
      assert.equal(await page.locator('#view').isVisible(), true);
      assert.equal(await page.locator('#view ' + tag).count(), 1);
      assert.equal(choosers.length, 0, 'preview must not open the file picker');
      if (kind === 'video') {
        await page.waitForFunction(() => document.querySelector('#view video').getAttribute('src') === '/api/preview/original.mov/file');
      }
      await page.locator('#view .vx').click();
      await slot.click({button:'right'});
      for (const text of ['更换素材', '下载素材', '清空这一格']) {
        assert.equal(await page.getByRole('button', {name:new RegExp(text)}).isVisible(), true);
      }
      const downloadEvent = page.waitForEvent('download');
      await page.getByRole('button', {name:/下载素材/}).click();
      const download = await downloadEvent;
      assert.equal(download.suggestedFilename(), filename);
      assert.match(download.url(), /\/api\/upload\//);
      assert.deepEqual(readFileSync(await download.path()), png);
      assert.equal(choosers.length, 0);
    }
    await page.locator('.slot[data-key="image"]').click({button:'right'});
    const replacePicker = page.waitForEvent('filechooser');
    await page.getByRole('button', {name:/更换素材/}).click();
    await (await replacePicker).setFiles({name:'replacement.png', mimeType:'image/png', buffer:png});
    await page.waitForFunction(() => card.assets.image.origin === 'replacement.png');
    assert.equal(uploads, 1);
    assert.equal(await page.locator('#view').isVisible(), false);
    await page.locator('.slot[data-key="image"]').click({button:'right'});
    await page.getByRole('button', {name:/清空这一格/}).click();
    assert.equal(await page.evaluate(() => card.assets.image), undefined);
    assert.deepEqual(await page.evaluate(() => detached), [['test-card','image']]);
    const emptyPicker = page.waitForEvent('filechooser');
    await page.locator('.slot[data-key="empty"]').click();
    await (await emptyPicker).setFiles([]);
    assert.equal(choosers.length, 2, 'only replacement and empty-slot clicks open the picker');
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
