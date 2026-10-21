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

function cardCopyContext() {
  const image = {kind:'image',ref:'chouka/source.png',url:'/api/upload/source.png'};
  const material = {id:'material',type:'card_asset',cap:'asset',name:'素材1',x:20,y:80,outputs:[image]};
  const style = {id:'style',type:'card_style',cap:'style',name:'风格1',x:20,y:300,params:{style:'手绘风格'}};
  const card = {id:'generator',type:'card_image',cap:'image',name:'生成1',x:400,y:100,
    params:{prompt:'@素材1'},assets:{'images[0]':image,'images[1]':image},outputs:[]};
  const context = vm.createContext({
    PROJ:{id:'source',cards:[material,style,card],edges:[
      {from:'material',to:'generator',slot:'images[0]',slots:['images[0]','images[1]'],version:{job:'fixed',index:1}},
      {from:'style',to:'generator',slot:'@style'},
      {from:'generator',to:'unrelated',slot:'image'},
    ]},
    CARDS:[{id:'card_image'},{id:'card_asset'},{id:'card_style'}], CW:290,
    persistence:require('../web/features/project-persistence.js').create({}), allowed:true, notices:[], created:[], selIds:new Set(), selId:null,
    saved:0, paintSel() {}, closePanel() {}, closeHistory() {},
    requireOperate:() => context.allowed, canOperate:() => context.allowed,
    cardOf:id => context.PROJ.cards.find(card => card.id === id),
    isTextEdge:edge => edge.slot.startsWith('@'),
    isTextCard:card => card.type === 'card_style',
    edgeSlots:edge => edge.slots || [edge.slot], titleOf:card => card.name,
    addCard(type,x,y,cap,select) {
      const card = {id:'new-' + context.created.length,type,x,y,cap};
      context.created.push({card,select}); context.PROJ.cards.push(card); return card;
    },
    paintTitle() {}, applySize() {}, paint() {}, paintKind() {}, paintPort() {},
    drawWires() {}, paintStyles() {}, pick:id => { context.selected = id; context.selIds.clear(); },
    save() { context.saved++; },
    trackNodeWork:promise => promise, toast:text => context.notices.push(text),
    showError:text => context.notices.push(text),
    jpost:async (_url,body) => ({card:JSON.parse(JSON.stringify(body.card))}),
  });
  vm.runInContext(source.slice(source.indexOf('function cloneCard('), source.indexOf('function mergeCollaborativeCard(')) +
    source.slice(source.indexOf('let CLIP = null;'), source.indexOf('const CLIPBOARD_MEDIA_EXT')),context);
  return context;
}

test('same-canvas clone and paste retain incoming slots and original source nodes', async () => {
  const context = cardCopyContext(), original = context.PROJ.cards.find(card => card.id === 'generator');
  const edges = JSON.parse(JSON.stringify(context.PROJ.edges.filter(edge => edge.to === original.id)));
  const clone = await context.cloneCard(original);
  assert.equal(context.PROJ.cards.length,4);
  assert.deepEqual(JSON.parse(JSON.stringify(context.PROJ.edges.filter(edge => edge.to === clone.id))),
    edges.map(edge => ({...edge,to:clone.id})));
  context.copyCard(original);
  const pasted = await context.pasteCard();
  assert.equal(context.PROJ.cards.length,5);
  assert.deepEqual(JSON.parse(JSON.stringify(context.PROJ.edges.filter(edge => edge.to === pasted.id))),
    edges.map(edge => ({...edge,to:pasted.id})));
  assert.ok(context.created.every(item => item.select === false));
  assert.equal(pasted.references,undefined);
  assert.notEqual(pasted.assets,original.assets);
});

