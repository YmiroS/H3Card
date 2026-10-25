const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
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
function canvasTaskFixture(extra={}) {
  let project={id:'p',permission:'operate',cards:[{id:'c',job:'j',status:'running',step:'执行中',progress:0.4}]};
  const calls={paint:[],panel:[],history:[],refreshHistory:[],propagate:[],save:[],errors:[]};
  const update=createCanvasUpdater({getProject:() => project,canOperate:() => project?.permission==='operate',
    isIF:card => !!card.ifTask,canTask:job => job.permission==='operate',
    paint:card => calls.paint.push(card.id),refreshPanel:card => calls.panel.push(card.id),
    pushHistory:(card,job) => calls.history.push(job.id),refreshHistory:card => calls.refreshHistory.push(card.id),
    propagateCardOutputs:async card => calls.propagate.push(card.id),titleOf:card => card.id,
    showError:message => calls.errors.push(message),save:edit => calls.save.push(edit),...extra});
  return {update,calls,get project(){return project;},set project(value){project=value;},
    get card(){return project.cards[0];}};
}
const canvasJob = (extra={}) => ({id:'j',project:'p',card:'c',permission:'operate',status:'running',progress:0.6,...extra});

test('a poll started before production runCard submits cannot cancel its new job absent from the old list', async () => {
  const pending=deferred(), reference=deferred(), generation=deferred(), f=canvasTaskFixture();
  const tasks=taskFixture({api:() => pending.promise,onJobsChanged:f.update});
  const polling=tasks.feature.pollJobs();
  f.card.status='canceled';
  const submissions=[];
  const context=vm.createContext({PROJ:f.project,card:f.card,requireOperate:() => true,
    isStyle:() => false,isText:() => false,capOf:() => ({id:'video'}),
    syncReferenceParameters:() => reference.promise,payloadOf:() => ({project:'p',card:'c'}),
    jpost:(url,body) => {submissions.push({url,body});return generation.promise;},
    paint:card => f.calls.paint.push(card.id),openPanel() {},el:{panel:{}},
    save:edit => f.calls.save.push(edit),flushPendingProjectSync() {},
    persistence:{markWorkFailure:error => assert.fail(error.message)},showError:message => assert.fail(message)});
  const source=readFileSync(require.resolve('../web/app.js'),'utf8');
  vm.runInContext(source.slice(source.indexOf('async function runCard('),source.indexOf('async function cancel(c)')),context);
  const generating=context.runCard(f.card);
  assert.equal(f.card.job,null); assert.equal(f.card.status,'queued'); assert.equal(submissions.length,0);
  reference.resolve(); await tick();
  assert.equal(submissions.length,1); assert.equal(submissions[0].url,'/api/generate');
  assert.equal(f.card.job,null);
  generation.resolve({id:'new-job',status:'queued',seed:42}); await generating;
  const generated=structuredClone(f.card), painted=f.calls.paint.length, saved=f.calls.save.length;
  pending.resolve({jobs:[canvasJob({status:'canceled'})]}); await polling;
  assert.deepEqual(structuredClone(f.card),generated); assert.equal(f.calls.paint.length,painted); assert.equal(f.calls.save.length,saved);
  await f.update([]); assert.deepEqual(structuredClone(f.card),generated);
  await f.update([canvasJob({id:'new-job',status:'running'})]);
  assert.equal(f.card.job,'new-job'); assert.equal(f.card.status,'running');
});

test('missing jobs preserve every card field; explicit canceled retains association and can recover running/done', async () => {
  const f=canvasTaskFixture(), before=structuredClone(f.card);
  await f.update([]);
  assert.deepEqual(f.card,before); assert.ok(Object.values(f.calls).every(calls => !calls.length));
  await f.update([canvasJob({status:'canceled',step:''})]);
  assert.equal(f.card.status,'canceled'); assert.equal(f.card.job,'j'); assert.equal(f.card.step,'');
  await f.update([]); assert.equal(f.card.status,'canceled'); assert.equal(f.card.job,'j');
  await f.update([canvasJob({status:'running',step:'继续执行'})]);
  assert.equal(f.card.status,'running'); assert.equal(f.card.step,'继续执行');
  await f.update([canvasJob({status:'canceled'})]);
  const done=canvasJob({status:'done',outputs:[{url:'/result.png'}],seed:42,started:10,ended:13});
  await f.update([done]); await f.update([done]);
  assert.equal(f.card.status,'done'); assert.equal(f.card.job,'j'); assert.equal(f.card.ms,3000);
  assert.equal(f.card.seed,42); assert.deepEqual(f.card.outputs,done.outputs);
  assert.deepEqual(f.calls.history,['j']); assert.deepEqual(f.calls.propagate,['c']);
});

