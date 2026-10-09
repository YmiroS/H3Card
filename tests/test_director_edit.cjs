'use strict';
// Run: node --test tests/test_director_edit.cjs
// Real Edge + aiohttp + auth/resource/edit routes + CPU FFmpeg; never an existing preview.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn, spawnSync} = require('node:child_process');
const {once} = require('node:events');
const {chromium, expect} = require('playwright/test');

const ROOT = path.resolve(__dirname, '..');
const embeddedPython = path.resolve(ROOT, '../python_embeded/python.exe');
const PYTHON = process.env.CHOUKA_TEST_PYTHON || (fs.existsSync(embeddedPython) ? embeddedPython : 'python3');
const BOOT = String.raw`
import asyncio, json, os, sys
from pathlib import Path
from aiohttp import web, ClientSession, TraceConfig
real, isolated = map(Path, sys.argv[1:3])
sys.path.insert(0, str(real / 'server'))
import app as host
from server.auth import register_auth_routes, setup_local_test_auth
from server.auth_store import AuthStore
from server.resource_access import ResourceAccess

# Resolve real manifests/graphs without copying or changing production data.
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
host.JOBS.clear()
host.register_auth_routes = lambda application, _: register_auth_routes(application, real / 'web')
async def director_index(request):
    host.require_user(request)
    return web.FileResponse(real / 'web' / 'director.html')
async def static_asset(request, *, name):
    return web.FileResponse(real / 'web' / name)
host.director_index = director_index
host.static_asset = static_asset

# Preserve real store, resource access and local auth, but don't launch ws_loop,
# DingTalk, a GPU worker or even an outbound HTTP request in this fixture.
audit = {'generation': [], 'outbound': []}
async def reject_outbound(session, context, params):
    audit['outbound'].append(str(params.url))
    raise RuntimeError('Smoke fixture prohibits outbound HTTP: ' + str(params.url))
async def isolated_start(application):
    application['auth_store'] = await asyncio.to_thread(AuthStore, application['auth_path'])
    application['resource_access'] = ResourceAccess(application['auth_store'], isolated, host.COMFY_INPUT)
    trace = TraceConfig()
    trace.on_request_start.append(reject_outbound)
    application['session'] = ClientSession(trace_configs=[trace])
    await setup_local_test_auth(application)
host.on_start = isolated_start
@web.middleware
async def guard(request, handler):
    if request.method != 'GET' and (request.path in ('/api/generate', '/api/text', '/api/rewrite', '/api/reload')
                                  or request.path.startswith('/agent/')):
        audit['generation'].append(request.method + ' ' + request.path)
        raise web.HTTPForbidden(text='Generation is forbidden in editor smoke')
    return await handler(request)
async def fixture_audit(request):
    return web.json_response({**audit, 'jobs': list(host.JOBS), 'root': str(host.ROOT),
                              'caps': len(host.CAPS)})
async def main():
    application = host.make_app(auth_path=isolated / 'data' / 'auth-local-test.db')
    application.middlewares.insert(0, guard)
    application.router.add_get('/__fixture/audit', fixture_audit)
    runner = web.AppRunner(application, access_log=None)
    await runner.setup()
    site = web.TCPSite(runner, '127.0.0.1', 0)
    await site.start()
    port = site._server.sockets[0].getsockname()[1]
    print('DIRECTOR_EDIT_READY ' + json.dumps({'origin': 'http://127.0.0.1:' + str(port),
                                              'ffmpeg': str(host.ffmpeg_bin())}), flush=True)
    try:
        await asyncio.to_thread(sys.stdin.readline)
    finally:
        await runner.cleanup()
asyncio.run(main())
`;

async function bootFixture(folder) {
  const child = spawn(PYTHON, ['-u', '-c', BOOT, ROOT, folder], {
    cwd: ROOT, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    env: {...process.env, PYTHONIOENCODING: 'utf-8', CHOUKA_LOCAL_TEST: '1',
      CHOUKA_EXECUTION_MODE: 'local', CHOUKA_PORT: '0', CHOUKA_AUTH_DB: '',
      CHOUKA_DINGTALK_APP_KEY: '', CHOUKA_DINGTALK_APP_SECRET: ''},
  });
  let log = '';
  const record = data => { log += data.toString(); };
  child.stdout.on('data', record); child.stderr.on('data', record);
  const ready = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('Fixture boot timeout\n' + log)); }, 30000);
    const cleanup = () => { clearTimeout(timer); child.stdout.off('data', check); child.off('exit', exited); child.off('error', failed); };
    const check = () => {
      const match = log.match(/DIRECTOR_EDIT_READY (\{[^\r\n]+\})/);
      if (match) { cleanup(); resolve(JSON.parse(match[1])); }
    };
    const exited = code => { cleanup(); reject(new Error(`Fixture exited ${code}\n${log}`)); };
    const failed = error => { cleanup(); reject(error); };
    child.stdout.on('data', check); child.once('exit', exited); child.once('error', failed);
  });
  return {...ready, child, async stop() {
    if (child.exitCode === null) {
      const exited = once(child, 'exit');
      child.stdin.end('stop\n');
      let timer;
      try {
        await Promise.race([exited, new Promise((_, reject) => {
          timer = setTimeout(() => { child.kill(); reject(new Error('Fixture graceful shutdown timed out')); }, 15000);
        })]);
      } finally { clearTimeout(timer); }
    }
    fs.writeFileSync(path.join(folder, 'server.log'), log);
    assert.equal(child.exitCode, 0, 'Isolated server must shut down cleanly\n' + log);
    assert.doesNotMatch(log, /Traceback|Error handling request|Task exception was never retrieved/, 'Strict server errors');
  }};
}

