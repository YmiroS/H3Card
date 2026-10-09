'use strict';
// NODE_PATH=../temp/chouka-preview-test/node_modules CHOUKA_TEST_BROWSER=msedge node --test tests/test_clipboard_media.cjs
// Full production app.js + isolated real aiohttp/auth/resource/upload/card-create routes.
// PNG screenshots use the OS clipboard and trusted Control+V. File cases explicitly
// use synthetic ClipboardEvent/DataTransfer; they do NOT claim Explorer CF_HDROP coverage.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn, execFileSync} = require('node:child_process');
const {once} = require('node:events');
const {chromium, expect} = require('playwright/test');
const ROOT = path.resolve(__dirname, '..');
const embedded = path.resolve(ROOT, '../python_embeded/python.exe');
const PYTHON = process.env.CHOUKA_TEST_PYTHON || (fs.existsSync(embedded) ? embedded : 'python3');
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
    root = host.ROOT
    host.ROOT = real
    try:
        return original_load_caps()
    finally:
        host.ROOT = root
host.load_caps = load_real_caps
host.ROOT = isolated
host.PROJ_DIR = isolated / 'data' / 'projects'
host.JOBS_FILE = isolated / 'data' / 'jobs.json'
host.ARTIFACT_DIR = isolated / 'data' / 'artifacts'
host.COMFY_INPUT = isolated / 'comfy-input'
host.COMFY_INPUT.mkdir(parents=True)
(isolated / 'pricing.json').write_bytes((real / 'pricing.json').read_bytes())
host.JOBS.clear()
host.register_auth_routes = lambda application, _: register_auth_routes(application, real / 'web')
async def index(request):
    host.require_user(request)
    return web.FileResponse(real / 'web' / 'index.html')
async def static_asset(request, *, name):
    return web.FileResponse(real / 'web' / name)
host.index = index
host.static_asset = static_asset
audit = {'writes': [], 'outbound': []}
async def reject_outbound(session, context, params):
    audit['outbound'].append(str(params.url))
    raise RuntimeError('Clipboard fixture prohibits outbound HTTP: ' + str(params.url))
async def isolated_start(application):
    application['auth_store'] = await asyncio.to_thread(AuthStore, application['auth_path'])
    application['resource_access'] = ResourceAccess(application['auth_store'], isolated, host.COMFY_INPUT)
    trace = TraceConfig()
    trace.on_request_start.append(reject_outbound)
    application['session'] = ClientSession(trace_configs=[trace])
    await asyncio.to_thread(application['auth_store'].create_user, 'clipboard-test', 'Clipboard-test-password-123', role='admin')
    await asyncio.to_thread(application['auth_store'].set_ready)
host.on_start = isolated_start
@web.middleware
async def observe(request, handler):
    if request.method not in ('GET', 'HEAD', 'OPTIONS'):
        audit['writes'].append({'method': request.method, 'path': str(request.rel_url),
                                'content_type': request.content_type})
    return await handler(request)
async def fixture_audit(request):
    return web.json_response({**audit, 'jobs': list(host.JOBS), 'root': str(host.ROOT)})
async def main():
    application = host.make_app(auth_path=isolated / 'data' / 'auth-local-test.db')
    application.middlewares.insert(0, observe)
    application.router.add_get('/__fixture/audit', fixture_audit)
    runner = web.AppRunner(application, access_log=None)
    await runner.setup()
    site = web.TCPSite(runner, '127.0.0.1', 0)
    await site.start()
    port = site._server.sockets[0].getsockname()[1]
    print('CLIPBOARD_READY ' + json.dumps({'origin': 'http://127.0.0.1:' + str(port)}), flush=True)
    try:
        await asyncio.to_thread(sys.stdin.readline)
    finally:
        await runner.cleanup()
