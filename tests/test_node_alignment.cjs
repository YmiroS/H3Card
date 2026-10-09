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

// 连通用例仍执行上面抽取的生产函数；预期几何均独立手算。
function connectedFixture(definitions, edges, selected) {
  const fixture = geometryFixture();
  const cards = definitions.map(c => ({...c, h:999, params:{prompt:c.id},
    outputs:[{url:`/${c.id}.png`}], history:[{id:`history-${c.id}`}]}));
  const reads = [];
  for (const c of cards) {
    c._el = {style:{left:c.x + 'px',top:c.y + 'px'}};
    Object.defineProperty(c._el, 'offsetHeight', {get() {
      reads.push({id:c.id,positions:cards.map(c => [c.x,c.y])});
      return c.actualHeight;
    }});
  }
  fixture.context.PROJ.cards = cards;
  fixture.context.PROJ.edges = edges;
  fixture.context.PROJ.groups = [{id:'connected-group',name:'跨选区分组',cards:[cards[0].id,'outside']}];
  fixture.context.selIds = new Set(selected || cards.filter(c => c.id !== 'outside').map(c => c.id).reverse());
  return {...fixture,cards,reads};
}
const connectedCards = [
  {id:'a',x:300,y:40,w:100,actualHeight:80},
  {id:'b',x:0,y:100,w:140,actualHeight:120},
  {id:'c',x:-80,y:220,w:90,actualHeight:60},
  {id:'d',x:180,y:260,w:110,actualHeight:100},
  {id:'e',x:-40,y:-20,w:70,actualHeight:50},
  {id:'outside',x:900,y:800,w:268,actualHeight:230},
];
const connectedEdges = [
  {from:'a',to:'b',slot:'image',metadata:{keep:true}},
  {from:'a',to:'b',slot:'image'}, // 重复边不能改变连通分量或拓扑结果。
  {from:'c',to:'d',slot:'@text'},
  {from:'c',to:'d',slot:'@style'},
  {from:'b',to:'b',slot:'image'}, {from:'d',to:'d',slot:'@text'},
  {from:'ghost',to:'a',slot:'@text'}, {from:'d',to:'missing',slot:'image'},
  {from:'a',to:'outside',slot:'image'}, {from:'outside',to:'c',slot:'@style'},
];
// 原边界 [-80,-20]—[400,360]；A 行 264×120，B 行 224×100，单张 E 70×50。
// 纵向行序 E/A/B，y=-20/54/198；横向行序 B/E/A，x=-80/168/262。
const connectedExpected = {
  left:   [[-80,54],[44,54],[-80,198],[34,198],[-80,-20]],
  right:  [[136,54],[260,54],[176,198],[290,198],[330,-20]],
  center: [[28,54],[152,54],[48,198],[162,198],[125,-20]],
  top:    [[262,-20],[386,-20],[-80,-20],[34,-20],[168,-20]],
  bottom: [[262,280],[386,240],[-80,300],[34,260],[168,310]],
};
function preservedData(s) {
  return plain({project:Object.fromEntries(Object.entries(s.PROJ).filter(([k]) => k !== 'cards')),
    cards:s.PROJ.cards.map(({x,y,_el,...rest}) => rest),selection:[...s.selIds]});
}
for (const mode of modes) test(`连通几何：${mode} 两条多卡横排加单卡、反向原 x、真实尺寸及重复无保存`, () => {
  const {context:s,cards,calls,reads} = connectedFixture(connectedCards, plain(connectedEdges));
  const before = cards.map(c => [c.x,c.y]), data = preservedData(s), outside = plain(cards.at(-1));
  s.alignSelectedCards(mode);
  assert.deepEqual(cards.slice(0,5).map(c => [c.x,c.y]), connectedExpected[mode]);
  assert.deepEqual(reads.map(r => r.id), ['a','b','c','d','e']);
  for (const read of reads) assert.deepEqual(read.positions, before, '连通行的整卡尺寸须先快照');
  assert.deepEqual(effects(calls), once);
  assert.equal(calls.guard, 1);
  for (const [from,to] of [[0,1],[2,3]]) {
    assert.equal(cards[to].x - cards[from].x - cards[from].w, 24, '有向上游应排在下游左侧');
    if (mode === 'bottom') {
      assert.equal(cards[from].y + cards[from].actualHeight, 360);
      assert.equal(cards[to].y + cards[to].actualHeight, 360, '底部对齐必须对齐每张卡而非仅行');
    } else assert.equal(cards[from].y, cards[to].y, '同行顶部一致');
  }
  for (const c of cards.slice(0,5)) {
    assert.equal(c._el.style.left, c.x + 'px');
    assert.equal(c._el.style.top, c.y + 'px');
  }
  assert.deepEqual(plain(cards.at(-1)), outside, '未选桥接节点不得移动');
  assert.deepEqual(preservedData(s), data, '除位置外项目、尺寸、参数、产物、历史、边、组和选择均保留');
  for (let i = 0; i < 3; i++) s.alignSelectedCards(mode);
  assert.deepEqual(cards.slice(0,5).map(c => [c.x,c.y]), connectedExpected[mode]);
  assert.deepEqual(effects(calls), once, '连通行重复排列不得刷新或保存');
  assert.deepEqual(preservedData(s), data);
});

