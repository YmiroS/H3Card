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

test('production permissions page renders account names as text and sends authorized mutations', async () => {
  const users = [
    {id:'u1', username:'<script>alert(1)</script>', role:'admin', enabled:true},
    {id:'u2', username:'alice', role:'user', enabled:false},
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
    page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.waitForFunction(() => document.querySelectorAll('#users tr').length === 2);
    assert.match(await page.locator('#users').innerText(), /<script>alert\(1\)<\/script>/);
    assert.equal(await page.locator('#users script').count(), 0);
    assert.equal(await page.locator('#grants tr').count(), 1);
    const response = page.waitForResponse(r => r.request().method() === 'PATCH');
    await page.locator('#users tr').filter({hasText:'alice'}).getByRole('button', {name:'启用', exact:true}).click();
    await response;
    assert.deepEqual(mutations, [{body:{enabled:true}, csrf:'test-csrf'}]);
    assert.deepEqual(errors, []);
    assert.deepEqual(dialogs, []);
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
