'use strict';
// NODE_PATH=E:/ComfyUI_Mie_V33/temp/chouka-preview-test/node_modules CHOUKA_TEST_BROWSER=msedge node --test tests/test_image_composer.cjs
// Real production index/app/editor/Fabric + isolated aiohttp/AuthStore/resources.
// Do not require test_clipboard_media.cjs: importing it would execute its suite.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const {spawn} = require('node:child_process');
const {once} = require('node:events');
const {chromium, expect} = require('playwright/test');
const ROOT = path.resolve(__dirname, '..');
const embedded = path.resolve(ROOT, '../python_embeded/python.exe');
const PYTHON = process.env.CHOUKA_TEST_PYTHON || (fs.existsSync(embedded) ? embedded : 'python3');
const PASSWORD = 'Composer-isolated-password-123';
const BOOT = String.raw`
import asyncio, json, sys
from pathlib import Path
from aiohttp import web, ClientSession, TraceConfig
real, isolated = map(Path, sys.argv[1:3])
sys.path.insert(0, str(real / 'server'))
import app as host
from server.auth import register_auth_routes
from server.auth_store import AuthStore
from server.resource_access import ResourceAccess
original_load_caps = host.load_caps
def load_real_caps():
    previous = host.ROOT
    host.ROOT = real
    try:
        return original_load_caps()
    finally:
        host.ROOT = previous
host.load_caps = load_real_caps
host.ROOT = isolated
host.PROJ_DIR = isolated / 'data' / 'projects'
host.JOBS_FILE = isolated / 'data' / 'jobs.json'
host.ARTIFACT_DIR = isolated / 'data' / 'artifacts'
host.COMFY_INPUT = isolated / 'comfy-input'
host.COMFY_INPUT.mkdir(parents=True)
(isolated / 'pricing.json').write_bytes((real / 'pricing.json').read_bytes())
host.JOBS.clear()
# Avoid production LAN discovery; do not replace any feature/auth/resource route.
host.lan_ips = lambda: []
host.register_auth_routes = lambda application, _: register_auth_routes(application, real / 'web')
async def index(request):
    host.require_user(request)
    return web.FileResponse(real / 'web' / 'index.html')
async def static_asset(request, *, name):
    return web.FileResponse(real / 'web' / name)
host.index = index
host.static_asset = static_asset
audit = {'writes': [], 'outbound': []}
async def reject_http(session, context, params):
    audit['outbound'].append({'transport': 'aiohttp', 'url': str(params.url)})
    raise RuntimeError('Image composer fixture blocks outbound HTTP: ' + str(params.url))
def reject_socket(event, args):
    # Also block urllib, raw TCP/UDP and DNS, not only the shared ClientSession.
    if event in ('socket.connect', 'socket.getaddrinfo', 'socket.sendto'):
        audit['outbound'].append({'transport': event, 'address': repr(args[1:])})
        raise OSError('Image composer fixture blocks outbound sockets')
async def isolated_start(application):
    store = await asyncio.to_thread(AuthStore, application['auth_path'])
    application['auth_store'] = store
    application['resource_access'] = ResourceAccess(store, isolated, host.COMFY_INPUT)
    trace = TraceConfig()
    trace.on_request_start.append(reject_http)
    application['session'] = ClientSession(trace_configs=[trace])
    owner = await asyncio.to_thread(store.create_user, 'composer-owner', 'Composer-isolated-password-123', role='admin')
    reader = await asyncio.to_thread(store.create_user, 'composer-reader', 'Composer-isolated-password-123')
    await asyncio.to_thread(store.set_grant, reader['id'], owner['id'], 'read')
    await asyncio.to_thread(store.set_ready)
host.on_start = isolated_start
@web.middleware
async def observe(request, handler):
    if request.method not in ('GET', 'HEAD', 'OPTIONS'):
        audit['writes'].append({'method': request.method, 'path': request.path,
                                'query': dict(request.query), 'content_type': request.content_type})
    return await handler(request)
async def fixture_audit(request):
    return web.json_response({**audit, 'jobs': list(host.JOBS), 'root': str(host.ROOT),
                              'mode': host.EXECUTION_MODE})
async def main():
    # Edge may reset an idle HTTP connection on close on Windows. Audit precisely
    # that transport callback; never suppress application/request exceptions.
    def loop_error(loop, context):
        error = context.get('exception')
        callback = str(context.get('handle', ''))
        if isinstance(error, ConnectionResetError) and getattr(error, 'winerror', None) == 10054 and '_ProactorBasePipeTransport._call_connection_lost' in callback:
            audit.setdefault('transport_resets', []).append(str(error))
        else:
            loop.default_exception_handler(context)
    asyncio.get_running_loop().set_exception_handler(loop_error)
    # Install once the event loop's private wakeup socket exists, before app startup.
    sys.addaudithook(reject_socket)
    application = host.make_app(auth_path=isolated / 'data' / 'auth-composer-test.db')
    application.middlewares.insert(0, observe)
    application.router.add_get('/__fixture/audit', fixture_audit)
    runner = web.AppRunner(application, access_log=None)
    await runner.setup()
    site = web.TCPSite(runner, '127.0.0.1', 0)
    await site.start()
    port = site._server.sockets[0].getsockname()[1]
    print('COMPOSER_READY ' + json.dumps({'origin': 'http://127.0.0.1:' + str(port)}), flush=True)
    try:
        await asyncio.to_thread(sys.stdin.readline)
    finally:
        await runner.cleanup()
asyncio.run(main())
`;

async function bootFixture(folder) {
  const child = spawn(PYTHON, ['-B', '-u', '-c', BOOT, ROOT, folder], {
    cwd:ROOT, windowsHide:true, stdio:['pipe','pipe','pipe'],
    env:{...process.env, PYTHONIOENCODING:'utf-8', CHOUKA_LOCAL_TEST:'0', CHOUKA_ADMIN_SANDBOX:'0',
      CHOUKA_EXECUTION_MODE:'local', CHOUKA_PORT:'0', CHOUKA_AUTH_DB:'', CHOUKA_AUTH_ORIGIN:'',
      CHOUKA_DINGTALK_APP_KEY:'', CHOUKA_DINGTALK_APP_SECRET:''},
  });
  let log = '';
  child.stdout.on('data', data => { log += data; });
  child.stderr.on('data', data => { log += data; });
  const ready = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); finish(new Error('Boot timeout\n' + log)); }, 30000);
    function finish(error, value) {
      clearTimeout(timer); child.stdout.off('data', check); child.off('exit', exited); child.off('error', failed);
      error ? reject(error) : resolve(value);
    }
    function check() { const match = log.match(/COMPOSER_READY (\{[^\r\n]+\})/); if (match) finish(null, JSON.parse(match[1])); }
    function exited(code) { finish(new Error(`Fixture exited ${code}\n${log}`)); }
    function failed(error) { finish(error); }
    child.stdout.on('data', check); child.once('exit', exited); child.once('error', failed); check();
  }).catch(error => { fs.writeFileSync(path.join(folder, 'server.log'), log); throw error; });
  return {...ready, async stop() {
    if (child.exitCode === null) {
      const exit = once(child, 'exit'); child.stdin.end('stop\n');
      let timer;
      try { await Promise.race([exit, new Promise((_, reject) => {
        timer = setTimeout(() => { child.kill(); reject(new Error('Shutdown timeout')); }, 15000);
      })]); } finally { clearTimeout(timer); }
    }
    fs.writeFileSync(path.join(folder, 'server.log'), log);
    assert.equal(child.exitCode, 0, log);
    assert.doesNotMatch(log, /Traceback|Error handling request|Task exception was never retrieved/);
  }};
}

