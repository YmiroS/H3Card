'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {spawn} = require('node:child_process');
const {once} = require('node:events');
const {chromium} = require('playwright');

const root = path.resolve(__dirname, '..');
const password = 'Test-password-123';

async function startService() {
  const child = spawn(process.env.CHOUKA_TEST_PYTHON || 'python3',
    ['-B', '-X', 'utf8', path.join(__dirname, 'helpers', 'integrated_frontend.py')],
    {cwd:root, env:process.env, stdio:['pipe', 'pipe', 'pipe'], windowsHide:true});
  let logs = '';
  child.stderr.on('data', chunk => { logs += chunk; });
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Python service startup timed out\n${logs}`)), 30000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Python exited ${code}\n${logs}`)); });
    child.stdout.on('data', chunk => {
      logs += chunk;
      const match = /FRONTEND_READY (\{[^\n]+\})/.exec(logs);
      if (match) { clearTimeout(timer); resolve(JSON.parse(match[1]).origin); }
    });
  }).catch(error => { child.stdin.end(); throw error; });
  return {origin, async close() {
    const exited = once(child, 'exit');
    child.stdin.end('\n');
    await exited;
  }};
}

test('compiled React and management pages share Python auth without any old web runtime',
  {timeout:90000}, async () => {
    const service = await startService();
    let browser;
    try {
      browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER && process.env.CHOUKA_TEST_BROWSER !== 'chromium'
        ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
      const context = await browser.newContext();
      const errors = [], external = [];
      await context.route('**/*', route => {
        if (new URL(route.request().url()).origin !== service.origin) {
          external.push(route.request().url());
          return route.abort('blockedbyclient');
        }
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(service.origin + '/');
      await page.waitForURL(service.origin + '/login');
      await page.locator('input[name="username"]').fill('admin');
      await page.locator('input[name="password"]').fill(password);
      await page.getByRole('button', {name:'登录', exact:true}).click();
      await page.waitForURL(service.origin + '/');
      await page.locator('#plist').waitFor({state:'visible'});
      assert.equal(await page.evaluate(() => document.body.dataset.choukaPage), 'canvas');
      const session = await page.evaluate(async () => (await fetch('/api/auth/me')).json());
      assert.equal(session.user.role, 'admin');
      assert.ok(session.csrf_token);
      await page.goto(service.origin + '/?project=browser');
      await page.locator('#ptitle').filter({hasText:'整合验收画布'}).waitFor({state:'visible'});
      assert.equal(await page.locator('#world').count(), 1);
      const adminHistory = (await (await page.request.get(service.origin + '/api/jobs')).json()).jobs;
      assert.equal(adminHistory.length, 7);
      const firstHistory = await (await page.request.get(service.origin + '/api/jobs/history')).json();
      assert.equal(firstHistory.jobs.length, 50);
      assert.equal(firstHistory.total, 137);
      assert.equal(firstHistory.has_more, true);
      const archived = firstHistory.jobs.find(job => job.id === 'db-history-000');
      assert.equal(archived.history_only, true);
      assert.equal(archived.permission, 'read');
      assert.equal(archived.cardName, '数据库历史卡片0');
      assert.equal(archived.nodeName, '数据库历史执行端');
      assert.equal(Object.hasOwn(archived, 'progress'), false);
      assert.equal(adminHistory.find(job => job.id === 'orphan-history').permission, 'read');
      assert.deepEqual([...new Set(adminHistory.map(job => job.submitter_username).filter(Boolean))].sort(),
        ['admin', 'artist']);
      await page.locator('#jobsbtn').click();
      await page.waitForFunction(() => document.querySelectorAll('#jobs .jrow').length === 50);
      assert.doesNotMatch(await page.locator('#jobs').textContent(), /数据库历史卡片129/);
      await page.locator('#jobs .jlist').hover();
      await page.mouse.wheel(0, 10000);
      await page.waitForFunction(() => document.querySelectorAll('#jobs .jrow').length === 100);
      await page.locator('#jobs .jlist').hover();
      await page.mouse.wheel(0, 10000);
      await page.waitForFunction(() => document.querySelectorAll('#jobs .jrow').length === 137);
      assert.match(await page.locator('#jobs').textContent(), /数据库历史卡片129/);
      assert.match(await page.locator('#jobs').textContent(), /无归属历史/);
      const archivedRow = page.locator('#jobs .jrow').filter({hasText:'数据库历史卡片129'});
      assert.match(await archivedRow.textContent(), /执行节点：数据库历史执行端/);
      assert.equal(await archivedRow.getByRole('button', {name:'停止', exact:true}).count(), 0);
      assert.equal(await archivedRow.getByRole('button', {name:'删除', exact:true}).count(), 0);
      await page.locator('#jobs .jlist').hover();
      await page.mouse.wheel(0, 10000);
      await page.waitForFunction(() => /137.*137.*已加载全部历史/.test(
        document.querySelector('#jobs .jhistory')?.textContent || ''));
      const panelScreenshot = path.join(require('node:os').tmpdir(), `task-database-history-${process.pid}.png`);
      await page.screenshot({path:panelScreenshot, fullPage:true});
      console.log('Task history browser evidence: ' + panelScreenshot);
      await page.locator('#jobs .x').click();
      page.once('dialog', dialog => dialog.accept('整合验收已保存'));
      const renamed = page.waitForResponse(response => new URL(response.url()).pathname === '/api/projects/browser/rename');
      await page.locator('#plist .pitem .ren').click();
      assert.equal((await renamed).status(), 200);
      await page.reload();
      await page.locator('#ptitle').filter({hasText:'整合验收已保存'}).waitFor({state:'visible'});
      const fusionId = 'minimax_h3_fusion_v2_bf16';
      const catalog = await (await page.request.get(service.origin + '/api/cards')).json();
      const fusion = catalog.capabilities[fusionId];
      assert.equal(fusion.name, 'H3无损融合单采满血剪枝');
      assert.equal(fusion.slots, 'img6+aud3+vid1');
      const created = await page.request.post(service.origin + '/api/projects/browser/cards', {
        headers:{Origin:service.origin, 'X-CSRF-Token':session.csrf_token},
        data:{card:{id:'fusion-browser', type:'card_video', cap:'minimax_h3_fusion_v2',
          x:120, y:60, name:'满血单采验收', assets:{}, outputs:[],
          params:{prompt:'电影镜头', seed:123, megapixels:1.1, aspect_ratio:'16:9 (Widescreen)'}}},
      });
      assert.equal(created.status(), 200, await created.text());
      await page.reload();
      await page.locator('#world .card .ch').click();
      await page.locator('#panel .foot .tcap').first().click();
      await page.getByText(fusion.name, {exact:true}).last().click();
      await page.locator('#panel button[title^="点开弹窗"]').click();
      const clarity = page.locator('#respop .cgrid.k');
      await clarity.getByRole('button', {name:'1080p', exact:true}).click();
      assert.equal(await clarity.locator('.on').textContent(), '1080p');
      assert.match(await page.locator('#panel button[title^="点开弹窗"]').textContent(), /1920×1080/);
      const saved = page.waitForResponse(response =>
        new URL(response.url()).pathname === '/api/projects/browser' && response.request().method() === 'PUT');
      await page.locator('#respop').getByRole('button', {name:'9:16', exact:true}).click();
      assert.equal((await saved).status(), 200);
      await page.reload();
      await page.locator('#world .card .ch').click();
      assert.match(await page.locator('#panel .foot .tcap').first().textContent(), /H3无损融合单采满血剪枝/);
      assert.match(await page.locator('#panel button[title^="点开弹窗"]').textContent(), /1080×1920/);
      const project = await (await page.request.get(service.origin + '/api/projects/browser')).json();
      const stored = project.cards.find(card => card.id === 'fusion-browser');
      assert.equal(stored.cap, fusionId);
      assert.equal(stored.params.output_1080p, 'on');
      assert.equal(stored.params.scale_by, undefined);
      assert.deepEqual(Object.keys(stored.params).filter(key => key.startsWith('output_')), ['output_1080p']);
      const dry = await page.request.post(service.origin + '/api/generate', {
        headers:{Origin:service.origin, 'X-CSRF-Token':session.csrf_token},
        data:{capability:stored.cap, project:'browser', card:stored.id, params:stored.params, assets:{}, dry_run:true},
      });
      assert.equal(dry.status(), 200, await dry.text());
      const changed = (await dry.json()).changed;
      assert.deepEqual(changed['#136.width'][1], 1088);
      assert.deepEqual(changed['#136.height'][1], 1920);
      assert.equal(changed['#h3_1080p_scale_148.width'][1], 1080);
      assert.equal(changed['#h3_1080p_scale_148.height'][1], 1920);
      assert.equal(changed['#h3_1080p_scale_148.image'][1][0], '122');
      await page.goto(service.origin + '/director?project=browser');
      await page.waitForFunction(() => document.body.dataset.choukaPage === 'director');
      await page.goto(service.origin + '/if-studio');
      await page.waitForFunction(() => document.body.dataset.choukaPage === 'ifStudio');
      for (const url of ['/teams', '/controller', '/controller/costs', '/controller/capacity', '/admin/permissions', '/monitor']) {
        const response = await page.goto(service.origin + url);
        assert.equal(new URL(page.url()).origin, service.origin);
        assert.equal(response.status(), 200);
        if (url === '/teams') await page.waitForFunction(() => document.body.dataset.choukaPage === 'teams');
        else {
          const selector = url === '/monitor' ? '#snapshot-content'
            : url === '/admin/permissions' ? '#users'
            : url === '/controller/capacity' ? '#main-content' : '#main';
          await page.locator(selector).waitFor({state:'visible'});
          if (url === '/controller') {
            await page.waitForFunction(() => document.querySelectorAll('#job-rows tr').length === 50);
            assert.match(await page.locator('#job-note').textContent(), /137/);
            await page.locator('.f-job-scroll').hover();
            await page.mouse.wheel(0, 10000);
            await page.waitForFunction(() => document.querySelectorAll('#job-rows tr').length === 100);
            await page.locator('.f-job-scroll').hover();
            await page.mouse.wheel(0, 10000);
            await page.waitForFunction(() => document.querySelectorAll('#job-rows tr').length === 137);
            await page.locator('#jobs-filter').selectOption('error');
            await page.waitForFunction(() => document.querySelectorAll('#job-rows tr').length === 19);
            assert.match(await page.locator('#job-rows tr').first().textContent(), /db-history-111/);
            assert.match(await page.locator('#job-rows tr').last().textContent(), /db-history-129/);
            assert.equal(await page.locator('#job-rows tr').first().locator('td').nth(4).textContent(),
              '数据库历史执行端');
            const screenshot = path.join(require('node:os').tmpdir(), `controller-global-history-${process.pid}.png`);
            await page.screenshot({path:screenshot, fullPage:true});
            console.log('History browser evidence: ' + screenshot);
          }
          assert.equal(await page.locator('#root').count(), 1, url + ' must mount its React root');
          assert.equal(await page.evaluate(() => ['H3Auth', 'H3Notify', 'AdminUI', 'MonitorAlerts']
            .some(name => Reflect.has(window, name))), false, url + ' must not load inherited admin globals');
        }
      }
      // Fabric is the sole un-hashed application library and remains protected.
      const vendor = await page.request.get(service.origin + '/vendor/fabric.min.js');
      assert.equal(vendor.status(), 200);
      assert.equal(vendor.headers()['cache-control'], 'private, no-store');
      assert.deepEqual(await vendor.body(), fs.readFileSync(path.join(root, 'web_dist', 'vendor', 'fabric.min.js')));
      await page.evaluate(() => new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/vendor/fabric.min.js'; script.onload = resolve; script.onerror = reject;
        document.head.append(script);
      }));
      assert.equal(await page.evaluate(() => typeof window.fabric.Canvas), 'function');
      for (const url of ['/app.js', '/style.css', '/admin-shell.js', '/auth.js', '/auth-page.css',
        '/controller-page.js', '/costs-page.js', '/capacity-page.js', '/monitor-page.js',
        '/image-composer.js', '/image-composer.css', '/admin/controller.html', '/admin/permissions.html',
        '/admin/costs.html', '/admin/capacity.html', '/admin/monitor.html']) {
        assert.equal((await page.request.get(service.origin + url)).status(), 404, url);
      }
      const missing = await page.request.get(service.origin + '/assets/not-a-release.js');
      const privateFile = await page.request.get(service.origin + '/release.json');
      const unsafe = await page.request.post(service.origin + '/api/projects', {data:{}, headers:{Origin:service.origin}});
      const logout = await page.request.post(service.origin + '/api/auth/logout', {
        headers:{Origin:service.origin, 'X-CSRF-Token':session.csrf_token},
      });
      assert.deepEqual({missing:missing.status(), privateFile:privateFile.status(), unsafe:unsafe.status(), logout:logout.status()},
        {missing:404, privateFile:404, unsafe:403, logout:200});
      const adminPages = ['/controller', '/controller/costs', '/controller/capacity', '/admin/permissions'];
      for (const url of [...adminPages, '/monitor', '/vendor/fabric.min.js']) {
        const anonymous = await page.request.get(service.origin + url, {maxRedirects:0});
        assert.equal(anonymous.status(), 302, url);
        assert.equal(anonymous.headers().location, '/login');
      }
      const artistLogin = await page.request.post(service.origin + '/api/auth/login', {
        data:{username:'artist', password}, headers:{Origin:service.origin},
      });
      assert.equal(artistLogin.status(), 200);
      const artistSession = await artistLogin.json();
      const artistHistory = (await (await page.request.get(service.origin + '/api/jobs')).json()).jobs;
      assert.equal(artistHistory.length, 3);
      assert.ok(artistHistory.every(job => job.project === 'artist-history'));
      assert.ok(artistHistory.every(job => !Object.hasOwn(job, 'submitter_username')));
      await page.goto(service.origin + '/?project=artist-history');
      await page.locator('#jobsbtn').click();
      await page.waitForFunction(() => document.querySelectorAll('#jobs .jrow').length === 3);
      assert.equal((await page.request.get(service.origin + '/api/jobs/history')).status(), 403);
      assert.equal(await page.locator('#jobs .jowner').count(), 0);
      assert.equal((await page.request.get(service.origin + '/api/job/orphan-history')).status(), 404);
      for (const url of [...adminPages, '/monitor', '/api/admin/users', '/api/workers', '/api/costs', '/api/capacity']) {
        assert.equal((await page.request.get(service.origin + url)).status(), 403, url);
      }
      assert.equal((await page.request.get(service.origin + '/vendor/fabric.min.js')).status(), 200);
      assert.equal((await page.request.post(service.origin + '/api/auth/logout', {
        headers:{Origin:service.origin, 'X-CSRF-Token':artistSession.csrf_token},
      })).status(), 200);
      const viewerLogin = await page.request.post(service.origin + '/api/auth/login', {
        data:{username:'viewer', password}, headers:{Origin:service.origin},
      });
      assert.equal(viewerLogin.status(), 200);
      const viewerSession = await viewerLogin.json();
      const readProject = await (await page.request.get(service.origin + '/api/projects/browser')).json();
      assert.equal(readProject.permission, 'read');
      const viewerWrites = [];
      const recordViewerWrite = request => {
        const pathname = new URL(request.url()).pathname;
        if (!['GET', 'HEAD'].includes(request.method()) &&
          /^\/api\/(generate|upload|text|rewrite|projects)(\/|$)/.test(pathname)) viewerWrites.push(pathname);
      };
      page.on('request', recordViewerWrite);
      await page.goto(service.origin + '/?project=browser');
      await page.locator('#world .card .ch').click();
      await page.locator('#panel [data-readonly-notice]').waitFor({state:'visible'});
      const readonlyPrompt = page.locator('#panel textarea').first();
      assert.equal(await readonlyPrompt.inputValue(), stored.params.prompt);
      assert.equal(await readonlyPrompt.getAttribute('readonly'), '');
      await readonlyPrompt.click();
      await readonlyPrompt.press('ControlOrMeta+a');
      await readonlyPrompt.press('Backspace');
      assert.equal(await readonlyPrompt.inputValue(), stored.params.prompt);
      assert.equal(await page.locator('#panel .go').isDisabled(), true);
      for (const button of await page.locator('#panel .foot .tcap:not([data-readonly-view])').all()) {
        assert.equal(await button.isDisabled(), true);
      }
      await page.locator('#panel button[title^="点开弹窗"]').click();
      await page.locator('#respop [data-readonly-notice]').waitFor({state:'visible'});
      assert.equal(await page.locator('#respop .cgrid.k .on').textContent(), '1080p');
      for (const button of await page.locator('#respop button:not([data-readonly-view])').all()) {
        assert.equal(await button.isDisabled(), true);
      }
      const readonlyScreenshot = path.join(require('node:os').tmpdir(), `readonly-card-parameters-${process.pid}.png`);
      await page.screenshot({path:readonlyScreenshot, fullPage:true});
      console.log('Readonly parameter browser evidence: ' + readonlyScreenshot);
      await page.locator('#respop .x').click();
      assert.deepEqual(viewerWrites, []);
      page.off('request', recordViewerWrite);
      assert.deepEqual(await (await page.request.get(service.origin + '/api/projects/browser')).json(), readProject);
      const viewerHeaders = {Origin:service.origin, 'X-CSRF-Token':viewerSession.csrf_token};
      assert.equal((await page.request.put(service.origin + '/api/projects/browser', {
        headers:viewerHeaders, data:readProject,
      })).status(), 403);
      assert.equal((await page.request.post(service.origin + '/api/generate', {
        headers:viewerHeaders,
        data:{capability:stored.cap, project:'browser', card:stored.id, params:stored.params, assets:{}, dry_run:true},
      })).status(), 403);
      // Stop workspace auth polling before logout so it cannot race the legacy-login redirect check.
      await page.goto('about:blank');
      assert.equal((await page.request.post(service.origin + '/api/auth/logout', {
        headers:viewerHeaders,
      })).status(), 200);
      await page.goto(service.origin + '/login.html');
      await page.waitForURL(service.origin + '/login');
      await page.locator('input[name="username"]').fill('monitor');
      await page.locator('input[name="password"]').fill(password);
      await page.getByRole('button', {name:'登录', exact:true}).click();
      await page.waitForURL(service.origin + '/monitor');
      const policy = {};
      for (const url of ['/', '/api/projects', '/admin/permissions', '/controller', '/controller/costs',
        '/controller/capacity', '/vendor/fabric.min.js']) {
        policy[url] = (await page.request.get(service.origin + url)).status();
      }
      assert.deepEqual(policy, {'/':403, '/api/projects':403, '/admin/permissions':403,
        '/controller':403, '/controller/costs':403, '/controller/capacity':403, '/vendor/fabric.min.js':403});
      await page.goto(service.origin + '/login');
      await page.waitForURL(service.origin + '/monitor');
      assert.deepEqual(errors, []);
      // IF may embed its upstream; the test deliberately blocks it rather than contacting a live service.
      assert.ok(external.every(url => new URL(url).origin !== service.origin));
    } finally {
      if (browser) await browser.close();
      await service.close();
    }
  });

