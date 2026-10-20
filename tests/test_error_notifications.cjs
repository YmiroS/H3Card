'use strict';
// Real frontend files, local HTTP fixtures only; never sends generation requests to a provider.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync, existsSync} = require('node:fs');
const {createServer} = require('node:http');
const path = require('node:path');
const {chromium, expect} = require('playwright/test');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');

async function fixture() {
  const project = {id:'notice-test', name:'顶部错误通知验收', permission:'operate', owner_id:'notice-user',
    rev:0, cards:[{id:'video-test', name:'视频测试', type:'card_video', cap:'minimax_h3_character_transfer',
      x:300, y:220, params:{}, assets:{}, outputs:[], status:'running', job:'notice-job'}], edges:[], groups:[]};
  const state = {job:{id:'notice-job', card:'video-test', project:project.id, permission:'operate', status:'running'}, saveError:false};
  const caps = Object.fromEntries(['minimax_h3_character_transfer'].map(id =>
    [id, JSON.parse(readFileSync(path.join(root, 'manifests', id + '.json'), 'utf8'))]));
  const json = (res, value, status = 200) => {
    res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(value));
  };
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost'), p = url.pathname;
    if (p === '/api/auth/me') return json(res, {user:{id:'notice-user', username:'测试账号', role:'admin'}, csrf_token:'test'});
    if (p === '/api/cards') return json(res, {cards:JSON.parse(readFileSync(path.join(root, 'manifests/_cards.json'), 'utf8')), capabilities:caps});
    if (p === '/api/health') return json(res, {comfy_online:true});
    if (p === '/api/jobs') return json(res, {jobs:[state.job]});
    if (p === '/api/projects' && req.method === 'POST') {req.resume(); return json(res, {error:'模拟新建被拒绝'}, 503);}
    if (p === '/api/projects/notice-test' && req.method === 'DELETE') return json(res, {error:'模拟删除被拒绝'}, 503);
    if (p === '/api/projects') return json(res, {projects:[{...project, cards:1}]});
    if (p.endsWith('/presence')) { req.resume(); return json(res, {ok:true, users:[], online_users:1}); }
    if (p === '/api/projects/notice-test') {
      if (req.method === 'PUT') {
        req.resume(); return state.saveError ? json(res, {error:'模拟保存失败，内容仍在当前画布'}, 503) : json(res, {ok:true, rev:++project.rev});
      }
      return json(res, project);
    }
    if (p === '/api/generate') {req.resume(); return json(res, {error:'模拟任务提交失败'}, 503);}
    if (p === '/__fixture/fail') {state.job = {...state.job, status:'error', error:'参考视频时长太短，请更换为 4–30 秒的视频。'}; return json(res, {ok:true});}
    if (p === '/component') {
      res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
      return res.end('<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/admin-shell.css"><body><button id="outside">普通操作</button><script src="/auth.js"></script><script src="/admin-shell.js"></script></body>');
    }
    const name = p === '/' ? 'index.html' : p.slice(1);
    if (name && !name.includes('..') && existsSync(path.join(web, name)) && /\.(html|js|css|png)$/.test(name)) {
      res.writeHead(200, {'Content-Type':name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : name.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8'});
      return res.end(readFileSync(path.join(web, name)));
    }
    res.writeHead(404); res.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {state, origin:`http://127.0.0.1:${server.address().port}`, close:() => new Promise(resolve => {server.close(resolve); server.closeAllConnections();})};
}
async function withPage(run) {
  const f = await fixture(), browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
  try {
    const page = await browser.newPage({viewport:{width:1440, height:900}}), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => new URL(route.request().url()).origin === f.origin ? route.continue() : route.abort());
    await run(page, f); assert.deepEqual(errors, []);
  } finally { await browser.close(); await f.close(); }
}

