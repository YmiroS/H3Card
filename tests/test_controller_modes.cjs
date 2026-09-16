// Requires Playwright; optionally set CHOUKA_TEST_BROWSER=msedge.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createServer } = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

test('recent jobs show their recorded mode separately from card names', async () => {
  const html = readFileSync(path.join(__dirname, '..', 'web', 'controller.html'));
  const base = {project:'project-1', cardName:'生视频', created:1789535317, progress:1};
  const jobs = [
    {...base, id:'high-quality', status:'done', capability:'minimax_h3_ref_2pass', name:'H3全能参考(高质量)'},
    {...base, id:'image-video', status:'running', capability:'minimax_h3_i2v', name:'H3图生视频', progress:0.5},
    {...base, id:'legacy-id', status:'queued', capability:'legacy_video_mode', progress:0},
    {...base, id:'legacy-unknown', status:'done'},
    {...base, id:'escaped-name', status:'error', name:'<img src=x onerror="window.injected=true">'},
  ];
  const payloads = {
    '/api/health': {ok:true, mode:'controller', server_time:1789535400, started_at:1789535300},
    '/api/status': {running_count:1, queued_count:1},
    '/api/workers': {workers:[]},
    '/api/jobs': {jobs},
    '/api/projects': {projects:[{id:'project-1', name:'模式展示测试'}]},
  };
  const server = createServer((req, res) => {
    if (Object.hasOwn(payloads, req.url)) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(payloads[req.url]));
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(html);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
    const page = await browser.newPage({viewport:{width:1440, height:1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port + '/controller');
    await page.waitForFunction(() => document.querySelectorAll('#job-rows tr').length === 5);
    assert.deepEqual(await page.locator('thead th').allTextContents(),
      ['状态', '项目 / 卡片', '模式', '过程进度', '执行端', '创建时间', '耗时 / 错误']);
    assert.deepEqual(await page.locator('#job-rows .job-mode').allTextContents(),
      ['H3全能参考(高质量)', 'H3图生视频', 'legacy_video_mode', '未记录', jobs[4].name]);
    assert.equal(await page.locator('#job-rows .job-mode').first().getAttribute('title'), 'minimax_h3_ref_2pass');
    assert.equal(await page.locator('#job-rows .job-origin').first().innerText(), '模式展示测试\n卡片 · 生视频');
    assert.equal(await page.locator('#job-rows tr').first().locator('td').count(), 7);
    assert.equal(await page.locator('#job-rows img').count(), 0);
    assert.equal(await page.evaluate(() => window.injected), undefined);
    jobs[0].cardName = '已改名的卡片';
    await page.locator('#refresh').click();
    await page.waitForFunction(() => document.querySelector('#job-rows .job-origin').textContent.includes('已改名的卡片'));
    assert.equal(await page.locator('#job-rows .job-mode').first().textContent(), 'H3全能参考(高质量)');
    if (process.env.CHOUKA_TEST_SCREENSHOT) {
      await page.screenshot({path:process.env.CHOUKA_TEST_SCREENSHOT, fullPage:true});
    }
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
