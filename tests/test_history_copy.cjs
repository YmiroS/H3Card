// Requires Playwright; optionally set CHOUKA_TEST_BROWSER=msedge.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {createServer} = require('node:http');
const path = require('node:path');
const vm = require('node:vm');
const {chromium} = require('playwright');

const web = path.join(__dirname, '..', 'web');
const source = readFileSync(path.join(web, 'app.js'), 'utf8');
const functions = source.slice(source.indexOf('async function copyHistoryText('), source.indexOf('/* ================= 参数面板'));

test('history uses persisted job snapshots after reload and keeps each submission distinct', async () => {
  const card = {id:'card-1', job:'job-1', status:'running', cap:'changed-mode',
    params:{prompt:'运行中改过的输入', negative_prompt:'改过的负面提示词'}};
  const prompt = {key:'prompt', label:'提示词', text:'提交时合并风格和引用的文本'};
  const job = {id:'job-1', capability:'zimage_i2i', status:'done', seed:123,
    outputs:[{url:'/same-output.png', kind:'image'}], prompts:[prompt]};
  const context = vm.createContext({
    PROJ:JSON.parse(JSON.stringify({cards:[card], edges:[]})), TASKS:[],
    el:{jobs:{style:{display:'none'}}, panel:{}, hist:{}},
    api:async () => ({jobs:[job]}),
    paintJobsBtn() {}, paint() {}, drawWires() {}, toast() {}, save() {},
  });
  vm.runInContext(
    source.slice(source.indexOf('const HIST_MAX'), source.indexOf('async function copyHistoryText(')) +
    source.slice(source.indexOf('const plain ='), source.indexOf('/** 保存串行化')) +
    source.slice(source.indexOf('async function pollJobs()'), source.indexOf('/* ================= 任务浮窗')),
    context,
  );
  await context.pollJobs();
  const current = context.PROJ.cards[0];
  assert.equal(current.history[0].cap, 'zimage_i2i');
  assert.equal(current.history[0].prompts[0].text, prompt.text);
  const saved = vm.runInContext('JSON.stringify(PROJ.cards.map(plain))', context);
  assert.equal(JSON.parse(saved)[0].history[0].prompts[0].text, prompt.text);
  job.prompts[0].text = '第二次提交';
  assert.notEqual(current.history[0].prompts[0].text, job.prompts[0].text);
  job.id = 'job-2';
  current.job = job.id; current.status = 'queued';
  await context.pollJobs();
  assert.equal(current.history.length, 2, 'different jobs may reuse an output URL');
  assert.equal(current.history[0].job, 'job-2');
  assert.equal(current.history[0].prompts[0].text, '第二次提交');
  context.pushHistory(current, job);
  assert.equal(current.history.length, 2, 'polling must not duplicate the same job');
  const oldCard = {cap:'zimage_t2i', params:{prompt:'不能冒充历史'}, outputs:job.outputs};
  context.seedHistory(oldCard);
  assert.equal(oldCard.history[0].prompts, undefined);
  context.pushHistory(oldCard, {id:'legacy-job', capability:'zimage_t2i'});
  assert.equal(oldCard.history[0].prompts, undefined);
  assert.equal(oldCard.history[0].user_prompt, undefined);
});

