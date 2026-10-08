// 使用临时 Playwright 依赖；可用 CHOUKA_TEST_BROWSER=chrome 指定本机浏览器。
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {execFileSync} = require('node:child_process');
const {createServer} = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');

const web = path.join(__dirname, '..', 'web');
const source = readFileSync(path.join(web, 'app.js'), 'utf8').replace(/\r\n/g, '\n');
function block(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `未找到真实业务片段：${start}`);
  return source.slice(from, to);
}
const MIME = 'application/x-chouka-history-output';
const kinds = ['image', 'video', 'audio'];
const extensions = ['png', 'mp4', 'wav'];
const types = ['image/png', 'video/mp4', 'audio/wav'];
function initialProject() {
  const history = ['current', 'older'].map((round, r) => ({
    ts:123456 + r, seed:900 + r, cap:'generate', job:round,
    outputs:kinds.map((kind, i) => ({kind, url:`/output/${round}-${i}.${extensions[i]}`,
      filename:`outputs\\${round}-${i}.${extensions[i]}`, ref:`comfy-output/${round}-${i}`, subfolder:'output'})),
  }));
  return {id:'history-test', permission:'operate', rev:1, groups:[], cards:[
    {id:'source', type:'generator', cap:'generate', name:'原生成节点', x:10, y:20,
      params:{prompt:'原提示词'}, assets:{}, outputs:history[0].outputs, history},
    {id:'target', type:'generator', cap:'generate', x:300, y:20, params:{}, assets:{input:{ref:'原引用'}}, outputs:[]},
  ], edges:[{from:'source', to:'target', slot:'input'}]};
}

function fixture() {
  // 仅替换外围 DOM 绘制、保存和查看器；事件、权限、导入、建节点与失败回滚全部取自 app.js。
  return `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/style.css"><style>
    #stage{position:absolute;left:40px;top:30px;width:780px;height:650px;background:#20252c;overflow:hidden}
    #world{position:absolute;transform-origin:0 0}#hist{position:absolute;left:850px;top:30px;width:290px;height:670px;overflow:auto;display:block}
    #hist .rg [data-i]{height:90px;min-height:90px}#menu{z-index:1000}
    </style><div id="stage"><div id="world"></div></div><div id="hist"></div>
    <div id="panel" style="display:none"></div><div id="menu" style="display:none"></div><script>
    const el = Object.fromEntries(['stage','world','hist','panel','menu'].map(id => [id,document.getElementById(id)]));
    let PROJ = ${JSON.stringify(initialProject())}, view = {x:73,y:-41,k:0.65};
    const projects = [], CAPS = {generate:{name:'生成'}}, CARDS = [{id:'card_asset',kind:'asset',name:'素材节点',modes:[{id:'asset',name:'素材'}]}];
    const H3Auth = {active:true,request:async (url, options) => {
      const response = await fetch(url, options); if (!response.ok) throw Error('HTTP ' + response.status); return response.json();
    }};
    window.messages = []; window.viewers = []; window.nativeEvents = []; window.dropPromises = []; window.dropsDone = 0;
    const toast = message => messages.push(message), save = () => {}, tipHide = () => {};
    ${block('const canOperate =', 'function clearProject(')}
    ${block('const jpost =', 'const jput =')}
    ${block('const uid =', '// 以实际能力反查模型')}
    ${block('const plain =', '/** 保存串行化')}
    let saveChain = Promise.resolve(), pendingCardCreates = 0, pendingProjectSync = null, selId = null;
    const selIds = new Set(), flushPendingProjectSync = () => {};
    const isTextCard = () => false, capOf = () => CAPS.generate, isTextEdge = e => String(e.slot || '').startsWith('@');
    const pick = id => { selId = id; selIds.add(id); }, drawWires = () => {}, openPanel = () => {}, closePanel = () => {};
    const applySize = () => {}, paint = () => {}, paintTitle = () => {}, paintKind = () => {};
    function buildCard(c) {
      const d = document.createElement('div'); d.className = 'card'; d.dataset.id = c.id;
      d.style.left = c.x + 'px'; d.style.top = c.y + 'px'; c._el = d; return d;
    }
    function render() { el.world.replaceChildren(...PROJ.cards.map(buildCard)); }
    const openViewer = (c, index, outputs, seed) => viewers.push({id:c.id,index,outputs:JSON.parse(JSON.stringify(outputs)),seed});
    ${block('function toWorld(', '/* ================= 小地图')}
    ${block('function reconcileCreatedCard(', 'function delCard(')}
    ${block('async function importOutput(', '/** 素材格里的图')}
    ${block('const HIST_MAX', '/* ================= 参数面板')}
    ${block('function showMenu(', '/** 面板底部工具条')}
    ${block('function downloadOut(', 'function resetSize(')}
    ${block('async function setAssetItem(', '/** 底部工具条「上传」')}
    // 记录真实异步 drop 的完成时机，不复制处理流程，也不靠固定等待时间判断拒绝。
    const listen = el.stage.addEventListener.bind(el.stage);
    el.stage.addEventListener = (type, handler) => listen(type, type !== 'drop' ? handler : ev => {
      const promise = Promise.resolve(handler(ev)).finally(() => dropsDone++); dropPromises.push(promise);
    });
    ${block('  // 拖拽文件到画布', '  // 点大图外面的黑底')}
    document.addEventListener('dragstart', ev => nativeEvents.push({type:'start',trusted:ev.isTrusted,
      types:[...ev.dataTransfer.types],effect:ev.dataTransfer.effectAllowed,token:ev.dataTransfer.getData(HISTORY_ASSET_DRAG)}));
    document.addEventListener('dragend', ev => nativeEvents.push({type:'end',trusted:ev.isTrusted}));
    window.startDrag = (round=1, index=0) => {
      const thumb = el.hist.querySelectorAll('.hrun')[round].querySelector('[data-i="' + index + '"]');
      const transfer = new DataTransfer();
      const event = new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:transfer});
      thumb.dispatchEvent(event); window.transfer = transfer; window.dragThumb = thumb;
      return {prevented:event.defaultPrevented,types:[...transfer.types],token:transfer.getData(HISTORY_ASSET_DRAG),effect:transfer.effectAllowed};
    };
    window.drop = (transfer=window.transfer, x=527, y=389) => {
      const event = new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer,clientX:x,clientY:y});
      el.stage.dispatchEvent(event); return event.defaultPrevented;
    };
    window.endDrag = () => dragThumb.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:transfer}));
    window.original = JSON.stringify({cards:PROJ.cards.map(plain),edges:PROJ.edges});
    render(); openHistory('source');
    </script>`;
}