test('compiled image crop and brush persist and export real PNG through isolated Python APIs',
  {timeout:60000}, async () => {
    const service = await startService();
    let browser;
    try {
      browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER && process.env.CHOUKA_TEST_BROWSER !== 'chromium'
        ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
      const page = await browser.newPage();
      const errors = [], generated = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => {
        if (new URL(request.url()).pathname === '/api/generate') generated.push(request.url());
      });
      await page.route('**/*', route => new URL(route.request().url()).origin === service.origin
        ? route.continue() : route.abort('blockedbyclient'));
      const login = await page.request.post(service.origin + '/api/auth/login', {
        data:{username:'admin', password}, headers:{Origin:service.origin},
      });
      assert.equal(login.status(), 200);
      const session = await login.json();
      const headers = {Origin:service.origin, 'X-CSRF-Token':session.csrf_token};
      await page.goto(service.origin + '/?project=browser');
      await page.locator('#ptitle').filter({hasText:'整合验收画布'}).waitFor({state:'visible'});
      const source = Buffer.from(await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 8;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'red'; ctx.fillRect(0, 0, 8, 8);
        ctx.fillStyle = 'lime'; ctx.fillRect(4, 0, 4, 4);
        return canvas.toDataURL('image/png').split(',')[1];
      }), 'base64');
      const upload = await page.request.post(service.origin + '/api/upload?project=browser&local_only=1', {
        headers, multipart:{file:{name:'crop-source.png', mimeType:'image/png', buffer:source}},
      });
      assert.equal(upload.status(), 200, await upload.text());
      const uploaded = await upload.json(), asset = uploaded.files?.[0] || uploaded;
      const created = await page.request.post(service.origin + '/api/projects/browser/cards', {
        headers, data:{card:{id:'crop-browser', type:'card_tools', cap:'image_composite', x:100, y:50,
          assets:{}, outputs:[], params:{composition:{version:1, width:64, height:64,
            background:'transparent', layers:[{id:'one', name:'裁剪验收', asset,
              x:8, y:8, width:32, height:24, angle:0, opacity:1, visible:true, locked:false}]}}}},
      });
      assert.equal(created.status(), 200, await created.text());
      await page.reload();
      const editor = page.locator('[data-image-composer]');
      const crop = editor.locator('[data-image-crop]');
      const open = async () => {
        await page.locator('#world .card .ch').click();
        await page.locator('#panel .go').click();
        await editor.getByRole('button', {name:'保存编辑稿', exact:true}).waitFor({state:'visible'});
        await editor.locator('[data-layer-id="one"] [data-layer-action="select"]').click();
        await editor.getByRole('button', {name:'裁剪图片', exact:true}).click();
        await crop.waitFor({state:'visible'});
      };
      await open();
      for (const [label, value] of [['裁剪 X / px', 4], ['裁剪 Y / px', 0],
        ['裁剪宽度 / px', 4], ['裁剪高度 / px', 4]]) {
        const input = crop.getByLabel(label, {exact:true});
        await input.fill(String(value)); await input.press('Tab');
      }
      await crop.getByRole('button', {name:'应用裁剪', exact:true}).click();
      const saved = page.waitForResponse(response =>
        new URL(response.url()).pathname === '/api/projects/browser' && response.request().method() === 'PUT');
      await editor.getByRole('button', {name:'保存编辑稿', exact:true}).click();
      assert.equal((await saved).status(), 200);
      const getCard = async () => (await (await page.request.get(service.origin + '/api/projects/browser')).json())
        .cards.find(card => card.id === 'crop-browser');
      const stored = (await getCard()).params.composition.layers[0];
      assert.deepEqual(stored.crop, {x:4, y:0, width:4, height:4});
      assert.deepEqual([stored.x, stored.y, stored.width, stored.height], [24, 8, 16, 12]);
      assert.deepEqual(stored.asset, asset);
      await editor.getByRole('button', {name:'关闭', exact:true}).click();
      await page.reload();
      await open();
      assert.equal(await crop.getByLabel('裁剪 X / px', {exact:true}).inputValue(), '4');
      assert.equal(await crop.getByLabel('裁剪宽度 / px', {exact:true}).inputValue(), '4');
      await crop.getByRole('button', {name:'取消裁剪', exact:true}).click();
      const exported = page.waitForResponse(response =>
        new URL(response.url()).pathname === '/api/projects/browser' && response.request().method() === 'PUT');
      await editor.getByRole('button', {name:'合成 PNG', exact:true}).click();
      assert.equal((await exported).status(), 200);
      const output = (await getCard()).outputs[0];
      const pixels = await page.evaluate(async url => {
        const response = await fetch(url);
        if (!response.ok) throw new Error('PNG read failed: ' + response.status);
        const bitmap = await createImageBitmap(await response.blob());
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width; canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0); bitmap.close();
        return {size:[canvas.width, canvas.height], samples:[[10,10], [26,10], [38,18], [26,24]]
          .map(([x,y]) => [...ctx.getImageData(x,y,1,1).data])};
      }, output.url);
      assert.deepEqual(pixels, {size:[64,64], samples:[
        [0,0,0,0], [0,255,0,255], [0,255,0,255], [0,0,0,0],
      ]});
      assert.deepEqual((await getCard()).params.composition.layers[0], stored);
      const draw = async (from, to, button = 'left') => {
        const bounds = await editor.locator('[data-composition-bounds]').boundingBox();
        assert.ok(bounds);
        await page.mouse.move(bounds.x + from[0] * bounds.width / 64, bounds.y + from[1] * bounds.height / 64);
        await page.mouse.down({button});
        await page.mouse.move(bounds.x + to[0] * bounds.width / 64, bounds.y + to[1] * bounds.height / 64, {steps:6});
        await page.mouse.up({button});
      };
      assert.equal(await editor.getByRole('button', {name:'拖动画布', exact:true}).count(), 0);
      await draw([30,14], [34,14], 'middle');
      const beforeZoom = await editor.locator('[data-composition-bounds]').boundingBox();
      assert.ok(beforeZoom);
      await page.mouse.move(beforeZoom.x + beforeZoom.width / 2, beforeZoom.y + beforeZoom.height / 2);
      await page.mouse.wheel(0, -120);
      await page.waitForFunction(width => document.querySelector('[data-composition-bounds]').getBoundingClientRect().width > width, beforeZoom.width);
      await editor.getByRole('button', {name:'吸色', exact:true}).click();
      const zoomed = await editor.locator('[data-composition-bounds]').boundingBox();
      assert.ok(zoomed);
      await page.mouse.click(zoomed.x + 32 * zoomed.width / 64, zoomed.y + 14 * zoomed.height / 64);
      await editor.getByLabel('快捷画笔颜色', {exact:true}).waitFor({state:'visible'});
      assert.equal(await editor.getByLabel('快捷画笔颜色', {exact:true}).inputValue(), '#00ff00');
      assert.deepEqual((await getCard()).params.composition.layers[0], stored);
      const sizeSlider = editor.getByLabel('快捷笔刷大小 / px', {exact:true});
      assert.equal(await sizeSlider.getAttribute('type'), 'range');
      await sizeSlider.focus();
      await sizeSlider.press('Home');
      for (let step = 1; step < 8; step++) await sizeSlider.press('ArrowRight');
      assert.equal(await sizeSlider.inputValue(), '8');
      const brushPreview = editor.locator('[data-brush-cursor]');
      assert.equal(await brushPreview.isVisible(), true);
      assert.equal(await brushPreview.textContent(), '8 px');
      await editor.getByLabel('快捷画笔颜色', {exact:true}).fill('#0000ff');
      await draw([46,46], [54,46]);
      await editor.locator('[data-layer-id="one"] [data-layer-action="select"]').click();
      await editor.getByRole('button', {name:'橡皮擦', exact:true}).click();
      await draw([30,14], [34,14]);
      await editor.getByRole('button', {name:'恢复像素', exact:true}).click();
      await draw([30,14], [34,14]);
      const brushSaved = page.waitForResponse(response =>
        new URL(response.url()).pathname === '/api/projects/browser' && response.request().method() === 'PUT');
      await editor.getByRole('button', {name:'保存编辑稿', exact:true}).click();
      assert.equal((await brushSaved).status(), 200);
      const brushCard = await getCard(), brushDraft = brushCard.params.composition;
      assert.equal(brushDraft.version, 2);
      const paintLayer = brushDraft.layers.find(layer => layer.kind === 'paint');
      assert.ok(paintLayer);
      assert.equal(paintLayer.paint.strokes.length, 1);
      assert.equal(paintLayer.asset, undefined);
      assert.equal(brushCard.assets['composite:' + paintLayer.id], undefined);
      assert.deepEqual(brushDraft.layers[0].effects.map(stroke => stroke.tool), ['erase','restore']);
      assert.deepEqual(brushDraft.layers[0].asset, asset);
      await editor.getByRole('button', {name:'关闭', exact:true}).click();
      await page.reload();
      await open();
      await crop.getByRole('button', {name:'取消裁剪', exact:true}).click();
      const brushExported = page.waitForResponse(response =>
        new URL(response.url()).pathname === '/api/projects/browser' && response.request().method() === 'PUT');
      await editor.getByRole('button', {name:'合成 PNG', exact:true}).click();
      assert.equal((await brushExported).status(), 200);
      const brushOutput = (await getCard()).outputs[0];
      const brushPixels = await page.evaluate(async url => {
        const bitmap = await createImageBitmap(await (await fetch(url)).blob());
        const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap,0,0); bitmap.close();
        return [[50,46],[32,14],[10,10]].map(([x,y]) => [...ctx.getImageData(x,y,1,1).data]);
      }, brushOutput.url);
      assert.deepEqual(brushPixels, [[0,0,255,255],[0,255,0,255],[0,0,0,0]]);
      assert.deepEqual((await getCard()).params.composition, brushDraft);
      assert.deepEqual(errors, []);
      assert.deepEqual(generated, []);
    } finally {
      if (browser) await browser.close();
      await service.close();
    }
  });
