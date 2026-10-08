// 几何用例不依赖浏览器；交互用例需要 Playwright，可通过 NODE_PATH 提供已有安装。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const web = path.join(__dirname, '..', 'web');
const source = readFileSync(path.join(web, 'app.js'), 'utf8').replace(/\r\n/g, '\n');
function block(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `无法抽取真实代码：${start}`);
  return source.slice(from, to);
}
const geometry = [
  block('const CW =', 'const EDITOR_TARGET ='),
  block('function cardRect(', '/** 找一块空地'),
  block('function alignSelectedCards(', '/** 框选状态'),
].join('\n');
const labels = ['左对齐', '右对齐', '顶部对齐', '底部对齐', '垂直居中对齐'];
const modes = ['left', 'right', 'top', 'bottom', 'center'];
const plain = value => JSON.parse(JSON.stringify(value));

function geometryFixture() {
  const cards = [
    {id:'a', x:40.5, y:20.25, w:120.5, actualHeight:80},
    {id:'b', x:-60.25, y:-30.5, w:200.25, actualHeight:140},
    {id:'c', x:-100.75, y:20.25, w:90.75, actualHeight:60},
    {id:'d', x:-100.75, y:20.25, w:150.5, actualHeight:100},
    {id:'outside', x:900, y:800, w:268, actualHeight:230},
  ];
  const reads = [];
  for (const c of cards) {
    // 持久化正文高度故意与实际整卡高度不符，避免测试误用 c.h。
    c.h = 999; c.params = {prompt:c.id}; c.outputs = [{url:`/${c.id}.png`}];
    c._el = {style:{left:c.x + 'px', top:c.y + 'px'}};
    Object.defineProperty(c._el, 'offsetHeight', {get() {
      reads.push({id:c.id, positions:cards.map(c => [c.x,c.y])});
      return c.actualHeight;
    }});
  }
  const calls = {guard:0, drawWires:0, placePanel:0, updateMinimap:0, save:0};
  const context = vm.createContext({
    PROJ:{id:'same-id', cards, edges:[{from:'a',to:'outside',slot:'image'}], groups:[{id:'g',name:'保留分组',cards:['a','outside']}]},
    selIds:new Set(['d','c','b','a','missing']), allowed:true, calls, menus:[],
  });
  context.canOperate = () => context.allowed;
  context.requireOperate = () => { calls.guard++; return context.allowed; };
  for (const name of ['drawWires','placePanel','updateMinimap','save']) context[name] = () => calls[name]++;
  context.showMenu = (x,y,title,items) => context.menus.push({x,y,title,items});
  vm.runInContext(geometry, context, {filename:'app.js:节点排列真实函数'});
  return {context, cards, calls, reads};
}
const effects = calls => Object.fromEntries(['drawWires','placePanel','updateMinimap','save'].map(k => [k,calls[k]]));
const once = {drawWires:1,placePanel:1,updateMinimap:1,save:1};
const never = {drawWires:0,placePanel:0,updateMinimap:0,save:0};