test('cross-canvas paste copies each incoming source once and remaps only incoming wires', async () => {
  const context = cardCopyContext();
  context.copyCard(context.PROJ.cards.find(card => card.id === 'generator'));
  context.PROJ = {id:'target',cards:[],edges:[]};
  const pasted = await context.pasteCard();
  assert.equal(context.PROJ.cards.length,3);
  const material = context.PROJ.cards.find(card => card.type === 'card_asset');
  const style = context.PROJ.cards.find(card => card.type === 'card_style');
  assert.equal(context.PROJ.edges.length,2);
  assert.deepEqual([...context.PROJ.edges.map(edge => edge.from)].sort(),[material.id,style.id].sort());
  assert.ok(context.PROJ.edges.every(edge => edge.to === pasted.id));
  assert.deepEqual(JSON.parse(JSON.stringify(pasted.assets['images[0]'])),JSON.parse(JSON.stringify(material.outputs[0])));
  assert.equal(pasted.sourceProject,undefined);
  assert.equal(pasted.references,undefined);
});

test('copy reconstructs missing wires from exact material references without filename guessing', async () => {
  const context = cardCopyContext(), card = context.PROJ.cards.find(item => item.id === 'generator');
  context.PROJ.edges = [];
  card.assets.other = {kind:'image',url:'/api/upload/unrelated.png',filename:'source.png'};
  const pasted = await context.cloneCard(card);
  assert.equal(context.PROJ.edges.length,2);
  assert.ok(context.PROJ.edges.every(edge => edge.from === 'material' && edge.to === pasted.id));
});

test('cross-canvas generation references become materials with the consumed version, not upstream tasks', async () => {
  const context = cardCopyContext(), sourceCard = context.PROJ.cards.find(card => card.id === 'material');
  sourceCard.type = 'card_image'; sourceCard.cap = 'image'; sourceCard.job = 'running-job';
  sourceCard.params = {prompt:'upstream prompt'};
  sourceCard.assets = {image:{ref:'chouka/not-needed.png'}};
  sourceCard.outputs = [{kind:'image',ref:'chouka/newer.png',url:'/api/upload/newer.png'}];
  context.copyCard(context.PROJ.cards.find(card => card.id === 'generator'));
  context.PROJ = {id:'target',cards:[],edges:[]};
  await context.pasteCard();
  const material = context.PROJ.cards.find(card => card.type === 'card_asset');
  assert.equal(material.outputs.length,1);
  assert.equal(material.outputs[0].ref,'chouka/source.png');
  assert.equal(material.job,undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(material.assets)),{});
});

test('paste discards delayed cross-canvas response after the canvas changes', async () => {
  const context = cardCopyContext();
  context.copyCard(context.PROJ.cards.find(card => card.id === 'generator'));
  context.PROJ = {id:'target',cards:[],edges:[]};
  let reply;
  context.jpost = (_url,body) => new Promise(resolve => { reply = () => resolve({card:body.card}); });
  const pending = context.pasteCard();
  context.PROJ = {id:'other',cards:[],edges:[]};
  reply(); await pending;
  assert.equal(context.PROJ.cards.length,0);
  assert.match(context.notices.at(-1),/画布已切换/);
});

test('batch paste preserves relative positions, remaps internal wires and keeps external inputs', async () => {
  const context = cardCopyContext();
  context.selIds = new Set(['material','generator','missing']);
  context.copyCard();
  context.PROJ.cards[2].params.prompt = '复制后修改';
  const pasted = await context.pasteCard();
  assert.equal(pasted.length,2);
  const [material, generator] = pasted;
  assert.deepEqual([generator.x - material.x,generator.y - material.y],[380,20]);
  assert.deepEqual([material.x,material.y],[44,108]);
  assert.equal(generator.params.prompt,'@素材1');
  assert.equal(context.saved,1);
  assert.deepEqual([...context.selIds],Array.from(pasted,card => card.id));
  const edges = context.PROJ.edges.filter(edge => edge.to === generator.id);
  assert.deepEqual(edges.map(edge => edge.from),[material.id,'style']);
  assert.deepEqual(JSON.parse(JSON.stringify(edges[0].slots)),['images[0]','images[1]']);
  assert.deepEqual(JSON.parse(JSON.stringify(edges[0].version)),{job:'fixed',index:1});
  const again = await context.pasteCard();
  assert.equal(again.length,2);
  assert.ok(again.every(card => !pasted.some(previous => previous.id === card.id)));
  assert.deepEqual([again[0].x,again[0].y],[68,136]);
});