// Encode lossless 8x8 RGBA fixtures without external tools or on-disk input files.
function solidPNG(r, g, b) {
  function chunk(type, data) {
    const bytes = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    const size = Buffer.alloc(4), checksum = Buffer.alloc(4);
    size.writeUInt32BE(data.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([size, bytes, checksum]);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(8,0); header.writeUInt32BE(8,4); header[8] = 8; header[9] = 6;
  const rows = Buffer.alloc(8 * 33);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) rows.set([r,g,b,255], y * 33 + 1 + x * 4);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR',header), chunk('IDAT',zlib.deflateSync(rows)), chunk('IEND',Buffer.alloc(0))]);
}
async function api(page, url, method = 'GET', data) {
  return page.evaluate(({url,method,data}) => method === 'GET'
    ? H3Auth.request(url) : H3Auth.json(url,method,data), {url,method,data});
}
async function settle(page) {
  await expect.poll(() => page.evaluate(() => pendingNodeWork.size + pendingCardCreates + pendingContentSaves +
    Number(contentSaving) + Number(saveTimer !== null)), {timeout:15000}).toBe(0);
  await page.evaluate(async () => { await saveChain; });
}
async function openProject(page, id) {
  await page.evaluate(async id => { await loadProjects(); await openProject(id); pick('composite'); }, id);
  await settle(page);
}
async function launch(fixture, report) {
  const browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
  const context = await browser.newContext({viewport:{width:1600,height:1100}});
  try {
    await guardNetwork(context, fixture.origin, report);
    await login(context, fixture.origin, 'composer-owner');
    return {browser,context};
  } catch (error) { await browser.close(); throw error; }
}
async function guardNetwork(context, origin, report) {
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === origin || ['data:','blob:','about:'].includes(url.protocol)) return route.continue();
    report.browserOutbound.push(url.href); return route.abort('blockedbyclient');
  });
  // Newer Playwright supports interception of WebSockets as well as HTTP.
  if (context.routeWebSocket) await context.routeWebSocket(/.*/, socket => {
    const url = new URL(socket.url());
    if (url.host === new URL(origin).host) socket.connectToServer();
    else { report.browserOutbound.push(url.href); socket.close(); }
  });
}
async function login(context, origin, username) {
  const response = await context.request.post(origin + '/api/auth/login', {
    headers:{Origin:origin}, data:{username,password:PASSWORD},
  });
  assert.equal(response.status(),200,await response.text());
}
async function loadPage(context, fixture, report) {
  const page = await context.newPage();
  page.on('pageerror', error => report.pageErrors.push(error.stack));
  page.on('dialog', dialog => dialog.accept());
  await page.goto(fixture.origin);
  await page.waitForFunction(() => typeof CARDS !== 'undefined' && CARDS.length && H3Auth.active);
  return page;
}
function compositeCard(composition) {
  return {id:'composite',type:'card_tools',cap:'image_composite',name:'真实图片合成',x:120,y:120,
    params:composition ? {composition} : {},assets:{},outputs:[]};
}
function assertIsolation(audit, report, folder) {
  assert.equal(audit.mode,'local','Run in local mode to prove local_only never contacts ComfyUI');
  assert.equal(audit.root.replace(/\\/g,'/'),folder.replace(/\\/g,'/'));
  assert.deepEqual(audit.outbound,[],'No attempted Python HTTP, sockets or DNS');
  assert.deepEqual(report.browserOutbound,[],'No attempted external browser HTTP/WebSocket');
  assert.deepEqual(audit.jobs,[],'Browser capability must not create any JOBS');
  assert.deepEqual(report.pageErrors,[],'No uncaught browser errors');
}