// 预期坐标是独立手算的数据，不在测试中重新实现排列算法。
const expected = {
  left: [[-100.75,341.5],[-100.75,-30.5],[-100.75,133.5],[-100.75,217.5]],
  right:[[40.5,341.5],[-39.25,-30.5],[70.25,133.5],[10.5,217.5]],
  center:[[-30.125,341.5],[-70,-30.5],[-15.25,133.5],[-45.125,217.5]],
  top:[ [412.75,-30.5],[188.5,-30.5],[-100.75,-30.5],[14,-30.5]],
  bottom:[[412.75,40.25],[188.5,-19.75],[-100.75,60.25],[14,20.25]],
};
for (const mode of modes) test(`几何：${mode} 实际尺寸、稳定顺序、负坐标小数、间隔及幂等`, () => {
  const {context:s,cards,calls,reads} = geometryFixture();
  const before = cards.map(c => [c.x,c.y]);
  const outside = plain(cards[4]);
  const metadata = plain(cards.map(({x,y,_el,...rest}) => rest));
  const edges = plain(s.PROJ.edges), groups = plain(s.PROJ.groups);
  const selected = [...s.selIds];
  s.alignSelectedCards(mode);
  assert.deepEqual(cards.slice(0,4).map(c => [c.x,c.y]), expected[mode]);
  assert.deepEqual(reads.map(r => r.id), ['a','b','c','d']);
  for (const read of reads) assert.deepEqual(read.positions, before, '所有尺寸须在位置写回前快照');
  assert.deepEqual(effects(calls), once);
  assert.equal(calls.guard, 1);
  for (const c of cards.slice(0,4)) {
    assert.equal(c._el.style.left, c.x + 'px');
    assert.equal(c._el.style.top, c.y + 'px');
  }
  const column = ['left','right','center'].includes(mode);
  const order = (column ? [1,2,3,0] : [2,3,1,0]).map(i => cards[i]);
  for (let i = 1; i < order.length; i++) {
    const a = order[i - 1], b = order[i];
    assert.equal(column ? b.y - a.y - a.actualHeight : b.x - a.x - a.w, 24);
  }
  if (mode === 'center') assert.equal(new Set(order.map(c => c.x + c.w / 2)).size, 1);
  assert.deepEqual(plain(cards[4]), outside);
  assert.deepEqual(plain(cards.map(({x,y,_el,...rest}) => rest)), metadata);
  assert.deepEqual(plain(s.PROJ.edges), edges);
  assert.deepEqual(plain(s.PROJ.groups), groups);
  assert.deepEqual([...s.selIds], selected);
  assert.deepEqual(cards.map(c => c.id), ['a','b','c','d','outside']);
  for (let i = 0; i < 3; i++) s.alignSelectedCards(mode);
  assert.deepEqual(cards.slice(0,4).map(c => [c.x,c.y]), expected[mode]);
  assert.deepEqual(effects(calls), once, '重复同项不得再次刷新或保存');
});

test('几何：横向排列在原 x 相同时按原 y 排序，再保持完全同位置的项目顺序', () => {
  for (const mode of ['top','bottom']) {
    const {context:s,calls} = geometryFixture();
    s.PROJ.cards = [
      {id:'a',x:-30.5,y:50,w:80},
      {id:'b',x:-30.5,y:-20.25,w:100},
      {id:'c',x:-30.5,y:-20.25,w:120},
    ];
    s.selIds = new Set(['c','a','b']);
    s.alignSelectedCards(mode);
    assert.deepEqual(s.PROJ.cards.map(c => c.x), [237.5,-30.5,93.5]);
    assert.deepEqual(s.PROJ.cards.map(c => c.y), Array(3).fill(mode === 'top' ? -20.25 : 50));
    assert.deepEqual(effects(calls), once);
    s.alignSelectedCards(mode);
    assert.deepEqual(effects(calls), once);
  }
});

test('几何：无 DOM 时使用真实 cardRect 默认尺寸', () => {
  const {context:s,calls} = geometryFixture();
  s.PROJ.cards = [{id:'a',x:20,y:40},{id:'b',x:-10,y:0,w:180,h:999}];
  s.alignSelectedCards('right');
  assert.deepEqual(s.PROJ.cards.map(c => [c.x,c.y]), [[20,254],[108,0]]);
  assert.deepEqual(effects(calls), once);
});

test('守卫：只读、无项目、未知模式及不足两个有效选择均不写入', () => {
  for (const condition of ['readonly','no-project','bad-mode','none','one','invalid']) {
    const {context:s,cards,calls} = geometryFixture();
    const before = plain(cards);
    if (condition === 'readonly') s.allowed = false;
    if (condition === 'no-project') s.PROJ = null;
    if (condition === 'none') s.selIds.clear();
    if (condition === 'one') s.selIds = new Set(['a','missing']);
    if (condition === 'invalid') s.selIds = new Set(['gone','missing']);
    s.alignSelectedCards(condition === 'bad-mode' ? 'diagonal' : 'left');
    assert.deepEqual(plain(cards), before, condition);
    assert.deepEqual(effects(calls), never, condition);
    assert.equal(calls.guard, condition === 'no-project' ? 0 : 1, condition);
    if (condition !== 'bad-mode') {
      assert.equal(s.selectionMenu(30,40), false, condition);
      assert.equal(s.menus.length, 0, condition);
    }
  }
});