test('cross-canvas batch paste copies shared references once without converting selected generators', async () => {
  const context = cardCopyContext();
  const original = context.PROJ.cards[2];
  context.PROJ.cards.push({...original,id:'second',x:800,y:250,
    assets:{'images[0]':{kind:'image',ref:'chouka/other.png',url:'/api/upload/other.png'}}});
  context.PROJ.edges.push({from:'material',to:'second',slot:'images[0]'},
    {from:'generator',to:'second',slot:'image'});
  context.selIds = new Set(['generator','second']);
  context.copyCard(original);
  context.PROJ = {id:'target',cards:[],edges:[]};
  const pasted = await context.pasteCard();
  assert.equal(pasted.length,2);
  assert.ok(pasted.every(card => card.type === 'card_image'));
  assert.equal(context.PROJ.cards.length,4);
  const material = context.PROJ.cards.find(card => card.type === 'card_asset');
  assert.deepEqual(Array.from(material.outputs,output => output.ref),['chouka/source.png','chouka/other.png']);
  assert.ok(context.PROJ.edges.some(edge => edge.from === pasted[0].id && edge.to === pasted[1].id));
  assert.equal(context.PROJ.edges.filter(edge => edge.from === material.id).length,2);
  assert.deepEqual([pasted[1].x - pasted[0].x,pasted[1].y - pasted[0].y],[400,150]);
  assert.equal(context.saved,1);
});

test('batch paste is all-or-nothing on copy API failure, canvas changes or unavailable node types', async () => {
  for (const failure of ['api','project','permission','type']) {
    const context = cardCopyContext();
    context.selIds = new Set(['material','generator']); context.copyCard();
    context.PROJ = {id:'target',cards:[],edges:[]};
    context.jpost = async (_url,body) => {
      assert.equal(body.card.cards.length,2);
      if (failure === 'api') throw new Error('复制失败');
      if (failure === 'project') context.PROJ = {id:'other',cards:[],edges:[]};
      if (failure === 'permission') context.allowed = false;
      if (failure === 'type') body.card.cards[1].type = 'unavailable';
      return {card:body.card};
    };
    await context.pasteCard();
    assert.equal(context.created.length,0,failure);
    assert.equal(context.saved,0,failure);
    assert.match(context.notices.at(-1),/粘贴失败/,failure);
  }
});

test('copying an unselected card stays single and readonly paste does not insert', async () => {
  const context = cardCopyContext();
  context.selIds = new Set(['material','style']);
  context.copyCard(context.PROJ.cards[2]);
  context.allowed = false;
  await context.pasteCard();
  assert.equal(context.created.length,0);
  context.allowed = true;
  const pasted = await context.pasteCard();
  assert.equal(pasted.type,'card_image');
  assert.equal(context.created.length,1);
});

test('history uses persisted job snapshots after reload and keeps each submission distinct', async () => {
  const card = {id:'card-1', job:'job-1', status:'running', cap:'changed-mode',
    params:{prompt:'运行中改过的输入', negative_prompt:'改过的负面提示词'}};
  const prompt = {key:'prompt', label:'提示词', text:'提交时合并风格和引用的文本'};
  const job = {id:'job-1', capability:'zimage_i2i', status:'done', seed:123,
    outputs:[{url:'/same-output.png', kind:'image'}], prompts:[prompt]};
  const context = vm.createContext({
    PROJ:JSON.parse(JSON.stringify({cards:[card], edges:[]})), TASKS:[],
    document:{addEventListener() {}},
    el:{jobs:{style:{display:'none'}}, panel:{}, hist:{}},
    api:async () => ({jobs:[job]}),
    paintJobsBtn() {}, paint() {}, drawWires() {}, toast() {}, save() {},
    isIF:() => false, propagateCardOutputs:async () => {},
    canOperate:() => true, canTask:() => true,
  });
  vm.runInContext(
    source.slice(source.indexOf('const HIST_MAX'), source.indexOf('async function copyHistoryText(')) +
    source.slice(source.indexOf('const plain ='), source.indexOf('/** 保存串行化')),
    context,
  );
  context.pollJobs = require('./helpers/task-updater.cjs').taskUpdater(context);
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
    window.messages = []; const toast = text => messages.push(text), showError = text => messages.push(text);
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
