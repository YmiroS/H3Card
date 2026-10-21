const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {execFileSync} = require('node:child_process');
const {createServer} = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');

const root = path.join(__dirname, '..');
const python = process.env.CHOUKA_TEST_PYTHON || path.join(root, '..', 'python_embeded', 'python.exe');
const runtime = JSON.parse(execFileSync(python, ['-B', '-X', 'utf8', '-c',
  `import sys,json;sys.path.insert(0,${JSON.stringify(root)});from server import app;app.load_caps();print(json.dumps({'cards':app.CARDS,'capabilities':app.CAPS}))`],
  {encoding:'utf8', maxBuffer:8 * 1024 * 1024}));
const CASES = [
  ['zimage_t2i', 9, 't2i'], ['krea2_t2i', 8, 't2i'], ['qwen_image_2512_t2i', 6, 't2i'], ['qwen_image_21_t2i', 40, 't2i'],
  ['zimage_i2i', 9, 'i2i'], ['krea2_i2i', 8, 'i2i'], ['qwen_image_edit_2511_i2i', 4, 'i2i'], ['qwen_image_21_i2i', 40, 'i2i'],
];
const NEGATIVE_CAPS = new Set(['qwen_image_2512_t2i','qwen_image_21_t2i','qwen_image_edit_2511_i2i','qwen_image_21_i2i']);
const LEVELS = ['480P', '720P', '1080P', '1440P', '2K'];
const RATIOS = ['1:1', '1:2', '2:1', '9:16', '16:9', '3:4', '4:3', '3:2', '2:3', '5:4', '4:5', '21:9', '9:21'];

