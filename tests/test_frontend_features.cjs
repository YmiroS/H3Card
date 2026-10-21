const {test} = require('node:test');
const assert = require('node:assert/strict');
const parameters = require('../web/features/node-parameters.js');
const {create: createPersistence} = require('../web/features/project-persistence.js');
const {create: createTasks, createCanvasUpdater} = require('../web/features/task-panel.js');
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => {resolve=a; reject=b;}); return {promise,resolve,reject}; };
const tick = () => new Promise(resolve => setImmediate(resolve));

function persistenceFixture(extra = {}) {
  let project = {id:'p', permission:'operate', rev:0, name:'画布', cards:[{id:'c',params:{}}], edges:[]};
  const calls = [], timers = new Map(), errors = [];
  let timer = 0;
  const deps = {
    getProject:() => project, getView:() => ({x:1,y:2,k:1}), isAuthenticated:() => true,
    canSave:() => project?.permission === 'operate' && !project.locked, nodeEditor:false,
    editorCard:() => project?.cards[0], plain:card => JSON.parse(JSON.stringify(card)),
    api:async () => project, jpost:async () => { throw Error('unexpected create'); },
    jput:async (url, body) => { calls.push({url,body:structuredClone(body)}); return {rev:body.rev+1}; },
    recordCanvasEdit() {}, flushPendingProjectSync() {}, openProject:async () => {},
    toast:message => errors.push(message), showError:message => errors.push(message), flushFocusedControl() {},
    setTimeout:fn => {timers.set(++timer,fn); return timer;}, clearTimeout:id => timers.delete(id),
    ...extra,
  };
  return {p:createPersistence(deps), deps, calls, errors, timers,
    get project() { return project; }, set project(value) { project=value; },
    fire() { const pending=[...timers.values()]; timers.clear(); pending.forEach(fn => fn()); },
  };
}

test('save queue has one revision owner and captures only the intended project', async () => {
  const hold=deferred();
  const writes=[];
  const g=persistenceFixture({jput:async (url, body) => {
    writes.push({url,body:structuredClone(body)});
    if(writes.length===1) await hold.promise;
    return {rev:body.rev+1};
  }});
  const a=g.p.enqueueSave(), b=g.p.enqueueSave();
  await tick(); assert.equal(writes.length,1); assert.equal(g.p.status.pendingContentSaves,2);
  hold.resolve(); await Promise.all([a,b]);
  assert.deepEqual(writes.map(write => write.body.rev),[0,1]);
  assert.equal(g.project.rev,2); assert.equal(g.p.busy,false);
  const delayed=deferred(), h=persistenceFixture({jput:async () => {await delayed.promise; return {rev:99};}});
  const old=h.project, saving=h.p.enqueueSave(); await tick();
  h.project={...old,id:'other',rev:7}; delayed.resolve();
  assert.equal((await saving).ok,false); assert.equal(h.project.rev,7);
  assert.equal((await h.p.enqueueSave('p')).ok,false);
});

test('save debounce, cancel, readonly view saving and focused-control flush execute fully', async () => {
  let blur=0, edits=0;
  const f=persistenceFixture({flushFocusedControl:() => blur++, recordCanvasEdit:() => edits++});
  f.p.save(); f.p.save(); assert.equal(f.timers.size,1); assert.equal(edits,2);
  f.p.cancelTimers(); assert.equal(f.timers.size,0);
  f.p.save(false); f.fire(); await f.p.pendingChain; assert.equal(f.calls.length,1);
  await f.p.flushLocalChanges(); assert.equal(blur,1); assert.equal(f.calls.length,2);
  f.project.permission='read'; f.p.save(); assert.equal(f.timers.size,0);
  await assert.rejects(f.p.flushLocalChanges(),/只读/);
  f.p.saveView(); f.fire(); await tick();
  assert.equal(f.calls.at(-1).url,'/api/projects/p/view');
  assert.deepEqual(f.calls.at(-1).body,{x:1,y:2,k:1});
  assert.equal(f.p.status.localFlushes,0);
});

