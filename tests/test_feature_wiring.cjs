// Complete production page and modules; every API is an isolated in-memory fixture.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {createServer} = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');
const {featureFiles} = require('./helpers/frontend-static.cjs');
const root=path.join(__dirname,'..');
const caps=Object.fromEntries(['zimage_t2i','krea2_t2i'].map(id => [id,JSON.parse(readFileSync(path.join(root,'manifests',id+'.json'),'utf8'))]));
const cards=JSON.parse(readFileSync(path.join(root,'manifests/_cards.json'),'utf8')).filter(card => card.id==='card_image');

test('production index wires feature factories, save isolation and task permission controls', async t => {
  const projects=Object.fromEntries(['a','b'].map(id => [id,{id,name:'模块画布 '+id,permission:'operate',rev:0,
    cards:[{id:'card-'+id,type:'card_image',cap:'zimage_t2i',x:100,y:20,params:{},assets:{},outputs:[]}],
    edges:[],groups:[],view:{x:60,y:70,k:1}}]));
  const requests=[], puts=[], cancels=[], deletions=[], unexpected=[];
  let holdSave=false, releaseSave=null, failSave=false, reportHeld;
  const saveHeld=new Promise(resolve => {reportHeld=resolve;});
  let jobs=[{id:'readonly-job',project:'a',projectName:'模块画布 a',card:'card-a',cardName:'只读任务',name:'文生图',
    capability:'zimage_t2i',status:'running',progress:.3,step:'采样中',nodeName:'测试节点',permission:'read',created:1}];
  const files={...featureFiles,'/':'index.html','/app.js':'app.js','/auth.js':'auth.js','/style.css':'style.css',
    '/vendor/fabric.min.js':'vendor/fabric.min.js','/image-composer.js':'image-composer.js','/image-composer.css':'image-composer.css',
    '/favicon.png':'favicon.png','/icon.png':'icon.png'};
  const json=(res,value,status=200) => {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(value));};
  const server=createServer((req,res) => {
    const url=new URL(req.url,'http://fixture'), pathname=url.pathname; requests.push(pathname);
    if(pathname==='/api/auth/me')return json(res,{user:{id:'test',username:'test',role:'admin'},csrf_token:'fixture'});
    if(pathname==='/api/auth/presence')return json(res,{online_users:1});
    if(pathname==='/api/cards')return json(res,{cards,capabilities:caps,comfy_online:true});
    if(pathname==='/api/health')return json(res,{comfy_online:true});
    if(pathname==='/api/jobs')return json(res,{jobs});
    if(pathname==='/api/projects')return json(res,{projects:Object.values(projects).map(project => ({...project,cards:1}))});
    if(pathname==='/api/job/readonly-job/cancel') {cancels.push(pathname);jobs=jobs.map(job => ({...job,status:'canceled'}));return json(res,{ok:true});}
    if(pathname==='/api/job/readonly-job' && req.method==='DELETE') {deletions.push(pathname);jobs=[];return json(res,{ok:true});}
    if(/^\/api\/projects\/[ab]\/presence$/.test(pathname))return json(res,{members:[]});
    if(/^\/api\/projects\/[ab]\/view$/.test(pathname))return json(res,{ok:true});
    const match=/^\/api\/projects\/([ab])$/.exec(pathname);
    if(match) {
      const project=projects[match[1]];
      if(req.method==='PUT') {
        const chunks=[];req.on('data',chunk => chunks.push(chunk));req.on('end',() => {
          const body=JSON.parse(Buffer.concat(chunks).toString());puts.push({id:project.id,body});
          const respond=() => {if(failSave)return json(res,{error:'fixture save failure'},503);
            Object.assign(project,body,{rev:project.rev+1});json(res,{ok:true,rev:project.rev});};
          if(holdSave){releaseSave=respond;reportHeld();}else respond();
        });return;
      }
      return json(res,project);
    }
    if(files[pathname]) {
      const file=files[pathname];res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html; charset=utf-8');
      return res.end(readFileSync(path.join(root,'web',file)));
    }
    unexpected.push(req.method+' '+pathname);res.writeHead(404);res.end();
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser=await chromium.launch(process.env.CHOUKA_TEST_BROWSER?{channel:process.env.CHOUKA_TEST_BROWSER}:{});
    const page=await browser.newPage({viewport:{width:1500,height:1000}}), errors=[];
    page.on('pageerror',error => errors.push(error.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/?project=a');
    try { await page.waitForFunction(() => PROJ?.cards[0]?._el, undefined, {timeout:10000}); }
    catch(error) { throw new Error(`${error.message}\npage errors: ${JSON.stringify(errors)}\nrequests: ${JSON.stringify(requests)}`); }
    await t.test('factories load before app and the UI uses their actual controls',async () => {
      assert.deepEqual(await page.locator('script[src]').evaluateAll(scripts => scripts.map(s=>s.getAttribute('src')).slice(-4)),
        ['/features/node-parameters.js','/features/project-persistence.js','/features/task-panel.js','app.js']);
      await page.evaluate(async () => {await openProject('a');pick('card-a');});
      await page.locator('#panel button[title^="点开弹窗"]').click();
      assert.equal(await page.locator('#respop .cpick').count(),1);
      await page.locator('#respop button[title^="画面比例 16:9"]').click();
      assert.match(await page.locator('#panel button[title^="点开弹窗"]').innerText(),/16:9/);
      await page.locator('#respop .x').click();
      await page.evaluate(() => flushLocalChanges());
      assert.ok(puts.length>0);
    });
    await t.test('late saves cannot change another project or consume its pending edits',async () => {
      holdSave=true;
      await page.evaluate(() => {PROJ.cards[0].params.prompt='late a';window.pendingSave=enqueueSave();});
      await saveHeld;
      await page.evaluate(() => openProject('b'));
      const before=await page.evaluate(() => PROJ.rev);
      holdSave=false;releaseSave();releaseSave=null;
      assert.equal(await page.evaluate(async () => (await window.pendingSave).ok),false);
      assert.deepEqual(await page.evaluate(() => [PROJ.id,PROJ.rev]),['b',before]);
      await page.evaluate(async () => {PROJ.cards[0].params.prompt='b only';await flushLocalChanges();});
      assert.equal(puts.at(-1).id,'b');assert.equal(puts.at(-1).body.cards[0].params.prompt,'b only');
      assert.equal(projects.a.cards[0].params.prompt,'late a');
    });
    await t.test('failed flush is observable and retries through the same production queue',async () => {
      failSave=true;
      const error=await page.evaluate(async () => {try{await flushLocalChanges();return null;}catch(error){return error.message;}});
      assert.match(error,/fixture save failure/);
      assert.equal(await page.evaluate(() => persistence.status.pendingContentSaves),0);
      failSave=false;await page.evaluate(() => flushLocalChanges());
      assert.equal(await page.evaluate(() => persistence.status.saveFailure),null);
    });
    await t.test('task panel preserves Chinese progress and blocks readonly cancellation',async () => {
      await page.evaluate(() => pollJobs());await page.locator('#jobsbtn').click();
      const row=page.locator('#jobs .jrow');
      assert.match(await row.innerText(),/当前：采样中/);
      await row.getByRole('button',{name:'停止',exact:true}).click();
      assert.equal(cancels.length,0);assert.match(await page.locator('#toast').innerText(),/只读/);
      jobs=jobs.map(job => ({...job,permission:'operate'}));await page.evaluate(() => pollJobs());
      await page.locator('#jobs .jrow').getByRole('button',{name:'停止',exact:true}).click();
      await page.waitForFunction(() => taskPanel.getJobs()[0]?.status==='canceled');
      assert.equal(cancels.length,1);
    });
    await t.test('canvas retains missing jobs, recovers explicit states and cancels only after the actual delete control succeeds',async () => {
      await page.evaluate(async () => {
        await openProject('a');
        Object.assign(PROJ.cards[0],{job:'readonly-job',status:'running'});paint(PROJ.cards[0]);
      });
      const job={...jobs[0]}; jobs=[];
      await page.evaluate(() => pollJobs());
      assert.deepEqual(await page.evaluate(() => [PROJ.cards[0].status,PROJ.cards[0].job]),['running','readonly-job']);
      jobs=[{...job,status:'canceled'}]; await page.evaluate(() => pollJobs());
      assert.deepEqual(await page.evaluate(() => [PROJ.cards[0].status,PROJ.cards[0].job]),['canceled','readonly-job']);
      jobs=[{...job,status:'running'}]; await page.evaluate(() => pollJobs());
      assert.equal(await page.evaluate(() => PROJ.cards[0].status),'running');
      const deleting=page.waitForResponse(response => response.url().endsWith('/api/job/readonly-job')
        && response.request().method()==='DELETE');
      page.once('dialog',dialog => dialog.accept());
      await page.locator('#jobs .jrow').getByRole('button',{name:'删除',exact:true}).click(); await deleting;
      await page.waitForFunction(() => PROJ.cards[0].status==='canceled' && PROJ.cards[0].job===null);
      assert.equal(deletions.length,1); assert.equal(await page.evaluate(() => PROJ.cards[0].step),'');
      await page.evaluate(() => flushLocalChanges());
      assert.equal(puts.at(-1).body.cards[0].status,'canceled'); assert.equal(puts.at(-1).body.cards[0].job,null);
    });
    assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
    for(const resource of Object.keys(featureFiles).filter(name=>name.startsWith('/features/')))assert.ok(requests.includes(resource));
  } finally {
    if(releaseSave){holdSave=false;releaseSave();}
    if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  }
});