test('history copying is independent of prompt expansion and supports HTTP clipboard fallback', async () => {
  const html = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/style.css">
    <div id="fixture" style="width:290px"></div><script>
    const CAPS = {}, histTime = () => '12:00', fmtEla = () => '1秒', prepareVideos = () => {};
    window.messages = []; const toast = text => messages.push(text);
    window.record = {seed:12345, user_prompt:'正面提示词\\nsecond line', negative_prompt:'负面提示词', prompt:'完整提交提示词\\n中文 & <tags> "quoted"'};
    ${functions}
    document.getElementById('fixture').appendChild(histRun({}, record, true));
    </script>`;
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/style.css' ? 'text/css' : 'text/html; charset=utf-8');
    res.end(req.url === '/style.css' ? readFileSync(path.join(web, 'style.css')) : html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
    const context = await browser.newContext({permissions:['clipboard-read','clipboard-write']});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = 'http://127.0.0.1:' + server.address().port;
    await page.goto(url);
    await page.evaluate(() => {
      window.readClipboard = navigator.clipboard.readText.bind(navigator.clipboard);
    });
    const clipboardText = () => page.evaluate(async () =>
      (await window.readClipboard()).replace(/\r\n/g, '\n'));
    const copy = page.locator('.history-prompt-copy');
    const summary = page.locator('.history-prompt summary');
    const isOpen = () => page.locator('.history-prompt details').evaluate(el => el.open);
    const expected = await page.evaluate(() => record.prompt);
    const clickCopy = async button => {
      const count = await page.evaluate(() => messages.length);
      await button.click();
      await page.waitForFunction(count => messages.length > count, count);
      assert.match(await page.evaluate(() => messages.at(-1)), /^已复制/);
    };
    for (const fallback of [false, true]) {
      if (fallback) await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {configurable:true, value:undefined}));
      await page.bringToFront();
      assert.equal(await isOpen(), false);
      await clickCopy(copy);
      assert.equal(await isOpen(), false, 'copy must not expand a collapsed prompt');
      assert.equal(await clipboardText(), expected);
      await summary.click();
      assert.equal(await isOpen(), true);
      await clickCopy(copy);
      assert.equal(await isOpen(), true, 'copy must not collapse an expanded prompt');
      assert.equal(await clipboardText(), expected);
      await copy.focus();
      const beforeKeyboard = await page.evaluate(() => messages.length);
      await page.keyboard.press('Enter');
      await page.waitForFunction(count => messages.length > count, beforeKeyboard);
      assert.equal(await isOpen(), true);
      await summary.click();
      assert.equal(await isOpen(), false);
      await clickCopy(page.locator('.rs button'));
      assert.equal(await clipboardText(), '12345');
      const imagePrompts = page.locator('.hrun > details');
      await imagePrompts.locator('summary').click();
      for (const [index, key] of [[0, 'user_prompt'], [1, 'negative_prompt']]) {
        await imagePrompts.locator('button').nth(index).click();
        assert.equal(await clipboardText(), await page.evaluate(key => record[key], key));
        assert.equal(await imagePrompts.evaluate(el => el.open), true);
      }
      await imagePrompts.locator('summary').click();
    }
    await page.evaluate(() => { document.execCommand = () => false; });
    await copy.click();
    assert.match(await page.evaluate(() => messages.at(-1)), /复制失败/);
    assert.equal(await isOpen(), false);
    assert.equal(await page.locator('textarea').count(), 0);
    assert.equal(await copy.evaluate(el => el === document.activeElement), true);
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{
        writeText: async text => { window.copiedPrompt = text; },
      }});
      window.snapshot = {prompts:[
        {key:'prompt', label:'提示词', text:'优化后的实际提示词\n<Picture 1>'},
        {key:'prompt2', label:'提示词2', text:'第二组分镜'},
        {key:'negative_prompt', label:'负面提示词', text:'模糊、噪点'},
        {key:'prompt3', label:'提示词3', text:''},
      ]};
      document.getElementById('fixture').replaceChildren(histRun({}, snapshot, true));
    });
    const sections = page.locator('.history-prompt');
    assert.equal(await sections.count(), 4);
    for (let i = 0; i < 4; i++) {
      const section = sections.nth(i);
      const prompt = await page.evaluate(i => snapshot.prompts[i], i);
      assert.equal(await section.locator('summary').textContent(), '当时提交的' + prompt.label);
      await section.locator('button').click();
      assert.equal(await page.evaluate(() => copiedPrompt), prompt.text);
      assert.equal(await section.locator('details').evaluate(el => el.open), false);
      await section.locator('summary').click();
      assert.equal(await section.locator('details > div').textContent(), prompt.text || '（本次提交为空）');
      await section.locator('button').click();
      assert.equal(await section.locator('details').evaluate(el => el.open), true);
    }
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