test('failed saves remain visible, queue recovers, and flush never reports a rejected write as saved', async () => {
  let fail=true;
  const f=persistenceFixture({jput:async () => {if(fail) throw Error('offline'); return {rev:1};}});
  assert.equal((await f.p.enqueueSave()).ok,false);
  assert.match(f.p.status.saveFailure.message,/offline/);
  await assert.rejects(f.p.flushLocalChanges(),/offline/);
  fail=false; await f.p.flushLocalChanges();
  assert.equal(f.p.status.saveFailure,null); assert.equal(f.p.status.pendingContentSaves,0);
  assert.equal(f.p.busy,false); assert.ok(f.errors.every(message => message.includes('保存失败')));
});

test('node editor conflicts and deleted cards reject flush without recreating or reloading', async () => {
  let reloads=0, creates=0, puts=0;
  const f=persistenceFixture({nodeEditor:true,openProject:async () => reloads++,jpost:async () => creates++,
    jput:async () => {puts++; throw Object.assign(Error('conflict'),{status:409});}});
  await assert.rejects(f.p.flushLocalChanges(),/conflict/);
  await assert.rejects(f.p.flushLocalChanges(),/conflict/);
  assert.deepEqual([puts,creates,reloads],[1,0,0]);
  const missing=persistenceFixture({nodeEditor:true,editorCard:() => null});
  await assert.rejects(missing.p.flushLocalChanges(),/此节点已删除/);
  assert.equal(missing.calls.length,0);
});

test('pending node work and card creation share the queue and cannot be skipped by flush', async () => {
  const work=deferred(), create=deferred(), order=[];
  const f=persistenceFixture({jput:async () => {order.push('save'); return {rev:1};}});
  f.p.trackNodeWork(work.promise);
  const creating=f.p.enqueueCardCreate(async () => {await create.promise; order.push('create');});
  const flush=f.p.flushLocalChanges(); await tick();
  assert.deepEqual(order,[]); assert.equal(f.p.status.pendingCardCreates,1);
  create.resolve(); await creating; await tick(); assert.deepEqual(order,['create']);
  work.resolve(); await flush; assert.deepEqual(order,['create','save']); assert.equal(f.p.busy,false);
  f.p.trackNodeWork(Promise.reject(Error('upload failed'))); await tick();
  await assert.rejects(f.p.flushLocalChanges(),/upload failed/);
  assert.equal(f.p.status.workFailure,null);
});

test('pure parameter presets and image-model switching preserve user data and mode-specific ratios', () => {
  const spec={options:['1280x720 (16:9)','bad','720x1280 (9:16)']};
  assert.deepEqual(parameters.resolutionPresets(spec).map(value => value.short),[720,720]);
  assert.equal(parameters.resolutionPreset(spec,'bad'),null);
  const cap=(id,mode) => ({id,imageControls:{mode,defaultRatio:mode==='i2i'?'original':'1:1',defaultClarity:'720P'},
    inputs:[{key:'steps',type:'number'},{key:'prompt',type:'textarea'},{key:'seed',type:'seed'}]});
  const a=cap('a','t2i'), b=cap('b','i2i');
  const card={cap:'a',params:{steps:8,prompt:'用户文本',seed:123,image_ratio:'16:9',image_clarity:'1080P'},assets:{image:{ref:'ref'}}};
  parameters.switchImageCapability(card,'b',a,b);
  assert.equal(card.params.steps,undefined); assert.equal(card.params.image_ratio,'original');
  card.params.steps=20; card.params.image_ratio='4:3';
  parameters.switchImageCapability(card,'a',b,a);
  assert.equal(card.params.steps,8); assert.equal(card.params.image_ratio,'16:9');
  assert.equal(card.params.prompt,'用户文本'); assert.equal(card.params.seed,123); assert.equal(card.assets.image.ref,'ref');
  parameters.switchImageCapability(card,'b',a,b);
  assert.equal(card.params.steps,20); assert.equal(card.params.image_ratio,'4:3');
  const params={}; parameters.applyInputPresets({inputs:[{key:'mode',default:'fast',presets:{fast:{steps:4}}}]},params);
  assert.deepEqual(params,{mode:'fast',steps:4});
  assert.throws(() => parameters.applyInputPresets({inputs:[{key:'mode',label:'模式',presets:{}}]},{mode:'invalid'}),/模式无效/);
});