test('菜单：五项映射、布尔返回值以及回调重新校验权限和有效选择', () => {
  for (const [index,mode] of modes.entries()) {
    const {context:s,cards,calls} = geometryFixture();
    assert.equal(s.selectionMenu(123,456), true);
    const menu = s.menus[0];
    assert.deepEqual([menu.x,menu.y,menu.title], [123,456,'选中节点']);
    assert.deepEqual(Array.from(menu.items, item => item.text), ['对齐方式', '批量重命名（4 个节点）']);
    assert.deepEqual(Array.from(menu.items[0].children, item => item.text), labels);
    menu.items[0].children[index].run();
    assert.deepEqual(cards.slice(0,4).map(c => [c.x,c.y]), expected[mode]);
    assert.deepEqual(effects(calls), once);
  }
  for (const change of ['permission','selection','deleted']) {
    const {context:s,calls} = geometryFixture();
    s.selectionMenu(1,2);
    if (change === 'permission') s.allowed = false;
    if (change === 'selection') s.selIds = new Set(['a','missing']);
    if (change === 'deleted') s.PROJ.cards = s.PROJ.cards.filter(c => c.id === 'a');
    const before = plain(s.PROJ);
    s.menus[0].items[0].children[0].run();
    assert.deepEqual(plain(s.PROJ), before, change);
    assert.equal(calls.guard, 1);
    assert.deepEqual(effects(calls), never);
  }
});

test('菜单：按 PROJ 对象身份阻止切换项目后的旧回调，包括同 id 新对象', () => {
  for (const replacement of ['different-id','same-id','closed']) {
    const {context:s,calls} = geometryFixture();
    const original = s.PROJ, before = plain(original);
    s.selectionMenu(10,20);
    s.PROJ = replacement === 'closed' ? null : {...original,id:replacement === 'same-id' ? original.id : 'other'};
    for (const item of [...s.menus[0].items[0].children, s.menus[0].items[1]]) item.run();
    assert.deepEqual(plain(original), before);
    assert.deepEqual(effects(calls), never);
    assert.equal(calls.guard, 0, '旧项目回调不得执行排列函数');
  }
});

test('菜单：保留批量重命名入口，并在点击时重新核对选择和权限', () => {
  for (const change of ['unchanged','permission','selection','project']) {
    const {context:s,calls} = geometryFixture();
    const renamed = [];
    s.renameCard = card => renamed.push(card.id);
    s.selectionMenu(10,20);
    if (change === 'permission') s.allowed = false;
    if (change === 'selection') s.selIds = new Set(['a','missing']);
    if (change === 'project') s.PROJ = {...s.PROJ};
    s.menus[0].items.at(-1).run();
    assert.deepEqual(renamed, change === 'unchanged' ? ['a'] : []);
    assert.deepEqual(effects(calls), never);
  }
});

