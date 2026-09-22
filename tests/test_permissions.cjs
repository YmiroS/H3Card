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
const browserOptions = process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {};

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

test('canvas separates personal, shared and team spaces when creating projects', async () => {
  const projects = [
    {id:'p1', name:'个人画布', owner_id:'u1', owner_username:'alice', team_id:null, team_name:null, permission:'operate', cards:0, updated:3, locked:false, share_count:0, shared_team_ids:[], shared_personally:false},
    {id:'p2', name:'项目组画布', owner_id:'u2', owner_username:'bob', team_id:'t1', team_name:'项目一组', permission:'operate', cards:0, updated:2, locked:false},
    {id:'p3', name:'别人共享', owner_id:'u2', owner_username:'bob', team_id:null, team_name:null, permission:'read', cards:0, updated:1, locked:false},
  ];
  const teams = [{id:'t1', name:'项目一组', leader_id:'u2', leader_username:'bob', can_manage:false, members:[]}];
  const mutations = [], shareMutations = [];
  const server = createServer((req, res) => {
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
    await page.locator('#space-select').selectOption('team:t1');
    await page.waitForFunction(() => document.querySelector('#plist')?.textContent.includes('项目组画布'));
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
    {id:'u1', username:'<script>alert(1)</script>', role:'admin', enabled:true, team_leader:false},
    {id:'u2', username:'alice', role:'user', enabled:false, team_leader:false},
  ];
  const mutations = [];
  const payloads = {
    '/api/auth/me': {user:{id:'u1', username:'admin', role:'admin'}, csrf_token:'test-csrf'},
    '/api/admin/users': {users},
    '/api/admin/grants': {grants:[{viewer_id:'u2', owner_id:'u1', permission:'read'}]},
    '/api/projects': {projects:[]},
    '/api/admin/registrations': {requests:[]},
  };
  const server = createServer((req, res) => {
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
    await page.waitForFunction(() => document.querySelectorAll('#users tr').length === 2);
    assert.match(await page.locator('#users').innerText(), /<script>alert\(1\)<\/script>/);
    assert.equal(await page.locator('#users script').count(), 0);
    assert.equal(await page.locator('#grants tr').count(), 1);
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
    assert.equal(dialogs.length, 1);
    assert.match(dialogs[0], /授予.*项目组/);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('team leader page creates groups and adds members safely', async () => {
  const mutations = [];
  const payloads = {
    '/api/auth/me': {user:{id:'lead', username:'leader', role:'user', team_leader:true}, csrf_token:'team-csrf'},
    '/api/teams': {teams:[{id:'t1', name:'项目一组', leader_id:'lead', leader_username:'leader', can_manage:true,
      members:[{id:'lead', username:'leader', display_name:'组长', enabled:true}]}]},
    '/api/team-candidates': {users:[{id:'member', username:'<img src=x onerror=alert(1)>', display_name:'组员', enabled:true}]},
  };
  const server = createServer((req, res) => {
    if (req.method === 'POST' && (req.url === '/api/teams' || req.url === '/api/teams/t1/members')) {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        mutations.push({url:req.url, body:JSON.parse(Buffer.concat(chunks).toString()), csrf:req.headers['x-csrf-token']});
        res.setHeader('Content-Type', 'application/json'); res.end('{}');
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
    assert.equal(await page.locator('.team-add-member option').nth(1).textContent(), '<img src=x onerror=alert(1)>（组员）');
    await page.locator('.team-add-member select').selectOption('member');
    const response = page.waitForResponse(r => r.request().method() === 'POST');
    await page.locator('.team-add-member button').click(); await response;
    assert.deepEqual(mutations, [{url:'/api/teams/t1/members', body:{user_id:'member'}, csrf:'team-csrf'}]);
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
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