test('image composer: real uploads, layer edits, draft reload, PNG pixels, history and downstream', {timeout:180000}, async t => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(),'chouka-image-composer-'));
  const report = {folder,browserOutbound:[],pageErrors:[],requests:[]};
  t.diagnostic('Isolated composer evidence: ' + folder);
  let fixture, browser, page;
  try {
    fixture = await bootFixture(folder);
    const launched = await launch(fixture, report); browser = launched.browser;
    page = await loadPage(launched.context, fixture, report);
    page.on('request', request => {
      const url = new URL(request.url());
      if (request.method() !== 'GET') report.requests.push({path:url.pathname,query:Object.fromEntries(url.searchParams),method:request.method()});
    });
    const defs = await api(page,'/api/cards');
    assert.equal(defs.capabilities.image_composite?.execution,'browser');
    assert.equal(defs.cards.find(c => c.id === 'card_tools')?.modes.at(-1)?.id,'image_composite');
    for (const asset of ['/vendor/fabric.min.js','/image-composer.js','/image-composer.css']) {
      const resource = await page.request.get(fixture.origin + asset);
      assert.equal(resource.status(),200,'Production static route ' + asset);
      assert.ok((await resource.body()).length > 100);
    }
    assert.deepEqual(await page.evaluate(() => ({
      fabric:!!document.querySelector('script[src*="/vendor/fabric.min.js"]'),
      editor:!!document.querySelector('script[src*="/image-composer.js"]'),
      css:!!document.querySelector('link[href*="/image-composer.css"]'),
      open:typeof openImageComposer, module:typeof window.ChoukaImageComposer?.open,
    })), {fabric:true,editor:true,css:true,open:'function',module:'function'},'Full production index loads local dependencies');
    const project = await api(page,'/api/projects','POST',{name:'隔离图片合成验收'});
    await api(page,`/api/projects/${project.id}/cards`,'POST',{card:compositeCard()});
    await api(page,`/api/projects/${project.id}/cards`,'POST',{card:{id:'downstream',type:'card_image',cap:'zimage_i2i',
      name:'下游只连接不生成',x:800,y:120,params:{},assets:{},outputs:[]}});
    await openProject(page,project.id);
    // Cover the actual user entry in addition to API-seeding the deterministic target.
    await page.evaluate(() => { closePanel(); selIds.clear(); selId = null; });
    await page.locator('#stage').click({button:'right',position:{x:480,y:520}});
    await page.locator('#menu button').filter({has:page.locator('span').getByText('工具',{exact:true})}).click();
    await expect.poll(() => page.evaluate(() => PROJ.cards.length)).toBe(3);
    await settle(page);
    const entryId = await page.evaluate(() => PROJ.cards.find(c => !['composite','downstream'].includes(c.id)).id);
    await page.evaluate(id => pick(id),entryId);
    await page.locator('#panel .foot button[title^="工具箱模式"]').click();
    await page.locator('#menu button').filter({hasText:'图片合成'}).click(); await settle(page);
    assert.equal(await page.evaluate(id => cardOf(id).cap,entryId),'image_composite');
    await page.locator('#panel').getByRole('button',{name:'编辑合成',exact:true}).click();
    const entryDialog = page.locator('dialog[data-image-composer]');
    await expect(entryDialog.getByRole('button',{name:'保存编辑稿',exact:true})).toBeEnabled();
    await entryDialog.getByRole('button',{name:'关闭',exact:true}).click(); await expect(entryDialog).toHaveCount(0);
    await page.evaluate(id => { delCard(id); pick('composite'); },entryId); await settle(page);
    report.contextMenuEntry = {createdCard:entryId,mode:'image_composite'};
    const go = page.locator('#panel').getByRole('button',{name:'编辑合成',exact:true});
    await expect(go).toBeVisible(); await go.click();
    const dialog = page.locator('dialog[data-image-composer]');
    const save = dialog.getByRole('button',{name:'保存编辑稿',exact:true});
    await expect(dialog).toBeVisible(); await expect(save).toBeEnabled();
    async function field(label, value) {
      const input = dialog.getByLabel(label,{exact:true});
      await input.fill(String(value)); await input.press('Tab'); await expect(input).toHaveValue(String(value));
    }
    async function choose(name) {
      // The layer list now shows the original filename below its thumbnail;
      // the user-editable layer alias is still preserved in the draft/controls.
      const filename = {'红色':'red.png','蓝色':'blue.png'}[name] || name;
      await dialog.locator('.ic-layer-name').filter({hasText:filename}).click();
    }
    async function savedCard() { return (await api(page,`/api/projects/${project.id}`)).cards.find(c => c.id === 'composite'); }
    await field('画布宽度 / px',64); await field('画布高度 / px',48);
    await dialog.locator('input[type=file]').setInputFiles([
      {name:'red.png',mimeType:'image/png',buffer:solidPNG(255,0,0)},
      {name:'blue.png',mimeType:'image/png',buffer:solidPNG(0,0,255)},
    ]);
    await expect.poll(() => dialog.evaluate(node => {
      const error = node.querySelector('[role=alert]');
      return error && !error.hidden ? error.textContent : node.querySelectorAll('.ic-layer').length === 2 ? 'ready' : 'pending';
    }),{timeout:15000}).not.toBe('pending');
    assert.deepEqual(await dialog.locator('[role=alert]:not([hidden])').allTextContents(),[],
      'Real upload resources must be accepted by the production editor');
    await expect(dialog.locator('.ic-layer')).toHaveCount(2);
    await expect(save).toBeEnabled();
    // Rename through actual property controls rather than assuming upload naming.
    await dialog.locator('.ic-layer-name').first().click(); await field('名称','蓝色');
    await dialog.locator('.ic-layer-name').last().click(); await field('名称','红色');
    await dialog.getByLabel('锁定宽高比',{exact:true}).uncheck();
    for (const [name,geometry] of [['红色',{x:4,y:4,width:24,height:16,angle:90,opacity:80}],
      ['蓝色',{x:12,y:8,width:16,height:16,angle:45,opacity:50}]]) {
      await choose(name);
      for (const [key,label] of [['x','X / px'],['y','Y / px'],['width','宽度 / px'],['height','高度 / px'],['angle','角度 / °'],['opacity','透明度 / %']]) await field(label,geometry[key]);
      // Exercise rotation but restore exact axis alignment for deterministic pixels.
      await field('角度 / °',0);
      if (name === '红色') await field('透明度 / %',100);
    }
    await choose('蓝色'); await dialog.getByRole('button',{name:'置底',exact:true}).click();
    await expect(dialog.locator('.ic-layer-name').first()).toHaveText('red.png');
    await dialog.getByRole('button',{name:'置顶',exact:true}).click();
    await expect(dialog.locator('.ic-layer-name').first()).toHaveText('blue.png');
    // Delete/Ctrl+Z must operate only on layers, never the selected outer card.
    const outerBefore = await page.evaluate(() => ({ids:PROJ.cards.map(c => c.id),edges:structuredClone(PROJ.edges)}));
    await dialog.getByRole('button',{name:'适应窗口',exact:true}).focus();
    await page.keyboard.press('Delete'); await expect(dialog.locator('.ic-layer')).toHaveCount(1);
    await page.keyboard.press('Control+z'); await expect(dialog.locator('.ic-layer')).toHaveCount(2);
    assert.deepEqual(await page.evaluate(() => ({ids:PROJ.cards.map(c => c.id),edges:structuredClone(PROJ.edges)})),outerBefore);
    await save.click(); await expect(save).toBeEnabled(); await settle(page);
    const draft = await savedCard(), composition = draft.params.composition;
    assert.deepEqual({version:composition.version,width:composition.width,height:composition.height,background:composition.background},
      {version:1,width:64,height:48,background:'transparent'});
    assert.deepEqual(composition.layers.map(({name,x,y,width,height,angle,opacity,visible,locked}) =>
      ({name,x,y,width,height,angle,opacity,visible,locked})),[
      {name:'红色',x:4,y:4,width:24,height:16,angle:0,opacity:1,visible:true,locked:false},
      {name:'蓝色',x:12,y:8,width:16,height:16,angle:0,opacity:.5,visible:true,locked:false},
    ]);
    for (const layer of composition.layers) {
      assert.equal(layer.asset.kind,'image'); assert.ok(layer.asset.ref);
      assert.deepEqual(draft.assets['composite:' + layer.id],layer.asset,'Separate layer resource ownership');
      assert.ok(!/^(data:|blob:)/.test(layer.asset.url),'Store real resource refs, never embedded image bytes');
      const response = await page.request.get(fixture.origin + layer.asset.url);
      assert.equal(response.status(),200); assert.deepEqual(await response.body(),solidPNG(...(layer.name === '红色' ? [255,0,0] : [0,0,255])));
    }
    report.composition = composition;
    report.desktopScreenshot = path.join(folder,'composer-desktop.png');
    await page.screenshot({path:report.desktopScreenshot,fullPage:true});
    await page.setViewportSize({width:720,height:900});
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    report.narrowScreenshot = path.join(folder,'composer-narrow.png');
    await page.screenshot({path:report.narrowScreenshot,fullPage:true});
    await page.setViewportSize({width:1600,height:1100});
    await dialog.getByRole('button',{name:'关闭',exact:true}).click(); await expect(dialog).toHaveCount(0);
    await page.reload(); await page.waitForFunction(() => typeof CARDS !== 'undefined' && CARDS.length && H3Auth.active);
    await openProject(page,project.id);
    assert.deepEqual(await page.evaluate(() => plain(cardOf('composite')).params.composition),composition,'Real server reload restores draft');
    await page.evaluate(() => openImageComposer(cardOf('composite')));
    await expect(save).toBeEnabled(); await expect(dialog.locator('.ic-layer')).toHaveCount(2);
    await choose('红色'); await expect(dialog.getByLabel('宽度 / px',{exact:true})).toHaveValue('24');
    await choose('蓝色'); await expect(dialog.getByLabel('透明度 / %',{exact:true})).toHaveValue('50');
    await dialog.getByRole('button',{name:'合成 PNG',exact:true}).click();
    await expect.poll(async () => (await savedCard()).outputs.length,{timeout:15000}).toBe(1);
    await expect(save).toBeEnabled(); await settle(page);
    const exported = await savedCard(), output = exported.outputs[0];
    assert.equal(output.kind,'image'); assert.ok(output.ref); assert.match(output.filename,/\.png$/i);
    assert.equal(exported.status,'done'); assert.deepEqual(exported.params.composition,composition);
    assert.deepEqual(exported.history[0].outputs,[output]); assert.equal(exported.history[0].cap,'image_composite');
    const resource = await page.request.get(fixture.origin + output.url);
    assert.equal(resource.status(),200); assert.match(resource.headers()['content-type'],/^image\/png/);
    const bytes = await resource.body(); assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
    assert.equal(bytes.readUInt32BE(16),64); assert.equal(bytes.readUInt32BE(20),48);
    const pixels = await page.evaluate(async url => {
      const response = await fetch(url); if (!response.ok) throw new Error('PNG fetch failed');
      const bitmap = await createImageBitmap(await response.blob());
      const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap,0,0); bitmap.close();
      return [[6,6],[16,12],[16,22],[60,44]].map(([x,y]) => [...ctx.getImageData(x,y,1,1).data]);
    },output.url);
    const expected = [[255,0,0,255],[127,0,128,255],[0,0,255,128],[0,0,0,0]];
    pixels.forEach((pixel,i) => pixel.forEach((channel,j) => assert.ok(Math.abs(channel - expected[i][j]) <= 1,
      `PNG pixel ${i}, channel ${j}: actual ${pixels[i]}, expected ${expected[i]}`)));
    report.output = output; report.pixels = pixels;
    await dialog.getByRole('button',{name:'关闭',exact:true}).click(); await expect(dialog).toHaveCount(0);
    const cardPreview = page.locator('#world .card[data-id="composite"] img').first();
    await expect(cardPreview).toBeVisible(); await expect.poll(() => cardPreview.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.evaluate(() => openHistory('composite'));
    const historyImage = page.locator('#hist img[data-i]').first();
    await expect(historyImage).toBeVisible(); await expect.poll(() => historyImage.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.evaluate(async () => { closeHistory(); await linkTo(cardOf('composite'),cardOf('downstream')); });
    await settle(page);
    const linked = await api(page,`/api/projects/${project.id}`), edge = linked.edges.find(e => e.from === 'composite' && e.to === 'downstream');
    assert.ok(edge,'New image output connects using the production linkTo implementation');
    assert.equal(linked.cards.find(c => c.id === 'downstream').assets[edge.slot].ref,output.ref);
    assert.equal(await page.locator('#wires path.hit').count(),1,'Connection has a real rendered SVG wire');
    await page.reload(); await page.waitForFunction(() => typeof CARDS !== 'undefined' && CARDS.length && H3Auth.active);
    await openProject(page,project.id);
    const restored = await savedCard(); assert.deepEqual(restored.outputs,[output]); assert.deepEqual(restored.history,exported.history);
    const audit = await api(page,'/__fixture/audit'); report.audit = audit;
    assertIsolation(audit,report,folder);
    assert.deepEqual(audit.writes.filter(w => /^\/api\/(generate|text|rewrite)$/.test(w.path)),[],
      'Editing/exporting/linking must never call generation endpoints');
    const uploads = audit.writes.filter(w => w.path === '/api/upload');
    assert.equal(uploads.length,3,'Exactly two input uploads and one PNG export');
    for (const upload of uploads) {
      assert.deepEqual(upload.query,{project:project.id,local_only:'1'});
      assert.equal(upload.content_type,'multipart/form-data');
    }
  } catch (error) {
    report.error = error.stack;
    if (page && !page.isClosed()) {
      report.editorError = await page.locator('[data-image-composer] [role=alert]').allTextContents().catch(() => []);
      await page.screenshot({path:path.join(folder,'failure.png'),fullPage:true}).catch(() => {});
    }
    throw error;
  } finally {
    // Record isolation even if the editor fails before the successful-path assertions.
    if (fixture && page && !page.isClosed()) report.finalAudit = await api(page,'/__fixture/audit').catch(() => null);
    fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2));
    try { if (browser) await browser.close(); } finally { if (fixture) await fixture.stop(); }
  }
});