test('历史产物拖回画布：真实处理器与 HTTP 下载上传回归', async t => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const ffmpeg = process.env.CHOUKA_TEST_FFMPEG || 'ffmpeg';
  const video = execFileSync(ffmpeg, ['-nostdin','-v','error','-f','lavfi','-i','color=size=32x32:rate=5:duration=0.2',
    '-c:v','libx264','-pix_fmt','yuv420p','-movflags','frag_keyframe+empty_moov','-f','mp4','pipe:1'], {timeout:20000});
  const audio = execFileSync(ffmpeg, ['-nostdin','-v','error','-f','lavfi','-i','anullsrc=r=8000:cl=mono','-t','0.1','-f','wav','pipe:1'], {timeout:20000});
  const media = [png, video, audio];
  let state;
  function resetState() {
    state = {project:initialProject(), downloads:[], uploads:[], creates:[], held:[]};
    state.heldReady = new Promise(resolve => { state.notifyHeld = resolve; });
  }
  function hold(respond) { state.held.push(respond); state.notifyHeld(); }
  resetState();
  const html = fixture();
  const server = createServer((req, res) => {
    if (req.url === '/') { res.setHeader('Content-Type','text/html; charset=utf-8'); return res.end(html); }
    if (req.url === '/style.css') { res.setHeader('Content-Type','text/css'); return res.end(readFileSync(path.join(web,'style.css'))); }
    if (req.url.startsWith('/output/') || req.url.startsWith('/asset/')) {
      const index = extensions.findIndex(ext => req.url.split('?')[0].endsWith('.' + ext));
      if (index < 0) { res.writeHead(404); return res.end(); }
      const importing = req.url.startsWith('/output/') && req.headers['sec-fetch-dest'] === 'empty';
      if (importing) state.downloads.push(req.url);
      if (importing && state.downloadFail) { res.writeHead(503); return res.end(); }
      const respond = () => { res.setHeader('Content-Type',types[index]); res.end(media[index]); };
      if (importing && state.hold === 'download') { hold(respond); return; }
      if (importing && state.hold === 'blob') {
        res.writeHead(200, {'Content-Type':types[index]}); res.write(media[index].subarray(0,1));
        hold(() => res.end(media[index].subarray(1))); return;
      }
      return respond();
    }
    if (req.method === 'POST' && req.url.startsWith('/api/upload?')) {
      const chunks = []; req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        const body = Buffer.concat(chunks), text = body.toString('latin1');
        const filename = /filename="([^"]+)"/.exec(text)?.[1];
        const type = /Content-Type: ([^\r\n]+)/.exec(text)?.[1];
        const index = types.indexOf(type), number = state.uploads.length + 1;
        state.uploads.push({url:req.url,filename,type,body,header:req.headers['content-type']});
        const respond = () => {
          res.setHeader('Content-Type','application/json');
          if (state.uploadFail) { res.writeHead(500); return res.end('{}'); }
          const item = {kind:kinds[index], origin:filename, url:`/asset/new-${number}.${extensions[index]}`,ref:`chouka/new-${number}.${extensions[index]}`};
          res.end(JSON.stringify(state.invalidUpload ? {files:[{url:item.url}]} : {files:[item]}));
        };
        if (state.hold === 'upload') hold(respond); else respond();
      });
      return;
    }
    if (req.method === 'POST' && req.url === '/api/projects/history-test/cards') {
      const chunks = []; req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        const data = JSON.parse(Buffer.concat(chunks)); state.creates.push(data.card);
        res.setHeader('Content-Type','application/json');
        if (state.createFail) { res.writeHead(500); return res.end('{}'); }
        state.project.cards.push(data.card); state.project.rev++;
        res.end(JSON.stringify({project:state.project}));
      });
      return;
    }
    res.writeHead(404); res.end();
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
    const page = await browser.newPage({viewport:{width:1200,height:760},acceptDownloads:true});
    page.setDefaultTimeout(10000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const url = 'http://127.0.0.1:' + server.address().port;
    const thumb = (round, index) => page.locator('#hist .hrun').nth(round).locator(`[data-i="${index}"]`);
    async function reset() { resetState(); await page.goto(url); }
    async function settle() { await page.evaluate(async () => { await Promise.all(dropPromises); await saveChain; }); }
    async function unchanged() {
      assert.equal(await page.evaluate(() => JSON.stringify({cards:PROJ.cards.slice(0,2).map(plain),edges:PROJ.edges}) === original), true);
    }
    async function noCard() {
      await settle(); assert.equal(await page.evaluate(() => PROJ.cards.length),2);
      assert.equal(await page.locator('#world .card').count(),2); await unchanged();
    }
    async function synthetic(round=1, index=0) {
      const drag = await page.evaluate(({round,index}) => startDrag(round,index), {round,index});
      // 合成 DataTransfer 的 effectAllowed 在 Chrome 中只读；copy 由原生拖拽用例验证。
      assert.deepEqual(drag.types,[MIME]); assert.ok(drag.token);
      assert.doesNotMatch(drag.token,/output|http|comfy/);
      await page.evaluate(() => drop()); await settle(); return drag;
    }
    async function imported(index, round=1, point={x:527,y:389}, transform={x:73,y:-41,k:0.65}) {
      await settle();
      const card = await page.evaluate(() => plain(PROJ.cards[2]));
      assert.equal(await page.evaluate(() => PROJ.cards.length),3);
      assert.equal(await page.locator('#world .card').count(),3);
      assert.equal(state.creates.length,1); assert.equal(state.uploads.length,1); assert.equal(state.downloads.length,1);
      const name = `${round === 0 ? 'current' : 'older'}-${index}.${extensions[index]}`;
      assert.equal(state.downloads[0],'/output/' + name);
      assert.equal(state.uploads[0].url,'/api/upload?project=history-test');
      assert.equal(state.uploads[0].filename,name); assert.equal(state.uploads[0].type,types[index]);
      assert.match(state.uploads[0].header,/^multipart\/form-data; boundary=/);
      assert.ok(state.uploads[0].body.includes(media[index]),'必须把真实下载字节交给上传接口');
      assert.equal(card.type,'card_asset');
      assert.deepEqual({x:card.x,y:card.y},{x:Math.round((point.x-40-transform.x)/transform.k-134),y:Math.round((point.y-30-transform.y)/transform.k-84)});
      assert.equal(card.outputs[0].kind,kinds[index]); assert.equal(card.outputs[0].ref,`chouka/new-1.${extensions[index]}`);
      assert.equal(card.outputs[0].url,`/asset/new-1.${extensions[index]}`); assert.equal(card.outputs[0].filename,name);
      assert.equal(card.outputs[0].subfolder,undefined); assert.equal(await page.evaluate(() => viewers.length),0);
      assert.equal(await page.evaluate(() => messages.filter(m => m.startsWith('已建素材节点')).length),1);
      await unchanged();
    }

    for (const [index,kind] of kinds.entries()) await t.test(`${kind} 原生鼠标拖拽、旧轮次索引及缩放偏移落点`, async () => {
      await reset();
      const transform = [{x:73,y:-41,k:0.65},{x:-37,y:52,k:1.5},{x:112,y:27,k:0.4}][index];
      await page.evaluate(v => { view = v; },transform);
      await thumb(1,index).scrollIntoViewIfNeeded();
      const box = await thumb(1,index).boundingBox(), point = {x:527+index*23,y:389+index*31};
      const hit = await page.evaluate(({x,y}) => { const d = document.elementFromPoint(x,y); return {tag:d?.tagName,index:d?.dataset.i}; },
        {x:box.x+box.width/2,y:box.y+box.height/2});
      assert.equal(hit.index,String(index),JSON.stringify({box,hit}));
      assert.equal(await thumb(1,index).getAttribute('draggable'),'true');
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2); await page.mouse.down();
      await page.mouse.move(box.x+box.width/2-12,box.y+box.height/2,{steps:3});
      await page.mouse.move(point.x,point.y,{steps:12});
      await page.mouse.move(point.x+1,point.y); await page.mouse.move(point.x,point.y); await page.mouse.up();
      await page.waitForFunction(() => dropsDone === 1).catch(async error => {
        t.diagnostic(JSON.stringify(await page.evaluate(() => ({events:nativeEvents,drag:historyAssetDrag,messages,dropsDone})))); throw error;
      });
      await imported(index,1,point,transform);
      const events = await page.evaluate(() => nativeEvents);
      assert.deepEqual(events.map(e => [e.type,e.trusted]),[['start',true],['end',true]]);
      assert.deepEqual(events[0].types,[MIME]); assert.equal(events[0].effect,'copy');
      assert.equal(await page.evaluate(() => historyAssetDrag),null);
      await page.evaluate(() => drop()); await noExtraCard();
      await thumb(1,index).click(); assert.equal(await page.evaluate(() => viewers.length),1);
    });
    async function noExtraCard() { await settle(); assert.equal(await page.evaluate(() => PROJ.cards.length),3); assert.equal(state.uploads.length,1); }

    for (const [index,kind] of kinds.entries()) await t.test(`${kind} 最新轮次合成 DataTransfer 只建一张`, async () => {
      await reset(); await synthetic(0,index); await imported(index,0); await page.evaluate(() => drop()); await noExtraCard();
    });

    for (const [index,kind] of kinds.entries()) await t.test(`${kind} 正常单击和右键真实下载保留`, async () => {
      await reset(); await thumb(1,index).click();
      const viewer = await page.evaluate(() => viewers[0]);
      assert.equal(viewer.id,'source'); assert.equal(viewer.index,index); assert.equal(viewer.seed,901);
      assert.deepEqual(viewer.outputs,initialProject().cards[0].history[1].outputs);
      await thumb(1,index).click({button:'right'});
      assert.equal(await page.getByRole('button',{name:new RegExp('下载全部 3 张')}).isVisible(),true);
      const pending = page.waitForEvent('download');
      await page.getByRole('button',{name:new RegExp(`下载${['图片','视频','音频'][index]}$`)}).click();
      const download = await pending;
      assert.equal(download.suggestedFilename(),`older-${index}.${extensions[index]}`);
      assert.deepEqual(readFileSync(await download.path()),media[index]);
      assert.equal(await page.evaluate(() => viewers.length),1); assert.equal(state.uploads.length,0); await noCard();
    });

    await t.test('右键全部下载仍逐项保留原文件', async () => {
      await reset(); const downloads = []; const listener = d => downloads.push(d); page.on('download',listener);
      try {
        await thumb(1,0).click({button:'right'}); await page.getByRole('button',{name:/下载全部 3 张/}).click();
        await page.waitForFunction(() => document.querySelectorAll('a[download]').length === 0);
        // 三个浏览器下载事件按文件名收集，不依赖下载完成顺序。
        for (let i=0;i<3;i++) {
          if (downloads.length < 3) await page.waitForEvent('download');
        }
        assert.equal(downloads.length,3);
        for (const d of downloads) {
          const index = extensions.findIndex(ext => d.suggestedFilename().endsWith('.'+ext));
          assert.deepEqual(readFileSync(await d.path()),media[index]);
        }
        await noCard();
      } finally { page.off('download',listener); }
    });

    await t.test('拖动期间的单击不打开查看器，结束后恢复', async () => {
      await reset(); await page.evaluate(() => { startDrag(); dragThumb.click(); });
      assert.equal(await page.evaluate(() => viewers.length),0);
      await page.evaluate(() => endDrag());
      await thumb(1,0).click(); assert.equal(await page.evaluate(() => viewers.length),1); await noCard();
    });

    for (const mode of ['无内部拖拽','伪造 token','空 token','错误 MIME','引用排序 MIME']) await t.test(`${mode} 被忽略`, async () => {
      await reset();
      await page.evaluate(({mode,MIME}) => {
        if (mode !== '无内部拖拽') startDrag();
        const dt = new DataTransfer();
        const mime = mode === '错误 MIME' ? 'text/plain' : mode === '引用排序 MIME' ? 'application/x-chouka-image-slot' : MIME;
        dt.setData(mime,mode === '空 token' ? '' : mode.includes('MIME') ? transfer.getData(MIME) : 'forged');
        drop(dt);
      },{mode,MIME});
      await noCard(); assert.equal(state.downloads.length,0); assert.equal(state.uploads.length,0);
    });

    await t.test('取消原生拖出画布后 token 无法重放', async () => {
      await reset(); const box = await thumb(1,0).boundingBox();
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2); await page.mouse.down();
      await page.mouse.move(1170,720,{steps:12}); await page.mouse.move(1171,720); await page.mouse.up();
      await page.waitForFunction(() => nativeEvents.some(e => e.type === 'end'));
      assert.equal(await page.evaluate(() => historyAssetDrag),null);
      await page.evaluate(MIME => { const dt = new DataTransfer(); dt.setData(MIME,nativeEvents[0].token); drop(dt); },MIME);
      await noCard(); assert.equal(state.downloads.length,0); assert.equal(await page.evaluate(() => viewers.length),0);
    });

    await t.test('drop 前切换同 ID 项目对象也不能导入', async () => {
      await reset(); await page.evaluate(() => { startDrag(); PROJ = JSON.parse(JSON.stringify(PROJ)); drop(); });
      await noCard(); assert.equal(state.downloads.length,0);
    });

    for (const phase of ['download','blob','upload']) for (const change of ['项目切换','同 ID 新对象','只读','会话失效']) {
      await t.test(`${phase} 异步期间${change}不留节点`, async () => {
        await reset(); state.hold = phase;
        await page.evaluate(() => { startDrag(); drop(); });
        // 本地服务确认响应已挂起后再改状态；不用固定延时制造竞态。
        await state.heldReady;
        assert.equal(state.held.length,1);
        await page.evaluate(change => {
          if (change === '项目切换') PROJ = {...PROJ,id:'another-project'};
          if (change === '同 ID 新对象') PROJ = {...PROJ};
          if (change === '只读') PROJ.permission = 'read';
          if (change === '会话失效') H3Auth.active = false;
        },change);
        state.held.splice(0).forEach(respond => respond()); await noCard();
        assert.equal(state.creates.length,0); assert.equal(state.uploads.length,phase === 'upload' ? 1 : 0);
        assert.equal(await page.evaluate(() => messages.some(m => m.startsWith('已建素材节点'))),false);
      });
    }

    for (const failure of ['downloadFail','uploadFail','invalidUpload']) await t.test(`${failure} 无空白幽灵节点`, async () => {
      await reset(); state[failure] = true; await synthetic(); await noCard();
      assert.equal(state.creates.length,0);
      assert.match(await page.evaluate(() => messages.at(-1)),/^导入历史产物失败/);
    });
    await t.test('节点定义不可用时导入成功也不建空节点', async () => {
      await reset(); await page.evaluate(() => { CARDS[0].modes = []; });
      await synthetic(); await noCard(); assert.equal(state.uploads.length,1); assert.equal(state.creates.length,0);
      assert.equal(await page.evaluate(() => messages.some(m => m.startsWith('已建素材节点'))),false);
    });
    await t.test('建节点接口失败通过真实队列回滚，不留幽灵节点', async () => {
      await reset(); state.createFail = true; await synthetic(); await noCard(); assert.equal(state.creates.length,1);
      assert.match(await page.evaluate(() => messages.at(-1)),/^卡片添加失败/);
    });

    for (const guard of ['read','inactive']) await t.test(`${guard} 从拖动开始到画布落下均拒绝`, async () => {
      await reset();
      const results = await page.evaluate(({guard,MIME}) => {
        if (guard === 'read') PROJ.permission = 'read'; else H3Auth.active = false;
        const started = startDrag(); const dt = new DataTransfer(); dt.setData(MIME,'forged');
        const over = new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt}); el.stage.dispatchEvent(over);
        return {started,over:over.defaultPrevented,dropped:drop(dt)};
      },{guard,MIME});
      assert.equal(results.started.prevented,true); assert.deepEqual(results.started.types,[]);
      assert.equal(results.over,false); assert.equal(results.dropped,false); await noCard(); assert.equal(state.downloads.length,0);
    });
    await t.test('已开始拖动后变成只读同样不下载、不创建', async () => {
      await reset(); await page.evaluate(() => { startDrag(); PROJ.permission = 'read'; drop(); }); await noCard(); assert.equal(state.downloads.length,0);
    });
    await t.test('未知产物类型禁止拖动', async () => {
      await reset(); const result = await page.evaluate(() => { PROJ.cards[0].history[1].outputs[0].kind = 'text'; return startDrag(); });
      assert.equal(result.prevented,true); assert.deepEqual(result.types,[]); assert.equal(state.downloads.length,0);
    });
    await t.test('拖拽开始时保存输出快照，不受原记录随后变化影响', async () => {
      await reset(); state.project.cards[0].history[1].outputs[0].url = '/output/current-0.png';
      await page.evaluate(() => { startDrag(); PROJ.cards[0].history[1].outputs[0].url = '/output/current-0.png'; drop(); });
      await settle(); assert.equal(state.downloads[0],'/output/older-0.png');
      assert.equal(await page.evaluate(() => PROJ.cards[2].outputs[0].filename),'older-0.png');
      assert.equal(await page.evaluate(() => PROJ.cards[0].history[1].outputs[0].url),'/output/current-0.png');
    });
    for (const [index,kind] of kinds.entries()) await t.test(`${kind} 旧记录缺 filename 时从 URL 路径回退且不带查询参数`, async () => {
      await reset();
      const output = state.project.cards[0].history[1].outputs[index]; delete output.filename; output.url += '?fixture=1';
      await page.evaluate(index => {
        const output = PROJ.cards[0].history[1].outputs[index]; delete output.filename; output.url += '?fixture=1'; openHistory('source');
        original = JSON.stringify({cards:PROJ.cards.map(plain),edges:PROJ.edges});
      },index);
      await synthetic(1,index); await settle(); assert.equal(state.uploads[0].filename,`older-${index}.${extensions[index]}`);
      assert.equal(await page.evaluate(() => PROJ.cards[2].outputs[0].filename),`older-${index}.${extensions[index]}`); await unchanged();
    });
    await t.test('本地文件拖入仍走原 multipart 上传分支并按落点错开', async () => {
      await reset(); await page.evaluate(() => {
        const dt = new DataTransfer();
        dt.items.add(new File(['local-image'],'local.png',{type:'image/png'}));
        dt.items.add(new File(['local-audio'],'local.wav',{type:'audio/wav'})); drop(dt);
      });
      await settle(); assert.equal(state.uploads.length,2); assert.equal(state.downloads.length,0); assert.equal(state.creates.length,2);
      assert.deepEqual(state.uploads.map(x => x.filename),['local.png','local.wav']);
      const cards = await page.evaluate(() => PROJ.cards.slice(2).map(plain));
      assert.equal(cards.length,2); assert.equal(cards[1].x-cards[0].x,50); assert.equal(cards[1].y-cards[0].y,50);
      assert.deepEqual(cards.map(c => c.outputs[0].kind),['image','audio']); await unchanged();
    });
    await t.test('不支持的本地文件不会误建历史素材节点', async () => {
      await reset(); await page.evaluate(() => { const dt = new DataTransfer(); dt.items.add(new File(['text'],'a.txt',{type:'text/plain'})); drop(dt); });
      await noCard(); assert.equal(state.uploads.length,0); assert.match(await page.evaluate(() => messages.at(-1)),/只支持/);
    });
    assert.deepEqual(errors,[]);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
});