for (const slot of ['image','@text','@style']) test(`连通几何：单独 ${slot} 边也构成横排，反向原坐标仍上游优先`, () => {
  const {context:s,cards,calls} = connectedFixture(connectedCards.slice(0,2), [{from:'a',to:'b',slot}]);
  s.alignSelectedCards('left');
  assert.deepEqual(cards.map(c => [c.x,c.y]), [[0,40],[124,40]]);
  s.alignSelectedCards('left');
  assert.deepEqual(effects(calls), once);
});

test('连通几何：分支拓扑的可用节点按 x、y、项目顺序排序而非选择顺序', () => {
  const definitions = [
    {id:'d',x:100,y:10,w:110,actualHeight:60},
    {id:'a',x:300,y:0,w:80,actualHeight:70},
    {id:'c',x:100,y:10,w:100,actualHeight:90},
    {id:'b',x:100,y:30,w:90,actualHeight:80},
    {id:'e',x:50,y:10,w:120,actualHeight:100},
  ];
  const edges = ['b','c','d','e'].map(to => ({from:'a',to,slot:'image'}));
  edges.push({from:'c',to:'b',slot:'@text'});
  const {context:s,cards,calls} = connectedFixture(definitions, edges, ['b','c','a','e','d']);
  s.alignSelectedCards('left');
  // 唯一源 a；随后 e(x 最小)、d/c(同位置按项目顺序)、最后 b(y 更大且依赖 c)。
  assert.deepEqual(cards.map(c => [c.x,c.y]), [[298,0],[50,0],[432,0],[556,0],[154,0]]);
  s.alignSelectedCards('left');
  assert.deepEqual(effects(calls), once);
});

test('连通几何：环无零入度时确定性坐标回退，解环后恢复源优先且幂等', () => {
  const definitions = [
    {id:'b',x:100,y:10,w:80,actualHeight:80},
    {id:'a',x:100,y:10,w:90,actualHeight:70},
    {id:'c',x:0,y:20,w:70,actualHeight:60},
    {id:'d',x:-50,y:0,w:60,actualHeight:90},
  ];
  const edges = [
    {from:'a',to:'b',slot:'image'}, {from:'b',to:'c',slot:'@text'},
    {from:'c',to:'a',slot:'@style'}, {from:'c',to:'d',slot:'image'},
  ];
  const {context:s,cards,calls} = connectedFixture(definitions, edges);
  s.alignSelectedCards('left');
  // 无源：先回退 d、再 c；c 移除后 a 入度为零，必须先于原同位置的 b。
  assert.deepEqual(cards.map(c => [c.x,c.y]), [[242,0],[128,0],[34,0],[-50,0]]);
  for (let i = 0; i < 3; i++) s.alignSelectedCards('left');
  assert.deepEqual(effects(calls), once);
});

test('连通几何：环回退同 x 时按 y、同 x/y 时按项目顺序，不依赖选择顺序', () => {
  const edges = [{from:'a',to:'b',slot:'image'},{from:'b',to:'c',slot:'@text'},{from:'c',to:'a',slot:'@style'}];
  for (const tied of [false,true]) {
    const definitions = [
      {id:'b',x:100,y:tied ? 10 : 20,w:120,actualHeight:80},
      {id:'a',x:100,y:tied ? 10 : 0,w:160,actualHeight:60},
      {id:'c',x:100,y:10,w:180,actualHeight:90},
    ];
    const {context:s,cards,calls} = connectedFixture(definitions, plain(edges), ['c','a','b']);
    s.alignSelectedCards('left');
    // 同 x：先 a(y 最小)，随后 b/c；完全相同位置：先项目里的 b，随后 c/a。
    const positions = tied ? [[100,10],[448,10],[244,10]] : [[284,0],[100,0],[428,0]];
    assert.deepEqual(cards.map(c => [c.x,c.y]), positions);
    for (let i = 0; i < 3; i++) s.alignSelectedCards('left');
    assert.deepEqual(cards.map(c => [c.x,c.y]), positions);
    assert.deepEqual(effects(calls), once);
  }
});