// These fixtures use only the isolated server's real upload/resources APIs. Asset
// cards bypass importOutput; generation-like cards deliberately exercise it.
async function referenceProject(page, count, generated = false) {
  const project = await api(page,'/api/projects','POST',{name:'隔离合成输入连线验收'});
  await api(page,`/api/projects/${project.id}/cards`,'POST',{card:{...compositeCard(),x:480,y:80}});
  const sources = [];
  for (let i = 0; i < count; i++) {
    const rgb = [30 + i * 20, 210 - i * 17, 40 + i * 23];
    const filename = `reference-${i + 1}.png`;
    const uploaded = await page.evaluate(async ({id,filename,bytes}) => {
      const form = new FormData();
      form.append('file',new File([Uint8Array.from(atob(bytes),c => c.charCodeAt(0))],filename,{type:'image/png'}));
      return H3Auth.request(`/api/upload?project=${id}&local_only=1`,{method:'POST',body:form});
    },{id:project.id,filename,bytes:solidPNG(...rgb).toString('base64')});
    assert.equal(uploaded.files.length,1,'Seed each source with a real isolated upload');
    const output = {...uploaded.files[0],filename};
    assert.equal(output.kind,'image'); assert.ok(output.ref); assert.ok(output.url);
    const source = {id:`source-${i + 1}`,type:generated ? 'card_image' : 'card_asset',
      cap:generated ? 'zimage_t2i' : 'asset',name:`真实输入图片 ${i + 1}`,x:40,y:80 + i * 260,
      params:{},assets:{},outputs:[output],status:'done'};
    await api(page,`/api/projects/${project.id}/cards`,'POST',{card:source});
    sources.push({card:source,rgb});
  }
  await openProject(page,project.id);
  return {project,sources};
}
async function assertCompositeReferences(page, expected, pending = []) {
  const card = page.locator('#world .card[data-id="composite"]');
  const strip = card.locator(':scope > .body + .composite-inputs');
  await expect(strip).toBeVisible();
  await expect(strip.locator('[data-composite-reference]')).toHaveCount(expected.length + pending.length);
  await expect(strip.locator('.composite-input-label')).toHaveText(`引用图片 · ${expected.length + pending.length}/8`);
  const keys = await strip.locator('[data-composite-reference]').evaluateAll(nodes => nodes.map(n => n.dataset.compositeReference));
  assert.deepEqual(keys.sort(),[...expected.map(item => item.slot),...pending].sort(),'Each reserved/filled slot is shown exactly once');
  for (const {slot,asset,rgb} of expected) {
    const button = strip.locator(`[data-composite-reference="${slot}"]`), image = button.locator('img');
    await expect(button).toBeVisible(); await expect(button).toBeEnabled();
    await expect(button).toHaveAttribute('aria-label',new RegExp(asset.origin || asset.filename));
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute('src','/api/thumbnail?url=' + encodeURIComponent(asset.url));
    await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth === 8)).toBe(true);
    if (rgb) {
      const pixel = await image.evaluate(img => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 8;
        const context = canvas.getContext('2d'); context.drawImage(img,0,0);
        return [...context.getImageData(0,0,1,1).data];
      });
      assert.deepEqual(pixel,[...rgb,255],`Visible ${slot} thumbnail matches its actual source, not another reference/output`);
    }
  }
  for (const slot of pending) {
    const button = strip.locator(`[data-composite-reference="${slot}"]`);
    await expect(button).toBeVisible(); await expect(button).toBeDisabled();
    await expect(button).toContainText('导入中'); await expect(button.locator('img')).toHaveCount(0);
  }
}
async function assertCompositePanelOpen(page, expectedSlots) {
  await page.evaluate(() => pick('composite'));
  const details = page.locator('#panel details').filter({has:page.locator('summary').filter({hasText:'连接图片素材'})});
  await expect(details).toHaveCount(1);
  assert.equal(await details.evaluate(node => node.open),true,'Connected-image details default open without a summary click');
  await expect(details.locator('.slot.filled')).toHaveCount(expectedSlots.length);
  for (const slot of expectedSlots) await expect(details.locator(`.slot[data-key="${slot}"] img`)).toBeVisible();
}
async function referenceFixture(t, prefix, run) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(),prefix));
  const report = {folder,browserOutbound:[],pageErrors:[]};
  t.diagnostic('Isolated input-reference evidence: ' + folder);
  let fixture, browser, page;
  try {
    fixture = await bootFixture(folder);
    const launched = await launch(fixture,report); browser = launched.browser;
    page = await loadPage(launched.context,fixture,report);
    await run({page,fixture,folder,report});
    const audit = await api(page,'/__fixture/audit'); report.audit = audit;
    assertIsolation(audit,report,folder);
    assert.deepEqual(audit.writes.filter(w => /^\/api\/(generate|text|rewrite)$/.test(w.path)),[],
      'Reference linking and PNG output never submit generation');
    for (const upload of audit.writes.filter(w => w.path === '/api/upload')) {
      assert.equal(upload.query.local_only,'1','Seed/import/export uploads stay local and never contact a worker');
      assert.equal(upload.content_type,'multipart/form-data');
    }
  } catch (error) {
    report.error = error.stack;
    if (page && !page.isClosed()) {
      report.liveState = await page.evaluate(() => ({cards:PROJ?.cards.map(plain),edges:PROJ?.edges,
        references:[...document.querySelectorAll('[data-composite-reference]')].map(node =>
          ({slot:node.dataset.compositeReference,text:node.textContent,disabled:node.disabled}))})).catch(() => null);
      await page.screenshot({path:path.join(folder,'failure.png'),fullPage:true}).catch(() => {});
    }
    throw error;
  } finally {
    if (fixture && page && !page.isClosed()) report.finalAudit = await api(page,'/__fixture/audit').catch(() => null);
    fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2));
    try { if (browser) await browser.close(); } finally { if (fixture) await fixture.stop(); }
  }
}

