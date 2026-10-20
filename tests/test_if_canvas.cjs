const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync, existsSync} = require('node:fs');
const {createServer} = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');

const root = path.join(__dirname, '..');
const web = path.join(root, 'web');
const cards = JSON.parse(readFileSync(path.join(root, 'manifests', '_cards.json'), 'utf8'));
const capabilities = Object.fromEntries(['if_image', 'if_video', 'zimage_t2i', 'zimage_i2i', 'minimax_h3_character_transfer']
  .map(id => [id, JSON.parse(readFileSync(path.join(root, 'manifests', id + '.json'), 'utf8'))]));
const ifModelLimits = JSON.parse(readFileSync(path.join(root, 'manifests', '_if_model_limits.json'), 'utf8'));
test('IF reference matrix covers every known model and never exceeds provider limits', () => {
  assert.equal(Object.keys(ifModelLimits).length, 18);
  for (const [name, limit] of Object.entries(ifModelLimits)) {
    assert.ok(['image', 'video'].includes(limit.type), name);
    for (const kind of ['image', 'video', 'audio']) {
      assert.ok(Number.isInteger(limit.bridge[kind]) && limit.bridge[kind] >= 0, `${name}: ${kind}`);
      if (limit.type === 'image' && kind !== 'image') assert.equal(limit.bridge[kind], 0, `${name}: ${kind}`);
      if (limit.api[kind] !== null) assert.ok(limit.bridge[kind] <= limit.api[kind], `${name}: ${kind}`);
    }
    assert.equal(limit.bridge.audio, 0, name);
  }
});
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

const card = (kind, model) => ({id:'if-card', type:kind === 'image' ? 'card_image' : 'card_video',
  cap:kind === 'image' ? 'if_image' : 'if_video', x:550, y:20,
  params:{if_model:model}, assets:{}, outputs:[]});