for (const mode of ['left','top']) test(`连通几何：${mode} 行排序完全同 min x/min y 时保留项目顺序`, () => {
  const definitions = [
    {id:'t1',x:100,y:40,w:40,actualHeight:60},
    {id:'s2',x:0,y:0,w:60,actualHeight:70},
    {id:'s1',x:0,y:0,w:80,actualHeight:50},
    {id:'t2',x:100,y:40,w:50,actualHeight:80},
  ];
  const {context:s,cards,calls} = connectedFixture(definitions,
    [{from:'s1',to:'t1',slot:'image'},{from:'s2',to:'t2',slot:'@text'}]);
  s.alignSelectedCards(mode);
  // 行 s1/t1 的首个项目节点是 t1；两行原始最小坐标都是 (0,0)。
  assert.deepEqual(cards.map(c => [c.x,c.y]), mode === 'left'
    ? [[104,0],[0,84],[0,0],[84,84]] : [[104,0],[168,0],[0,0],[252,0]]);
  s.alignSelectedCards(mode);
  assert.deepEqual(effects(calls), once);
});

test('连通几何：空边集合及只有未选桥、悬空边、自环时仍是单卡行', () => {
  for (const edges of [[], [
    {from:'a',to:'outside',slot:'image'},{from:'outside',to:'c',slot:'@text'},
    {from:'ghost',to:'b',slot:'@style'},{from:'d',to:'missing',slot:'image'},
    {from:'b',to:'b',slot:'image'},
  ]]) {
    const {context:s,cards,calls} = geometryFixture();
    s.PROJ.edges = edges;
    s.alignSelectedCards('left');
    assert.deepEqual(cards.slice(0,4).map(c => [c.x,c.y]), expected.left);
    s.alignSelectedCards('left');
    assert.deepEqual(effects(calls), once);
  }
});

test('连通几何：无 DOM 横排使用 cardRect 默认宽高而非持久化 h', () => {
  const {context:s,calls} = geometryFixture();
  s.PROJ.cards = [{id:'a',x:20,y:40},{id:'b',x:-10,y:0,w:180,h:999}];
  s.PROJ.edges = [{from:'a',to:'b',slot:'@text'}];
  s.alignSelectedCards('right');
  // 宽 268+24+180=472，原右边界 288，故行左边界 -184。
  assert.deepEqual(s.PROJ.cards.map(c => [c.x,c.y]), [[-184,0],[108,0]]);
  s.alignSelectedCards('right');
  assert.deepEqual(effects(calls), once);
});

