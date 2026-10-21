const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync, existsSync} = require('node:fs');
const {createServer} = require('node:http');
const {createHash} = require('node:crypto');
const path = require('node:path');
const {chromium} = require('playwright');

const root = path.join(__dirname, '..');
const web = path.join(root, 'web');
const cards = JSON.parse(readFileSync(path.join(root, 'manifests', '_cards.json'), 'utf8'));
const capabilities = Object.fromEntries(['if_image', 'if_video', 'zimage_t2i', 'zimage_i2i', 'minimax_h3_character_transfer']
  .map(id => [id, JSON.parse(readFileSync(path.join(root, 'manifests', id + '.json'), 'utf8'))]));
const ifModelLimits = JSON.parse(readFileSync(path.join(root, 'manifests', '_if_model_limits.json'), 'utf8'));
test('IF reference matrix follows user research and uses explicit fallback quantities', () => {
  const expected = {
    'qwen-image-2.0':[3,0], 'qwen-image-3.0':[3,0], '万相2.7图像生成':[3,0],
    'z-image-turbo':[1,0], 'Nano Banana 2':[3,0], 'Nano Banana Pro':[3,0],
    '即梦5.0':[10,0], '即梦5.0 Pro':[10,0], 'GPT-Image-2.5':[3,0], 'GPT-Image-2':[3,0],
    'HappyHorse-1.1视频':[9,1], 'HappyHorse-1.0视频【内测】':[9,1], 'Wan3.0视频':[10,5],
    'Seedance 2.0':[9,3], 'Seedance 2.5':[30,10], 'Minimax H3':[9,3],
    '可灵3.0 Omni':[4,1], '星辰图生视频':[6,1],
  };
  assert.deepEqual(Object.keys(ifModelLimits).sort(), Object.keys(expected).sort());
  for (const [name, limit] of Object.entries(ifModelLimits)) {
    assert.ok(['image', 'video'].includes(limit.type), name);
    for (const kind of ['image', 'video', 'audio']) {
      assert.ok(Number.isInteger(limit.bridge[kind]) && limit.bridge[kind] >= 0, `${name}: ${kind}`);
      if (limit.type === 'image' && kind !== 'image') assert.equal(limit.bridge[kind], 0, `${name}: ${kind}`);
    }
    assert.deepEqual([limit.bridge.image, limit.bridge.video], expected[name], name);
    if (limit.reference_fallback) assert.deepEqual(limit.bridge,
      {image:limit.type === 'video' ? 6 : 3, video:limit.type === 'video' ? 1 : 0, audio:0}, name);
    assert.equal(limit.bridge.audio, 0, name);
  }
});
const durationRanges = {
  'Wan3.0视频':[2, 30], 'HappyHorse-1.1视频':[3, 15], 'HappyHorse-1.0视频【内测】':[3, 15],
  'Seedance 2.0':[4, 15], 'Seedance 2.5':[4, 30], 'Minimax H3':[5, 15],
  '星辰图生视频':[null, null], '可灵3.0 Omni':[3, 15],
};
test('IF video HD presets use exact dimensions and never affect local workflows', () => {
  const vm = require('node:vm'), source = readFileSync(path.join(web, 'app.js'), 'utf8');
  const helper = source.slice(source.indexOf('const IF_VIDEO_RESOLUTIONS ='), source.indexOf('const H3_LONG ='));
  const resolve = vm.runInNewContext(helper + '; ifVideoResolution', {RATIO_WH:{
    '16:9 (Widescreen)':[16,9], '9:16 (Portrait Widescreen)':[9,16], '1:1 (Square)':[1,1]}});
  for (const [id, width, height] of [['1080p',1920,1080], ['2K',2560,1440], ['4K',3840,2160]]) {
    const c = {params:{if_video_resolution:id}};
    assert.deepEqual(JSON.parse(JSON.stringify(resolve(c, capabilities.if_video))), {label:id, width, height});
    c.params.aspect_ratio = '9:16 (Portrait Widescreen)';
    const portrait = resolve(c, capabilities.if_video);
    assert.equal(portrait.width, height); assert.equal(portrait.height, width);
    c.params.aspect_ratio = '1:1 (Square)';
    assert.equal(resolve(c, capabilities.if_video).width, height);
    assert.equal(resolve(c, capabilities.minimax_h3_character_transfer), null);
    assert.equal(resolve(c, capabilities.if_image), null);
  }
  assert.equal(resolve({params:{}}, capabilities.if_video), null, 'legacy MP settings remain in effect');
});
test('IF duration limits match the supplied model table, with unknown ranges preserved', () => {
  for (const [name, range] of Object.entries(durationRanges)) {
    assert.deepEqual([ifModelLimits[name].duration.min, ifModelLimits[name].duration.max], range, name);
  }
});
test('IF canvas links preserve full IDs and reject unsafe destinations', () => {
  const source = readFileSync(path.join(web, 'app.js'), 'utf8');
  const helper = source.slice(source.indexOf('function ifCanvasURL('), source.indexOf('function ifCanvasLink('));
  const normalize = require('node:vm').runInNewContext(helper + '; ifCanvasURL', {URL});
  const id = 'c_OcBXJf2Bd0CxY-', url = 'https://ifs.alibaba-inc.com/#/canvas/' + id;
  assert.equal(normalize({canvas_id:id}), url);
  assert.equal(normalize({canvas_url:url}), url);
  for (const bad of ['javascript:alert(1)', 'https://ifs.alibaba-inc.com.evil.test/#/canvas/' + id,
    'https://evil.test/#/canvas/' + id, 'https://user@ifs.alibaba-inc.com/#/canvas/' + id,
    'http://ifs.alibaba-inc.com/#/canvas/' + id, 'https://ifs.alibaba-inc.com/other#/canvas/' + id])
    assert.equal(normalize({canvas_url:bad}), '');
  for (const bad of ['', '../bad', 'c_bad/other', 'c_bad?token=x', 'c_bad#fragment', null])
    assert.equal(normalize({canvas_id:bad}), '');
});
test('IF manual recovery queries existing jobs only and leaves missing or stale tasks unchanged', async () => {
  const vm = require('node:vm'), source = readFileSync(path.join(web, 'app.js'), 'utf8');
  const helper = source.slice(source.indexOf('async function restoreIFOutputs('), source.indexOf('function ifTaskKey('));
  const make = (options = {}) => {
    const card = {id:'c1', cap:'if_video', job:'j1', if_request_id:'r1', if_started:100,
      status:'error', error:'协作误标失败', outputs:[]};
    const calls = [], errors = [], project = {id:'p1', cards:[card]};
    const ctx = vm.createContext({PROJ:project, canOperate:()=>options.allowed !== false, isIF:()=>true,
      confirm:()=>options.confirm !== false, el:{panel:{}}, openPanel(){}, paint(){},
      showError:message=>errors.push(message),
      ifRequest:async (url, init) => {
        assert.equal(init, undefined, 'recovery must use GET, not create a run');
        calls.push(url);
        if (options.query) return options.query(url, card, ctx);
        return url.startsWith('/requests/') ? {id:'j1'} : {state:options.state || 'done'};
      },
      rememberIFTask:(c,p,phase)=>{calls.push('journal'); assert.equal(phase, 'running'); return true;},
      saveIFTaskProject:async()=>calls.push('save'),
      pollIF:async(c,p,job)=>{calls.push('poll:' + job.state); assert.equal(c.status, 'running');},
    });
    vm.runInContext(helper, ctx);
    return {card, calls, errors, ctx, run:()=>ctx.restoreIFOutputs(card)};
  };
  for (const state of ['done', 'running', 'starting']) {
    const t = make({state}); await t.run();
    assert.deepEqual(t.calls, ['/runs/j1', 'journal', 'save', 'poll:' + state]);
    assert.equal(t.card.job, 'j1'); assert.equal(t.card.error, null);
  }
  const byRequest = make(); byRequest.card.job = null; await byRequest.run();
  assert.deepEqual(byRequest.calls.slice(0, 2), ['/requests/r1', '/runs/j1']);
  assert.equal(byRequest.card.job, 'j1');
  for (const options of [{confirm:false}, {allowed:false}]) {
    const t = make(options); await t.run(); assert.deepEqual(t.calls, []);
  }
  for (const query of [async()=>{throw Object.assign(new Error('任务不存在'), {status:404});},
    async()=>({state:'error', error:'原任务失败'}), async()=>{throw new TypeError('Failed to fetch');}]) {
    const t = make({query}); await t.run();
    assert.deepEqual(t.calls, ['/runs/j1']);
    assert.equal(t.card.status, 'error'); assert.equal(t.card.error, '协作误标失败');
    assert.equal(t.errors.length, 1); assert.match(t.errors[0], /未重新提交生成/);
  }
  const stale = make({query:async(url, c)=>{c.job = 'new-job'; return {state:'done'};}});
  await stale.run(); assert.deepEqual(stale.calls, ['/runs/j1']); assert.equal(stale.card.job, 'new-job');
  let release;
  const duplicate = make({query:()=>new Promise(resolve=>{release = resolve;})});
  const pending = duplicate.run(); await duplicate.run();
  assert.deepEqual(duplicate.calls, ['/runs/j1']);
  release({state:'done'}); await pending;
  assert.equal(duplicate.card._ifRestoring, false);
});
test('IF recovered outputs survive failed project saves and uploads cannot write into a switched project', async () => {
  const vm = require('node:vm'), source = readFileSync(path.join(web, 'app.js'), 'utf8');
  const journal = source.slice(source.indexOf('function ifTaskKey('), source.indexOf('function reusableIFURL('));
  const storage = new Map();
  const card = {id:'c1', cap:'if_video', job:'j1', if_request_id:'r1', if_started:100,
    status:'done', outputs:[{url:'/restored.mp4'}]};
  const ctx = vm.createContext({H3Auth:{user:{id:'u1'}}, isIF:()=>true,
    sessionStorage:{getItem:k=>storage.get(k) ?? null, setItem:(k,v)=>storage.set(k,v), removeItem:k=>storage.delete(k)},
    enqueueSave:async()=>({ok:false})});
  vm.runInContext(journal, ctx);
  ctx.rememberIFTask(card, 'p1', 'done');
  await ctx.saveIFTaskProject(card, 'p1');
  const stale = {...card, status:'error', outputs:[]};
  assert.equal(ctx.restoreIFTask(stale, 'p1'), true);
  assert.equal(stale.status, 'done'); assert.equal(stale.outputs[0].url, '/restored.mp4');
  assert.equal(ctx.restoreIFTask({...card, status:'error', if_started:101}, 'p1'), false);
  card.status = 'running'; card.outputs = [];
  ctx.PROJ = {id:'p1', cards:[card]}; ctx.canOperate = ()=>true; ctx.ownsIFTask = ()=>true;
  ctx.capOf = ()=>({outputType:'video'}); ctx.KIND_ZH = {video:'视频'};
  ctx.rememberIFReferences = ()=>{}; ctx.ifCanvasURL = ()=>''; ctx.paint = ()=>{};
  ctx.IF_BRIDGE = 'http://127.0.0.1:19781'; ctx.File = class {};
  ctx.fetch = async()=>({ok:true, blob:async()=>({})});
  ctx.uploadAsset = async()=>{ctx.PROJ = {id:'other', cards:[]}; return {url:'/wrong-project.mp4'};};
  ctx.propagateCardOutputs = ()=>{throw new Error('stale upload must not propagate');};
  const poll = source.slice(source.indexOf('async function pollIF('), source.indexOf('async function runCard('));
  vm.runInContext(poll, ctx);
  await ctx.pollIF(card, 'p1', {state:'done', result:{downloaded:[{type:'video', name:'out.mp4', index:0}]}});
  assert.equal(card.status, 'running'); assert.deepEqual(card.outputs, []);
});
test('IF refresh only resumes tasks recorded by the initiating browser session', async () => {
  const vm = require('node:vm'), source = readFileSync(path.join(web, 'app.js'), 'utf8');
  const journal = source.slice(source.indexOf('function ifTaskKey('), source.indexOf('async function saveIFTaskProject('));
  const resume = source.slice(source.indexOf('function resumeIFTask('), source.indexOf('async function recoverIFSubmission('));
  const storage = new Map(), calls = [];
  const ctx = vm.createContext({H3Auth:{user:{id:'u1'}},
    sessionStorage:{getItem:k=>storage.get(k) ?? null, setItem:(k,v)=>storage.set(k,v)},
    isIF:()=>true, canOperate:()=>true, pollIF:()=>calls.push('poll'),
    recoverIFSubmission:()=>calls.push('recover')});
  vm.runInContext(journal + resume, ctx);
  const card = {id:'c1', cap:'if_video', status:'running', job:'j1', if_request_id:'r1', if_started:100};
  ctx.resumeIFTask(card, 'p1');
  assert.deepEqual(calls, [], 'collaborator must not query their own bridge');
  ctx.rememberIFTask(card, 'p1', 'running');
  ctx.resumeIFTask(card, 'p1');
  assert.deepEqual(calls, ['poll'], 'initiator can resume after refresh');
  ctx.resumeIFTask({...card, if_request_id:'r2'}, 'p1');
  ctx.resumeIFTask({...card, job:'j2'}, 'p1');
  ctx.resumeIFTask({...card, if_started:101}, 'p1');
  ctx.resumeIFTask(card, 'other-project');
  ctx.H3Auth.user.id = 'u2';
  ctx.resumeIFTask(card, 'p1');
  assert.deepEqual(calls, ['poll'], 'other attempts, projects and users cannot take over');
  ctx.H3Auth.user.id = 'u1';
  const submitting = {...card, job:null};
  ctx.rememberIFTask(submitting, 'p1', 'submitting');
  ctx.resumeIFTask(submitting, 'p1');
  assert.deepEqual(calls, ['poll', 'recover']);
  storage.clear();
  ctx.resumeIFTask(submitting, 'p1');
  assert.deepEqual(calls, ['poll', 'recover'], 'observer cannot recover an unconfirmed submission');
  const polling = source.slice(source.indexOf('async function pollIF('), source.indexOf('async function runCard('));
  const recovering = source.slice(source.indexOf('async function recoverIFSubmission('), source.indexOf('async function runIF('));
  ctx.PROJ = {id:'p1', cards:[card]};
  ctx.ifRequest = () => { throw new Error('observer contacted bridge'); };
  vm.runInContext(polling + recovering, ctx);
  await ctx.pollIF(card, 'p1');
  card.job = null;
  await ctx.recoverIFSubmission(card, 'p1');
  assert.equal(card.status, 'running');
  assert.equal(card._ifPolling, undefined);
  assert.equal(card._ifRecovering, undefined);
});
test('IF collaboration preserves active attempts and respects terminal, newer and deleted cards', () => {
  const vm = require('node:vm'), source = readFileSync(path.join(web, 'app.js'), 'utf8');
  const journal = source.slice(source.indexOf('function ifTaskKey('), source.indexOf('async function saveIFTaskProject('));
  const apply = source.slice(source.indexOf('function applyCollaborativeProject('), source.indexOf('function flushPendingProjectSync('));
  const make = (status = 'running') => {
    const active = {id:'c1', cap:'if_video', job:status === 'queued' ? null : 'job-1', status,
      if_started:100, if_request_id:'request-1', params:{prompt:'keep input'}, assets:{}, step:'正在生成', history:[], outputs:[]};
    const storage = new Map(), polls = [];
    const ctx = vm.createContext({PROJ:{id:'p1', rev:1, cards:[active]}, H3Auth:{user:{id:'u1'}},
      sessionStorage:{getItem:key=>storage.get(key) ?? null, setItem:(key,value)=>storage.set(key,value), removeItem:key=>storage.delete(key)},
      isIF:c=>c.cap === 'if_video', canSave:()=>false, NODE_EDITOR:false,
      persistence:require('../web/features/project-persistence.js').create({}),
      pendingDirectorRuns:0, pendingProjectSync:null, el:{panel:{style:{display:'none'}}, ptitle:{}},
      selId:null, selIds:new Set(), resetCanvasHistory(){}, seedHistory(){}, render(){}, closePanel(){},
      resumeIFTask:c=>{if (c.cap === 'if_video' && c.job && c.status === 'running' && !c._ifPolling) polls.push(c.job);}});
    vm.runInContext(journal + apply, ctx);
    return {active, ctx, polls, apply:cards=>ctx.applyCollaborativeProject({id:'p1', rev:ctx.PROJ.rev+1, cards})};
  };
  for (const phase of ['preparing', 'submitting', 'running']) {
    const t = make(phase === 'running' ? 'running' : 'queued');
    t.ctx.rememberIFTask(t.active, 'p1', phase);
    t.active._ifPolling = phase === 'running';
    t.apply([{...t.active, params:{prompt:'remote old input'}, job:null, status:'idle', x:400, _ifPolling:undefined}]);
    assert.equal(t.ctx.PROJ.cards[0], t.active, phase);
    assert.equal(t.active.params.prompt, 'keep input', phase);
    assert.equal(t.active.status, phase === 'running' ? 'running' : 'queued', phase);
    assert.equal(t.active.x, 400);
    assert.equal(t.active._ifPolling, phase === 'running');
    assert.equal(t.polls.length, 0, 'an in-flight poll must not be duplicated');
  }
  const observer = make();
  observer.apply([{...observer.active, step:'对方正在保存产物', job:'job-2'}]);
  assert.equal(observer.ctx.PROJ.cards[0].step, '对方正在保存产物');
  assert.equal(observer.ctx.PROJ.cards[0].job, 'job-2', 'observer must accept remote task updates');
  const waitingPoll = make();
  waitingPoll.ctx.rememberIFTask(waitingPoll.active, 'p1', 'running');
  waitingPoll.active._ifPolling = false;
  waitingPoll.apply([{...waitingPoll.active}]);
  assert.equal(waitingPoll.ctx.PROJ.cards[0], waitingPoll.active);
  assert.equal(waitingPoll.polls.length, 0, 'preserved cards retain their scheduled polling loop');
  const finished = make();
  finished.ctx.rememberIFTask(finished.active, 'p1', 'running');
  finished.apply([{...finished.active, status:'done', outputs:[{url:'/finished.mp4'}]}]);
  assert.equal(finished.ctx.PROJ.cards[0].status, 'done');
  assert.equal(finished.polls.length, 0);
  const newer = make();
  newer.ctx.rememberIFTask(newer.active, 'p1', 'running');
  newer.apply([{...newer.active, if_started:200, job:'job-2'}]);
  assert.equal(newer.ctx.PROJ.cards[0].job, 'job-2');
  assert.notEqual(newer.ctx.PROJ.cards[0], newer.active);
  assert.deepEqual(newer.polls, ['job-2']);
  for (const status of ['running', 'done']) {
    const conflict = make();
    conflict.ctx.rememberIFTask(conflict.active, 'p1', 'running');
    conflict.apply([{...conflict.active, job:'job-2', status, outputs:[{url:'/remote.mp4'}]}]);
    assert.equal(conflict.ctx.PROJ.cards[0].job, 'job-2');
    assert.equal(conflict.ctx.PROJ.cards[0].status, status);
    assert.equal(conflict.ctx.PROJ.cards[0].outputs[0].url, '/remote.mp4');
    assert.deepEqual(conflict.polls, status === 'running' ? ['job-2'] : []);
    assert.equal(conflict.ctx.sessionStorage.getItem(conflict.ctx.ifTaskKey(conflict.active, 'p1')), null);
  }
  const accepted = make('queued');
  accepted.ctx.rememberIFTask(accepted.active, 'p1', 'submitting');
  accepted.ctx.PROJ.cards = [];
  accepted.apply([{...accepted.active, job:'accepted-job', status:'running'}]);
  assert.equal(accepted.ctx.PROJ.cards[0].job, 'accepted-job', 'accepted server job beats a pre-acceptance journal');
  assert.equal(accepted.ctx.PROJ.cards[0].status, 'running');
  const uncertain = make('queued');
  uncertain.active.if_request_id = 'a'.repeat(32);
  uncertain.ctx.rememberIFTask(uncertain.active, 'p1', 'submitting');
  const timedOut = {...uncertain.active, status:'error'};
  assert.equal(uncertain.ctx.restoreIFTask(timedOut, 'p1'), true);
  assert.equal(timedOut.status, 'running', 'a lookup timeout is not a confirmed terminal job');
  assert.ok(uncertain.ctx.sessionStorage.getItem(uncertain.ctx.ifTaskKey(timedOut, 'p1')));
  const otherRequest = make('queued');
  otherRequest.active.if_request_id = 'a'.repeat(32);
  otherRequest.ctx.rememberIFTask(otherRequest.active, 'p1', 'preparing');
  otherRequest.apply([{...otherRequest.active, if_request_id:'b'.repeat(32)}]);
  assert.notEqual(otherRequest.ctx.PROJ.cards[0], otherRequest.active);
  assert.equal(otherRequest.ctx.PROJ.cards[0].if_request_id, 'b'.repeat(32));
  assert.equal(otherRequest.ctx.sessionStorage.getItem(otherRequest.ctx.ifTaskKey(otherRequest.active, 'p1')), null);
  const deleted = make();
  deleted.ctx.rememberIFTask(deleted.active, 'p1', 'running');
  deleted.apply([]);
  assert.equal(deleted.ctx.PROJ.cards.length, 0);
  const changedMode = make();
  changedMode.ctx.rememberIFTask(changedMode.active, 'p1', 'running');
  changedMode.apply([{id:'c1', cap:'local_video', status:'idle'}]);
  assert.equal(changedMode.ctx.PROJ.cards[0].cap, 'local_video');
  assert.equal(changedMode.polls.length, 0);
  for (const status of ['running', 'done']) {
    const recovered = make(status);
    recovered.active.outputs = [{url:'/recover.mp4'}];
    recovered.ctx.rememberIFTask(recovered.active, 'p1', status);
    recovered.ctx.PROJ.cards = [{id:'c1', cap:'if_video', status:'idle'}];
    recovered.apply([{id:'c1', cap:'if_video', status:'idle'}]);
    assert.equal(recovered.ctx.PROJ.cards[0].status, status);
    assert.equal(recovered.ctx.PROJ.cards[0].outputs[0].url, '/recover.mp4');
    assert.equal(recovered.polls.length, status === 'running' ? 1 : 0);
  }
});
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