test('canvas synchronization and confirmed deletion respect task/project permissions, identity and IF isolation', async () => {
  for (const mode of ['task-read','project-read','wrong-project','wrong-card','if']) {
    for (const deleted of [false,true]) {
      const f=canvasTaskFixture(), job=canvasJob({status:'canceled'});
      if(mode==='task-read') job.permission='read';
      if(mode==='project-read') f.project.permission='read';
      if(mode==='wrong-project') job.project='other';
      if(mode==='wrong-card') job.card='other';
      if(mode==='if') f.card.ifTask=true;
      const before=structuredClone(f.card);
      await f.update([job],{deleted});
      assert.deepEqual(f.card,before,`${mode}, deleted=${deleted}`);
      assert.ok(Object.values(f.calls).every(calls => !calls.length));
    }
  }
});

test('old canvas poll skips regenerated or replaced cards after awaiting output propagation', async () => {
  for (const change of ['new-job','submitting','replacement','permission']) {
    const hold=deferred(), f=canvasTaskFixture({propagateCardOutputs:() => hold.promise});
    const second={id:'d',job:'k',status:'running'}; f.project.cards.push(second);
    const polling=f.update([canvasJob({status:'done'}),canvasJob({id:'k',card:'d',status:'done'})]);
    if(change==='new-job') Object.assign(second,{job:'new-k',status:'queued'});
    if(change==='submitting') Object.assign(second,{job:null,status:'queued'});
    if(change==='replacement') f.project.cards[1]={id:'d',job:'k',status:'queued'};
    if(change==='permission') f.project.permission='read';
    const before=structuredClone(f.project.cards[1]);
    hold.resolve(); await polling;
    assert.deepEqual(f.project.cards[1],before,change);
    assert.deepEqual(f.calls.paint,['c']); assert.deepEqual(f.calls.history,['j']);
    if(change==='permission') assert.deepEqual(f.calls.save,[]);
  }
});

test('confirmed DELETE explicitly cancels linked cards and invalidates an older running poll', async () => {
  const oldPoll=deferred(), f=canvasTaskFixture(), events=[];
  const tasks=taskFixture({api:async (url,opt) => opt?.method==='DELETE' ? {ok:true} : oldPoll.promise,
    onJobsChanged:f.update,onTaskDeleted:async job => {events.push(job.id);await f.update([job],{deleted:true});}});
  const polling=tasks.feature.pollJobs();
  await tasks.feature.delTask(canvasJob());
  assert.deepEqual(events,['j']); assert.equal(f.card.status,'canceled'); assert.equal(f.card.job,null);
  assert.equal(f.card.step,''); assert.deepEqual(f.calls.save,[false]);
  oldPoll.resolve({jobs:[canvasJob()]}); await polling;
  assert.equal(f.card.status,'canceled'); assert.equal(f.card.job,null);
  assert.deepEqual(tasks.feature.getJobs(),[]);
});

test('concurrent confirmed deletions both update their own card without invalidating each other', async () => {
  const pending=[deferred(),deferred()], f=canvasTaskFixture();
  f.project.cards.push({id:'d',job:'k',status:'running'});
  const tasks=taskFixture({api:async (url,opt) => opt?.method==='DELETE'
    ? pending[url.endsWith('/j') ? 0 : 1].promise : {jobs:[]},
    onJobsChanged:f.update,onTaskDeleted:job => f.update([job],{deleted:true})});
  const a=tasks.feature.delTask(canvasJob()), b=tasks.feature.delTask(canvasJob({id:'k',card:'d'}));
  pending[0].resolve({ok:true}); await a;
  pending[1].resolve({ok:true}); await b;
  assert.deepEqual(f.project.cards.map(card => [card.status,card.job]),[['canceled',null],['canceled',null]]);
});

