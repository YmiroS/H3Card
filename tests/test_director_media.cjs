'use strict';
// NODE_PATH must include Playwright; CHOUKA_TEST_BROWSER can select msedge.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const {createServer} = require('node:http');
const {chromium} = require('playwright');

const WEB = path.join(__dirname, '../web');
const output = (kind, url) => ({kind, url, filename:kind === 'video' ? 'result.mp4' : 'result.png'});
const oldVideo = output('video','/api/file?filename=old.mp4&subfolder=video&type=output');
const newVideo = output('video','/api/artifact/new/result.mp4');
const image = output('image','/api/artifact/image/result.png');
function shot(id, history, selected = {}) {
  return {id, title:id, description:'镜头描述', shotSize:'中景', movement:'固定镜头', notes:'',
    image:{capability:'',params:{}}, video:{capability:'',params:{}}, assets:[], history, selected};
}

test('director restores video histories and paused first frames across all stages', async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(),'chouka-director-media-'));
  let browser, server;
  try {
    const videoPath = path.join(folder,'fixture.mp4'), imagePath = path.join(folder,'frame.png');
    const ffmpeg = process.env.CHOUKA_TEST_FFMPEG || 'ffmpeg';
    execFileSync(ffmpeg,['-nostdin','-v','error','-y','-f','lavfi','-i','color=c=green:size=96x64:rate=12:duration=3',
      '-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',videoPath]);
    execFileSync(ffmpeg,['-nostdin','-v','error','-y','-i',videoPath,'-frames:v','1',imagePath]);
    const videoBytes = fs.readFileSync(videoPath), imageBytes = fs.readFileSync(imagePath);
    const project = {id:'fixture',name:'导演媒体回归',permission:'operate',rev:1,cards:[],edges:[],director:{rev:1,script:'',style:'',shots:[
      shot('video-only',[{job:'old',stage:'video',outputs:[oldVideo]},{job:'new',stage:'video',outputs:[newVideo]}],{video:{job:'old',index:0}}),
      shot('mixed',[{job:'image',stage:'image',outputs:[image]},{job:'archived',stage:'video',outputs:[newVideo]}]),
      shot('image-only',[{job:'image',stage:'image',outputs:[image]}]),
    ]}};
    let writes = 0, thumbnails = 0, progress = 0;
    const authStub = `window.H3Auth = {
      active:true, requireUser:async()=>{}, mountAccount:()=>{},
      request:async(url,options)=>{const r=await fetch(url,options);if(!r.ok)throw Object.assign(Error('HTTP '+r.status),{status:r.status});return r.json();},
      json:(url,method,body)=>H3Auth.request(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),
      every:fn=>{window.testPoll=fn;}
    };`;
    const editStub = `window.DirectorEdit={dirty:false,pending:false,configure:()=>{},init:()=>{},refresh:()=>{},hide:()=>{},mount:()=>{},setContext:()=>{},flush:async()=>{}};`;
    server = createServer(async (req,res) => {
      const url = new URL(req.url,'http://localhost');
      const json = data => {res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
      if (url.pathname === '/api/cards') return json({director_schema:1,comfy_online:true,cards:[],capabilities:{}});
      if (url.pathname === '/api/projects') return json({projects:[project]});
      if (url.pathname === '/api/projects/fixture') return json(project);
      if (url.pathname === '/api/projects/fixture/director') {
        let body = ''; for await (const chunk of req) body += chunk;
        project.director = JSON.parse(body); delete project.director.canvas_rev;
        project.director.rev++; project.rev++; writes++;
        return json({project,director:project.director});
      }
      if (url.pathname === '/api/jobs') return json({jobs:[
        {id:'old',project:'fixture',status:'done',outputs:[]},
        {id:'image',project:'fixture',status:'running',progress:progress += 0.1,outputs:[]},
      ]});
      if (url.pathname.startsWith('/api/job/')) {res.writeHead(404);return res.end('archived');}
      if (url.pathname === '/api/thumbnail') {thumbnails++;res.setHeader('Content-Type','image/png');return res.end(imageBytes);}
      if (url.pathname === '/api/file' || url.pathname.endsWith('.mp4')) {res.setHeader('Content-Type','video/mp4');return res.end(videoBytes);}
      if (url.pathname.endsWith('.png')) {res.setHeader('Content-Type','image/png');return res.end(imageBytes);}
      if (url.pathname === '/auth.js' || url.pathname === '/director_edit.js') {
        res.setHeader('Content-Type','text/javascript');return res.end(url.pathname === '/auth.js' ? authStub : editStub);
      }
      const file = {'/director':'director.html','/director.js':'director.js','/director.css':'director.css'}[url.pathname];
      if (!file) {res.writeHead(404);return res.end();}
      res.setHeader('Content-Type',file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8');
      res.end(fs.readFileSync(path.join(WEB,file)));
    });
    await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
    browser = await chromium.launch(process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {});
    const page = await browser.newPage();
    const errors = []; page.on('pageerror',error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/director?project=fixture`);
    await page.waitForFunction(() => window.testPoll && document.querySelectorAll('#shots .shot-card').length === 3);
    await page.evaluate(() => window.testPoll());
    await page.waitForFunction(() => [...document.querySelectorAll('#shots video,#versions video')].every(v => v.readyState >= 2 && v.videoWidth === 96));
    assert.equal(await page.locator('#shots video').count(),2);
    assert.equal(await page.locator('#shots img').count(),1,'image-only shots retain their storyboard');
    assert.equal(await page.locator('#versions video').count(),2,'video-only shots expose video history even in storyboard stage');
    assert.ok((await page.locator('#versions .selected-version video').getAttribute('src')).endsWith(oldVideo.url),
      'an empty live job must not hide a saved, explicitly adopted output');
    assert.equal(await page.locator('[data-version-type="video"]').getAttribute('aria-pressed'),'true');
    assert.ok(await page.locator('#shots video').first().evaluate(v => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d'); context.drawImage(v,0,0,1,1);
      const pixel = context.getImageData(0,0,1,1).data;
      return v.paused && pixel[1] > pixel[0] + 50;
    }),'a decoded green first frame is visible without autoplay');
    assert.ok(thumbnails > 0,'artifact previews request the same thumbnail endpoint as canvas cards');
    await page.locator('#shots video').first().evaluate(async v => {v.testIdentity=true;await v.play();v.click();});
    assert.equal(await page.locator('#shots video').first().evaluate(v => v.testIdentity && !v.paused),true,
      'selecting a playing card must not replace its video element');
    await page.evaluate(() => window.testPoll());
    assert.equal(await page.locator('#shots video').first().evaluate(v => v.testIdentity && !v.paused),true,
      'job progress polling must preserve unchanged video playback');
    await page.locator('[data-stage="video"]').click();
    assert.equal(await page.locator('#versions video').count(),2);
    await page.locator('#versions .version').first().getByRole('button',{name:'采用这个版本'}).click();
    assert.ok((await page.locator('#shots video').first().getAttribute('src')).endsWith(newVideo.url));
    await page.getByRole('button',{name:'保存',exact:true}).click();
    await page.waitForFunction(() => document.getElementById('save-status').textContent === '已保存');
    assert.equal(project.director.shots[0].selected.video.job,'new');
    assert.equal(writes,1);
    await page.locator('[data-stage="image"]').click();
    await page.locator('#shots .shot-card').nth(1).click();
    assert.equal(await page.locator('#versions img').count(),1);
    await page.locator('[data-version-type="video"]').click();
    assert.equal(await page.locator('#versions video').count(),1,'archived task snapshots remain previewable');
    await page.locator('[data-stage="review"]').click();
    assert.equal(await page.locator('#review-list video').count(),2);
    assert.equal(await page.locator('#shots video').count(),0,'hidden stages must release their media');
    assert.equal(await page.locator('#versions video').count(),0);
    await page.locator('#review-list video').first().evaluate(async v => {v.testIdentity=true;await v.play();});
    await page.evaluate(() => window.testPoll());
    assert.equal(await page.locator('#review-list video').first().evaluate(v => v.testIdentity && !v.paused),true,
      'review playback must also survive unrelated job progress updates');
    await page.locator('#review-list').getByRole('button',{name:'预览镜头'}).first().click();
    await page.waitForFunction(() => {const v=document.querySelector('#preview-media video');return v && v.readyState >= 2 && !v.paused;});
    assert.equal(await page.locator('#review-list video').first().evaluate(v => v.paused),true,'modal preview stops background audio');
    await page.locator('#preview-close').click();
    await page.waitForFunction(() => !document.querySelector('#preview-media video'));
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#shots video')?.getAttribute('src')?.endsWith('/api/artifact/new/result.mp4'));
    project.permission = 'read';
    await page.reload();
    await page.waitForFunction(() => window.testPoll && document.querySelectorAll('#shots .shot-card').length === 3);
    await page.locator('#shots .shot-card').nth(1).click();
    await page.locator('[data-version-type="video"]').click();
    assert.equal(await page.locator('#versions video').count(),1,'read-only collaborators can inspect video histories');
    assert.equal(await page.locator('#versions .button').first().isDisabled(),true,'read-only collaborators cannot adopt a version');
    assert.deepEqual(errors,[]);
  } finally {
    if (browser) await browser.close();
    if (server) {server.closeAllConnections();await new Promise(resolve => server.close(resolve));}
    fs.rmSync(folder,{recursive:true,force:true});
  }
});
