// 运行：NODE_PATH=/private/tmp/h3card-alignment-tests.0KG4SJ/node_modules CHOUKA_TEST_BROWSER=chrome node --test tests/test_canvas_loading.cjs
// 完整页面回归：只模拟 HTTP 数据和媒体，不抽取函数、不替换业务渲染及权限实现。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createServer } = require('node:http');
const { createHash } = require('node:crypto');
const { EventEmitter } = require('node:events');
const { chromium } = require('playwright');

const web = path.resolve(__dirname, '../web');
const clone = value => JSON.parse(JSON.stringify(value));
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const manifests = {
  comfy_online:true,
  cards:[{id:'fixture_gen', name:'回归生成', kind:'gen', icon:'G', outputType:'image',
    modes:[{id:'fixture_image', name:'图片'}, {id:'fixture_video', name:'视频'}, {id:'fixture_compare', name:'对比'}]},
    {id:'fixture_asset', name:'素材', kind:'asset', icon:'A', modes:[]}],
  capabilities:Object.fromEntries(['image','video','compare'].map(kind => [`fixture_${kind}`, {
    id:`fixture_${kind}`, name:`回归${kind}`, kind:'gen', card:'fixture_gen',
    outputType:kind === 'video' ? 'video' : 'image', params:[],
    inputs:kind === 'compare' ? [{key:'image',type:'image',name:'原图'}] : [], compare:kind === 'compare',
  }])),
};
function card(index, kind = index % 2 ? 'image' : 'video', prefix = 'large') {
  const ext = kind === 'image' ? 'png' : kind === 'audio' ? 'wav' : index % 4 ? 'mp4' : 'mov';
  const source = index % 4 ? 'artifact' : 'upload';
  return {id:`${prefix}_${index}`,type:kind === 'audio' ? 'fixture_asset' : 'fixture_gen',
    cap:kind === 'video' ? 'fixture_video' : 'fixture_image',name:`节点${index + 1}`,
    x:index < 24 ? 500 + (index % 8) * 1100 : 40000 + (index % 20) * 1200,
    y:index < 24 ? 500 + Math.floor(index / 8) * 1400 : 40000 + Math.floor(index / 20) * 1600,
    w:268,h:160,status:'done',params:{},assets:{},history:[],
    outputs:[{kind,url:`/api/${source}/${prefix}_${index}.${ext}${index === 1 ? '?variant=a&x=2' : ''}`,
      ref:`chouka/${prefix}_${index}.${ext}`,filename:`${prefix}_${index}.${ext}`,width:3840,height:2160}]};
}
function project(id, cards, permission = 'operate') {
  return {id,name:`回归画布${id}`,owner_id:'tester',owner_username:'tester',permission,
    rev:1,locked:false,cards,edges:[],groups:[],view:{x:40,y:40,k:0.1}};
}
function largeProject(permission = 'operate') {
  const cards = Array.from({length:381}, (_, i) => card(i));
  delete cards[371].outputs[0].filename;
  cards[371].outputs[0].origin = '历史目录/缺文件名原图.png';
  delete cards[372].outputs[0].filename;
  delete cards[372].outputs[0].origin;
  cards[372].outputs[0].kind = 'image';
  cards[372].outputs[0].url = '/api/artifact/缺文件名原图372.png';
  // 同时覆盖上传图片和 artifact 图片，以及本地上传和 artifact 视频封面。
  cards[4] = card(4, 'image');
  const p = project('large', cards, permission);
  p.edges = Array.from({length:272}, (_, i) => ({from:cards[i].id,to:cards[i + 1].id,slot:'image'}));
  return p;
}
function smallProject(id, kinds = ['image','video'], permission = 'operate') {
  const p = project(id, kinds.map((kind, i) => ({...card(i, kind, id),x:50 + i * 330,y:100})), permission);
  p.view = {x:30,y:20,k:1};
  return p;
}

// 计数以浏览器 AbortSignal 和完整 Blob 读取为准，不把服务端尚未收到断开通知的连接误算为并发。
function installProbe(options) {
  const probe = window.__canvasProbe = {active:0,max:0,fetches:[],created:[],revoked:[],observers:[],batches:[],late:null,holdNextBlob:options.holdNextBlob,
    previews:[],timers:[],latePreview:null,holdNextPreviewJSON:false};
  window.addEventListener('unhandledrejection', event => {
    window.__reportCanvasIssue(`未处理拒绝：${event.reason?.name} ${event.reason?.message || event.reason}`);
  });
  // 只观察原生计时器，不加速轮询；取消必须实际清除 1.5 秒等待。
  const nativeTimeout = window.setTimeout.bind(window), nativeClear = window.clearTimeout.bind(window);
  window.setTimeout = (callback, delay, ...args) => {
    if (delay !== 1500) return nativeTimeout(callback,delay,...args);
    const record = {cleared:false,fired:false};
    record.id = nativeTimeout((...values) => { record.fired = true; callback(...values); },delay,...args);
    probe.timers.push(record); return record.id;
  };
  window.clearTimeout = id => {
    const record = probe.timers.find(record => record.id === id);
    if (record) record.cleared = true;
    return nativeClear(id);
  };
  new MutationObserver(records => {
    for (const record of records) {
      const text = record.type === 'attributes' ? record.target.title : record.target.textContent;
      if (/AbortError|aborted|abort signal/i.test(text || '')) window.__reportCanvasIssue(`取消异常提示：${text}`);
    }
  }).observe(document,{subtree:true,attributes:true,attributeFilter:['title'],childList:true,characterData:true});
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function(input, options = {}) {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
    if (/^\/api\/preview\/[^/]+$/.test(url.pathname)) {
      const record = {path:url.pathname,aborted:options.signal?.aborted || false,jsonRead:false};
      probe.previews.push(record);
      options.signal?.addEventListener('abort',() => { record.aborted = true; },{once:true});
      const response = await nativeFetch(input,options), nativeJSON = response.json.bind(response);
      response.json = async () => {
        const data = await nativeJSON(); record.jsonRead = true; record.status = data.status;
        // 状态来自完整 HTTP 响应，仅延迟 JSON 读取的交付，验证成功结果迟到的意图守卫。
        if (probe.holdNextPreviewJSON) {
          probe.holdNextPreviewJSON = false; probe.latePreview = record;
          await new Promise(resolve => { probe.releasePreviewJSON = resolve; });
        }
        return data;
      };
      return response;
    }
    if (url.pathname !== '/api/thumbnail') return nativeFetch(input, options);
    const record = {url:url.href,original:url.searchParams.get('url'),finished:false,aborted:false};
    probe.fetches.push(record); probe.active++; probe.max = Math.max(probe.max, probe.active);
    const finish = () => { if (!record.finished) { record.finished = true; probe.active--; } };
    options.signal?.addEventListener('abort', () => { record.aborted = true; finish(); }, {once:true});
    try {
      const response = await nativeFetch(input, options);
      if (!response.ok) { finish(); return response; }
      const nativeBlob = response.blob.bind(response);
      response.blob = async () => {
        try {
          const blob = await nativeBlob();
          // 用已到达的真实 HTTP Blob 模拟解码/读取迟到，而非伪造生产函数返回值。
          if (probe.holdNextBlob) {
            probe.holdNextBlob = false;
            probe.late = {original:record.original};
            await new Promise(resolve => { probe.releaseBlob = resolve; });
          }
          return blob;
        } finally { finish(); }
      };
      return response;
    } catch (error) { finish(); throw error; }
  };
  const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = blob => { const url = create(blob); probe.created.push(url); return url; };
  URL.revokeObjectURL = url => { probe.revoked.push(url); return revoke(url); };
  const NativeObserver = window.IntersectionObserver;
  window.IntersectionObserver = class extends NativeObserver {
    constructor(callback, options) {
      super(callback, options);
      probe.observers.push({root:options?.root?.id,margin:options?.rootMargin});
    }
  };
  new MutationObserver(records => {
    for (const record of records) if (record.target.id === 'world' && record.addedNodes.length) {
      probe.batches.push({added:record.addedNodes.length,total:record.target.querySelectorAll('.card').length});
    }
  }).observe(document, {childList:true,subtree:true});
}