test('image composer inputs: sequential real sources, visible references, output, reload, disconnect and eight-slot limit', {timeout:180000}, async t => {
  await referenceFixture(t,'chouka-image-composer-inputs-',async ({page,folder,report}) => {
    const {project,sources} = await referenceProject(page,9);
    report.project = project.id; report.sources = sources;
    const saved = () => api(page,`/api/projects/${project.id}`);
    const references = indices => indices.map(i => ({slot:`images[${i}]`,asset:sources[i].card.outputs[0],rgb:sources[i].rgb}));
    for (let i = 0; i < 2; i++) {
      await page.evaluate(async id => { await linkTo(cardOf(id),cardOf('composite')); },sources[i].card.id);
      await settle(page);
      await assertCompositeReferences(page,references(Array.from({length:i + 1},(_,j) => j)));
    }
    let snapshot = await saved();
    assert.deepEqual(snapshot.edges.map(e => ({from:e.from,to:e.to,slot:e.slot,slots:e.slots})),[
      {from:'source-1',to:'composite',slot:'images[0]',slots:['images[0]']},
      {from:'source-2',to:'composite',slot:'images[1]',slots:['images[1]']},
    ]);
    assert.deepEqual(snapshot.cards.find(c => c.id === 'composite').outputs,[],'Input references are not card outputs');
    assert.equal(await page.locator('#wires path.hit').count(),2);
    await assertCompositePanelOpen(page,['images[0]','images[1]']);
    await page.screenshot({path:path.join(folder,'two-inputs.png'),fullPage:true});
    await page.reload(); await page.waitForFunction(() => typeof CARDS !== 'undefined' && CARDS.length && H3Auth.active);
    await openProject(page,project.id);
    await assertCompositeReferences(page,references([0,1]));
    await assertCompositePanelOpen(page,['images[0]','images[1]']);
    assert.deepEqual((await saved()).edges,snapshot.edges,'Save/reload keeps both distinct source bindings');
    for (let i = 0; i < 2; i++) assert.deepEqual(await page.evaluate(slot => plain(cardOf('composite')).assets[slot],`images[${i}]`),sources[i].card.outputs[0]);

    // Produce a real local PNG through the editor: output painting must leave the
    // separate input strip intact, with the original source images still visible.
    await page.locator('#panel').getByRole('button',{name:'编辑合成',exact:true}).click();
    const dialog = page.locator('dialog[data-image-composer]');
    await expect(dialog.getByRole('button',{name:'保存编辑稿',exact:true})).toBeEnabled();
    for (const [label,value] of [['画布宽度 / px','64'],['画布高度 / px','48']]) {
      await dialog.getByLabel(label,{exact:true}).fill(value); await dialog.getByLabel(label,{exact:true}).press('Tab');
    }
    await expect(dialog.locator('.ic-layer')).toHaveCount(2,'Both wired images become layers without manually adding sources');
    await dialog.getByRole('button',{name:'合成 PNG',exact:true}).click();
    await expect.poll(async () => (await saved()).cards.find(c => c.id === 'composite').outputs.length).toBe(1);
    await expect(dialog.getByRole('button',{name:'保存编辑稿',exact:true})).toBeEnabled();
    await dialog.getByRole('button',{name:'关闭',exact:true}).click(); await settle(page);
    const withOutput = (await saved()).cards.find(c => c.id === 'composite'), output = withOutput.outputs[0];
    const preview = page.locator('#world .card[data-id="composite"] > .body img').first();
    await expect(preview).toBeVisible(); await expect.poll(() => preview.evaluate(img => CARD_MEDIA.get(img)?.fullURL || img.getAttribute('src'))).toBe(output.url);
    await assertCompositeReferences(page,references([0,1]));
    await page.screenshot({path:path.join(folder,'output-with-inputs.png'),fullPage:true});
    await page.reload(); await page.waitForFunction(() => typeof CARDS !== 'undefined' && CARDS.length && H3Auth.active);
    await openProject(page,project.id); await assertCompositeReferences(page,references([0,1]));
    await expect.poll(() => preview.evaluate(img => CARD_MEDIA.get(img)?.fullURL || img.getAttribute('src'))).toBe(output.url);

    // Use the real wire deletion command and a trusted Delete key, not direct
    // mutation of assets/edges, so exactly the selected connection is cleared.
    await page.evaluate(() => pickEdge(PROJ.edges.find(e => e.from === 'source-1' && e.to === 'composite')));
    await page.keyboard.press('Delete'); await settle(page);
    await assertCompositeReferences(page,references([1]));
    snapshot = await saved();
    const afterDisconnect = snapshot.cards.find(c => c.id === 'composite');
    assert.equal('images[0]' in afterDisconnect.assets,false);
    assert.deepEqual(afterDisconnect.assets['images[1]'],sources[1].card.outputs[0]);
    assert.deepEqual(afterDisconnect.outputs,[output]);
    assert.deepEqual(afterDisconnect.params,withOutput.params,'Disconnect never changes the editor draft');
    assert.deepEqual(snapshot.edges.map(e => e.from),['source-2']);
    assert.equal(await page.locator('#wires path.hit').count(),1);
    await page.reload(); await page.waitForFunction(() => typeof CARDS !== 'undefined' && CARDS.length && H3Auth.active);
    await openProject(page,project.id); await assertCompositeReferences(page,references([1]));

    // Refill the freed slot and every remaining supported slot. A ninth source
    // must be rejected without displacing any of the existing eight references.
    for (const i of [0,2,3,4,5,6,7]) {
      await page.evaluate(async id => { await linkTo(cardOf(id),cardOf('composite')); },sources[i].card.id);
    }
    await settle(page); await assertCompositeReferences(page,references([0,1,2,3,4,5,6,7]));
    const full = await saved();
    assert.equal(full.edges.length,8); assert.equal(new Set(full.edges.flatMap(e => e.slots)).size,8);
    await page.evaluate(async () => { await linkTo(cardOf('source-9'),cardOf('composite')); });
    await settle(page);
    const rejected = await saved();
    assert.deepEqual(rejected.edges,full.edges,'Ninth source must not replace any occupied edge');
    assert.deepEqual(rejected.cards.find(c => c.id === 'composite'),full.cards.find(c => c.id === 'composite'));
    await assertCompositeReferences(page,references([0,1,2,3,4,5,6,7]));
    await expect.poll(() => preview.evaluate(img => CARD_MEDIA.get(img)?.fullURL || img.getAttribute('src'))).toBe(output.url);
    assert.equal(await page.locator('#wires path.hit').count(),8);
    assert.equal(await page.locator('#world .card:not([data-id="composite"]) .composite-inputs').count(),0,'Strip is scoped to image_composite only');
    report.finalProject = rejected;
    await page.screenshot({path:path.join(folder,'eight-inputs.png'),fullPage:true});
    const audit = await api(page,'/__fixture/audit');
    assert.equal(audit.writes.filter(w => w.path === '/api/upload').length,10,'Nine real seed uploads plus one PNG export; asset-card links never reupload');
  });
});

