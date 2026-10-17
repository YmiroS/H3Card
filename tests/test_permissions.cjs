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
    ...['style', 'auth-page', 'director', 'admin-shell'].map(name => [`/${name}.css`, [`${name}.css`, 'text/css']]),
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
      // 管理页由真实会话动态挂载唯一品牌；静态画布、登录和导演页保留上游品牌。
      const expected = ['index', 'login'].includes(name) ? 1 : name === 'director' ? 2 : 0;
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
      '/api/health': {comfy_online:false, mode:'local', maintenance_active:false},
      '/api/jobs': {jobs:[]},
    };
    if (Object.hasOwn(payloads, req.url)) { res.setHeader('Content-Type','application/json; charset=utf-8'); return res.end(JSON.stringify(payloads[req.url])); }
    const files = {'/':'index.html','/app.js':'app.js','/auth.js':'auth.js','/style.css':'style.css','/icon.png':'icon.png', '/favicon.png':'favicon.png'};
    const file = files[new URL(req.url, 'http://localhost').pathname]; if (!file) { res.writeHead(404); return res.end(); }
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
  const mutations = [], assignments = [], grants = [], unexpected = [], external = [];
  const payloads = {
    '/api/auth/me': {user:{id:'u1', username:'admin', role:'admin'}, csrf_token:'test-csrf'},
    '/api/admin/users': {users},
    '/api/admin/grants': {grants:[{viewer_id:'u2', owner_id:'u1', permission:'read'}]},
    '/api/projects': {projects:[{id:'p1', name:'待分配画布', owner_id:'u2', owner_username:'alice'},
      {id:'p2', name:'旧账号画布', owner_id:'old', owner_username:'legacy', owner_display_name:'历史姓名'}]},
    '/api/admin/registrations': {requests:[]},
    '/api/health': {ok:true, mode:'controller', maintenance_active:false},
  };
  const server = createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/auth/presence') {
      assert.equal(req.headers['x-csrf-token'], 'test-csrf');
      req.resume(); res.setHeader('Content-Type', 'application/json'); return res.end('{"online_users":1}');
    }
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
    if (req.method === 'GET' && Object.hasOwn(payloads, req.url)) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify(payloads[req.url]));
    }
    const files = {'/':'permissions.html', '/auth.js':'auth.js', '/style.css':'style.css', '/admin-shell.js':'admin-shell.js', '/admin-shell.css':'admin-shell.css', '/icon.png':'icon.png', '/favicon.png':'favicon.png'};
    const file = req.method === 'GET' && files[new URL(req.url, 'http://localhost').pathname];
    if (!file) { unexpected.push(req.method + ' ' + req.url); req.resume(); res.writeHead(404); return res.end(); }
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
    const origin = 'http://127.0.0.1:' + server.address().port;
    await page.context().route('**/*', route => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      external.push(route.request().url()); return route.abort();
    });
    await page.context().routeWebSocket('**/*', socket => { external.push(socket.url()); socket.close(); });
    await page.goto(origin);
    await page.waitForFunction(() => document.querySelectorAll('#users tr').length === 3);
    assert.match(await page.locator('#users').innerText(), /<script>alert\(1\)<\/script>/);
    assert.equal(await page.locator('#users script, #users img').count(), 0);
    assert.match(await page.locator('#users').innerText(), /<img src=x onerror=alert\(1\)>/);
    assert.equal(await page.locator('#grants tr').count(), 1);
    const adminLabel = '<script>alert(1)</script>（<img src=x onerror=alert(1)>）';
    // 完整ID可保留在选项尾部或辅助信息，用户名与姓名的上游格式必须完全一致。
    const optionNames = locator => locator.evaluateAll(options => options.map(option => option.textContent.replace(/（ID: [^）]*）$/, '')));
    for (const name of ['viewer_id', 'owner_id']) {
      assert.deepEqual(await optionNames(page.locator(`#grant select[name="${name}"] option`)), ['请选择账号', adminLabel, 'alice（张三）', 'bob']);
    }
    assert.deepEqual(await optionNames(page.locator('#project-owner option')), ['全部所有者', 'alice（张三）', 'legacy（历史姓名）']);
    assert.deepEqual(await optionNames(page.locator('#assign select option')), ['请选择目标账号', adminLabel, 'bob']);
    assert.match(await page.locator('#grants').innerText(), /alice（张三）/);
    assert.match(await page.locator('#projects').innerText(), /alice（张三）/);
    assert.equal(await page.locator('#grants img, #grants script, #projects img, #projects script').count(), 0);
    await page.locator('#grant select[name="viewer_id"]').selectOption('u2');
    await page.locator('#grant select[name="owner_id"]').selectOption('u3');
    const grantResponse = page.waitForResponse(r => r.request().method() === 'PUT');
    await page.getByRole('button', {name:'保存授权', exact:true}).click();
    let dialog = page.getByRole('dialog');
    assert.match(await dialog.innerText(), /alice（张三）/);
    assert.equal(grants.length, 0, '只有确认保存才能发起授权写入');
    await dialog.getByRole('button', {name:'确认保存授权', exact:true}).click(); await grantResponse;
    await dialog.waitFor({state:'detached'});
    assert.deepEqual(grants, [{body:{viewer_id:'u2', owner_id:'u3', permission:'read'}, csrf:'test-csrf'}]);
    await page.locator('#project-owner').selectOption('u2');
    await page.waitForFunction(() => document.querySelectorAll('#projects tr').length === 1);
    await page.locator('#projects input[type="checkbox"]').check();
    await page.locator('#assign select').selectOption('u1');
    const assignResponse = page.waitForResponse(r => r.url().endsWith('/projects/assign'));
    await page.locator('#assign-submit').click(); dialog = page.getByRole('dialog');
    const assignmentText = await dialog.innerText();
    assert.match(assignmentText, /alice（张三）/);
    assert.ok(assignmentText.includes(adminLabel));
    assert.match(assignmentText, /ID: u1/); assert.match(assignmentText, /ID: u2/);
    assert.equal(await dialog.locator('img, script').count(), 0, '分配确认仍安全转义姓名及用户名');
    assert.equal(assignments.length, 0);
    await dialog.getByRole('button', {name:'确认分配所列画布', exact:true}).click(); await assignResponse;
    await dialog.waitFor({state:'detached'});
    assert.deepEqual(assignments, [{body:{owner_id:'u1', projects:[{project_id:'p1', owner_id:'u2'}]}, csrf:'test-csrf'}]);
    assert.ok((await page.locator('#assign-status').textContent()).includes(adminLabel));
    assert.equal(await page.locator('#assign-status img, #assign-status script').count(), 0);
    const response = page.waitForResponse(r => r.request().method() === 'PATCH');
    await page.locator('#users tr').filter({hasText:'alice'}).getByRole('button', {name:'启用', exact:true}).click();
    const enableDialog = page.getByRole('dialog');
    assert.match(await enableDialog.innerText(), /审批状态保持不变/);
    await enableDialog.getByRole('button', {name:'确认启用账号', exact:true}).click();
    await response; await enableDialog.waitFor({state:'detached'});
    const leaderResponse = page.waitForResponse(r => r.request().method() === 'PATCH');
    await page.locator('#users tr').filter({hasText:'alice'}).getByRole('button', {name:'设为组长', exact:true}).click();
    const leaderDialog = page.getByRole('dialog');
    assert.match(await leaderDialog.innerText(), /授予.*项目组/);
    await leaderDialog.getByRole('button', {name:'确认授予组长权限', exact:true}).click();
    await leaderResponse; await leaderDialog.waitFor({state:'detached'});
    assert.deepEqual(mutations, [
      {body:{enabled:true}, csrf:'test-csrf'},
      {body:{team_leader:true}, csrf:'test-csrf'},
    ]);
    assert.deepEqual(errors, []);
    assert.equal(dialogs.length, 0, '所有确认使用有焦点管理的页面弹窗，不使用原生 confirm');
    assert.equal(await page.getByRole('columnheader', {name:'独立组长权限', exact:true}).count(), 1);
    assert.equal(await page.locator('#workspace-nav[data-admin-sidebar]').count(), 1);
    assert.equal(await page.locator('#account.account-bar .account-trigger').count(), 1);
    assert.equal(await page.locator('.sidebar, .side-actions, .admin-mobile-account').count(), 0);
    assert.deepEqual(unexpected, [], '除了明确声明的授权、分配和账号操作不得发额外请求');
    assert.deepEqual(external, [], '不得HTTP或WebSocket外联');
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
    '/api/health': {ok:true, mode:'controller', maintenance_active:false},
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
    const files = {'/':'teams.html', '/auth.js':'auth.js', '/style.css':'style.css', '/admin-shell.js':'admin-shell.js', '/admin-shell.css':'admin-shell.css', '/icon.png':'icon.png', '/favicon.png':'favicon.png'};
    const file = files[new URL(req.url, 'http://localhost').pathname];
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
    await page.locator('.team-picker > summary').click();
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
    const dialog = page.getByRole('dialog');
    assert.equal(await dialog.locator('img').count(), 0, '确认明细中的用户名仍为纯文本');
    await dialog.getByRole('button', {name:'确认添加组员', exact:true}).click();
    assert.equal((await response).status(), 409);
    assert.match(await dialog.getByRole('alert').innerText(), /账号状态已变化/);
    await dialog.getByRole('button', {name:'取消', exact:true}).click();
    await form.getByRole('alert').waitFor({state:'visible'});
    assert.equal(await form.getByRole('alert').textContent(), '账号状态已变化，请重试');
    assert.equal(await form.locator('.team-member-option input:checked').count(), 2, 'failure preserves selections');
    assert.equal(await submit.isEnabled(), true);
    response = page.waitForResponse(r => r.url().endsWith('/members/batch'));
    response.catch(() => {});
    await submit.click();
    await page.getByRole('dialog').getByRole('button', {name:'确认添加组员', exact:true}).click(); await received;
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
    await page.locator('.team-picker > summary').click();
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

