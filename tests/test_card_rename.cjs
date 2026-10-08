// Requires Playwright; optionally set CHOUKA_TEST_BROWSER=msedge.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {createServer} = require('node:http');
const path = require('node:path');
const vm = require('node:vm');
const {chromium} = require('playwright');

const web = path.join(__dirname, '..', 'web');
const source = readFileSync(path.join(web, 'app.js'), 'utf8').replace(/\r\n/g, '\n');
function block(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, start);
  return source.slice(from, to);
}
const rename = block('function renameCard(', 'function cloneCard(');
const title = block('const titleOf =', '/* ================= 风格节点');
const specs = block('const promptSpecs =', '/** 直接挂在这个节点上的文本节点');
const cap = {name:'默认工作流', inputs:[{key:'prompt',type:'textarea'}]};
function contextFor(cards) {
  const context = vm.createContext({
    PROJ:{cards}, selIds:new Set(), selId:'panel', saved:0, refreshed:0,
    capOf:c => c.cap ? cap : null, modeOf:() => ({name:'风格化提示词'}),
    isAsset:c => c.type === 'asset', requireOperate:() => true,
    paintTitle() {}, repanel() { context.refreshed++; }, save() { context.saved++; },
  });
  vm.runInContext(title + specs + rename, context);
  return context;
}

test('batch names replace chained, swapped and regex-special references in one pass', () => {
  const cards = ['A', 'B', 'A+B'].map((name, i) => ({id:String(i),cap:'test',name,params:{}}));
  const reader = {cap:'test',params:{prompt:'@A @B @A+B @A_extra @A中文'},
    opt:{prompt:'@B @A+B'},history:[{prompt:'@A'}]};
  const context = contextFor([...cards, reader]);
  context.applyCardNames(cards.map((card, i) => ({card,name:['B','A','新名称$1'][i]})));
  assert.equal(reader.params.prompt, '@B @A @新名称$1 @A_extra @A中文');
  assert.equal(reader.opt.prompt, '@A @新名称$1');
  assert.equal(reader.history[0].prompt, '@A', 'history must remain unchanged');
  assert.equal(context.saved, 1);
  assert.equal(context.refreshed, 1);
});

test('reset uses displayed default titles, trims names and ignores unchanged or deleted nodes', () => {
  const asset = {id:'asset',type:'asset',name:'图片'};
  const style = {id:'style',name:'风格'};
  const regular = {id:'regular',cap:'test',params:{prompt:'@图片 @风格'}};
  const context = contextFor([asset, style, regular]);
  context.applyCardNames([{card:asset,name:' '},{card:style,name:''}]);
  assert.equal(regular.params.prompt, '@素材节点 @风格化提示词');
  assert.equal(asset.name, null);
  context.applyCardNames([{card:regular,name:'默认工作流'},{card:{name:'已删除'},name:'其他'}]);
  assert.equal(context.saved, 1);
  assert.equal(regular.name, undefined, 'unchanged default title stays implicit');
  context.applyCardNames([{card:regular,name:'  ' + '字'.repeat(45) + '  '}]);
  assert.equal(regular.name, '字'.repeat(40));
});

test('single-card cancel and readonly permission do not save', () => {
  const card = {id:'one',cap:'test',name:'原名',params:{}};
  const context = contextFor([card]);
  context.prompt = () => null;
  context.renameCard(card);
  assert.equal(context.saved, 0);
  context.requireOperate = () => false;
  context.prompt = () => { throw Error('readonly must not prompt'); };
  context.renameCard(card);
  assert.equal(context.saved, 0);
});