test('image composer editor: wired layers auto-load once, thumbnails, preserved transforms and intentional deletion', {timeout:150000}, async t => {
  await referenceFixture(t,'chouka-image-composer-linked-layers-',async ({page,folder,report}) => {
    const {project,sources} = await referenceProject(page,4);
    report.project = project.id;
    const savedComposition = async () => (await api(page,`/api/projects/${project.id}`)).cards.find(c => c.id === 'composite').params.composition;
    const dialog = page.locator('dialog[data-image-composer]');
    const save = dialog.getByRole('button',{name:'保存编辑稿',exact:true});
    const filename = i => sources[i].card.outputs[0].origin || sources[i].card.outputs[0].filename;
    const layer = i => dialog.locator('.ic-layer-name').filter({hasText:filename(i)});
    async function open(count) {
      await page.evaluate(() => pick('composite'));
      await page.locator('#panel').getByRole('button',{name:'编辑合成',exact:true}).click();
      await expect(save).toBeEnabled(); await expect(dialog.locator('.ic-layer')).toHaveCount(count);
      await expect(dialog.locator('[role=alert]:not([hidden])')).toHaveCount(0);
    }
    async function close() { await dialog.getByRole('button',{name:'关闭',exact:true}).click(); await expect(dialog).toHaveCount(0); }
    async function saveClose() { await save.click(); await expect(save).toBeEnabled(); await settle(page); await close(); }
    async function thumbnailAndFilename(button, name) {
      await expect(button).toBeVisible();
      await expect(button.locator('.ic-asset-name')).toHaveText(name);
      const thumbnail = button.locator('.ic-thumbnail :is(img,canvas)').first();
      await expect(thumbnail).toBeVisible();
      await expect.poll(() => thumbnail.evaluate(node => node.tagName === 'CANVAS'
        ? node.width > 0 && node.height > 0 : node.complete && node.naturalWidth > 0)).toBe(true);
      const bounds = await button.evaluate(node => {
        const image = node.querySelector('.ic-thumbnail').getBoundingClientRect(), text = node.querySelector('.ic-asset-name').getBoundingClientRect();
        return {imageBottom:image.bottom,textTop:text.top};
      });
      assert.ok(bounds.textTop >= bounds.imageBottom - 1,'Filename is below the visible thumbnail, not replacing or covering it');
    }
    for (const source of sources.slice(0,2)) await page.evaluate(async id => { await linkTo(cardOf(id),cardOf('composite')); },source.card.id);
    await settle(page); await open(2);
    for (let i = 0; i < 2; i++) await thumbnailAndFilename(layer(i),filename(i));
    await expect(layer(2)).toHaveCount(0); await expect(layer(3)).toHaveCount(0,'Unwired canvas sources stay manual');
    for (let i = 0; i < 4; i++) {
      const source = dialog.locator('.ic-sources button').filter({hasText:filename(i)});
      await thumbnailAndFilename(source,filename(i));
    }
    // Edit actual layer controls, then prove the existing layer IDs and geometry
    // survive automatic merge/reopen rather than being rebuilt from input assets.
    await layer(0).click();
    await dialog.getByLabel('锁定宽高比',{exact:true}).uncheck();
    for (const [label,value] of [['X / px','17'],['Y / px','11'],['宽度 / px','24'],['高度 / px','16'],['角度 / °','23'],['透明度 / %','65']]) {
      await dialog.getByLabel(label,{exact:true}).fill(value); await dialog.getByLabel(label,{exact:true}).press('Tab');
    }
    await page.screenshot({path:path.join(folder,'wired-layers-and-source-thumbnails.png'),fullPage:true});
    await saveClose(); const initial = await savedComposition();
    assert.equal(initial.layers.length,2);
    const edited = initial.layers.find(item => item.asset.ref === sources[0].card.outputs[0].ref);
    assert.deepEqual({x:edited.x,y:edited.y,width:edited.width,height:edited.height,angle:edited.angle,opacity:edited.opacity},
      {x:17,y:11,width:24,height:16,angle:23,opacity:.65});
    await page.reload(); await page.waitForFunction(() => typeof CARDS !== 'undefined' && CARDS.length && H3Auth.active);
    await openProject(page,project.id); await open(2); await saveClose();
    assert.deepEqual((await savedComposition()).layers,initial.layers,'Reopening two wired images never duplicates layers or resets transforms');

    await page.evaluate(async () => { await linkTo(cardOf('source-3'),cardOf('composite')); }); await settle(page);
    await open(3); await thumbnailAndFilename(layer(2),filename(2)); await saveClose();
    const three = await savedComposition();
    for (const original of initial.layers) assert.deepEqual(three.layers.find(item => item.id === original.id),original,'Adding a new connected image retains previous layers exactly');
    assert.equal(three.layers.filter(item => item.asset.ref === sources[2].card.outputs[0].ref).length,1);
    await open(3); await saveClose();
    assert.deepEqual((await savedComposition()).layers,three.layers,'New third input is auto-added only once');

    await open(3); await layer(0).click();
    await dialog.getByRole('button',{name:'适应窗口',exact:true}).focus(); await page.keyboard.press('Delete');
    await expect(dialog.locator('.ic-layer')).toHaveCount(2); await saveClose();
    const deleted = await savedComposition();
    assert.equal(deleted.layers.some(item => item.asset.ref === sources[0].card.outputs[0].ref),false);
    assert.equal((await api(page,`/api/projects/${project.id}`)).edges.length,3,'Layer deletion does not disconnect the live input');
    await page.reload(); await page.waitForFunction(() => typeof CARDS !== 'undefined' && CARDS.length && H3Auth.active);
    await openProject(page,project.id); await open(2);
    await expect(layer(0)).toHaveCount(0,'An intentionally deleted wired layer must not resurrect after save/reload/reopen');
    await expect(layer(3)).toHaveCount(0,'Unwired fourth source is still not added automatically');
    await dialog.locator('.ic-sources button').filter({hasText:filename(3)}).click();
    await expect(dialog.locator('.ic-layer')).toHaveCount(3); await thumbnailAndFilename(layer(3),filename(3));
    await saveClose(); const manual = await savedComposition();
    assert.equal(manual.layers.filter(item => item.asset.ref === sources[3].card.outputs[0].ref).length,1,'Standalone source is added only by its source button');
    for (const original of deleted.layers) assert.deepEqual(manual.layers.find(item => item.id === original.id),original);
    await open(3); await expect(layer(0)).toHaveCount(0); await close();
    report.initial = initial; report.three = three; report.deleted = deleted; report.manual = manual;
    const audit = await api(page,'/__fixture/audit');
    assert.equal(audit.writes.filter(w => w.path === '/api/upload').length,4,'Automatic/manual layer addition reuses real resources without reuploading');
  });
});