if (process.argv.includes('--preview')) {
  fixture().then(f => {console.log('NOTIFICATION_PREVIEW ' + f.origin + '/?project=notice-test');});
} else {
  test('shared errors: persistent, safe text, deduplicated, responsive, individually dismissible', async () => withPage(async (page, f) => {
    await page.goto(f.origin + '/component');
    await page.clock.install();
    const message = '上传失败：<img src=x onerror="window.injected=true">\n' + '详细原因 '.repeat(180);
    await page.evaluate(text => {H3Notify.error(text); H3Notify.error(text); H3Notify.error('保存失败：第二条独立错误');}, message);
    await expect(page.locator('.h3-error-item')).toHaveCount(2);
    await expect(page.locator('#h3-errors img')).toHaveCount(0);
    assert.equal(await page.evaluate(() => window.injected), undefined);
    await page.clock.fastForward(60000);
    await expect(page.locator('#h3-errors')).toBeVisible();
    assert.equal(await page.locator('.h3-error-message').first().textContent(), message);
    for (const width of [1440, 375]) {
      await page.setViewportSize({width, height:800});
      const rect = await page.locator('#h3-errors').boundingBox();
      assert.ok(rect.y >= 0 && rect.y < 60 && rect.x >= 0 && rect.x + rect.width <= width);
      assert.equal(await page.locator('#h3-errors').evaluate(node => node.scrollWidth <= node.clientWidth), true);
    }
    await page.locator('.h3-error-item button').last().click();
    await expect(page.locator('.h3-error-item')).toHaveCount(1);
    await page.getByRole('button', {name:'关闭全部错误通知', exact:true}).click();
    await expect(page.locator('#h3-errors')).toBeHidden();
    await page.evaluate(() => H3Notify.error('关闭后可再次提示'));
    await expect(page.locator('.h3-error-item')).toHaveCount(1);
  }));

  test('modal failure stays above top layer, keyboard reachable, survives modal removal', async () => withPage(async (page, f) => {
    await page.goto(f.origin + '/component');
    await page.evaluate(() => {
      window.modal = AdminUI.dialog({title:'测试保存', body:'<input name="name" value="保留输入">', onSubmit:async () => {throw new Error('保存失败：输入已保留');}});
    });
    await page.locator('dialog button[type=submit]').click();
    await expect(page.locator('dialog #h3-errors')).toBeVisible();
    await expect(page.locator('dialog input')).toHaveValue('保留输入');
    const button = page.getByRole('button', {name:'关闭全部错误通知', exact:true});
    await button.focus(); await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), '关闭此错误通知');
    await page.keyboard.press('Enter'); await expect(page.locator('#h3-errors')).toBeHidden();
    await page.evaluate(() => { H3Notify.error('弹窗关闭后仍保留错误'); window.modal.close(); });
    await expect(page.locator('body > #h3-errors')).toBeVisible();
    await button.click(); await expect(page.locator('#h3-errors')).toBeHidden();
    // An already visible error must also move above a subsequently opened modal.
    await page.evaluate(() => {H3Notify.error('较早的错误'); window.modal = AdminUI.dialog({title:'稍后打开的弹窗', body:'<input>'});});
    await expect(page.locator('dialog #h3-errors')).toBeVisible();
    await button.click();
  }));

  test('embedded editor errors forward to the parent component and coexist with maintenance', async () => withPage(async (page, f) => {
    await page.goto(f.origin + '/component');
    await page.evaluate(() => {
      const banner = document.createElement('div'); banner.id = 'maintenance-banner'; document.body.append(banner);
      const frame = document.createElement('iframe'); frame.src = '/component'; document.body.append(frame);
    });
    const child = page.frameLocator('iframe'); await expect(child.locator('#outside')).toBeVisible();
    await page.frames()[1].evaluate(() => H3Notify.error('节点编辑器保存失败'));
    await expect(page.locator('#h3-errors')).toContainText('节点编辑器保存失败');
    await expect(child.locator('#h3-errors')).toHaveCount(0);
    assert.equal((await page.locator('#h3-errors').boundingBox()).y, 56);
    await page.getByRole('button', {name:'关闭全部错误通知', exact:true}).click();
  }));

  test('project creation and deletion failures use the component and preserve current canvas', async () => withPage(async (page, f) => {
    await page.goto(f.origin + '/?project=notice-test');
    await page.waitForFunction(() => typeof PROJ !== 'undefined' && PROJ?.id === 'notice-test');
    page.on('dialog', dialog => dialog.accept(dialog.type() === 'prompt' ? '测试新建' : undefined));
    await page.locator('#newproj').click();
    await expect(page.locator('#h3-errors')).toContainText('新建画布失败：模拟新建被拒绝');
    await page.getByRole('button', {name:'关闭全部错误通知', exact:true}).click();
    await page.locator('#plist .del').click();
    await expect(page.locator('#h3-errors')).toContainText('删除画布失败：模拟删除被拒绝');
    assert.equal(await page.evaluate(() => PROJ.id), 'notice-test');
  }));

  test('real canvas task, submission and save errors use shared notification; success stays separate', async () => withPage(async (page, f) => {
    await page.goto(f.origin + '/?project=notice-test');
    await page.waitForFunction(() => typeof PROJ !== 'undefined' && PROJ?.cards?.length === 1);
    f.state.job = {...f.state.job, status:'error', error:'参考视频时长太短，请更换为 4–30 秒的视频。'};
    await page.evaluate(() => pollJobs());
    await expect(page.locator('#h3-errors')).toContainText('「视频测试」生成失败：参考视频时长太短');
    assert.equal(await page.evaluate(() => el.toast.textContent), '');
    if (process.env.CHOUKA_TEST_SCREENSHOT) await page.screenshot({path:process.env.CHOUKA_TEST_SCREENSHOT});
    await page.evaluate(() => pollJobs());
    await expect(page.locator('.h3-error-item')).toHaveCount(1);
    await page.getByRole('button', {name:'关闭全部错误通知', exact:true}).click();
    await page.evaluate(() => pollJobs()); await expect(page.locator('#h3-errors')).toBeHidden();
    await page.evaluate(() => toast('已保存成功'));
    await expect(page.locator('#toast')).toHaveText('已保存成功');
    await expect(page.locator('#h3-errors')).toBeHidden();
    f.state.saveError = true;
    await page.evaluate(() => enqueueSave(PROJ.id));
    await expect(page.locator('#h3-errors')).toContainText('模拟保存失败');
    await page.getByRole('button', {name:'关闭全部错误通知', exact:true}).click();
    f.state.saveError = false;
    await page.evaluate(() => runCard(PROJ.cards[0]));
    await expect(page.locator('#h3-errors')).toContainText('模拟任务提交失败');
  }));
}
