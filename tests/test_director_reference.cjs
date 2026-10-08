const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = readFileSync(path.join(__dirname, '../web/app.js'), 'utf8').replace(/\r\n/g, '\n');
function block(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, start);
  return source.slice(from, to);
}
function canvas() {
  const imported = [], saved = [];
  const sourceCard = {id:'image', job:'new-job', status:'running', assets:{}, outputs:[]};
  const target = {id:'video', assets:{'images[0]':{ref:'adopted-image'}, 'images[1]':{ref:'manual-image'}, 'audio[0]':{ref:'audio'}}};
  const pinned = {from:'image', to:'video', slot:'images[0]', slots:['images[0]'], version:{job:'old-job', index:2}};
  const liveTarget = {id:'live-video', assets:{}};
  const live = {from:'image', to:'live-video', slot:'images[0]', slots:['images[0]']};
  const context = vm.createContext({
    PROJ:{id:'project', cards:[sourceCard,target,liveTarget], edges:[pinned,live]}, TASKS:[],
    el:{panel:{}, hist:{}, jobs:{style:{display:'none'}}}, console,
    api:async () => ({jobs:[{id:'new-job',status:'done',outputs:[{kind:'image',url:'new-image'}]}]}),
    canOperate:() => true, canTask:() => true, isTextEdge:e => String(e.slot || '').startsWith('@'),
    paint:() => {}, paintKind:() => {}, paintJobsBtn:() => {}, drawWires:() => {},
    openPanel:() => {}, openHistory:() => {}, renderJobs:() => {}, toast:() => {},
    pushHistory:() => {}, save:() => saved.push(true),
    titleOf:c => c.id, capOf:() => ({inputs:[]}),
    importOutput:async output => { imported.push(output); return {ref:output.url}; },
  });
  vm.runInContext(`const cardOf = id => PROJ.cards.find(c => c.id === id);\n`
    + block('function mediaSlotsForOutputs(', 'function cardBox(')
    + block('function edgeWord(', 'function drawWires(')
    + block('async function pollJobs(', '/* ================= 任务浮窗'), context);
  return {context,target,pinned,liveTarget,imported,saved};
}

test('source completion updates live edges but never the pinned storyboard slot', async () => {
  const {context,target,pinned,liveTarget,imported,saved} = canvas();
  await vm.runInContext('pollJobs()', context);
  assert.equal(target.assets['images[0]'].ref, 'adopted-image');
  assert.equal(target.assets['images[1]'].ref, 'manual-image');
  assert.equal(target.assets['audio[0]'].ref, 'audio');
  assert.equal(liveTarget.assets['images[0]'].ref, 'new-image');
  assert.equal(imported.length, 1);
  assert.equal(saved.length, 1);
  assert.deepEqual(pinned.version, {job:'old-job',index:2});
  assert.match(vm.runInContext('edgeWord(PROJ.edges[0])', context), /固定分镜版本.*old-job.*第 3 张/);
});

test('disconnecting a pinned edge clears only its exact owned slot', () => {
  const {context,target,pinned} = canvas();
  context.edge = pinned;
  vm.runInContext('removeEdges([edge])', context);
  assert.equal(target.assets['images[0]'], undefined);
  assert.equal(target.assets['images[1]'].ref, 'manual-image');
  assert.equal(target.assets['audio[0]'].ref, 'audio');
  assert.equal(context.PROJ.edges.length, 1);
  assert.equal(context.PROJ.edges[0].to, 'live-video');
});

test('manually replacing a pinned slot detaches its edge without deleting replacement', () => {
  const {context,target} = canvas();
  target.assets['images[0]'] = {ref:'replacement'};
  vm.runInContext("detachSlotEdges('video', 'images[0]')", context);
  assert.equal(target.assets['images[0]'].ref, 'replacement');
  assert.equal(target.assets['images[1]'].ref, 'manual-image');
  assert.equal(context.PROJ.edges.some(e => e.to === 'video'), false);
});

test('director reflects manual and pinned canvas references without duplicating the adopted version', () => {
  const directorSource = readFileSync(path.join(__dirname, '../web/director.js'), 'utf8');
  const start = directorSource.indexOf('  function renderStoryboardReferences(');
  const end = directorSource.indexOf('  function renderVersions(', start);
  assert.ok(start >= 0 && end > start);
  const container = {children:[], replaceChildren() { this.children = []; }, append(node) { this.children.push(node); }};
  const project = {cards:[{id:'image',name:'采用分镜'},{id:'manual',name:'手动画布图片'}],
    edges:[{from:'manual',to:'video',slot:'images[0]',slots:['images[0]']}]};
  const context = vm.createContext({
    $:() => container, project, busy:false, writable:() => true,
    currentShot:() => ({image:{card:'image'},video:{card:'video',capability:'video-cap'}}),
    chosen:() => ({job:'old-job',index:2}),
    caps:{'video-cap':{inputs:[{key:'images[0]',type:'image',label:'首帧'}]}},
    el:(_tag,_class,text) => ({textContent:text,dataset:{}}),
    button:text => ({textContent:text,dataset:{}}), applyStoryboard:() => {},
  });
  vm.runInContext(directorSource.slice(start,end), context);
  vm.runInContext('renderStoryboardReferences()', context);
  assert.match(container.children[0].textContent, /手动画布图片.*首帧.*跟随上游最新产物/);
  assert.equal(container.children.at(-1).disabled, false);
  project.edges = [{from:'image',to:'video',slot:'images[0]',slots:['images[0]'],version:{job:'old-job',index:2}}];
  vm.runInContext('renderStoryboardReferences()', context);
  assert.match(container.children[0].textContent, /采用分镜.*固定版本.*old-job.*第 3 张/);
  assert.equal(container.children.at(-1).disabled, true);
  project.edges = [];
  vm.runInContext('renderStoryboardReferences()', context);
  assert.equal(container.children.length, 1);
  assert.equal(container.children[0].disabled, false);
});