test('image composer inputs: concurrent real imports reserve distinct slots while first upload is pending', {timeout:120000}, async t => {
  await referenceFixture(t,'chouka-image-composer-concurrent-',async ({page,folder,report}) => {
    const {project,sources} = await referenceProject(page,2,true);
    report.project = project.id; report.sources = sources;
    const before = await api(page,'/__fixture/audit');
    assert.equal(before.writes.filter(w => w.path === '/api/upload').length,2,'Real source seeding is counted separately from imports');
    let release, stalled = 0;
    const gate = new Promise(resolve => { release = resolve; });
    const imports = [], downloads = [];
    page.on('request', request => {
      const url = new URL(request.url());
      if (request.method() === 'POST' && url.pathname === '/api/upload') imports.push({path:url.pathname,query:Object.fromEntries(url.searchParams)});
      if (request.method() === 'GET' && request.resourceType() === 'fetch' && sources.some(s => new URL(s.card.outputs[0].url,page.url()).href === request.url())) downloads.push(url.pathname);
    });
    // Intercept timing only: continue the actual multipart upload to the real
    // server after releasing the promise. No mocked resource/import responses.
    await page.route('**/api/upload?*',async route => {
      if (route.request().method() === 'POST' && ++stalled === 1) await gate;
      await route.continue();
    });
    try {
      await page.evaluate(() => { window.composerLinks = [linkTo(cardOf('source-1'),cardOf('composite'))]; });
      await expect.poll(() => stalled).toBe(1);
      assert.equal(await page.evaluate(() => !!cardOf('composite').assets['images[0]']),false,'First real upload is still held before its asset exists');
      await assertCompositeReferences(page,[],['images[0]']);
      await page.evaluate(() => { window.composerLinks.push(linkTo(cardOf('source-2'),cardOf('composite'))); });
      await expect.poll(() => page.evaluate(() => !!cardOf('composite').assets['images[1]']),{timeout:15000}).toBe(true);
      await page.evaluate(async () => { await window.composerLinks[1]; });
      const pending = await page.evaluate(() => ({edges:structuredClone(PROJ.edges),assets:plain(cardOf('composite')).assets}));
      assert.deepEqual(pending.edges.map(e => ({from:e.from,slot:e.slot,slots:e.slots})),[
        {from:'source-1',slot:'images[0]',slots:['images[0]']},
        {from:'source-2',slot:'images[1]',slots:['images[1]']},
      ],'Incoming edge reservations, not just populated assets, determine the next slot');
      assert.equal('images[0]' in pending.assets,false);
      assert.ok(pending.assets['images[1]']?.ref,'Second import completes without waiting for the first upload');
      await assertCompositeReferences(page,[{slot:'images[1]',asset:pending.assets['images[1]'],rgb:sources[1].rgb}],['images[0]']);
      assert.equal(await page.locator('#wires path.hit').count(),2);
      report.pending = pending;
      await page.screenshot({path:path.join(folder,'first-upload-pending.png'),fullPage:true});
      release();
      await page.evaluate(async () => { await Promise.all(window.composerLinks); }); await settle(page);
      const saved = await api(page,`/api/projects/${project.id}`), composite = saved.cards.find(c => c.id === 'composite');
      assert.deepEqual(saved.edges,pending.edges,'First upload finishing must preserve both original edge owners');
      assert.deepEqual(Object.keys(composite.assets).sort(),['images[0]','images[1]']);
      assert.notEqual(composite.assets['images[0]'].ref,composite.assets['images[1]'].ref,'Distinct imports must not overwrite the same slot');
      const expected = sources.map((source,i) => ({slot:`images[${i}]`,asset:composite.assets[`images[${i}]`],rgb:source.rgb}));
      for (const [i,source] of sources.entries()) {
        const response = await page.request.get(new URL(composite.assets[`images[${i}]`].url,page.url()).href);
        assert.equal(response.status(),200); assert.deepEqual(await response.body(),solidPNG(...source.rgb));
      }
      await assertCompositeReferences(page,expected); await assertCompositePanelOpen(page,['images[0]','images[1]']);
      await page.reload(); await page.waitForFunction(() => typeof CARDS !== 'undefined' && CARDS.length && H3Auth.active);
      await openProject(page,project.id); await assertCompositeReferences(page,expected);
      assert.deepEqual((await api(page,`/api/projects/${project.id}`)).edges,saved.edges);
      assert.equal(imports.length,2,'Exactly two real import uploads, excluding the two API seed uploads');
      for (const upload of imports) assert.deepEqual(upload.query,{project:project.id,local_only:'1'});
      for (const source of sources) assert.ok(downloads.includes(new URL(source.card.outputs[0].url,page.url()).pathname),'Generation-like source goes through real importOutput download');
      const audit = await api(page,'/__fixture/audit');
      assert.equal(audit.writes.filter(w => w.path === '/api/upload').length,4,'Two source uploads and two completed import uploads');
      report.imports = imports; report.downloads = downloads; report.finalProject = saved;
      await page.screenshot({path:path.join(folder,'both-imports-preserved.png'),fullPage:true});
    } finally { release(); }
  });
});