// Real card mouse handlers, lasso, toolbar, menu and rename form; unrelated media/panel plumbing is stubbed.
const html = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/style.css">
  <script src="/auth.js"></script>
  <div id="stage" style="position:absolute;left:20px;top:20px;width:1100px;height:740px">
    <div id="world"></div><div id="groups"></div><div id="lasso" style="display:none"></div>
    <div id="selbar" style="display:none"></div>
  </div><div id="menu" style="display:none"></div><script>
  const el = Object.fromEntries(['stage','world','groups','lasso','selbar','menu'].map(id => [id,document.getElementById(id)]));
  const PROJ = {cards:[],edges:[],groups:[]};
  let selIds = new Set(), selId = null, selEdge = null, view = {x:0,y:0,k:1};
  window.saved = 0; window.snapshot = []; window.allowed = true;
  const canOperate = () => allowed, requireOperate = () => allowed;
  const capOf = c => c.cap ? ${JSON.stringify(cap)} : null, modeOf = () => ({name:'风格化提示词'});
  const isAsset = c => c.type === 'asset', isStyle = c => c.type === 'style', isText = c => c.type === 'text';
  const isTextCard = c => isStyle(c) || isText(c), assetOf = () => null, textOp = () => null;
  const defOf = () => ({icon:'N'}), phHTML = () => '<p>节点内容</p>', cardOf = id => PROJ.cards.find(c => c.id === id);
  const IS_MAC = false, VIEW_WORD = {}, KIND_ZH = {}, uid = () => 'group';
  const paintTitle = c => { c._el.querySelector('.t').textContent = titleOf(c); };
  const applySize = () => {}, paint = () => {}, bindCardVideo = () => {}, bindCompare = () => {}, hoverTip = () => {};
  const openHistory = () => {}, openPanel = () => {}, closePanel = () => {}, repanel = () => {};
  const tipHide = () => {}, closeJobs = () => {}, drawWires = () => {}, paintGroups = () => {}, toast = () => {};
  const beginCardsMove = ev => { ev.stopPropagation(); }, save = () => { saved++; snapshot = PROJ.cards.map(({id,name,params}) => ({id,name,params})); };
  const cardRect = c => ({x:c.x,y:c.y,w:268,h:220});
  const toWorld = (x,y) => { const r = el.stage.getBoundingClientRect(); return {x:x-r.left,y:y-r.top}; };
  const closeMenu = () => { el.menu.style.display = 'none'; };
  ${title}
  ${specs}
  ${block('const NODRAG =', '/* 全屏幕只许一个东西在响')}
  ${block('function bboxOf(', '/** 分组框：')}
  ${block('function pick(', '/** 拖角改大小')}
  ${block('function showMenu(', 'const closeMenu =')}
  ${block('function cardMenu(', '/** 把一份产物下载到本地')}
  ${rename}
  ${block('  el.selbar.innerHTML =', '  addEventListener("resize",')}
  ${block('  el.stage.addEventListener("mousedown",', '  el.stage.addEventListener("wheel",')}
  function reset() {
    el.world.replaceChildren(); closeMenu(); selId = null; selIds.clear(); paintSel(); saved = 0;
    PROJ.cards = [
      {id:'a',name:'节点甲',type:'style',x:40,y:100,params:{}},
      {id:'b',name:'节点乙',type:'asset',x:360,y:100,params:{}},
      {id:'c',name:'节点丙',type:'text',x:720,y:400,cap:'test',params:{prompt:'@节点甲 @节点乙'}}
    ];
    for (const c of PROJ.cards) el.world.appendChild(buildCard(c));
  }
  reset();
  </script>`;

test('browser: lasso, right-click, single prompt and one batch form', async t => {
  const server = createServer((req, res) => {
    const file = req.url === '/style.css' ? 'style.css' : req.url === '/auth.js' ? 'auth.js' : null;
    res.setHeader('Content-Type', file === 'style.css' ? 'text/css' : file ? 'text/javascript' : 'text/html; charset=utf-8');
    res.end(file ? readFileSync(path.join(web, file)) : html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
    const page = await browser.newPage({viewport:{width:1280,height:800}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    async function selectTwo() {
      await page.mouse.move(40,100); await page.mouse.down();
      await page.mouse.move(680,380,{steps:5}); await page.mouse.up();
      assert.equal(await page.evaluate(() => selIds.size), 2);
    }
    await t.test('toolbar shows all fields at once and saves all names once', async () => {
      await selectTwo();
      await page.getByRole('button',{name:'批量重命名',exact:true}).click();
      const fields = page.locator('.rename-list input');
      assert.equal(await fields.count(), 2);
      assert.deepEqual(await fields.evaluateAll(items => items.map(i => i.value)), ['节点甲','节点乙']);
      await fields.nth(0).fill('新甲'); await fields.nth(1).fill('新乙');
      assert.equal(await page.evaluate(() => saved), 0, 'typing does not apply names');
      await page.getByRole('button',{name:'确认重命名'}).click();
      await page.locator('dialog').waitFor({state:'detached'});
      assert.deepEqual(await page.evaluate(() => snapshot.map(c => c.name)), ['新甲','新乙','节点丙']);
      assert.equal(await page.evaluate(() => PROJ.cards[2].params.prompt), '@新甲 @新乙');
      assert.equal(await page.evaluate(() => saved), 1);
      assert.equal(await page.evaluate(() => selIds.size), 2);
    });
    await t.test('right-click on selected card preserves the batch; cancel and Escape discard edits', async () => {
      await page.evaluate(() => reset()); await selectTwo();
      await page.locator('.card[data-id="a"] .ch').click({button:'right'});
      assert.equal(await page.evaluate(() => selIds.size), 2);
      await page.getByRole('button',{name:/批量重命名（2 个节点）/}).click();
      await page.locator('.rename-list input').first().fill('不保存');
      await page.getByRole('button',{name:'取消',exact:true}).click();
      await page.locator('dialog').waitFor({state:'detached'});
      assert.equal(await page.evaluate(() => saved), 0);
      await page.getByRole('button',{name:'批量重命名',exact:true}).click();
      await page.keyboard.press('Escape');
      await page.locator('dialog').waitFor({state:'detached'});
      assert.equal(await page.evaluate(() => selIds.size), 2);
      assert.equal(await page.evaluate(() => PROJ.cards[0].name), '节点甲');
    });
    await t.test('clicking one card or right-clicking outside the selection renames only that card', async () => {
      await page.evaluate(() => reset()); await selectTwo();
      await page.locator('.card[data-id="c"] .ch').click({button:'right'});
      assert.equal(await page.evaluate(() => selIds.size), 0);
      page.once('dialog', dialog => dialog.accept('单卡名称'));
      await page.getByRole('button',{name:/重命名节点/}).click();
      assert.deepEqual(await page.evaluate(() => PROJ.cards.map(c => c.name)), ['节点甲','节点乙','单卡名称']);
      await selectTwo();
      await page.locator('.card[data-id="a"] .ch').click();
      assert.equal(await page.evaluate(() => selIds.size), 0);
      await page.locator('.card[data-id="a"] .ch').click({button:'right'});
      page.once('dialog', dialog => dialog.accept('单独修改'));
      await page.getByRole('button',{name:/重命名节点/}).click();
      assert.deepEqual(await page.evaluate(() => PROJ.cards.map(c => c.name)), ['单独修改','节点乙','单卡名称']);
    });
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
