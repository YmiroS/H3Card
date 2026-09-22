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

test('all image models share real runtime controls without changing video parameters', async t => {
  const project = {id:'controls-test', name:'基础参数测试', permission:'operate', locked:true,
    edges:[], groups:[], view:{x:100,y:70,k:1},
    cards:[{id:'card',type:'card_image',cap:'zimage_t2i',x:100,y:20,params:{},assets:{},outputs:[]}]};
  const json = (res, data) => {res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
  const server = createServer((req,res) => {
    const pathname = new URL(req.url,'http://localhost').pathname;
    if (pathname === '/api/auth/me') return json(res,{user:{id:'admin',username:'admin',role:'admin'},csrf_token:'test'});
    if (pathname === '/api/cards') return json(res,{...runtime,comfy_online:true});
    if (pathname === '/api/health') return json(res,{comfy_online:true});
    if (pathname === '/api/jobs') return json(res,{jobs:[]});
    if (pathname === '/api/projects') return json(res,{projects:[{...project,cards:1}]});
    if (pathname === '/api/projects/controls-test') return json(res,project);
    const files = {'/':'index.html','/app.js':'app.js','/auth.js':'auth.js','/style.css':'style.css','/icon.png':'icon.png','/favicon.png':'favicon.png'};
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
        assert.equal(await result.getAttribute('src'),png+'#result',cap);
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

    await t.test('H3 video clarity and random-seed behavior are unchanged',async()=>{
      await reset('minimax_h3_ref9','card_video');await paramsButton.click();
      assert.deepEqual(await page.locator('#respop .cgrid.k button').allTextContents(),['480p','544p','640p','768p']);
      assert.equal(await page.locator('#respop .image-basic').count(),0);
      const payload=await page.evaluate(()=>{PROJ.cards[0].params.seed=123;return payloadOf(PROJ.cards[0]);});
      assert.equal(payload.params.seed,-1);
      assert.equal(Object.hasOwn(payload.params,'image_ratio'),false);
      assert.equal(Object.hasOwn(payload.params,'image_clarity'),false);
    });
    assert.deepEqual(errors,[]);
  } finally {
    if(browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
  }
});