function browserFixture(platform) {
  // 仅替换外围渲染及持久化；节点构建、鼠标处理、选择、几何、菜单均抽取生产代码。
  return `
    Object.defineProperty(navigator, 'platform', {value:${JSON.stringify(platform)},configurable:true});
    const el = Object.fromEntries(['stage','world','wires','groups','lasso','selbar','menu'].map(id => [id,document.getElementById(id)]));
    const NODE_EDITOR = false;
    let PROJ = {id:'interaction',cards:[],edges:[],groups:[]};
    let selIds = new Set(), selId = null, selEdge = null, view = {x:0,y:0,k:1}, mouseW = null;
    let allowed = true, saved = 0, viewSaved = 0, linked = 0, spawned = 0;
    const canOperate = () => allowed, requireOperate = () => allowed;
    const save = () => saved++, saveView = () => viewSaved++;
    const placePanel = () => {}, updateMinimap = () => {}, tipHide = () => {}, toast = () => {};
    const closeJobs = () => {}, closePanel = () => {}, openPanel = () => {}, openHistory = () => {}, veilPanel = () => {};
    const cardOf = id => PROJ.cards.find(c => c.id === id);
    const defOf = () => ({icon:'A'}), phHTML = () => '', paintTitle = () => {}, paint = () => {};
    const bindCardVideo = () => {}, bindCompare = () => {}, hoverTip = () => {};
    const isAsset = () => true, isStyle = () => false, isText = () => false, isTextCard = () => false;
    const assetOf = c => c.outputs[0], titleOf = c => c.id, capOf = () => null;
    const VIEW_WORD = {}, KIND_ZH = {image:'图片'};
    const linkTo = () => linked++, spawnDownstream = () => spawned++;
    const CARDS = [{id:'text',kind:'text',modes:[]},{id:'image',kind:'gen',name:'生图',modes:[]},
      {id:'video',kind:'gen',name:'生视频',modes:[]},{id:'tools',kind:'tool',modes:[{name:'放大'}]}];
    const CLIP = {id:'copied'};
    ${geometry}
    ${block('function applyView(', '/* ================= 小地图')}
    ${block('const NODRAG =', '/* 全屏幕只许一个东西在响')}
    ${block('function applySize(', 'function paint(')}
    ${block('function bboxOf(', '/** 按操作前的边界')}
    ${block('function paintSel(', '/** 分组框')}
    ${block('function beginCardsMove(', '/** Delete')}
    ${block('function pick(id)', 'function bindGlobal(')}
    ${block('function cardBox(', '/** 选中的连线')}
    ${block('function showMenu(', '/** 面板底部工具条')}
    ${block('function cardMenu(', '/** 把一份产物下载到本地')}
    const drawWires = () => paintSel();
    ${block('  el.stage.addEventListener("mousedown",', '  // 拖拽文件到画布')}
    const events = [];
    for (const type of ['mousedown','contextmenu']) document.addEventListener(type, ev => {
      events.push({type,button:ev.button,trusted:ev.isTrusted});
    }, true);
    function reset() {
      closeMenu(); el.world.replaceChildren(); el.wires.replaceChildren(); el.groups.replaceChildren();
      allowed = true; selId = null; selIds = new Set(); selEdge = null;
      view = {x:0,y:0,k:1}; saved = 0; viewSaved = 0; linked = 0; spawned = 0; events.length = 0;
      PROJ = {id:'interaction',cards:[
        {id:'a',x:80,y:100,w:200,h:90}, {id:'b',x:330,y:150,w:240,h:140}, {id:'c',x:720,y:450,w:200,h:100},
      ],edges:[{from:'a',to:'c',slot:'image'}],groups:[{id:'g',name:'原组',cards:['a','c']}]};
      for (const c of PROJ.cards) { c.outputs = [{kind:'image',url:'/fixture.png'}]; el.world.appendChild(buildCard(c)); }
      applyView();
    }
    function choose(ids = ['a','b']) { selId = null; selIds = new Set(ids); paintSel(); }
    reset();
  `;
}