test('team creation and removal preserve failures and honor server can_manage even for admins', async () => {
  const unsafe = '<img src=x onerror=alert(1)>', mutations = [], errors = [];
  const leader = {id:'lead', username:'leader', display_name:'组长', enabled:true};
  const member = {id:'member', username:unsafe, display_name:unsafe, enabled:true};
  const team = {id:'t1', name:unsafe, leader_id:'lead', leader_username:'leader', can_manage:true, members:[leader, member]};
  const teams = [team]; let failedCreate = false, failedRemove = false, candidateFailure = false;
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost').pathname;
    if (url.startsWith('/api/') && req.method !== 'GET') {
      const chunks=[]; req.on('data', chunk => chunks.push(chunk)); req.on('end', () => {
        const raw=Buffer.concat(chunks).toString(), body=raw ? JSON.parse(raw) : {};
        res.setHeader('Content-Type','application/json');
        if (url === '/api/auth/presence') return res.end('{"online_users":1}');
        mutations.push({url, method:req.method, body, csrf:req.headers['x-csrf-token']});
        if (url === '/api/teams') {
          if (!failedCreate) { failedCreate=true; res.writeHead(409); return res.end('{"error":"暂时无法创建"}'); }
          teams.push({id:'t2',name:body.name,leader_id:'lead',leader_username:'leader',can_manage:true,members:[leader]});
          return res.end('{"ok":true}');
        }
        if (url === '/api/teams/t1/members/member' && req.method === 'DELETE') {
          if (!failedRemove) { failedRemove=true; res.writeHead(409); return res.end('{"error":"成员状态已变化"}'); }
          team.members=[leader]; return res.end('{"ok":true}');
        }
        res.writeHead(404); res.end('{"error":"未知接口"}');
      }); return;
    }
    if (url === '/api/team-candidates' && candidateFailure) { res.writeHead(503,{'Content-Type':'application/json'}); return res.end('{"error":"候选查询不可用"}'); }
    const payloads = {'/api/auth/me':{user:{...leader,role:'admin',team_leader:false},csrf_token:'team-actions-csrf'},'/api/teams':{teams},'/api/team-candidates':{users:[leader,member]},'/api/health':{ok:true,mode:'controller',maintenance_active:false}};
    if (Object.hasOwn(payloads,url)) { res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify(payloads[url])); }
    const files={'/':'teams.html','/auth.js':'auth.js','/admin-shell.js':'admin-shell.js','/admin-shell.css':'admin-shell.css','/icon.png':'icon.png', '/favicon.png':'favicon.png'};
    const file=files[url]; if(!file){res.writeHead(404);return res.end();}
    res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html; charset=utf-8');
    res.end(readFileSync(path.join(web,file)));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve)); let browser;
  try {
    browser=await chromium.launch(browserOptions); const page=await browser.newPage({viewport:{width:1440,height:1000}});
    page.on('pageerror',error=>errors.push(error.message)); await page.goto('http://127.0.0.1:'+server.address().port);
    await page.waitForFunction(()=>document.querySelectorAll('.team-card tbody tr').length===2);
    assert.equal(await page.locator('.team-card img').count(),0); assert.equal(await page.locator('.team-card button').filter({hasText:'移除'}).count(),1,'组长没有移除按钮');
    for(const width of [1440,390]) { await page.setViewportSize({width,height:900}); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true); }
    await page.setViewportSize({width:1440,height:1000});
    const source=page.locator('#create-team'); await source.locator('[name=name]').fill(unsafe);
    await source.getByRole('button',{name:'创建项目组',exact:true}).click(); let dialog=page.getByRole('dialog');
    assert.equal(await dialog.locator('img').count(),0);
    await dialog.getByRole('button',{name:'确认创建项目组',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('dialog [role=alert]')?.textContent.includes('暂时无法创建'));
    assert.equal(await source.locator('[name=name]').inputValue(),unsafe);
    await dialog.getByRole('button',{name:'取消',exact:true}).click(); await page.locator('dialog').waitFor({state:'detached'});
    await source.getByRole('button',{name:'创建项目组',exact:true}).click(); dialog=page.getByRole('dialog');
    await dialog.getByRole('button',{name:'确认创建项目组',exact:true}).click(); await page.locator('dialog').waitFor({state:'detached'});
    assert.equal(await source.locator('[name=name]').inputValue(),''); assert.equal(await page.locator('.team-card').count(),2);
    const originalTeam=page.locator('.team-card').first(); await originalTeam.getByRole('button',{name:'移除',exact:true}).click(); dialog=page.getByRole('dialog');
    assert.equal(await dialog.locator('img').count(),0); assert.match(await dialog.innerText(),/立即失去本组画布、任务和素材/);
    await dialog.getByRole('button',{name:'确认移除组员',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('dialog [role=alert]')?.textContent.includes('成员状态已变化'));
    assert.equal(await originalTeam.locator('tbody tr').count(),2);
    await dialog.getByRole('button',{name:'确认移除组员',exact:true}).click(); await page.locator('dialog').waitFor({state:'detached'});
    assert.equal(await originalTeam.locator('tbody tr').count(),1);
    candidateFailure=true; await page.reload(); await page.waitForFunction(()=>document.getElementById('error').textContent.includes('候选账号加载失败'));
    assert.equal(await page.locator('.team-card').count(),2,'候选查询失败不能隐藏已有项目组');
    await page.locator('.team-picker>summary').first().click();
    assert.equal(await page.locator('.team-add-member').first().getByRole('button').isDisabled(),true);
    candidateFailure=false; team.can_manage=false; await page.reload(); await page.waitForFunction(()=>document.querySelectorAll('.team-card').length===2);
    assert.equal(await originalTeam.locator('.team-add-member').count(),0,'管理员视角也不得覆盖服务器 can_manage=false');
    assert.equal(await originalTeam.getByRole('button',{name:'移除',exact:true}).count(),0); assert.match(await originalTeam.innerText(),/只读/);
    assert.deepEqual(mutations.map(item=>({url:item.url,method:item.method})),[
      {url:'/api/teams',method:'POST'},{url:'/api/teams',method:'POST'},
      {url:'/api/teams/t1/members/member',method:'DELETE'},{url:'/api/teams/t1/members/member',method:'DELETE'},
    ]);
    assert.ok(mutations.every(item=>item.csrf==='team-actions-csrf')); assert.deepEqual(errors,[]);
  } finally { if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve)); }
});