function referenceFixture() {
  const pending=deferred(); let project, saves=0;
  const cap={id:'minimax_h3_video',kind:'gen',outputType:'video',inputs:[{key:'video',type:'video'},
    {key:'width',default:720},{key:'height',default:720},{key:'duration',default:5}]};
  const card={cap:cap.id,params:{},assets:{video:{ref:'video'}}}; project={id:'p',cards:[card]};
  const feature=parameters.create({getProject:() => project,getCapability:() => cap,getRunCapability:() => cap,
    isIF:() => false,normalizeIFDuration() {},api:() => pending.promise,save:() => saves++,onReferenceChange() {},multiple:16,ratioWH:{}});
  return {feature,card,pending,setProject:value => project=value,get saves(){return saves;}};
}
test('reference metadata applies original ratio and duration without overwriting later edits or projects', async () => {
  const f=referenceFixture(), update=f.feature.syncReferenceParameters(f.card);
  f.card.params.duration=3;
  f.pending.resolve({width:1920,height:1080,duration:9}); await update;
  assert.equal(f.card.params._ratio,'16:9'); assert.equal(f.card.params.duration,3);
  assert.equal(f.card.params.height,720); assert.equal(f.card.params.width,1280);
  const stale=referenceFixture(), late=stale.feature.syncReferenceParameters(stale.card);
  stale.setProject({id:'other',cards:[]}); stale.pending.resolve({width:1920,height:1080,duration:9}); await late;
  assert.deepEqual(stale.card.params,{}); assert.equal(stale.card.assets.video.width,undefined); assert.equal(stale.saves,0);
});

function taskFixture(extra={}) {
  const messages=[], calls=[];
  const button={classList:{toggle(){},remove(){}},appendChild(){}};
  const panel={style:{display:'none'}};
  const deps={document:{createElement:() => ({})},panel,button,getViewport:() => ({width:800,height:600}),
    getUser:() => ({role:'user'}),canTask:job => job?.permission==='operate',api:async url => {calls.push(url); return {jobs:[]};},
    jpost:async url => calls.push(url),jobProjName:() => '',fmtEla:() => '',histTime:() => '',
    toast:message => messages.push(message),showError:message => messages.push(message),confirm:() => true,
    onFocusTask() {},onJobsChanged:async () => {},...extra};
  return {feature:createTasks(deps),calls,messages,button};
}
test('task polling coalesces requests, clears on logout and rejects stale responses', async () => {
  const pending=deferred(); let requests=0, updates=0;
  const f=taskFixture({api:() => {requests++;return pending.promise;},onJobsChanged:() => updates++});
  const a=f.feature.pollJobs(), b=f.feature.pollJobs(); assert.equal(a,b); assert.equal(requests,1);
  f.feature.reset(); pending.resolve({jobs:[{id:'private',status:'running'}]}); await a;
  assert.equal(updates,0); assert.deepEqual(f.feature.getJobs(),[]);
});
test('task cancellation uses task permission, including revocation after opening the panel', async () => {
  const stale={id:'j',status:'running',permission:'operate'};
  const f=taskFixture({api:async () => ({jobs:[{...stale,permission:'read'}]})});
  await f.feature.pollJobs(); await f.feature.stopTask(stale); await f.feature.delTask(stale);
  assert.deepEqual(f.calls,[]); assert.ok(f.messages.every(message => message.includes('只读')));
  const g=taskFixture(); await g.feature.stopTask(stale); await tick();
  assert.ok(g.calls.includes('/api/job/j/cancel'));
});
test('canvas updater leaves readonly tasks untouched and stops across project switches', async () => {
  const hold=deferred(), saved=[], painted=[];
  let project={id:'a',cards:[{id:'c',job:'j',status:'running'},{id:'d',job:'k',status:'running'}]};
  const old=project;
  const update=createCanvasUpdater({getProject:() => project,canOperate:() => true,isIF:() => false,
    canTask:job => job.permission==='operate',paint:card => painted.push(card.id),refreshPanel() {},pushHistory() {},
    refreshHistory() {},propagateCardOutputs:() => hold.promise,titleOf:card => card.id,showError() {},save:() => saved.push(true)});
  await update([{id:'j',status:'done',permission:'read'},{id:'k',status:'running',permission:'read'}]);
  assert.deepEqual(painted,[]); assert.equal(old.cards[0].status,'running');
  const polling=update([{id:'j',status:'done',permission:'operate'},{id:'k',status:'done',permission:'operate'}]);
  project={id:'other',cards:[]}; hold.resolve(); await polling;
  assert.deepEqual(painted,['c']); assert.equal(old.cards[1].status,'running'); assert.deepEqual(saved,[]);
});