test('浏览器交互：真实鼠标顺序、框选、平移、节点多选及旧菜单回归', async t => {
  // 延迟加载让几何测试能在没有 Playwright 的环境独立执行，不静默跳过交互测试。
  const { chromium } = require('playwright');
  const browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
  try {
    for (const platform of ['MacIntel','Win32']) await t.test(platform, async t => {
      const page = await browser.newPage({viewport:{width:1280,height:900}});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.setContent(`<!doctype html><meta charset="utf-8">
          <div id="stage" style="position:absolute;left:40px;top:30px;width:1150px;height:820px">
            <div id="world"></div><svg id="wires"></svg><div id="groups"></div>
            <div id="lasso" style="display:none"></div><div id="selbar" style="display:none"></div>
          </div><div id="menu" style="display:none"></div>`);
        await page.addStyleTag({content:readFileSync(path.join(web,'style.css'),'utf8')});
        await page.addScriptTag({content:browserFixture(platform)});
        page.setDefaultTimeout(5000);
        assert.equal(await page.evaluate(() => navigator.platform), platform);
        const reset = () => page.evaluate(() => reset());
        const selection = () => page.evaluate(() => [...selIds]);
        const menuLabels = () => page.locator('#menu > button > span:nth-child(2)').allTextContents();
        async function openAlignment() {
          await page.getByRole('button',{name:'对齐方式',exact:true}).click();
          assert.deepEqual(await page.locator('#menu .menu-submenu button span:last-child').allTextContents(), labels);
          assert.equal(await page.locator('#menu .menu-submenu').isVisible(), true);
        }
        async function drag(from,to,button = 'left') {
          await page.mouse.move(...from); await page.mouse.down({button});
          await page.mouse.move(...to,{steps:4}); await page.mouse.up({button});
        }
        async function rightClick(selector) {
          const rect = await page.locator(selector).boundingBox();
          assert.ok(rect, selector);
          await page.mouse.click(rect.x + rect.width / 2,rect.y + rect.height / 2,{button:'right'});
        }

        await t.test('普通左拖正向及逆向框选，缩放和平移不影响世界坐标命中', async () => {
          for (const k of [0.5,1,1.25]) for (const reverse of [false,true]) {
            await reset();
            await page.evaluate(k => { view = {x:30,y:20,k}; applyView(); }, k);
            const from = [40 + 30 + 50 * k,30 + 20 + 60 * k];
            const to = [40 + 30 + 650 * k,30 + 20 + 400 * k];
            const before = await page.evaluate(() => ({...view}));
            await drag(reverse ? to : from,reverse ? from : to);
            assert.deepEqual(await selection(), ['a','b']);
            assert.deepEqual(await page.evaluate(() => view), before);
            assert.equal(await page.evaluate(() => el.lasso.style.display), 'none');
            assert.deepEqual(await page.evaluate(() => [saved,viewSaved]), [0,0]);
          }
        });

        await t.test('框选四像素阈值、单张降为普通选择、空白单击清空', async () => {
          await reset();
          await page.evaluate(() => choose());
          await page.mouse.move(650,700); await page.mouse.down();
          await page.mouse.move(652,701);
          assert.equal(await page.evaluate(() => el.lasso.style.display), 'none');
          await page.mouse.move(652,702);
          assert.notEqual(await page.evaluate(() => el.lasso.style.display), 'none');
          await page.mouse.up();
          assert.deepEqual(await selection(), []);
          await drag([100,110],[340,290]);
          assert.deepEqual(await page.evaluate(() => [selId,[...selIds]]), ['a',[]]);
          await page.mouse.click(650,700);
          assert.deepEqual(await page.evaluate(() => [selId,[...selIds]]), [null,[]]);
        });

        await t.test('空白与节点中键仅平移，保留选择且不改变节点', async () => {
          for (const from of [[650,700],[180,200]]) {
            await reset(); await page.evaluate(() => choose());
            const before = await page.evaluate(() => PROJ.cards.map(c => [c.x,c.y]));
            await drag(from,[from[0] + 50,from[1] + 30],'middle');
            assert.deepEqual(await selection(), ['a','b']);
            assert.deepEqual(await page.evaluate(() => view), {x:50,y:30,k:1});
            assert.deepEqual(await page.evaluate(() => PROJ.cards.map(c => [c.x,c.y])), before);
            assert.deepEqual(await page.evaluate(() => [saved,viewSaved]), [0,1]);
            assert.equal(await page.locator('#stage').evaluate(d => d.classList.contains('panning')), false);
          }
        });

        await t.test('右键先触发 mousedown 再 contextmenu，节点和空白均保留多选并显示五项', async () => {
          for (const target of ['node','blank']) {
            await reset(); await page.evaluate(() => choose());
            if (target === 'node') await rightClick('.card[data-id="a"] .body');
            else await page.mouse.click(650,700,{button:'right'});
            assert.deepEqual(await selection(), ['a','b']);
            assert.deepEqual(await menuLabels(), ['对齐方式', '批量重命名（2 个节点）']);
            assert.deepEqual(await page.evaluate(() => events), [
              {type:'mousedown',button:2,trusted:true},{type:'contextmenu',button:2,trusted:true},
            ]);
            const oldData = await page.evaluate(() => ({edges:PROJ.edges,groups:PROJ.groups,c:[cardOf('c').x,cardOf('c').y]}));
            await openAlignment();
            await page.getByRole('button',{name:'垂直居中对齐'}).click();
            assert.equal(await page.evaluate(() => saved), 1);
            assert.deepEqual(await selection(), ['a','b']);
            assert.deepEqual(await page.evaluate(() => {
              const a = cardRect(cardOf('a')), b = cardRect(cardOf('b'));
              return [a.x + a.w / 2,b.x + b.w / 2,b.y - a.y - a.h];
            }), [325,325,24]);
            assert.deepEqual(await page.evaluate(() => ({edges:PROJ.edges,groups:PROJ.groups,c:[cardOf('c').x,cardOf('c').y]})), oldData);
            await page.mouse.click(1000,700,{button:'right'});
            await openAlignment();
            await page.getByRole('button',{name:'垂直居中对齐'}).click();
            assert.equal(await page.evaluate(() => saved), 1);
          }
        });

        await t.test('右键未选节点变单选，原节点菜单及空白菜单不被替换', async () => {
          await reset(); await page.evaluate(() => choose());
          await rightClick('.card[data-id="c"] .body');
          assert.deepEqual(await page.evaluate(() => [selId,[...selIds]]), ['c',[]]);
          const nodeMenu = await menuLabels();
          for (const label of ['选择 / 换文件','重命名节点','就地复制一张','复制，等下粘贴（Ctrl+C）','删除节点（Delete）']) assert.ok(nodeMenu.includes(label),label);
          assert.ok(!nodeMenu.includes('左对齐'));
          await page.evaluate(() => closeMenu());
          await page.mouse.click(650,700,{button:'right'});
          const blankMenu = await menuLabels();
          for (const label of ['文本','图片','视频','放大','上传素材','粘贴刚复制的节点（Ctrl+V）']) assert.ok(blankMenu.includes(label),label);
          assert.ok(!blankMenu.includes('左对齐'));
        });

        await t.test('右键输出端口不启动连线，左键仍可启动，松开清理临时线', async () => {
          await reset(); await page.evaluate(() => choose());
          await rightClick('.card[data-id="a"] .port');
          assert.deepEqual(await selection(), ['a','b']);
          assert.deepEqual(await menuLabels(), ['对齐方式', '批量重命名（2 个节点）']);
          assert.deepEqual(await page.evaluate(() => [el.world.classList.contains('wiring'),el.wires.querySelectorAll('.tmp').length,linked,spawned]), [false,0,0,0]);
          await page.evaluate(() => closeMenu());
          const port = await page.locator('.card[data-id="a"] .port').boundingBox();
          await page.mouse.move(port.x + port.width / 2,port.y + port.height / 2);
          await page.mouse.down();
          assert.deepEqual(await page.evaluate(() => [el.world.classList.contains('wiring'),el.wires.querySelectorAll('.tmp').length]), [true,1]);
          await page.mouse.up();
          assert.deepEqual(await page.evaluate(() => [el.world.classList.contains('wiring'),el.wires.querySelectorAll('.tmp').length,linked,spawned]), [false,0,0,0]);
        });

        await t.test('拖多选保留 selIds 和右键排列入口，不误拖分组内未选节点', async () => {
          await reset();
          await page.evaluate(() => { view.k = 0.5; applyView(); choose(['b','a','missing']); });
          const rect = await page.locator('.card[data-id="a"] .body').boundingBox();
          const from = [rect.x + rect.width / 2,rect.y + rect.height / 2];
          await drag(from,[from[0] + 30,from[1] + 20]);
          assert.deepEqual(await selection(), ['b','a','missing']);
          assert.deepEqual(await page.evaluate(() => PROJ.cards.map(c => [c.x,c.y])), [[140,140],[390,190],[720,450]]);
          assert.equal(await page.evaluate(() => saved), 1);
          await rightClick('.card[data-id="a"] .body');
          assert.deepEqual(await menuLabels(), ['对齐方式', '批量重命名（2 个节点）']);
          await openAlignment();
          await page.getByRole('button',{name:'左对齐',exact:false}).click();
          assert.deepEqual(await selection(), ['b','a','missing']);
          assert.equal(await page.evaluate(() => saved), 2);
        });

        await t.test('二级菜单悬停和点击展开、边界翻转及键盘返回，不提前修改节点', async () => {
          for (const at of [[650,700],[1170,840]]) {
            await reset(); await page.evaluate(() => choose());
            await page.mouse.click(...at,{button:'right'});
            const parent = page.getByRole('button',{name:'对齐方式',exact:true});
            const child = page.locator('#menu .menu-submenu');
            // 菜单贴边定位后可能刚好落在当前指针下，先移到普通菜单项再验证收起状态。
            await page.getByRole('button',{name:'批量重命名（2 个节点）',exact:false}).hover();
            assert.equal(await child.isVisible(), false);
            await parent.hover();
            assert.equal(await child.isVisible(), true);
            assert.equal(await parent.getAttribute('aria-expanded'), 'true');
            const rect = await child.boundingBox(), menu = await page.locator('#menu').boundingBox();
            assert.ok(rect.x >= 7 && rect.y >= 7 && rect.x + rect.width <= 1273 && rect.y + rect.height <= 893);
            if (at[0] > 1000) assert.ok(rect.x < menu.x, '右侧空间不足应向左展开');
            assert.equal(await page.evaluate(() => saved), 0);
            await page.getByRole('button',{name:'批量重命名（2 个节点）',exact:false}).hover();
            assert.equal(await child.isVisible(), false);
            await parent.click();
            assert.equal(await child.isVisible(), true);
            await parent.focus(); await page.keyboard.press('ArrowRight');
            assert.equal(await page.getByRole('button',{name:'左对齐',exact:false}).evaluate(b => b === document.activeElement), true);
            await page.keyboard.press('ArrowLeft');
            assert.equal(await child.isVisible(), false);
            assert.equal(await parent.evaluate(b => b === document.activeElement), true);
            assert.deepEqual(await selection(), ['a','b']);
          }
        });

        await t.test('仅点击已选节点仍回到单选，不移动也不保存', async () => {
          await reset(); await page.evaluate(() => choose());
          const before = await page.evaluate(() => PROJ.cards.map(c => [c.x,c.y]));
          await page.locator('.card[data-id="a"] .ch').click();
          assert.deepEqual(await page.evaluate(() => [selId,[...selIds]]), ['a',[]]);
          assert.deepEqual(await page.evaluate(() => PROJ.cards.map(c => [c.x,c.y])), before);
          assert.equal(await page.evaluate(() => saved), 0);
        });

        await t.test('只读不开放排列菜单，已打开菜单撤权或换同 id 项目不能执行', async () => {
          await reset(); await page.evaluate(() => { choose(); allowed = false; });
          await page.mouse.click(650,700,{button:'right'});
          assert.equal(await page.locator('#menu').isVisible(), false);
          await rightClick('.card[data-id="a"] .body');
          assert.deepEqual(await menuLabels(), ['复制节点','预览产物']);
          for (const change of ['permission','project']) {
            await reset(); await page.evaluate(() => choose());
            await page.mouse.click(650,700,{button:'right'});
            const before = await page.evaluate(() => PROJ.cards.map(c => [c.x,c.y]));
            await page.evaluate(change => {
              if (change === 'permission') allowed = false;
              else PROJ = {...PROJ};
            }, change);
            await openAlignment();
            await page.getByRole('button',{name:'左对齐',exact:false}).click();
            assert.equal(await page.evaluate(() => saved), 0);
            assert.deepEqual(await page.evaluate(() => PROJ.cards.map(c => [c.x,c.y])), before);
          }
        });
        assert.deepEqual(errors, [], '真实事件不得产生页面异常');
      } finally { await page.close(); }
    });
  } finally { await browser.close(); }
});