test('permissions dialogs preserve failed inputs, clear passwords and confirm real grant and assignment payloads', async () => {
  const unsafeName = '<img src=x onerror=alert(1)>';
  const users = [
    {id:'admin', username:'admin', display_name:'管理员', role:'admin', enabled:true, team_leader:false, approval_status:'approved'},
    {id:'owner', username:unsafeName, display_name:'原所有者', role:'user', enabled:true, team_leader:false, approval_status:'approved'},
    {id:'viewer', username:'viewer', role:'user', enabled:true, team_leader:false, approval_status:'approved'},
    {id:'disabled', username:'disabled', role:'user', enabled:false, team_leader:false, approval_status:'approved'},
  ];
  const projects = [
    {id:'p1', name:'<svg onload=alert(1)>', owner_id:'owner', owner_username:unsafeName, team_id:null},
    {id:'p2', name:'第二张个人画布', owner_id:'owner', owner_username:unsafeName, team_id:null},
    {id:'pt', name:'组内画布', owner_id:'owner', owner_username:unsafeName, team_id:'t1', team_name:'制作组'},
  ];
  const grants = [], mutations = [], errors = [];
  let createFailed = false, resetFailed = false, assignFailed = false, failNextUsersRead = false, finishCreate, createReceived;
  const receivedCreate = new Promise(resolve => { createReceived = resolve; });
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost').pathname;
    if (url.startsWith('/api/') && req.method !== 'GET') {
      const chunks = []; req.on('data', chunk => chunks.push(chunk)); req.on('end', () => {
        const text = Buffer.concat(chunks).toString(), body = text ? JSON.parse(text) : {};
        res.setHeader('Content-Type', 'application/json');
        if (url === '/api/auth/presence') return res.end('{"online_users":1}');
        mutations.push({url, method:req.method, body, csrf:req.headers['x-csrf-token']});
        if (url === '/api/admin/users' && req.method === 'POST') {
          if (!createFailed) { createFailed = true; res.writeHead(409); return res.end('{"error":"账号名已存在"}'); }
          finishCreate = () => { users.push({...body, password:undefined, id:'new-user', enabled:true, approval_status:'approved'}); res.end('{"ok":true}'); };
          createReceived(); return;
        }
        if (url.endsWith('/password')) {
          if (!resetFailed) { resetFailed = true; res.writeHead(400); return res.end('{"error":"密码过于简单"}'); }
          return res.end('{"ok":true}');
        }
        if (url.startsWith('/api/admin/users/') && req.method === 'PATCH') {
          Object.assign(users.find(user => user.id === url.split('/').at(-1)), body); return res.end('{"ok":true}');
        }
        if (url === '/api/admin/grants' && req.method === 'PUT') { grants.push(body); return res.end('{"ok":true}'); }
        if (url.startsWith('/api/admin/grants/') && req.method === 'DELETE') { grants.length = 0; return res.end('{"ok":true}'); }
        if (url === '/api/admin/projects/assign') {
          if (!assignFailed) { assignFailed = true; res.writeHead(409); return res.end('{"error":"画布归属已变化"}'); }
          for (const item of body.projects) Object.assign(projects.find(project => project.id === item.project_id), {owner_id:body.owner_id, owner_username:users.find(user => user.id === body.owner_id).username});
          return res.end(JSON.stringify({count:body.projects.length}));
        }
        res.writeHead(404); res.end('{"error":"未知接口"}');
      }); return;
    }
    if (url === '/api/admin/users' && failNextUsersRead) {
      failNextUsersRead = false; res.writeHead(500, {'Content-Type':'application/json'});
      return res.end(JSON.stringify({error:'写后读取失败'}));
    }
    const payloads = {
      '/api/auth/me':{user:users[0], csrf_token:'dialog-csrf'},
      '/api/health':{ok:true, mode:'controller', maintenance_active:false},
      '/api/admin/users':{users}, '/api/admin/grants':{grants}, '/api/projects':{projects},
      '/api/admin/registrations':{requests:[{username:unsafeName, display_name:unsafeName, status:'pending', created_at:1, decided_by:''}], outbox:{pending:2, oldest_at:1}},
    };
    if (Object.hasOwn(payloads, url)) { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(payloads[url])); }
    const files = {'/':'permissions.html', '/auth.js':'auth.js', '/admin-shell.js':'admin-shell.js', '/admin-shell.css':'admin-shell.css', '/icon.png':'icon.png', '/favicon.png':'favicon.png'};
    const file = files[url]; if (!file) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8');
    res.end(readFileSync(path.join(web, file)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(browserOptions); const page = await browser.newPage({viewport:{width:1440,height:1000}});
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.waitForFunction(() => document.getElementById('metric-users').textContent === '4' && document.getElementById('metric-pending').textContent === '1');
    assert.equal(await page.locator('#metric-enabled').innerText(), '3');
    assert.equal(await page.locator('#metric-pending').innerText(), '1');
    assert.match(await page.locator('#outbox-status').innerText(), /积压 2 条/);
    assert.equal(await page.locator('#registrations img, #users img, #projects svg').count(), 0);
    assert.equal(await page.locator('#registrations button').count(), 0, '注册审批保持钉钉只读');
    await page.screenshot({path:'/tmp/h3card-permissions-full.png', fullPage:true});
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({width, height:900});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, '横向滚动仅限表格容器');
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.getByRole('button', {name:'新建账号', exact:true}).click();
    let dialog = page.getByRole('dialog');
    await dialog.locator('[name=username]').fill('new-author');
    await dialog.locator('[name=password]').fill('correct-test-password');
    await dialog.locator('[name=team_leader]').check();
    let response = page.waitForResponse(r => r.url().endsWith('/api/admin/users') && r.request().method() === 'POST');
    await dialog.getByRole('button', {name:'创建账号', exact:true}).click(); await response;
    await page.waitForFunction(() => document.querySelector('dialog [role=alert]')?.textContent.includes('账号名已存在'));
    assert.equal(await dialog.locator('[name=username]').inputValue(), 'new-author');
    assert.equal(await dialog.locator('[name=team_leader]').isChecked(), true);
    const firstPassword = await dialog.locator('[name=password]').elementHandle();
    await dialog.getByRole('button', {name:'取消', exact:true}).click(); await page.locator('dialog').waitFor({state:'detached'});
    assert.equal(await firstPassword.evaluate(node => node.value), '', '取消后清除已脱离 DOM 的密码字段');
    assert.equal(await page.getByRole('button', {name:'新建账号', exact:true}).evaluate(node => node === document.activeElement), true, '关闭后焦点返回触发按钮');
    await page.getByRole('button', {name:'新建账号', exact:true}).click(); dialog = page.getByRole('dialog');
    await dialog.locator('[name=username]').fill('new-author'); await dialog.locator('[name=password]').fill('correct-test-password');
    await dialog.locator('[name=team_leader]').check();
    const successPassword = await dialog.locator('[name=password]').elementHandle();
    response = page.waitForResponse(r => r.url().endsWith('/api/admin/users') && r.request().method() === 'POST');
    // 断言失败清理页面时不让待响应Promise掩盖原始错误；下方仍必须await成功响应。
    response.catch(() => {});
    await dialog.getByRole('button', {name:'创建账号', exact:true}).click();
    await page.waitForFunction(() => document.querySelector('dialog form')?.getAttribute('aria-busy') === 'true');
    assert.equal(await dialog.getByRole('button', {name:'正在提交…'}).isDisabled(), true);
    await page.keyboard.press('Escape'); assert.equal(await dialog.count(), 1, '提交中不能 Esc 关闭');
    await receivedCreate;
    assert.equal(mutations.filter(item => item.url === '/api/admin/users').length, 2, '服务器收到请求后确认只提交一次，不能把客户端busy当成网络到达');
    finishCreate(); await response; await page.locator('dialog').waitFor({state:'detached'});
    assert.equal(await successPassword.evaluate(node => node.value), '', '成功后清除密码');
    assert.equal(await page.locator('#metric-users').innerText(), '5');
    const ownerRow = page.locator('#users tr').filter({hasText:unsafeName});
    await ownerRow.getByRole('button', {name:'重置密码', exact:true}).click(); dialog = page.getByRole('dialog');
    assert.equal(await dialog.locator('img').count(), 0, '用户名在重置对话框中也必须转义');
    await dialog.locator('[name=password]').fill('12345678');
    response = page.waitForResponse(r => r.url().endsWith('/password'));
    await dialog.getByRole('button', {name:'确认重置密码', exact:true}).click(); await response;
    await page.waitForFunction(() => document.querySelector('dialog [role=alert]')?.textContent.includes('密码过于简单'));
    await dialog.locator('[name=password]').fill('reset-test-password'); const resetPassword = await dialog.locator('[name=password]').elementHandle();
    response = page.waitForResponse(r => r.url().endsWith('/password'));
    await dialog.getByRole('button', {name:'确认重置密码', exact:true}).click(); await response; await page.locator('dialog').waitFor({state:'detached'});
    assert.equal(await resetPassword.evaluate(node => node.value), '');
    await ownerRow.getByRole('button', {name:'修改角色', exact:true}).click(); dialog = page.getByRole('dialog');
    await dialog.locator('[name=role]').selectOption('admin');
    failNextUsersRead = true;
    await dialog.getByRole('button', {name:'确认修改角色', exact:true}).click(); await page.locator('dialog').waitFor({state:'detached'});
    assert.equal(users.find(user => user.id === 'owner').role, 'admin');
    assert.match(await page.locator('#error').innerText(), /操作已成功，但列表刷新失败.*写后读取失败/);
    assert.equal(await page.locator('#refresh').isDisabled(), false, '写后读取失败仍能重试读取');
    assert.equal(await page.locator('#create-user').isDisabled(), true, '快照无效时继续禁止写入');
    assert.equal(await page.locator('#grant-submit').isDisabled(), true);
    const writesBeforeRetry = mutations.length;
    await page.locator('#refresh').click();
    await page.waitForFunction(() => !document.getElementById('create-user').disabled);
    assert.equal(mutations.length, writesBeforeRetry, '重试只读取，不能重新提交成功的角色变更');
    assert.equal(mutations.filter(item => item.method === 'PATCH' && item.body.role === 'admin').length, 1);
    await ownerRow.getByRole('button', {name:'停用', exact:true}).click(); dialog = page.getByRole('dialog');
    await dialog.getByRole('button', {name:'确认停用账号', exact:true}).click(); await page.locator('dialog').waitFor({state:'detached'});
    assert.equal(users.find(user => user.id === 'owner').enabled, false);
    await page.locator('#grant [name=viewer_id]').selectOption('viewer'); await page.locator('#grant [name=owner_id]').selectOption('owner');
    await page.locator('#grant [name=permission]').selectOption('operate'); await page.locator('#grant-submit').click(); dialog = page.getByRole('dialog');
    assert.match(await dialog.innerText(), /包含删除/); assert.equal(await dialog.locator('img').count(), 0);
    await dialog.getByRole('button', {name:'确认保存授权', exact:true}).click(); await page.locator('dialog').waitFor({state:'detached'});
    assert.deepEqual(grants, [{viewer_id:'viewer', owner_id:'owner', permission:'operate'}]);
    await page.locator('#grants').getByRole('button', {name:'撤销', exact:true}).click(); dialog = page.getByRole('dialog');
    await dialog.getByRole('button', {name:'确认撤销授权', exact:true}).click(); await page.locator('dialog').waitFor({state:'detached'}); assert.equal(grants.length, 0);
    const all = page.locator('#project-all'); await all.check(); assert.equal(await page.locator('#projects input:checked').count(), 2);
    assert.equal(await page.locator('#projects tr').filter({hasText:'组内画布'}).getByRole('checkbox').isDisabled(), true);
    await page.locator('#clear-selection').click(); assert.equal(await page.locator('#project-selected').innerText(), '已选 0 个画布');
    await all.check(); await page.locator('#project-search').fill('第二张'); assert.equal(await page.locator('#project-selected').innerText(), '已选 0 个画布');
    await page.locator('#project-search').fill(''); await all.check();
    assert.equal(await page.locator('#assign [name=owner_id] option[value=disabled]').count(), 0, '目标不包含停用账号');
    await page.locator('#assign [name=owner_id]').selectOption('viewer'); await page.locator('#assign-submit').click(); dialog = page.getByRole('dialog');
    assert.equal(await dialog.locator('tbody tr').count(), 2); assert.equal(await dialog.locator('svg, img').count(), 0);
    assert.match(await dialog.innerText(), /原所有者及其授权访问者可能失去访问权限/);
    assert.match(await dialog.innerText(), /ID: owner/); assert.match(await dialog.innerText(), /ID: viewer/);
    response = page.waitForResponse(r => r.url().endsWith('/projects/assign'));
    await dialog.getByRole('button', {name:'确认分配所列画布', exact:true}).click(); await response;
    await page.waitForFunction(() => document.querySelector('dialog [role=alert]')?.textContent.includes('画布归属已变化'));
    assert.equal(await page.locator('#project-selected').innerText(), '已选 2 个画布', '分配失败保留选择');
    response = page.waitForResponse(r => r.url().endsWith('/projects/assign'));
    await dialog.getByRole('button', {name:'确认分配所列画布', exact:true}).click(); await response; await page.locator('dialog').waitFor({state:'detached'});
    assert.equal(await page.locator('#project-selected').innerText(), '已选 0 个画布'); assert.match(await page.locator('#assign-status').innerText(), /2 个画布/);
    const assignments = mutations.filter(item => item.url.endsWith('/projects/assign'));
    assert.deepEqual(assignments.map(item => item.body), Array(2).fill({owner_id:'viewer', projects:[{project_id:'p1',owner_id:'owner'},{project_id:'p2',owner_id:'owner'}]}));
    assert.equal(projects.find(project => project.id === 'pt').owner_id, 'owner');
    assert.ok(mutations.length >= 10); assert.ok(mutations.every(item => item.csrf === 'dialog-csrf'), '所有变更通过真实 auth 客户端携带 CSRF');
    assert.deepEqual(errors, []);
  } finally { if (browser) await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('新版工作区跨页面保留唯一导航和底部真实账号，键盘、触摸、角色及改密退出契约不变', async () => {
  let user = {id:'admin-1', username:'admin-account', display_name:'张三', role:'admin'}, localTest = false;
  const mutations = [], unexpected = [], external = [], errors = [];
  const files = {'/':'index.html', '/director':'director.html', '/teams':'teams.html', '/controller':'controller.html',
    '/admin/permissions':'permissions.html', '/controller/costs':'costs.html', '/controller/capacity':'capacity.html',
    '/app.js':'app.js', '/auth.js':'auth.js', '/style.css':'style.css', '/director.js':'director.js', '/director.css':'director.css',
    '/director_edit.js':'director_edit.js', '/icon.png':'icon.png', '/favicon.png':'favicon.png',
    '/admin-shell.js':'admin-shell.js', '/admin-shell.css':'admin-shell.css', '/controller-page.js':'controller-page.js', '/costs-page.js':'costs-page.js'};
  const reply = (res, body, status = 200) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(body)); };
  const server = createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'POST' && pathname === '/api/auth/presence') {
      assert.equal(req.headers['x-csrf-token'], 'nav-csrf'); req.resume(); return reply(res, {online_users:7});
    }
    if (req.method === 'POST' && ['/api/auth/password', '/api/auth/logout'].includes(pathname)) {
      const chunks = []; req.on('data', chunk => chunks.push(chunk)); req.on('end', () => {
        mutations.push({path:pathname, body:JSON.parse(Buffer.concat(chunks).toString() || '{}'), csrf:req.headers['x-csrf-token']});
        reply(res, pathname.endsWith('password') ? {error:'当前密码不正确'} : {ok:true}, pathname.endsWith('password') ? 400 : 200);
      }); return;
    }
    const payloads = {'/api/auth/me':{user, csrf_token:'nav-csrf', local_test:localTest},
      '/api/cards':{cards:[], capabilities:{}, comfy_online:false, director_schema:1}, '/api/projects':{projects:[], teams:[]}, '/api/jobs':{jobs:[]},
      '/api/health':{ok:true, mode:'controller', comfy_online:false, maintenance_active:false}, '/api/status':{running_count:0, queued_count:0}, '/api/workers':{workers:[]},
      '/api/admin/users':{users:[{...user, enabled:true}]}, '/api/admin/grants':{grants:[]}, '/api/admin/registrations':{requests:[]},
      '/api/costs':{overview:Object.fromEntries(['retail_min','retail_max','retail_mid','retail_known_tasks','retail_unknown_tasks','total_cost','actual_cost','estimated_cost','gpu_hours','electricity_cost','api_cost','failed_waste','unknown_cost_tasks','running_accrued','tasks','done','error','canceled'].map(key=>[key,0])), by_category:[], by_capability:[], by_worker:[], jobs:[], pricing_version:'test', currency:'CNY'},
      '/api/capacity':{overview:{}, workers:[], groups:[], details:[], details_total:0}, '/api/teams':{teams:[]}, '/api/team-candidates':{users:[]}};
    if (req.method === 'GET' && Object.hasOwn(payloads, pathname)) return reply(res, payloads[pathname]);
    if (req.method === 'GET' && pathname === '/login') { res.setHeader('Content-Type','text/html'); return res.end('<h1>登录</h1>'); }
    const file = req.method === 'GET' && files[pathname];
    if (!file) { unexpected.push(req.method + ' ' + pathname); req.resume(); res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8');
    res.end(readFileSync(path.join(web, file)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); let browser;
  try {
    browser = await chromium.launch(browserOptions);
    const context = await browser.newContext({viewport:{width:1440,height:900}, serviceWorkers:'block'});
    const origin = 'http://127.0.0.1:' + server.address().port;
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      external.push(route.request().url()); return route.abort();
    });
    await context.routeWebSocket('**/*', socket => { external.push(socket.url()); socket.close(); });
    const page = await context.newPage(); page.setDefaultTimeout(10000); page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    const trigger = page.locator('.account-trigger'), rail = page.locator('#workspace-nav'), menu = page.locator('#account-menu');
    await trigger.waitFor();
    assert.equal(await trigger.locator('.account-avatar').textContent(), '张');
    assert.equal(await trigger.locator('.account-name').textContent(), '张三');
    assert.equal((await rail.boundingBox()).width, 72);
    const mainBox = await page.locator('#main').boundingBox(), canvasLink = page.getByRole('link',{name:'画布',exact:true});
    const iconBox = await canvasLink.locator('svg').boundingBox();
    await rail.hover({position:{x:35,y:38}});
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.workspace-brand > span')).opacity === '1');
    assert.equal((await rail.boundingBox()).width, 184);
    assert.deepEqual(await page.locator('#main').boundingBox(), mainBox, '导航展开不挤压画布');
    assert.deepEqual(await canvasLink.locator('svg').boundingBox(), iconBox);
    await page.mouse.move(600,80); assert.equal((await rail.boundingBox()).width, 72);
    await canvasLink.focus(); assert.equal((await rail.boundingBox()).width,184);
    await page.keyboard.press('Tab'); assert.equal(await page.getByRole('link',{name:'导演工作台',exact:true}).evaluate(node=>node===document.activeElement),true);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.workspace-brand > span').evaluate(node=>getComputedStyle(node).transitionDuration),'0s');
    await page.emulateMedia({reducedMotion:'no-preference'});
    assert.deepEqual(await page.getByRole('group',{name:'工作区',exact:true}).locator('a').allTextContents(),['画布','导演工作台']);
    assert.deepEqual(await page.getByRole('group',{name:'管理',exact:true}).locator('a').allTextContents(),['项目组','运行面板','账号与权限']);
    assert.deepEqual(await page.getByRole('group',{name:'统计',exact:true}).locator('a').allTextContents(),['费用评估','产能统计']);
    await page.waitForFunction(()=>document.querySelector('.workspace-presence b').textContent==='7');
    assert.ok((await trigger.boundingBox()).y>790);
    await trigger.focus(); await page.keyboard.press('Enter'); await menu.waitFor({state:'visible'});
    assert.deepEqual(await menu.locator('.account-action').allTextContents(),['用户信息','修改密码','退出登录']);
    await page.keyboard.press('Tab'); assert.equal(await menu.getByRole('button',{name:'用户信息',exact:true}).evaluate(node=>node===document.activeElement),true);
    await page.keyboard.press('Escape'); assert.equal(await trigger.getAttribute('aria-expanded'),'false');
    assert.equal(await trigger.evaluate(node=>node===document.activeElement),true);
    await trigger.click(); await page.locator('#empty .big').click(); assert.equal(await menu.isVisible(),false);
    await trigger.click(); await menu.getByRole('button',{name:'修改密码',exact:true}).click();
    const password=page.getByRole('dialog',{name:'修改密码',exact:true});
    await password.locator('[name=current_password]').fill('old-password'); await password.locator('[name=new_password]').fill('new-password');
    await password.locator('[name=confirm_password]').fill('not-the-same'); await password.getByRole('button',{name:'保存',exact:true}).click();
    assert.equal(await password.getByRole('alert').textContent(),'两次输入的新密码不一致'); assert.deepEqual(mutations,[]);
    await password.locator('[name=confirm_password]').fill('new-password'); await password.getByRole('button',{name:'保存',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.auth-dialog [role=alert]').textContent==='当前密码不正确');
    assert.deepEqual(mutations,[{path:'/api/auth/password',body:{current_password:'old-password',new_password:'new-password'},csrf:'nav-csrf'}]);
    assert.equal(await password.locator('[name=new_password]').inputValue(),'new-password');
    await password.getByRole('button',{name:'取消',exact:true}).click(); await password.waitFor({state:'detached'});
    assert.equal(await trigger.evaluate(node=>node===document.activeElement),true);
    for (const [route,key] of [['/','canvas'],['/director','director'],['/teams','teams'],['/controller','controller'],['/admin/permissions','permissions'],['/controller/costs','costs'],['/controller/capacity','capacity']]) {
      await page.goto(origin+route); await trigger.waitFor();
      assert.equal(await page.locator('body').getAttribute('data-workspace'),key);
      assert.equal(await rail.count(),1); assert.equal(await page.locator('.workspace-links').count(),1);
      assert.equal(await page.locator('.workspace-link[aria-current=page]').getAttribute('href'),route);
      for(const selector of ['#account','.account-bar','.account-trigger','#account-menu']) assert.equal(await page.locator(selector).count(),1,route+' '+selector);
      assert.equal(await page.locator('#workspace-nav .workspace-footer #account').count(),1);
      assert.equal(await page.locator('.admin-mobile-account,.side-actions').count(),0);
      if(key!=='director')assert.equal(await page.locator('.sidebar').count(),0);
      else assert.equal(await page.locator('.sidebar [data-stage]').count(),5,'导演业务步骤不是重复站点导航');
      assert.equal(await page.locator('#topbar #account,header #account').count(),0);
      assert.equal(await page.locator('.workspace-brand img').getAttribute('src'),'/icon.png');
      for(const width of [1440,390,320]) {
        await page.setViewportSize({width,height:900}); await page.mouse.move(width-10,70);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,route+' '+width);
        assert.equal((await rail.boundingBox()).width,72); assert.ok((await trigger.boundingBox()).y>790);
      }
      await trigger.click(); await menu.getByRole('button',{name:'用户信息',exact:true}).click();
      const info=page.getByRole('dialog',{name:'用户信息',exact:true});
      assert.deepEqual(await info.locator('dd').allTextContents(),['张三','admin-account','管理员','admin-1']);
      await page.keyboard.press('Escape'); await info.waitFor({state:'detached'});
      assert.equal(await trigger.evaluate(node=>node===document.activeElement),true);
      assert.equal(context.pages().length,1,'导航不另开标签');
    }
    const touchContext=await browser.newContext({viewport:{width:375,height:812},hasTouch:true,isMobile:true,serviceWorkers:'block'});
    await touchContext.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():(external.push(route.request().url()),route.abort()));
    await touchContext.routeWebSocket('**/*',socket=>{external.push(socket.url());socket.close();});
    try {
      const touch=await touchContext.newPage();touch.on('pageerror',error=>errors.push(error.message));
      await touch.goto(origin);await touch.locator('.account-trigger').waitFor();
      assert.equal(await touch.evaluate(()=>matchMedia('(hover: hover)').matches),false);
      await touch.locator('.account-trigger').tap();await touch.locator('#account-menu').waitFor({state:'visible'});
      const box=await touch.locator('#account-menu').boundingBox();assert.ok(box.x>=8&&box.x+box.width<=375&&box.y>=0&&box.y+box.height<=812);
      await touch.getByRole('button',{name:'用户信息',exact:true}).tap();await touch.getByRole('dialog',{name:'用户信息',exact:true}).waitFor();
      await touch.getByRole('button',{name:'关闭',exact:true}).tap();await touch.locator('.auth-dialog').waitFor({state:'detached'});
    } finally {await touchContext.close();}
    user={...user,role:'user',team_leader:true};await page.goto(origin);await trigger.waitFor();
    assert.deepEqual(await page.locator('.workspace-link').allTextContents(),['画布','导演工作台','项目组']);
    assert.equal(await page.getByRole('group',{name:'统计',exact:true}).count(),0);
    user={...user,team_leader:false,display_name:'<img src=x onerror=alert(1)>'};await page.reload();await trigger.waitFor();
    assert.deepEqual(await page.locator('.workspace-link').allTextContents(),['画布','导演工作台']);
    assert.equal(await trigger.locator('img').count(),0);assert.equal(await trigger.locator('.account-name').textContent(),user.display_name);
    localTest=true;await page.reload();await page.getByText('本地测试 · 免登录',{exact:true}).waitFor();assert.equal(await trigger.count(),0);
    localTest=false;await page.reload();await trigger.click();await menu.getByRole('button',{name:'退出登录',exact:true}).click();await page.waitForURL('**/login');
    assert.deepEqual(mutations,[{path:'/api/auth/password',body:{current_password:'old-password',new_password:'new-password'},csrf:'nav-csrf'},{path:'/api/auth/logout',body:{},csrf:'nav-csrf'}]);
    assert.deepEqual(unexpected,[],'不得额外业务写入或请求未声明路由');assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  } finally {if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('真实维护分级、短暂部分维护、减少动画和超时恢复，不新增业务写入', async () => {
  let maintenance=true,comfyOnline=false,stallHealth=false,healthRequests=0,stalledReceived;
  const unexpected=[],external=[],errors=[];
  const server=createServer((req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const json=body=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));};
    if(pathname==='/auth.js'){res.setHeader('Content-Type','text/javascript');return res.end(readFileSync(path.join(web,'auth.js')));}
    if(pathname==='/api/auth/me')return json({user:{id:'u1',username:'viewer',role:'user'},csrf_token:'maintenance-csrf'});
    if(pathname==='/api/auth/presence'&&req.method==='POST'){assert.equal(req.headers['x-csrf-token'],'maintenance-csrf');req.resume();return json({online_users:1});}
    if(pathname==='/api/health'&&req.method==='GET'){healthRequests++;if(stallHealth){stalledReceived?.();return;}return json({ok:true,comfy_online:comfyOnline,maintenance_active:maintenance});}
    if(pathname==='/admin-shell.css'){res.setHeader('Content-Type','text/css');return res.end(readFileSync(path.join(web,'admin-shell.css')));}
    if(pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end('<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><title>维护提示测试</title><main><h1>管理页标题</h1></main><script src="/auth.js"></script>');}
    unexpected.push(req.method+' '+pathname);req.resume();res.writeHead(404);res.end();
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try {
    browser=await chromium.launch(browserOptions);const context=await browser.newContext({viewport:{width:1280,height:720},serviceWorkers:'block'});
    const origin='http://127.0.0.1:'+server.address().port;
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():(external.push(route.request().url()),route.abort()));
    await context.routeWebSocket('**/*',socket=>{external.push(socket.url());socket.close();});
    await context.addInitScript(()=>{window.maintenanceIntervals=[];window.setInterval=(fn,ms)=>(maintenanceIntervals.push({fn,ms}),maintenanceIntervals.length);});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin);await page.evaluate(()=>H3Auth.requireUser());const banner=page.locator('#maintenance-banner');await banner.waitFor({state:'visible'});
    const visual=await banner.evaluate(node=>({position:getComputedStyle(node).position,top:getComputedStyle(node).top,background:getComputedStyle(node).backgroundColor,role:node.getAttribute('role'),live:node.getAttribute('aria-live'),iconBeforeMessage:node.querySelector('.maintenance-banner-icon').getBoundingClientRect().right<=node.querySelector('.maintenance-banner-ticker').getBoundingClientRect().left,animation:getComputedStyle(node.querySelector('.maintenance-banner-track')).animationName}));
    assert.deepEqual({...visual,animation:undefined},{position:'fixed',top:'0px',background:'rgb(185, 28, 28)',role:'status',live:'polite',iconBeforeMessage:true,animation:undefined});assert.notEqual(visual.animation,'none');
    assert.equal(await banner.locator('.maintenance-banner-message').first().textContent(),'系统正在维护更新，当前暂无可用执行节点，请稍后再使用。');assert.equal(await banner.locator('svg').count(),1);
    const checkHealth=async()=>{const reply=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/health');await page.evaluate(()=>maintenanceIntervals.filter(timer=>timer.ms===5000).forEach(timer=>timer.fn()));await reply;};
    comfyOnline=true;await checkHealth();
    assert.equal(await banner.locator('.maintenance-banner-message').first().textContent(),'部分节点正在维护更新，其他可用节点仍可正常使用。');
    await banner.waitFor({state:'hidden',timeout:7000});
    await checkHealth();assert.equal(await banner.isHidden(),true,'同一轮部分维护不能每次轮询重复提示');
    comfyOnline=false;await checkHealth();await banner.waitFor({state:'visible'});
    assert.equal(await banner.locator('.maintenance-banner-message').first().textContent(),'系统正在维护更新，当前暂无可用执行节点，请稍后再使用。');
    maintenance=false;await checkHealth();await banner.waitFor({state:'hidden'});maintenance=true;await checkHealth();await banner.waitFor({state:'visible'});
    assert.equal(await banner.count(),1);
    await page.evaluate(()=>{document.body.classList.add('admin-page');document.body.dataset.workspace='controller';const link=document.createElement('link');link.rel='stylesheet';link.href='/admin-shell.css';document.head.append(link);});
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('#maintenance-banner')).position==='sticky');
    for(const width of [2560,390,320]){
      await page.setViewportSize({width,height:740});
      assert.equal(await page.evaluate(()=>{const banner=document.querySelector('#maintenance-banner').getBoundingClientRect();return document.querySelector('h1').getBoundingClientRect().top>=banner.bottom&&banner.left===0&&banner.right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth;}),true,'维护横幅保留全宽且不得遮挡管理页标题');
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.deepEqual(await banner.locator('.maintenance-banner-message').first().evaluate(node=>({animation:getComputedStyle(node.parentElement).animationName,whiteSpace:getComputedStyle(node).whiteSpace,textOverflow:getComputedStyle(node).textOverflow,fullWidth:node.scrollWidth<=node.clientWidth,fullHeight:node.scrollHeight<=node.clientHeight})),{animation:'none',whiteSpace:'normal',textOverflow:'clip',fullWidth:true,fullHeight:true});
    assert.equal(await page.evaluate(()=>document.querySelector('h1').getBoundingClientRect().top>=document.querySelector('#maintenance-banner').getBoundingClientRect().bottom),true,'减少动画下多行横幅按实际高度避让');
    stallHealth=true;const stalled=new Promise(resolve=>{stalledReceived=resolve;});
    await page.evaluate(()=>maintenanceIntervals.filter(timer=>timer.ms===5000).forEach(timer=>timer.fn()));await stalled;
    const before=healthRequests;
    await page.evaluate(()=>maintenanceIntervals.filter(timer=>timer.ms===5000).forEach(timer=>timer.fn()));
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(healthRequests,before,'悬挂健康请求不能重复并发');
    maintenance=false;stallHealth=false;
    // 等真实4秒超时触发后再检查，不缩短生产超时或放弃恢复断言。
    await page.waitForEvent('requestfailed',{predicate:request=>new URL(request.url()).pathname==='/api/health',timeout:6500});
    await checkHealth();await banner.waitFor({state:'hidden'});
    assert.deepEqual(unexpected,[]);assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  } finally {if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('real auth client expires protected sessions and allows a subsequent anonymous login', async () => {
  let expired = false;
  const session = {user:{id:'u1', username:'admin', role:'admin'}, csrf_token:'test-csrf'};
  const server = createServer((req, res) => {
    if (req.url === '/auth.js') {
      res.setHeader('Content-Type', 'text/javascript'); return res.end(readFileSync(path.join(web, 'auth.js')));
    }
    if (req.url === '/api/health') {
      res.setHeader('Content-Type', 'application/json'); return res.end('{"ok":true,"maintenance_active":false}');
    }
    if (req.method === 'POST' && req.url === '/api/auth/presence') {
      req.resume(); res.setHeader('Content-Type', 'application/json'); return res.end('{"online_users":1}');
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
