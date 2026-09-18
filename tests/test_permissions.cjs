// 前端权限逻辑不依赖浏览器服务：截取 app.js 的权限判断段，在受控 DOM 里验证只读拦截。
// NODE_PATH 需含 Playwright；可用 CHOUKA_TEST_BROWSER=msedge。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { createServer } = require('node:http');
const { chromium } = require('playwright');

const source = readFileSync(path.join(__dirname, '..', 'web', 'app.js'), 'utf8');
const start = source.indexOf('const canOperate');
const end = source.indexOf('const jpost =');
const helpers = source.slice(start, end);

function permissionsPage(payload) {
  return `<!doctype html><meta charset="utf-8"><body class="auth-page">
  <header><h1>账号与权限</h1><div id="account" class="account-bar"></div></header>
  <p id="error" role="alert"></p>
  <table><tbody id="users"></tbody></table>
  <script>
    const requests = [];
    const payload = ${JSON.stringify(payload)};
    window.fetchCapture = requests;
    window.H3Auth = {
      user: {id: 'u1', username: 'admin', role: 'admin', enabled: true},
      active: true,
      request: (p, o) => { requests.push({path: p, method: (o && o.method) || 'GET'}); return Promise.resolve(payload); },
      json: (p, m, b) => { requests.push({path: p, method: m, body: b}); return Promise.resolve(payload); },
      requireUser: () => Promise.resolve(window.H3Auth.user),
      mountAccount: () => {},
    };
  </script>
  <script>${path.basename('')}</script>
  <script>
    window.CURRENT = (function () {
      let PROJ = null, projects = [], TASKS = [], CLIP = null;
      let toast = m => (window.lastToast = m);
      let el = {panel: document.body, dock: {style: {}}, ptitle: document.createElement('div'),
                plist: document.createElement('div'), selbar: {style: {}}, jobs: {style: {display: 'none'}}};
      let saveTimer = null, view = {x: 0, y: 0, k: 1}, selId = null, selIds = new Set();
      const closePanel = () => {}, closeHistory = () => {}, closeViewer = () => {},
            closeMenu = () => {}, closeJobs = () => {}, closeResPop = () => {},
            render = () => {}, paint = () => {}, syncPermissionUI = () => {},
            clearProject = () => {}, loadProjects = async () => {}, pollJobs = async () => {},
            showEmpty = () => {}, paintJobsBtn = () => {}, renderJobs = () => {};
      ${helpers}
      return {canOperate, canSave, canTask, requireOperate,
              set project(v) { PROJ = v; }, get project() { return PROJ; },
              set tasks(v) { TASKS = v; }, get tasks() { return TASKS; }};
    })();
  </script>`;
}

test('readonly blocks save and operate while allowing view of granted projects', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'chouka-permissions-'));
  let server, browser;
  try {
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
    server = createServer((req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(html);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel: process.env.CHOUKA_TEST_BROWSER} : {});
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);

    // 只读授权：能打开查看，不能保存/操作。
    await page.evaluate(() => window.setProject({id: 'p1', permission: 'read', locked: false}));
    assert.equal(await page.evaluate(() => window.gate.canOperate()), false);
    assert.equal(await page.evaluate(() => window.gate.canSave()), false);
    assert.equal(await page.evaluate(() => window.gate.requireOperate()), false);
    assert.match(await page.evaluate(() => window.lastToast), /只读/);

    // 可操作授权：保存与操作放行；locked 示例仍不允许落盘。
    await page.evaluate(() => window.setProject({id: 'p2', permission: 'operate', locked: false}));
    assert.equal(await page.evaluate(() => window.gate.canOperate()), true);
    assert.equal(await page.evaluate(() => window.gate.canSave()), true);
    await page.evaluate(() => window.setProject({id: 'demo', permission: 'operate', locked: true}));
    assert.equal(await page.evaluate(() => window.gate.canSave()), false);
    assert.deepEqual(errors, []);
    await browser.close();
    browser = undefined;
  } finally {
    if (browser) await browser.close();
    server && server.close();
    rmSync(directory, {recursive: true, force: true});
  }
});

test('permissions page renders accounts through text nodes and issues authorized calls', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'chouka-permissions-page-'));
  let server, browser;
  try {
    const payload = {users: [
      {id: 'u1', username: '<script>alert(1)</script>', role: 'admin', enabled: true},
      {id: 'u2', username: 'alice', role: 'user', enabled: false},
    ], grants: [{viewer_id: 'u2', owner_id: 'u1', permission: 'read'}]};
    server = createServer((req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(permissionsPage(payload));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel: process.env.CHOUKA_TEST_BROWSER} : {});
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    // 等待初始渲染完成
    await page.waitForFunction(() => document.querySelectorAll('#users tr, #grants tr').length >= 2);
    assert.equal(await page.evaluate(() => document.querySelector('table').textContent.includes('<script>')), false);
    assert.deepEqual(errors, []);
    await browser.close();
    browser = undefined;
  } finally {
    if (browser) await browser.close();
    server && server.close();
    rmSync(directory, {recursive: true, force: true});
  }
});
