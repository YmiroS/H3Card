// Requires Playwright; optionally set CHOUKA_TEST_BROWSER=msedge.
// Video fixture uses CHOUKA_TEST_FFMPEG, bundled imageio FFmpeg, or ffmpeg on PATH.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { createServer } = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const web = path.join(__dirname, '..', 'web');
const source = readFileSync(path.join(web, 'app.js'), 'utf8').replace(/\r\n/g, '\n');
function block(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, start);
  return source.slice(from, to);
}

test('asset card sizing, metadata, canvas upload and zoom regressions', async (t) => {
  // Only the surrounding project/panel plumbing is stubbed; rendering, sizing,
  // metadata callbacks, resize, menus and canvas handlers come from app.js.
  const html = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/style.css">
    <div id="stage" style="position:absolute;left:40px;top:30px;width:1000px;height:700px">
      <div id="world"></div><svg id="wires"></svg><div id="groups"></div>
    </div>
    <button id="zoom-menu" style="position:fixed;left:1100px;top:600px">Zoom</button>
    <span id="zoom-percent"></span><div id="menu" style="display:none"></div><script>
    const el = Object.fromEntries(['stage','world','wires','groups','menu'].map(id => [id,document.getElementById(id)]));
    el.zoomMenu = document.getElementById('zoom-menu'); el.zoomPercent = document.getElementById('zoom-percent');
    const PROJ = {cards:[],edges:[]}, CARDS = [{id:'card_asset',kind:'asset',modes:[{id:'asset'}]}], CLIP = null;
    let view = {x:0,y:0,k:1};
    ${block('const CW =', 'document.addEventListener(')}
    const isAsset = () => true, isStyle = () => false, isText = () => false, isTextCard = () => false;
    const assetOf = c => c.outputs[0], titleOf = () => 'Asset', cmpSrc = () => null;
    const KIND_ZH = {image:'图片',video:'视频'};
    const paintPort = () => {}, openPanel = () => {}, drawWires = () => {}, tipHide = () => {};
    const paintSel = () => {}, updateMinimap = () => {}, placePanel = () => {}, pick = () => {};
    window.saved = 0; window.notices = []; window.imageLoads = [];
    const save = () => saved++, toast = message => notices.push(message);
    // Observe real Image load events, including detached old-file probes; no fake dimensions.
    window.Image = class extends Image {
      constructor() { super(); this.addEventListener('load', () => imageLoads.push(this.getAttribute('src'))); }
    };
    ${block('function applyView(', '/* ================= 小地图')}
    ${block('function applySize(', '/** 文本节点的节点脚')}
    ${block('function startResize(', 'function startWire(')}
    ${block('function paintTitle(', '/** 左边那颗绿点')}
    ${block('const VIDEO_PREVIEWS =', '/** 素材格里的图')}
    ${block('async function setAssetItem(', '/** 底部工具条「上传」')}
    ${block('function showMenu(', '/** 面板底部工具条')}
    function addCard(type, x=0, y=0) {
      const c = {id:'asset-' + PROJ.cards.length,type,x,y,outputs:[]};
      const d = document.createElement('div'); d.className = 'card'; d.dataset.id = c.id;
      d.style.left = x + 'px'; d.style.top = y + 'px';
      d.innerHTML = '<div class="ch"><span></span><span class="t">Asset</span></div><div class="body"></div>'
        + '<div class="bar"><i></i></div><div class="cf"><span class="kt"></span><span class="st"></span><span class="meta"></span></div><div class="rz br"></div>';
      c._el = d; d.querySelector('.rz').onmousedown = ev => startResize(ev,c,d,1);
      PROJ.cards.push(c); el.world.appendChild(d); return c;
    }
    window.card = addCard('card_asset',20,20);
    window.baseline = card._el.cloneNode(true); baseline.id = 'baseline';
    baseline.style.left = '500px'; el.world.appendChild(baseline);
    function dimensions(d) {
      const b = d.querySelector('.body');
      return {width:d.getBoundingClientRect().width,height:b.getBoundingClientRect().height};
    }
    ${block('  el.stage.addEventListener("wheel",', '  // 拖拽文件到画布')}
    ${block('  el.zoomMenu.onclick =', '\n}\n\n/* ================= 右键菜单')}
    applyView();
    </script>`;
  const media = new Map();
  const uploads = [];
  const server = createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/upload') {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        uploads.push({type:req.headers['content-type'],body:Buffer.concat(chunks).toString('latin1')});
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({files:[{kind:'image',origin:'landscape.png',url:'/media/landscape.png'}]}));
      });
    } else if (media.has(req.url)) {
      res.setHeader('Content-Type', req.url.endsWith('.mp4') ? 'video/mp4' : 'image/png');
      res.end(media.get(req.url));
    } else if (req.url === '/style.css') {
      res.setHeader('Content-Type', 'text/css'); res.end(readFileSync(path.join(web, 'style.css')));
    } else if (req.url === '/') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html);
    } else { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
    const page = await browser.newPage({viewport:{width:1280,height:800}});
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = 'http://127.0.0.1:' + server.address().port;
    await page.goto(url);
    const sizes = [['landscape',1200,600],['portrait',600,1200],['huge',4096,3072]];
    for (const [name,width,height] of sizes) {
      const data = await page.evaluate(({width,height}) => {
        const c = document.createElement('canvas'); c.width = width; c.height = height;
        c.getContext('2d').fillRect(0,0,width,height); return c.toDataURL('image/png').split(',')[1];
      }, {width,height});
      media.set('/media/' + name + '.png', Buffer.from(data, 'base64'));
    }
    // Full stylesheet includes a later theme override (currently 220px, not 168px).
    const defaults = await page.evaluate(() => dimensions(baseline));
    assert.equal(defaults.width, 268);
    assert.ok(defaults.height > 0);
    t.diagnostic('Full CSS default card width/body height: ' + JSON.stringify(defaults));
    async function checkSize(expected = defaults) {
      assert.deepEqual(await page.evaluate(() => dimensions(card._el)), expected);
    }
    async function importImage(name) {
      await page.evaluate(name => setAssetItem(card, {kind:'image',origin:name + '.png',url:'/media/' + name + '.png'}), name);
    }
    async function loaded(name) {
      await page.waitForFunction(name => imageLoads.includes('/media/' + name + '.png'), name);
    }

    for (const [name,width,height] of sizes) await t.test(name + ' image keeps default DOM size and real resolution', async () => {
      await page.goto(url);
      await importImage(name);
      await loaded(name);
      await checkSize();
      assert.deepEqual(await page.evaluate(() => {
        const img = card._el.querySelector('img'), out = card.outputs[0];
        return {width:out.width,height:out.height,natural:[img.naturalWidth,img.naturalHeight],
          fit:getComputedStyle(img).objectFit,hasSize:'w' in card || 'h' in card};
      }), {width,height,natural:[width,height],fit:'contain',hasSize:false});
      assert.match(await page.locator('.card').first().locator('.kt').textContent(), new RegExp(width + '×' + height));
    });

    await t.test('replacing an oversized card clears persisted size and inline height', async () => {
      await page.goto(url);
      await importImage('huge');
      await loaded('huge');
      await page.evaluate(() => { card.w = 2400; card.h = 1800; applySize(card); });
      await checkSize({width:2400,height:1800});
      await importImage('portrait');
      await loaded('portrait');
      await checkSize();
      assert.deepEqual(await page.evaluate(() => ['w' in card,'h' in card,card._el.querySelector('.body').style.height]), [false,false,'']);
    });

    await t.test('late image metadata preserves a real manual resize; stale image callbacks cannot overwrite replacement', async () => {
      await page.goto(url);
      // Hold actual PNG responses until after the user has dragged the resize handle.
      const pending = [];
      await page.route('**/media/slow*.png', route => { pending.push(route); });
      try {
        await importImage('slow');
        await checkSize();
        const handle = await page.locator('.card').first().locator('.rz.br').boundingBox();
        await page.mouse.move(handle.x + 7, handle.y + 7);
        await page.mouse.down();
        await page.mouse.move(handle.x + 127, handle.y + 87, {steps:4});
        await page.mouse.up();
        const manual = await page.evaluate(() => dimensions(card._el));
        assert.deepEqual(manual, {width:defaults.width + 120,height:defaults.height + 80});
        assert.deepEqual(await page.evaluate(() => [card.w,card.h]), [manual.width,manual.height]);
        assert.ok(pending.length, 'image request must be held before metadata arrives');
        for (const route of pending.splice(0)) await route.fulfill({contentType:'image/png',body:media.get('/media/huge.png')});
        await loaded('slow');
        await checkSize(manual);
        assert.deepEqual(await page.evaluate(() => [card.outputs[0].width,card.outputs[0].height]), [4096,3072]);

        await importImage('slow-old');
        await importImage('portrait');
        await loaded('portrait');
        assert.ok(pending.length, 'old-file response must still be pending');
        for (const route of pending.splice(0)) await route.fulfill({contentType:'image/png',body:media.get('/media/huge.png')});
        await loaded('slow-old');
        await checkSize();
        assert.deepEqual(await page.evaluate(() => [card.outputs[0].url,card.outputs[0].width,card.outputs[0].height]), ['/media/portrait.png',600,1200]);
        assert.match(await page.locator('.card').first().locator('.kt').textContent(), /600×1200/);
      } finally {
        for (const route of pending) await route.abort();
        await page.unroute('**/media/slow*.png');
      }
    });

    await t.test('real video metadata keeps default card size and contain', async () => {
      // Encode a tiny synthetic clip in memory, never touch a real project or output folder.
      const bundled = path.join(__dirname, '..', '..', 'python_embeded', 'Lib', 'site-packages', 'imageio_ffmpeg', 'binaries', 'ffmpeg-win-x86_64-v7.1.exe');
      const ffmpeg = process.env.CHOUKA_TEST_FFMPEG || (existsSync(bundled) ? bundled : 'ffmpeg');
      media.set('/media/clip.mp4', execFileSync(ffmpeg, [
        '-nostdin','-v','error','-f','lavfi','-i','testsrc2=size=1280x720:rate=12:duration=0.25',
        '-c:v','libx264','-pix_fmt','yuv420p','-movflags','frag_keyframe+empty_moov','-f','mp4','pipe:1',
      ], {timeout:20000}));
      await page.goto(url);
      await page.evaluate(() => setAssetItem(card, {kind:'video',origin:'clip.mp4',url:'/media/clip.mp4'}));
      await page.waitForFunction(() => card.outputs[0].width === 1280 && card._el.querySelector('video').readyState >= 1);
      await checkSize();
      assert.deepEqual(await page.evaluate(() => {
        const v = card._el.querySelector('video');
        return [card.outputs[0].width,card.outputs[0].height,v.videoWidth,v.videoHeight,getComputedStyle(v).objectFit,'w' in card,'h' in card];
      }), [1280,720,1280,720,'contain',false,false]);
      assert.match(await page.locator('.card').first().locator('.kt').textContent(), /1280×720/);
    });

    await t.test('wheel reaches 10%, clamps both limits and preserves cursor anchor; menu selects 10% and 25%', async () => {
      await page.goto(url);
      const point = {x:850,y:650};
      const anchor = await page.evaluate(p => toWorld(p.x,p.y), point);
      await page.mouse.move(point.x,point.y);
      // mouse.wheel sends native browser input; wait for each asynchronous handler.
      async function wheel(delta, count) {
        for (let i = 0; i < count; i++) {
          const saved = await page.evaluate(() => window.saved);
          await page.mouse.wheel(0,delta);
          await page.waitForFunction(n => window.saved > n, saved);
          const state = await page.evaluate(p => ({anchor:toWorld(p.x,p.y),k:view.k,
            scale:new DOMMatrixReadOnly(getComputedStyle(el.world).transform).a}), point);
          assert.ok(Math.abs(state.anchor.x - anchor.x) < 1e-7);
          assert.ok(Math.abs(state.anchor.y - anchor.y) < 1e-7);
          assert.ok(state.k >= 0.1 && state.k <= 2);
          assert.ok(Math.abs(state.scale - state.k) < 1e-5);
        }
      }
      await wheel(120,28);
      assert.equal(await page.evaluate(() => view.k), 0.1);
      assert.equal(await page.locator('#zoom-percent').textContent(), '10%');
      const lower = await page.evaluate(() => ({...view}));
      await wheel(120,2);
      assert.deepEqual(await page.evaluate(() => view), lower);
      await wheel(-120,35);
      assert.equal(await page.evaluate(() => view.k), 2);
      const upper = await page.evaluate(() => ({...view}));
      await wheel(-120,2);
      assert.deepEqual(await page.evaluate(() => view), upper);
      for (const percent of [10,25]) {
        await page.locator('#zoom-menu').click();
        await page.getByRole('button', {name:new RegExp('缩小 \\(' + percent + '%\\)')}).click();
        assert.equal(await page.evaluate(() => view.k), percent / 100);
        assert.equal(await page.locator('#zoom-percent').textContent(), percent + '%');
        assert.equal(await page.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(el.world).transform).a), percent / 100);
      }
    });

    await t.test('canvas right-click upload consumes the files response and renders a sized asset', async () => {
      await page.goto(url);
      const at = await page.evaluate(() => toWorld(900,550));
      await page.mouse.click(900,550,{button:'right'});
      assert.equal(await page.getByRole('button', {name:/上传素材/}).isVisible(), true);
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', {name:/上传素材/}).click(),
      ]).catch(async error => {
        t.diagnostic(JSON.stringify({errors,menu:await page.locator('#menu').innerText()}));
        throw error;
      });
      await chooser.setFiles({name:'landscape.png',mimeType:'image/png',buffer:media.get('/media/landscape.png')});
      await page.waitForFunction(() => PROJ.cards.length === 2 && PROJ.cards[1].outputs[0]?.width === 1200);
      assert.equal(uploads.length, 1);
      assert.match(uploads[0].type, /^multipart\/form-data; boundary=/);
      assert.match(uploads[0].body, /name="file"; filename="landscape.png"/);
      assert.deepEqual(await page.evaluate(() => {
        const c = PROJ.cards[1], img = c._el.querySelector('img');
        return {at:{x:c.x,y:c.y},size:dimensions(c._el),out:c.outputs[0],fit:getComputedStyle(img).objectFit,hasSize:'w' in c || 'h' in c};
      }), {at,size:defaults,out:{kind:'image',origin:'landscape.png',url:'/media/landscape.png',filename:'landscape.png',width:1200,height:600},fit:'contain',hasSize:false});
      assert.deepEqual(await page.evaluate(() => notices), ['已上传：landscape.png']);
    });
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

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
