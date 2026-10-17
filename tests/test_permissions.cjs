// Requires Playwright; optionally set CHOUKA_TEST_BROWSER=msedge.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { createServer } = require('node:http');
const { chromium } = require('playwright');

const web = path.join(__dirname, '..', 'web');
const source = readFileSync(path.join(web, 'app.js'), 'utf8');
const helpers = source.slice(source.indexOf('const canOperate'), source.indexOf('const jpost ='));
const presenceHelpers = source.slice(source.indexOf('const PRESENCE_COLORS'), source.indexOf('function updatePresenceCursor'));
const browserOptions = process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {};

test('所有页面统一CK标签图标，品牌图片保持透明及原始比例', async () => {
  const pages = ['index', 'login', 'director', 'permissions', 'teams', 'controller', 'costs', 'capacity'];
  const files = new Map([
    ...pages.map(name => [`/${name}.html`, [`${name}.html`, 'text/html; charset=utf-8']]),
    ...['style', 'auth-page', 'director'].map(name => [`/${name}.css`, [`${name}.css`, 'text/css']]),
    ...['icon.png', 'favicon.png', 'auth-logo.png', 'auth-art.webp'].map(name => [`/${name}`, [name, name.endsWith('.webp') ? 'image/webp' : 'image/png']]),
  ]);
  const server = createServer((req, res) => {
    const item = files.get(new URL(req.url, 'http://localhost').pathname);
    if (!item) { res.writeHead(404); res.end(); return; }
    // 此项只检查真实HTML/CSS品牌展示，禁止业务脚本发起账号或画布请求。
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:");
    res.setHeader('Content-Type', item[1]);
    res.end(readFileSync(path.join(web, item[0])));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(browserOptions);
    const page = await browser.newPage({viewport:{width:1440, height:900}});
    const origin = 'http://127.0.0.1:' + server.address().port;
    for (const name of pages) {
      await page.goto(`${origin}/${name}.html`);
      const favicon = page.locator('link[rel="icon"]');
      assert.equal(await favicon.count(), 1, `${name} 必须声明唯一标签图标`);
      assert.equal(await favicon.getAttribute('href'), '/favicon.png?v=ck05');
      const icons = page.locator('img[src$="icon.png"], img[src$="auth-logo.png"]');
      const expected = name === 'director' ? 2 : 1;
      assert.equal(await icons.count(), expected, `${name} 品牌入口不可遗漏`);
      for (const icon of await icons.all()) {
        await icon.evaluate(image => image.decode());
        const box = await icon.evaluate(image => ({
          width:image.width, height:image.height, naturalWidth:image.naturalWidth, naturalHeight:image.naturalHeight,
          visible:image.getBoundingClientRect().width > 0,
        }));
        assert.equal(box.visible, true);
        assert.ok(Math.abs(box.width / box.height - box.naturalWidth / box.naturalHeight) < 0.02, `${name} Logo不能被拉伸`);
      }
      if (name === 'index') assert.equal(await page.locator('link[rel="apple-touch-icon"]').getAttribute('href'), '/icon.png?v=ck05');
      if (name === 'director') assert.equal(await page.locator('.welcome-mark').innerText(), '');
      if (expected) await page.screenshot({path:`/tmp/h3card-brand-${name}.png`});
    }
    const images = await page.evaluate(async () => {
      const read = async (url) => {
        const image = new Image(); image.src = url; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
        const context = canvas.getContext('2d');
        const scale = Math.min(128 / image.naturalWidth, 128 / image.naturalHeight);
        const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
        context.drawImage(image, (128 - width) / 2, (128 - height) / 2, width, height);
        return {width:image.naturalWidth, height:image.naturalHeight, data:[...context.getImageData(0, 0, 128, 128).data]};
      };
      return Promise.all(['/auth-logo.png', '/icon.png', '/favicon.png?v=ck05'].map(read));
    });
    const [reference, ...variants] = images;
    assert.deepEqual(variants.map(image => [image.width, image.height]), [[256, 256], [64, 64]]);
    for (const image of variants) {
      assert.equal(image.data[3], 0, '正方形图标四周保持透明');
      let intersection = 0, union = 0, colorDifference = 0;
      for (let i = 0; i < image.data.length; i += 4) {
        const expected = reference.data[i + 3] >= 128, actual = image.data[i + 3] >= 128;
        if (expected || actual) union++;
        if (expected && actual) {
          intersection++;
          for (let channel = 0; channel < 3; channel++) colorDifference += Math.abs(reference.data[i + channel] - image.data[i + channel]);
        }
      }
      assert.ok(intersection / union > 0.95, `${image.width}px图标轮廓应与CK一致，重合度为${intersection / union}`);
      assert.ok(colorDifference / (intersection * 3) < 3, '全站图标应保留CK原色');
    }
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('readonly blocks save and operate while allowing view of granted projects', async () => {
  const html = `<!doctype html><meta charset="utf-8"><div id="fixture"></div><script>
    let PROJ = null, projects = [], TASKS = [];
    const toast = m => (window.lastToast = m);
    const el = {panel: document.createElement('div'), dock: {style: {}},
                ptitle: document.createElement('div'), plist: document.createElement('div'),
                selbar: {style: {}}, jobs: {style: {display: 'none'}}};
    let saveTimer = null;
    window.H3Auth = {active: true, user: {role: 'user', id: 'u2'}};
    ${helpers}
    window.gate = {canOperate, canSave, requireOperate};
    window.setProject = p => { PROJ = p; };
  </script>`;
  const server = createServer((_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(browserOptions);
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.evaluate(() => setProject({id:'p1', permission:'read', locked:false}));
    assert.equal(await page.evaluate(() => gate.canOperate()), false);
    assert.equal(await page.evaluate(() => gate.canSave()), false);
    assert.equal(await page.evaluate(() => gate.requireOperate()), false);
    assert.match(await page.evaluate(() => lastToast), /只读/);
    await page.evaluate(() => setProject({id:'p2', permission:'operate', locked:false}));
    assert.equal(await page.evaluate(() => gate.canOperate()), true);
    assert.equal(await page.evaluate(() => gate.canSave()), true);
    await page.evaluate(() => setProject({id:'demo', permission:'operate', locked:true}));
    assert.equal(await page.evaluate(() => gate.canSave()), false);
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('collaborator cursor shows a readable member name', async () => {
  const html = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/style.css">
    <div id="presence-layer"></div><script>
      const el = {presenceLayer:document.getElementById('presence-layer')};
      let presenceSelf = 'self';
      ${presenceHelpers}
      ensurePresenceCursor({connection_id:'remote',user_id:'u2',name:'张三',visible:true});
    </script>`;
  const server = createServer((req, res) => {
    if (req.url === '/style.css') {
      res.setHeader('Content-Type', 'text/css'); return res.end(readFileSync(path.join(web, 'style.css')));
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(browserOptions);
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:' + server.address().port);
    const label = page.locator('.collab-cursor .label');
    assert.equal(await label.innerText(), '张三');
    const colors = await label.evaluate(node => ({
      background:getComputedStyle(node).backgroundColor,
      text:getComputedStyle(node.querySelector('span')).color,
    }));
    assert.notEqual(colors.background, colors.text);
    assert.notEqual(colors.background, 'rgb(7, 16, 28)');
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('canvas separates personal, shared and team spaces when creating projects', async () => {
  const projects = [
    {id:'p1', name:'个人画布', owner_id:'u1', owner_username:'alice', team_id:null, team_name:null, permission:'operate', cards:0, updated:3, locked:false, share_count:0, shared_team_ids:[], shared_personally:false},
    {id:'p2', name:'项目组画布', owner_id:'u2', owner_username:'bob', team_id:'t1', team_name:'项目一组', permission:'operate', cards:0, updated:2, locked:false},
    {id:'p3', name:'别人共享', owner_id:'u2', owner_username:'bob', owner_display_name:'鲍勃', team_id:null, team_name:null, permission:'read', cards:0, updated:1, locked:false},
    {id:'p5', name:'同名用户的画布', owner_id:'u3', owner_username:'another-bob', owner_display_name:'鲍勃', team_id:null, permission:'read', cards:0, updated:0.9},
    {id:'p6', name:'旧用户的画布', owner_id:'u4', owner_username:'legacy-account', owner_display_name:' ', team_id:null, permission:'read', cards:0, updated:0.8},
    {id:'p7', name:'鲍勃的第二张', owner_id:'u2', owner_username:'bob', owner_display_name:'鲍勃', team_id:null, permission:'operate', cards:0, updated:0.7},
    {id:'p8', name:'安全显示画布', owner_id:'u5', owner_username:'html-account', owner_display_name:'<img src=x onerror=alert(1)>', team_id:null, permission:'read', cards:0, updated:0.6},
  ];
  const teams = [{id:'t1', name:'项目一组', leader_id:'u2', leader_username:'bob', can_manage:false, members:[]}];
  const mutations = [], shareMutations = [];
  const server = createServer((req, res) => {
    if (req.url === '/api/auth/presence' && req.method === 'POST') {
      req.resume(); res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({online_users:1}));
    }
    if (req.url === '/api/projects/p1/shares' && req.method === 'GET') {
      res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({
        user_ids:[], team_ids:[], users:[{id:'u2',username:'bob',display_name:'鲍勃'}], teams:[{id:'t1',name:'项目一组'}],
      }));
    }
    if (req.url === '/api/projects/p1/shares' && req.method === 'PUT') {
      const chunks=[]; req.on('data',chunk=>chunks.push(chunk)); req.on('end',()=>{
        const body=JSON.parse(Buffer.concat(chunks).toString()); shareMutations.push({body,csrf:req.headers['x-csrf-token']});
        projects[0].share_count=body.user_ids.length+body.team_ids.length; projects[0].shared_team_ids=body.team_ids;
        res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(body));
      }); return;
    }
    if (req.method === 'POST' && req.url === '/api/projects') {
      const chunks = []; req.on('data', chunk => chunks.push(chunk)); req.on('end', () => {
        const body = JSON.parse(Buffer.concat(chunks).toString()); mutations.push({body, csrf:req.headers['x-csrf-token']});
        const project = {id:'p4', name:body.name, owner_id:'u1', owner_username:'alice', team_id:body.team_id, team_name:'项目一组', permission:'operate', cards:[], edges:[], groups:[], view:{}, rev:0, updated:4, locked:false};
        projects.unshift({...project, cards:0});
        res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(project));
      }); return;
    }
    const payloads = {
      '/api/auth/me': {user:{id:'u1', username:'alice', role:'user', team_leader:false}, csrf_token:'canvas-csrf'},
      '/api/cards': {cards:[], capabilities:{}, comfy_online:false},
      '/api/projects': {projects, teams},
      '/api/projects/p3': {...projects.find(project => project.id === 'p3'), cards:[], edges:[], groups:[], view:{}, rev:0},
      '/api/projects/p4': {id:'p4', name:'团队新画布', owner_id:'u1', owner_username:'alice', team_id:'t1', team_name:'项目一组', permission:'operate', cards:[], edges:[], groups:[], view:{}, rev:0, locked:false},
      '/api/health': {comfy_online:false, mode:'local'},
      '/api/jobs': {jobs:[]},
    };
    if (Object.hasOwn(payloads, req.url)) { res.setHeader('Content-Type','application/json; charset=utf-8'); return res.end(JSON.stringify(payloads[req.url])); }
    const files = {'/':'index.html','/app.js':'app.js','/auth.js':'auth.js','/style.css':'style.css','/favicon.png':'favicon.png','/icon.png':'icon.png'};
    const file = files[req.url]; if (!file) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8');
    res.end(readFileSync(path.join(web, file)));
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser = await chromium.launch(browserOptions); const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept('团队新画布'));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.waitForFunction(() => document.querySelectorAll('#plist .pitem').length === 1);
    assert.match(await page.locator('#plist').innerText(), /个人画布/);
    assert.deepEqual(await page.locator('#space-select option').allTextContents(), ['个人空间','共享给我的画布','项目一组']);
    await page.locator('#plist .pitem').filter({hasText:'个人画布'}).click({button:'right'});
    await page.getByRole('button',{name:/分享给个人或项目组/}).click();
    const shareDialog=page.locator('.project-share-dialog'); await shareDialog.waitFor();
    const shareTargets=shareDialog.locator('.share-target');
    assert.deepEqual(await shareTargets.locator('span').allTextContents(), ['bob（鲍勃）','项目一组']);
    const targetLayout=await shareTargets.evaluateAll(labels=>labels.map(label=>{
      const box=label.getBoundingClientRect(), input=label.querySelector('input').getBoundingClientRect();
      const text=label.querySelector('span').getBoundingClientRect();
      return {inputWidth:input.width, inputRight:input.right, textLeft:text.left, textRight:text.right, boxRight:box.right};
    }));
    for(const item of targetLayout) {
      assert.ok(item.inputWidth<=20,'checkbox must not consume the option row');
      assert.ok(item.textLeft>item.inputRight&&item.textRight<=item.boxRight,'share target name must remain visible beside its checkbox');
    }
    await shareDialog.locator('label').filter({hasText:'bob'}).locator('input').check();
    await shareDialog.locator('label').filter({hasText:'项目一组'}).locator('input').check();
    const shareResponse=page.waitForResponse(r=>r.url().endsWith('/api/projects/p1/shares')&&r.request().method()==='PUT');
    await shareDialog.getByRole('button',{name:'确定分享'}).click(); await shareResponse;
    await page.waitForFunction(()=>document.querySelector('#plist .pshare'));
    assert.deepEqual(shareMutations,[{body:{user_ids:['u2'],team_ids:['t1']},csrf:'canvas-csrf'}]);
    assert.match(await page.locator('#plist .pshare').getAttribute('title'),/已分享给 2 个/);
    assert.equal(await page.locator('#plist .powner').count(), 0, 'personal space stays flat');
    await page.locator('#space-select').selectOption('shared');
    await page.waitForFunction(() => document.querySelectorAll('#plist .powner').length === 4);
    assert.deepEqual(await page.locator('.powner-name').allTextContents(), ['鲍勃', '鲍勃', '未填写姓名', '<img src=x onerror=alert(1)>']);
    assert.deepEqual(await page.locator('.powner-count').allTextContents(), ['2', '1', '1', '1']);
    assert.equal(await page.locator('#plist img').count(), 0, 'display names are text, never HTML');
    assert.doesNotMatch(await page.locator('#plist').innerText(), /legacy-account|another-bob|html-account/);
    const bob = page.locator('.powner[data-owner-id="u2"]');
    assert.deepEqual(await bob.locator('.nm').allTextContents(), ['别人共享', '鲍勃的第二张']);
    assert.equal(await bob.locator('.pitem').first().locator('button').count(), 0, 'readonly operations stay hidden');
    assert.match(await bob.locator('.pitem').first().getAttribute('title'), /^鲍勃 · 只读$/);
    await bob.locator('summary').focus();
    await page.keyboard.press('Space');
    await page.waitForFunction(() => collapsedProjectOwners.has('u2'));
    assert.equal(await bob.locator('.pitem').first().isVisible(), false);
    await page.evaluate(() => loadProjects());
    assert.equal(await bob.getAttribute('open'), null, 'list refresh preserves collapsed owner groups');
    await bob.locator('summary').focus();
    await page.keyboard.press('Enter');
    await bob.locator('.pitem').first().waitFor({state:'visible'});
    await page.locator('#side').screenshot({path:path.resolve(__dirname, '..', '..', 'temp', 'chouka-shared-owner-groups.png')});
    await bob.locator('.pitem').first().click();
    await page.waitForFunction(() => PROJ?.id === 'p3');
    assert.equal(await page.evaluate(() => PROJ.permission), 'read');
    await page.locator('#space-select').selectOption('team:t1');
    await page.waitForFunction(() => document.querySelector('#plist')?.textContent.includes('项目组画布'));
    assert.equal(await page.locator('#plist .powner').count(), 0, 'team space stays flat');
    const response = page.waitForResponse(r => r.url().endsWith('/api/projects') && r.request().method() === 'POST');
    await page.locator('#newproj').click(); await response;
    await page.waitForFunction(() => document.querySelector('#ptitle')?.textContent.includes('团队新画布'));
    assert.deepEqual(mutations, [{body:{name:'团队新画布', team_id:'t1'}, csrf:'canvas-csrf'}]);
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
});

test('production permissions page renders account names as text and sends authorized mutations', async () => {
  const users = [
    {id:'u1', username:'<script>alert(1)</script>', display_name:'<img src=x onerror=alert(1)>', role:'admin', enabled:true, team_leader:false},
    {id:'u2', username:'alice', display_name:'张三', role:'user', enabled:false, team_leader:false},
    {id:'u3', username:'bob', display_name:' ', role:'user', enabled:true, team_leader:false},
  ];
  const mutations = [], assignments = [], grants = [];
  const payloads = {
    '/api/auth/me': {user:{id:'u1', username:'admin', role:'admin'}, csrf_token:'test-csrf'},
    '/api/admin/users': {users},
    '/api/admin/grants': {grants:[{viewer_id:'u2', owner_id:'u1', permission:'read'}]},
    '/api/projects': {projects:[{id:'p1', name:'待分配画布', owner_id:'u2', owner_username:'alice'},
      {id:'p2', name:'旧账号画布', owner_id:'old', owner_username:'legacy', owner_display_name:'历史姓名'}]},
    '/api/admin/registrations': {requests:[]},
  };
  const server = createServer((req, res) => {
    if ((req.method === 'POST' && req.url === '/api/admin/projects/assign')
        || (req.method === 'PUT' && req.url === '/api/admin/grants')) {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        const body = JSON.parse(Buffer.concat(chunks).toString());
        const record = {body, csrf:req.headers['x-csrf-token']};
        if (req.method === 'POST') {
          assignments.push(record);
          payloads['/api/projects'].projects[0].owner_id = body.owner_id;
        } else grants.push(record);
        res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({count:1}));
      });
      return;
    }
    if (req.method === 'PATCH' && req.url === '/api/admin/users/u2') {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        mutations.push({body:JSON.parse(Buffer.concat(chunks).toString()), csrf:req.headers['x-csrf-token']});
        res.setHeader('Content-Type', 'application/json'); res.end('{}');
      });
      return;
    }
    if (Object.hasOwn(payloads, req.url)) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify(payloads[req.url]));
    }
    const files = {'/':'permissions.html', '/auth.js':'auth.js', '/style.css':'style.css', '/favicon.png':'favicon.png'};
    const file = files[req.url];
    if (!file) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8');
    res.end(readFileSync(path.join(web, file)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(browserOptions);
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    const errors = [], dialogs = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.accept(); });
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.waitForFunction(() => document.querySelectorAll('#users tr').length === 3);
    assert.match(await page.locator('#users').innerText(), /<script>alert\(1\)<\/script>/);
    assert.equal(await page.locator('#users script').count(), 0);
    assert.equal(await page.locator('#grants tr').count(), 1);
    const adminLabel = '<script>alert(1)</script>（<img src=x onerror=alert(1)>）';
    for (const name of ['viewer_id', 'owner_id']) {
      assert.deepEqual(await page.locator(`#grant select[name="${name}"] option`).allTextContents(), [adminLabel, 'alice（张三）', 'bob']);
    }
    assert.deepEqual(await page.locator('#project-owner option').allTextContents(), ['全部所有者', 'alice（张三）', 'legacy（历史姓名）']);
    assert.deepEqual(await page.locator('#assign select option').allTextContents(), ['请选择目标用户', adminLabel, 'bob']);
    assert.match(await page.locator('#grants').innerText(), /alice（张三）/);
    assert.match(await page.locator('#projects').innerText(), /alice（张三）/);
    assert.equal(await page.locator('#grants img, #grants script, #projects img, #projects script').count(), 0);
    await page.locator('#grant select[name="viewer_id"]').selectOption('u2');
    await page.locator('#grant select[name="owner_id"]').selectOption('u3');
    const grantResponse = page.waitForResponse(r => r.request().method() === 'PUT');
    await page.getByRole('button', {name:'保存授权', exact:true}).click(); await grantResponse;
    assert.deepEqual(grants, [{body:{viewer_id:'u2', owner_id:'u3', permission:'read'}, csrf:'test-csrf'}]);
    await page.locator('#project-owner').selectOption('u2');
    await page.waitForFunction(() => document.querySelectorAll('#projects tr').length === 1);
    await page.locator('#projects input[type="checkbox"]').check();
    await page.locator('#assign select').selectOption('u1');
    const assignResponse = page.waitForResponse(r => r.url().endsWith('/projects/assign'));
    await page.locator('#assign-submit').click(); await assignResponse;
    await page.waitForFunction(() => document.querySelector('#assign-status').textContent.startsWith('分配成功'));
    assert.deepEqual(assignments, [{body:{owner_id:'u1', projects:[{project_id:'p1', owner_id:'u2'}]}, csrf:'test-csrf'}]);
    assert.match(dialogs[0], /旧归属：alice（张三）/);
    assert.ok(dialogs[0].includes('目标：' + adminLabel + '（ID: u1）'));
    assert.ok((await page.locator('#assign-status').textContent()).includes(adminLabel));
    assert.equal(await page.locator('#assign-status img, #assign-status script').count(), 0);
    const response = page.waitForResponse(r => r.request().method() === 'PATCH');
    await page.locator('#users tr').filter({hasText:'alice'}).getByRole('button', {name:'启用', exact:true}).click();
    await response;
    const leaderResponse = page.waitForResponse(r => r.request().method() === 'PATCH');
    await page.locator('#users tr').filter({hasText:'alice'}).getByRole('button', {name:'设为组长', exact:true}).click();
    await leaderResponse;
    assert.deepEqual(mutations, [
      {body:{enabled:true}, csrf:'test-csrf'},
      {body:{team_leader:true}, csrf:'test-csrf'},
    ]);
    assert.deepEqual(errors, []);
    assert.equal(dialogs.length, 2);
    assert.match(dialogs[1], /授予.*项目组/);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('team leader page selects multiple members and submits one atomic batch safely', async () => {
  const mutations = [];
  const leader = {id:'lead', username:'leader', display_name:'组长', enabled:true};
  const users = [leader,
    {id:'member', username:'<img src=x onerror=alert(1)>', display_name:'组员', enabled:true},
    {id:'member2', username:'zhangsan', display_name:'张三', enabled:true},
    {id:'member3', username:'lisi', display_name:'李四', enabled:true},
  ];
  const team = {id:'t1', name:'项目一组', leader_id:'lead', leader_username:'leader', can_manage:true, members:[leader]};
  const payloads = {
    '/api/auth/me': {user:{...leader, role:'user', team_leader:true}, csrf_token:'team-csrf'},
    '/api/teams': {teams:[team]},
    '/api/team-candidates': {users},
  };
  let finishBatch, batchReceived;
  const received = new Promise(resolve => { batchReceived = resolve; });
  const server = createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/auth/presence') {
      req.resume(); res.setHeader('Content-Type', 'application/json'); return res.end('{"online_users":1}');
    }
    if (req.method === 'POST' && req.url === '/api/teams/t1/members/batch') {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        const body = JSON.parse(Buffer.concat(chunks).toString());
        mutations.push({url:req.url, body, csrf:req.headers['x-csrf-token']});
        res.setHeader('Content-Type', 'application/json');
        if (mutations.length === 1) { res.writeHead(409); return res.end(JSON.stringify({error:'账号状态已变化，请重试'})); }
        finishBatch = () => {
          for (const id of body.user_ids) team.members.push(users.find(user => user.id === id));
          res.end(JSON.stringify({members:body.user_ids.map(user_id => ({team_id:team.id, user_id}))}));
        };
        batchReceived();
      });
      return;
    }
    if (Object.hasOwn(payloads, req.url)) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8'); return res.end(JSON.stringify(payloads[req.url]));
    }
    const files = {'/':'teams.html', '/auth.js':'auth.js', '/style.css':'style.css', '/favicon.png':'favicon.png', '/icon.png':'icon.png'};
    const file = files[req.url];
    if (!file) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8');
    res.end(readFileSync(path.join(web, file)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(browserOptions);
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.waitForFunction(() => document.querySelectorAll('.team-card').length === 1);
    assert.equal(await page.locator('.team-card img').count(), 0);
    const form = page.locator('.team-add-member');
    const options = form.locator('.team-member-option');
    const submit = form.getByRole('button', {name:/添加/});
    const all = form.getByRole('checkbox', {name:'全选', exact:true});
    assert.equal(await options.count(), 3, 'existing members are excluded');
    assert.equal(await options.first().textContent(), '<img src=x onerror=alert(1)>（组员）');
    assert.equal(await submit.isDisabled(), true);
    await all.check();
    assert.equal(await form.getByRole('status').textContent(), '已选 3 人');
    await all.uncheck();
    assert.equal(await submit.isDisabled(), true);
    await options.first().getByRole('checkbox').check();
    await options.nth(1).getByRole('checkbox').focus();
    await page.keyboard.press('Space');
    assert.equal(await all.evaluate(element => element.indeterminate), true);
    assert.equal(await form.getByRole('status').textContent(), '已选 2 人');
    const size = await options.first().boundingBox();
    assert.ok(size.height >= 44, 'checkbox rows have a 44px hit area');
    await page.screenshot({path:path.resolve(__dirname, '..', '..', 'temp', 'chouka-team-multiselect.png'), fullPage:true});
    let response = page.waitForResponse(r => r.url().endsWith('/members/batch'));
    await submit.click();
    assert.equal((await response).status(), 409);
    await form.getByRole('alert').waitFor({state:'visible'});
    assert.equal(await form.getByRole('alert').textContent(), '账号状态已变化，请重试');
    assert.equal(await form.locator('.team-member-option input:checked').count(), 2, 'failure preserves selections');
    assert.equal(await submit.isEnabled(), true);
    response = page.waitForResponse(r => r.url().endsWith('/members/batch'));
    response.catch(() => {});
    await submit.click(); await received;
    assert.equal(await form.getAttribute('aria-busy'), 'true');
    assert.equal(await submit.isDisabled(), true, 'batch cannot be submitted twice while pending');
    assert.equal(await form.locator('fieldset').evaluate(element => element.disabled), true);
    assert.equal(await options.first().getByRole('checkbox').isDisabled(), true);
    finishBatch(); await response;
    await page.waitForFunction(() => document.querySelectorAll('.team-card tbody tr').length === 3);
    const expected = {url:'/api/teams/t1/members/batch', body:{user_ids:['member', 'member2']}, csrf:'team-csrf'};
    assert.deepEqual(mutations, [expected, expected], 'each click sends one batch, not one request per member');
    assert.equal(await options.count(), 1, 'new members leave the candidate list');
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('.team-card tbody tr').length === 3);
    assert.equal(await options.count(), 1, 'members persist after a full reload');
    payloads['/api/team-candidates'].users = team.members;
    await page.reload();
    await form.getByText('暂无可添加的组员').waitFor();
    assert.equal(await submit.isDisabled(), true);
    assert.equal(await all.isDisabled(), true);
    team.can_manage = false;
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('.team-card').length === 1);
    assert.equal(await page.locator('.team-add-member').count(), 0, 'non-managers have no member picker');
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
});

test('workspace navigation keeps account actions at the bottom across pages and screen sizes', async () => {
  let user = {id:'admin-1', username:'admin-account', display_name:'张三', role:'admin'};
  let localTest = false;
  const mutations = [];
  const files = {'/':'index.html', '/director':'director.html', '/teams':'teams.html',
    '/controller':'controller.html', '/admin/permissions':'permissions.html', '/controller/costs':'costs.html', '/controller/capacity':'capacity.html',
    '/app.js':'app.js', '/auth.js':'auth.js', '/style.css':'style.css', '/director.js':'director.js',
    '/director.css':'director.css', '/director_edit.js':'director_edit.js', '/icon.png':'icon.png', '/favicon.png':'favicon.png'};
  const reply = (res, body, status = 200) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(body)); };
  const server = createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/api/auth/me') return reply(res, {user, csrf_token:'nav-csrf', local_test:localTest});
    if (pathname === '/api/auth/presence') { req.resume(); return reply(res, {online_users:7}); }
    if (pathname === '/api/auth/password' || pathname === '/api/auth/logout') {
      const chunks = []; req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        mutations.push({path:pathname, body:JSON.parse(Buffer.concat(chunks).toString() || '{}'), csrf:req.headers['x-csrf-token']});
        reply(res, pathname.endsWith('password') ? {error:'当前密码不正确'} : {ok:true}, pathname.endsWith('password') ? 400 : 200);
      }); return;
    }
    const payloads = {'/api/cards':{cards:[], capabilities:{}, comfy_online:false, director_schema:1},
      '/api/projects':{projects:[], teams:[]}, '/api/jobs':{jobs:[]}, '/api/health':{ok:true, mode:'controller', comfy_online:false},
      '/api/status':{running_count:0, queued_count:0}, '/api/workers':{workers:[]},
      '/api/admin/users':{users:[{...user, enabled:true}]}, '/api/admin/grants':{grants:[]}, '/api/admin/registrations':{requests:[]},
      '/api/costs':{overview:Object.fromEntries(['retail_min','retail_max','retail_mid','retail_known_tasks','retail_unknown_tasks','total_cost','actual_cost','estimated_cost','gpu_hours','electricity_cost','api_cost','failed_waste','unknown_cost_tasks','running_accrued','tasks','done','error','canceled'].map(key=>[key,0])), by_category:[], by_capability:[], by_worker:[], jobs:[], pricing_version:'test', currency:'CNY'},
      '/api/capacity':{overview:{}, workers:[], groups:[], details:[], details_total:0},
      '/api/teams':{teams:[]}, '/api/team-candidates':{users:[]}};
    if (Object.hasOwn(payloads, pathname)) return reply(res, payloads[pathname]);
    if (pathname === '/login') { res.setHeader('Content-Type','text/html'); return res.end('<h1>登录</h1>'); }
    const file = files[pathname];
    if (!file) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8');
    res.end(readFileSync(path.join(web, file)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(browserOptions);
    const page = await browser.newPage({viewport:{width:1440, height:900}});
    page.setDefaultTimeout(10000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const origin = 'http://127.0.0.1:' + server.address().port;
    await page.goto(origin);
    const trigger = page.locator('.account-trigger');
    await trigger.waitFor();
    const rail = page.locator('#workspace-nav');
    const brandName = page.locator('.workspace-brand > span');
    const canvasLink = page.getByRole('link', {name:'画布', exact:true});
    assert.equal(await trigger.locator('.account-avatar').textContent(), '张');
    assert.equal(await trigger.locator('.account-name').textContent(), '张三');
    assert.equal(await brandName.evaluate(el => getComputedStyle(el).opacity), '0');
    assert.equal((await rail.boundingBox()).width, 72, 'desktop starts with an icon-only rail');
    const mainBox = await page.locator('#main').boundingBox();
    const iconBox = await canvasLink.locator('svg').boundingBox();
    await page.screenshot({path:path.resolve(web, '..', '..', 'temp', 'chouka-workspace-nav-collapsed.png')});
    await rail.hover({position:{x:35, y:38}});
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.workspace-brand > span')).opacity === '1');
    assert.equal((await rail.boundingBox()).width, 184);
    assert.deepEqual(await page.locator('#main').boundingBox(), mainBox, 'hover expansion never shifts or resizes the canvas');
    assert.deepEqual(await canvasLink.locator('svg').boundingBox(), iconBox, 'navigation icons stay under the pointer');
    await page.screenshot({path:path.resolve(web, '..', '..', 'temp', 'chouka-workspace-nav-expanded.png')});
    await page.mouse.move(600, 80);
    assert.equal((await rail.boundingBox()).width, 72, 'leaving without focus collapses the rail');
    await canvasLink.focus();
    assert.equal((await rail.boundingBox()).width, 184, 'keyboard focus expands the rail without hover');
    await page.keyboard.press('Tab');
    assert.equal(await page.getByRole('link', {name:'导演工作台', exact:true}).evaluate(el => el === document.activeElement), true);
    await page.locator('#empty .big').click();
    assert.equal((await rail.boundingBox()).width, 72, 'returning to the canvas removes navigation focus');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await brandName.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    await page.emulateMedia({reducedMotion:'no-preference'});
    assert.equal(await page.locator('#topbar #account, #topbar #directorbtn').count(), 0);
    assert.deepEqual(await page.locator('.workspace-link').allTextContents(), ['画布', '导演工作台', '项目组', '运行面板', '账号与权限', '费用评估', '产能统计']);
    assert.deepEqual(await page.getByRole('group', {name:'工作区', exact:true}).locator('a').allTextContents(), ['画布', '导演工作台']);
    assert.deepEqual(await page.getByRole('group', {name:'管理', exact:true}).locator('a').allTextContents(), ['项目组', '运行面板', '账号与权限']);
    const statistics = page.getByRole('group', {name:'统计', exact:true});
    assert.deepEqual(await statistics.locator('a').allTextContents(), ['费用评估', '产能统计']);
    assert.deepEqual(await statistics.locator('a').evaluateAll(links => links.map(link => link.getAttribute('href'))), ['/controller/costs', '/controller/capacity']);
    assert.equal(await page.locator('.workspace-link[aria-current="page"]').getAttribute('href'), '/');
    await page.waitForFunction(() => document.querySelector('#online-count b').textContent === '7');
    assert.equal(await page.locator('#online-count').innerText(), '7 人使用中');
    assert.ok((await trigger.boundingBox()).y > 790, 'account is anchored at the bottom');
    await trigger.focus(); await page.keyboard.press('Enter');
    const menu = page.locator('#account-menu');
    await menu.waitFor({state:'visible'});
    assert.deepEqual(await menu.locator('button').allTextContents(), ['用户信息', '修改密码', '退出登录']);
    await page.mouse.move(600, 80);
    assert.equal((await rail.boundingBox()).width, 184, 'open account actions keep their anchor expanded');
    await page.keyboard.press('Tab');
    assert.equal(await menu.getByRole('button', {name:'用户信息', exact:true}).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Escape');
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
    await trigger.click(); await page.locator('#empty .big').click();
    assert.equal(await menu.isVisible(), false, 'click outside closes the account popover');
    await trigger.click(); await menu.getByRole('button', {name:'用户信息', exact:true}).click();
    const info = page.getByRole('dialog', {name:'用户信息', exact:true});
    assert.deepEqual(await info.locator('dd').allTextContents(), ['张三', 'admin-account', '管理员', 'admin-1']);
    await page.keyboard.press('Escape');
    await page.locator('.auth-dialog').waitFor({state:'detached'});
    assert.equal(await page.locator('.auth-dialog').count(), 0);
    assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
    await trigger.click(); await menu.getByRole('button', {name:'修改密码', exact:true}).click();
    const password = page.getByRole('dialog', {name:'修改密码', exact:true});
    await password.locator('[name="current_password"]').fill('old-password');
    await password.locator('[name="new_password"]').fill('new-password');
    await password.locator('[name="confirm_password"]').fill('not-the-same');
    await password.getByRole('button', {name:'保存', exact:true}).click();
    assert.equal(await password.getByRole('alert').textContent(), '两次输入的新密码不一致');
    assert.equal(mutations.length, 0);
    await password.locator('[name="confirm_password"]').fill('new-password');
    await password.getByRole('button', {name:'保存', exact:true}).click();
    await page.waitForFunction(() => document.querySelector('.auth-dialog [role="alert"]').textContent === '当前密码不正确');
    assert.deepEqual(mutations, [{path:'/api/auth/password', body:{current_password:'old-password', new_password:'new-password'}, csrf:'nav-csrf'}]);
    assert.equal(await password.locator('[name="new_password"]').inputValue(), 'new-password');
    await password.getByRole('button', {name:'取消', exact:true}).click();
    await trigger.click();
    await page.screenshot({path:path.resolve(web, '..', '..', 'temp', 'chouka-workspace-nav-desktop.png')});
    await page.keyboard.press('Escape');
    await page.locator('#toggle').click();
    assert.equal(await trigger.isVisible(), true, 'collapsing projects never hides account or navigation');
    await page.setViewportSize({width:375, height:812}); await page.reload();
    await trigger.waitFor();
    assert.equal(await page.locator('#toggle').getAttribute('aria-expanded'), 'false');
    assert.ok((await page.locator('#main').boundingBox()).width >= 300);
    await trigger.click();
    const box = await menu.boundingBox();
    assert.ok(box.x >= 8 && box.x + box.width <= 375 && box.y >= 0 && box.y + box.height <= 812);
    await page.screenshot({path:path.resolve(web, '..', '..', 'temp', 'chouka-workspace-nav-mobile.png')});
    await page.keyboard.press('Escape');
    await page.locator('#empty .big').click();
    await page.locator('#toggle').click();
    assert.equal(await page.locator('#side').isVisible(), true);
    await page.locator('#toggle').click();
    await page.getByRole('link', {name:'导演工作台', exact:true}).click();
    await page.waitForURL('**/director'); await trigger.waitFor();
    assert.equal(await page.locator('.workspace-link[aria-current="page"]').getAttribute('href'), '/director');
    assert.equal(await page.locator('.sidebar [data-stage]').count(), 5, 'director workflow remains separate from site navigation');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.setViewportSize({width:1440, height:900});
    await page.screenshot({path:path.resolve(web, '..', '..', 'temp', 'chouka-workspace-nav-director.png')});
    await page.getByRole('link', {name:'项目组', exact:true}).click();
    await page.waitForURL('**/teams'); await trigger.waitFor();
    assert.equal(await page.locator('.workspace-link[aria-current="page"]').getAttribute('href'), '/teams');
    await page.setViewportSize({width:375, height:812});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    for (const [label, route, key] of [['运行面板','/controller','controller'], ['账号与权限','/admin/permissions','permissions'], ['费用评估','/controller/costs','costs'], ['产能统计','/controller/capacity','capacity']]) {
      await page.locator('#workspace-nav').getByRole('link', {name:label, exact:true}).click();
      await page.waitForURL(origin + route); await trigger.waitFor();
      assert.equal(await page.locator('body').getAttribute('data-workspace'), key);
      assert.equal(await page.locator('.workspace-link[aria-current="page"]').getAttribute('href'), route);
      assert.equal(await page.locator('#account').count(), 1);
      assert.equal(await page.locator('#workspace-nav .workspace-footer #account').count(), 1);
      assert.equal(await page.locator('header a, header #account').count(), 0, 'page headers no longer create separate navigation or account areas');
      await page.waitForFunction(() => document.querySelector('.workspace-presence b').textContent === '7');
      for (const width of [375, 1440]) {
        await page.setViewportSize({width, height:900});
        await page.mouse.move(width - 10, 70);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, route + ' fits ' + width + 'px');
        assert.equal((await rail.boundingBox()).width, 72);
        assert.ok((await trigger.boundingBox()).y > 790);
      }
      await trigger.click(); await menu.getByRole('button', {name:'用户信息', exact:true}).click();
      assert.deepEqual(await page.getByRole('dialog', {name:'用户信息', exact:true}).locator('dd').allTextContents(), ['张三','admin-account','管理员','admin-1']);
      await page.keyboard.press('Escape'); await page.locator('.auth-dialog').waitFor({state:'detached'});
      assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
      if (key === 'controller' || key === 'costs' || key === 'capacity') {
        await page.getByRole('button', {name:'立即刷新', exact:true}).click();
        await page.waitForFunction(() => /最后刷新|更新于/.test(document.querySelector('#refresh-state').textContent));
      }
      assert.equal(await page.locator('#error').innerText(), '');
      await page.mouse.move(20, 38);
      await page.screenshot({path:path.resolve(web, '..', '..', 'temp', 'chouka-workspace-' + key + '.png')});
      assert.equal(page.context().pages().length, 1, 'workspace links stay in the current tab');
    }
    await page.getByRole('link', {name:'画布', exact:true}).click();
    await page.waitForURL(origin + '/'); await trigger.waitFor();
    await page.goBack(); await trigger.waitFor();
    assert.equal(await page.locator('.workspace-link[aria-current="page"]').getAttribute('href'), '/controller/capacity');
    const touch = await browser.newPage({viewport:{width:375, height:812}, hasTouch:true, isMobile:true});
    try {
      touch.on('pageerror', error => errors.push(error.message));
      await touch.goto(origin); await touch.locator('.account-trigger').waitFor();
      assert.equal(await touch.evaluate(() => matchMedia('(hover: hover)').matches), false);
      assert.equal((await touch.locator('#workspace-nav').boundingBox()).width, 72);
      await touch.locator('.account-trigger').tap();
      await touch.locator('#account-menu').waitFor({state:'visible'});
      const touchMenu = await touch.locator('#account-menu').boundingBox();
      assert.ok(touchMenu.x >= 8 && touchMenu.x + touchMenu.width <= 375);
      await touch.getByRole('button', {name:'用户信息', exact:true}).tap();
      await touch.getByRole('dialog', {name:'用户信息', exact:true}).waitFor();
      await touch.getByRole('button', {name:'关闭', exact:true}).tap();
      await touch.locator('.auth-dialog').waitFor({state:'detached'});
      await touch.locator('#empty .big').tap();
      assert.equal((await touch.locator('#workspace-nav').boundingBox()).width, 72);
      await touch.getByRole('link', {name:'导演工作台', exact:true}).tap();
      await touch.waitForURL('**/director');
      await touch.locator('.workspace-link[aria-current="page"][href="/director"]').waitFor();
      assert.equal(await touch.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    } finally { await touch.close(); }
    user = {...user, role:'user', team_leader:true};
    await page.goto(origin); await trigger.waitFor();
    assert.deepEqual(await page.locator('.workspace-link').allTextContents(), ['画布', '导演工作台', '项目组']);
    assert.equal(await page.getByRole('group', {name:'统计', exact:true}).count(), 0);
    assert.deepEqual(await page.getByRole('group', {name:'管理', exact:true}).locator('a').allTextContents(), ['项目组']);
    user = {...user, team_leader:false, display_name:'<img src=x onerror=alert(1)>'};
    await page.goto(origin); await trigger.waitFor();
    assert.deepEqual(await page.locator('.workspace-link').allTextContents(), ['画布', '导演工作台']);
    assert.equal(await trigger.locator('img').count(), 0, 'names are never parsed as HTML');
    localTest = true; await page.reload();
    await page.getByText('本地测试 · 免登录', {exact:true}).waitFor();
    assert.equal(await trigger.count(), 0, 'local testing stays login-free');
    localTest = false; await page.reload(); await trigger.click();
    await menu.getByRole('button', {name:'退出登录', exact:true}).click();
    await page.waitForURL('**/login');
    assert.deepEqual(mutations.at(-1), {path:'/api/auth/logout', body:{}, csrf:'nav-csrf'});
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
});

test('global maintenance banner stays for outages and briefly reports partial maintenance', async () => {
  let maintenanceActive = true, comfyOnline = false, stallHealth = false, healthRequests = 0;
  const session = {user:{id:'u1', username:'viewer', role:'user'}, csrf_token:'test-csrf'};
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/auth.js') {
      res.setHeader('Content-Type', 'text/javascript'); return res.end(readFileSync(path.join(web, 'auth.js')));
    }
    if (url.pathname === '/api/auth/me') {
      res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(session));
    }
    if (url.pathname === '/api/auth/presence') {
      req.resume(); res.setHeader('Content-Type', 'application/json'); return res.end('{"online_users":1}');
    }
    if (url.pathname === '/api/health') {
      healthRequests++;
      if (stallHealth) return;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ok:true, comfy_online:comfyOnline, maintenance_active:maintenanceActive}));
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><meta charset="utf-8"><title>维护提示测试</title><script src="/auth.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(browserOptions);
    const page = await browser.newPage({viewport:{width:1280, height:720}});
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port + '/');
    await page.evaluate(() => H3Auth.requireUser());
    const banner = page.locator('#maintenance-banner');
    await banner.waitFor({state:'visible'});
    const visual = await banner.evaluate(element => {
      const style = getComputedStyle(element);
      const icon = element.querySelector('.maintenance-banner-icon').getBoundingClientRect();
      const ticker = element.querySelector('.maintenance-banner-ticker').getBoundingClientRect();
      return {
        position:style.position, top:style.top, background:style.backgroundColor,
        role:element.getAttribute('role'), live:element.getAttribute('aria-live'),
        iconBeforeMessage:icon.right <= ticker.left,
        animation:getComputedStyle(element.querySelector('.maintenance-banner-track')).animationName,
      };
    });
    assert.equal(visual.position, 'fixed'); assert.equal(visual.top, '0px');
    assert.equal(visual.background, 'rgb(185, 28, 28)');
    assert.deepEqual([visual.role, visual.live], ['status', 'polite']);
    assert.equal(visual.iconBeforeMessage, true); assert.notEqual(visual.animation, 'none');
    assert.equal(await banner.locator('.maintenance-banner-message').first().textContent(), '系统正在维护更新，当前暂无可用执行节点，请稍后再使用。');
    assert.equal(await banner.locator('svg').count(), 1);
    await page.screenshot({path:path.resolve(web, '..', '..', 'temp', 'chouka-maintenance-banner.png')});

    comfyOnline = true;
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await banner.waitFor({state:'visible'});
    assert.equal(await banner.locator('.maintenance-banner-message').first().textContent(), '部分节点正在维护更新，其他可用节点仍可正常使用。');
    await banner.waitFor({state:'hidden', timeout:7000});
    const repeatedHealth = page.waitForResponse(response => response.url().endsWith('/api/health'));
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await repeatedHealth;
    assert.equal(await banner.isHidden(), true, '同一轮部分维护不应每次轮询都重复提示');

    comfyOnline = false;
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await banner.waitFor({state:'visible'});
    assert.equal(await banner.locator('.maintenance-banner-message').first().textContent(), '系统正在维护更新，当前暂无可用执行节点，请稍后再使用。');

    maintenanceActive = false;
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await banner.waitFor({state:'hidden'});
    maintenanceActive = true;
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await banner.waitFor({state:'visible'});
    await page.setViewportSize({width:320, height:740});
    await page.emulateMedia({reducedMotion:'reduce'});
    const reduced = await banner.locator('.maintenance-banner-message').first().evaluate(element => {
      const style = getComputedStyle(element);
      return {
        animation:getComputedStyle(element.parentElement).animationName,
        whiteSpace:style.whiteSpace, textOverflow:style.textOverflow,
        fullWidth:element.scrollWidth <= element.clientWidth,
        fullHeight:element.scrollHeight <= element.clientHeight,
      };
    });
    assert.deepEqual(reduced, {
      animation:'none', whiteSpace:'normal', textOverflow:'clip',
      fullWidth:true, fullHeight:true,
    });

    stallHealth = true;
    const requestsBeforeStall = healthRequests;
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    for (let index = 0; index < 50 && healthRequests === requestsBeforeStall; index++) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.ok(healthRequests > requestsBeforeStall, '悬挂探针必须已经发出');
    maintenanceActive = false; stallHealth = false;
    await page.waitForTimeout(4200);
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await banner.waitFor({state:'hidden'});
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('real auth client expires protected sessions and allows a subsequent anonymous login', async () => {
  let expired = false;
  const session = {user:{id:'u1', username:'admin', role:'admin'}, csrf_token:'test-csrf'};
  const server = createServer((req, res) => {
    if (req.url === '/auth.js') {
      res.setHeader('Content-Type', 'text/javascript'); return res.end(readFileSync(path.join(web, 'auth.js')));
    }
    if (req.url === '/api/auth/me' || req.url === '/api/auth/login') {
      req.resume();
      res.setHeader('Content-Type', 'application/json');
      if (expired && req.url === '/api/auth/me') { res.statusCode = 401; return res.end('{"error":"expired"}'); }
      return res.end(JSON.stringify(session));
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<script src="/auth.js"></script><script>window.expirations=0;addEventListener("h3auth:expired",()=>expirations++);</script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(browserOptions);
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:' + server.address().port + '/login');
    await page.evaluate(() => H3Auth.me());
    assert.equal(await page.evaluate(() => H3Auth.active), true);
    expired = true;
    const state = await page.evaluate(async () => {
      const error = await H3Auth.me().catch(e => e.message);
      return {error, active:H3Auth.active, expirations};
    });
    assert.deepEqual(state, {error:'expired', active:false, expirations:1});
    await page.evaluate(() => H3Auth.login('admin', 'test-password'));
    assert.equal(await page.evaluate(() => H3Auth.active), true);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