function ffmpeg(executable, args, allowedFailure = false) {
  const result = spawnSync(executable, ['-nostdin', '-hide_banner', ...args], {
    encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (!allowedFailure) assert.equal(result.status, 0, result.stderr);
  return result.stderr;
}
function fixtures(folder, executable) {
  const video = path.join(folder, 'smoke-video.mp4');
  const image = path.join(folder, 'smoke-image.png');
  const audio = path.join(folder, 'smoke-audio.wav');
  ffmpeg(executable, ['-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=30',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000', '-t', '4',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', video]);
  ffmpeg(executable, ['-y', '-f', 'lavfi', '-i', 'color=c=blue:size=240x320', '-frames:v', '1', image]);
  ffmpeg(executable, ['-y', '-f', 'lavfi', '-i', 'sine=frequency=660:sample_rate=48000',
    '-t', '8', '-c:a', 'pcm_s16le', audio]);
  return {video, image, audio};
}

// Small, independently reported cases share one real session and project. Assertions
// observe the DOM and persisted HTTP data, never private editor state or fake routes.
test('director fifth-step real Edge smoke', {timeout: 600000}, async t => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'chouka-director-edit-'));
  const report = {folder, cases: [], browserErrors: [], failedRequests: [], generation: [], httpErrors: []};
  let fixture, browser, context, page, project, media, initialCanvas;
  let conflictExpected = false, conflictResponses = 0, conflictConsoleErrors = 0, shuttingDown = false;
  let failed = false;
  async function check(name, action) {
    if (failed) report.cases.push({name, status: 'skipped', reason: 'Earlier integration failure'});
    await t.test(name, {skip: failed ? 'Earlier integration failure' : false}, async () => {
      try {
        await action(); report.cases.push({name, status: 'passed'});
      } catch (error) {
        failed = true; report.cases.push({name, status: 'failed', error: error.stack}); throw error;
      }
    });
  }
  const edit = () => page.locator('#edit-stage');
  const clips = () => edit().locator('.edit-track-clips .edit-block');
  const inspector = () => edit().locator('.edit-inspector');
  const field = label => edit().locator('label.edit-field').filter({has: page.locator('span', {hasText: new RegExp('^' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$')})}).locator('input,select,textarea');
  async function setField(label, value) {
    const control = field(label);
    await expect(control).toBeEnabled();
    if (await control.evaluate(node => node.tagName === 'SELECT')) await control.selectOption(String(value));
    else { await control.fill(String(value)); await control.press('Tab'); }
  }
  async function api(suffix, method = 'GET', data) {
    const result = await page.evaluate(async ({suffix, method, data}) => {
      try {
        const result = method === 'GET' ? await H3Auth.request(suffix) : await H3Auth.json(suffix, method, data);
        return {ok: true, result};
      } catch (error) { return {ok: false, status: error.status, error: error.message}; }
    }, {suffix, method, data});
    assert.ok(result.ok, `${method} ${suffix}: ${JSON.stringify(result)}`);
    return result.result;
  }
  const endpoint = () => `/api/projects/${project.id}/edit`;
  const saved = async () => (await api(endpoint())).edit;
  async function waitSaved() {
    await expect.poll(() => page.evaluate(() => !window.DirectorEdit.dirty && !window.DirectorEdit.pending), {timeout: 15000}).toBe(true);
    await expect(edit().locator('.edit-status')).not.toHaveClass(/error/);
    return saved();
  }
  async function seek(seconds) {
    const slider = edit().getByRole('slider', {name: '预览播放头（秒）'});
    await slider.focus();
    await slider.press('Home');
    for (let frame = 0; frame < Math.round(seconds * 30); frame++) await slider.press('ArrowRight');
    near(Number(await slider.inputValue()), Math.round(seconds * 30) / 30, 0.001);
  }
  const near = (actual, expected, tolerance = 0.034) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
  const clipLength = clip => Math.round((clip.out - clip.in) / clip.speed * 30) / 30;
  const content = data => { const copy = structuredClone(data); delete copy.rev; return copy; };
  const block = (track, id) => edit().locator(`.edit-block[data-track="${track}"][data-id="${id}"]`);
  const editWrites = [];
  async function openEdit() {
    await page.reload();
    await expect(page.locator('#project-name')).toHaveText(project.name);
    await page.locator('[data-stage="edit"]').click();
    await expect(edit().locator('.edit-status')).toContainText('剪辑已保存');
  }
  async function restoreEdit(snapshot) {
    await waitSaved();
    const latest = await saved();
    const restored = (await api(endpoint(), 'PUT', {...structuredClone(snapshot), rev: latest.rev})).edit;
    await openEdit();
    assert.deepEqual(await saved(), restored, 'Real PUT + reload must restore the case fixture');
    return restored;
  }
  async function geometry(track, id) {
    return block(track, id).evaluate(node => ({left: parseFloat(node.style.left), width: parseFloat(node.style.width)}));
  }
  async function assertTimeline(data, scale = 36) {
    let start = 0;
    assert.deepEqual(await clips().evaluateAll(nodes => nodes.map(node => node.dataset.id)), data.clips.map(item => item.id), 'Resizing must not HTML-reorder clips');
    for (const item of data.clips) {
      const node = block('clips', item.id), box = await geometry('clips', item.id);
      await expect(node).toContainText(data.assets[item.asset].filename);
      near(box.left, start * scale, 0.15); near(box.width, Math.max(2, clipLength(item) * scale), 0.15);
      start += clipLength(item);
    }
    for (const track of ['audio', 'texts']) for (const item of data[track]) {
      const box = await geometry(track, item.id);
      const length = track === 'audio' ? item.out - item.in : item.end - item.start;
      near(box.left, item.start * scale, 0.15); near(box.width, Math.max(2, length * scale), 0.15);
      await expect(block(track, item.id)).toContainText(track === 'texts' ? item.text : data.assets[item.asset].filename);
    }
  }
  async function selectBlock(track, id) {
    await block(track, id).click();
    await expect(block(track, id)).toHaveClass(/selected/);
  }
  async function beginEdge(track, id, side, seconds, scale = 36) {
    const handle = block(track, id).locator(`.edit-trim-handle[data-side="${side}"]`);
    await expect(handle).toBeVisible();
    await handle.scrollIntoViewIfNeeded();
    const box = await handle.boundingBox(); assert.ok(box, 'Edge handle must have real mouse geometry');
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    assert.equal(await handle.evaluate((node, {x, y}) => node.contains(document.elementFromPoint(x, y)), {x, y}), true, 'The mouse must hit the handle, not another block');
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + seconds * scale, y, {steps: 8});
    return {handle, x, y};
  }
  async function dragEdge(track, id, side, seconds, scale = 36) {
    await beginEdge(track, id, side, seconds, scale);
    await page.mouse.up();
    return waitSaved();
  }
  async function focusTimeline(track, id) {
    await block(track, id).focus();
    await expect(block(track, id)).toBeFocused();
  }
  // Negative assertions deliberately cross the 900 ms autosave debounce. No
  // production handlers/state are replaced, and every actual PUT is recorded.
  async function assertNoShortcutMutation(before, keys, target) {
    const count = editWrites.length;
    for (const key of keys) {
      if (target) await target.focus();
      await page.keyboard.press(key);
    }
    await page.waitForTimeout(1200);
    assert.deepEqual(await saved(), before, 'Guarded shortcuts must not mutate or save the edit');
    assert.equal(editWrites.length, count, 'Guarded shortcuts must send no edit PUT');
  }
  async function regression(name, snapshot, action) {
    if (failed) return check(name, action);
    // A regression failure must not suppress independent cases or the original
    // export smoke. Each case starts/ends with a real latest-revision restore.
    await t.test(name, async () => {
      const record = {name, status: 'running'}; report.cases.push(record);
      try {
        const before = await restoreEdit(snapshot);
        record.before = before;
        await action(before);
        record.after = await saved(); record.status = 'passed';
      } catch (error) {
        record.status = 'failed'; record.error = error.stack;
        record.persisted = await saved().catch(error => ({error: error.message}));
        record.focus = await page.evaluate(() => ({tag: document.activeElement?.tagName, id: document.activeElement?.id, className: document.activeElement?.className, html: document.activeElement?.outerHTML?.slice(0, 600)}));
        record.playhead = await edit().getByRole('slider', {name: '预览播放头（秒）'}).inputValue();
        record.blocks = await edit().locator('.edit-block').evaluateAll(nodes => nodes.map(node => ({text: node.textContent, track: node.dataset.track, id: node.dataset.id, left: node.style.left, width: node.style.width, handles: node.querySelectorAll('.edit-trim-handle').length})));
        const evidence = path.join(folder, `timeline-failure-${report.cases.length}.png`);
        await page.screenshot({path: evidence, fullPage: true}); record.screenshot = evidence;
        fs.writeFileSync(path.join(folder, 'report.json'), JSON.stringify(report, null, 2));
        t.diagnostic(`${name}: ${error.message}\nEvidence: ${evidence}`);
        throw error;
      } finally {
        await page.keyboard.press('Escape'); await page.mouse.up();
        await restoreEdit(snapshot);
      }
    });
  }
  try {
    fixture = await bootFixture(folder); report.origin = fixture.origin;
    media = fixtures(folder, fixture.ffmpeg);
    browser = await chromium.launch({channel: 'msedge', headless: true});
    context = await browser.newContext({viewport: {width: 1600, height: 1100}, acceptDownloads: true});
    await context.tracing.start({screenshots: true, snapshots: true, sources: true});
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== fixture.origin && !['blob:', 'data:', 'about:'].includes(url.protocol)) {
        report.browserErrors.push('External browser request: ' + url.href); return route.abort();
      }
      if (route.request().method() !== 'GET' && /^\/api\/(generate|text|rewrite|reload)(?:$|\/)/.test(url.pathname)) {
        report.generation.push(url.pathname); return route.abort();
      }
      await route.continue();
    });
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('request', request => {
      if (project && request.method() === 'PUT' && request.url() === fixture.origin + endpoint()) {
        editWrites.push({at: Date.now(), edit: request.postDataJSON()});
      }
    });
    report.editWrites = editWrites;
    page.on('pageerror', error => report.browserErrors.push(error.stack));
    page.on('console', entry => {
      if (entry.type() !== 'error') return;
      // Chromium itself logs the deliberately produced HTTP 409. No blanket
      // suppression: only one network diagnostic in that conflict window.
      if (conflictExpected && /Failed to load resource:.*409 \(Conflict\)/.test(entry.text()) && !conflictConsoleErrors) {
        conflictConsoleErrors++; return;
      }
      report.browserErrors.push(entry.text());
    });
    page.on('requestfailed', request => {
      if (shuttingDown) return;
      // Switching/seeking media normally cancels an in-flight media byte range.
      // Only that exact browser cancellation is allowed, not arbitrary failures.
      if (request.failure()?.errorText === 'net::ERR_ABORTED' && request.method() === 'GET' &&
          request.resourceType() === 'media' && /\/api\/(upload\/|artifact\/)/.test(request.url())) {
        (report.expectedMediaAborts ||= []).push(request.url()); return;
      }
      report.failedRequests.push({url: request.url(), error: request.failure()});
    });
    page.on('response', response => {
      if (response.status() < 400) return;
      if (conflictExpected && response.status() === 409 && response.request().method() === 'PUT' &&
          response.url() === fixture.origin + endpoint() && !conflictResponses) { conflictResponses++; return; }
      report.httpErrors.push({url: response.url(), status: response.status()});
    });
    page.on('dialog', dialog => dialog.type() === 'beforeunload' ? dialog.accept() : dialog.dismiss());

    await check('isolated local auth, real capabilities and project creation', async () => {
      await page.goto(fixture.origin + '/director');
      await expect(page.locator('#connection')).not.toHaveText('正在连接生成服务');
      const identity = await api('/api/auth/me');
      assert.equal(identity.local_test, true);
      const capabilities = await api('/api/cards');
      assert.equal(capabilities.director_schema, 1);
      assert.ok(Object.keys(capabilities.capabilities).length > 10);
      project = await api('/api/projects', 'POST', {name: 'Director edit isolated smoke'});
      assert.equal(project.permission, 'operate');
      await page.goto(`${fixture.origin}/director?project=${project.id}`);
      await expect(page.locator('#project-name')).toHaveText(project.name);
      initialCanvas = await api('/api/projects/' + project.id);
    });
    await check('fifth-step navigation without creating shots or generation', async () => {
      await expect(page.locator('[data-stage]')).toHaveCount(5);
      await page.locator('[data-stage="edit"]').click();
      await expect(page.locator('#stage-title')).toHaveText('剪辑与导出');
      await expect(edit()).toBeVisible();
      await expect(edit().locator('.edit-status')).toContainText('剪辑已保存');
      await expect(page.locator('#add-shot')).toBeHidden();
      await expect(clips()).toHaveCount(0);
      await page.locator('[data-stage="review"]').click();
      await expect(edit()).toBeHidden();
      await page.locator('[data-stage="edit"]').click();
      await expect(edit()).toBeVisible();
    });
    await check('real FFmpeg PNG, MP4 and WAV upload through editor/API', async () => {
      const registered = page.waitForResponse(response => response.url() === fixture.origin + endpoint() + '/upload' && response.request().method() === 'POST');
      await edit().getByLabel('上传视频、图片或音频素材').setInputFiles([media.video, media.image, media.audio]);
      assert.equal((await registered).status(), 200);
      await expect(edit().locator('.edit-library .edit-asset')).toHaveCount(3);
      await expect(edit().getByLabel('上传视频、图片或音频素材')).toBeEnabled();
      const data = await saved();
      assert.deepEqual(Object.values(data.assets).map(asset => asset.kind).sort(), ['audio', 'image', 'video']);
      near(Object.values(data.assets).find(asset => asset.kind === 'video').duration, 4);
      assert.equal(Object.values(data.assets).find(asset => asset.kind === 'video').has_audio, true);
      report.assets = Object.values(data.assets);
    });
    await check('add visual/audio/text tracks and edit Chinese text', async () => {
      const assetCard = filename => edit().locator('.edit-library .edit-asset').filter({hasText: filename});
      await assetCard('smoke-video.mp4').getByRole('button', {name: '加入主轨', exact: true}).click();
      await assetCard('smoke-image.png').getByRole('button', {name: '加入主轨', exact: true}).click();
      await assetCard('smoke-audio.wav').getByRole('button', {name: '加入音频轨', exact: true}).click();
      await expect(clips()).toHaveCount(2);
      await expect(edit().locator('.edit-track-audio .edit-block')).toHaveCount(1);
      await setField('源入点（秒）', 0.5);
      await setField('源出点（秒）', 2.5);
      await setField('时间线开始（秒）', 0.25);
      await setField('音量（0–2）', 0.4);
      await edit().getByRole('button', {name: '添加文字', exact: true}).click();
      await setField('文字内容', '导演剪辑冒烟\n真实导出');
      await setField('结束（秒）', 2.3);
      await expect(edit().locator('.edit-track-texts .edit-block')).toHaveText('导演剪辑冒烟\n真实导出');
      const data = await waitSaved();
      assert.equal(data.texts[0].text, '导演剪辑冒烟\n真实导出');
      near(data.audio[0].in, 0.5); near(data.audio[0].out, 2.5); near(data.audio[0].start, 8 / 30);
    });
    if (!failed) {
      const originalEdit = await waitSaved();
      const timelineEdit = structuredClone(originalEdit);
      Object.assign(timelineEdit.clips[0], {in: 1, out: 3, speed: 2});
      Object.assign(timelineEdit.clips[1], {in: 0, out: 3, speed: 1});
      timelineEdit.clips.push({...structuredClone(timelineEdit.clips[0]), id: 'clip_regression_slow', in: 0.5, out: 3.5, speed: 0.5});
      Object.assign(timelineEdit.audio[0], {in: 1, out: 4, start: 1});
      Object.assign(timelineEdit.texts[0], {start: 1, end: 3});
      await regression('timeline handle selectors, asset labels and shortcuts below timeline', timelineEdit, async before => {
        await expect(edit().locator('.edit-trim-handle')).toHaveCount(10);
        for (const track of ['clips', 'audio', 'texts']) for (const item of before[track]) {
          await expect(block(track, item.id).locator('.edit-trim-handle[data-side="start"]')).toHaveCount(1);
          await expect(block(track, item.id).locator('.edit-trim-handle[data-side="end"]')).toHaveCount(1);
        }
        await assertTimeline(before);
        const shortcuts = edit().locator('.edit-shortcuts');
        await expect(shortcuts).toBeVisible();
        await expect(shortcuts).toContainText(/Delete|删除/);
        await expect(shortcuts).toContainText(/Q/); await expect(shortcuts).toContainText(/W/);
        const bottom = await edit().locator('.edit-timeline-scroll').boundingBox();
        const help = await shortcuts.boundingBox();
        assert.ok(help.y >= bottom.y + bottom.height - 1, 'Shortcut help must be below the timeline');
      });
      for (const index of [0, 2]) for (const side of ['start', 'end']) {
        await regression(`video ${timelineEdit.clips[index].speed}x ${side} edge uses timeline delta times original speed and ripples`, timelineEdit, async before => {
          const item = before.clips[index], expected = structuredClone(before), delta = item.speed === 2 ? 0.5 : 2 / 3;
          await selectBlock('clips', item.id);
          const old = await geometry('clips', item.id);
          const after = await dragEdge('clips', item.id, side, delta);
          expected.clips[index][side === 'start' ? 'in' : 'out'] = Math.round((item[side === 'start' ? 'in' : 'out'] + delta * item.speed) * 30) / 30;
          near(after.clips[index][side === 'start' ? 'in' : 'out'], expected.clips[index][side === 'start' ? 'in' : 'out'], 0.001);
          assert.deepEqual(after.clips.map(clip => clip.speed), before.clips.map(clip => clip.speed), 'Each video retains its own speed');
          assert.deepEqual(after.clips.map(clip => clip.id), before.clips.map(clip => clip.id));
          near((await geometry('clips', item.id)).width - old.width, (side === 'start' ? -delta : delta) * 36, 0.15);
          assert.deepEqual(content(after), content(expected));
          await assertTimeline(after);
        });
      }
      for (const side of ['start', 'end']) {
        await regression(`image ${side} edge changes hold duration only and keeps contiguous main track`, timelineEdit, async before => {
          const item = before.clips[1], expected = structuredClone(before);
          await selectBlock('clips', item.id);
          const after = await dragEdge('clips', item.id, side, 0.5);
          expected.clips[1].out += side === 'start' ? -0.5 : 0.5;
          assert.equal(after.clips[1].in, 0); assert.equal(after.clips[1].speed, 1);
          assert.deepEqual(content(after), content(expected)); await assertTimeline(after);
          near(Number(await field('图片停留时长（秒）').inputValue()), expected.clips[1].out, 0.001);
        });
      }
      for (const track of ['audio', 'texts']) for (const side of ['start', 'end']) {
        await regression(`${track} ${side} edge updates only the intended times`, timelineEdit, async before => {
          const item = before[track][0], expected = structuredClone(before), delta = 0.5;
          await selectBlock(track, item.id);
          const after = await dragEdge(track, item.id, side, delta), result = after[track][0];
          if (track === 'audio') {
            if (side === 'start') {
              expected.audio[0].in += delta; expected.audio[0].start += delta;
              near(result.start + result.out - result.in, item.start + item.out - item.in, 0.001);
              assert.equal(result.out, item.out);
            } else { expected.audio[0].out += delta; assert.equal(result.start, item.start); assert.equal(result.in, item.in); }
          } else expected.texts[0][side === 'start' ? 'start' : 'end'] += delta;
          assert.deepEqual(content(after), content(expected)); await assertTimeline(after);
        });
      }
      await regression('video/image source bounds and minimum one-frame duration clamp instead of reorder', timelineEdit, async before => {
        const video = before.clips[0], image = before.clips[1];
        await selectBlock('clips', video.id);
        let after = await dragEdge('clips', video.id, 'start', -4);
        near(after.clips[0].in, 0, 0.001); assert.equal(after.clips[0].speed, 2);
        after = await dragEdge('clips', video.id, 'end', 8);
        near(after.clips[0].out, before.assets[video.asset].duration, 0.034);
        after = await dragEdge('clips', video.id, 'end', -4);
        assert.ok(after.clips[0].out - after.clips[0].in >= 1 / 30 - 1e-7);
        near(clipLength(after.clips[0]), 1 / 30, 0.001);
        await selectBlock('clips', image.id);
        after = await dragEdge('clips', image.id, 'end', -8);
        assert.equal(after.clips[1].in, 0); assert.equal(after.clips[1].speed, 1);
        near(after.clips[1].out, 1 / 30, 0.001);
        assert.deepEqual(after.clips.map(item => item.id), before.clips.map(item => item.id));
        await assertTimeline(after);
      });
      const adjacentAudio = structuredClone(timelineEdit);
      adjacentAudio.audio.unshift({...structuredClone(adjacentAudio.audio[0]), id: 'audio_regression_previous', start: 0, in: 0, out: 0.5});
      adjacentAudio.audio.push({...structuredClone(adjacentAudio.audio[1]), id: 'audio_regression_next', start: 5, in: 0, out: 2});
      for (const side of ['start', 'end']) {
        await regression(`audio ${side} extension clamps against adjacent segment without moving neighbours`, adjacentAudio, async before => {
          const item = before.audio[1]; await selectBlock('audio', item.id);
          const after = await dragEdge('audio', item.id, side, side === 'start' ? -3 : 4);
          assert.deepEqual(after.audio[0], before.audio[0]); assert.deepEqual(after.audio[2], before.audio[2]);
          if (side === 'start') {
            near(after.audio[1].start, 0.5, 0.001); near(after.audio[1].in, 0.5, 0.001);
            near(after.audio[1].start + after.audio[1].out - after.audio[1].in, 4, 0.001);
          }
          else { near(after.audio[1].out, 5, 0.001); near(after.audio[1].start + after.audio[1].out - after.audio[1].in, 5, 0.001); }
          const spans = after.audio.map(item => [item.start, item.start + item.out - item.in]).sort((a, b) => a[0] - b[0]);
          assert.ok(spans.every((span, index) => !index || spans[index - 1][1] <= span[0] + 1e-7));
          await assertTimeline(after);
        });
      }
      await regression('audio clamps source bounds, timeline zero and minimum one frame', timelineEdit, async before => {
        const item = before.audio[0]; await selectBlock('audio', item.id);
        let after = await dragEdge('audio', item.id, 'start', -4);
        near(after.audio[0].in, 0, 0.001); near(after.audio[0].start, 0, 0.001);
        near(after.audio[0].start + after.audio[0].out - after.audio[0].in, 4, 0.001);
        after = await dragEdge('audio', item.id, 'end', 8);
        near(after.audio[0].out, before.assets[item.asset].duration, 0.034);
        after = await dragEdge('audio', item.id, 'start', 10);
        near(after.audio[0].out - after.audio[0].in, 1 / 30, 0.001);
        await assertTimeline(after);
        const early = structuredClone(before); early.audio[0].start = 0.5;
        await restoreEdit(early); await selectBlock('audio', item.id);
        after = await dragEdge('audio', item.id, 'start', -4);
        near(after.audio[0].start, 0, 0.001); near(after.audio[0].in, 0.5, 0.001);
        near(after.audio[0].start + after.audio[0].out - after.audio[0].in, 3.5, 0.001);
      });
      for (const side of ['start', 'end']) {
        await regression(`text ${side} edge clamps to one frame and zero without changing text or style`, timelineEdit, async before => {
          const item = before.texts[0]; await selectBlock('texts', item.id);
          if (side === 'start') {
            const extended = await dragEdge('texts', item.id, side, -4);
            near(extended.texts[0].start, 0, 0.001); assert.equal(extended.texts[0].end, item.end);
          }
          const after = await dragEdge('texts', item.id, side, side === 'start' ? 6 : -6);
          near(after.texts[0].end - after.texts[0].start, 1 / 30, 0.001);
          for (const key of ['text', 'x', 'y', 'size', 'color']) assert.equal(after.texts[0][key], item[key]);
          await assertTimeline(after);
        });
      }
      await regression('edge gesture previews without PUT, saves only after release and is one undo item', timelineEdit, async before => {
        const item = before.clips[1]; await selectBlock('clips', item.id);
        const count = editWrites.length, old = await geometry('clips', item.id);
        const gesture = await beginEdge('clips', item.id, 'end', 0.5);
        near((await geometry('clips', item.id)).width, old.width + 18, 0.15);
        await page.mouse.move(gesture.x + 36, gesture.y, {steps: 8});
        near((await geometry('clips', item.id)).width, old.width + 36, 0.15);
        await page.waitForTimeout(1200);
        assert.deepEqual(await saved(), before, 'Holding the edge beyond debounce must not autosave');
        assert.equal(editWrites.length, count);
        await page.mouse.up(); const after = await waitSaved();
        near(after.clips[1].out, item.out + 1, 0.001);
        assert.equal(editWrites.length, count + 1, 'One release must send exactly one autosave');
        await expect(block('clips', item.id)).toBeFocused();
        await page.keyboard.press('Control+z');
        assert.deepEqual(content(await waitSaved()), content(before), 'One keyboard undo restores the whole multi-move gesture');
        await expect(edit().getByRole('button', {name: '撤销', exact: true})).toBeDisabled();
        await expect(block('clips', item.id)).toBeFocused();
        await page.keyboard.press('Control+Shift+z');
        assert.deepEqual(content(await waitSaved()), content(after));
        await expect(block('clips', item.id)).toBeFocused();
        await page.keyboard.press('Control+z'); await waitSaved();
        await page.keyboard.press('Control+y');
        assert.deepEqual(content(await waitSaved()), content(after));
        await page.keyboard.press('Meta+z');
        assert.deepEqual(content(await waitSaved()), content(before));
        await page.keyboard.press('Meta+Shift+z');
        assert.deepEqual(content(await waitSaved()), content(after));
      });
      await regression('Escape during a real mouse edge drag rolls back without save or undo history', timelineEdit, async before => {
        const item = before.clips[1]; await selectBlock('clips', item.id);
        const old = await geometry('clips', item.id), count = editWrites.length;
        await beginEdge('clips', item.id, 'end', 0.5);
        near((await geometry('clips', item.id)).width, old.width + 18, 0.15);
        await page.keyboard.press('Escape'); await page.mouse.up();
        await page.waitForTimeout(1200);
        assert.deepEqual(await saved(), before); assert.equal(editWrites.length, count);
        assert.deepEqual(await geometry('clips', item.id), old);
        await expect(edit().getByRole('button', {name: '撤销', exact: true})).toBeDisabled();
      });
      await regression('browser-native pointercancel rolls back edge preview without saving', timelineEdit, async before => {
        const item = before.clips[1]; await selectBlock('clips', item.id);
        const handle = block('clips', item.id).locator('.edit-trim-handle[data-side="end"]');
        await handle.scrollIntoViewIfNeeded();
        const box = await handle.boundingBox(); assert.ok(box);
        const old = await geometry('clips', item.id), count = editWrites.length;
        const cdp = await context.newCDPSession(page);
        let touchActive = false;
        // Browser-level touchCancel produces a trusted PointerEvent. It is not
        // dispatchEvent(), a mocked handler, or a direct editor-state mutation.
        try {
          const x = box.x + box.width / 2, y = box.y + box.height / 2;
          await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y, id: 1}]});
          touchActive = true;
          await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x + 18, y, id: 1}]});
          near((await geometry('clips', item.id)).width, old.width + 18, 0.15);
          const canceled = page.evaluate(() => new Promise(resolve => {
            const listener = event => { clearTimeout(timer); resolve({trusted: event.isTrusted, type: event.pointerType}); };
            const timer = setTimeout(() => { document.removeEventListener('pointercancel', listener, true); resolve({error: 'No browser pointercancel within 5 seconds'}); }, 5000);
            document.addEventListener('pointercancel', listener, {once: true, capture: true});
          }));
          // A separate round-trip ensures the observation listener is installed.
          await page.evaluate(() => document.readyState);
          await cdp.send('Input.dispatchTouchEvent', {type: 'touchCancel', touchPoints: []});
          touchActive = false;
          assert.deepEqual(await canceled, {trusted: true, type: 'touch'});
          await page.waitForTimeout(1200);
          assert.deepEqual(await saved(), before); assert.equal(editWrites.length, count);
          assert.deepEqual(await geometry('clips', item.id), old);
          await expect(edit().getByRole('button', {name: '撤销', exact: true})).toBeDisabled();
        } finally {
          try { if (touchActive) await cdp.send('Input.dispatchTouchEvent', {type: 'touchCancel', touchPoints: []}); }
          finally { await cdp.detach(); }
        }
      });
      await regression('alternate timeline zoom plus horizontal scroll preserves drag delta and ripple geometry', timelineEdit, async before => {
        const zoomControl = edit().getByRole('slider', {name: '时间线缩放'});
        await zoomControl.focus(); await zoomControl.press('End');
        for (let n = 0; n < 40; n++) await zoomControl.press('ArrowLeft');
        await expect(zoomControl).toHaveValue('120');
        const scroller = edit().locator('.edit-timeline-scroll');
        await scroller.evaluate(node => { node.scrollLeft = 300; });
        assert.ok(await scroller.evaluate(node => node.scrollLeft) > 0, 'Exercise an actually scrolled timeline');
        const item = before.clips[2]; await selectBlock('clips', item.id);
        assert.ok(await scroller.evaluate(node => node.scrollLeft) > 0);
        const after = await dragEdge('clips', item.id, 'start', 2 / 3, 120);
        near(after.clips[2].in - item.in, 1 / 3, 0.001); assert.equal(after.clips[2].speed, 0.5);
        assert.deepEqual(after.clips.slice(0, 2), before.clips.slice(0, 2));
        await assertTimeline(after, 120);
      });
      for (const track of ['clips', 'audio', 'texts']) for (const key of ['Delete', 'Backspace']) {
        await regression(`${key} removes only the selected ${track} segment`, timelineEdit, async before => {
          const item = before[track][0]; await selectBlock(track, item.id); await focusTimeline(track, item.id);
          await page.keyboard.press(key);
          const after = await waitSaved(), expected = structuredClone(before);
          expected[track] = expected[track].filter(candidate => candidate.id !== item.id);
          assert.deepEqual(content(after), content(expected));
          await expect(block(track, item.id)).toHaveCount(0); await assertTimeline(after);
          const count = editWrites.length;
          await page.keyboard.press(key); await page.waitForTimeout(1200);
          assert.deepEqual(await saved(), after, 'Delete without a selection must not remove a neighbouring segment');
          assert.equal(editWrites.length, count);
        });
      }
      for (const key of ['s', 'Control+b', 'Meta+b']) {
        await regression(`${key} splits only selected non-first video at playhead with its original speed`, timelineEdit, async before => {
          const item = before.clips[2]; await selectBlock('clips', item.id); await seek(5); await focusTimeline('clips', item.id);
          await page.keyboard.press(key);
          await expect(clips()).toHaveCount(4);
          const after = await waitSaved();
          assert.deepEqual(after.clips.slice(0, 2), before.clips.slice(0, 2));
          const left = after.clips[2], right = after.clips[3];
          assert.equal(left.id, item.id); assert.notEqual(right.id, item.id);
          near(left.out, item.in + (5 - 4) * item.speed, 0.001); near(right.in, left.out, 0.001);
          near(clipLength(left), 1, 0.001); near(clipLength(right), 5, 0.001);
          for (const clip of [left, right]) {
            assert.equal(clip.speed, item.speed); assert.equal(clip.asset, item.asset);
            assert.equal(clip.volume, item.volume); assert.equal(clip.fit, item.fit);
          }
          assert.deepEqual(after.audio, before.audio); assert.deepEqual(after.texts, before.texts);
          await assertTimeline(after);
          await expect(edit().locator('.edit-block.selected')).toBeFocused();
          await page.keyboard.press('Control+z');
          assert.deepEqual(content(await waitSaved()), content(before));
          await page.keyboard.press('Control+Shift+z');
          assert.deepEqual(content(await waitSaved()), content(after));
        });
      }
      for (const index of [0, 1]) for (const key of ['q', 'w']) {
        await regression(`${key.toUpperCase()} trims selected ${index ? 'image' : '2x video'} to playhead with ripple`, timelineEdit, async before => {
          const item = before.clips[index], expected = structuredClone(before);
          const position = index ? 1 : 0, cut = position + 2 / 3;
          await selectBlock('clips', item.id); await seek(cut); await focusTimeline('clips', item.id);
          await page.keyboard.press(key);
          const after = await waitSaved();
          if (index) expected.clips[index].out = key === 'q' ? item.out - 2 / 3 : 2 / 3;
          else expected.clips[index][key === 'q' ? 'in' : 'out'] = Math.round((item.in + 2 / 3 * item.speed) * 30) / 30;
          assert.deepEqual(content(after), content(expected)); await assertTimeline(after);
          await expect(block('clips', item.id)).toBeFocused();
          await page.keyboard.press('Control+z');
          assert.deepEqual(content(await waitSaved()), content(before));
        });
      }
      await regression('Space toggles real media playback, arrows step one frame, transport never saves edit', timelineEdit, async before => {
        const item = before.clips[0], slider = edit().getByRole('slider', {name: '预览播放头（秒）'});
        await selectBlock('clips', item.id); await seek(0.2); await focusTimeline('clips', item.id);
        await page.keyboard.press('ArrowRight'); near(Number(await slider.inputValue()), 7 / 30, 0.001);
        await page.keyboard.press('ArrowLeft'); near(Number(await slider.inputValue()), 0.2, 0.001);
        await page.keyboard.press('Shift+ArrowRight'); near(Number(await slider.inputValue()), 16 / 30, 0.001);
        await page.keyboard.press('Shift+ArrowLeft'); near(Number(await slider.inputValue()), 0.2, 0.001);
        await page.keyboard.press('Home'); near(Number(await slider.inputValue()), 0, 0.001);
        await page.keyboard.press('ArrowLeft'); near(Number(await slider.inputValue()), 0, 0.001);
        await page.keyboard.press('End'); near(Number(await slider.inputValue()), 10, 0.001);
        await page.keyboard.press('ArrowRight'); near(Number(await slider.inputValue()), 10, 0.001);
        await seek(0.2); await focusTimeline('clips', item.id);
        const video = edit().locator('.edit-preview video');
        await expect.poll(() => video.evaluate(node => node.readyState)).toBeGreaterThanOrEqual(2);
        near(await video.evaluate(node => node.currentTime), 1.4, 0.08);
        const count = editWrites.length;
        await page.keyboard.press('Space');
        await expect(edit().getByRole('button', {name: '暂停', exact: true})).toBeVisible();
        await expect.poll(() => video.evaluate(node => !node.paused)).toBe(true);
        await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(0.2);
        await page.keyboard.press('Space');
        await expect(edit().getByRole('button', {name: '播放', exact: true})).toBeVisible();
        assert.equal(await video.evaluate(node => node.paused), true);
        const stopped = Number(await slider.inputValue());
        await page.waitForTimeout(150); near(Number(await slider.inputValue()), stopped, 0.001);
        assert.deepEqual(await saved(), before); assert.equal(editWrites.length, count);
      });
      await regression('ruler mouse seek restores selected video focus for arrows, Space and S without reselecting', timelineEdit, async before => {
        const item = before.clips[2], ruler = edit().locator('.edit-ruler');
        const slider = edit().getByRole('slider', {name: '预览播放头（秒）'});
        await selectBlock('clips', item.id);
        await ruler.click({position: {x: 5 * 36, y: 15}});
        near(Number(await slider.inputValue()), 5, 0.001);
        await expect(block('clips', item.id)).toBeFocused();
        await page.keyboard.press('ArrowRight'); near(Number(await slider.inputValue()), 5 + 1 / 30, 0.001);
        await page.keyboard.press('ArrowLeft'); near(Number(await slider.inputValue()), 5, 0.001);
        const video = edit().locator('.edit-preview video');
        await expect.poll(() => video.evaluate(node => node.readyState)).toBeGreaterThanOrEqual(2);
        await page.keyboard.press('Space');
        await expect(edit().getByRole('button', {name: '暂停', exact: true})).toBeVisible();
        await expect.poll(() => video.evaluate(node => !node.paused)).toBe(true);
        await page.keyboard.press('Space');
        await expect(edit().getByRole('button', {name: '播放', exact: true})).toBeVisible();
        await ruler.click({position: {x: 5 * 36, y: 15}});
        await page.keyboard.press('s');
        await expect(clips()).toHaveCount(4);
        const after = await waitSaved();
        assert.deepEqual(after.clips.slice(0, 2), before.clips.slice(0, 2));
        near(after.clips[2].out, 1, 0.001); near(after.clips[3].in, 1, 0.001);
        near(clipLength(after.clips[2]), 1, 0.001); near(clipLength(after.clips[3]), 5, 0.001);
        assert.equal(after.clips[2].speed, 0.5); assert.equal(after.clips[3].speed, 0.5);
        assert.deepEqual(after.audio, before.audio); assert.deepEqual(after.texts, before.texts);
        await assertTimeline(after); await expect(edit().locator('.edit-block.selected')).toBeFocused();
      });
      await regression('empty track mouse seek restores selection focus for frame stepping and crop without reselecting', timelineEdit, async before => {
        const item = before.audio[0], expected = structuredClone(before);
        await selectBlock('audio', item.id);
        // Below the 32 px block, but inside the real 68 px track row.
        await edit().locator('.edit-track-audio').click({position: {x: 2 * 36, y: 62}});
        const slider = edit().getByRole('slider', {name: '预览播放头（秒）'});
        near(Number(await slider.inputValue()), 2, 0.001);
        await expect(block('audio', item.id)).toBeFocused();
        await page.keyboard.press('ArrowRight'); near(Number(await slider.inputValue()), 2 + 1 / 30, 0.001);
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('w');
        expected.audio[0].out = 2;
        const after = await waitSaved(); assert.deepEqual(content(after), content(expected));
        await assertTimeline(after); await expect(block('audio', item.id)).toBeFocused();
      });
      for (const track of ['audio', 'texts']) for (const key of ['q', 'w']) {
        await regression(`${key.toUpperCase()} trims selected ${track} to playhead without changing other tracks`, timelineEdit, async before => {
          const item = before[track][0], expected = structuredClone(before);
          await selectBlock(track, item.id); await seek(2); await focusTimeline(track, item.id);
          await page.keyboard.press(key);
          const after = await waitSaved();
          if (track === 'texts') expected.texts[0][key === 'q' ? 'start' : 'end'] = 2;
          else if (key === 'q') { expected.audio[0].in = 2; expected.audio[0].start = 2; }
          else expected.audio[0].out = 2;
          assert.deepEqual(content(after), content(expected)); await assertTimeline(after);
          await expect(block(track, item.id)).toBeFocused();
          await page.keyboard.press('Control+z');
          assert.deepEqual(content(await waitSaved()), content(before));
        });
      }
      const destructiveKeys = ['Delete', 'Backspace', 's', 'Control+b', 'Meta+b', 'q', 'w', 'Control+z', 'Meta+z', 'Control+Shift+z', 'Meta+Shift+z', 'Control+y'];
      await regression('delete, split and crop shortcuts with no selected segment are harmless', timelineEdit, async before => {
        await seek(0.5);
        await expect(edit().locator('.edit-block.selected')).toHaveCount(0);
        await assertNoShortcutMutation(before, destructiveKeys, edit().getByRole('button', {name: '播放', exact: true}));
        await assertTimeline(before);
      });
      for (const controlType of ['input', 'select', 'textarea', 'contenteditable descendant']) {
        await regression(`destructive shortcuts ignore focused ${controlType}, including undo/redo with actual history`, timelineEdit, async before => {
          const image = before.clips[1]; await selectBlock('clips', image.id);
          await dragEdge('clips', image.id, 'end', 0.5);
          await dragEdge('clips', image.id, 'end', 0.5);
          // Retain real undo/redo history so guards cannot pass merely because
          // there is nothing to undo. S/Q/W also have an interior playhead.
          await focusTimeline('clips', image.id); await page.keyboard.press('Control+z'); await waitSaved();
          const changed = await waitSaved();
          let target;
          if (controlType === 'input') { await selectBlock('clips', before.clips[0].id); target = field('源入点（秒）'); }
          else if (controlType === 'select') { await selectBlock('clips', before.clips[0].id); target = field('画面适配'); }
          else if (controlType === 'textarea') { await selectBlock('texts', before.texts[0].id); target = field('文字内容'); }
          else {
            await selectBlock('clips', before.clips[0].id);
            // A test-only nested editable DOM surface exercises inherited
            // isContentEditable; all shortcut listeners remain production.
            await inspector().evaluate(node => {
              const surface = document.createElement('div'); surface.contentEditable = 'true';
              const child = document.createElement('span'); child.id = 'shortcut-editable-child'; child.tabIndex = 0; child.textContent = '可编辑文字';
              surface.append(child); node.append(surface);
            });
            target = page.locator('#shortcut-editable-child');
          }
          await seek(controlType === 'textarea' ? 2 : 0.5);
          const originalValue = controlType !== 'contenteditable descendant' ? await target.inputValue() : null;
          await target.focus();
          await assertNoShortcutMutation(changed, destructiveKeys, target);
          // Native Delete/typing may legitimately edit a field's unsaved value;
          // restore it before blur so the test does not save native text edits.
          if (controlType === 'select') await target.selectOption(originalValue);
          else if (originalValue !== null) await target.fill(originalValue);
          await target.press('Tab');
          assert.deepEqual(await waitSaved(), changed);
        });
      }
      await regression('hidden edit stage ignores destructive shortcuts while another stage has focus', timelineEdit, async before => {
        const item = before.clips[0]; await selectBlock('clips', item.id); await seek(0.5);
        await page.locator('[data-stage="review"]').click(); await expect(edit()).toBeHidden();
        await assertNoShortcutMutation(before, destructiveKeys, page.locator('[data-stage="review"]'));
        await page.locator('[data-stage="edit"]').click(); await assertTimeline(before);
      });
      await regression('open real modal dialog ignores destructive shortcuts on a non-input target', timelineEdit, async before => {
        const item = before.clips[0]; await selectBlock('clips', item.id); await seek(0.5);
        await page.locator('#new-project').click();
        await expect(page.locator('#create-dialog')).toBeVisible();
        await assertNoShortcutMutation(before, destructiveKeys, page.locator('#create-cancel'));
        await expect(page.locator('#create-dialog')).toBeVisible();
        await page.locator('#create-cancel').click();
        await expect(page.locator('#create-dialog')).not.toBeVisible(); await assertTimeline(before);
      });
      await regression('locked readonly project ignores destructive keyboard shortcuts and edge resize', timelineEdit, async before => {
        const projectFile = path.join(folder, 'data', 'projects', project.id + '.json');
        const backup = fs.readFileSync(projectFile, 'utf8');
        try {
          const locked = JSON.parse(backup); locked.locked = true;
          fs.writeFileSync(projectFile, JSON.stringify(locked)); // Only the isolated fixture project.
          await openEdit();
          assert.equal((await api('/api/projects/' + project.id)).locked, true);
          await expect(edit().getByLabel('上传视频、图片或音频素材')).toBeDisabled();
          const item = before.clips[1]; await selectBlock('clips', item.id);
          await seek(2); await focusTimeline('clips', item.id);
          await assertNoShortcutMutation(before, destructiveKeys, block('clips', item.id));
          const handle = block('clips', item.id).locator('.edit-trim-handle[data-side="end"]');
          if (await handle.isVisible()) {
            const count = editWrites.length, old = await geometry('clips', item.id);
            await beginEdge('clips', item.id, 'end', 0.5); await page.mouse.up();
            await page.waitForTimeout(1200);
            assert.deepEqual(await saved(), before); assert.equal(editWrites.length, count);
            assert.deepEqual(await geometry('clips', item.id), old);
          }
          await assertTimeline(before);
        } finally { fs.writeFileSync(projectFile, backup); await openEdit(); }
      });
      await restoreEdit(originalEdit);
    }
    await check('video trim, 0.5× and 2× speed, linked target duration', async () => {
      await clips().first().click();
      await setField('源入点（秒）', 0.5);
      await setField('源出点（秒）', 3.5);
      await inspector().getByRole('button', {name: '0.5×', exact: true}).click();
      await expect(field('最终时长（秒）')).toHaveValue('6');
      let data = await waitSaved(); assert.equal(data.clips[0].speed, 0.5); near(clipLength(data.clips[0]), 6);
      await inspector().getByRole('button', {name: '2×', exact: true}).click();
      await expect(field('最终时长（秒）')).toHaveValue('1.5');
      await setField('最终时长（秒）', 1);
      await expect(field('源入点（秒）')).toHaveValue('0.5');
      await expect(field('源出点（秒）')).toHaveValue('3.5');
      await expect(field('自定义速度（0.25–4×）')).toHaveValue('3');
      data = await waitSaved(); assert.equal(data.clips[0].speed, 3); near(clipLength(data.clips[0]), 1);
      // A duration requiring 15× must be rejected, not silently trim or clamp.
      const before = structuredClone(data.clips[0]);
      await setField('最终时长（秒）', 0.2);
      await expect(page.locator('#toast')).toContainText(/速度|0.25|4/);
      await expect(field('最终时长（秒）')).toHaveValue('1');
      assert.deepEqual((await waitSaved()).clips[0], before);
    });
    await check('image hold, canvas ratios and contain/cover preview fit', async () => {
      await clips().nth(1).click();
      await setField('图片停留时长（秒）', 1.5);
      for (const ratio of ['9:16', '16:9', '1:1']) {
        await setField('画布比例', ratio);
        assert.equal(await edit().locator('.edit-preview').evaluate(node => node.style.aspectRatio.replaceAll(' ', '')), ratio.replace(':', '/'));
      }
      await setField('画面适配', 'cover'); await seek(1.2);
      await expect(edit().locator('.edit-preview img')).toBeVisible();
      await expect.poll(() => edit().locator('.edit-preview img').evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
      assert.equal(await edit().locator('.edit-preview img').evaluate(node => getComputedStyle(node).objectFit), 'cover');
      await setField('画面适配', 'contain');
      assert.equal(await edit().locator('.edit-preview img').evaluate(node => getComputedStyle(node).objectFit), 'contain');
      const data = await waitSaved();
      assert.equal(data.ratio, '1:1'); assert.equal(data.clips[1].speed, 1); assert.equal(data.clips[1].in, 0); near(data.clips[1].out, 1.5);
    });
    await check('split at playhead, reorder, duplicate/delete and undo/redo', async () => {
      await clips().first().click(); await seek(0.5);
      await inspector().getByRole('button', {name: '在播放头分割', exact: true}).click();
      await expect(clips()).toHaveCount(3);
      let data = await waitSaved();
      near(data.clips[0].out, data.clips[1].in); near(clipLength(data.clips[0]), 0.5); near(clipLength(data.clips[1]), 0.5);
      const ids = data.clips.map(clip => clip.id);
      await inspector().getByRole('button', {name: '后移', exact: true}).click();
      data = await waitSaved(); assert.deepEqual(data.clips.map(clip => clip.id), [ids[0], ids[2], ids[1]]);
      await inspector().getByRole('button', {name: '前移', exact: true}).click();
      await inspector().getByRole('button', {name: '复制', exact: true}).click();
      await expect(clips()).toHaveCount(4);
      await inspector().getByRole('button', {name: '删除', exact: true}).click();
      await expect(clips()).toHaveCount(3);
      await edit().getByRole('button', {name: '撤销', exact: true}).click(); await expect(clips()).toHaveCount(4);
      await edit().getByRole('button', {name: '重做', exact: true}).click(); await expect(clips()).toHaveCount(3);
      data = await waitSaved(); assert.deepEqual(data.clips.map(clip => clip.id), ids);
    });
    await check('autosave and browser reload preserve all edit tracks', async () => {
      const before = await waitSaved();
      await page.reload();
      await expect(page.locator('#project-name')).toHaveText(project.name);
      await page.locator('[data-stage="edit"]').click();
      await expect(clips()).toHaveCount(3);
      await expect(edit().locator('.edit-status')).toContainText('剪辑已保存');
      assert.deepEqual(await saved(), before);
      await expect(edit().locator('.edit-track-audio .edit-block')).toHaveCount(1);
      await expect(edit().locator('.edit-track-texts .edit-block')).toHaveCount(1);
      report.savedEdit = before;
    });
    await check('seek, frame stepping, live video/audio playback and pause', async () => {
      await seek(0.1);
      const video = edit().locator('.edit-preview video');
      await expect(video).toBeVisible();
      await expect.poll(() => video.evaluate(node => node.readyState)).toBeGreaterThanOrEqual(2);
      near(await video.evaluate(node => node.currentTime), 0.8, 0.08);
      assert.equal(await video.evaluate(node => node.playbackRate), 3);
      await edit().getByRole('button', {name: '+1帧', exact: true}).click();
      near(Number(await edit().getByRole('slider', {name: '预览播放头（秒）'}).inputValue()), 4 / 30);
      await edit().getByRole('button', {name: '−1帧', exact: true}).click();
      await seek(0.3);
      await edit().getByRole('button', {name: '播放', exact: true}).click();
      await expect(edit().getByRole('button', {name: '暂停', exact: true})).toBeVisible();
      await expect.poll(async () => Number(await edit().getByRole('slider', {name: '预览播放头（秒）'}).inputValue())).toBeGreaterThan(0.35);
      await expect.poll(() => edit().locator('audio').evaluate(node => !node.paused && node.readyState >= 2)).toBe(true);
      await edit().getByRole('button', {name: '暂停', exact: true}).click();
      const stopped = Number(await edit().getByRole('slider', {name: '预览播放头（秒）'}).inputValue());
      assert.equal(await video.evaluate(node => node.paused), true);
      assert.equal(await edit().locator('audio').evaluate(node => node.paused), true);
      await expect(edit().getByRole('button', {name: '播放', exact: true})).toBeVisible();
      near(Number(await edit().getByRole('slider', {name: '预览播放头（秒）'}).inputValue()), stopped, 0.001);
      await seek(1.3);
      await expect(edit().locator('.edit-preview img')).toBeVisible();
      await expect(edit().locator('.edit-preview-text')).toHaveText('导演剪辑冒烟\n真实导出');
    });
    await check('audio/text tail warning and actual CPU MP4 export/download', async () => {
      // Deliberately exceed the visual main track. Persisted tails stay intact,
      // but preview/export duration must still be exactly the visual sum.
      await edit().locator('.edit-track-audio .edit-block').click();
      await setField('源出点（秒）', 6);
      await edit().locator('.edit-track-texts .edit-block').click();
      await setField('结束（秒）', 6);
      const data = await waitSaved();
      const duration = data.clips.reduce((sum, clip) => sum + clipLength(clip), 0);
      near(duration, 2.5);
      await expect(edit().locator('p.notice.warning')).toContainText(/超出|主轨|成片/);
      near(Number(await edit().getByRole('slider', {name: '预览播放头（秒）'}).getAttribute('max')), duration);
      const created = page.waitForResponse(response => response.url() === fixture.origin + endpoint() + '/exports' && response.request().method() === 'POST');
      await edit().getByRole('button', {name: '导出当前剪辑', exact: true}).click();
      const response = await created; assert.equal(response.status(), 202);
      const record = (await response.json()).export;
      near(record.duration, duration); assert.equal(record.edit_rev, data.rev);
      await expect.poll(async () => {
        const current = (await api(endpoint() + '/exports')).exports.find(item => item.id === record.id);
        if (current.status === 'error' || current.status === 'canceled') throw new Error(JSON.stringify(current));
        return current.status;
      }, {timeout: 120000, intervals: [200, 500, 1000]}).toBe('done');
      await expect(edit().getByRole('link', {name: '下载成片', exact: true})).toBeVisible({timeout: 15000});
      const downloadEvent = page.waitForEvent('download');
      await edit().getByRole('link', {name: '下载成片', exact: true}).click();
      const download = await downloadEvent;
      assert.equal(await download.failure(), null);
      const output = path.join(folder, 'export.mp4'); await download.saveAs(output);
      const bytes = fs.readFileSync(output);
      assert.ok(bytes.length > 5000); assert.equal(bytes.subarray(4, 8).toString(), 'ftyp');
      const probe = ffmpeg(fixture.ffmpeg, ['-i', output], true);
      fs.writeFileSync(path.join(folder, 'export-probe.log'), probe);
      assert.match(probe, /Video: h264.*720x720/);
      assert.match(probe, /30 fps/); assert.match(probe, /Audio: aac/);
      const match = probe.match(/Duration: (\d+):(\d+):([\d.]+)/); assert.ok(match, probe);
      near(Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]), duration, 0.08);
      // Decode the entire MP4, not just a successful download/header.
      ffmpeg(fixture.ffmpeg, ['-v', 'error', '-i', output, '-f', 'null', '-']);
      report.export = {...record, output, bytes: bytes.length, measuredDuration: Number(match[3])};
      await edit().getByRole('button', {name: '播放成片', exact: true}).click();
      const result = edit().locator('.edit-result-dialog');
      await expect(result).toBeVisible();
      await expect.poll(() => result.locator('video').evaluate(node => node.readyState >= 2 && !node.paused)).toBe(true);
      await result.getByRole('button', {name: '关闭', exact: true}).click();
      await expect(result).not.toBeVisible();
    });
    await check('cancel a real export from editor without publishing an artifact', async () => {
      const created = page.waitForResponse(response => response.url() === fixture.origin + endpoint() + '/exports' && response.request().method() === 'POST');
      await edit().getByRole('button', {name: '导出当前剪辑', exact: true}).click();
      const record = (await (await created).json()).export;
      const canceled = page.waitForResponse(response => response.url() === `${fixture.origin}${endpoint()}/exports/${record.id}/cancel` && response.request().method() === 'POST');
      await edit().locator('.edit-export-row').first().getByRole('button', {name: '取消', exact: true}).click();
      const cancellation = (await (await canceled).json()).export;
      assert.equal(cancellation.status, 'canceled'); assert.ok(!cancellation.url);
      await expect(edit().locator('.edit-export-row').first()).toContainText('已取消');
      const current = (await api(endpoint() + '/exports')).exports.find(item => item.id === record.id);
      assert.equal(current.status, 'canceled'); assert.ok(!current.url);
      report.cancellation = current;
    });
    await check('real revision conflict retains downloadable local draft and remote edit', async () => {
      const previous = await waitSaved();
      const remote = {...structuredClone(previous), ratio: '9:16'};
      const remoteSaved = (await api(endpoint(), 'PUT', remote)).edit;
      await edit().locator('.edit-track-texts .edit-block').click();
      conflictExpected = true;
      const conflictResponse = page.waitForResponse(response => response.url() === fixture.origin + endpoint() && response.request().method() === 'PUT' && response.status() === 409);
      await setField('文字内容', '冲突保留的本地草稿');
      await conflictResponse;
      await expect(edit().locator('.edit-status')).toContainText('本页草稿仍保留');
      await expect(edit().getByRole('button', {name: '下载保留草稿', exact: true})).toBeVisible();
      await expect(field('文字内容')).toHaveValue('冲突保留的本地草稿');
      await expect(field('文字内容')).toBeDisabled();
      assert.deepEqual(await saved(), remoteSaved);
      const downloadEvent = page.waitForEvent('download');
      await edit().getByRole('button', {name: '下载保留草稿', exact: true}).click();
      const download = await downloadEvent;
      assert.equal(await download.failure(), null);
      const draftPath = path.join(folder, 'conflict-draft.json'); await download.saveAs(draftPath);
      const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
      assert.equal(draft.project, project.id);
      assert.equal(draft.edit.texts[0].text, '冲突保留的本地草稿');
      assert.equal(draft.edit.rev, previous.rev); assert.equal(draft.edit.ratio, previous.ratio);
      assert.deepEqual(draft.edit.clips, previous.clips);
      report.conflict = {expectedResponses: conflictResponses, consoleDiagnostics: conflictConsoleErrors, draftPath};
      assert.equal(conflictResponses, 1);
      // Explicitly reject discarding the draft once, then confirm recovery.
      await edit().getByRole('button', {name: '重新加载剪辑', exact: true}).click();
      await expect(field('文字内容')).toHaveValue('冲突保留的本地草稿');
      page.removeAllListeners('dialog');
      page.on('dialog', dialog => dialog.accept());
      await edit().getByRole('button', {name: '重新加载剪辑', exact: true}).click();
      await expect(edit().locator('.edit-status')).toContainText('剪辑已保存');
      await expect(field('画布比例')).toHaveValue('9:16');
      assert.deepEqual(await saved(), remoteSaved);
      conflictExpected = false;
    });
    // Always run independent safety/error checks even when a UI case failed.
    await t.test('strict browser errors and zero generation/upstream/canvas mutations', async () => {
      const audit = await (await context.request.get(fixture.origin + '/__fixture/audit')).json();
      report.audit = audit;
      assert.equal(path.resolve(audit.root), path.resolve(folder));
      assert.ok(audit.caps > 10);
      assert.deepEqual(audit.generation, []); assert.deepEqual(audit.outbound, []); assert.deepEqual(audit.jobs, []);
      assert.deepEqual(report.generation, []);
      if (project) {
        const after = await api('/api/projects/' + project.id);
        report.finalPersistedEdit = await saved();
        for (const key of ['cards', 'edges', 'rev']) assert.deepEqual(after[key], initialCanvas[key], `Editor changed canvas ${key}`);
      }
      assert.deepEqual(report.httpErrors, [], 'Unexpected HTTP errors');
      assert.deepEqual(report.failedRequests, [], 'Unexpected browser request failures');
      assert.deepEqual(report.browserErrors, [], 'Browser errors are not allowed');
      report.cases.push({name: 'strict browser errors and zero generation/upstream/canvas mutations', status: 'passed'});
    });
  } finally {
    shuttingDown = true;
    if (page && !page.isClosed()) await page.screenshot({path: path.join(folder, 'editor.png'), fullPage: true}).catch(() => {});
    if (context) await context.tracing.stop({path: path.join(folder, 'trace.zip')}).catch(() => {});
    if (browser) await browser.close();
    if (fixture) await fixture.stop();
    fs.writeFileSync(path.join(folder, 'report.json'), JSON.stringify(report, null, 2));
    t.diagnostic('Evidence: ' + folder);
  }
});