asyncio.run(main())
`;
async function bootFixture(folder) {
  const child = spawn(PYTHON, ['-u', '-c', BOOT, ROOT, folder], {
    cwd: ROOT, windowsHide: true, stdio:['pipe','pipe','pipe'],
    env:{...process.env, PYTHONIOENCODING:'utf-8', CHOUKA_LOCAL_TEST:'0',
      CHOUKA_EXECUTION_MODE:'controller', CHOUKA_PORT:'0', CHOUKA_AUTH_DB:'', CHOUKA_AUTH_ORIGIN:'',
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
    function check() { const match = log.match(/CLIPBOARD_READY (\{[^\r\n]+\})/); if (match) finish(null, JSON.parse(match[1])); }
    function exited(code) { finish(new Error(`Fixture exited ${code}\n${log}`)); }
    function failed(error) { finish(error); }
    child.stdout.on('data', check); child.once('exit', exited); child.once('error', failed); check();
  });
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

// Real small PNG/JPEG/MP4 bytes, encoded in memory; all application writes stay in os.tmpdir().
function makeMedia() {
  const bundled = path.resolve(ROOT, '../python_embeded/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');
  const ffmpeg = process.env.CHOUKA_TEST_FFMPEG || (fs.existsSync(bundled) ? bundled : 'ffmpeg');
  const encode = args => execFileSync(ffmpeg, ['-nostdin','-v','error', ...args], {windowsHide:true, timeout:30000});
  const image = format => encode(['-f','lavfi','-i','color=c=blue:size=64x48','-frames:v','1',
    '-c:v',format === 'png' ? 'png' : 'mjpeg','-f','image2pipe','pipe:1']);
  const png = image('png'), jpg = image('jpg');
  const video = encode(['-f','lavfi','-i','testsrc2=size=64x48:rate=5:duration=0.4',
    '-c:v','libx264','-pix_fmt','yuv420p','-movflags','frag_keyframe+empty_moov','-f','mp4','pipe:1']);
  return {png, jpg, video};
}

test('parameter panel clipboard media: real Edge, native PNG Ctrl+V, synthetic file paste', {timeout:600000}, async t => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'chouka-clipboard-media-'));
  const report = {folder, cases:[], pageErrors:[], pasteEvents:[]};
  t.diagnostic('Isolated fixture / evidence: ' + folder);
  const media = makeMedia();
  let fixture, browser, context, page, project, target, baseline, requests = [];
  async function api(url, method = 'GET', data) {
    return page.evaluate(async ({url, method, data}) => method === 'GET'
      ? H3Auth.request(url) : H3Auth.json(url, method, data), {url, method, data});
  }
  async function state() {
    return page.evaluate(() => ({project:PROJ && {id:PROJ.id, cards:PROJ.cards.map(plain), edges:PROJ.edges},
      selected:selId, selection:[...selIds], panel:el.panel._id, panelDisplay:getComputedStyle(el.panel).display,
      notice:el.toast.textContent, pending:pendingNodeWork.size, creates:pendingCardCreates}));
  }
  async function settle() {
    await expect.poll(() => page.evaluate(() => pendingNodeWork.size + pendingCardCreates + pendingContentSaves +
      Number(contentSaving) + Number(saveTimer !== null)), {timeout:15000}).toBe(0);
    await page.evaluate(async () => { await saveChain; });
  }
  async function reset({type='card_image', cap='zimage_t2i', fill=0, edgeOnly=false, editor=false} = {}) {
    if (page) await page.close();
    page = await context.newPage(); requests = [];
    page.on('request', req => { if (req.method() !== 'GET') requests.push({url:new URL(req.url()).pathname,
      query:new URL(req.url()).search, method:req.method(), type:req.headers()['content-type'] || ''}); });
    page.on('pageerror', error => report.pageErrors.push(error.stack));
    await page.goto(fixture.origin);
    await page.waitForFunction(() => typeof CARDS !== 'undefined' && CARDS.length && H3Auth.active);
    project = await api('/api/projects', 'POST', {name:'Clipboard isolated test'});
    target = {id:'target', name:'活动目标', type, cap, x:420, y:180, params:{prompt:'原文字'}, assets:{}, outputs:[]};
    await api(`/api/projects/${project.id}/cards`, 'POST', {card:target});
    const slots = await page.evaluate(cap => (CAPS[cap]?.inputs || []).filter(s => ['image','video','audio'].includes(s.type)), cap);
    if (fill || edgeOnly) {
      // Existing references are uploaded through the real multipart resource API, not invented refs.
      const upload = await page.evaluate(async b64 => {
        const blob = await (await fetch('data:image/png;base64,' + b64)).blob();
        const form = new FormData(); form.append('file', blob, 'existing.png');
        return H3Auth.request('/api/upload?project=' + window.seedProjectId, {method:'POST',body:form});
      }, await (async () => { await page.evaluate(id => { window.seedProjectId = id; }, project.id); return media.png.toString('base64'); })());
      const out = {...upload.files[0], filename:'existing.png'};
      await api(`/api/projects/${project.id}/cards`, 'POST', {card:{id:'existing',type:'card_asset',cap:'asset',
        name:'原素材',x:60,y:180,params:{},assets:{},outputs:[out]}});
      const saved = await api(`/api/projects/${project.id}`);
      const dest = saved.cards.find(c => c.id === 'target');
      const count = edgeOnly ? 1 : fill === 'all' ? slots.length : fill;
      for (const s of slots.slice(0,count)) {
        if (!edgeOnly) dest.assets[s.key] = {...out,kind:s.type};
        saved.edges.push({from:'existing',to:'target',slot:s.key,slots:[s.key]});
      }
      await api(`/api/projects/${project.id}`, 'PUT', {rev:saved.rev,cards:saved.cards,edges:saved.edges,groups:[]});
    }
    await page.evaluate(async id => { await loadProjects(); await openProject(id); pick('target'); }, project.id);
    if (editor) {
      await page.goto(fixture.origin + `/?editor=1&project=${project.id}&card=target`);
      await page.waitForFunction(() => typeof editorCard === 'function' && editorCard() && el.panel._id === 'target');
    }
    await expect(page.locator('#panel')).toBeVisible();
    await page.evaluate(() => document.activeElement?.blur());
    baseline = await state(); requests = [];
    return slots;
  }
  const uploads = () => requests.filter(r => r.url === '/api/upload' && r.method === 'POST');
  const creates = () => requests.filter(r => /\/cards$/.test(r.url) && r.method === 'POST');
  async function synthetic(files, selector = '#panel') {
    return page.evaluate(({files,selector}) => {
      const transfer = new DataTransfer();
      for (const file of files) transfer.items.add(new File([Uint8Array.from(atob(file.data), c => c.charCodeAt(0))],
        file.name,{type:file.type || ''}));
      const event = new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:transfer});
      document.querySelector(selector).dispatchEvent(event);
      return {prevented:event.defaultPrevented,trusted:event.isTrusted,types:[...transfer.types]};
    }, {files,selector});
  }
  function file(kind='png', name, type) {
    return {data:media[kind].toString('base64'),name:name || (kind === 'video' ? 'copied.mp4' : 'copied.' + kind),
      type:type === undefined ? {png:'image/png',jpg:'image/jpeg',video:'video/mp4'}[kind] : type};
  }
  async function nativeScreenshot(keepFocus = false) {
    await page.bringToFront();
    await page.evaluate(async ({b64,keepFocus}) => {
      const blob = await (await fetch('data:image/png;base64,' + b64)).blob();
      await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
      if (!keepFocus) document.activeElement?.blur();
    }, {b64:media.png.toString('base64'),keepFocus});
    const before = await page.evaluate(() => window.clipboardEvidence.length);
    await page.keyboard.press('Control+v');
    await expect.poll(() => page.evaluate(() => window.clipboardEvidence.length)).toBeGreaterThan(before);
    const event = await page.evaluate(() => window.clipboardEvidence.at(-1));
    report.pasteEvents.push(event);
    assert.equal(event.trusted, true, 'Must test actual trusted native paste, not dispatchEvent');
    assert.ok(event.files.some(f => f.type === 'image/png'), JSON.stringify(event));
  }
  async function unchanged({uploadCount=0, createCount=0} = {}) {
    await settle();
    const actual = await state();
    assert.deepEqual(actual.project.cards, baseline.project.cards, 'Rejected paste must not leave visible/empty/orphan cards');
    assert.deepEqual(actual.project.edges, baseline.project.edges, 'Rejected paste must not overwrite/discard references');
    assert.equal(uploads().length, uploadCount, 'Refuse unavailable slots before uploading');
    assert.equal(creates().length, createCount);
  }
  async function imported(kinds, expectedCap) {
    await settle();
    const actual = await state(), dest = actual.project.cards.find(c => c.id === 'target');
    const added = actual.project.cards.filter(c => !baseline.project.cards.some(old => old.id === c.id));
    assert.equal(added.length,kinds.length);
    assert.equal(uploads().length,kinds.length); assert.equal(creates().length,kinds.length);
    assert.equal(actual.selected,'target'); assert.deepEqual(actual.selection,baseline.selection); assert.equal(actual.panel,'target');
    if (expectedCap) assert.equal(dest.cap,expectedCap);
    const specs = await page.evaluate(id => CAPS[id].inputs, dest.cap);
    const priorSlots = new Set(baseline.project.edges.filter(e => e.to === 'target').flatMap(e => e.slots || [e.slot]));
    const free = specs.filter(s => !baseline.project.cards.find(c => c.id === 'target').assets[s.key] && !priorSlots.has(s.key));
    for (const [i,c] of added.entries()) {
      assert.equal(c.type,'card_asset'); assert.equal(c.outputs.length,1); assert.equal(c.outputs[0].kind,kinds[i]);
      assert.ok(c.outputs[0].ref); assert.ok(c.outputs[0].url);
      const edge = actual.project.edges.find(e => e.from === c.id && e.to === 'target');
      assert.ok(edge, 'Uploaded card must actually connect to the active target');
      const spec = free.find(s => s.type === kinds[i]); assert.ok(spec); free.splice(free.indexOf(spec),1);
      assert.equal(edge.slot,spec.key,'Exact first safe free slot');
      assert.equal(specs.find(s => s.key === edge.slot).type,kinds[i], 'Never put video in image ref');
      assert.equal(dest.assets[edge.slot].ref,c.outputs[0].ref);
      assert.equal(dest.assets[edge.slot].kind,kinds[i]);
      const response = await page.request.get(fixture.origin + c.outputs[0].url);
      assert.ok(response.ok(), 'Real uploaded media must be accessible with the real session');
      if (kinds[i] === 'video') assert.deepEqual(await response.body(),media.video);
    }
    for (const [slot,value] of Object.entries(baseline.project.cards.find(c => c.id === 'target').assets)) {
      assert.deepEqual(dest.assets[slot],value,'Occupied refs must remain byte-for-byte unchanged');
    }
    for (const edge of baseline.project.edges) assert.ok(actual.project.edges.some(e => JSON.stringify(e) === JSON.stringify(edge)));
    assert.ok(uploads().every(r => /^multipart\/form-data; boundary=/.test(r.type)));
    assert.ok(uploads().every(r => r.query === '?project=' + project.id));
    const saved = await api(`/api/projects/${project.id}`);
    assert.deepEqual(saved.edges,actual.project.edges,'Real saved edges, not DOM-only links');
    for (const c of added) assert.deepEqual(saved.cards.find(s => s.id === c.id).outputs,c.outputs);
  }
  async function hold(endpoint, action) {
    let release, hit;
    const gate = new Promise(resolve => { release = resolve; });
    const reached = new Promise(resolve => { hit = resolve; });
    let handledResolve, handledError, started = false;
    const handled = new Promise(resolve => { handledResolve = resolve; });
    const pattern = endpoint === 'upload' ? '**/api/upload?*' : '**/api/projects/*/cards';
    const handler = async route => {
      started = true;
      try {
        // Hold a response from the REAL endpoint, never manufacture successful JSON.
        const response = await route.fetch(); hit(); await gate;
        await route.fulfill({response});
      } catch (error) { handledError = error; }
      finally { handledResolve(); }
    };
    await page.route(pattern,handler);
    try {
      await synthetic([file()]);
      await Promise.race([reached,new Promise((_,reject) => {
        const timer = setTimeout(() => reject(new Error('Paste never reached real ' + endpoint)),8000);
        reached.then(() => clearTimeout(timer));
      })]);
      await action();
    } finally {
      release(); if (started) await handled;
      await page.unroute(pattern,handler);
    }
    if (handledError) throw handledError;
    await settle();
  }
  async function check(name, action) {
    await t.test(name, {timeout:45000, skip:process.env.CHOUKA_CLIPBOARD_CASE && !name.includes(process.env.CHOUKA_CLIPBOARD_CASE)}, async () => {
      const errorStart = report.pageErrors.length;
      try {
        await action(); assert.deepEqual(report.pageErrors.slice(errorStart),[], 'No uncaught browser errors');
        report.cases.push({name,status:'passed'});
      } catch (error) {
        report.cases.push({name,status:'failed',error:error.stack,state:page && !page.isClosed() ? await state().catch(() => null) : null});
        if (page && !page.isClosed()) await page.screenshot({path:path.join(folder,`failure-${report.cases.length}.png`),fullPage:true}).catch(() => {});
        throw error;
      } finally {
        fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2));
      }
    });
  }
  try {
    fixture = await bootFixture(folder);
    browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
    context = await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
    // Controller uploads do not call a GPU/ComfyUI server. Authenticate through the
    // real cookie/CSRF login flow; no local-test guard or identity is overridden.
    const login = await context.request.post(fixture.origin + '/api/auth/login', {
      headers:{Origin:fixture.origin}, data:{username:'clipboard-test',password:'Clipboard-test-password-123'},
    });
    assert.equal(login.status(),200,await login.text());
    await context.addInitScript(() => {
      window.clipboardEvidence = [];
      document.addEventListener('paste', event => {
        window.clipboardEvidence.push({trusted:event.isTrusted,files:[...(event.clipboardData?.files || [])].map(f => ({name:f.name,type:f.type})),
          types:[...(event.clipboardData?.types || [])]});
      }, true);
    });
    await check('native screenshot Ctrl+V beats existing copied-node CLIP without duplicating it', async () => {
      await reset();
      await page.keyboard.press('Control+c');
      assert.equal(await page.evaluate(() => CLIP?.type),'card_image');
      await nativeScreenshot(); await imported(['image'],'zimage_i2i');
      await expect(page.locator('#panel .clipboard-media-hint')).toBeVisible();
    });
    await check('native screenshot Ctrl+V while parameter textarea focused imports image, not text',async () => {
      await reset(); const input = page.locator('#panel textarea').first(); await input.focus();
      const text = await input.inputValue(); await nativeScreenshot(true); await imported(['image'],'zimage_i2i');
      assert.equal(await page.locator('#panel textarea').first().inputValue(),text);
    });
    for (const kind of ['png','jpg']) await check(`synthetic copied ${kind} file with empty MIME uses extension`,async () => {
      await reset(); const event = await synthetic([file(kind,'copied.' + kind.toUpperCase(),'')]);
      assert.equal(event.trusted,false); assert.equal(event.prevented,true); await imported(['image'],'zimage_i2i');
    });
    await check('synthetic known image MIME with unsupported extension normalizes upload filename',async () => {
      await reset(); await synthetic([file('png','clipboard.bin','image/png')]); await imported(['image'],'zimage_i2i');
      const actual = await state();
      assert.equal(actual.project.cards.find(c => c.type === 'card_asset').outputs[0].origin,'clipboard.bin.png');
    });
    await check('synthetic MP4 file has video output, video reference and exact edge',async () => {
      await reset({type:'card_video',cap:'minimax_h3_ref9'}); await synthetic([file('video')]); await imported(['video']);
    });
    await check('serial batch fills distinct firstFree slots, preserving an occupied reference',async () => {
      await reset({type:'card_video',cap:'minimax_h3_ref4',fill:1});
      await synthetic([file('png','one.png'),file('jpg','two.jpg')]); await imported(['image','image']);
      const order = requests.filter(r => r.url === '/api/upload' || /\/cards$/.test(r.url)).map(r => r.url === '/api/upload' ? 'upload' : 'create');
      assert.deepEqual(order,['upload','create','upload','create'],'Each file must finish creation before next upload');
    });
    await check('parallel paste events cannot overwrite the same free slot',async () => {
      await reset({type:'card_video',cap:'minimax_h3_ref4'});
      await Promise.all([synthetic([file('png','first.png')]),synthetic([file('png','second.png')])]);
      await imported(['image','image']);
    });
    await check('clipboard upload drains older queued saves before creating a material, preserving latest unsaved prompt without 409',async () => {
      await reset();
      const endpoint = `/api/projects/${project.id}`;
      const pattern = fixture.origin + endpoint;
      const conflicts = [];
      const observeResponse = response => {
        if (new URL(response.url()).pathname === endpoint && response.status() === 409) conflicts.push(response.status());
      };
      page.on('response',observeResponse);
      let release, firstHeld = false, firstStarted = false, finish, routeError;
      const gate = new Promise(resolve => { release = resolve; });
      const handled = new Promise(resolve => { finish = resolve; });
      const handler = async route => {
        if (route.request().method() !== 'PUT' || firstStarted) return route.continue();
        firstStarted = true;
        try {
          // Commit the first PUT on the real server but withhold its response, so
          // the textarea's second doSave remains queued on the production saveChain.
          const response = await route.fetch();
          assert.equal(response.status(),200,await response.text());
          firstHeld = true;
          await gate;
          await route.fulfill({response});
        } catch (error) { routeError = error; }
        finally { finish(); }
      };
      await page.route(pattern,handler);
      try {
        await page.evaluate(() => {
          cardOf('target').params.prompt = 'first'; openPanel('target'); enqueueSave();
        });
        await expect.poll(() => firstHeld,{timeout:10000}).toBe(true);
        const input = page.locator('#panel textarea').first();
        await expect(input).toHaveValue('first');
        await input.fill('LATEST UNSAVED EDIT');
        await expect.poll(() => page.evaluate(() => ({pending:pendingContentSaves,timer:saveTimer === null})),
          {timeout:10000}).toEqual({pending:2,timer:true});
        const uploaded = page.waitForResponse(response => new URL(response.url()).pathname === '/api/upload' &&
          response.request().method() === 'POST',{timeout:10000});
        await nativeScreenshot(true);
        const response = await uploaded;
        assert.equal(response.status(),200,await response.text());
        await response.finished();
        // Let the real fetch/json continuation run before inspecting provisional cards.
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.equal(firstHeld,true);
        assert.equal(uploads().length,1);
        assert.equal(creates().length,0,'No card-create request while older saves are blocked');
        const blocked = await state();
        assert.equal(blocked.project.cards.length,1,'Do not expose an uncreated local material to the queued doSave');
        assert.deepEqual(blocked.project.edges,[]);
        assert.equal(blocked.project.cards[0].params.prompt,'LATEST UNSAVED EDIT');
        assert.equal(await page.locator('#world .card').count(),1);
        assert.equal(await page.evaluate(() => pendingContentSaves),2);
      } finally {
        release(); if (firstStarted) await handled;
        await page.unroute(pattern,handler);
      }
      try {
        if (routeError) throw routeError;
        await imported(['image'],'zimage_i2i');
        const actual = await state(), saved = await api(endpoint);
        assert.deepEqual(conflicts,[],'Queued saves and clipboard creation must never cause HTTP 409');
        assert.equal(actual.project.cards.find(c => c.id === 'target').params.prompt,'LATEST UNSAVED EDIT');
        assert.equal(saved.cards.find(c => c.id === 'target').params.prompt,'LATEST UNSAVED EDIT');
        assert.equal(saved.cards.filter(c => c.type === 'card_asset').length,1);
        assert.equal(saved.edges.length,1);
        assert.equal(Object.keys(saved.cards.find(c => c.id === 'target').assets).length,1);
        await expect(page.locator('#panel textarea').first()).toHaveValue('LATEST UNSAVED EDIT');
        report.queuedSaveRegression = {conflicts,uploadCount:uploads().length,createCount:creates().length,
          prompt:saved.cards.find(c => c.id === 'target').params.prompt,edges:saved.edges};
      } finally { page.off('response',observeResponse); }
    });
    await check('full slots reject before HTTP upload',async () => {
      await reset({cap:'zimage_i2i',fill:'all'}); await synthetic([file()]); await unchanged();
    });
    await check('batch exceeding all remaining capacity rejects the entire batch before upload',async () => {
      await reset({cap:'zimage_i2i'}); await synthetic([file('png','one.png'),file('png','two.png')]); await unchanged();
    });
    await check('edge-owned slot without asset value is occupied, not silently overwritten',async () => {
      await reset({cap:'zimage_i2i',edgeOnly:true}); await synthetic([file()]); await unchanged();
    });
    await check('no matching video slot rejects before upload',async () => {
      await reset(); await synthetic([file('video')]); await unchanged();
    });
    await check('video switches empty i2v target only to an actual video-input mode',async () => {
      await reset({type:'card_video',cap:'minimax_h3_flf2v'}); await synthetic([file('video')]); await imported(['video']);
    });
    await check('video mode switch cannot delete existing i2v image refs/edges',async () => {
      await reset({type:'card_video',cap:'minimax_h3_flf2v',fill:1}); await synthetic([file('video')]); await unchanged();
    });
    await check('empty image enhancement route switches to video safely',async () => {
      await reset({type:'card_tools',cap:'seedvr2_image_up'}); await synthetic([file('video')]); await imported(['video'],'seedvr2_video_up');
    });
    await check('occupied enhancement route never discards the existing image ref',async () => {
      await reset({type:'card_tools',cap:'seedvr2_image_up',fill:1}); await synthetic([file('video')]); await unchanged();
    });
    for (const endpoint of ['upload','create']) {
      for (const change of ['same-id-new-object','other-project','target-switch','target-delete','cap-change','readonly','auth-expire']) {
        await check(`${change} during real ${endpoint} cannot link stale target`,async () => {
          await reset();
          if (change === 'target-switch') {
            await api(`/api/projects/${project.id}/cards`,'POST',{card:{id:'second',type:'card_image',cap:'zimage_t2i',
              x:800,y:180,params:{},assets:{},outputs:[]}});
            await page.evaluate(async id => { await openProject(id); pick('target'); },project.id);
            baseline = await state(); requests = [];
          }
          await hold(endpoint,async () => {
            if (change === 'same-id-new-object') await page.evaluate(() => {
              PROJ = {...PROJ,cards:PROJ.cards.map(c => ({...plain(c)})),edges:structuredClone(PROJ.edges)}; render(); pick('target');
            });
            else if (change === 'other-project') {
              const next = await api('/api/projects','POST',{name:'Other clipboard target'});
              await page.evaluate(id => openProject(id),next.id);
            } else if (change === 'target-switch') {
              await page.evaluate(() => pick('second'));
            } else if (change === 'target-delete') await page.evaluate(() => delCard('target'));
            else if (change === 'cap-change') await page.evaluate(() => { cardOf('target').cap = 'zimage_i2i'; openPanel('target'); });
            else if (change === 'readonly') await page.evaluate(() => { PROJ.permission = 'read'; syncPermissionUI(); });
            else await page.evaluate(() => window.dispatchEvent(new Event('h3auth:expired')));
          });
          const actual = await state();
          assert.equal(actual.project?.edges.some(e => e.to === 'target') || false,false,'No reference after context invalidation');
          assert.equal(actual.project?.cards.find(c => c.id === 'target')?.assets && Object.keys(actual.project.cards.find(c => c.id === 'target').assets).length || 0,0);
          if (endpoint === 'upload') assert.equal(creates().length,0,'Recheck before creating any node');
          if (change === 'target-delete') assert.equal(actual.project?.cards.some(c => c.id === 'target'),false,'Create reconciliation must not resurrect deleted target');
          if (change === 'target-switch') { assert.equal(actual.selected,'second'); assert.equal(actual.panel,'second'); }
          if (change === 'readonly') assert.equal(await page.evaluate(() => PROJ.permission),'read','Create response must not restore stale permission');
          const saved = await api(`/api/projects/${project.id}`);
          assert.deepEqual(saved.edges,[],'No stale edges may reach persistence');
        });
      }
    }
    for (const endpoint of ['upload','create']) await check(`slots filled during real ${endpoint} cannot overwrite newer refs`,async () => {
      const slots = await reset({type:'card_video',cap:'minimax_h3_ref4',fill:1});
      let expectedAssets, expectedEdges;
      await hold(endpoint,async () => {
        await page.evaluate(slots => {
          const target = cardOf('target'), out = structuredClone(cardOf('existing').outputs[0]);
          for (const slot of slots) {
            if (target.assets[slot.key]) continue;
            target.assets[slot.key] = structuredClone(out);
            PROJ.edges.push({from:'existing',to:'target',slot:slot.key,slots:[slot.key]});
          }
          openPanel('target'); save();
        },slots);
        const changed = await state(); expectedAssets = changed.project.cards.find(c => c.id === 'target').assets;
        expectedEdges = changed.project.edges;
      });
      const actual = await state();
      assert.deepEqual(actual.project.cards.find(c => c.id === 'target').assets,expectedAssets);
      assert.deepEqual(actual.project.edges,expectedEdges);
      assert.equal(creates().length,endpoint === 'create' ? 1 : 0);
      assert.ok(actual.project.cards.filter(c => c.type === 'card_asset').every(c => c.outputs.length === 1),'No empty imported node');
      assert.deepEqual((await api(`/api/projects/${project.id}`)).edges,expectedEdges);
    });
    for (const endpoint of ['upload','create']) await check(`failed ${endpoint}: no empty visible node or stale reference`,async () => {
      await reset();
      const pattern = endpoint === 'upload' ? '**/api/upload?*' : '**/api/projects/*/cards';
      await page.route(pattern,route => route.abort('failed'));
      try { await synthetic([file()]); await unchanged({uploadCount:1,createCount:endpoint === 'create' ? 1 : 0}); }
      finally { await page.unroute(pattern); }
    });
    await check('plain text Ctrl+V in a real parameter textarea is unchanged',async () => {
      await reset(); const input = page.locator('#panel textarea').first(); await expect(input).toBeVisible();
      await input.fill('原文'); await input.focus(); await input.press('End');
      await page.evaluate(() => navigator.clipboard.writeText('普通粘贴文字'));
      await page.keyboard.press('Control+v'); await expect(input).toHaveValue('原文普通粘贴文字');
      assert.equal(uploads().length,0); assert.equal(creates().length,0);
    });
    await check('ordinary copied node still pastes with text-only clipboard fallback',async () => {
      await reset(); await page.keyboard.press('Control+c');
      await page.evaluate(() => navigator.clipboard.writeText('not a media file'));
      await page.keyboard.press('Control+v'); await settle();
      const actual = await state(); assert.equal(actual.project.cards.length,2); assert.equal(uploads().length,0);
      assert.equal(actual.project.cards[1].type,'card_image'); assert.equal(actual.project.cards[1].params.prompt,'原文字');
    });
    await check('copied-node native Ctrl+V fallback with genuinely empty OS clipboard',async () => {
      await reset(); await page.keyboard.press('Control+c');
      await page.evaluate(() => navigator.clipboard.writeText(''));
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()),'');
      await page.keyboard.press('Control+v');
      await expect.poll(() => page.evaluate(() => PROJ.cards.length)).toBe(2); await settle();
      assert.equal(uploads().length,0); assert.equal(creates().length,1);
    });
    for (const blocked of ['display-none','visibility-hidden','viewer','modal']) await check(`${blocked} ignores synthetic media paste`,async () => {
      await reset();
      await page.evaluate(blocked => {
        if (blocked === 'display-none') el.panel.style.display = 'none';
        else if (blocked === 'visibility-hidden') el.panel.style.visibility = 'hidden';
        else if (blocked === 'viewer') el.view.style.display = '';
        else { const dialog = document.createElement('dialog'); dialog.id = 'clipboard-test-modal'; document.body.append(dialog); dialog.showModal(); }
      },blocked);
      await synthetic([file()],blocked === 'modal' ? '#clipboard-test-modal' : '#panel'); await unchanged();
    });
    await check('fixed NodeEditor target supports a native screenshot without selecting imported asset',async () => {
      await reset({editor:true}); await nativeScreenshot(); await imported(['image'],'zimage_i2i');
    });
    const audit = await api('/__fixture/audit');
    assert.deepEqual(audit.jobs,[]); assert.deepEqual(audit.outbound,[]);
    assert.equal(audit.root.replace(/\\/g,'/'),folder.replace(/\\/g,'/'));
    assert.ok(!audit.writes.some(w => /^\/api\/(generate|text|rewrite)(\?|$)/.test(w.path)),'No generation endpoints');
    report.audit = audit;
  } finally {
    fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2));
    if (browser) await browser.close();
    if (fixture) await fixture.stop();
  }
});