test('pending, unsuccessful, forbidden, missing and timed-out DELETE never imply cancellation', async () => {
  const outcomes=[{ok:true,pending:true},{ok:false},{},
    Object.assign(Error('forbidden'),{status:403}),Object.assign(Error('not visible'),{status:404}),
    Object.assign(Error('timeout'),{name:'TimeoutError'}),Object.assign(Error('offline'),{status:503})];
  for(const outcome of outcomes) {
    const f=canvasTaskFixture(), before=structuredClone(f.card); let callbacks=0;
    const tasks=taskFixture({api:async (url,opt) => {
      if(opt?.method!=='DELETE') return {jobs:[]};
      if(outcome instanceof Error) throw outcome;
      return outcome;
    },onJobsChanged:f.update,onTaskDeleted:async job => {callbacks++;await f.update([job],{deleted:true});}});
    await tasks.feature.delTask(canvasJob()); await tick();
    assert.equal(callbacks,0); assert.deepEqual(f.card,before); assert.deepEqual(f.calls.save,[]);
    assert.equal(tasks.messages.length,outcome instanceof Error ? 1 : 0);
    if(outcome.pending) {
      await f.update([canvasJob({status:'canceled'})]);
      assert.equal(f.card.status,'canceled'); assert.equal(f.card.job,'j');
    }
  }
});

test('declining delete sends no request and successful deletion never changes already completed cards', async () => {
  const tasks=taskFixture({confirm:() => false,onTaskDeleted:() => assert.fail('unexpected deletion')});
  await tasks.feature.delTask(canvasJob()); assert.deepEqual(tasks.calls,[]);
  const f=canvasTaskFixture(); f.card.status='done'; f.card.outputs=[{url:'/kept.png'}];
  const before=structuredClone(f.card);
  await f.update([canvasJob({status:'done'})],{deleted:true});
  assert.deepEqual(f.card,before); assert.deepEqual(f.calls.save,[]);
});

test('DELETE responses cannot mutate another project, a new card attempt, or revoked sessions/permissions', async () => {
  for(const change of ['project','new-job','card','project-read','reset','retain']) {
    const pending=deferred(), f=canvasTaskFixture(); let callbacks=0;
    const tasks=taskFixture({api:async (url,opt) => opt?.method==='DELETE' ? pending.promise : {jobs:[]},
      onJobsChanged:f.update,onTaskDeleted:async job => {callbacks++;await f.update([job],{deleted:true});}});
    const deleting=tasks.feature.delTask(canvasJob());
    if(change==='project') f.project={id:'other',permission:'operate',cards:[{id:'c',job:'j',status:'running'}]};
    if(change==='new-job') f.card.job='new-job';
    if(change==='card') f.project.cards=[{id:'other-card',job:'j',status:'running'}];
    if(change==='project-read') f.project.permission='read';
    if(change==='reset') tasks.feature.reset();
    if(change==='retain') tasks.feature.retainProjects([]);
    const before=structuredClone(f.card);
    pending.resolve({ok:true}); await deleting; await tick();
    assert.deepEqual(f.card,before,change); assert.deepEqual(f.calls.save,[]);
    if(['reset','retain'].includes(change)) assert.equal(callbacks,0);
  }
});

test('permission revocation while DELETE waits prevents its canvas callback', async () => {
  const pending=deferred(); let callbacks=0;
  const tasks=taskFixture({api:async (url,opt) => opt?.method==='DELETE' ? pending.promise
    : {jobs:[canvasJob({permission:'read'})]},onTaskDeleted:() => callbacks++});
  const deleting=tasks.feature.delTask(canvasJob()); await tasks.feature.pollJobs();
  pending.resolve({ok:true}); await deleting; assert.equal(callbacks,0);
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