test('连通守卫：五种模式只读不读尺寸不写入，菜单回调撤权及减少选择亦然', () => {
  for (const mode of modes) for (const change of ['readonly','menu-permission','menu-selection']) {
    const {context:s,cards,calls,reads} = connectedFixture(connectedCards, plain(connectedEdges));
    const before = plain(cards);
    if (change === 'readonly') {
      s.allowed = false;
      s.alignSelectedCards(mode);
    } else {
      s.selectionMenu(10,20);
      if (change === 'menu-permission') s.allowed = false;
      else s.selIds = new Set(['a','missing']);
      s.menus[0].items[0].children[modes.indexOf(mode)].run();
    }
    assert.deepEqual(plain(cards), before, `${mode}/${change}`);
    assert.deepEqual(effects(calls), never);
    assert.equal(calls.guard, 1);
    if (change !== 'menu-selection') assert.deepEqual(reads, [], '撤权后不得读取尺寸');
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

        for (const [index,mode] of modes.entries()) await t.test(`连通横排 ${mode}：真实框选、菜单点击、DOM 边界及重复无保存`, async () => {
          await reset();
          await page.evaluate(edges => {
            el.world.replaceChildren(); el.groups.replaceChildren();
            PROJ = {id:'connected-interaction',permission:'operate',custom:{keep:'项目元数据'},cards:[
              {id:'a',x:400,y:100,w:200,h:90}, {id:'b',x:80,y:180,w:240,h:140},
              {id:'c',x:120,y:430,w:220,h:110}, {id:'d',x:460,y:480,w:180,h:90},
              {id:'e',x:760,y:60,w:200,h:100}, {id:'outside',x:1600,y:1000,w:268,h:120},
            ],edges,groups:[{id:'g',name:'保留原组',cards:['a','outside']}]};
            for (const c of PROJ.cards) {
              c.params = {prompt:c.id,seed:123};
              c.outputs = [{kind:'image',url:'/fixture.png'}]; c.history = [{id:`past-${c.id}`}];
              el.world.appendChild(buildCard(c));
            }
            view = {x:20,y:20,k:0.6}; applyView();
          }, plain(connectedEdges));
          // 用实际鼠标框选 a/b/c/d/e，未选 outside 仅作桥；不直接调用 choose 或排列函数。
          await drag([90,68],[654,530]);
          assert.deepEqual(await selection(), ['a','b','c','d','e']);
          const snapshot = () => page.evaluate(() => {
            const stage = el.stage.getBoundingClientRect();
            return {saved,selection:[...selIds],selId,view:{...view},
              project:Object.fromEntries(Object.entries(PROJ).filter(([key]) => key !== 'cards')),
              metadata:PROJ.cards.map(({x,y,_el,...rest}) => rest),
              positions:PROJ.cards.map(c => [c.x,c.y]),
              styles:PROJ.cards.map(c => [c._el.style.left,c._el.style.top]),
              rects:PROJ.cards.map(c => {
                const r = c._el.getBoundingClientRect();
                return {id:c.id,x:(r.left-stage.left-view.x)/view.k,y:(r.top-stage.top-view.y)/view.k,
                  w:r.width/view.k,h:r.height/view.k,offsetHeight:c._el.offsetHeight};
              })};
          });
          const near = (actual,expected,message) => assert.ok(Math.abs(actual-expected) < 0.001,
            `${message}: ${actual} != ${expected}`);
          const before = await snapshot();
          assert.equal(before.saved, 0);
          const [a0,b0,c0,d0,e0] = before.rects;
          for (const r of before.rects) near(r.h,r.offsetHeight,`${r.id} 实际矩形与整卡高度`);
          assert.ok(a0.h > 90 && b0.h > 140, '实际整卡高度包括标题和页脚，而不是持久化正文 h');
          const bottom = d0.y + d0.h; // 此夹具原选区底部由 d 决定。
          const targetX = {
            left:[80,304,80,324,80], right:[496,720,536,780,760],
            center:[288,512,308,552,420], top:[80,304,568,812,1016], bottom:[80,304,568,812,1016],
          }[mode];
          const rowAY = 60 + e0.h + 24, rowBY = rowAY + b0.h + 24;
          const targetY = ['left','right','center'].includes(mode) ? [rowAY,rowAY,rowBY,rowBY,60]
            : mode === 'top' ? [60,60,60,60,60] : [a0,b0,c0,d0,e0].map(r => bottom-r.h);
          await rightClick('.card[data-id="a"] .body');
          assert.deepEqual(await menuLabels(), ['对齐方式','批量重命名（5 个节点）']);
          await openAlignment();
          await page.getByRole('button',{name:labels[index],exact:false}).click();
          const after = await snapshot();
          assert.equal(after.saved, 1);
          assert.deepEqual(after.selection, before.selection);
          assert.equal(after.selId, before.selId);
          assert.deepEqual(after.view, before.view);
          assert.deepEqual(after.project, before.project);
          assert.deepEqual(after.metadata, before.metadata);
          assert.deepEqual(after.rects[5], before.rects[5], '未选桥的实际矩形不变');
          assert.deepEqual(after.positions[5], before.positions[5]);
          const [a,b,c,d,e] = after.rects;
          for (const [i,r] of after.rects.slice(0,5).entries()) {
            near(r.x,targetX[i],`${r.id} 实际 x`); near(r.y,targetY[i],`${r.id} 实际 y`);
            near(after.positions[i][0],targetX[i],`${r.id} 数据 x`);
            near(after.positions[i][1],targetY[i],`${r.id} 数据 y`);
            assert.deepEqual(after.styles[i], after.positions[i].map(v => v + 'px'));
            near(r.w,before.rects[i].w,`${r.id} 宽度不变`);
            near(r.h,before.rects[i].h,`${r.id} 高度不变`);
          }
          near(b.x-a.x-a.w,24,'A 行内部邻接'); near(d.x-c.x-c.w,24,'B 行内部邻接');
          if (['left','right','center'].includes(mode)) {
            near(a.y,b.y,'A 行顶齐'); near(c.y,d.y,'B 行顶齐');
            near(a.y-e.y-e.h,24,'E/A 行纵向间隔');
            near(c.y-a.y-Math.max(a.h,b.h),24,'A/B 行纵向间隔');
            if (mode === 'left') for (const r of [a,c,e]) near(r.x,80,'行左边界');
            if (mode === 'right') for (const edge of [b.x+b.w,d.x+d.w,e.x+e.w]) near(edge,960,'行右边界');
            if (mode === 'center') for (const center of [(a.x+b.x+b.w)/2,(c.x+d.x+d.w)/2,e.x+e.w/2]) near(center,520,'行水平中心');
          } else {
            near(c.x-b.x-b.w,24,'A/B 行横向间隔'); near(e.x-d.x-d.w,24,'B/E 行横向间隔');
            for (const r of [a,b,c,d,e]) near(mode === 'top' ? r.y : r.y+r.h,mode === 'top' ? 60 : bottom,'原选区上下边界');
          }
          for (let repeat = 0; repeat < 2; repeat++) {
            await rightClick('.card[data-id="a"] .body');
            await openAlignment();
            await page.getByRole('button',{name:labels[index],exact:false}).click();
            assert.deepEqual(await snapshot(), after, '重复真实菜单点击不改变矩形、数据或保存次数');
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
