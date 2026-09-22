// NODE_PATH must include Playwright; optionally set CHOUKA_TEST_BROWSER=msedge.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createServer } = require('node:http');
const { chromium } = require('playwright');

const source = readFileSync(path.join(__dirname, '..', 'web', 'app.js'), 'utf8');
const helpers = source.slice(source.indexOf('const VIDEO_PREVIEWS ='), source.indexOf('/** 素材格里的图/视频/音频'));
const viewer = source.slice(source.indexOf('const VIEW_WORD ='), source.indexOf('function cardMenu('));

test('video previews play in browser while assets keep original URLs and refs', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'chouka-preview-'));
  let server, browser;
  try {
    const fixture = path.join(directory, 'preview.mp4');
    execFileSync(process.env.CHOUKA_TEST_FFMPEG || 'ffmpeg', [
      '-nostdin', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=96x64:rate=12:duration=2',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', fixture,
    ]);
    const videoBytes = readFileSync(fixture);
    let requests = 0, originalRequests = 0;
    const html = `<!doctype html><meta charset="utf-8"><div id="fixture"></div>
      <button id="open-viewer">双击预览</button><div id="view" style="display:none"><div id="vbox"></div></div><script>
      const api = async url => { const r = await fetch(url); if (!r.ok) throw Error('HTTP ' + r.status); return r.json(); };
      ${helpers}
      const el = {view:document.getElementById('view'), vbox:document.getElementById('vbox')};
      const toast = message => { throw Error(message); };
      ${viewer}
      window.testAsset = {kind:'video', url:'/api/upload/ck_123456789abc.mov', ref:'chouka/ck_123456789abc.mov'};
      const box = document.getElementById('fixture');
      box.innerHTML = '<video data-video-url="' + testAsset.url + '" muted controls></video><video data-video-url="' + testAsset.url + '" muted></video>';
      prepareVideos(box);
      document.getElementById('open-viewer').ondblclick = () => openViewer({outputs:[{kind:'video',url:testAsset.url,filename:'preview.mp4'}]});
      window.createVideo = (url) => { const v = document.createElement('video'); box.append(v); return prepareVideo(v, url); };
      </script>`;
    server = createServer((req, res) => {
      if (req.url === '/api/preview/ck_123456789abc.mov') {
        requests++;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(requests === 1 ? {status:'queued'} : {status:'ready', url:'/api/preview/ck_123456789abc.mov/file'}));
      } else if (req.url === '/api/preview/broken.mov') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({status:'error', error:'测试转码失败；修复转码后才能生成。'}));
      } else if (req.url.endsWith('/file') || req.url === '/api/artifact/result.mp4') {
        res.setHeader('Content-Type', 'video/mp4');
        res.end(videoBytes);
      } else if (req.url.startsWith('/api/upload/')) {
        originalRequests++;
        res.writeHead(415); res.end('original codec unsupported');
      } else {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
      }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    assert.equal(await page.locator('video').first().getAttribute('data-preview-state'), 'processing');
    assert.match(await page.locator('video').first().getAttribute('poster'), /^data:image\/svg\+xml/);
    await page.waitForFunction(() => [...document.querySelectorAll('video')].every(v => v.readyState >= 2));
    assert.equal(requests, 2, 'players should share one polling loop');
    assert.equal(originalRequests, 0, 'preview playback must not request the original');
    const result = await page.evaluate(async () => {
      const video = document.querySelector('video');
      await video.play();
      await new Promise(resolve => video.addEventListener('timeupdate', resolve, {once:true}));
      video.pause();
      return {src:video.getAttribute('src'), time:video.currentTime, width:video.videoWidth, asset:testAsset};
    });
    assert.equal(result.src, '/api/preview/ck_123456789abc.mov/file');
    assert.ok(result.time > 0);
    assert.equal(result.width, 96);
    assert.equal(result.asset.url, '/api/upload/ck_123456789abc.mov');
    assert.equal(result.asset.ref, 'chouka/ck_123456789abc.mov');
    await page.locator('#open-viewer').dblclick();
    await page.waitForFunction(() => {
      const video = document.querySelector('#vbox video');
      return video && video.readyState >= 3 && !video.paused && video.currentTime > 0;
    });
    assert.equal(await page.locator('#vbox video').getAttribute('autoplay'), '');
    await page.evaluate(() => createVideo(testAsset.url));
    assert.equal(requests, 2, 'reopening should reuse the preview URL');
    await page.evaluate(() => createVideo('/api/artifact/result.mp4'));
    assert.equal(await page.locator('#fixture video').last().getAttribute('src'), '/api/artifact/result.mp4');
    await page.evaluate(() => createVideo('/api/upload/broken.mov'));
    assert.equal(await page.locator('#fixture video').last().getAttribute('data-preview-state'), 'error');
    assert.match(await page.locator('#fixture video').last().getAttribute('title'), /修复转码后才能生成/);
    assert.equal(await page.locator('#fixture video').last().getAttribute('src'), null);
    assert.equal(originalRequests, 0, 'failed transcodes must not fall back to the original');
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    rmSync(directory, {recursive:true, force:true});
  }
});

test('all video entry points use the shared preview loader', () => {
  assert.equal((source.match(/<video data-video-url=/g) || []).length, 4);
  for (const call of ['prepareVideos(body)', 'prepareVideos(rg)', 'prepareVideos(box)',
    'prepareVideo(m, out.url)', 'prepareVideo(video, data.url)', 'prepareVideo(v, item.url)']) {
    assert.ok(source.includes(call), call);
  }
  assert.ok(source.includes("fetch(new URL(out.url, location.href), {credentials:'same-origin'})"),
    'importOutput must fetch the original with its session');
  assert.ok(source.includes('return uploadAsset(file)'), 'importOutput must use the authorized upload path');
});
