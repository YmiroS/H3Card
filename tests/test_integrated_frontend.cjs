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
      for (const url of [...adminPages, '/monitor', '/api/admin/users', '/api/workers', '/api/costs', '/api/capacity']) {
        assert.equal((await page.request.get(service.origin + url)).status(), 403, url);
      }
      assert.equal((await page.request.get(service.origin + '/vendor/fabric.min.js')).status(), 200);
      assert.equal((await page.request.post(service.origin + '/api/auth/logout', {
        headers:{Origin:service.origin, 'X-CSRF-Token':artistSession.csrf_token},
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