async function fixtureServer(videoBytes, audioBytes) {
  const staticFiles = Object.fromEntries(['index.html','style.css','app.js','auth.js'].map(name => [name,readFileSync(path.join(web,name))]));
  const state = {projects:[],requests:[],writes:[],held:[],events:new EventEmitter(),thumbnailDelay:65,holdThumbnails:false,holdPreviews:false,previewModes:{},heldPaths:new Set(),failThumbnail:null};
  const json = (res, data, status = 200) => { res.writeHead(status, {'Content-Type':'application/json'}); res.end(JSON.stringify(data)); };
  const server = createServer((req,res) => {
    const url = new URL(req.url, 'http://localhost');
    const record = {method:req.method,path:url.pathname,url:req.url,original:url.searchParams.get('url'),closed:false,complete:false};
    state.requests.push(record);
    res.on('close', () => { record.closed = true; state.events.emit('change'); });
    res.on('finish', () => { record.complete = true; });
    if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
      state.writes.push(record);
      let body = ''; req.on('data', bytes => { body += bytes; });
      req.on('end', () => { record.body = body; json(res,{ok:true,rev:2}); });
      return;
    }
    const delayed = callback => {
      const item = {record,send:() => { if (!res.destroyed && !res.writableEnded) callback(); }};
      state.held.push(item);
      state.events.emit('change');
      return item;
    };
    if (state.heldPaths.has(url.pathname)) { delayed(() => json(res,{ok:true})); return; }
    if (url.pathname === '/api/auth/me') return json(res,{user:{id:'tester',username:'tester',role:'user'},csrf_token:'fixture-csrf'});
    if (url.pathname === '/api/cards') return json(res,manifests);
    if (url.pathname === '/api/projects') return json(res,{projects:state.projects.map(p => ({...p,cards:p.cards.length,edges:undefined,groups:undefined})),teams:[]});
    if (/^\/api\/projects\/[^/]+$/.test(url.pathname)) {
      const p = state.projects.find(p => p.id === decodeURIComponent(url.pathname.split('/').pop()));
      return json(res,p || {error:'不存在'},p ? 200 : 404);
    }
    if (url.pathname === '/api/health') return json(res,{comfy_online:true,mode:'local'});
    if (url.pathname === '/api/jobs') return json(res,{jobs:[]});
    if (url.pathname === '/api/thumbnail') {
      const item = delayed(() => {
        if (record.original === state.failThumbnail) return json(res,{error:'测试缩略图失败'},state.failThumbnailStatus);
        res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-store'}); res.end(PNG);
      });
      if (!state.holdThumbnails) setTimeout(item.send,state.thumbnailDelay);
      return;
    }
    if (/^\/api\/preview\/[^/]+$/.test(url.pathname)) {
      const mode = state.previewModes[url.pathname];
      const send = () => json(res,mode === 'processing' ? {status:'processing'} : {status:'ready',url:`${url.pathname}/file`});
      if (state.holdPreviews || mode === 'hold') delayed(send); else send();
      return;
    }
    if (/^\/api\/(upload|artifact)\//.test(url.pathname) || /\/api\/preview\/.+\/file$/.test(url.pathname) || url.pathname === '/comfy/view') {
      const bytes = /\.png$/.test(url.pathname) ? PNG : /\.wav$/.test(url.pathname) ? audioBytes : videoBytes;
      const type = bytes === PNG ? 'image/png' : bytes === audioBytes ? 'audio/wav' : 'video/mp4';
      // 真实视频播放支持 Range，避免把浏览器合法续读当成重复业务请求。
      const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
      if (range) {
        const start = Number(range[1]), end = Math.min(range[2] ? Number(range[2]) : bytes.length - 1,bytes.length - 1);
        res.writeHead(206,{'Content-Type':type,'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${bytes.length}`,'Content-Length':end-start+1});
        res.end(bytes.subarray(start,end+1));
      } else { res.writeHead(200,{'Content-Type':type,'Accept-Ranges':'bytes','Content-Length':bytes.length}); res.end(bytes); }
      return;
    }
    if (url.pathname === '/login') {
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
      return res.end('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>本地回归登录页</title><body>已退出登录</body></html>');
    }
    const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    if (staticFiles[name]) {
      res.writeHead(200,{'Content-Type':name.endsWith('.html') ? 'text/html; charset=utf-8' : name.endsWith('.css') ? 'text/css' : 'text/javascript','Cache-Control':'no-store'});
      return res.end(staticFiles[name]);
    }
    if (['/favicon.png','/icon.png'].includes(url.pathname)) { res.writeHead(200,{'Content-Type':'image/png'}); return res.end(PNG); }
    res.writeHead(404); res.end('测试未配置请求');
  });
  // 保留真实 WebSocket 构造和连接，提供仅握手的 presence 端点，不触发页面错误或重连风暴。
  const sockets = new Set();
  server.on('upgrade',(req,socket) => {
    sockets.add(socket); socket.on('close',() => sockets.delete(socket)); socket.on('error',() => {});
    const accept = createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
    socket.on('data', bytes => { if ((bytes[0] & 15) === 8) socket.end(Buffer.from([0x88,0])); });
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  return {state,origin:`http://127.0.0.1:${server.address().port}`,release:() => { for (const item of state.held.splice(0)) item.send(); },
    close:async () => { for (const socket of sockets) socket.destroy(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }};
}

// 服务端握手用事件等待，确保取消用例确实有已受理请求，不靠任意延时碰运气。
function waitServer(state,predicate,message) {
  if (predicate()) return Promise.resolve();
  return new Promise((resolve,reject) => {
    const done = () => { if (predicate()) { clearTimeout(timer); state.events.off('change',done); resolve(); } };
    const timer = setTimeout(() => { state.events.off('change',done); reject(new Error(message)); },5000);
    state.events.on('change',done);
  });
}
async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForFunction(() => cardMediaActive === 0 && [...CARD_MEDIA.values()].every(s => !s.visible || s.done));
}
const mediaRequests = state => state.requests.filter(r => /^\/api\/(upload|artifact)\//.test(r.path) || /\/api\/preview\/.+\/file$/.test(r.path) || r.path === '/comfy/view');
const previewRequests = state => state.requests.filter(r => /^\/api\/preview\/[^/]+$/.test(r.path));
const thumbs = state => state.requests.filter(r => r.path === '/api/thumbnail');
async function outputs(page) { return page.evaluate(() => PROJ.cards.map(c => c.outputs)); }
async function quietWrites(page,state) {
  // 保存 debounce 为 700ms；明确观察超过该窗口，不能在计时器触发前就宣称没有保存。
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve,850)));
  assert.deepEqual(state.writes,[],'单纯加载及预览不得产生 API 写请求');
}
async function assertReclaimed(page, oldURLs) {
  const probe = await page.evaluate(() => ({revoked:__canvasProbe.revoked,created:__canvasProbe.created}));
  for (const url of oldURLs) assert.ok(probe.revoked.includes(url),`旧 BlobURL 未回收：${url}`);
}

test('画布加载专项：实际页面、本地 HTTP 和真实 Chrome', {timeout:120000}, async t => {
  const directory = mkdtempSync(path.join(tmpdir(),'h3card-canvas-loading-'));
  let browser, fixture;
  try {
    const mp4 = path.join(directory,'fixture.mp4'), wav = path.join(directory,'fixture.wav');
    execFileSync(process.env.CHOUKA_TEST_FFMPEG || 'ffmpeg',['-nostdin','-v','error','-y','-f','lavfi','-i','testsrc2=size=96x64:rate=12:duration=3','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',mp4]);
    execFileSync(process.env.CHOUKA_TEST_FFMPEG || 'ffmpeg',['-nostdin','-v','error','-y','-f','lavfi','-i','sine=frequency=440:duration=1',wav]);
    fixture = await fixtureServer(readFileSync(mp4),readFileSync(wav));
    browser = await chromium.launch({channel:process.env.CHOUKA_TEST_BROWSER || 'chrome'});
    async function withPage(projects, run, configure = () => {}) {
      const state = fixture.state;
      Object.assign(state,{projects:clone(projects),requests:[],writes:[],held:[],thumbnailDelay:65,holdThumbnails:false,holdPreviews:false,previewModes:{},heldPaths:new Set(),failThumbnail:null,failThumbnailStatus:500,holdNextBlob:false});
      configure(state);
      const context = await browser.newContext({viewport:{width:1440,height:960}});
      await context.addInitScript(installProbe,{holdNextBlob:state.holdNextBlob});
      const page = await context.newPage(), errors = [], external = [];
      page.setDefaultTimeout(10000);
      page.on('pageerror',error => errors.push(error.message));
      await page.exposeFunction('__reportCanvasIssue',message => { errors.push(message); });
      await page.route('**/*',route => {
        const url = new URL(route.request().url());
        if (url.origin === fixture.origin || ['blob:','data:'].includes(url.protocol)) return route.continue();
        external.push(url.href); return route.abort();
      });
      try {
        await page.goto(`${fixture.origin}/?project=${projects[0].id}`);
        await page.evaluate(() => bootReady);
        assert.equal(await page.locator('#world .card').count(),projects[0].cards.length,'启动必须完整渲染');
        await run(page,state);
        assert.deepEqual(errors,[],'实际页面不得产生未捕获异常');
        assert.deepEqual(external,[],'测试禁止访问外网');
      } finally { fixture.release(); await context.close(); }
    }

    await t.test('381 节点一次追加、缺 filename 不截断、272 边完整且恢复 10% 视图', async () => {
      const p = largeProject();
      await withPage([p],async (page,state) => {
        await settle(page);
        assert.equal(await page.locator('#wires path').count(),544);
        assert.equal(await page.locator('#wires path.hit').count(),272);
        assert.equal(await page.locator('#zoom-percent').textContent(),'10%');
        assert.deepEqual(await page.evaluate(() => view),p.view);
        assert.match(await page.locator('#world').getAttribute('style'),/scale\(0\.1\)/);
        assert.equal(await page.locator('[data-id="large_371"] .meta').textContent(),'缺文件名原图.png');
        assert.equal(await page.locator('[data-id="large_372"] .meta').textContent(),'缺文件名原图372.png');
        assert.equal(await page.locator('[data-id="large_380"]').count(),1);
        assert.deepEqual(await page.evaluate(() => __canvasProbe.batches),[{added:381,total:381}]);
        assert.deepEqual(await outputs(page),p.cards.map(c => c.outputs));
        await quietWrites(page,state);
      });
    });

    await t.test('首屏只请求视口和 120px 缓冲缩略图，编码原 URL，完整 Blob 并发不超过 4', async () => {
      await withPage([largeProject()],async (page,state) => {
        await settle(page);
        const visible = await page.evaluate(() => {
          const root = el.stage.getBoundingClientRect();
          return [...CARD_MEDIA].filter(([node]) => {
            const r = node.getBoundingClientRect();
            return r.right > root.left - 120 && r.left < root.right + 120 && r.bottom > root.top - 120 && r.top < root.bottom + 120;
          }).map(([,s]) => s.url);
        });
        assert.ok(thumbs(state).length > 4 && thumbs(state).length < 381,'首屏须有真实请求且不是全项目请求');
        assert.deepEqual(new Set(thumbs(state).map(r => r.url)),new Set(visible));
        const probe = await page.evaluate(() => ({max:__canvasProbe.max,active:__canvasProbe.active,observers:__canvasProbe.observers}));
        assert.equal(probe.max,4,'夹具必须实际打满并发，否则上限断言无意义');
        assert.equal(probe.active,0);
        t.diagnostic(`381 张卡片首屏 ${thumbs(state).length} 个缩略图请求，原媒体 0、preview 状态 0，实测最大并发 ${probe.max}`);
        assert.deepEqual(probe.observers,[{root:'stage',margin:'120px'}]);
        const encoded = thumbs(state).find(r => r.original.includes('?variant='));
        assert.equal(encoded.url,`/api/thumbnail?url=${encodeURIComponent(encoded.original)}`);
        assert.ok(thumbs(state).some(r => r.original.startsWith('/api/upload/') && r.original.endsWith('.png')));
        assert.ok(thumbs(state).some(r => r.original.startsWith('/api/artifact/')));
        assert.equal(mediaRequests(state).length,0);
        assert.equal(previewRequests(state).length,0);
        assert.ok(await page.locator('#world img').evaluateAll(images => images.filter(i => i.getAttribute('src')).every(i => i.src.startsWith('blob:'))));
      });
    });

    await t.test('真实中键平移和滚轮缩放进入视口后才增加请求，远处节点保持无 src', async () => {
      await withPage([largeProject()],async (page,state) => {
        await settle(page);
        const initial = thumbs(state).length;
        const stage = await page.locator('#stage').boundingBox();
        const x = stage.x + stage.width - 100, y = stage.y + stage.height - 100;
        await page.mouse.move(x,y); await page.mouse.down({button:'middle'});
        await page.mouse.move(x-30,y-20,{steps:3}); await page.mouse.up({button:'middle'});
        await settle(page);
        assert.equal(thumbs(state).length,initial,'未进入缓冲区的平移不能触发远处加载');
        // 仍保留实际业务变换，先将远处片区放在缓冲外，再用真实鼠标越界进入。
        await page.evaluate(() => {
          const target = cardOf('large_24'), root = el.stage.getBoundingClientRect();
          view = {x:root.width+200-target.x*0.1,y:50-target.y*0.1,k:0.1}; applyView();
        });
        await settle(page);
        const targetURL = p => p.cards[24].outputs[0].url;
        const expected = targetURL(largeProject());
        assert.ok(!thumbs(state).some(r => r.original === expected),'目标必须仍在缓冲区外');
        const before = thumbs(state).length;
        await page.mouse.move(x,y); await page.mouse.down({button:'middle'});
        await page.mouse.move(x-250,y,{steps:3}); await page.mouse.up({button:'middle'});
        await settle(page);
        assert.ok(thumbs(state).some(r => r.original === expected),'实际平移进入视口才加载目标');
        assert.ok(thumbs(state).length > before);
        await page.evaluate(() => {
          const target = cardOf('large_340'), root = el.stage.getBoundingClientRect();
          view = {x:root.width/2-target.x*0.2,y:root.height+140-target.y*0.2,k:0.2}; applyView();
        });
        await settle(page);
        const zoomTarget = largeProject().cards[340].outputs[0].url;
        assert.ok(!thumbs(state).some(r => r.original === zoomTarget),'缩放目标须在缓冲外且未请求过');
        const at = thumbs(state).length;
        await page.mouse.move(stage.x+stage.width/2,stage.y+stage.height/2);
        await page.mouse.wheel(0,650);
        await settle(page);
        assert.ok(await page.evaluate(() => view.k < 0.2),'滚轮须实际改变缩放');
        assert.ok(thumbs(state).length > at,'缩小视图纳入新媒体后应增加请求');
        assert.ok(thumbs(state).some(r => r.original === zoomTarget),'真实滚轮缩放应加载刚纳入缓冲区的目标');
        assert.ok(await page.locator('#world img').evaluateAll(images => images.some(i => !i.getAttribute('src'))));
        assert.equal(mediaRequests(state).length,0);
        assert.equal(previewRequests(state).length,0);
        assert.ok(await page.evaluate(() => __canvasProbe.max <= 4));
        assert.ok(state.writes.every(r => r.path.endsWith('/view')),'平移缩放只允许保存个人视图，不允许写项目内容');
      });
    });

    await t.test('本地视频封面就绪仍 preload=none 无 src，真实单击后兼容 MP4 可播放', async () => {
      const p = smallProject('play',['video']);
      await withPage([p],async (page,state) => {
        await settle(page);
        const video = page.locator('#world video');
        assert.equal(await video.getAttribute('preload'),'none');
        assert.equal(await video.getAttribute('src'),null);
        assert.match(await video.getAttribute('poster'),/^blob:/);
        assert.equal(previewRequests(state).length,0); assert.equal(mediaRequests(state).length,0);
        await quietWrites(page,state);
        await video.click();
        await page.waitForFunction(() => { const v = el.world.querySelector('video'); return !v.paused && v.currentTime > 0 && v.videoWidth === 96; });
        assert.equal(await video.getAttribute('src'),'/api/preview/play_0.mov/file');
        assert.ok(previewRequests(state).length > 0);
        assert.equal(state.requests.filter(r => r.path === '/api/upload/play_0.mov').length,0,'播放不能下载不兼容原片');
        assert.deepEqual(await outputs(page),p.cards.map(c => c.outputs));
        await quietWrites(page,state);
      });
    });

    await t.test('真实双击原图查看保留原 URL，不将 Blob 缩略图当作原图', async () => {
      const p = smallProject('viewer_image',['image']);
      await withPage([p],async (page,state) => {
        await settle(page);
        await page.locator('#world img').dblclick();
        await page.waitForFunction(() => { const i = el.vbox.querySelector('img'); return i?.complete && i.naturalWidth === 1; });
        assert.equal(await page.locator('#view img').getAttribute('src'),p.cards[0].outputs[0].url);
        assert.ok(mediaRequests(state).some(r => r.path === '/api/upload/viewer_image_0.png'));
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#view').isVisible(),false);
        assert.deepEqual(await outputs(page),p.cards.map(c => c.outputs));
        await quietWrites(page,state);
      });
    });

    await t.test('真实双击视频打开带 controls 查看器并播放兼容 MP4，原 url/ref 保留', async () => {
      const p = smallProject('viewer_video',['video']);
      await withPage([p],async (page,state) => {
        await settle(page);
        await page.locator('#world video').dblclick();
        await page.waitForFunction(() => { const v = el.vbox.querySelector('video'); return v && v.controls && !v.paused && v.currentTime > 0; });
        assert.equal(await page.locator('#view video').getAttribute('src'),'/api/preview/viewer_video_0.mov/file');
        assert.equal(state.requests.filter(r => r.path === '/api/upload/viewer_video_0.mov').length,0);
        assert.deepEqual(await outputs(page),p.cards.map(c => c.outputs));
        await quietWrites(page,state);
      });
    });

    await t.test('未知宽高不能由缩略图写回，已知原尺寸、URL、ref 完全保持且加载不保存', async () => {
      const p = smallProject('dimensions',['image','video']);
      delete p.cards[0].outputs[0].width; delete p.cards[0].outputs[0].height;
      p.cards[1].outputs[0].width = 0; p.cards[1].outputs[0].height = 0;
      await withPage([p],async (page,state) => {
        await settle(page);
        assert.deepEqual(await outputs(page),p.cards.map(c => c.outputs));
        assert.equal(await page.locator('#world img').evaluate(i => i.naturalWidth),1,'必须真正解码缩略图，不能靠未加载而通过');
        assert.equal(await page.evaluate(() => cardOf('dimensions_0').outputs[0].width),undefined);
        assert.equal(await page.evaluate(() => cardOf('dimensions_1').outputs[0].width),0);
        assert.equal(mediaRequests(state).length,0);
        await quietWrites(page,state);
      });
    });

    await t.test('只读权限可以显示封面与缩略图，但删除、保存、上传不能写入', async () => {
      const p = smallProject('readonly',['image','video'],'read');
      await withPage([p],async (page,state) => {
        await settle(page);
        assert.equal(await page.locator('#world img').evaluate(i => i.naturalWidth),1);
        assert.match(await page.locator('#world video').getAttribute('poster'),/^blob:/);
        assert.equal(await page.evaluate(() => canOperate()),false);
        const before = await outputs(page);
        const result = await page.evaluate(async () => {
          delCard(PROJ.cards[0].id); save();
          try { await api('/api/upload',{method:'POST'}); return '错误地允许上传'; }
          catch (error) { return error.message; }
        });
        assert.match(result,/只读/);
        assert.equal(await page.locator('#world .card').count(),2);
        assert.deepEqual(await outputs(page),before);
        await quietWrites(page,state);
      });
    });

    await t.test('缩略图失败不能偷偷 fallback 原大图，明确双击仍可查看原图', async () => {
      const p = smallProject('failed',['image']);
      await withPage([p],async (page,state) => {
        await settle(page);
        assert.equal(await page.locator('#world img').getAttribute('src'),null);
        assert.match(await page.locator('#world img').getAttribute('title'),/500/);
        assert.equal(thumbs(state).length,1);
        assert.equal(mediaRequests(state).length,0);
        await quietWrites(page,state);
        await page.locator('#world img').dblclick();
        await page.waitForFunction(() => el.vbox.querySelector('img')?.naturalWidth === 1);
        assert.equal(await page.locator('#view img').getAttribute('src'),p.cards[0].outputs[0].url);
      },state => { state.failThumbnail = p.cards[0].outputs[0].url; });
    });

    await t.test('缩略图 404 仅核实权限：operate 不冻结、面板不关闭、381 节点不重绘且失败 URL 不重试', async () => {
      const p = largeProject(), failedURL = p.cards[1].outputs[0].url;
      await withPage([p],async (page,state) => {
        await page.waitForFunction(() => __canvasProbe.active === 4);
        await waitServer(state,() => thumbs(state).some(r => r.original === failedURL),'未等到待失败的真实缩略图请求');
        // 先打开真实参数面板，再返回 404，直接验证失败事件不能短暂冻结权限或关闭面板。
        await page.evaluate(async () => {
          await loadProjects();
          pick('large_3');
          window.__before404 = {project:PROJ,nodes:[...el.world.children],panel:el.panel.firstElementChild};
          window.__deniedPermissions = [];
          window.addEventListener('h3auth:denied',({detail}) => {
            if (detail.path === '/api/thumbnail') __deniedPermissions.push(PROJ?.permission);
          });
        });
        assert.equal(await page.locator('#panel').isVisible(),true,'失败前必须有已打开的真实面板');
        const listCount = state.requests.filter(r => r.path === '/api/projects').length;
        const refreshed = page.waitForResponse(response => new URL(response.url()).pathname === '/api/projects');
        state.holdThumbnails = false; fixture.release();
        await refreshed;
        await page.waitForFunction(() => !refreshingAccess && cardOf('large_1')._el.querySelector('img').title.includes('404'));
        await settle(page);
        await quietWrites(page,state);
        assert.deepEqual(await page.evaluate(() => __deniedPermissions),['operate'],'404 不能先降成 read 再恢复 operate');
        assert.equal(await page.evaluate(() => PROJ.permission),'operate');
        assert.equal(await page.locator('#panel').isVisible(),true);
        assert.deepEqual(await page.evaluate(() => ({
          project:PROJ === __before404.project,
          nodes:__before404.nodes.length === el.world.children.length && __before404.nodes.every((node,i) => node === el.world.children[i]),
          panel:el.panel.firstElementChild === __before404.panel,
        })),{project:true,nodes:true,panel:true},'不能通过恢复权限后重建节点或重新打开面板掩盖中间冻结');
        assert.equal(await page.locator('#world .card').count(),381);
        assert.equal(await page.locator('#wires path').count(),544);
        assert.deepEqual(await page.evaluate(() => __canvasProbe.batches),[{added:381,total:381}]);
        assert.equal(thumbs(state).filter(r => r.original === failedURL).length,1,'404 失败 URL 不得自动重复请求');
        assert.equal(state.requests.filter(r => r.path === '/api/projects').length,listCount+1,'失败只能触发一次权限列表核实，不能进入请求循环');
        assert.equal(await page.locator('[data-id="large_1"] img').getAttribute('src'),null);
        assert.equal(mediaRequests(state).length,0); assert.equal(previewRequests(state).length,0);
        assert.deepEqual(await outputs(page),p.cards.map(c => c.outputs));
      },state => { state.holdThumbnails = true; state.failThumbnail = failedURL; state.failThumbnailStatus = 404; });
    });

    await t.test('缩略图 404 后项目列表确认真正撤权，仍清空 381 节点、面板及在途媒体', async () => {
      const p = largeProject(), failedURL = p.cards[1].outputs[0].url;
      await withPage([p],async (page,state) => {
        await page.waitForFunction(() => __canvasProbe.active === 4);
        await waitServer(state,() => thumbs(state).some(r => r.original === failedURL),'未等到待失败的真实缩略图请求');
        await page.evaluate(async () => { await loadProjects(); pick('large_3'); });
        assert.equal(await page.locator('#panel').isVisible(),true);
        // 当前项目已从服务端授权列表移除；仅释放失败响应，其余请求保持在途以验证清理。
        state.projects = [];
        const failed = state.held.find(item => item.record.original === failedURL);
        const pending = thumbs(state).filter(r => r.original !== failedURL && !r.complete && !r.closed);
        assert.ok(pending.length > 0,'撤权时必须仍有未完成的真实媒体请求');
        const refreshed = page.waitForResponse(response => new URL(response.url()).pathname === '/api/projects');
        failed.send();
        await refreshed;
        await page.waitForFunction(() => !refreshingAccess && PROJ === null && CARD_MEDIA.size === 0 && cardMediaActive === 0);
        await waitServer(state,() => pending.every(r => r.closed && !r.complete),'真正撤权没有取消在途缩略图');
        fixture.release();
        await quietWrites(page,state);
        assert.equal(await page.locator('#world .card').count(),0);
        assert.equal(await page.locator('#wires path').count(),0);
        assert.equal(await page.locator('#panel').isVisible(),false);
        assert.equal(await page.locator('#hist').isVisible(),false);
        assert.equal(await page.locator('#empty').isVisible(),true);
        assert.equal(await page.locator('#plist .pitem').count(),0);
        assert.equal(await page.evaluate(() => H3Auth.active),true,'撤画布授权不能冒充退出登录');
        assert.equal(thumbs(state).filter(r => r.original === failedURL).length,1);
        assert.deepEqual(await page.evaluate(() => __canvasProbe.batches),[{added:381,total:381}]);
        assert.equal(mediaRequests(state).length,0); assert.equal(previewRequests(state).length,0);
      },state => { state.holdThumbnails = true; state.failThumbnail = failedURL; state.failThumbnailStatus = 404; });
    });

    await t.test('Comfy 非本地视频首屏不下载、不探 preview，真实点击才取原 URL 播放', async () => {
      const p = smallProject('comfy',['video']);
      p.cards[0].outputs[0].url = '/comfy/view?filename=generated.mp4&type=output';
      await withPage([p],async (page,state) => {
        await settle(page);
        assert.equal(thumbs(state).length,0);
        assert.equal(mediaRequests(state).length,0); assert.equal(previewRequests(state).length,0);
        assert.equal(await page.locator('#world video').getAttribute('src'),null);
        assert.equal(await page.locator('#world video').getAttribute('preload'),'none');
        await quietWrites(page,state);
        await page.locator('#world video').click();
        await page.waitForFunction(() => { const v = el.world.querySelector('video'); return !v.paused && v.currentTime > 0; });
        assert.equal(await page.locator('#world video').getAttribute('src'),p.cards[0].outputs[0].url);
        assert.ok(mediaRequests(state).some(r => r.path === '/comfy/view'));
        assert.equal(previewRequests(state).length,0);
        assert.deepEqual(await outputs(page),p.cards.map(c => c.outputs));
        await quietWrites(page,state);
      });
    });

    await t.test('音频初次加载 preload=none 不下载，用户播放仍有效', async () => {
      const p = smallProject('audio',['audio']);
      await withPage([p],async (page,state) => {
        await settle(page);
        assert.equal(await page.locator('#world audio').getAttribute('preload'),'none');
        assert.equal(mediaRequests(state).length,0); assert.equal(thumbs(state).length,0);
        await quietWrites(page,state);
        // 浏览器原生 controls 的实际播放按钮。
        const box = await page.locator('#world audio').boundingBox();
        await page.mouse.click(box.x+22,box.y+box.height/2);
        await page.waitForFunction(() => { const a = el.world.querySelector('audio'); return a.currentTime > 0; });
        assert.ok(mediaRequests(state).some(r => r.path.endsWith('.wav')));
        assert.deepEqual(await outputs(page),p.cards.map(c => c.outputs));
      });
    });

    for (const action of ['切项目','退出画布','完整重绘','删除节点','单卡重绘']) {
      await t.test(`${action}取消旧缩略图请求、回收已完成 BlobURL、迟到结果不污染画布`, async () => {
        const p = smallProject('cleanup',['image','video','image']);
        const other = smallProject('other',['image']);
        await withPage([p,other],async (page,state) => {
          await settle(page);
          const oldURLs = await page.evaluate(() => [...__canvasProbe.created]);
          // 制造真正未完成的 HTTP 请求，而非仅从 Map 中删除一个已完成状态。
          state.holdThumbnails = true;
          await page.evaluate(() => { render(); });
          await page.waitForFunction(() => __canvasProbe.active > 0);
          const pending = await page.evaluate(() => __canvasProbe.fetches.filter(r => !r.finished).length);
          assert.ok(pending > 0);
          await waitServer(state,() => state.held.filter(item => !item.record.closed && !item.record.complete).length >= pending,'未等到服务端受理全部待取消缩略图');
          const oldRequests = thumbs(state).slice();
          await page.evaluate(() => { window.__oldNodes = [...el.world.querySelectorAll('img,video')]; });
          if (action === '切项目') await page.locator('#plist .pitem').filter({hasText:'回归画布other'}).click();
          else if (action === '退出画布') await page.evaluate(() => clearProject());
          else if (action === '完整重绘') await page.evaluate(() => render());
          else if (action === '删除节点') await page.locator('[data-id="cleanup_0"] .x').click();
          else await page.evaluate(() => {
            const c = PROJ.cards[0]; c.outputs = [{...c.outputs[0],url:'/api/artifact/repaint.png'}]; paint(c);
          });
          await page.waitForFunction(({action,pending}) => {
            const aborted = __canvasProbe.fetches.filter(r => r.aborted).length;
            return action === '单卡重绘' ? aborted >= 1 : aborted >= pending;
          },{action,pending});
          await waitServer(state,() => oldRequests.some(r => r.closed && !r.complete),'未观察到服务端未完成请求被取消');
          state.holdThumbnails = false; fixture.release();
          await settle(page);
          await assertReclaimed(page,oldURLs);
          assert.ok(oldRequests.some(r => r.closed && !r.complete),'必须确实取消服务端未完成请求');
          const stale = await page.evaluate(action => __oldNodes.filter(n => !n.isConnected).map(n => ({src:n.getAttribute('src'),poster:n.getAttribute('poster')})),action);
          assert.ok(stale.every(n => !n.src),'迟到缩略图不能为已移除节点设置 src');
          if (action === '切项目') { assert.equal(await page.evaluate(() => PROJ.id),'other'); assert.equal(await page.locator('#world .card').count(),1); }
          if (action === '退出画布') { assert.equal(await page.locator('#world .card').count(),0); assert.equal(await page.evaluate(() => CARD_MEDIA.size),0); }
          if (action === '删除节点') { assert.equal(await page.locator('[data-id="cleanup_0"]').count(),0); assert.equal(await page.locator('#world .card').count(),2); }
          assert.ok(await page.evaluate(() => __canvasProbe.max <= 4));
          if (action !== '删除节点') await quietWrites(page,state);
        });
      });
    }

    await t.test('实际退出登录清理画布、取消媒体并回收 BlobURL，只写 logout 不写项目', async () => {
      await withPage([smallProject('logout',['image','video'])],async (page,state) => {
        await settle(page);
        state.holdThumbnails = true;
        await page.evaluate(() => render());
        await page.waitForFunction(() => __canvasProbe.active === 2);
        await waitServer(state,() => state.held.filter(item => !item.record.closed && !item.record.complete).length === 2,'退出前未形成真实在途请求');
        const pending = thumbs(state).filter(r => !r.complete && !r.closed);
        let snapshot;
        await page.exposeFunction('__captureLogout',value => { snapshot = value; });
        await page.evaluate(() => window.addEventListener('h3auth:expired',() => {
          window.__captureLogout({active:H3Auth.active,project:PROJ,cards:el.world.children.length,media:CARD_MEDIA.size,
            aborted:__canvasProbe.fetches.filter(r => r.aborted).length,created:__canvasProbe.created,revoked:__canvasProbe.revoked});
        }));
        await page.getByRole('button',{name:'退出登录',exact:true}).click();
        await page.waitForURL('**/login');
        assert.ok(snapshot,'必须观察到真实 auth.js 的会话失效事件');
        assert.equal(snapshot.active,false); assert.equal(snapshot.project,null);
        assert.equal(snapshot.cards,0); assert.equal(snapshot.media,0);
        assert.equal(snapshot.aborted,2);
        assert.deepEqual(new Set(snapshot.revoked),new Set(snapshot.created));
        await waitServer(state,() => pending.every(r => r.closed && !r.complete),'退出登录未取消服务端媒体请求');
        fixture.release();
        assert.deepEqual(state.writes.map(r => [r.method,r.path]),[['POST','/api/auth/logout']]);
      });
    });

    await t.test('媒体移出视口取消在途请求，移回后可重试且完整 Blob 并发仍不超过 4', async () => {
      await withPage([smallProject('viewport_abort',['image','video'])],async (page,state) => {
        await page.waitForFunction(() => __canvasProbe.active === 2);
        await waitServer(state,() => thumbs(state).length === 2,'未等到真实缩略图请求');
        const initial = thumbs(state).slice();
        await page.evaluate(() => { view.x = -10000; applyView(); });
        await page.waitForFunction(() => __canvasProbe.fetches.filter(r => r.aborted).length === 2);
        await waitServer(state,() => initial.every(r => r.closed && !r.complete),'移出视口没有取消 HTTP 请求');
        assert.equal(await page.evaluate(() => __canvasProbe.created.length),0);
        state.holdThumbnails = false;
        await page.evaluate(() => { view.x = 30; applyView(); });
        await settle(page);
        assert.equal(thumbs(state).length,4,'移回视口必须重新尝试被取消的两份媒体');
        assert.equal(await page.locator('#world img').evaluate(i => i.naturalWidth),1);
        assert.match(await page.locator('#world video').getAttribute('poster'),/^blob:/);
        assert.ok(await page.evaluate(() => __canvasProbe.max <= 4));
        assert.equal(mediaRequests(state).length,0); assert.equal(previewRequests(state).length,0);
        await quietWrites(page,state);
      },state => { state.holdThumbnails = true; });
    });

    await t.test('连续重绘和最终退出回收所有 BlobURL，MutationObserver 不保留游离媒体', async () => {
      await withPage([smallProject('reclaimed',['image','video'])],async (page,state) => {
        for (let i = 0; i < 3; i++) {
          await settle(page);
          const previous = await page.evaluate(() => [...__canvasProbe.created]);
          await page.evaluate(() => render());
          await assertReclaimed(page,previous);
        }
        await settle(page);
        await page.evaluate(() => clearProject());
        await page.waitForFunction(() => cardMediaActive === 0 && CARD_MEDIA.size === 0);
        const result = await page.evaluate(() => ({created:__canvasProbe.created,revoked:__canvasProbe.revoked}));
        assert.ok(result.created.length >= 8,'应实际生成多轮 BlobURL 后再验证回收');
        assert.deepEqual(new Set(result.revoked),new Set(result.created),'退出后不能残留任何本轮 BlobURL');
        assert.equal(result.revoked.length,result.created.length,'每个 BlobURL 恰好回收一次');
        await quietWrites(page,state);
      });
    });

    await t.test('HTTP Blob 已到达但异步回调迟到：切项目不能创建旧 BlobURL 或改新项目', async () => {
      await withPage([smallProject('late_blob',['image']),smallProject('destination',['image'])],async (page,state) => {
        await page.waitForFunction(() => __canvasProbe.late !== null);
        await page.evaluate(() => { window.__lateNode = el.world.querySelector('img'); });
        const before = await page.evaluate(() => __canvasProbe.created.length);
        await page.locator('#plist .pitem').filter({hasText:'回归画布destination'}).click();
        await page.waitForFunction(() => PROJ.id === 'destination');
        await page.evaluate(() => __canvasProbe.releaseBlob());
        await settle(page);
        assert.equal(await page.evaluate(() => __lateNode.getAttribute('src')),null);
        assert.equal(await page.evaluate(() => __canvasProbe.created.length),before+1,'只有新项目缩略图可以创建 BlobURL');
        assert.equal(await page.evaluate(() => PROJ.id),'destination');
        await quietWrites(page,state);
      },state => { state.holdNextBlob = true; });
    });

    await t.test('prepareVideo 兼容 MP4 状态迟到：真实点击后切项目不得给旧视频赋 src 或开始播放', async () => {
      await withPage([smallProject('late_video',['video']),smallProject('destination',['image'])],async (page,state) => {
        await settle(page);
        await page.evaluate(() => { window.__lateVideo = el.world.querySelector('video'); });
        state.holdPreviews = true;
        await page.locator('#world video').click();
        await page.waitForFunction(() => el.world.querySelector('video').dataset.previewState === 'processing');
        await page.locator('#plist .pitem').filter({hasText:'回归画布destination'}).click();
        await page.waitForFunction(() => PROJ.id === 'destination');
        state.holdPreviews = false; fixture.release();
        await settle(page);
        await page.evaluate(() => Promise.allSettled([...VIDEO_PREVIEWS.values()].map(entry => entry.promise)));
        assert.equal(await page.evaluate(() => __lateVideo.getAttribute('src')),null);
        assert.equal(await page.evaluate(() => __lateVideo.paused),true);
        assert.equal(state.requests.filter(r => r.path === '/api/preview/late_video_0.mov/file').length,0);
        assert.equal(await page.locator('#world video').count(),0);
        await quietWrites(page,state);
      });
    });

    // 下列新增用例仍加载完整 index.html/auth.js/app.js，直接调用时也不抽取或替换真实函数。
    async function pendingPlayback(page,state,id) {
      await settle(page);
      await page.evaluate(id => { window.__pendingVideo = cardOf(id)._el.querySelector('video'); },id);
      await page.locator(`[data-id="${id}"] video`).click();
      const requestPath = await page.evaluate(() => new URL('/api/preview/' + __pendingVideo.dataset.videoUrl.split('/').pop(),location.href).pathname);
      await waitServer(state,() => previewRequests(state).some(r => r.path === requestPath && !r.closed && !r.complete),'未形成真实挂起状态请求');
      await page.evaluate(() => { window.__pendingEntry = VIDEO_PREVIEWS.get(__pendingVideo.dataset.videoUrl); });
      return previewRequests(state).find(r => r.path === requestPath);
    }
    async function canceledPlayback(page,state,request) {
      await waitServer(state,() => request.closed && !request.complete,'视频状态 HTTP 请求没有实际断开');
      await page.evaluate(async () => { await Promise.allSettled([__pendingEntry.promise]); });
      assert.deepEqual(await page.evaluate(() => ({src:__pendingVideo.getAttribute('src'),paused:__pendingVideo.paused,
        intent:__pendingVideo._playRequest,controller:__pendingVideo._previewController,aborted:__pendingEntry.controller.signal.aborted})),
      {src:null,paused:true,intent:null,controller:null,aborted:true});
      assert.equal(mediaRequests(state).filter(r => r.path === request.path + '/file').length,0,'取消的视频不能请求兼容文件');
    }

    for (const start of ['真实点击 B','直接 playCardVideo B']) {
      await t.test(`A 状态请求挂起后${start}：A 断开、迟到响应不赋 src 且不抢播`, async () => {
        const p = smallProject('intent',['video','video']);
        // B 同样走上传转码状态接口，避免只覆盖无需等待的 artifact 分支。
        p.cards[1].outputs[0].url = '/api/upload/intent_b.mov';
        await withPage([p],async (page,state) => {
          const request = await pendingPlayback(page,state,'intent_0');
          if (start === '真实点击 B') await page.locator('[data-id="intent_1"] video').click();
          else await page.evaluate(() => { window.__startB = playCardVideo(cardOf('intent_1')._el.querySelector('video')); });
          await canceledPlayback(page,state,request);
          await page.waitForFunction(() => { const v = cardOf('intent_1')._el.querySelector('video'); return !v.paused && v.currentTime > 0 && v.videoWidth === 96; });
          fixture.release(); await settle(page);
          assert.equal(await page.evaluate(() => __pendingVideo.getAttribute('src')),null);
          assert.equal(await page.evaluate(() => __pendingVideo.paused),true);
          assert.equal(await page.locator('[data-id="intent_1"] video').getAttribute('src'),'/api/preview/intent_b.mov/file');
          assert.equal(await page.evaluate(() => NOWPLAYING === cardOf('intent_1')._el.querySelector('video')),true);
          assert.deepEqual(await outputs(page),p.cards.map(c => c.outputs));
          await quietWrites(page,state);
        },state => { state.previewModes['/api/preview/intent_0.mov'] = 'hold'; });
      });
    }

    await t.test('原生 play 事件排队后取消 A 并播放 B：A 的迟到事件不能暂停或取消 B', async () => {
      await withPage([smallProject('queued_play',['video','video'])],async (page,state) => {
        await settle(page);
        await page.evaluate(async () => {
          window.__queuedVideos = [...el.world.querySelectorAll('video')];
          await Promise.all(__queuedVideos.map(video => {
            video.preload = 'auto';
            return prepareVideo(video,video.dataset.videoUrl);
          }));
        });
        await page.waitForFunction(() => __queuedVideos.every(video => video.readyState >= 2));
        const trace = await page.evaluate(async () => {
          const [a,b] = __queuedVideos;
          window.__queuedPlayTrace = [];
          for (const [name,video] of [['A',a],['B',b]]) {
            video.addEventListener('play',ev => __queuedPlayTrace.push({name,paused:video.paused,trusted:ev.isTrusted}));
          }
          // 同一个浏览器任务中请求播放，再立即取消；必须使用原生排队事件，而非 dispatchEvent。
          const first = playCardVideo(a);
          const second = playCardVideo(b);
          await Promise.all([first,second]);
          return __queuedPlayTrace;
        });
        assert.ok(trace.some(event => event.name === 'A' && event.paused && event.trusted),'必须实际收到已暂停 A 的原生 play 事件');
        await page.waitForFunction(() => !__queuedVideos[1].paused && __queuedVideos[1].currentTime > 0);
        assert.deepEqual(await page.evaluate(() => ({aPaused:__queuedVideos[0].paused,
          bPaused:__queuedVideos[1].paused,bIntent:!!__queuedVideos[1]._playRequest,current:NOWPLAYING === __queuedVideos[1]})),
        {aPaused:true,bPaused:false,bIntent:true,current:true});
        await quietWrites(page,state);
      });
    });

    await t.test('A 的 ready HTTP 已完成但 JSON 交付迟到：播放 B 后旧结果不能赋 src 或反向取消 B', async () => {
      await withPage([smallProject('late_intent',['video','video'])],async (page,state) => {
        await settle(page);
        await page.evaluate(() => { __canvasProbe.holdNextPreviewJSON = true; window.__lateIntentVideo = cardOf('late_intent_0')._el.querySelector('video'); });
        await page.locator('[data-id="late_intent_0"] video').click();
        await page.waitForFunction(() => __canvasProbe.latePreview?.jsonRead);
        await page.evaluate(() => { window.__lateIntentEntry = VIDEO_PREVIEWS.get(__lateIntentVideo.dataset.videoUrl); });
        assert.ok(previewRequests(state).some(r => r.path === '/api/preview/late_intent_0.mov' && r.complete),'必须已有完整真实 ready 响应');
        await page.locator('[data-id="late_intent_1"] video').click();
        await page.waitForFunction(() => { const v = cardOf('late_intent_1')._el.querySelector('video'); return !v.paused && v.currentTime > 0; });
        await page.evaluate(async () => { __canvasProbe.releasePreviewJSON(); await Promise.allSettled([__lateIntentEntry.promise]); });
        await settle(page);
        assert.equal(await page.evaluate(() => __lateIntentVideo.getAttribute('src')),null);
        assert.equal(await page.evaluate(() => __lateIntentVideo.paused),true);
        assert.equal(await page.evaluate(() => NOWPLAYING === cardOf('late_intent_1')._el.querySelector('video')),true);
        assert.equal(mediaRequests(state).filter(r => r.path === '/api/preview/late_intent_0.mov/file').length,0);
        await quietWrites(page,state);
      });
    });

    for (const action of ['切项目','删除节点','清空画布','resetCardMedia','完整重绘','单卡重绘','点击别处']) {
      await t.test(`${action}期间实际取消在途视频状态请求，释放旧响应不再赋 src 或播放`, async () => {
        const p = smallProject('status_cleanup',['video']), other = smallProject('status_other',['image']);
        await withPage([p,other],async (page,state) => {
          const request = await pendingPlayback(page,state,'status_cleanup_0');
          if (action === '切项目') await page.locator('#plist .pitem').filter({hasText:'回归画布status_other'}).click();
          // 删除直接走真实入口，避免 mousedown 提前取消掩盖 render/reset 清理缺陷。
          else if (action === '删除节点') await page.evaluate(() => delCard('status_cleanup_0'));
          else if (action === '清空画布') await page.evaluate(() => clearProject());
          else if (action === 'resetCardMedia') await page.evaluate(() => resetCardMedia());
          else if (action === '完整重绘') await page.evaluate(() => render());
          else if (action === '单卡重绘') await page.evaluate(() => {
            const c = cardOf('status_cleanup_0');
            c.outputs = [{...c.outputs[0],url:'/api/upload/status_replacement.mov'}]; paint(c);
          });
          else {
            const stage = await page.locator('#stage').boundingBox();
            await page.mouse.click(stage.x+stage.width-50,stage.y+stage.height-50);
          }
          await canceledPlayback(page,state,request);
          fixture.release(); await settle(page);
          assert.equal(await page.evaluate(() => __pendingVideo.getAttribute('src')),null);
          assert.equal(await page.evaluate(() => __pendingVideo.paused),true);
          assert.equal(await page.evaluate(() => VIDEO_PREVIEWS.has(__pendingVideo.dataset.videoUrl)),false);
          if (action === '切项目') assert.equal(await page.evaluate(() => PROJ.id),'status_other');
          if (action === '删除节点' || action === '清空画布') assert.equal(await page.locator('#world .card').count(),0);
          if (action === '删除节点') {
            const count = previewRequests(state).length;
            // 模拟协作删除之后迟到的 mouseup 仍调用旧元素，不能重开孤立轮询。
            await page.evaluate(() => playCardVideo(__pendingVideo));
            await settle(page);
            assert.equal(previewRequests(state).length,count,'已删除的旧视频不得重新发起状态请求');
            assert.deepEqual(await page.evaluate(() => ({intent:__pendingVideo._playRequest,controller:__pendingVideo._previewController})),{intent:null,controller:null});
          }
          if (action !== '删除节点') await quietWrites(page,state);
        },state => { state.holdPreviews = true; });
      });
    }

    await t.test('真实退出登录期间在途视频状态请求实际断开，会话退出前清理旧播放意图', async () => {
      await withPage([smallProject('status_logout',['video'])],async (page,state) => {
        const request = await pendingPlayback(page,state,'status_logout_0');
        let snapshot;
        await page.exposeFunction('__captureStatusLogout',value => { snapshot = value; });
        await page.evaluate(() => window.addEventListener('h3auth:expired',() => {
          window.__captureStatusLogout({src:__pendingVideo.getAttribute('src'),paused:__pendingVideo.paused,
            intent:__pendingVideo._playRequest,controller:__pendingVideo._previewController,active:H3Auth.active,
            cards:el.world.children.length,aborted:__pendingEntry.controller.signal.aborted});
        }));
        await page.getByRole('button',{name:'退出登录',exact:true}).click();
        await page.waitForURL('**/login');
        await waitServer(state,() => request.closed && !request.complete,'退出登录未取消在途状态 HTTP 请求');
        assert.deepEqual(snapshot,{src:null,paused:true,intent:null,controller:null,active:false,cards:0,aborted:true});
        fixture.release();
        assert.equal(mediaRequests(state).filter(r => r.path === request.path + '/file').length,0);
        assert.deepEqual(state.writes.map(r => [r.method,r.path]),[['POST','/api/auth/logout']]);
      },state => { state.holdPreviews = true; });
    });

    await t.test('真实 audio play 事件取消视频 A 在途意图，不让状态迟到抢回音频播放', async () => {
      await withPage([smallProject('audio_interrupt',['video','audio'])],async (page,state) => {
        const request = await pendingPlayback(page,state,'audio_interrupt_0');
        // 不发送 mousedown，仅用真实媒体 play() 产生原生 play 事件，独立验证捕获监听器。
        await page.evaluate(() => el.world.querySelector('audio').play());
        await page.waitForFunction(() => NOWPLAYING?.tagName === 'AUDIO' && !NOWPLAYING.paused);
        await canceledPlayback(page,state,request);
        fixture.release(); await settle(page);
        assert.equal(await page.evaluate(() => __pendingVideo.paused),true);
        await quietWrites(page,state);
      },state => { state.holdPreviews = true; });
    });

    await t.test('processing 的 1.5 秒轮询等待期间再次点击当前视频可取消，超过窗口也不再轮询', async () => {
      await withPage([smallProject('timer_cancel',['video'])],async (page,state) => {
        await settle(page);
        await page.locator('#world video').click();
        await page.waitForFunction(() => __canvasProbe.previews.some(r => r.status === 'processing') && __canvasProbe.timers.length === 1);
        await page.evaluate(() => { window.__timerVideo = el.world.querySelector('video'); window.__timerEntry = VIDEO_PREVIEWS.get(__timerVideo.dataset.videoUrl); });
        assert.equal(previewRequests(state).length,1);
        await page.locator('#world video').click();
        await page.evaluate(async () => { await Promise.allSettled([__timerEntry.promise]); });
        assert.deepEqual(await page.evaluate(() => ({aborted:__timerEntry.controller.signal.aborted,
          timer:__canvasProbe.timers.map(({cleared,fired}) => ({cleared,fired})),intent:__timerVideo._playRequest,
          controller:__timerVideo._previewController,src:__timerVideo.getAttribute('src'),paused:__timerVideo.paused})),
        {aborted:true,timer:[{cleared:true,fired:false}],intent:null,controller:null,src:null,paused:true});
        // 此处必须跨过真实轮询窗口，不能仅凭 Map 删除或立即计数宣称不会重试。
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve,1750)));
        assert.equal(previewRequests(state).length,1,'取消后超过 1.5 秒不得新增状态请求');
        assert.equal(await page.evaluate(() => __canvasProbe.timers.some(r => r.fired)),false);
        assert.equal(await page.evaluate(() => H3Auth.active),true);
        assert.deepEqual(await page.evaluate(() => [...VIDEO_PREVIEWS.keys()]),[]);
        await quietWrites(page,state);
      },state => { state.previewModes['/api/preview/timer_cancel_0.mov'] = 'processing'; });
    });

    await t.test('直接调用真实 prepareVideo 第四参数 signal：取消在途请求且不展示 AbortError', async () => {
      const url = '/api/upload/prepare_signal.mov', requestPath = '/api/preview/prepare_signal.mov';
      await withPage([smallProject('prepare_signal',['video'])],async (page,state) => {
        await settle(page);
        await page.evaluate(url => {
          window.__prepareController = new AbortController();
          window.__prepareTarget = el.world.querySelector('video');
          // isCurrent 始终为 true，不能让项目/意图守卫掩盖第四参数的取消行为。
          window.__prepareResult = prepareVideo(__prepareTarget,url,() => true,__prepareController.signal);
          window.__prepareEntry = VIDEO_PREVIEWS.get(url);
        },url);
        await waitServer(state,() => previewRequests(state).some(r => r.path === requestPath && !r.closed && !r.complete),'prepareVideo 未形成真实状态请求');
        const request = previewRequests(state).find(r => r.path === requestPath);
        await page.evaluate(() => __prepareController.abort());
        await page.evaluate(() => __prepareResult);
        await waitServer(state,() => request.closed && !request.complete,'prepareVideo 第四参数未取消 HTTP 请求');
        fixture.release(); await settle(page);
        assert.deepEqual(await page.evaluate(() => ({src:__prepareTarget.getAttribute('src'),paused:__prepareTarget.paused,
          state:__prepareTarget.dataset.previewState,aborted:__prepareEntry.controller.signal.aborted})),
        {src:null,paused:true,state:'processing',aborted:true});
        assert.doesNotMatch(await page.locator('#world video').getAttribute('title'),/AbortError|aborted|abort signal/i);
        assert.equal(mediaRequests(state).filter(r => r.path === requestPath + '/file').length,0);
        assert.equal(await page.evaluate(() => H3Auth.active),true);
        await quietWrites(page,state);
      },state => { state.holdPreviews = true; });
    });

    await t.test('真实 videoPreviewSource 同 URL 共享：取消一个不误伤另一个，ready 保留并复用', async () => {
      const url = '/api/upload/shared_ready.mov';
      await withPage([smallProject('shared_ready',['image'])],async (page,state) => {
        await settle(page);
        await page.evaluate(url => {
          window.__sharedControllers = [new AbortController(),new AbortController()];
          window.__sharedResults = [];
          window.__sharedPromises = __sharedControllers.map((c,i) => videoPreviewSource(url,c.signal).then(
            source => { __sharedResults[i] = {source}; },error => { __sharedResults[i] = {error:error.name}; }));
          window.__sharedEntry = VIDEO_PREVIEWS.get(url);
        },url);
        await waitServer(state,() => previewRequests(state).length === 1,'未受理共享状态请求');
        assert.equal(await page.evaluate(() => __sharedEntry.users.size),2);
        await page.evaluate(() => __sharedControllers[0].abort());
        await page.waitForFunction(() => __sharedResults[0]?.error === 'AbortError');
        assert.equal(await page.evaluate(() => __sharedEntry.users.size),1);
        assert.equal(await page.evaluate(() => __sharedEntry.controller.signal.aborted),false);
        assert.equal(previewRequests(state)[0].closed,false,'单个消费者退出不能断开共享 HTTP 请求');
        state.holdPreviews = false; fixture.release();
        await page.evaluate(() => Promise.all(__sharedPromises));
        assert.deepEqual(await page.evaluate(() => __sharedResults),[{error:'AbortError'},{source:'/api/preview/shared_ready.mov/file'}]);
        const reused = await page.evaluate(async url => {
          const c = new AbortController(), source = await videoPreviewSource(url,c.signal); c.abort();
          return {source,same:VIDEO_PREVIEWS.get(url) === __sharedEntry,ready:__sharedEntry.ready,
            users:__sharedEntry.users.size,aborted:__sharedEntry.controller.signal.aborted};
        },url);
        assert.deepEqual(reused,{source:'/api/preview/shared_ready.mov/file',same:true,ready:true,users:0,aborted:false});
        assert.equal(previewRequests(state).length,1,'ready 复用不能产生第二个 HTTP 状态请求');
        await quietWrites(page,state);
      },state => { state.holdPreviews = true; });
    });

    await t.test('真实 videoPreviewSource 最后一个消费者退出才断开共享请求，取消后允许重新获取', async () => {
      const url = '/api/upload/shared_last.mov';
      await withPage([smallProject('shared_last',['image'])],async (page,state) => {
        await settle(page);
        await page.evaluate(url => {
          window.__lastControllers = [new AbortController(),new AbortController()];
          window.__lastPromises = __lastControllers.map(c => videoPreviewSource(url,c.signal).then(source => source,error => error.name));
          window.__lastEntry = VIDEO_PREVIEWS.get(url);
        },url);
        await waitServer(state,() => previewRequests(state).length === 1,'最后消费者用例未形成在途 HTTP 请求');
        const request = previewRequests(state)[0];
        await page.evaluate(() => __lastControllers[0].abort());
        assert.equal(await page.evaluate(() => __lastEntry.controller.signal.aborted),false);
        await page.evaluate(() => __lastControllers[1].abort());
        assert.deepEqual(await page.evaluate(() => Promise.all(__lastPromises)),['AbortError','AbortError']);
        await waitServer(state,() => request.closed && !request.complete,'最后消费者退出未实际取消共享请求');
        assert.deepEqual(await page.evaluate(url => ({users:__lastEntry.users.size,aborted:__lastEntry.controller.signal.aborted,present:VIDEO_PREVIEWS.has(url)}),url),
          {users:0,aborted:true,present:false});
        state.holdPreviews = false;
        assert.equal(await page.evaluate(url => videoPreviewSource(url,new AbortController().signal),url),'/api/preview/shared_last.mov/file');
        fixture.release();
        assert.equal(previewRequests(state).length,2);
        await quietWrites(page,state);
      },state => { state.holdPreviews = true; });
    });

    await t.test('真实 videoPreviewSource 旧 entry 拒绝回调迟到不得删除同 URL 新 entry', async () => {
      const url = '/api/upload/entry_race.mov';
      await withPage([smallProject('entry_race',['image'])],async (page,state) => {
        await settle(page);
        await page.evaluate(url => {
          window.__oldController = new AbortController();
          window.__oldResult = videoPreviewSource(url,__oldController.signal).then(source => source,error => error.name);
          window.__oldEntry = VIDEO_PREVIEWS.get(url);
        },url);
        await waitServer(state,() => previewRequests(state).length === 1,'旧 entry 未形成真实 HTTP 请求');
        const oldRequest = previewRequests(state)[0];
        // 同一 JS turn 取消并建立替代项，确保新 entry 先于旧 Promise.catch 安装到 Map。
        const beforeCatch = await page.evaluate(url => {
          __oldController.abort();
          window.__newController = new AbortController();
          window.__newResult = videoPreviewSource(url,__newController.signal).then(source => source,error => error.name);
          window.__newEntry = VIDEO_PREVIEWS.get(url);
          return {different:__newEntry !== __oldEntry,users:__newEntry.users.size};
        },url);
        assert.deepEqual(beforeCatch,{different:true,users:1});
        await waitServer(state,() => oldRequest.closed && !oldRequest.complete && previewRequests(state).length === 2,'旧请求未断开或替代请求未受理');
        assert.equal(await page.evaluate(() => __oldResult),'AbortError');
        await page.evaluate(() => Promise.allSettled([__oldEntry.promise]));
        assert.equal(await page.evaluate(url => VIDEO_PREVIEWS.get(url) === __newEntry,url),true,'旧 entry 拒绝不得删掉替代项');
        assert.equal(await page.evaluate(() => __newEntry.controller.signal.aborted),false);
        state.holdPreviews = false; fixture.release();
        assert.equal(await page.evaluate(() => __newResult),'/api/preview/entry_race.mov/file');
        assert.equal(await page.evaluate(url => VIDEO_PREVIEWS.get(url) === __newEntry && __newEntry.ready,url),true);
        assert.equal(previewRequests(state).length,2);
        await quietWrites(page,state);
      },state => { state.holdPreviews = true; });
    });

    for (const phase of ['调用前已 abort','请求在途时 abort']) {
      await t.test(`真实 H3Auth.request ${phase}：保持正常 session、无失效或拒绝事件`, async () => {
        const requestPath = '/api/test-caller-abort';
        await withPage([smallProject('auth_abort',['image'])],async (page,state) => {
          await settle(page);
          await page.evaluate(({phase,requestPath}) => {
            window.__authEvents = [];
            for (const name of ['h3auth:expired','h3auth:denied']) window.addEventListener(name,() => __authEvents.push(name));
            window.__authBefore = H3Auth.user;
            window.__authController = new AbortController();
            if (phase === '调用前已 abort') __authController.abort();
            window.__authResult = H3Auth.request(requestPath,{signal:__authController.signal}).then(data => ({data}),error => ({error:error.name}));
          },{phase,requestPath});
          if (phase === '请求在途时 abort') {
            await waitServer(state,() => state.requests.some(r => r.path === requestPath && !r.closed && !r.complete),'调用方 abort 前没有在途 HTTP 请求');
            await page.evaluate(() => __authController.abort());
            await waitServer(state,() => state.requests.some(r => r.path === requestPath && r.closed && !r.complete),'H3Auth 没有转发调用方 AbortSignal');
          }
          assert.deepEqual(await page.evaluate(() => __authResult),{error:'AbortError'});
          if (phase === '调用前已 abort') assert.equal(state.requests.filter(r => r.path === requestPath).length,0,'已取消请求不应到达服务端');
          assert.deepEqual(await page.evaluate(() => ({active:H3Auth.active,same:H3Auth.user === __authBefore,events:__authEvents})),{active:true,same:true,events:[]});
          assert.deepEqual(await page.evaluate(() => H3Auth.request('/api/health')),{comfy_online:true,mode:'local'},'取消后正常请求必须仍然可用');
          assert.equal(await page.evaluate(() => H3Auth.active),true);
          assert.equal(new URL(page.url()).pathname,'/');
          fixture.release(); await quietWrites(page,state);
        },state => { state.heldPaths.add(requestPath); });
      });
    }

    await t.test('对比层和多产物宫格共用缩略图队列，原图层不直接下载大图', async () => {
      const p = smallProject('compare',['image','image']);
      p.cards[0].cap = 'fixture_compare';
      p.cards[0].assets.image = {kind:'image',url:'/api/upload/comparison_original.png',ref:'chouka/comparison_original.png'};
      p.cards[1].outputs.push({...card(6,'video','gallery').outputs[0]}, {...card(7,'image','gallery').outputs[0]});
      await withPage([p],async (page,state) => {
        await settle(page);
        assert.equal(await page.locator('.cmp img').count(),2);
        assert.equal(await page.locator('.body.grid img,.body.grid video').count(),3);
        assert.equal(thumbs(state).length,5);
        assert.ok(thumbs(state).some(r => r.original === '/api/upload/comparison_original.png'));
        assert.equal(mediaRequests(state).length,0); assert.equal(previewRequests(state).length,0);
        assert.ok(await page.evaluate(() => __canvasProbe.max <= 4));
        assert.deepEqual(await outputs(page),p.cards.map(c => c.outputs));
        await quietWrites(page,state);
      });
    });
  } finally {
    if (browser) await browser.close();
    if (fixture) await fixture.close();
    rmSync(directory,{recursive:true,force:true});
  }
});