test('generation cards expose real runtime controls and honor workflow seeds', async t => {
  const project = {id:'controls-test', name:'基础参数测试', permission:'operate', locked:true,
    edges:[], groups:[], view:{x:100,y:70,k:1},
    cards:[{id:'card',type:'card_image',cap:'zimage_t2i',x:100,y:20,params:{},assets:{},outputs:[]}]};
  const json = (res, data) => {res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
  const mediaRequests=[], submissions=[];
  const metadata = new Map([
    ['chouka/portrait.mp4',{width:720,height:1280,duration:7.375,fps:24}],
    ['chouka/custom.mp4',{width:1000,height:800,duration:19.125,fps:30}],
    ['chouka/wide.mp4',{width:1946,height:834,duration:4.1,fps:24}],
  ]);
  let delayedMedia, reportDelayed, persistProject=false;
  const delayedReady=new Promise(resolve=>{reportDelayed=resolve;});
  const server = createServer((req,res) => {
    const pathname = new URL(req.url,'http://localhost').pathname;
    if (pathname === '/api/auth/me') return json(res,{user:{id:'admin',username:'admin',role:'admin'},csrf_token:'test'});
    if (pathname === '/api/cards') return json(res,{...runtime,comfy_online:true});
    if (pathname === '/api/health') return json(res,{comfy_online:true});
    if (pathname === '/api/jobs') return json(res,{jobs:[]});
    if (pathname === '/api/media') {
      const ref=new URL(req.url,'http://localhost').searchParams.get('ref');mediaRequests.push(ref);
      if(ref==='chouka/delayed.mp4') { delayedMedia=()=>json(res,{width:1920,height:1080,duration:12});reportDelayed();return; }
      return json(res,metadata.get(ref)||{});
    }
    if (pathname === '/api/upload') {
      req.resume();req.on('end',()=>json(res,{kind:'video',ref:'chouka/wide.mp4',url:'/wide.mp4',...metadata.get('chouka/wide.mp4')}));
      return;
    }
    if (pathname === '/api/generate') {
      const chunks=[];req.on('data',chunk=>chunks.push(chunk));
      req.on('end',()=>{submissions.push(JSON.parse(Buffer.concat(chunks).toString('utf8')));json(res,{id:'follow-job',status:'queued'});});
      return;
    }
    if (pathname === '/api/projects') return json(res,{projects:[{...project,cards:1}]});
    if (pathname === '/api/projects/controls-test' && req.method==='PUT' && persistProject) {
      const chunks=[];req.on('data',chunk=>chunks.push(chunk));
      req.on('end',()=>{Object.assign(project,JSON.parse(Buffer.concat(chunks).toString('utf8')));project.rev=(project.rev||0)+1;json(res,{ok:true,rev:project.rev});});
      return;
    }
    if (pathname === '/api/projects/controls-test') return json(res,project);
    if (pathname === '/api/projects/controls-test/cards' && req.method === 'POST') {
      const chunks=[];
      req.on('data',chunk=>chunks.push(chunk));
      req.on('end',()=>{
        const {card}=JSON.parse(Buffer.concat(chunks).toString('utf8'));
        json(res,{ok:true,card,project:{...project,rev:1,cards:[...project.cards,card]}});
      });
      return;
    }
    const files = {...require('./helpers/frontend-static.cjs').canvasFiles, '/':'index.html','/app.js':'app.js','/auth.js':'auth.js','/style.css':'style.css','/icon.png':'icon.png','/favicon.png':'favicon.png'};
    if (files[pathname]) {
      const name=files[pathname];
      res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript; charset=utf-8':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':'text/html; charset=utf-8');
      return res.end(readFileSync(path.join(root,'web',name)));
    }
    res.writeHead(404);res.end();
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser=await chromium.launch(process.env.CHOUKA_TEST_BROWSER?{channel:process.env.CHOUKA_TEST_BROWSER}:{});
    const page=await browser.newPage({viewport:{width:1600,height:1100}});
    page.setDefaultTimeout(10000);
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const origin='http://127.0.0.1:'+server.address().port;
    const paramsButton=page.locator('#panel button[title^="点开弹窗"]');
    const modelButton=page.locator('#panel button[title="生图模型 —— 点击换"]');
    const row=label=>page.locator('#respop .image-basic .row').filter({has:page.getByText(label,{exact:true})});
    async function reset(cap, type='card_image') {
      await page.goto(origin);
      await page.waitForFunction(()=>PROJ && PROJ.cards[0]?._el);
      await page.evaluate(({cap,type})=>{
        const c=PROJ.cards[0];c.cap=cap;c.type=type;c.params={};c.assets={};
        paintTitle(c);pick(c.id);
      },{cap,type});
    }
    async function model(name) {
      await modelButton.click();
      await page.locator('#menu button').filter({hasText:name}).click();
    }
    async function mode(name) {
      await page.locator('#panel button[title="生图模式 —— 点击换"]').click();
      await page.locator('#menu button').filter({hasText:name}).click();
    }

    await t.test('eight models expose identical basic rows and five clarity choices',async()=>{
      for (const [cap,steps,kind] of CASES) {
        assert.ok(runtime.capabilities[cap].imageControls,cap);
        await reset(cap);
        await paramsButton.click();
        assert.deepEqual(await page.locator('#respop .cgrid.k button').allTextContents(),LEVELS,cap);
        assert.deepEqual(await page.locator('#respop .image-basic .row > label').allTextContents(),['采样步数','种子'],cap);
        assert.equal(await row('采样步数').locator('input[type=number]').inputValue(),String(steps),cap);
        assert.equal(await row('种子').locator('input[type=number]').inputValue(),'-1',cap);
        const ratios=await page.locator('#respop .cgrid:not(.k) button span').allTextContents();
        assert.deepEqual(ratios,kind==='i2i'?['原图',...RATIOS]:RATIOS,cap);
        assert.equal(await page.locator('#respop .cgrid:not(.k) button.on span').innerText(),kind==='i2i'?'原图':'3:4',cap);
        assert.equal(await page.locator('#respop .cgrid.k button.on').innerText(),'720P',cap);
      }
    });

    await t.test('ratio previews preserve exact labeled geometry in every picker and viewport',async t=>{
      t.after(()=>page.setViewportSize({width:1600,height:1100}));
      const variants = [
        ['image', null],
        ['legacy', {inputs:[{key:'aspect_ratio',options:['1:1'],default:'1:1'}]}],
        ['dimensions', {inputs:[{key:'width',default:1024},{key:'height',default:1024}]}],
        ['resolution', {inputs:[{key:'resolution',default:'1024x1024 (1:1)',options:[
          '1024x1024 (1:1)','1344x768 (16:9)','768x1344 (9:16)',
        ]}]}],
      ];
      for (const width of [1600,390]) {
        for (const [name,definition] of variants) {
          await page.setViewportSize({width:1600,height:1100});
          await reset('zimage_t2i');
          await paramsButton.click();
          if (definition) await page.evaluate(definition=>{
            const c=PROJ.cards[0];
            el.respop.replaceChildren(clarityPicker(c,definition,()=>{}));
          },definition);
          await page.setViewportSize({width,height:1100});
          const shapes=await page.locator('#respop .cgrid:not(.k) button').evaluateAll(buttons=>buttons.map(button=>{
            const rect=button.querySelector('i').getBoundingClientRect();
            const bounds=button.getBoundingClientRect();
            return {label:button.querySelector('span').textContent,width:rect.width,height:rect.height,
              inside:rect.left>=bounds.left && rect.right<=bounds.right && rect.top>=bounds.top && rect.bottom<=bounds.bottom};
          }));
          assert.equal(shapes.length,name==='resolution'?3:RATIOS.length,name);
          for(const shape of shapes) {
            const [w,h]=shape.label.split(':').map(Number);
            assert.ok(Math.abs(shape.width-shape.height*w/h)<=0.04,
              `${name} ${width}px ${shape.label}: ${shape.width}×${shape.height}`);
            assert.ok(shape.width>0 && shape.width<=26 && shape.height>0 && shape.height<=22,
              `${name} ${shape.label} fits the preview bounds`);
            assert.equal(shape.inside,true,`${name} ${shape.label} stays inside its button`);
          }
        }
      }
    });

    await t.test('negative prompt appears only for models with an active negative-conditioning path',async()=>{
      const negative=page.locator('#panel textarea[placeholder^="负向提示词"]');
      for(const [cap] of CASES) {
        await reset(cap);
        assert.equal(await negative.count(),NEGATIVE_CAPS.has(cap)?1:0,cap);
        if(NEGATIVE_CAPS.has(cap)) {
          await negative.fill('不要出现测试水印');
          assert.equal(await page.evaluate(()=>payloadOf(PROJ.cards[0]).params.negative_prompt),'不要出现测试水印',cap);
        }
      }
      await reset('qwen_image_21_t2i');
      assert.equal(await negative.count(),1);
      await model('Z-Image');
      assert.equal(await negative.count(),0,'switching to Z-Image hides the ineffective field');
      await model('Qwen Image 2512（双阶段）');
      assert.equal(await negative.count(),1,'switching back to a supported model restores the field');
    });

    await t.test('all choices reach common payload fields and visible fixed seeds are honored',async()=>{
      for(const [cap,steps] of CASES) {
        await reset(cap);await paramsButton.click();
        await row('种子').locator('input[type=number]').fill('12345');
        await page.locator('#respop button[title="画面比例 16:9"]').click();
        for(const level of LEVELS) {
          await page.locator('#respop .cgrid.k').getByRole('button',{name:level,exact:true}).click();
          const payload=await page.evaluate(()=>payloadOf(PROJ.cards[0]));
          assert.equal(payload.params.image_ratio,'16:9',cap);
          assert.equal(payload.params.image_clarity,level,cap);
          assert.equal(payload.params.steps,steps,cap);
          assert.equal(payload.params.seed,12345,cap);
          for(const key of ['width','height','resolution','aspect_ratio','megapixels','scale_to_length']) {
            assert.equal(Object.hasOwn(payload.params,key),false,cap+' '+key);
          }
        }
        for(const ratio of RATIOS) {
          await page.locator(`#respop button[title="画面比例 ${ratio}"]`).click();
          assert.equal(await page.evaluate(()=>payloadOf(PROJ.cards[0]).params.image_ratio),ratio,cap);
          assert.equal(await page.locator('#respop .cgrid:not(.k) button.on').count(),1,cap);
        }
        assert.match(await paramsButton.innerText(),/9:21.*2K/,cap);
      }
    });

    await t.test('every seeded workflow exposes one editable control and submits its visible value',async()=>{
      const seeded=Object.values(runtime.capabilities).filter(cap=>cap.inputs.some(s=>s.type==='seed' && !s.mirror));
      assert.ok(seeded.length>20);
      for(const cap of seeded) {
        await reset(cap.id);
        await page.evaluate(()=>{PROJ.cards[0].seed=987654;});
        const compact=await page.evaluate(()=>{
          const def=defOf(PROJ.cards[0]);
          return ['card_image','card_video','card_tools'].includes(def.id) && def.modes.length>1;
        });
        if(compact) await paramsButton.click();
        const container=page.locator(compact?'#respop':'#panel .pwrap');
        const seeds=cap.inputs.filter(s=>s.type==='seed' && !s.mirror);
        assert.equal(await container.locator('.dice').count(),seeds.length,cap.id);
        for(const spec of seeds) {
          const seedRow=container.locator('.row').filter({has:page.getByText(spec.label,{exact:true})});
          const input=seedRow.locator('input[type=number]');
          assert.equal(await input.inputValue(),'-1',cap.id);
          assert.equal((await page.evaluate(()=>payloadOf(PROJ.cards[0]))).params[spec.key],-1,cap.id);
          const fixed=Math.min(spec.max || Number.MAX_SAFE_INTEGER,3723077505083689);
          await input.fill(String(fixed));
          assert.equal((await page.evaluate(()=>payloadOf(PROJ.cards[0]))).params[spec.key],fixed,cap.id);
          assert.equal((await page.evaluate(()=>plain(PROJ.cards[0]))).params[spec.key],fixed,cap.id);
          await page.evaluate(()=>openPanel(PROJ.cards[0].id));
          if(compact) await paramsButton.click();
          assert.equal(await input.inputValue(),String(fixed),cap.id);
          await input.fill('0');
          assert.equal((await page.evaluate(()=>payloadOf(PROJ.cards[0]))).params[spec.key],0,cap.id);
          await seedRow.locator('.dice').click();
          assert.equal(await input.inputValue(),'-1',cap.id);
          assert.equal((await page.evaluate(()=>payloadOf(PROJ.cards[0]))).params[spec.key],-1,cap.id);
          await input.fill('');
          assert.equal((await page.evaluate(()=>payloadOf(PROJ.cards[0]))).params[spec.key],-1,cap.id);
        }
      }
      await reset('depth_image','card_tools');await paramsButton.click();
      assert.equal(await page.locator('#respop .dice').count(),0,'unseeded workflows do not get a seed control');
    });

    await t.test('model changes retain clarity, restore model-specific edits and default i2i to original ratio',async()=>{
      await reset('zimage_t2i');await paramsButton.click();
      await page.locator('#respop button[title="画面比例 16:9"]').click();
      await page.locator('#respop .cgrid.k').getByRole('button',{name:'1080P',exact:true}).click();
      await row('采样步数').locator('input[type=number]').fill('11');
      await row('种子').locator('input[type=number]').fill('9876');
      await model('Krea2');
      assert.equal(await page.locator('#respop').isVisible(),false);
      await paramsButton.click();
      assert.equal(await row('采样步数').locator('input[type=number]').inputValue(),'8');
      assert.match(await paramsButton.innerText(),/16:9.*1080P/);
      await row('采样步数').locator('input[type=number]').fill('10');
      await model('Z-Image');await paramsButton.click();
      assert.equal(await row('采样步数').locator('input[type=number]').inputValue(),'11');
      assert.equal(await row('种子').locator('input[type=number]').inputValue(),'9876');
      await mode('图生图');await paramsButton.click();
      assert.equal(await page.locator('#respop .cgrid:not(.k) button.on span').innerText(),'原图');
      assert.match(await paramsButton.innerText(),/原图.*1080P/);
      assert.equal(await row('采样步数').locator('input[type=number]').inputValue(),'9');
      await page.locator('#respop button[title="画面比例 4:3"]').click();
      await model('Krea2');await paramsButton.click();
      assert.match(await paramsButton.innerText(),/4:3.*1080P/);
      assert.equal(await row('采样步数').locator('input[type=number]').inputValue(),'8');
      await mode('文生图');await paramsButton.click();
      assert.match(await paramsButton.innerText(),/16:9.*1080P/);
      assert.equal(await row('采样步数').locator('input[type=number]').inputValue(),'10');
      assert.equal(await page.evaluate(()=>plain(PROJ.cards[0]).params._imageModelParams.zimage_t2i.steps),11);
    });

    await t.test('second-stage refinement and denoise remain model-specific, not extra basic controls',async()=>{
      await reset('qwen_image_2512_t2i');await paramsButton.click();
      assert.equal(await page.locator('#respop .image-basic .row').count(),2);
      const special=page.locator('#respop .image-advanced');
      assert.equal(await special.getAttribute('open'),null);
      await special.locator('summary').click();
      const refinement=special.locator('.row').filter({hasText:'第二阶段步数'}).locator('input[type=number]');
      assert.equal(await refinement.inputValue(),'2');await refinement.fill('3');
      await model('Qwen Image 2.1');await paramsButton.click();
      assert.equal(await row('采样步数').locator('input[type=number]').inputValue(),'40');
      assert.equal(Object.hasOwn((await page.evaluate(()=>payloadOf(PROJ.cards[0]))).params,'refine_steps'),false);
      await model('Qwen Image 2512（双阶段）');await paramsButton.click();
      await special.locator('summary').click();assert.equal(await refinement.inputValue(),'3');
      await reset('zimage_i2i');await paramsButton.click();
      await page.locator('#respop .image-advanced summary').click();
      const denoise=page.locator('#respop .image-advanced .row').filter({hasText:'重绘幅度'}).locator('input[type=number]');
      await denoise.fill('0.5');
      assert.equal((await page.evaluate(()=>payloadOf(PROJ.cards[0]))).params.denoise,0.5);
    });

    await t.test('existing automatic image-mode switches also use original ratio and model defaults',async()=>{
      for(const family of ['zimage','krea2']) {
        await reset(family+'_t2i');
        const payload=await page.evaluate(async()=>{
          const c=PROJ.cards[0];c.params={image_ratio:'16:9',image_clarity:'1080P',steps:27};
          const from=addCard('card_asset',700,20);
          from.outputs=[{kind:'image',ref:'reference.png',url:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='}];
          await linkTo(from,c);
          return payloadOf(c);
        });
        assert.equal(payload.capability,family+'_i2i');
        assert.equal(payload.params.image_ratio,'original');
        assert.equal(payload.params.image_clarity,'1080P');
        assert.equal(payload.params.steps,family==='zimage'?9:8);
        assert.equal(payload.assets['images[0]'],'reference.png');
      }
    });

    await t.test('Qwen Image 2.1 model switch exposes all sixteen web slots in image-to-image mode',async()=>{
      await reset('zimage_i2i');
      await model('Qwen Image 2.1');
      assert.equal(await page.evaluate(()=>PROJ.cards[0].cap),'qwen_image_21_multi');
      assert.match(await page.locator('#panel .refhead').innerText(),/图片 16/);
      assert.equal(await page.locator('#panel .refadd').innerText(),'＋ 添加图片（0/16）');
      const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
      const payload=await page.evaluate(png=>{
        const c=PROJ.cards[0];
        c.assets=Object.fromEntries(Array.from({length:16},(_,i)=>[
          `images[${i}]`,{kind:'image',url:png+'#'+i,ref:`image${i}.png`},
        ]));
        openPanel(c.id);
        return payloadOf(c);
      },png);
      assert.equal(await page.locator('#panel .slot.filled').count(),16);
      assert.equal(await page.locator('#panel .refadd').count(),0);
      assert.deepEqual(Object.keys(payload.assets),Array.from({length:16},(_,i)=>`images[${i}]`));
    });

    await t.test('toolbox modes use the lower-left switcher',async()=>{
      await reset('depth_image','card_tools');
      assert.equal(await page.locator('#panel .modes').count(),0);
      const switcher=page.locator('#panel button[title="工具箱模式 —— 点击换"]');
      assert.equal(await switcher.count(),1);
      await switcher.click();
      const expected=runtime.cards.find(c=>c.id==='card_tools').modes.map(m=>m.name);
      const shown=(await page.locator('#menu button span:nth-child(2)').allTextContents()).map(x=>x.replace('（当前）',''));
      assert.deepEqual(shown,expected);
      await page.locator('#menu button').filter({hasText:'深度视频'}).click();
      assert.equal(await page.evaluate(()=>PROJ.cards[0].cap),'depth_video');
      assert.equal(await page.locator('#panel button[title="工具箱模式 —— 点击换"] span').innerText(),'🧩 深度视频');
      const depthModel=page.locator('#panel button[title="深度视频模型 —— 点击换"]');
      assert.equal(await depthModel.locator('span').innerText(),'Depth Anything 3');
      await depthModel.click();
      assert.deepEqual(await page.locator('#menu button span:nth-child(2)').allTextContents(),['Depth Anything 3（当前）','DepthCrafter']);
      await page.locator('#menu button').filter({hasText:'DepthCrafter'}).click();
      assert.equal(await page.evaluate(()=>PROJ.cards[0].cap),'depthcrafter_video');
      assert.equal(await depthModel.locator('span').innerText(),'DepthCrafter');
      assert.equal(await paramsButton.count(),1);
      await paramsButton.click();
      const depthParams=await page.locator('#respop .row > label').allTextContents();
      for(const label of ['只处理前几帧','处理分辨率','推理步数','引导强度','窗口帧数','窗口重叠帧']) assert.ok(depthParams.includes(label),label);
      await page.locator('#respop .x').click();
      await switcher.click();
      await page.locator('#menu button').filter({hasText:'画质增强'}).click();
      assert.equal(await page.evaluate(()=>PROJ.cards[0].cap),'seedvr2_image_up');
      await page.locator('#dock button').filter({hasText:'工具箱'}).click();
      const created=await page.evaluate(()=>({type:PROJ.cards.at(-1).type,cap:PROJ.cards.at(-1).cap}));
      assert.deepEqual(created,{type:'card_tools',cap:'rmbg_cutout'});
      assert.equal(await page.locator('#menu').isVisible(),false);
      assert.equal(await page.locator('#panel button[title="工具箱模式 —— 点击换"]').count(),1);
    });

    await t.test('image editing previews show only the result and still open the normal viewer',async()=>{
      const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
      for(const cap of ['zimage_i2i','krea2_i2i','qwen_image_edit_2511_i2i','qwen_image_21_i2i','qwen_image_21_multi']) {
        await reset(cap);
        await page.evaluate(png=>{
          const c=PROJ.cards[0];
          c.assets={'images[0]':{kind:'image',url:png+'#original',ref:'original.png'}};
          c.outputs=[{kind:'image',url:png+'#result',filename:'result.png',width:1,height:1}];
          c.status='done';c._cmp=0.6;
          const body=c._el.querySelector('.body');
          body.dataset.url=png+'#result|<'+png+'#original';
          body.innerHTML='<div class="cmp"><div class="cmpx"></div></div>';
          paint(c);
        },png);
        assert.equal(await page.locator('#world .cmp, #world .cmpx, #world .cmptip').count(),0,cap);
        const result=page.locator('#world .body > img');
        assert.equal(await result.count(),1,cap);
        await page.waitForFunction(() => {
          const img = document.querySelector('#world .body > img');
          return img?.complete && img.naturalWidth === 1;
        });
        const displayed = await result.evaluate(async img =>
          [...new Uint8Array(await (await fetch(img.currentSrc)).arrayBuffer())]);
        assert.deepEqual(displayed, [...Buffer.from(png.split(',')[1], 'base64')], cap);
        assert.equal(await page.evaluate(() => PROJ.cards[0].outputs[0].url), png+'#result', cap);
        await result.dblclick();
        assert.equal(await page.evaluate(()=>el.view.style.display!=='none' && VIEW.outs[0].url.endsWith('#result')),true,cap);
      }
      await reset('rmbg_cutout','card_tools');
      await page.evaluate(png=>{
        const c=PROJ.cards[0];
        const slot=capOf(c).inputs.find(s=>s.type==='image').key;
        c.assets={[slot]:{kind:'image',url:png+'#original'}};
        c.outputs=[{kind:'image',url:png+'#result',filename:'result.png',width:1,height:1}];
        c.status='done';paint(c);
      },png);
      assert.equal(await page.locator('#world .cmp').count(),1,'cutout tool keeps its comparison preview');
    });

    await t.test('H3 video quality mode expands its sampling preset and warns on long clips',async()=>{
      await reset('minimax_h3_ref9','card_video');await paramsButton.click();
      assert.deepEqual(await page.locator('#respop .cgrid.k button').allTextContents(),['480p','544p','640p','768p']);
      assert.equal(await page.locator('#respop .image-basic').count(),0);
      const modeRow=page.locator('#respop .row').filter({hasText:'生成模式'});
      const mode=modeRow.locator('select');
      assert.deepEqual(await mode.locator('option').allTextContents(),['快速模式（8步·提速）','质量模式（20步·高一致性）']);
      assert.equal(await mode.inputValue(),runtime.capabilities.minimax_h3_ref9.inputs.find(s=>s.key==='sampling_mode').default);
      await mode.selectOption('quality');
      const durationRow=page.locator('#respop .row').filter({hasText:'时长(秒)'});
      await durationRow.locator('input[type=number]').fill('10');
      assert.equal(await durationRow.locator('.paramwarn').isVisible(),true);
      await page.locator('#respop .row').filter({has:page.getByText('种子',{exact:true})}).locator('input[type=number]').fill('123');
      const payload=await page.evaluate(()=>payloadOf(PROJ.cards[0]));
      assert.equal(payload.params.seed,123);
      assert.equal(payload.params.sampling_mode,'quality');
      assert.equal(payload.params.steps,20);
      assert.equal(payload.params.strength_model,0);
      assert.equal(payload.params.processing_control_value,0);
      assert.equal(payload.params.duration,10);
      assert.equal(Object.hasOwn(payload.params,'image_ratio'),false);
      assert.equal(Object.hasOwn(payload.params,'image_clarity'),false);
    });
    await t.test('H3 image-to-video and first-last-frame popovers expose 768p shortcuts',async()=>{
      for(const cap of ['minimax_h3_i2v','minimax_h3_flf2v']) {
        await reset(cap,'card_video');await paramsButton.click();
        const input=page.locator('#respop .cpick input[type=number]');
        const before=await page.locator('#respop').boundingBox();
        assert.deepEqual(await page.locator('#respop .cgrid.k button').allTextContents(),['480p','544p','640p','768p'],cap);
        for(const [label,length] of [['480p',832],['544p',960],['640p',1152],['768p',1344]]) {
          await page.locator('#respop .cgrid.k').getByRole('button',{name:label,exact:true}).click();
          assert.equal(await input.inputValue(),String(length),cap);
          assert.equal(await page.evaluate(()=>payloadOf(PROJ.cards[0]).params.scale_to_length),length,cap);
          assert.equal(await page.locator('#respop .cgrid.k button.on').innerText(),label,cap);
          assert.equal(await page.locator('#respop').isVisible(),true);
        }
        const after=await page.locator('#respop').boundingBox();
        assert.equal(after.x,before.x);assert.equal(after.y,before.y);
        assert.match(await page.locator('#respop .cpick').innerText(),/16:9.*素材比例/s);
        await input.fill('1024');
        assert.equal(await page.evaluate(()=>payloadOf(PROJ.cards[0]).params.scale_to_length),1024);
        assert.equal(await page.locator('#respop .cgrid.k button.on').count(),0);
      }
    });

    await t.test('H3 character transfer uses video clarity presets and 768p stays 32-aligned across ratios',async()=>{
      const cap=runtime.capabilities.minimax_h3_character_transfer;
      await reset(cap.id,'card_video');await paramsButton.click();
      assert.deepEqual(await page.locator('#respop .cgrid.k button').allTextContents(),['480p','544p','640p','768p']);
      assert.deepEqual(await page.evaluate(()=>{const p=payloadOf(PROJ.cards[0]).params;return [p.width,p.height];}),[352,640]);
      for(const ratio of RATIOS) {
        await page.locator(`#respop button[title^="画面比例 ${ratio}"]`).click();
        const button=page.locator('#respop .cgrid.k').getByRole('button',{name:'768p',exact:true});
        await button.click();
        const payload=await page.evaluate(()=>payloadOf(PROJ.cards[0]));
        const {width,height}=payload.params;
        assert.equal(Math.min(width,height),768,ratio);
        assert.equal(width%32,0);assert.equal(height%32,0);
        assert.ok(width<=cap.inputs.find(s=>s.key==='width').max,ratio);
        assert.ok(height<=cap.inputs.find(s=>s.key==='height').max,ratio);
        assert.equal(await button.getAttribute('title'),`${width} × ${height}`);
        assert.equal(await page.locator('#respop .cgrid.k button.on').innerText(),'768p');
        assert.match(await paramsButton.innerText(),/768p/);
        assert.equal(Object.hasOwn(payload.params,'megapixels'),false);
      }
      await page.locator('#respop button[title^="画面比例 16:9"]').click();
      assert.deepEqual(await page.evaluate(()=>{const p=payloadOf(PROJ.cards[0]).params;return [p.width,p.height];}),[1376,768]);
    });

    await t.test('every H3 megapixel mode offers effective 768p at all workflow ratios including 21:9',async()=>{
      const modes=Object.values(runtime.capabilities).filter(cap=>cap.id.startsWith('minimax_h3_') && cap.inputs.some(s=>s.key==='megapixels'));
      assert.equal(modes.length,7);
      for(const cap of modes) {
        await reset(cap.id,'card_video');await paramsButton.click();
        const spec=cap.inputs.find(s=>s.key==='megapixels');
        for(const ratio of cap.inputs.find(s=>s.key==='aspect_ratio').options) {
          const label=ratio.split(' ')[0];
          await page.locator(`#respop button[title^="画面比例 ${label}"]`).click();
          const button=page.locator('#respop .cgrid.k').getByRole('button',{name:'768p',exact:true});
          assert.equal(await button.count(),1,cap.id+' '+ratio);
          assert.equal(await button.isEnabled(),true);
          await button.click();
          const payload=await page.evaluate(()=>payloadOf(PROJ.cards[0]));
          assert.equal(payload.params.aspect_ratio,ratio);
          assert.ok(payload.params.megapixels<=spec.max,cap.id);
          const dimensions=await page.evaluate(()=>resFromMP(PROJ.cards[0].params.aspect_ratio,PROJ.cards[0].params.megapixels));
          assert.equal(Math.min(...dimensions),768,cap.id+' '+ratio);
          assert.ok(dimensions.every(value=>value%32===0));
          assert.equal(await button.getAttribute('title'),dimensions.join('×'));
          assert.equal(await page.locator('#respop .cgrid.k button.on').innerText(),'768p');
          assert.match(await paramsButton.innerText(),/768p/);
        }
      }
    });
    const videoRow=label=>page.locator('#respop .pwrap .row').filter({has:page.getByText(label,{exact:true})});
    await t.test('video references auto-select existing ratio and duration controls without a follow switch',async()=>{
      for(const cap of ['minimax_h3_ref9','minimax_h3_ref_2pass','minimax_h3_fusion_v2','minimax_h3_character_transfer']) {
        await reset(cap,'card_video');await paramsButton.click();
        assert.equal(await page.getByRole('switch',{name:'跟随参考视频比例和时长',exact:true}).count(),0,cap);
        assert.equal(await page.locator('#respop .cgrid:not(.k)').count(),1,cap);
        await page.evaluate(()=>{
          const c=PROJ.cards[0];c.params.duration=9;c.params.preview_seconds=5;
          c.params.aspect_ratio='16:9 (Widescreen)';
          putAsset(c,{key:'video[0]'},{kind:'video',ref:'chouka/wide.mp4',url:'/wide.mp4',width:1946,height:834,duration:4.1});openPanel(c.id);
        });
        await page.waitForFunction(()=>PROJ.cards[0].params._reference_video);
        assert.equal(await page.locator('#respop .cgrid:not(.k) button.on span').innerText(),'21:9',cap);
        const duration=videoRow(cap==='minimax_h3_character_transfer'?'单段时长(秒)':'时长(秒)');
        assert.equal(await duration.locator('input[type=number]').inputValue(),cap==='minimax_h3_character_transfer'?'9':'4');
        if(cap!=='minimax_h3_character_transfer') {
          assert.equal(await duration.locator('input[type=range]').inputValue(),'4');
          assert.equal(await duration.locator('input[type=number]').evaluate(e=>e.validity.valid),true);
        } else assert.equal(await videoRow('仅测试前几秒').locator('input[type=number]').inputValue(),'0');
        if(process.env.CHOUKA_TEST_SCREENSHOT && cap==='minimax_h3_ref9') await page.screenshot({path:process.env.CHOUKA_TEST_SCREENSHOT});
        const payload=await page.evaluate(()=>payloadOf(PROJ.cards[0]));
        assert.equal('follow_reference_video' in payload.params,false);
        assert.equal(payload.params.duration,cap==='minimax_h3_character_transfer'?9:4);
        await page.locator('#respop button[title^="画面比例 16:9"]').click();
        await duration.locator('input[type=number]').fill('8');
        await page.evaluate(()=>openPanel(PROJ.cards[0].id));
        assert.equal(await page.locator('#respop .cgrid:not(.k) button.on span').innerText(),'16:9');
        assert.equal(await duration.locator('input[type=number]').inputValue(),'8');
        assert.equal(await page.evaluate(()=>payloadOf(PROJ.cards[0]).params.duration),8);
        await page.locator('#respop .cgrid.k').getByRole('button',{name:'768p',exact:true}).click();
        const bounds=await page.locator('#respop').boundingBox();
        assert.ok(bounds.y>=8 && bounds.y+bounds.height<=1100-8,'controls stay in viewport');
        await page.evaluate(()=>{const c=PROJ.cards[0];delete c.assets['video[0]'];openPanel(c.id);});
        assert.equal(await page.evaluate(()=>payloadOf(PROJ.cards[0]).params.duration),8,'removing reference keeps edited values');
      }
    });
    await t.test('linked videos fill parameters once and submit rounded integer duration without clamping',async()=>{
      await reset('minimax_h3_fusion_v2','card_video');
      const start=mediaRequests.length;
      await page.evaluate(async()=>{
        const c=PROJ.cards[0];
        const upstream={id:'source',type:'card_asset',params:{},assets:{},outputs:[{kind:'video',ref:'chouka/custom.mp4',url:'/custom.mp4'}]};
        PROJ.cards.push(upstream);await linkTo(upstream,c);await syncReferenceParameters(c);
      });
      await paramsButton.click();
      assert.equal(await page.locator('#respop .cgrid:not(.k) button.on span').innerText(),'4:3','nearest existing workflow preset');
      const duration=videoRow('时长(秒)');
      assert.equal(await duration.locator('input[type=number]').inputValue(),'19');
      assert.equal(await duration.locator('input[type=range]').inputValue(),'19');
      assert.equal(await duration.locator('input[type=number]').evaluate(e=>e.validity.valid),true);
      assert.equal(mediaRequests.length-start,1,'link, panel and popup share one metadata request');
      await page.evaluate(()=>runCard(PROJ.cards[0]));
      assert.equal(submissions.at(-1).params.duration,19);
      assert.equal(submissions.at(-1).params.aspect_ratio,'4:3 (Standard)');
      assert.equal('follow_reference_video' in submissions.at(-1).params,false);
      assert.equal(submissions.at(-1).assets['video[0]'],'chouka/custom.mp4');
      assert.equal(mediaRequests.length-start,1);
    });
    await t.test('file upload selects 21:9 and source seconds in the original controls',async()=>{
      await reset('minimax_h3_ref9','card_video');
      const chooser=page.waitForEvent('filechooser');
      await page.evaluate(()=>pickFile(PROJ.cards[0],CAPS[PROJ.cards[0].cap].inputs.find(s=>s.type==='video')));
      await (await chooser).setFiles({name:'wide.mp4',mimeType:'video/mp4',buffer:Buffer.from('offline upload fixture')});
      await page.waitForFunction(()=>PROJ.cards[0].params.duration===4);
      await paramsButton.click();
      assert.equal(await page.locator('#respop .cgrid:not(.k) button.on span').innerText(),'21:9');
      assert.equal(await videoRow('时长(秒)').locator('input[type=number]').inputValue(),'4');
      assert.equal(await page.getByRole('switch',{name:'跟随参考视频比例和时长',exact:true}).count(),0);
      await page.locator('#respop button[title^="画面比例 16:9"]').click();
      await videoRow('时长(秒)').locator('input[type=number]').fill('8.5');
      await page.evaluate(()=>runCard(PROJ.cards[0]));
      assert.equal(submissions.at(-1).params.duration,8.5,'submission retains the manual edit');
      assert.equal(submissions.at(-1).params.aspect_ratio,'16:9 (Widescreen)');
    });
    await t.test('late metadata cannot overwrite a replacement video and metadata failure can be retried',async()=>{
      await reset('minimax_h3_ref9','card_video');delayedMedia=null;
      await page.evaluate(()=>{const c=PROJ.cards[0];putAsset(c,{key:'video[0]'},{kind:'video',ref:'chouka/delayed.mp4',url:'/delayed.mp4'});openPanel(c.id);});
      await paramsButton.click();
      await delayedReady;
      assert.equal(typeof delayedMedia,'function');
      await page.evaluate(()=>{const c=PROJ.cards[0];putAsset(c,{key:'video[0]'},{kind:'video',ref:'chouka/portrait.mp4',url:'/portrait.mp4',width:720,height:1280,duration:7.375});openPanel(c.id);});
      delayedMedia();
      await page.waitForFunction(()=>PROJ.cards[0].assets['video[0]'].duration===7.375);
      assert.equal(await page.locator('#respop .cgrid:not(.k) button.on span').innerText(),'9:16');
      assert.equal(await videoRow('时长(秒)').locator('input[type=number]').inputValue(),'7');
      assert.equal(await page.evaluate(()=>payloadOf(PROJ.cards[0]).params.duration),7);
      await page.evaluate(()=>{const c=PROJ.cards[0];putAsset(c,{key:'video[0]'},{kind:'video',ref:'chouka/missing.mp4',url:'/missing.mp4'});openPanel(c.id);});
      await page.getByRole('button',{name:'重新读取',exact:true}).waitFor();
      assert.match(await page.locator('#respop [role=status]').innerText(),/无法读取参考视频/);
      metadata.set('chouka/missing.mp4',{width:960,height:640,duration:6.5});
      await page.getByRole('button',{name:'重新读取',exact:true}).click();
      await page.waitForFunction(()=>PROJ.cards[0].assets['video[0]'].duration===6.5);
      assert.equal(await page.locator('#respop .cgrid:not(.k) button.on span').innerText(),'3:2');
      assert.equal(await videoRow('时长(秒)').locator('input[type=number]').inputValue(),'7');
      assert.equal(await page.getByRole('button',{name:'重新读取',exact:true}).count(),0);
    });
    await t.test('manual edits made during metadata loading are not overwritten',async()=>{
      await reset('minimax_h3_ref9','card_video');
      let release, report;
      const ready=new Promise(resolve=>{report=resolve;});
      const gate=new Promise(resolve=>{release=resolve;});
      await page.route('**/api/media?ref=chouka%2Fmanual-pending.mp4&*',async route=>{
        report();await gate;await route.fulfill({json:{width:720,height:1280,duration:7.375}});
      });
      try {
        await page.evaluate(()=>{const c=PROJ.cards[0];putAsset(c,{key:'video[0]'},{kind:'video',ref:'chouka/manual-pending.mp4',url:'/pending.mp4'});});
        await ready;await paramsButton.click();
        await page.locator('#respop button[title^="画面比例 1:1"]').click();
        await videoRow('时长(秒)').locator('input[type=number]').fill('9');
        release();
        await page.waitForFunction(()=>PROJ.cards[0].params._reference_video);
        assert.equal(await page.locator('#respop .cgrid:not(.k) button.on span').innerText(),'1:1');
        assert.equal(await videoRow('时长(秒)').locator('input[type=number]').inputValue(),'9');
      } finally {release();await page.unroute('**/api/media?ref=chouka%2Fmanual-pending.mp4&*');}
    });
    await t.test('upstream replacement fills parameters even when the video card is not selected',async()=>{
      await reset('minimax_h3_fusion_v2','card_video');
      await page.evaluate(async()=>{
        const c=PROJ.cards[0];
        const source={id:'source',type:'card_asset',x:800,y:100,params:{},assets:{},outputs:[{kind:'video',ref:'chouka/wide.mp4',url:'/wide.mp4',width:1946,height:834,duration:4.1}]};
        PROJ.cards.push(source);await linkTo(source,c);await syncReferenceParameters(c);
        pick(source.id);
        await setAssetItem(source,{kind:'video',ref:'chouka/portrait.mp4',url:'/portrait.mp4',width:720,height:1280,duration:7.375},false);
        await syncReferenceParameters(c);
      });
      assert.equal(await page.evaluate(()=>PROJ.cards[0].params.aspect_ratio),'9:16 (Portrait Widescreen)');
      assert.equal(await page.evaluate(()=>PROJ.cards[0].params.duration),7);
      await page.evaluate(()=>pick(PROJ.cards[0].id));await paramsButton.click();
      assert.equal(await page.locator('#respop .cgrid:not(.k) button.on span').innerText(),'9:16');
    });
    await t.test('automatic defaults and later manual edits persist across save and reload',async()=>{
      project.locked=false;
      await reset('minimax_h3_fusion_v2','card_video');persistProject=true;
      try {
        await page.evaluate(async()=>{
          const c=PROJ.cards[0];c.params={follow_reference_video:'off'};
          putAsset(c,{key:'video[0]'},{kind:'video',ref:'chouka/wide.mp4',url:'/wide.mp4',width:1946,height:834,duration:4.1});
          await syncReferenceParameters(c);await enqueueSave(PROJ.id);
        });
        await page.reload();await page.waitForFunction(()=>PROJ?.cards[0]?._el);
        await page.evaluate(()=>pick(PROJ.cards[0].id));await paramsButton.click();
        assert.equal(await page.locator('#respop .cgrid:not(.k) button.on span').innerText(),'21:9');
        assert.equal(await videoRow('时长(秒)').locator('input[type=number]').inputValue(),'4');
        await page.locator('#respop button[title^="画面比例 16:9"]').click();
        await videoRow('时长(秒)').locator('input[type=number]').fill('11');
        await page.evaluate(()=>enqueueSave(PROJ.id));
        await page.reload();await page.waitForFunction(()=>PROJ?.cards[0]?._el);
        await page.evaluate(()=>pick(PROJ.cards[0].id));await paramsButton.click();
        assert.equal(await page.locator('#respop .cgrid:not(.k) button.on span').innerText(),'16:9');
        assert.equal(await videoRow('时长(秒)').locator('input[type=number]').inputValue(),'11');
        assert.equal(await page.getByRole('switch',{name:'跟随参考视频比例和时长',exact:true}).count(),0);
        const payload=await page.evaluate(()=>payloadOf(PROJ.cards[0]));
        assert.equal(payload.params.duration,11);
        assert.equal(payload.params.aspect_ratio,'16:9 (Widescreen)');
        assert.equal('follow_reference_video' in payload.params,false,'obsolete saved switch has no effect');
      } finally {persistProject=false;project.locked=true;}
    });
    assert.deepEqual(errors,[]);
  } finally {
    if(browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
  }
});