const card = (kind, model) => ({id:'if-card', type:kind === 'image' ? 'card_image' : 'card_video',
  cap:kind === 'image' ? 'if_image' : 'if_video', x:550, y:20,
  params:{if_model:model}, assets:{}, outputs:[]});

test('IF in canvas image and video panels uses local bridge and saves results', async () => {
  let project = {id:'if-test', rev:0, name:'IF 模型菜单', permission:'operate', locked:false,
    edges:[], groups:[], view:{x:100, y:70, k:1}, cards:[card('image', 'qwen-image-2.0')]};
  const requests = [], runs = [], uploadedReferences = [], extraModels = [];
  const modelQuotas = new Map();
  let failModelRefresh = false, holdModels = null;
  const referenceId = 'a'.repeat(32);
  let failMediaOnce = true;
  let returnVideoStoryboard = false;
  let returnVideoPlanOnly = false;
  let emitReferenceURLs = false, reuseFailure = null;
  let rejectProjectSaves = false, rejectSavesAfterSubmit = false, heldIFStep = null;
  let ifPollCount = 0, recoveryLookupStatus = 0, recoveryLookups = 0;
  const sourceVersions = new Map(), sourceReads = [], deniedSources = new Set();
  const sourceVersion = source => '"' + createHash('sha256').update(source + ':' + (sourceVersions.get(source) || 1)).digest('hex') + '"';
  const resultReferences = run => (run.references || []).map((item, index) => ({index, kind:item.kind,
    url:item.url || `https://ant.alicdn.com/bio/img/f_${item.asset_id}.${item.kind === 'image' ? 'webp' : 'mp4'}`}));
  const json = (res, data) => {res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data));};
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;
    if (pathname === '/api/auth/me') return json(res, {user:{id:'admin', username:'admin', role:'admin'}, csrf_token:'test-csrf'});
    if (pathname === '/api/auth/presence' || pathname.endsWith('/presence')) return json(res, {ok:true, users:[]});
    if (pathname === '/api/cards') return json(res, {cards, capabilities, if_model_limits:ifModelLimits, comfy_online:true});
    if (pathname === '/api/health') return json(res, {comfy_online:true});
    if (pathname === '/api/if-reference' && req.method === 'HEAD') {
      if (deniedSources.has(url.searchParams.get('url'))) {res.writeHead(403); return res.end();}
      res.setHeader('ETag', sourceVersion(url.searchParams.get('url'))); return res.end();
    }
    if (pathname === '/api/jobs') return json(res, {jobs:[]});
    if (pathname === '/api/projects') return json(res, {projects:[{...project, cards:1}]});
    if (pathname === '/api/projects/if-test' && req.method === 'GET') return json(res, project);
    if (pathname === '/api/projects/if-test' && req.method === 'PUT') {
      if (rejectProjectSaves) {req.resume(); res.statusCode = 503; return json(res, {error:'模拟项目保存失败'});}
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {const next = JSON.parse(Buffer.concat(chunks));
        project = {...project, ...next, rev:project.rev + 1}; json(res, {ok:true, rev:project.rev});});
      return;
    }
    if (pathname === '/api/upload') {
      req.resume(); const kind = url.searchParams.has('local_only') ? 'image' : 'video';
      const ext = kind === 'image' ? 'png' : 'mp4';
      return json(res, {files:[{kind, ref:`if-result.${ext}`, origin:`if-result.${ext}`, url:`/fixture.${ext}`}]});
    }
    if (pathname === '/fixture.png') {res.setHeader('Content-Type', 'image/png'); return res.end(png);}
    if (pathname === '/fixture.mp4') {res.setHeader('Content-Type', 'video/mp4'); return res.end('fake-video');}
    if (pathname === '/api/generate') {requests.push('unexpected generation'); res.writeHead(400); return res.end();}
    const name = pathname === '/' ? 'index.html' : pathname.slice(1);
    const file = path.join(web, name);
    if (name && (!name.includes('/') || require('./helpers/frontend-static.cjs').canvasNames.includes(name)) && existsSync(file)) {
      res.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript'
        : name.endsWith('.css') ? 'text/css' : name.endsWith('.png') ? 'image/png' : 'text/html');
      return res.end(readFileSync(file));
    }
    requests.push(req.method + ' ' + pathname); res.writeHead(404); res.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
    const page = await browser.newPage({viewport:{width:1600, height:1100}});
    page.setDefaultTimeout(20000);
    const origin = `http://127.0.0.1:${server.address().port}`;
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const busySteps = [];
    const checkBusy = async pattern => {
      const state = await page.evaluate(() => {
        const c = PROJ.cards[0];
        return {status:c.status, step:c.step, progress:c.progress,
          loading:!!c._el.querySelector('.body .load'),
          oldMedia:c._el.querySelectorAll('.body img, .body video').length,
          foot:c._el.querySelector('.cf .st').textContent,
          disabled:document.querySelector('#panel .go')?.disabled ?? null};
      });
      assert.ok(['queued', 'running'].includes(state.status));
      assert.match(state.step, pattern);
      assert.equal(state.loading, true, 'IF must show loading even while previous outputs are retained');
      assert.equal(state.oldMedia, 0, 'old output must not overwrite the loading spinner');
      if (state.disabled !== null)
        assert.equal(state.disabled, true, 'generation stays disabled throughout preparation');
      assert.equal(state.progress, null, 'unverified numeric IF progress must not be invented');
      assert.ok(state.foot.includes(state.step), 'the actual stage must be visible in the card footer');
      assert.doesNotMatch(state.foot, /\d+%/);
      busySteps.push(state.step);
    };
    await page.route(origin + '/api/upload?*', async route => {
      if (route.request().method() === 'POST') await checkBusy(/^正在保存 IF /);
      return route.fallback();
    });
    let checkedReferenceRead = false;
    await page.route(origin + '/fixture.*', async route => {
      if (route.request().resourceType() === 'fetch'
          && await page.evaluate(() => PROJ?.cards[0]?.step?.startsWith('正在读取 IF ')).catch(() => false))
        sourceReads.push(new URL(route.request().url()).pathname);
      if (!checkedReferenceRead && route.request().resourceType() === 'fetch'
          && await page.evaluate(() => PROJ?.cards[0]?.step?.startsWith('正在读取 IF '))) {
        checkedReferenceRead = true;
        await checkBusy(/^正在读取 IF /);
      }
      return route.fallback();
    });
    let firstRunPolls = 0;
    await page.route('http://127.0.0.1:8278/**', async route => {
      const request = route.request(), url = new URL(request.url());
      const headers = {'Access-Control-Allow-Origin':origin, 'Access-Control-Allow-Methods':'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers':'Content-Type, X-Chouka-IF', 'Access-Control-Allow-Private-Network':'true'};
      if (request.method() === 'OPTIONS') return route.fulfill({status:204, headers});
      if (request.method() === 'DELETE' && url.pathname.startsWith('/assets/'))
        return route.fulfill({status:200, headers, contentType:'application/json', body:'{"ok":true}'});
      if ((url.pathname === '/status' || url.pathname === '/models')
          && await page.evaluate(() => PROJ?.cards[0]?.status === 'queued'))
        await checkBusy(/^正在连接本机 IF 并读取模型$/);
      if (url.pathname === '/models' && holdModels) await holdModels;
      if (url.pathname === '/models' && failModelRefresh)
        return route.fulfill({status:503, headers, contentType:'application/json', body:JSON.stringify({error:'额度刷新失败'})});
      if (url.pathname === '/runs' && request.method() === 'POST') await checkBusy(/^正在交由本机 IF 桥接处理$/);
      if (url.pathname === '/runs/bridge-1' && firstRunPolls === 0) {
        assert.equal(project.cards[0].job, 'bridge-1', 'persist the accepted task before polling starts');
        assert.equal(project.cards[0].status, 'running');
        await checkBusy(/^本机 IF 正在准备生成任务$/);
      }
      if (url.pathname === '/runs/bridge-1' && firstRunPolls < 3) {
        const states = [{state:'starting', step:'正在上传 IF 引用素材（1/1）'},
          {state:'starting', step:'正在向 IF 一次提交全部引用与图片生成需求'},
          {state:'running', step:'IF 正在生成图片，等待产物'}];
        return route.fulfill({status:200, headers, contentType:'application/json',
          body:JSON.stringify(states[firstRunPolls++])});
      }
      if (url.pathname === '/assets') {
        await checkBusy(/^正在向本机桥接传送.+引用（\d+\/\d+）$/);
        uploadedReferences.push({type:request.headers()['content-type'], body:request.postDataBuffer()});
        const asset_id = uploadedReferences.length <= 2 ? referenceId
          : 'b'.repeat(31) + uploadedReferences.length;
        return route.fulfill({status:201, headers, contentType:'application/json', body:JSON.stringify({asset_id})});
      }
      if (url.pathname.endsWith('/media/0')) {
        await checkBusy(/^正在取回 IF .+产物（1\/1）$/);
        const kind = runs.at(-1).type;
        if (kind === 'image' && failMediaOnce) {
          failMediaOnce = false;
          return route.fulfill({status:503, headers, body:'temporary media error'});
        }
        return route.fulfill({status:200, headers, contentType:kind === 'image' ? 'image/png' : 'video/mp4',
          body:kind === 'image' ? png : Buffer.from('fake-video')});
      }
      if (emitReferenceURLs && reuseFailure && /^\/runs\/bridge-\d+$/.test(url.pathname)) {
        const result = {canvas_id:'c_OcBXJf2Bd0CxY-', reference_urls:resultReferences(runs.at(-1)).slice(0, reuseFailure === 'partial' ? 1 : undefined)};
        if (reuseFailure === 'expired') result.invalid_reference_indices = [1];
        return route.fulfill({status:200, headers, contentType:'application/json',
          body:JSON.stringify({state:'error', error:'模拟 IF 引用或生成失败', result})});
      }
      if (url.pathname === '/runs' && request.method() === 'POST' && rejectSavesAfterSubmit)
        rejectProjectSaves = true;
      if (/^\/runs\/bridge-\d+$/.test(url.pathname)) {
        ifPollCount++;
        if (heldIFStep) return route.fulfill({status:200, headers, contentType:'application/json',
          body:JSON.stringify({state:'running', step:heldIFStep, result:{reference_urls:resultReferences(runs.at(-1))}})});
      }
      if (url.pathname.startsWith('/requests/')) {
        recoveryLookups++;
        if (recoveryLookupStatus) return route.fulfill({status:recoveryLookupStatus, headers,
          contentType:'application/json', body:JSON.stringify({error:'模拟任务尚未登记或桥接暂不可用'})});
        const index = runs.findIndex(run => run.request_id === url.pathname.split('/')[2]);
        return route.fulfill({status:index < 0 ? 404 : 200, headers, contentType:'application/json',
          body:JSON.stringify(index < 0 ? {error:'尚未找到该请求'} : {id:'bridge-' + (index + 1)})});
      }
      const result = url.pathname === '/status' ? {ready:true, reference_reuse:true, request_recovery:true}
        : url.pathname === '/models' ? {models:[{display_name:'qwen-image-3.0', type:'image'},
          {display_name:'qwen-image-2.0', type:'image'}, {display_name:'z-image-turbo', type:'image'},
          {display_name:'Wan3.0视频', type:'video'}, {display_name:'Minimax H3', type:'video'},
          {display_name:'星辰图生视频', type:'video'}, {display_name:'可灵3.0 Omni', type:'video'},
          ...['HappyHorse-1.1视频', 'HappyHorse-1.0视频【内测】', 'Seedance 2.0', 'Seedance 2.5']
            .map(display_name => ({display_name, type:'video'})), ...extraModels]
              .map(model => ({...model, ...(modelQuotas.get(model.display_name) || {quota_status:'limited', remaining:30})}))}
        : url.pathname === '/runs' && request.method() === 'POST'
          ? (runs.push(request.postDataJSON()), {id:'bridge-' + runs.length})
          : /^\/runs\/bridge-\d+$/.test(url.pathname) ? {state:'done', result:{status:'done', canvas_id:'c_OcBXJf2Bd0CxY-',
            ...(emitReferenceURLs ? {reference_urls:resultReferences(runs.at(-1))} : {}),
            ...(runs.at(-1).references?.length > 1 ? {submitted_prompt:
              '图片1：https://example.com/ref1.png\n图片2：https://example.com/ref2.png\n视频1：https://example.com/ref1.mp4\n视频2：https://example.com/ref2.mp4\n\n使用模型：' + runs.at(-1).model + '\n\n生成需求：\n' + runs.at(-1).prompt} : {}),
            planning_text:returnVideoStoryboard || returnVideoPlanOnly ? '请确认这张故事板，再生成下一张图片' : '',
            downloaded:returnVideoPlanOnly ? [] : [{index:0, type:returnVideoStoryboard ? 'image' : runs.at(-1).type,
              name:runs.at(-1).type === 'image' || returnVideoStoryboard ? 'result.png' : 'result.mp4'}]}}
          : {error:'not found'};
      return route.fulfill({status:result.error ? 404 : 200, headers, contentType:'application/json', body:JSON.stringify(result)});
    });

    for (const [kind, initial, chosen, modeTitle] of [
      ['image', 'qwen-image-2.0', 'qwen-image-3.0', '生图模式'], ['video', 'Minimax H3', 'Wan3.0视频', '生视频模式']]) {
      if (kind === 'video') {
        await page.waitForFunction(() => !PROJ.cards[0]._ifPolling);
        await page.evaluate(() => persistence.pendingChain);
      }
      const original = card(kind, initial);
      original.cap = kind === 'image' ? 'zimage_t2i' : 'minimax_h3_character_transfer';
      const asset = {id:'asset-src', type:'card_asset', cap:'asset', x:20, y:20, params:{}, assets:{},
        outputs:[{kind, ref:`if-fixture.${kind === 'image' ? 'png' : 'mp4'}`,
          url:`/fixture.${kind === 'image' ? 'png' : 'mp4'}`,
          ...(kind === 'video' ? {width:1280, height:720, duration:6} : {})}]};
      project = {...project, cards:[original, asset], edges:[]};
      await page.goto(origin + '/?project=if-test');
      await page.waitForFunction(() => PROJ?.cards[0]?._el
        && projects.some(item => item.id === PROJ.id && item.permission === PROJ.permission));
      await page.waitForSelector('#workspace-nav .workspace-links');
      assert.equal(await page.locator('#workspace-nav a[href="/if-studio"]').count(), 0);
      assert.equal(await page.locator('#workspace-nav a[aria-label="IF Studio"]').count(), 0);
      assert.equal(await page.locator('#workspace-nav .workspace-links a[href="/"]').count(), 1);
      assert.equal(await page.locator('#workspace-nav .workspace-links a[aria-label="导演工作台"]').count(), 1);
      await page.evaluate(() => pick(PROJ.cards[0].id));
      await page.evaluate(async () => linkTo(PROJ.cards[1], PROJ.cards[0]));
      assert.equal(await page.evaluate(() => PROJ.edges.length), 1);
      const referencesBeforeSwitch = await page.evaluate(() => ({
        assets:JSON.stringify(PROJ.cards[0].assets), edges:JSON.stringify(PROJ.edges),
      }));
      await page.locator(`#panel button[title="${modeTitle} —— 点击换"]`).click();
      const modeEntries = await page.locator('#menu > .grp, #menu > button').evaluateAll(nodes => nodes.map(node =>
        node.classList.contains('grp') ? node.textContent : node.querySelector('span:last-child').textContent));
      assert.equal(modeEntries[0], '本地 API');
      assert.equal(modeEntries.at(-2), '云端 API');
      assert.equal(modeEntries.at(-1), 'IFS');
      assert.ok(modeEntries.slice(1, -2).every(name => name !== 'IFS' && name !== 'IF'));
      await page.locator('#menu button').filter({hasText:'IFS'}).click();
      assert.equal(await page.evaluate(() => PROJ.cards[0].cap), kind === 'image' ? 'if_image' : 'if_video');
      assert.deepEqual(await page.evaluate(() => ({
        assets:JSON.stringify(PROJ.cards[0].assets), edges:JSON.stringify(PROJ.edges),
      })), referencesBeforeSwitch, 'switching into IFS must keep connected materials and wires');
      assert.equal(await page.locator('#panel .slot.filled').count(), 1);
      assert.match(await page.locator(`#panel button[title="${modeTitle} —— 点击换"]`).innerText(), /IFS/);
      const modelButton = page.locator('#panel button[title="IF 模型 —— 点击换"]');
      await modelButton.click();
      await page.waitForFunction(() => document.querySelector('#menu')?.style.display !== 'none'
        && document.querySelector('#menu')?.textContent.includes('剩余 30 次免费'));
      const unsupported = kind === 'image' ? 'z-image-turbo' : '星辰图生视频';
      assert.deepEqual(await page.locator('#menu button span:last-child').allTextContents(),
        [chosen, initial + '（当前）', unsupported, ...(kind === 'video'
          ? ['可灵3.0 Omni', 'HappyHorse-1.1视频', 'HappyHorse-1.0视频【内测】', 'Seedance 2.0', 'Seedance 2.5'] : [])]
          .map(name => name + ' · 剩余 30 次免费'));
      for (const newerAction of ['mode', 'dismiss']) {
        let releaseModels;
        holdModels = new Promise(resolve => { releaseModels = resolve; });
        await modelButton.click();
        if (newerAction === 'mode')
          await page.locator(`#panel button[title="${modeTitle} —— 点击换"]`).click();
        else await page.keyboard.press('Escape');
        releaseModels();
        holdModels = null;
        await page.waitForFunction(() => !document.querySelector('#panel button[title="IF 模型 —— 点击换"]').disabled);
        if (newerAction === 'mode')
          assert.equal(await page.locator('#menu .hd').innerText(), modeTitle, 'late quota refresh must preserve the newer menu');
        else assert.equal(await page.locator('#menu').isVisible(), false, 'late quota refresh must not reopen a dismissed menu');
      }
      await page.evaluate(() => pick(PROJ.cards[0].id));
      await modelButton.click();
      await page.waitForFunction(() => document.querySelector('#menu')?.style.display !== 'none'
        && document.querySelector('#menu .hd')?.textContent === 'IF 模型');
      if (kind === 'image') {
        await page.evaluate(() => closeMenu());
        modelQuotas.set(chosen, {quota_status:'limited', remaining:29});
        await modelButton.click();
        await page.waitForFunction(() => document.querySelector('#menu')?.textContent.includes('剩余 29 次免费'));
        modelQuotas.delete(chosen);
      }
      await page.locator('#menu button').filter({hasText:chosen}).click();
      const noteLayout = await page.locator('#panel .pbody').evaluate(body => {
        const linkLeft = body.querySelector('a').getBoundingClientRect().left;
        return [...body.querySelectorAll(':scope > .knobnote')].map(note => ({
          paddingLeft:getComputedStyle(note).paddingLeft,
          left:note.getBoundingClientRect().left, linkLeft,
        }));
      });
      assert.equal(noteLayout.length, 2);
      for (const note of noteLayout) {
        assert.equal(note.paddingLeft, '0px', 'panel descriptions must not reserve a parameter-label column');
        assert.ok(Math.abs(note.left - note.linkLeft) < 1, 'descriptions align with the API link');
      }
      const summary = await page.locator('#panel .pbody').innerText();
      assert.match(summary, /返回的 URL.+生成需求一次提交/);
      assert.doesNotMatch(summary, /逐份登记|登记后/);
      assert.match(summary, kind === 'video' ? /画布引用上限：图片 10 · 视频 5/ : /画布引用上限：图片 3 · 视频 0/);
      assert.match(summary, /按用户调研的 IF 实际限制/);
      assert.equal(await page.evaluate(() => PROJ.edges[0].slot), kind === 'image' ? 'images[0]' : 'video[0]');
      assert.match(await page.locator('#panel .refhead').innerText(), kind === 'image' ? /图片 3/ : /图片 10 · 视频 5/);
      await modelButton.click();
      await page.locator('#menu button').filter({hasText:unsupported}).click();
      assert.equal(await page.evaluate(() => PROJ.cards[0].params.if_model), unsupported);
      assert.equal(await page.evaluate(() => PROJ.edges.length), 1);
      assert.equal(await page.locator('#panel .slot.filled').count(), 1);
      if (kind === 'video') {
        for (const name of ['星辰图生视频', '可灵3.0 Omni']) {
          if (name !== unsupported) {
            await modelButton.click();
            await page.locator('#menu button').filter({hasText:name}).click();
          }
          const estimate = await page.locator('#panel .pbody').innerText();
          assert.match(estimate, name === '星辰图生视频'
            ? /画布兜底引用上限（不代表官方支持）：图片 6 · 视频 1/
            : /画布引用上限：图片 4 · 视频 1/);
          assert.doesNotMatch(estimate, /H3 估算/);
          assert.match((await page.locator('#panel .refhead').allTextContents()).join(' '),
            name === '星辰图生视频' ? /图片 6 · 视频 1/ : /图片 4 · 视频 1/);
          assert.equal(await page.evaluate(() => PROJ.edges.length), 1);
        }
      } else {
        assert.match(await page.locator('#panel .pbody').innerText(), /画布引用上限：图片 1 · 视频 0/);
        assert.match(await page.locator('#panel .refhead').innerText(), /图片 1/);
        assert.doesNotMatch(await page.locator('#panel .pbody').innerText(), /已连接的引用保持原样/);
      }
      assert.equal(await page.evaluate(() => PROJ.edges.length), 1);
      await modelButton.click();
      await page.locator('#menu button').filter({hasText:initial}).click();
      assert.equal(await page.evaluate(() => PROJ.edges.length), 1);
      await modelButton.click();
      await page.locator('#menu button').filter({hasText:chosen}).click();
      assert.equal(await page.evaluate(() => PROJ.cards[0].params.if_model), chosen,
        'changing models must preserve the canvas reference');
      await page.locator('#panel button[title^="点开弹窗"]').click();
      const ratio = page.locator('#respop .cgrid button').filter({hasText:'4:3'});
      await ratio.click();
      await page.locator('#respop .cgrid button').filter({hasText:kind === 'image' ? '1080P' : '544p'}).click();
      const rows = page.locator('#respop .row');
      if (kind === 'image') {
        assert.deepEqual(await page.locator('#respop .cgrid.k button').allTextContents(),
          ['480P', '720P', '1080P', '1440P', '2K']);
        assert.equal(await rows.count(), 0);
        assert.equal(await page.locator('#respop .image-advanced').count(), 0);
        await page.evaluate(() => { PROJ.cards[0].params.seed = 42; PROJ.cards[0].params.if_skill = '旧版技能'; });
      } else {
        for (const preset of ['1080p', '2K', '4K']) {
          await page.locator('#respop .cgrid.k button').filter({hasText:preset}).click();
          assert.deepEqual(await page.locator('#respop .cgrid.k button.on').allTextContents(), [preset]);
          assert.match(await page.evaluate(() => paramsBrief(PROJ.cards[0], capOf(PROJ.cards[0]))), new RegExp(preset));
        }
        await page.locator('#respop .cgrid.k button').filter({hasText:'544p'}).click();
        assert.equal(await page.evaluate(() => PROJ.cards[0].params.if_video_resolution), undefined);
        await page.locator('#respop .cgrid.k button').filter({hasText:'4K'}).click();
        await page.locator('#respop .cgrid button').filter({hasText:'9:16'}).click();
        assert.equal(await page.locator('#respop .cgrid.k button.on').getAttribute('title'), '2160×3840');
        await ratio.click();
        assert.equal(await page.locator('#respop .cgrid.k button.on').getAttribute('title'), '2880×2160');
        assert.equal(await rows.count(), 1);
        assert.doesNotMatch(await page.locator('#respop').innerText(), /种子|IF 技能|HTTPS/);
        assert.deepEqual(capabilities.if_video.inputs.map(input => input.key), ['prompt', 'aspect_ratio', 'megapixels', 'duration']);
        await rows.filter({hasText:'时长'}).locator('input[type="number"]').fill('12');
        await page.evaluate(() => Object.assign(PROJ.cards[0].params,
          {seed:42, if_skill:'旧版技能', if_reference:'https://example.com/obsolete.mp4'}));
      }
      await page.locator('#respop .x').click();
      await page.locator('#panel .pblock textarea').first().fill('蓝色圆形');
      await page.locator('#panel .go').click();
      if (kind === 'image') {
        for (const step of ['正在上传 IF 引用素材（1/1）',
          '正在向 IF 一次提交全部引用与图片生成需求', 'IF 正在生成图片，等待产物']) {
          await page.waitForFunction(step => PROJ.cards[0].step === step, step);
          await checkBusy(new RegExp(step));
        }
      }
      await page.waitForFunction(() => PROJ.cards[0].status === 'done');
      assert.equal(await page.locator('.card .body .load').count(), 0);
      const directive = kind === 'video'
        ? '最终交付必须是视频文件，不是图片、故事板或文字方案。用户已经确认生成需求，请直接生成视频；不要等待用户确认规划、分镜或中间图片，也不要把中间图片当作最终结果。如无法直接完成，请说明原因，不要改为生图。以本条视频目标和以下参数要求为准。'
        : '最终交付必须是图片文件，不是故事板或文字方案。用户已经确认生成需求，请直接生成图片；不要等待用户确认规划、分镜或中间图片，也不要把中间图片当作最终结果。如无法直接完成，请说明原因，不要改为视频或文字方案。以本条图片目标和以下参数要求为准。';
      assert.match(runs.at(-1).request_id, /^[a-f0-9]{32}$/);
      assert.deepEqual(runs.at(-1), {type:kind, model:chosen, request_id:runs.at(-1).request_id,
        prompt:`${directive}\n\n蓝色圆形\n\n分辨率：${kind === 'image' ? '1440×1080' : '2880×2160\n时长：12s\n画面比例：4 : 3'}`,
        references:[{kind, asset_id:referenceId}]});
      assert.doesNotMatch(runs.at(-1).prompt, /生成规格|随机种子/);
      assert.equal(uploadedReferences.length, kind === 'image' ? 1 : 2);
      assert.equal(uploadedReferences.at(-1).type, kind === 'image' ? 'image/png' : 'video/mp4');
      assert.deepEqual(uploadedReferences.at(-1).body, kind === 'image' ? png : Buffer.from('fake-video'));
      assert.equal(await page.evaluate(() => PROJ.cards[0].outputs[0].kind), kind);
      assert.equal(await page.evaluate(() => PROJ.cards[0].history.length), 1);
      assert.deepEqual(await page.evaluate(() => PROJ.cards[0].history[0].prompts), [
        {key:'if_original', label:'原始提示词', text:'蓝色圆形'},
        {key:'if_submitted', label:'提交给 IF CLI 的提示词', text:runs.at(-1).prompt},
      ]);
      await page.evaluate(() => openHistory(PROJ.cards[0].id));
      assert.deepEqual(await page.locator('#hist .history-prompt summary').allTextContents(),
        ['原始提示词', '提交给 IF CLI 的提示词']);
      await page.evaluate(() => enqueueSave(PROJ.id));
      assert.deepEqual(project.cards[0].history[0].prompts,
        await page.evaluate(() => PROJ.cards[0].history[0].prompts));
      assert.equal(project.cards[0].status, 'done');
      assert.equal(project.cards[0].params.if_model, chosen);
      if (kind === 'image') {
        project.cards[0] = {...project.cards[0], status:'running', outputs:[]};
        await page.reload();
        await page.waitForFunction(() => PROJ?.cards[0]?.status === 'running');
        assert.equal(await page.evaluate(() => ownsIFTask(PROJ.cards[0], PROJ.id)), false);
        await page.evaluate(async () => {
          const card = PROJ.cards[0];
          await pollIF(card, PROJ.id);
          if (card.status !== 'running') throw new Error('observer changed shared task status');
          rememberIFTask(card, PROJ.id, 'running');
        });
        await page.reload();
        await page.waitForFunction(() => PROJ?.cards[0]?.status === 'done');
        assert.equal(runs.length, 1, 'refresh must poll the original bridge job without resubmitting');
        await page.waitForFunction(() => !PROJ.cards[0]._ifPolling);
        await page.evaluate(() => persistence.pendingChain);
        project.cards[0] = {...project.cards[0], status:'error', error:'协作者误标失败', outputs:[]};
        await page.reload();
        await page.waitForFunction(() => PROJ?.cards[0]?.status === 'error');
        await page.evaluate(() => pick(PROJ.cards[0].id));
        assert.equal(await page.evaluate(() => ownsIFTask(PROJ.cards[0], PROJ.id)), false);
        page.once('dialog', dialog => {
          assert.match(dialog.message(), /不会重新生成/);
          dialog.accept();
        });
        await page.locator('#panel .if-recover-button').click();
        await page.waitForFunction(() => PROJ.cards[0].status === 'done' && PROJ.cards[0].outputs.length > 0);
        assert.equal(runs.length, 1, 'manual recovery must not submit another paid run');
        assert.equal(await page.locator('#panel .if-recover-button').count(), 0);
      }
    }
    assert.equal(runs.length, 2);
    modelQuotas.set('Wan3.0视频', {quota_status:'exhausted', remaining:0});
    modelQuotas.set('Minimax H3', {quota_status:'unavailable', remaining:0});
    modelQuotas.set('星辰图生视频', {quota_status:'free', remaining:null});
    modelQuotas.set('可灵3.0 Omni', {quota_status:'paid', remaining:null});
    modelQuotas.set('Seedance 2.0', {quota_status:'unknown', remaining:null});
    modelQuotas.set('Seedance 2.5', {});
    const quotaButton = page.locator('#panel button[title="IF 模型 —— 点击换"]');
    await quotaButton.click();
    await page.waitForFunction(() => document.querySelector('#menu')?.textContent.includes('免费次数已用完'));
    for (const [name, text, disabled] of [
      ['Wan3.0视频', '剩余 0 次 · 免费次数已用完', true],
      ['Minimax H3', '剩余 0 次 · 未开通', true],
      ['星辰图生视频', '免费使用', false], ['可灵3.0 Omni', '已开通 · 按预算使用', false],
      ['Seedance 2.0', '次数未知', false], ['Seedance 2.5', '次数未知 · 请更新桥接器', false]]) {
      const item = page.locator('#menu button').filter({hasText:name});
      assert.ok((await item.innerText()).includes(text));
      assert.equal(await item.isDisabled(), disabled);
    }
    if (process.env.CHOUKA_TEST_QUOTA_SCREENSHOT)
      await page.screenshot({path:process.env.CHOUKA_TEST_QUOTA_SCREENSHOT});
    await page.evaluate(() => closeMenu());
    const uploadsBeforeQuotaFailure = uploadedReferences.length;
    await page.locator('#panel .go').click();
    await page.waitForFunction(() => PROJ.cards[0].status === 'error');
    assert.match(await page.evaluate(() => PROJ.cards[0].error), /免费次数已用完.*尚未提交生成/);
    assert.equal(runs.length, 2, 'known unavailable models must not submit or silently switch');
    assert.equal(uploadedReferences.length, uploadsBeforeQuotaFailure);
    assert.equal(await page.evaluate(() => PROJ.cards[0].params.if_model), 'Wan3.0视频');
    failModelRefresh = true;
    await quotaButton.click();
    await page.waitForFunction(() => document.querySelector('#h3-errors')?.textContent.includes('读取 IF 剩余次数失败'));
    assert.equal(await page.locator('#menu').isVisible(), false, 'failed refresh must not show stale counts');
    failModelRefresh = false;
    modelQuotas.clear();
    await page.locator('#panel .pblock textarea').first().fill('后来修改的视频需求');
    assert.equal(await page.evaluate(() => PROJ.cards[0].history[0].prompts[0].text), '蓝色圆形');
    returnVideoStoryboard = true;
    await page.locator('#panel .go').click();
    await page.waitForFunction(() => PROJ.cards[0].status === 'error');
    assert.match(await page.evaluate(() => PROJ.cards[0].error), /只生成了故事板图片，尚未生成视频，并要求确认下一步/);
    assert.match(await page.locator('#h3-errors').innerText(), /只生成了故事板图片，尚未生成视频/);
    assert.doesNotMatch(await page.locator('#toast').textContent(), /只生成了故事板图片/);
    const canvasURL = 'https://ifs.alibaba-inc.com/#/canvas/c_OcBXJf2Bd0CxY-';
    const canvasLink = page.locator('#world .if-canvas-link');
    assert.equal(await canvasLink.getAttribute('href'), canvasURL);
    assert.equal(await page.locator('#panel .if-canvas-link').getAttribute('href'), canvasURL);
    assert.equal(await canvasLink.getAttribute('target'), '_blank');
    assert.equal(await canvasLink.getAttribute('rel'), 'noopener noreferrer');
    if (process.env.CHOUKA_TEST_SCREENSHOT) await page.screenshot({path:process.env.CHOUKA_TEST_SCREENSHOT});
    // Exercise the actual new-tab link without sending fixture data to IF.
    await page.context().route('https://ifs.alibaba-inc.com/**', route => route.fulfill({contentType:'text/html', body:'<title>IF canvas fixture</title>'}));
    const popupPromise = page.waitForEvent('popup');
    await canvasLink.click();
    const popup = await popupPromise; await popup.waitForLoadState();
    assert.equal(popup.url(), canvasURL);
    assert.equal(await popup.evaluate(() => window.opener), null);
    await popup.close();
    assert.equal(await page.evaluate(() => PROJ.cards[0].outputs.length), 0);
    assert.equal(runs.length, 3);
    assert.deepEqual(await page.evaluate(() => ({status:PROJ.cards[0].history[0].status,
      prompts:PROJ.cards[0].history[0].prompts})), {status:'error', prompts:[
      {key:'if_original', label:'原始提示词', text:'后来修改的视频需求'},
      {key:'if_submitted', label:'提交给 IF CLI 的提示词', text:runs.at(-1).prompt},
    ]});
    returnVideoPlanOnly = true;
    await page.locator('#panel .go').click();
    await page.waitForFunction(() => PROJ.cards[0].job === 'bridge-4' && PROJ.cards[0].status === 'error');
    assert.match(await page.evaluate(() => PROJ.cards[0].error), /^IF 要求确认规划或故事板，未直接生成视频/);
    assert.equal(runs.length, 4);
    assert.equal(await page.evaluate(() => PROJ.cards[0].history.length), 3);
    assert.match(await page.locator('#hist .hrun').first().locator('.rh .cnt').innerText(), /^失败/);
    await page.evaluate(() => enqueueSave(PROJ.id));
    await page.reload();
    await page.waitForFunction(() => PROJ?.cards[0]?.history?.length === 3);
    assert.equal(await page.locator('#world .if-canvas-link').getAttribute('href'), canvasURL);
    assert.equal(await page.evaluate(() => PROJ.cards[0].history[0].prompts[1].text), runs.at(-1).prompt);
    assert.deepEqual(await page.evaluate(() => ({
      textOnly: capOf({cap:'if_image', params:{if_model:'z-image-turbo'}}).inputs.filter(s => MEDIA.includes(s.type)).length,
      unknown: capOf({cap:'if_video', params:{if_model:'星辰图生视频'}}).inputs.filter(s => MEDIA.includes(s.type)).length,
      kling: capOf({cap:'if_video', params:{if_model:'可灵3.0 Omni'}}).inputs.filter(s => MEDIA.includes(s.type)).length,
      wanApi: ifModelLimits['Wan3.0视频'].api,
      wanBridge: ifModelLimits['Wan3.0视频'].bridge,
    })), {textOnly:1, unknown:7, kling:5, wanApi:{image:10, video:5, audio:5}, wanBridge:{image:10, video:5, audio:0}});
    returnVideoStoryboard = false; returnVideoPlanOnly = false;
    const beforeMulti = uploadedReferences.length;
    await page.evaluate(async () => linkTo(PROJ.cards[1], PROJ.cards[0]));
    assert.deepEqual(await page.evaluate(() => PROJ.edges.map(edge => edge.slot)), ['video[0]', 'video[1]']);
    await page.evaluate(() => {
      const c = PROJ.cards[0];
      c.assets['images[0]'] = {kind:'image', url:'/fixture.png'};
      c.assets['images[1]'] = {kind:'image', url:'/fixture.png'};
      openPanel(c.id);
    });
    assert.match(await page.locator('#panel .refhead').innerText(), /图片 10 · 视频 5/);
    await page.locator('#panel .pblock textarea').first().fill('结合全部素材生成视频');
    await page.locator('#panel .go').click();
    await page.waitForFunction(() => PROJ.cards[0].job === 'bridge-5' && PROJ.cards[0].status === 'done');
    assert.deepEqual(runs.at(-1).references.map(item => item.asset_id),
      [1, 2, 3, 4].map(n => 'b'.repeat(31) + (beforeMulti + n)));
    assert.deepEqual(uploadedReferences.slice(-4).map(item => item.type),
      ['image/png', 'image/png', 'video/mp4', 'video/mp4']);
    assert.equal(await page.evaluate(() => PROJ.cards[0].history.find(h => h.job === 'bridge-5')
      .prompts.find(p => p.key === 'if_submitted').text),
      '图片1：https://example.com/ref1.png\n图片2：https://example.com/ref2.png\n视频1：https://example.com/ref1.mp4\n视频2：https://example.com/ref2.mp4\n\n使用模型：' + runs.at(-1).model + '\n\n生成需求：\n' + runs.at(-1).prompt);
    let uploadAttempts = 0;
    const deletedAssets = [];
    await page.route('http://127.0.0.1:8278/**', route => {
      const request = route.request(), pathname = new URL(request.url()).pathname;
      if (request.method() === 'POST' && pathname === '/assets' && ++uploadAttempts === 2)
        return route.fulfill({status:429, contentType:'application/json',
          headers:{'Access-Control-Allow-Origin':origin}, body:'{"error":"模拟素材容量不足"}'});
      if (request.method() === 'DELETE' && pathname.startsWith('/assets/'))
        deletedAssets.push(pathname);
      return route.fallback();
    });
    await page.locator('#panel .go').click();
    await page.waitForFunction(() => PROJ.cards[0].status === 'error');
    assert.match(await page.evaluate(() => PROJ.cards[0].error), /模拟素材容量不足/);
    assert.equal(await page.locator('.if-canvas-link').count(), 0, 'a new failed upload must not link to a previous canvas');
    assert.deepEqual(deletedAssets, ['/assets/' + 'b'.repeat(31) + uploadedReferences.length]);
    assert.equal(runs.length, 5, 'failed multi-reference upload must not submit a job');
    await page.evaluate(() => persistence.pendingChain);
    project = {...project, cards:[card('image', 'qwen-image-3.0'),
      {id:'image-src', type:'card_asset', cap:'asset', x:20, y:20, params:{}, assets:{},
        outputs:[{kind:'image', url:'/fixture.png', ref:'image.png'}]}], edges:[]};
    await page.goto(origin + '/?project=if-test');
    await page.waitForFunction(() => PROJ?.cards[0]?._el
      && projects.some(item => item.id === PROJ.id && item.permission === PROJ.permission));
    await page.evaluate(async () => {
      pick(PROJ.cards[0].id);
      for (let n = 0; n < 3; n++) await linkTo(PROJ.cards[1], PROJ.cards[0]);
    });
    assert.deepEqual(await page.evaluate(() => PROJ.edges.map(edge => edge.slot)),
      ['images[0]', 'images[1]', 'images[2]']);
    assert.match(await page.locator('#panel .refhead').innerText(), /图片 3/);
    assert.doesNotMatch(await page.locator('#panel .pbody').innerText(), /合计最多 1 项|不支持音频及多引用/);
    await page.evaluate(async () => linkTo(PROJ.cards[1], PROJ.cards[0]));
    assert.equal(await page.evaluate(() => PROJ.edges.length), 3, 'model limit must still apply');
    const beforeImageMulti = uploadedReferences.length;
    await page.locator('#panel .pblock textarea').first().fill('结合图片1、图片2、图片3生成');
    await page.locator('#panel .go').click();
    await page.waitForFunction(() => PROJ.cards[0].job === 'bridge-6' && PROJ.cards[0].status === 'done');
    assert.equal(runs.at(-1).type, 'image');
    assert.equal(runs.at(-1).references.map(item => item.asset_id).length, 3);
    assert.equal(uploadedReferences.length - beforeImageMulti, 3);
    assert.ok(uploadedReferences.slice(-3).every(item => item.type === 'image/png'));
    const conversions = [];
    let conversionFailure = false, oversizedCopy = false;
    await page.route(origin + '/oversized.*', async route => {
      if (route.request().resourceType() === 'fetch'
          && await page.evaluate(() => PROJ?.cards[0]?.step?.startsWith('正在读取 IF ')).catch(() => false))
        sourceReads.push(new URL(route.request().url()).pathname);
      const kind = route.request().url().endsWith('.png') ? 'image' : 'video';
      return route.fulfill({contentType:kind === 'image' ? 'image/png' : 'video/mp4',
        body:Buffer.alloc(kind === 'image' ? 12_500_000 : 50 * 1024 * 1024 + 1)});
    });
    await page.route(origin + '/api/if-reference?*', async route => {
      if (route.request().method() === 'HEAD') return route.fallback();
      const url = new URL(route.request().url()), kind = url.searchParams.get('type');
      assert.equal(route.request().headers()['if-match'], sourceVersion(url.searchParams.get('url')));
      await checkBusy(new RegExp(`^正在适配 IF ${kind === 'image' ? '图片' : '视频'}上传副本（\\d+/\\d+）$`));
      conversions.push(Object.fromEntries(url.searchParams));
      return route.fulfill(conversionFailure ? {status:422, body:'模拟转换失败，原素材未修改'} : {
        contentType:kind === 'image' ? 'image/webp' : 'video/mp4',
        body:oversizedCopy ? Buffer.alloc(10_000_001) : Buffer.from('adapted-' + kind),
        headers:{'X-Chouka-IF-Conversion':kind === 'image' ? 'lossless-webp' : 'compressed-mp4'}});
    });
    for (const kind of ['image', 'video']) {
      await page.evaluate(kind => {
        const c = PROJ.cards[0];
        c.cap = 'if_video'; c.params = {if_model:'Wan3.0视频', prompt:'测试上传副本'};
        c.status = 'idle'; c.job = null; c.assets = {}; PROJ.edges = [];
        c.assets[kind === 'image' ? 'images[0]' : 'video[0]'] = {
          kind, url:kind === 'image' ? '/oversized.png' : '/oversized.mp4'};
        openPanel(c.id);
      }, kind);
      const before = runs.length;
      await page.locator('#panel .go').click();
      await page.waitForFunction(before => PROJ.cards[0].status === 'done'
        && PROJ.cards[0].job === 'bridge-' + (before + 1), before);
      assert.equal(runs.length, before + 1);
      assert.equal(uploadedReferences.at(-1).type, kind === 'image' ? 'image/webp' : 'video/mp4');
      assert.deepEqual(uploadedReferences.at(-1).body, Buffer.from('adapted-' + kind));
      assert.equal(await page.evaluate(kind => PROJ.cards[0].assets[kind === 'image' ? 'images[0]' : 'video[0]'].url, kind),
        kind === 'image' ? '/oversized.png' : '/oversized.mp4', 'original canvas asset is not replaced');
    }
    assert.deepEqual(conversions, [{url:'/oversized.png', type:'image'}, {url:'/oversized.mp4', type:'video'}]);
    conversionFailure = true;
    await page.evaluate(() => {
      const c = PROJ.cards[0];
      c.assets = {'images[0]':{kind:'image', url:'/fixture.png'},
        'video[0]':{kind:'video', url:'/oversized.mp4'}};
      openPanel(c.id);
    });
    const beforeFailure = runs.length, deletedBefore = deletedAssets.length;
    await page.locator('#panel .go').click();
    await page.waitForFunction(() => PROJ.cards[0].status === 'error');
    assert.match(await page.evaluate(() => PROJ.cards[0].error), /模拟转换失败/);
    assert.equal(runs.length, beforeFailure, 'failed conversion must not submit a paid run');
    assert.equal(deletedAssets.length, deletedBefore + 1, 'already uploaded references must be released');
    conversionFailure = false; oversizedCopy = true;
    await page.evaluate(() => {
      const c = PROJ.cards[0];
      c.assets = {'images[0]':{kind:'image', url:'/oversized.png'}};
      c.status = 'idle'; c.error = null;
      openPanel(c.id);
    });
    const uploadsBeforeInvalidCopy = uploadedReferences.length;
    await page.locator('#panel .go').click();
    await page.waitForFunction(() => PROJ.cards[0].status === 'error');
    assert.match(await page.evaluate(() => PROJ.cards[0].error), /10 MB/);
    assert.equal(runs.length, beforeFailure);
    assert.equal(uploadedReferences.length, uploadsBeforeInvalidCopy,
      'even an adapted image one byte over 10,000,000 must not reach the bridge');
    await page.waitForFunction(() => !document.querySelector('.card .body .load'));
    assert.equal(await page.locator('.card .body .load').count(), 0, 'failure must stop loading');
    assert.ok(busySteps.indexOf('正在向本机桥接传送图片引用（1/1）')
      < busySteps.indexOf('正在上传 IF 引用素材（1/1）'), 'local transfer must precede the only IF upload phase');
    assert.ok(busySteps.indexOf('本机 IF 正在准备生成任务')
      < busySteps.indexOf('正在上传 IF 引用素材（1/1）'), 'do not report generating before the IF upload');
    for (const prefix of ['正在连接本机 IF', '正在读取 IF', '正在适配 IF', '正在向本机桥接传送', '正在上传 IF',
      '正在交由本机 IF 桥接处理', '正在取回 IF', '正在保存 IF'])
      assert.ok(busySteps.some(step => step.startsWith(prefix)), prefix);
    // Exercise actual model menus and duration controls, not just manifest values.
    await page.evaluate(() => {
      const c = PROJ.cards[0]; c.cap = 'if_video'; c.assets = {}; PROJ.edges = [];
      c.params = {if_model:'Wan3.0视频', prompt:'时长边界测试'};
      c.status = 'idle'; openPanel(c.id);
    });
    for (const [name, [min, max]] of Object.entries(durationRanges)) {
      const dismissErrors = page.getByRole('button', {name:'关闭全部错误通知'});
      if (await dismissErrors.isVisible()) await dismissErrors.click();
      await page.evaluate(() => { PROJ.cards[0].params.duration = 99; });
      await page.locator('#panel button[title="IF 模型 —— 点击换"]').click();
      await page.locator('#menu button').filter({hasText:name}).click();
      assert.equal(await page.evaluate(() => PROJ.cards[0].params.duration), max ?? 99, name);
      await page.locator('#panel button[title^="点开弹窗"]').click();
      const row = page.locator('#respop .row').filter({hasText:'时长'});
      const number = row.locator('input[type="number"]');
      assert.equal(await number.getAttribute('min'), String(min ?? 1), name);
      assert.equal(await number.getAttribute('max'), max == null ? null : String(max), name);
      assert.equal(await number.getAttribute('step'), '1', name);
      assert.equal(await row.locator('input[type="range"]').count(), max == null ? 0 : 1, name);
      assert.match(await row.innerText(), max == null ? /时长范围未核实/ : new RegExp(`${min}–${max} 秒`));
      for (const [input, expected] of [['0', min ?? 1], ['99', max ?? 99], ['7.6', 8]]) {
        await number.fill(input); await number.press('Tab');
        assert.equal(await number.inputValue(), String(expected), `${name}: ${input}`);
        assert.equal(await page.evaluate(() => PROJ.cards[0].params.duration), expected);
      }
      await page.locator('#respop .x').click();
      const before = runs.length, uploads = uploadedReferences.length;
      for (const value of max == null ? [0, 1.5, ''] : [min - 1, max + 1, 7.5, '']) {
        await page.evaluate(value => { PROJ.cards[0].params.duration = value; }, value);
        await page.locator('#panel .go').click();
        await page.waitForFunction(() => PROJ.cards[0].status === 'error');
        assert.match(await page.evaluate(() => PROJ.cards[0].error), /时长.*整数/);
        assert.equal(runs.length, before, `${name}: invalid duration must not submit`);
        assert.equal(uploadedReferences.length, uploads);
      }
      for (const seconds of max == null ? [1, 60] : [min, max]) {
        await page.evaluate(seconds => { PROJ.cards[0].params.duration = seconds; }, seconds);
        const runCount = runs.length;
        await page.locator('#panel .go').click();
        await page.waitForFunction(count => PROJ.cards[0].status === 'done'
          && PROJ.cards[0].job === 'bridge-' + (count + 1), runCount);
        assert.match(runs.at(-1).prompt, new RegExp(`时长：${seconds}s`));
        assert.equal(runs.at(-1).model, name);
      }
    }
    for (const [model, duration, expected] of [
      ['Wan3.0视频', 40, 30], ['Wan3.0视频', 0.4, 2], ['Minimax H3', 22, 15],
      ['Seedance 2.5', 29.7, 30], ['星辰图生视频', 40, 40],
    ]) {
      const result = await page.evaluate(async ({model, duration}) => {
        const c = PROJ.cards[0]; c.params = {if_model:model};
        c.assets = {'video[0]':{kind:'video', ref:`ref-${model}-${duration}.mp4`,
          width:720, height:1280, duration, url:'/fixture.mp4'}};
        await syncReferenceParameters(c);
        const first = c.params.duration;
        c.params.duration = 9; await syncReferenceParameters(c);
        return {first, manual:c.params.duration, ratio:c.params.aspect_ratio,
          spec:capOf(c).inputs.find(s => s.key === 'duration')};
      }, {model, duration});
      assert.equal(result.first, expected, `${model}: reference duration`);
      assert.equal(result.manual, 9, 'manual duration must survive later reference refreshes');
      assert.equal(result.ratio, '9:16 (Portrait Widescreen)');
      assert.equal(result.spec.max, durationRanges[model][1], 'reference cannot expand model bounds');
    }
    for (const manual of [false, true]) {
      let release, requested;
      const pending = new Promise(resolve => { release = resolve; });
      const started = new Promise(resolve => { requested = resolve; });
      const metadata = async route => {
        requested(); await pending;
        await route.fulfill({contentType:'application/json',
          body:JSON.stringify({width:720, height:1280, duration:29.7})});
      };
      await page.route(origin + '/api/media?*', metadata);
      try {
        await page.evaluate(manual => {
          const c = PROJ.cards[0]; c.params = {if_model:'Wan3.0视频'};
          c.assets = {'video[0]':{kind:'video', ref:`delayed-${manual}.mp4`, url:'/fixture.mp4'}};
          openPanel(c.id);
        }, manual);
        await started;
        if (manual) {
          await page.locator('#panel button[title^="点开弹窗"]').click();
          const number = page.locator('#respop .row').filter({hasText:'时长'}).locator('input[type="number"]');
          await number.fill('9'); await number.press('Tab');
          await page.locator('#respop .x').click();
        }
        for (const name of ['Minimax H3', 'Seedance 2.5', 'Minimax H3']) {
          await page.locator('#panel button[title="IF 模型 —— 点击换"]').click();
          await page.locator('#menu button').filter({hasText:name}).click();
        }
        release();
        await page.waitForFunction(() => PROJ.cards[0].params._reference_video);
        await page.evaluate(() => syncReferenceParameters(PROJ.cards[0]));
        assert.equal(await page.evaluate(() => PROJ.cards[0].params.duration), manual ? 9 : 15,
          'switching models during metadata loading must preserve auto-fill unless manually edited');
      } finally {
        release(); await page.unroute(origin + '/api/media?*', metadata);
      }
    }
    emitReferenceURLs = true; oversizedCopy = false;
    await page.evaluate(() => {
      const c = PROJ.cards[0]; c.cap = 'if_video'; c.type = 'card_video';
      c.params = {if_model:'Wan3.0视频', prompt:'引用复用测试', duration:8};
      c.assets = {'images[0]':{kind:'image', url:'/oversized.png'},
        'video[0]':{kind:'video', url:'/fixture.mp4', width:1280, height:720, duration:8}};
      c.status = 'idle'; PROJ.edges = []; openPanel(c.id);
    });
    const generate = async (status = 'done') => {
      const before = runs.length;
      await page.locator('#panel .go').click();
      await page.waitForFunction(({status, before}) => PROJ.cards[0].status === status
        && PROJ.cards[0].job === 'bridge-' + (before + 1), {status, before});
      assert.equal(runs.length, before + 1);
    };
    const counts = () => ({uploads:uploadedReferences.length, reads:sourceReads.length, conversions:conversions.length});
    let beforeReuse = counts();
    await generate();
    assert.equal(uploadedReferences.length, beforeReuse.uploads + 2);
    assert.equal(sourceReads.length, beforeReuse.reads + 2);
    assert.equal(conversions.length, beforeReuse.conversions + 1);
    assert.ok(runs.at(-1).references.every(item => item.asset_id));
    beforeReuse = counts();
    await page.locator('#panel .pblock textarea').first().fill('仅修改提示词再生成');
    await page.evaluate(() => { PROJ.cards[0].params.duration = 10; });
    await generate();
    assert.deepEqual(counts(), beforeReuse, 'unchanged references must skip source reads, conversion and bridge upload');
    assert.ok(runs.at(-1).references.every(item => item.url && !item.asset_id));
    assert.match(runs.at(-1).prompt, /仅修改提示词再生成/);
    sourceVersions.set('/oversized.png', 2);
    await generate();
    assert.equal(uploadedReferences.length, beforeReuse.uploads + 1, 'same URL with new source version uploads only that reference');
    assert.equal(conversions.length, beforeReuse.conversions + 1);
    assert.ok(runs.at(-1).references[0].asset_id);
    assert.ok(runs.at(-1).references[1].url);
    await page.evaluate(() => enqueueSave(PROJ.id));
    assert.equal(project.cards[0]._ifReferences, undefined, 'private IF URLs must not enter shared project state');
    await page.reload();
    await page.waitForFunction(() => PROJ?.cards[0]?._el
      && projects.some(item => item.id === PROJ.id && item.permission === PROJ.permission));
    await page.evaluate(() => openPanel(PROJ.cards[0].id));
    beforeReuse = counts();
    await generate();
    assert.deepEqual(counts(), beforeReuse, 'tab refresh retains successful reference URLs');
    reuseFailure = 'generation';
    await generate('error');
    assert.equal(await page.locator('#world .if-canvas-link').getAttribute('href'), canvasURL);
    assert.equal(await page.evaluate(() => {
      const c = {...plain(PROJ.cards[0]), id:'canvas-link-recovery'};
      rememberIFTask(c, PROJ.id, 'error');
      const restored = {...c, if_canvas_url:undefined, status:'running'};
      restoreIFTask(restored, PROJ.id);
      sessionStorage.removeItem(ifTaskKey(c, PROJ.id));
      return restored.if_canvas_url;
    }), canvasURL);
    reuseFailure = null;
    await generate();
    assert.deepEqual(counts(), beforeReuse, 'generation failure must not discard successfully uploaded references');
    reuseFailure = 'expired';
    await generate('error');
    assert.match(await page.evaluate(() => PROJ.cards[0].error), /仅重新上传失效素材/);
    reuseFailure = null;
    await generate();
    assert.equal(uploadedReferences.length, beforeReuse.uploads + 1);
    assert.equal(conversions.length, beforeReuse.conversions);
    assert.ok(runs.at(-1).references[0].url);
    assert.ok(runs.at(-1).references[1].asset_id);
    sourceVersions.set('/oversized.png', 3); sourceVersions.set('/fixture.mp4', 2);
    reuseFailure = 'partial';
    await generate('error');
    beforeReuse = counts();
    reuseFailure = null;
    await generate();
    assert.equal(uploadedReferences.length, beforeReuse.uploads + 1, 'partial upload failure retains the successful first reference');
    assert.equal(conversions.length, beforeReuse.conversions);
    assert.ok(runs.at(-1).references[0].url);
    assert.ok(runs.at(-1).references[1].asset_id);
    deniedSources.add('/oversized.png');
    beforeReuse = counts();
    const beforeDenied = runs.length;
    await page.locator('#panel .go').click();
    await page.waitForFunction(() => PROJ.cards[0].status === 'error');
    assert.match(await page.evaluate(() => PROJ.cards[0].error), /403/);
    assert.equal(runs.length, beforeDenied, 'cached URLs must not bypass source authorization');
    assert.deepEqual(counts(), beforeReuse);
    deniedSources.clear();
    assert.deepEqual(await page.evaluate(() => {
      const c = PROJ.cards[0], state = ifReferenceState(c, PROJ.id);
      const otherCard = ifReferenceState({id:'other-card'}, PROJ.id);
      const otherProject = ifReferenceState({id:c.id}, 'other-project');
      const user = Object.getOwnPropertyDescriptor(H3Auth, 'user');
      Object.defineProperty(H3Auth, 'user', {configurable:true, value:{id:'other-user'}});
      const otherUser = ifReferenceState({id:c.id}, PROJ.id);
      Object.defineProperty(H3Auth, 'user', user);
      return {cached:state.entries.length, isolated:[otherCard, otherProject, otherUser].map(s => s.entries.length),
        keys:new Set([state, otherCard, otherProject, otherUser].map(s => s.key)).size};
    }), {cached:2, isolated:[0, 0, 0], keys:4});
    extraModels.push({display_name:'New IF Image', type:'image'}, {display_name:'New IF Video', type:'video'},
      {display_name:'Nano Banana Pro', type:'image'}, {display_name:'即梦5.0', type:'image'});
    for (const [model, kind, maximum] of [
      ['z-image-turbo', 'image', 1], ['Nano Banana Pro', 'image', 3], ['New IF Image', 'image', 3],
      ['即梦5.0', 'image', 10], ['HappyHorse-1.1视频', 'video', 9], ['可灵3.0 Omni', 'video', 4],
      ['星辰图生视频', 'video', 6], ['New IF Video', 'video', 6]]) {
      await page.evaluate(async ({model, kind, maximum}) => {
        await persistence.pendingChain;
        const c = PROJ.cards[0]; c.cap = 'if_' + kind; c.type = 'card_' + kind;
        c.params = {if_model:model, prompt:'兜底引用测试', duration:5};
        c.assets = Object.fromEntries(Array.from({length:maximum}, (_, i) =>
          [`images[${i}]`, {kind:'image', url:'/fixture.png', filename:`ref-${i}.png`} ]));
        if (kind === 'video') c.assets['video[0]'] = {kind:'video', url:'/fixture.mp4', filename:'ref.mp4'};
        PROJ.edges = []; openPanel(c.id);
      }, {model, kind, maximum});
      assert.deepEqual(await page.evaluate(() => capOf(PROJ.cards[0]).slotLimits),
        {image:{max:maximum}, video:{max:kind === 'video' ? 1 : 0}, audio:{max:0}}, model);
      assert.match(await page.locator('#panel .pbody').innerText(),
        model.startsWith('New IF') || ifModelLimits[model].reference_fallback ? /兜底/ : /按用户调研/);
      if (process.env.CHOUKA_TEST_FALLBACK_SCREENSHOT && model === 'New IF Video')
        await page.screenshot({path:process.env.CHOUKA_TEST_FALLBACK_SCREENSHOT});
      const before = runs.length;
      await generate();
      assert.equal(runs.length, before + 1, model);
      assert.equal(runs.at(-1).model, model);
      assert.equal(runs.at(-1).references.filter(r => r.kind === 'image').length, maximum);
      assert.equal(runs.at(-1).references.filter(r => r.kind === 'video').length, kind === 'video' ? 1 : 0);
      const uploadsBefore = uploadedReferences.length;
      await page.evaluate(maximum => {
        const c = PROJ.cards[0]; c.assets[`images[${maximum}]`] = {...c.assets['images[0]']};
        openPanel(c.id);
      }, maximum);
      await page.locator('#panel .go').click();
      await page.waitForFunction(() => PROJ.cards[0].status === 'error');
      assert.equal(runs.length, before + 1, 'over-limit fallback must not submit');
      assert.equal(uploadedReferences.length, uploadsBefore, 'validate before upload');
      assert.equal(await page.evaluate(() => Object.keys(PROJ.cards[0].assets).length),
        maximum + 1 + (kind === 'video' ? 1 : 0), 'over-limit references must not be silently discarded');
    }
    await page.evaluate(async () => {
      await persistence.pendingChain;
      const c = PROJ.cards[0]; c.assets = {}; PROJ.edges = [];
      c.cap = 'if_video'; c.type = 'card_video';
      c.params = {if_model:'Wan3.0视频', prompt:'刷新恢复原任务', duration:8};
      openPanel(c.id);
    });
    heldIFStep = '正在上传 IF 引用素材（1/2）'; rejectSavesAfterSubmit = true;
    const beforeRecovery = runs.length;
    await page.locator('#panel .go').click();
    await page.waitForFunction(() => PROJ.cards[0].status === 'running'
      && PROJ.cards[0].step === '正在上传 IF 引用素材（1/2）');
    const recoveringJob = await page.evaluate(() => PROJ.cards[0].job);
    assert.equal(runs.length, beforeRecovery + 1);
    assert.equal(project.cards[0].job, null, 'server failed to save the accepted task ID');
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem(ifTaskKey(PROJ.cards[0], PROJ.id))).job), recoveringJob);
    let pollsBeforeRefresh = ifPollCount;
    await page.reload();
    await page.waitForFunction(job => PROJ?.cards[0]?.job === job && PROJ.cards[0].status === 'running'
      && PROJ.cards[0].step === '正在上传 IF 引用素材（1/2）' && !PROJ.cards[0]._ifPolling, recoveringJob);
    assert.ok(ifPollCount > pollsBeforeRefresh, 'refresh must query the original bridge task');
    assert.equal(runs.length, beforeRecovery + 1, 'recovery must never resubmit generation');
    assert.match(await page.locator('.card .cf .st').first().innerText(), /正在上传 IF 引用素材/);
    const afterCollaboration = await page.evaluate(async remote => {
      await persistence.pendingChain;
      const active = PROJ.cards[0];
      remote.rev = PROJ.rev + 1;
      remote.name = '协作者修改了画布名称';
      applyCollaborativeProject(remote);
      return {job:PROJ.cards[0].job, status:PROJ.cards[0].status,
        sameCard:PROJ.cards[0] === active, name:PROJ.name};
    }, project);
    assert.deepEqual(afterCollaboration, {job:recoveringJob, status:'running', sameCard:true,
      name:'协作者修改了画布名称'}, 'collaboration reconnect must not replace the recovered IF task with a stale snapshot');
    heldIFStep = 'IF 正在生成视频，等待产物';
    await page.waitForFunction(() => PROJ.cards[0].step === 'IF 正在生成视频，等待产物');
    await page.reload();
    await page.waitForFunction(job => PROJ?.cards[0]?.job === job && PROJ.cards[0].status === 'running'
      && PROJ.cards[0].step === 'IF 正在生成视频，等待产物', recoveringJob);
    assert.equal(runs.length, beforeRecovery + 1);
    heldIFStep = null;
    await page.waitForFunction(() => PROJ.cards[0].status === 'done' && !PROJ.cards[0]._ifPolling);
    await page.evaluate(() => persistence.pendingChain);
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem(ifTaskKey(PROJ.cards[0], PROJ.id))).phase), 'done');
    const completedOutputs = await page.evaluate(() => PROJ.cards[0].outputs);
    pollsBeforeRefresh = ifPollCount;
    await page.reload();
    await page.waitForFunction(job => PROJ?.cards[0]?.job === job && PROJ.cards[0].status === 'done', recoveringJob);
    assert.deepEqual(await page.evaluate(() => PROJ.cards[0].outputs), completedOutputs,
      'completed media must survive refresh while server saves fail');
    assert.equal(ifPollCount, pollsBeforeRefresh, 'restoring completion must not download outputs again');
    assert.equal(runs.length, beforeRecovery + 1);
    rejectProjectSaves = false; rejectSavesAfterSubmit = false;
    assert.equal(await page.evaluate(async () => (await saveIFTaskProject(PROJ.cards[0], PROJ.id)).ok), true);
    assert.equal(project.cards[0].job, recoveringJob);
    assert.equal(project.cards[0].status, 'done');
    assert.equal(await page.evaluate(() => sessionStorage.getItem(ifTaskKey(PROJ.cards[0], PROJ.id))), null,
      'clear the recovery record only after the terminal state is saved');
    for (const stage of ['initial-save', 'preparing', 'upload', 'submitting']) {
      const before = runs.length;
      await page.evaluate(stage => {
        PROJ.cards[0].params.prompt = '立即刷新恢复：' + stage;
        PROJ.cards[0].assets = stage === 'upload'
          ? {'images[0]':{kind:'image', url:'/fixture.png', filename:'ref.png'}} : {};
        if (stage === 'initial-save') {
          // Stall the injected HTTP boundary, not the production persistence queue.
          const request = H3Auth.request;
          H3Auth.request = (path, options = {}) => {
            if (options.method === 'PUT' && path === '/api/projects/' + PROJ.id) {
              window.ifTestHeld = stage; return new Promise(() => {});
            }
            return request(path, options);
          };
        } else {
          const original = ifRequest;
          ifRequest = async (path, options) => {
            if (path !== (stage === 'preparing' ? '/models' : stage === 'upload' ? '/assets' : '/runs')) return original(path, options);
            if (stage !== 'preparing') await original(path, options); // Bridge accepts; caller never gets the ID.
            window.ifTestHeld = stage;
            return new Promise(() => {});
          };
        }
        openPanel(PROJ.cards[0].id);
      }, stage);
      await page.locator('#panel .go').click();
      await page.waitForFunction(stage => window.ifTestHeld === stage, stage);
      const attempt = await page.evaluate(() => {
        const c = PROJ.cards[0], state = JSON.parse(sessionStorage.getItem(ifTaskKey(c, PROJ.id)));
        return {id:state.if_request_id, started:state.if_started, phase:state.phase};
      });
      assert.equal(attempt.phase, stage === 'submitting' ? 'submitting' : 'preparing');
      assert.equal(runs.length, before + (stage === 'submitting' ? 1 : 0));
      if (stage === 'submitting') recoveryLookupStatus = 404;
      await page.reload();
      if (stage === 'submitting') {
        for (const status of [404, 503]) {
          if (status === 503) { recoveryLookupStatus = status; await page.reload(); }
          await page.waitForFunction(() => PROJ?.cards[0]?.status === 'running' && !PROJ.cards[0].job
            && !PROJ.cards[0]._ifRecovering && PROJ.cards[0].step.includes('请勿重复生成'));
          assert.equal(runs.length, before + 1, 'repeat refresh with pending lookup must not POST again');
          assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem(ifTaskKey(PROJ.cards[0], PROJ.id))).phase), 'submitting');
        }
        assert.ok(recoveryLookups >= 2);
        recoveryLookupStatus = 0;
      }
      await page.waitForFunction(() => PROJ?.cards[0]?.status === 'done' && !PROJ.cards[0]._ifPolling);
      await page.evaluate(() => persistence.pendingChain);
      assert.equal(runs.length, before + 1, 'resume preparation once or query the accepted request, never resubmit it');
      assert.equal(runs.at(-1).request_id, attempt.id);
      assert.match(runs.at(-1).prompt, new RegExp('立即刷新恢复：' + stage));
      assert.equal(await page.evaluate(() => PROJ.cards[0].if_started), attempt.started);
      assert.equal(await page.evaluate(() => PROJ.cards[0].job), 'bridge-' + (before + 1));
      assert.match(await page.evaluate(() => PROJ.cards[0].history[0].prompts.find(p => p.key === 'if_original').text),
        new RegExp('立即刷新恢复：' + stage));
    }
    for (const blockedPhase of ['preparing', 'submitting']) {
      const before = runs.length;
      await page.evaluate(async blockedPhase => {
        await persistence.pendingChain;
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
          if (key.startsWith('chouka:if-task:') && JSON.parse(value).phase === blockedPhase)
            throw new DOMException('Storage full', 'QuotaExceededError');
          return original.call(this, key, value);
        };
        try { await runIF(PROJ.cards[0]); } finally { Storage.prototype.setItem = original; }
      }, blockedPhase);
      assert.match(await page.evaluate(() => PROJ.cards[0].error), /无法保存 IF.*恢复记录.*尚未提交生成/);
      assert.equal(runs.length, before, 'journal write failure must prevent submission');
    }
    const beforeOldBridge = runs.length;
    await page.evaluate(async () => {
      await persistence.pendingChain;
      const original = ifRequest;
      ifRequest = async (path, options) => path === '/status'
        ? {ready:true, reference_reuse:true} : original(path, options);
      try { await runIF(PROJ.cards[0]); } finally { ifRequest = original; }
    });
    assert.match(await page.evaluate(() => PROJ.cards[0].error), /请更新本机 IF 桥接器/);
    assert.equal(runs.length, beforeOldBridge, 'old bridge must be rejected before generation');
    rejectProjectSaves = true;
    const beforeSaveFailure = runs.length;
    await page.evaluate(() => openPanel(PROJ.cards[0].id));
    await page.locator('#panel .go').click();
    await page.waitForFunction(() => PROJ.cards[0].status === 'error'
      && PROJ.cards[0].error.startsWith('任务准备状态保存失败'));
    assert.equal(runs.length, beforeSaveFailure, 'do not create a paid task when initial persistence fails');
    rejectProjectSaves = false;
    await page.evaluate(async () => {
      await persistence.pendingChain;
      const original = ifRequest;
      ifRequest = (path, options) => {
        if (path !== '/runs') return original(path, options);
        PROJ.cards[0].if_submitted_at = Date.now() - 120001;
        return Promise.reject(new TypeError('Failed to fetch'));
      };
      await runIF(PROJ.cards[0]);
    });
    await page.waitForFunction(() => PROJ.cards[0].status === 'error');
    assert.match(await page.evaluate(() => PROJ.cards[0].error), /提交结果尚未确认.*避免重复生成/);
    assert.equal(runs.length, beforeSaveFailure);
    await page.evaluate(() => persistence.pendingChain);
    const lookupsBeforeTimedOutRefresh = recoveryLookups;
    await page.reload();
    await page.waitForFunction(() => PROJ?.cards[0]?.status === 'error' && !PROJ.cards[0]._ifRecovering);
    assert.ok(recoveryLookups > lookupsBeforeTimedOutRefresh, 'timeout refresh must query the original request again');
    assert.equal(runs.length, beforeSaveFailure, 'timeout refresh must never repeat POST');
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem(ifTaskKey(PROJ.cards[0], PROJ.id))).phase), 'submitting');
    assert.deepEqual(await page.evaluate(() => {
      const c = PROJ.cards[0], base = {...plain(c), status:'running', job:'old-job', if_started:100, step:'旧进度'};
      rememberIFTask(base, PROJ.id, 'running');
      const newer = {...base, if_started:200, job:'new-job', status:'done', step:''};
      const restored = restoreIFTask(newer, PROJ.id);
      const otherProject = ifTaskKey(c, 'other-project');
      const otherCard = ifTaskKey({...c, id:'other-card'}, PROJ.id);
      const ownKey = ifTaskKey(c, PROJ.id);
      const user = Object.getOwnPropertyDescriptor(H3Auth, 'user');
      Object.defineProperty(H3Auth, 'user', {configurable:true, value:{id:'other-user'}});
      const otherUser = ifTaskKey(c, PROJ.id);
      Object.defineProperty(H3Auth, 'user', user);
      return {restored, job:newer.job, status:newer.status, keys:new Set([ownKey, otherProject, otherCard, otherUser]).size};
    }), {restored:false, job:'new-job', status:'done', keys:4});
    assert.deepEqual(await page.evaluate(async () => {
      const original = H3Auth.request, results = [];
      try {
        for (const startStatus of ['done', 'running']) {
          let release, reportHeld;
          const held = new Promise(resolve => { reportHeld = resolve; });
          H3Auth.request = (path, options = {}) => {
            if (options.method === 'PUT' && path === '/api/projects/' + PROJ.id)
              return new Promise(resolve => { release = resolve; reportHeld(); });
            return original(path, options);
          };
          const old = {id:'save-race', cap:'if_video', job:'old', status:startStatus, if_started:100, outputs:[]};
          rememberIFTask(old, PROJ.id, startStatus);
          const pending = saveIFTaskProject(old, PROJ.id);
          await held;
          const newer = {...old, job:startStatus === 'done' ? 'new' : 'old',
            if_started:startStatus === 'done' ? 200 : 100, status:'done'};
          rememberIFTask(newer, PROJ.id, 'done');
          release({rev:PROJ.rev}); await pending;
          results.push(JSON.parse(sessionStorage.getItem(ifTaskKey(old, PROJ.id)))?.job);
          sessionStorage.removeItem(ifTaskKey(old, PROJ.id));
        }
      } finally { H3Auth.request = original; }
      return results;
    }), ['new', 'old'], 'an older save acknowledgement cannot erase a newer task or an unsaved terminal result');
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(requests.filter(r => r === 'unexpected generation'), []);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