test('image composer backend guard and real read-only ACL (intentional rejected generate is separate)', {timeout:90000}, async t => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(),'chouka-image-composer-acl-'));
  const report = {folder,browserOutbound:[],pageErrors:[]};
  t.diagnostic('Isolated ACL evidence: ' + folder);
  let fixture, browser, page;
  try {
    fixture = await bootFixture(folder);
    const launched = await launch(fixture,report); browser = launched.browser;
    page = await loadPage(launched.context,fixture,report);
    const project = await api(page,'/api/projects','POST',{name:'合成只读权限验收'});
    const composition = {version:1,width:64,height:48,background:'transparent',layers:[]};
    await api(page,`/api/projects/${project.id}/cards`,'POST',{card:compositeCard(composition)});
    await openProject(page,project.id);
    // This is an explicit adversarial API request, NOT part of the no-generate UI flow.
    const rejected = await page.evaluate(async id => {
      // H3Auth supplies the production CSRF header; never manufacture auth cookies.
      try { await H3Auth.json('/api/generate','POST',{project:id,card:'composite',capability:'image_composite',params:{},assets:{}}); return {accepted:true}; }
      catch (error) { return {status:error.status,message:error.message}; }
    },project.id);
    assert.equal(rejected.status,400,JSON.stringify(rejected)); assert.match(rejected.message,/浏览器/);
    const before = await api(page,`/api/projects/${project.id}`);
    const reader = await browser.newContext({viewport:{width:1600,height:1100}});
    await guardNetwork(reader,fixture.origin,report); await login(reader,fixture.origin,'composer-reader');
    const readerPage = await loadPage(reader,fixture,report); await openProject(readerPage,project.id);
    assert.equal(await readerPage.evaluate(() => PROJ.permission),'read','Use actual persisted AuthStore grant, not a mocked UI flag');
    await readerPage.evaluate(() => openImageComposer(cardOf('composite')));
    await expect(readerPage.locator('dialog[data-image-composer]')).toHaveCount(0,'App refuses to open a writable editor for a read-only user');
    // Also exercise the standalone module with the real permission callback.
    await readerPage.evaluate(async state => {
      window.composerReadonlyCallbacks = [];
      await ChoukaImageComposer.open({state,sources:[],canEdit:() => canOperate(),
        upload:async () => { window.composerReadonlyCallbacks.push('upload'); throw new Error('Readonly upload callback invoked'); },
        onSave:async () => { window.composerReadonlyCallbacks.push('save'); throw new Error('Readonly save callback invoked'); },
        onExport:async () => { window.composerReadonlyCallbacks.push('export'); throw new Error('Readonly export callback invoked'); }});
    },composition);
    const readonly = readerPage.locator('dialog[data-image-composer]');
    await expect(readonly).toBeVisible();
    await expect(readonly.getByRole('button',{name:'保存编辑稿',exact:true})).toBeDisabled();
    await expect(readonly.getByRole('button',{name:'合成 PNG',exact:true})).toBeDisabled();
    await readonly.getByRole('button',{name:'关闭',exact:true}).focus();
    await readerPage.keyboard.press('Delete'); await readerPage.keyboard.press('Control+z');
    assert.deepEqual(await readerPage.evaluate(() => window.composerReadonlyCallbacks),[]);
    const denied = await readerPage.evaluate(async ({id,rev,cards}) => {
      try { await H3Auth.json('/api/projects/' + id,'PUT',{rev,cards,edges:[],groups:[]}); return {accepted:true}; }
      catch (error) { return {status:error.status,message:error.message}; }
    },{id:project.id,rev:before.rev,cards:before.cards.map(c => ({...c,params:{composition:{...composition,width:999}}}))});
    assert.equal(denied.status,403,JSON.stringify(denied));
    const anonymous = await browser.newContext(); await guardNetwork(anonymous,fixture.origin,report);
    const unauthorized = await anonymous.request.get(fixture.origin + `/api/projects/${project.id}`);
    assert.equal(unauthorized.status(),401);
    assert.deepEqual((await api(page,`/api/projects/${project.id}`)).cards,before.cards,'No readonly or unauthenticated save changes the persisted draft');
    const audit = await api(page,'/__fixture/audit'); report.audit = audit;
    assertIsolation(audit,report,folder);
    assert.equal(audit.writes.filter(w => w.path === '/api/generate').length,1,'Only the deliberate rejection probe calls generate');
    assert.equal(audit.writes.filter(w => w.path === '/api/upload').length,0);
  } catch (error) {
    report.error = error.stack; throw error;
  } finally {
    fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2));
    try { if (browser) await browser.close(); } finally { if (fixture) await fixture.stop(); }
  }
});