test('IF in canvas image and video panels uses local bridge and saves results', async () => {
  let project = {id:'if-test', rev:0, name:'IF 模型菜单', permission:'operate', locked:false,
    edges:[], groups:[], view:{x:100, y:70, k:1}, cards:[card('image', 'qwen-image-2.0')]};
  const requests = [], runs = [], uploadedReferences = [];
  const referenceId = 'a'.repeat(32);
  let failMediaOnce = true;
  let returnVideoStoryboard = false;
  let returnVideoPlanOnly = false;
  const json = (res, data) => {res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data));};
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;
    if (pathname === '/api/auth/me') return json(res, {user:{id:'admin', username:'admin', role:'admin'}, csrf_token:'test-csrf'});
    if (pathname === '/api/auth/presence' || pathname.endsWith('/presence')) return json(res, {ok:true, users:[]});
    if (pathname === '/api/cards') return json(res, {cards, capabilities, if_model_limits:ifModelLimits, comfy_online:true});
    if (pathname === '/api/health') return json(res, {comfy_online:true});
    if (pathname === '/api/jobs') return json(res, {jobs:[]});
    if (pathname === '/api/projects') return json(res, {projects:[{...project, cards:1}]});
    if (pathname === '/api/projects/if-test' && req.method === 'GET') return json(res, project);
    if (pathname === '/api/projects/if-test' && req.method === 'PUT') {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {const next = JSON.parse(Buffer.concat(chunks));
        project = {...project, ...next, rev:project.rev + 1}; json(res, {ok:true, rev:project.rev});});
      return;
    }
    if (pathname === '/api/upload') {
      req.resume(); const kind = url.searchParams.has('local_only') ? 'image' : 'video';
      const ext = kind === 'image' ? 'png' : 'mp4';
      return json(res, {files:[{kind, ref:`if-result.${ext}`, origin:`if-result.${ext}`, url:`/fixture.${ext}`}]});
    }
    if (pathname === '/fixture.png') {res.setHeader('Content-Type', 'image/png'); return res.end(png);}
    if (pathname === '/fixture.mp4') {res.setHeader('Content-Type', 'video/mp4'); return res.end('fake-video');}
    if (pathname === '/api/generate') {requests.push('unexpected generation'); res.writeHead(400); return res.end();}
    const name = pathname === '/' ? 'index.html' : pathname.slice(1);
    const file = path.join(web, name);
    if (name && !name.includes('/') && existsSync(file)) {
      res.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript'
        : name.endsWith('.css') ? 'text/css' : name.endsWith('.png') ? 'image/png' : 'text/html');
      return res.end(readFileSync(file));
    }
    requests.push(req.method + ' ' + pathname); res.writeHead(404); res.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
    const page = await browser.newPage({viewport:{width:1600, height:1100}});
    page.setDefaultTimeout(10000);
    const origin = `http://127.0.0.1:${server.address().port}`;
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.route('http://127.0.0.1:8278/**', route => {
      const request = route.request(), url = new URL(request.url());
      const headers = {'Access-Control-Allow-Origin':origin, 'Access-Control-Allow-Methods':'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers':'Content-Type, X-Chouka-IF', 'Access-Control-Allow-Private-Network':'true'};
      if (request.method() === 'OPTIONS') return route.fulfill({status:204, headers});
      if (request.method() === 'DELETE' && url.pathname.startsWith('/assets/'))
        return route.fulfill({status:200, headers, contentType:'application/json', body:'{"ok":true}'});
      if (url.pathname === '/assets') {
        uploadedReferences.push({type:request.headers()['content-type'], body:request.postDataBuffer()});
        const asset_id = uploadedReferences.length <= 2 ? referenceId
          : 'b'.repeat(31) + uploadedReferences.length;
        return route.fulfill({status:201, headers, contentType:'application/json', body:JSON.stringify({asset_id})});
      }
      if (url.pathname.endsWith('/media/0')) {
        const kind = runs.at(-1).type;
        if (kind === 'image' && failMediaOnce) {
          failMediaOnce = false;
          return route.fulfill({status:503, headers, body:'temporary media error'});
        }
        return route.fulfill({status:200, headers, contentType:kind === 'image' ? 'image/png' : 'video/mp4',
          body:kind === 'image' ? png : Buffer.from('fake-video')});
      }
      const result = url.pathname === '/status' ? {ready:true}
        : url.pathname === '/models' ? {models:[{display_name:'qwen-image-3.0', type:'image'},
          {display_name:'qwen-image-2.0', type:'image'}, {display_name:'z-image-turbo', type:'image'},
          {display_name:'Wan3.0视频', type:'video'}, {display_name:'Minimax H3', type:'video'},
          {display_name:'星辰图生视频', type:'video'}, {display_name:'可灵3.0 Omni', type:'video'}]}
        : url.pathname === '/runs' && request.method() === 'POST'
          ? (runs.push(request.postDataJSON()), {id:'bridge-' + runs.length})
          : /^\/runs\/bridge-\d+$/.test(url.pathname) ? {state:'done', result:{status:'done',
            ...(runs.at(-1).asset_ids?.length > 1 ? {submitted_prompt:
              '基于以上已登记的全部参考素材（图片1、图片2、视频1、视频2），执行以下总需求：\n\n' + runs.at(-1).prompt} : {}),
            planning_text:returnVideoStoryboard || returnVideoPlanOnly ? '请确认这张故事板，再生成下一张图片' : '',
            downloaded:returnVideoPlanOnly ? [] : [{index:0, type:returnVideoStoryboard ? 'image' : runs.at(-1).type,
              name:runs.at(-1).type === 'image' || returnVideoStoryboard ? 'result.png' : 'result.mp4'}]}}
          : {error:'not found'};
      return route.fulfill({status:result.error ? 404 : 200, headers, contentType:'application/json', body:JSON.stringify(result)});
    });

    for (const [kind, initial, chosen, modeTitle] of [
      ['image', 'qwen-image-2.0', 'qwen-image-3.0', '生图模式'], ['video', 'Minimax H3', 'Wan3.0视频', '生视频模式']]) {
      const original = card(kind, initial);
      original.cap = kind === 'image' ? 'zimage_t2i' : 'minimax_h3_character_transfer';
      const asset = {id:'asset-src', type:'card_asset', cap:'asset', x:20, y:20, params:{}, assets:{},
        outputs:[{kind, ref:`if-fixture.${kind === 'image' ? 'png' : 'mp4'}`,
          url:`/fixture.${kind === 'image' ? 'png' : 'mp4'}`,
          ...(kind === 'video' ? {width:1280, height:720, duration:6} : {})}]};
      project = {...project, cards:[original, asset], edges:[]};
      await page.goto(origin + '/?project=if-test');
      await page.waitForFunction(() => PROJ?.cards[0]?._el
        && projects.some(item => item.id === PROJ.id && item.permission === PROJ.permission));
      await page.evaluate(() => pick(PROJ.cards[0].id));
      await page.evaluate(async () => linkTo(PROJ.cards[1], PROJ.cards[0]));
      assert.equal(await page.evaluate(() => PROJ.edges.length), 1);
      const referencesBeforeSwitch = await page.evaluate(() => ({
        assets:JSON.stringify(PROJ.cards[0].assets), edges:JSON.stringify(PROJ.edges),
      }));
      await page.locator(`#panel button[title="${modeTitle} —— 点击换"]`).click();
      const modeEntries = await page.locator('#menu > .grp, #menu > button').evaluateAll(nodes => nodes.map(node =>
        node.classList.contains('grp') ? node.textContent : node.querySelector('span:last-child').textContent));
      assert.equal(modeEntries[0], '本地 API');
      assert.equal(modeEntries.at(-2), '云端 API');
      assert.equal(modeEntries.at(-1), 'IFS');
      assert.ok(modeEntries.slice(1, -2).every(name => name !== 'IFS' && name !== 'IF'));
      await page.locator('#menu button').filter({hasText:'IFS'}).click();
      assert.equal(await page.evaluate(() => PROJ.cards[0].cap), kind === 'image' ? 'if_image' : 'if_video');
      assert.deepEqual(await page.evaluate(() => ({
        assets:JSON.stringify(PROJ.cards[0].assets), edges:JSON.stringify(PROJ.edges),
      })), referencesBeforeSwitch, 'switching into IFS must keep connected materials and wires');
      assert.equal(await page.locator('#panel .slot.filled').count(), 1);
      assert.match(await page.locator(`#panel button[title="${modeTitle} —— 点击换"]`).innerText(), /IFS/);
      const modelButton = page.locator('#panel button[title="IF 模型 —— 点击换"]');
      await modelButton.click();
      await page.waitForFunction(() => document.querySelector('#menu')?.textContent.includes('（当前）'));
      const unsupported = kind === 'image' ? 'z-image-turbo' : '星辰图生视频';
      assert.deepEqual(await page.locator('#menu button span:last-child').allTextContents(),
        [chosen, initial + '（当前）', unsupported, ...(kind === 'video' ? ['可灵3.0 Omni'] : [])]);
      await page.locator('#menu button').filter({hasText:chosen}).click();
      const noteLayout = await page.locator('#panel .pbody').evaluate(body => {
        const linkLeft = body.querySelector('a').getBoundingClientRect().left;
        return [...body.querySelectorAll(':scope > .knobnote')].map(note => ({
          paddingLeft:getComputedStyle(note).paddingLeft,
          left:note.getBoundingClientRect().left, linkLeft,
        }));
      });
      assert.equal(noteLayout.length, 2);
      for (const note of noteLayout) {
        assert.equal(note.paddingLeft, '0px', 'panel descriptions must not reserve a parameter-label column');
        assert.ok(Math.abs(note.left - note.linkLeft) < 1, 'descriptions align with the API link');
      }
      const summary = await page.locator('#panel .pbody').innerText();
      if (kind === 'video') {
        assert.match(summary, /供应商 API 资料（并非 IF 引用上限）/);
        assert.match(summary, /画布按各类型上限开放图片 10／视频 5槽位/);
        assert.doesNotMatch(summary, /官方 API 同名模型\/家族参考上限/);
      } else assert.match(summary, /官方 API 同名模型\/家族参考上限/);
      assert.equal(await page.evaluate(() => PROJ.edges[0].slot), kind === 'image' ? 'images[0]' : 'video[0]');
      assert.match(await page.locator('#panel .refhead').innerText(), kind === 'image' ? /图片 3/ : /图片 10 · 视频 5/);
      await modelButton.click();
      await page.locator('#menu button').filter({hasText:unsupported}).click();
      assert.equal(await page.evaluate(() => PROJ.cards[0].params.if_model), unsupported);
      assert.equal(await page.evaluate(() => PROJ.edges.length), 1);
      assert.equal(await page.locator('#panel .slot.filled').count(), 1);
      if (kind === 'video') {
        for (const name of ['星辰图生视频', '可灵3.0 Omni']) {
          if (name !== unsupported) {
            await modelButton.click();
            await page.locator('#menu button').filter({hasText:name}).click();
          }
          const estimate = await page.locator('#panel .pbody').innerText();
          assert.match(estimate, /H3 全能参考高质量估算（未核实该模型上限）：图片 9（H3 估算） · 视频 3（H3 估算） · 音频 3（H3 估算）/);
          assert.match(estimate, /画布按 H3 估算开放图片 9／视频 3槽位，模型能否接收仍待实测/);
          assert.match((await page.locator('#panel .refhead').allTextContents()).join(' '), /图片 9 · 视频 3/);
          assert.equal(await page.evaluate(() => PROJ.edges.length), 1);
        }
      } else {
        assert.match(await page.locator('#panel .pbody').innerText(), /已连接的引用保持原样/);
        await page.locator('#panel .pblock textarea').first().fill('不兼容引用不应提交');
        await page.locator('#panel .go').click();
        await page.waitForFunction(() => PROJ.cards[0].status === 'error');
        assert.match(await page.evaluate(() => PROJ.cards[0].error), /当前画布尚未开放所选模型的/);
        assert.equal(runs.length, 0, 'incompatible references must not submit a bridge job');
        assert.equal(uploadedReferences.length, 0, 'incompatible references must not upload');
      }
      assert.equal(await page.evaluate(() => PROJ.edges.length), 1);
      await modelButton.click();
      await page.locator('#menu button').filter({hasText:initial}).click();
      assert.equal(await page.evaluate(() => PROJ.edges.length), 1);
      await modelButton.click();
      await page.locator('#menu button').filter({hasText:chosen}).click();
      assert.equal(await page.evaluate(() => PROJ.cards[0].params.if_model), chosen,
        'changing models must preserve the canvas reference');
      await page.locator('#panel button[title^="点开弹窗"]').click();
      const ratio = page.locator('#respop .cgrid button').filter({hasText:'4:3'});
      await ratio.click();
      await page.locator('#respop .cgrid button').filter({hasText:kind === 'image' ? '1080P' : '544p'}).click();
      const rows = page.locator('#respop .row');
      if (kind === 'image') {
        assert.deepEqual(await page.locator('#respop .cgrid.k button').allTextContents(),
          ['480P', '720P', '1080P', '1440P', '2K']);
        assert.equal(await rows.count(), 0);
        assert.equal(await page.locator('#respop .image-advanced').count(), 0);
        await page.evaluate(() => { PROJ.cards[0].params.seed = 42; PROJ.cards[0].params.if_skill = '旧版技能'; });
      } else {
        assert.equal(await rows.count(), 4);
        await rows.filter({hasText:'时长'}).locator('input[type="number"]').fill('12');
        await rows.filter({hasText:'种子'}).locator('input[type="number"]').fill('42');
        await rows.filter({hasText:'IF 技能'}).locator('input').fill('商品展示');
      }
      await page.locator('#respop .x').click();
      await page.locator('#panel .pblock textarea').first().fill('蓝色圆形');
      await page.locator('#panel .go').click();
      await page.waitForFunction(() => PROJ.cards[0].status === 'done');
      const videoDirective = `最终交付必须是由「${chosen}」生成的视频文件，不是图片、故事板或文字方案。用户已经确认生成需求，请直接生成视频；不要等待用户确认规划、分镜或中间图片，也不要把中间图片当作最终结果。如无法直接完成，请说明原因，不要改为生图。以本条视频目标和以下生成规格为准。\n\n`;
      assert.deepEqual(runs.at(-1), {type:kind, model:chosen,
        prompt:`${kind === 'video' ? videoDirective : ''}蓝色圆形\n\n生成规格（作为内容要求）：分辨率 ${kind === 'image' ? '1440×1080' : '736×544，视频时长约 12 秒，随机种子参考 42'}。`,
        asset_ids:[referenceId], ...(kind === 'video' ? {skill:'商品展示'} : {})});
      assert.equal(uploadedReferences.length, kind === 'image' ? 1 : 2);
      assert.equal(uploadedReferences.at(-1).type, kind === 'image' ? 'image/png' : 'video/mp4');
      assert.deepEqual(uploadedReferences.at(-1).body, kind === 'image' ? png : Buffer.from('fake-video'));
      assert.equal(await page.evaluate(() => PROJ.cards[0].outputs[0].kind), kind);
      assert.equal(await page.evaluate(() => PROJ.cards[0].history.length), 1);
      assert.deepEqual(await page.evaluate(() => PROJ.cards[0].history[0].prompts), [
        {key:'if_original', label:'原始提示词', text:'蓝色圆形'},
        {key:'if_submitted', label:'提交给 IF CLI 的提示词', text:runs.at(-1).prompt},
      ]);
      await page.evaluate(() => openHistory(PROJ.cards[0].id));
      assert.deepEqual(await page.locator('#hist .history-prompt summary').allTextContents(),
        ['原始提示词', '提交给 IF CLI 的提示词']);
      await page.evaluate(() => enqueueSave(PROJ.id));
      assert.deepEqual(project.cards[0].history[0].prompts,
        await page.evaluate(() => PROJ.cards[0].history[0].prompts));
      assert.equal(project.cards[0].status, 'done');
      assert.equal(project.cards[0].params.if_model, chosen);
      if (kind === 'image') {
        project.cards[0] = {...project.cards[0], status:'running', outputs:[]};
        await page.reload();
        await page.waitForFunction(() => PROJ?.cards[0]?.status === 'done');
        assert.equal(runs.length, 1, 'refresh must poll the original bridge job without resubmitting');
      }
    }
    assert.equal(runs.length, 2);
    await page.locator('#panel .pblock textarea').first().fill('后来修改的视频需求');
    assert.equal(await page.evaluate(() => PROJ.cards[0].history[0].prompts[0].text), '蓝色圆形');
    returnVideoStoryboard = true;
    await page.locator('#panel .go').click();
    await page.waitForFunction(() => PROJ.cards[0].status === 'error');
    assert.match(await page.evaluate(() => PROJ.cards[0].error), /只生成了故事板图片，尚未生成视频，并要求确认下一步/);
    assert.equal(await page.evaluate(() => PROJ.cards[0].outputs.length), 0);
    assert.equal(runs.length, 3);
    assert.deepEqual(await page.evaluate(() => ({status:PROJ.cards[0].history[0].status,
      prompts:PROJ.cards[0].history[0].prompts})), {status:'error', prompts:[
      {key:'if_original', label:'原始提示词', text:'后来修改的视频需求'},
      {key:'if_submitted', label:'提交给 IF CLI 的提示词', text:runs.at(-1).prompt},
    ]});
    returnVideoPlanOnly = true;
    await page.locator('#panel .go').click();
    await page.waitForFunction(() => PROJ.cards[0].job === 'bridge-4' && PROJ.cards[0].status === 'error');
    assert.match(await page.evaluate(() => PROJ.cards[0].error), /^IF 要求确认规划或故事板，未直接生成视频/);
    assert.equal(runs.length, 4);
    assert.equal(await page.evaluate(() => PROJ.cards[0].history.length), 3);
    assert.match(await page.locator('#hist .hrun').first().locator('.rh .cnt').innerText(), /^失败/);
    await page.evaluate(() => enqueueSave(PROJ.id));
    await page.reload();
    await page.waitForFunction(() => PROJ?.cards[0]?.history?.length === 3);
    assert.equal(await page.evaluate(() => PROJ.cards[0].history[0].prompts[1].text), runs.at(-1).prompt);
    assert.deepEqual(await page.evaluate(() => ({
      textOnly: capOf({cap:'if_image', params:{if_model:'z-image-turbo'}}).inputs.filter(s => MEDIA.includes(s.type)).length,
      unknown: capOf({cap:'if_video', params:{if_model:'星辰图生视频'}}).inputs.filter(s => MEDIA.includes(s.type)).length,
      kling: capOf({cap:'if_video', params:{if_model:'可灵3.0 Omni'}}).inputs.filter(s => MEDIA.includes(s.type)).length,
      wanApi: ifModelLimits['Wan3.0视频'].api,
      wanBridge: ifModelLimits['Wan3.0视频'].bridge,
    })), {textOnly:0, unknown:12, kling:12, wanApi:{image:10, video:5, audio:5}, wanBridge:{image:10, video:5, audio:0}});
    returnVideoStoryboard = false; returnVideoPlanOnly = false;
    const beforeMulti = uploadedReferences.length;
    await page.evaluate(async () => linkTo(PROJ.cards[1], PROJ.cards[0]));
    assert.deepEqual(await page.evaluate(() => PROJ.edges.map(edge => edge.slot)), ['video[0]', 'video[1]']);
    await page.evaluate(() => {
      const c = PROJ.cards[0];
      c.assets['images[0]'] = {kind:'image', url:'/fixture.png'};
      c.assets['images[1]'] = {kind:'image', url:'/fixture.png'};
      openPanel(c.id);
    });
    assert.match(await page.locator('#panel .refhead').innerText(), /图片 10 · 视频 5/);
    await page.locator('#panel .pblock textarea').first().fill('结合全部素材生成视频');
    await page.locator('#panel .go').click();
    await page.waitForFunction(() => PROJ.cards[0].job === 'bridge-5' && PROJ.cards[0].status === 'done');
    assert.deepEqual(runs.at(-1).asset_ids,
      [1, 2, 3, 4].map(n => 'b'.repeat(31) + (beforeMulti + n)));
    assert.deepEqual(uploadedReferences.slice(-4).map(item => item.type),
      ['image/png', 'image/png', 'video/mp4', 'video/mp4']);
    assert.equal(await page.evaluate(() => PROJ.cards[0].history.find(h => h.job === 'bridge-5')
      .prompts.find(p => p.key === 'if_submitted').text),
      '基于以上已登记的全部参考素材（图片1、图片2、视频1、视频2），执行以下总需求：\n\n' + runs.at(-1).prompt);
    let uploadAttempts = 0;
    const deletedAssets = [];
    await page.route('http://127.0.0.1:8278/**', route => {
      const request = route.request(), pathname = new URL(request.url()).pathname;
      if (request.method() === 'POST' && pathname === '/assets' && ++uploadAttempts === 2)
        return route.fulfill({status:429, contentType:'application/json',
          headers:{'Access-Control-Allow-Origin':origin}, body:'{"error":"模拟素材容量不足"}'});
      if (request.method() === 'DELETE' && pathname.startsWith('/assets/'))
        deletedAssets.push(pathname);
      return route.fallback();
    });
    await page.locator('#panel .go').click();
    await page.waitForFunction(() => PROJ.cards[0].status === 'error');
    assert.match(await page.evaluate(() => PROJ.cards[0].error), /模拟素材容量不足/);
    assert.deepEqual(deletedAssets, ['/assets/' + 'b'.repeat(31) + uploadedReferences.length]);
    assert.equal(runs.length, 5, 'failed multi-reference upload must not submit a job');
    project = {...project, cards:[card('image', 'qwen-image-3.0'),
      {id:'image-src', type:'card_asset', cap:'asset', x:20, y:20, params:{}, assets:{},
        outputs:[{kind:'image', url:'/fixture.png', ref:'image.png'}]}], edges:[]};
    await page.goto(origin + '/?project=if-test');
    await page.waitForFunction(() => PROJ?.cards[0]?._el
      && projects.some(item => item.id === PROJ.id && item.permission === PROJ.permission));
    await page.evaluate(async () => {
      pick(PROJ.cards[0].id);
      for (let n = 0; n < 3; n++) await linkTo(PROJ.cards[1], PROJ.cards[0]);
    });
    assert.deepEqual(await page.evaluate(() => PROJ.edges.map(edge => edge.slot)),
      ['images[0]', 'images[1]', 'images[2]']);
    assert.match(await page.locator('#panel .refhead').innerText(), /图片 3/);
    assert.doesNotMatch(await page.locator('#panel .pbody').innerText(), /合计最多 1 项|不支持音频及多引用/);
    await page.evaluate(async () => linkTo(PROJ.cards[1], PROJ.cards[0]));
    assert.equal(await page.evaluate(() => PROJ.edges.length), 3, 'model limit must still apply');
    const beforeImageMulti = uploadedReferences.length;
    await page.locator('#panel .pblock textarea').first().fill('结合图片1、图片2、图片3生成');
    await page.locator('#panel .go').click();
    await page.waitForFunction(() => PROJ.cards[0].job === 'bridge-6' && PROJ.cards[0].status === 'done');
    assert.equal(runs.at(-1).type, 'image');
    assert.equal(runs.at(-1).asset_ids.length, 3);
    assert.equal(uploadedReferences.length - beforeImageMulti, 3);
    assert.ok(uploadedReferences.slice(-3).every(item => item.type === 'image/png'));
    const conversions = [];
    let conversionFailure = false, oversizedCopy = false;
    await page.route(origin + '/oversized.*', route => {
      const kind = route.request().url().endsWith('.png') ? 'image' : 'video';
      return route.fulfill({contentType:kind === 'image' ? 'image/png' : 'video/mp4',
        body:Buffer.alloc(kind === 'image' ? 12_500_000 : 50 * 1024 * 1024 + 1)});
    });
    await page.route(origin + '/api/if-reference?*', async route => {
      const url = new URL(route.request().url()), kind = url.searchParams.get('type');
      assert.deepEqual(await page.evaluate(() => ({status:PROJ.cards[0].status,
        step:PROJ.cards[0].step, visible:PROJ.cards[0]._el.textContent.includes(PROJ.cards[0].step)})),
        {status:'queued', step:`正在适配 IF ${kind === 'image' ? '图片' : '视频'}上传副本`, visible:true});
      conversions.push(Object.fromEntries(url.searchParams));
      return route.fulfill(conversionFailure ? {status:422, body:'模拟转换失败，原素材未修改'} : {
        contentType:kind === 'image' ? 'image/webp' : 'video/mp4',
        body:oversizedCopy ? Buffer.alloc(10_000_001) : Buffer.from('adapted-' + kind),
        headers:{'X-Chouka-IF-Conversion':kind === 'image' ? 'lossless-webp' : 'compressed-mp4'}});
    });
    for (const kind of ['image', 'video']) {
      await page.evaluate(kind => {
        const c = PROJ.cards[0];
        c.cap = 'if_video'; c.params = {if_model:'Wan3.0视频', prompt:'测试上传副本'};
        c.status = 'idle'; c.job = null; c.assets = {}; PROJ.edges = [];
        c.assets[kind === 'image' ? 'images[0]' : 'video[0]'] = {
          kind, url:kind === 'image' ? '/oversized.png' : '/oversized.mp4'};
        openPanel(c.id);
      }, kind);
      const before = runs.length;
      await page.locator('#panel .go').click();
      await page.waitForFunction(before => PROJ.cards[0].status === 'done'
        && PROJ.cards[0].job === 'bridge-' + (before + 1), before);
      assert.equal(runs.length, before + 1);
      assert.equal(uploadedReferences.at(-1).type, kind === 'image' ? 'image/webp' : 'video/mp4');
      assert.deepEqual(uploadedReferences.at(-1).body, Buffer.from('adapted-' + kind));
      assert.equal(await page.evaluate(kind => PROJ.cards[0].assets[kind === 'image' ? 'images[0]' : 'video[0]'].url, kind),
        kind === 'image' ? '/oversized.png' : '/oversized.mp4', 'original canvas asset is not replaced');
    }
    assert.deepEqual(conversions, [{url:'/oversized.png', type:'image'}, {url:'/oversized.mp4', type:'video'}]);
    conversionFailure = true;
    await page.evaluate(() => {
      const c = PROJ.cards[0];
      c.assets = {'images[0]':{kind:'image', url:'/fixture.png'},
        'video[0]':{kind:'video', url:'/oversized.mp4'}};
      openPanel(c.id);
    });
    const beforeFailure = runs.length, deletedBefore = deletedAssets.length;
    await page.locator('#panel .go').click();
    await page.waitForFunction(() => PROJ.cards[0].status === 'error');
    assert.match(await page.evaluate(() => PROJ.cards[0].error), /模拟转换失败/);
    assert.equal(runs.length, beforeFailure, 'failed conversion must not submit a paid run');
    assert.equal(deletedAssets.length, deletedBefore + 1, 'already uploaded references must be released');
    conversionFailure = false; oversizedCopy = true;
    await page.evaluate(() => {
      const c = PROJ.cards[0];
      c.assets = {'images[0]':{kind:'image', url:'/oversized.png'}};
      c.status = 'idle'; c.error = null;
      openPanel(c.id);
    });
    const uploadsBeforeInvalidCopy = uploadedReferences.length;
    await page.locator('#panel .go').click();
    await page.waitForFunction(() => PROJ.cards[0].status === 'error');
    assert.match(await page.evaluate(() => PROJ.cards[0].error), /10 MB/);
    assert.equal(runs.length, beforeFailure);
    assert.equal(uploadedReferences.length, uploadsBeforeInvalidCopy,
      'even an adapted image one byte over 10,000,000 must not reach the bridge');
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(requests.filter(r => r === 'unexpected generation'), []);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
