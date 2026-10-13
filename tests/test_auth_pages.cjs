// 使用真实页面与 auth.js；可通过 CHOUKA_TEST_BROWSER=chrome 指定浏览器渠道。
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {createServer} = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');

const web = path.join(__dirname, '..', 'web');
const browserOptions = process.env.CHOUKA_TEST_BROWSER ? {channel:process.env.CHOUKA_TEST_BROWSER} : {};
const staticFiles = new Map([
  ['/login', ['login.html', 'text/html; charset=utf-8']],
  ['/auth.js', ['auth.js', 'text/javascript; charset=utf-8']],
  ['/auth-page.css', ['auth-page.css', 'text/css; charset=utf-8']],
  ['/auth-art.webp', ['auth-art.webp', 'image/webp']],
  ['/auth-logo.png', ['auth-logo.png', 'image/png']],
  ['/favicon.png?v=ck05', ['favicon.png', 'image/png']],
]);
const apiMethods = new Map([
  ['/api/auth/me', 'GET'], ['/api/auth/login', 'POST'], ['/api/auth/register', 'POST'],
]);
const session = {user:{id:'fixture-user', username:'fixture-account', role:'user'}, csrf_token:'fixture-csrf'};
const registration = {username:'fixture-account', display_name:'测试花名', password:'月光落在山间2026'};
const unauthorized = {status:401, body:{error:'请先登录'}};
const loginSubmit = '#login button[type="submit"]';
const registerSubmit = '#register button[type="submit"]';
const field = (form, name) => `#${form} input[name="${name}"]`;
const posts = fixture => fixture.requests.filter(request => request.method === 'POST');

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {promise, resolve, async wait() {
    let timer;
    try {
      return await Promise.race([promise, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('等待本地 API 请求超时')), 8000);
      })]);
    } finally {
      clearTimeout(timer);
    }
  }};
}

// 所有 HTTP 路由均为明确白名单，根地址只是跳转落点，不加载生产应用或后端。
async function withFixture(options, run) {
  const requests = [], unexpectedRequests = [], serverErrors = [], expectedFailures = [];
  const pageErrors = [], consoleErrors = [], dialogs = [], externalRequests = [];
  const pendingResponses = new Set();
  const handlers = {
    '/api/auth/me': () => unauthorized,
    '/api/auth/login': () => ({status:200, body:session}),
    '/api/auth/register': request => ({status:201, body:{
      username:request.body.username, display_name:request.body.display_name, status:'pending',
    }}),
    ...options.handlers,
  };
  const server = createServer((req, res) => {
    pendingResponses.add(res);
    res.on('close', () => pendingResponses.delete(res));
    void (async () => {
      if (apiMethods.has(req.url) && apiMethods.get(req.url) === req.method) {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const raw = Buffer.concat(chunks).toString();
        const request = {url:req.url, method:req.method, body:raw ? JSON.parse(raw) : null, headers:req.headers};
        requests.push(request);
        const reply = await handlers[req.url](request);
        if (reply.wait) {
          // 连接关闭也释放等待，失败路径不会留下悬挂的服务器处理器。
          await new Promise(resolve => {
            const closed = () => resolve();
            res.once('close', closed);
            reply.wait.then(() => { res.off('close', closed); resolve(); });
          });
        }
        if (res.destroyed) return;
        if (reply.networkError) {
          expectedFailures.push({url:req.url, network:true});
          // 先发送部分响应再断开，避免 Chromium 对空响应自动重试 POST。
          res.writeHead(200, {'Content-Type':'application/json', 'Content-Length':'1024'});
          res.write('{"', () => res.destroy());
          return;
        }
        const status = reply.status ?? 200;
        if (status >= 400) expectedFailures.push({url:req.url, status});
        res.writeHead(status, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'});
        res.end(JSON.stringify(reply.body ?? {}));
        return;
      }
      if (req.method === 'GET' && staticFiles.has(req.url)) {
        const [file, type] = staticFiles.get(req.url);
        res.writeHead(200, {'Content-Type':type, 'Cache-Control':'no-store'});
        res.end(readFileSync(path.join(web, file)));
        return;
      }
      if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
        res.end('<!doctype html><meta charset="utf-8"><link rel="icon" href="/auth-logo.png"><h1 id="fixture-home">本地登录成功落点</h1>');
        return;
      }
      unexpectedRequests.push(`${req.method} ${req.url}`);
      res.writeHead(404);
      res.end('测试夹具未允许此路径');
    })().catch(error => {
      serverErrors.push(error.message);
      res.destroy();
    });
  });
  let browser;
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch(browserOptions);
    const context = await browser.newContext({
      viewport:options.viewport ?? {width:1440, height:900},
      reducedMotion:'reduce', serviceWorkers:'block',
    });
    // 即使页面误加了外部资源，也只记录并阻断，绝不访问生产环境。
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      externalRequests.push(route.request().url());
      return route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    page.setDefaultNavigationTimeout(10000);
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push({text:message.text(), url:message.location().url});
    });
    page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
    const fixture = {page, origin, requests, handlers};
    await page.goto(`${origin}/login`);
    await run(fixture);
    assert.deepEqual(pageErrors, [], '页面不得产生未捕获异常');
    assert.deepEqual(dialogs, [], '页面不得触发脚本弹窗');
    assert.deepEqual(serverErrors, [], '测试服务器不得发生错误');
    assert.deepEqual(unexpectedRequests, [], '只允许明确列出的本地资源和 API');
    assert.deepEqual(externalRequests, [], '页面不得请求外部资源');
    // Chromium 会把刻意注入的 HTTP/断网夹具记为资源错误；只豁免对应地址与错误码。
    const unexpectedConsole = consoleErrors.filter(error => !expectedFailures.some(expected =>
      error.url === origin + expected.url && (expected.network
        ? /^Failed to load resource: net::ERR_CONTENT_LENGTH_MISMATCH$/.test(error.text)
        : error.text === `Failed to load resource: the server responded with a status of ${expected.status} (${require('node:http').STATUS_CODES[expected.status]})`)));
    assert.deepEqual(unexpectedConsole, [], '除预期 API 失败外，Console 不得有错误');
  } finally {
    try {
      if (browser) await browser.close();
    } finally {
      for (const response of pendingResponses) response.destroy();
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  }
}

async function ready(page) {
  await page.waitForFunction(() => !document.querySelector('#login button[type="submit"]').disabled);
}

async function openRegister(page) {
  await ready(page);
  await page.locator('#to-register').click();
  await page.locator('#register-panel').waitFor({state:'visible'});
}

async function fillRegistration(page, overrides = {}) {
  const values = {...registration, confirm_password:registration.password, ...overrides};
  for (const [name, value] of Object.entries(values)) await page.locator(field('register', name)).fill(value);
  return values;
}

async function expectValues(page, form, values) {
  for (const [name, value] of Object.entries(values)) assert.equal(await page.locator(field(form, name)).inputValue(), value, `${form}.${name} 应保留输入`);
}

async function expectError(page, selector, text) {
  await page.waitForFunction(({selector, text}) => document.querySelector(selector).textContent.includes(text), {selector, text});
  assert.equal(await page.locator(selector).isVisible(), true);
  assert.equal(await page.locator(selector).getAttribute('role'), 'alert');
}

async function expectPasswordsEmpty(page) {
  assert.deepEqual(await page.locator('input[type="password"]').evaluateAll(inputs => inputs.map(input => input.value)), ['', '', '']);
}

async function expectHome(fixture) {
  await fixture.page.waitForURL(`${fixture.origin}/`);
  await fixture.page.locator('#fixture-home').waitFor();
}

async function expectEnabled(page) {
  assert.equal(await page.locator('.auth-form input:disabled, .auth-form button:disabled').count(), 0);
}

// 不用固定 sleep；两帧后检查未发请求，事件处理器已完成同步校验。
async function settleUI(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test('初始 me 检查期间禁止提交，401 后正常开放两表单', async () => {
  const gate = deferred();
  await withFixture({handlers:{'/api/auth/me': () => ({...unauthorized, wait:gate.promise})}}, async fixture => {
    const {page} = fixture;
    assert.equal(await page.locator(loginSubmit).isDisabled(), true);
    assert.equal(await page.locator(registerSubmit).isDisabled(), true);
    assert.equal(await page.locator('#login-panel').isVisible(), true);
    assert.equal(await page.locator('#register-panel').isHidden(), true);
    assert.equal(await page.locator('dialog').count(), 0);
    await page.locator(field('login', 'username')).fill('fixture-account');
    await page.locator(field('login', 'password')).fill('检查期间不应提交');
    await page.locator(field('login', 'password')).press('Enter');
    await settleUI(page);
    assert.deepEqual(posts(fixture), []);
    gate.resolve();
    await ready(page);
    await expectEnabled(page);
    assert.equal(await page.locator('#error').textContent(), '');
    assert.equal(await page.locator('#register-error').textContent(), '');
    assert.equal(page.url(), `${fixture.origin}/login`);
    assert.equal(await page.evaluate(() => typeof H3Auth.login), 'function');
  });
});

test('已登录 me 成功后重定向根地址且不发送登录或注册请求', async () => {
  await withFixture({handlers:{'/api/auth/me': () => ({body:session})}}, async fixture => {
    await expectHome(fixture);
    assert.equal(fixture.requests.filter(request => request.url === '/api/auth/me').length, 1);
    assert.deepEqual(posts(fixture), []);
  });
});

test('me 500 显示友好提示并允许直接重试登录', async () => {
  await withFixture({handlers:{'/api/auth/me': () => ({status:500, body:{error:'内部堆栈不得显示'}})}}, async fixture => {
    const {page} = fixture;
    await ready(page);
    await expectEnabled(page);
    await expectError(page, '#error', '暂时无法检查登录状态');
    assert.doesNotMatch(await page.locator('#error').innerText(), /内部堆栈/);
    await page.locator(field('login', 'username')).fill('fixture-account');
    await page.locator(field('login', 'password')).fill(registration.password);
    await page.locator(loginSubmit).click();
    await expectHome(fixture);
    assert.equal(posts(fixture).length, 1);
  });
});

test('键盘切换正确移动焦点、跳过隐藏表单，返回清空两边密码但保留账号', async () => {
  await withFixture({}, async ({page}) => {
    await ready(page);
    await page.locator(field('login', 'username')).fill('原登录账号');
    await page.locator(field('login', 'password')).fill('原登录密码2026');
    await page.locator('#to-register').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'register-heading');
    assert.equal(await page.title(), '注册账号 · 抽卡系统');
    await expectPasswordsEmpty(page);
    const values = await fillRegistration(page);
    await page.locator('#register-heading').focus();
    for (const selector of [field('register', 'username'), field('register', 'display_name'), field('register', 'password'), field('register', 'confirm_password'), registerSubmit, '#to-login']) {
      await page.keyboard.press('Tab');
      assert.equal(await page.locator(selector).evaluate(node => node === document.activeElement), true, `Tab 应到达 ${selector}`);
    }
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'login-heading');
    assert.equal(await page.title(), '登录 · 抽卡系统');
    assert.equal(await page.locator('#register-panel').isHidden(), true);
    await expectPasswordsEmpty(page);
    await expectValues(page, 'login', {username:'原登录账号'});
    await expectValues(page, 'register', {username:values.username, display_name:values.display_name});
    for (const selector of [field('login', 'username'), field('login', 'password'), loginSubmit, '#to-register']) {
      await page.keyboard.press('Tab');
      assert.equal(await page.locator(selector).evaluate(node => node === document.activeElement), true, `Tab 应到达 ${selector}`);
    }
    await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'register-heading');
  });
});

test('两次密码不一致不发请求，修正后清除校验状态', async () => {
  await withFixture({}, async fixture => {
    const {page} = fixture;
    await openRegister(page);
    const values = await fillRegistration(page, {confirm_password:'另一段不同密码2026'});
    await page.locator(registerSubmit).click();
    await expectError(page, '#register-error', '两次输入的密码不一致');
    const confirmation = page.locator(field('register', 'confirm_password'));
    assert.equal(await confirmation.getAttribute('aria-invalid'), 'true');
    assert.equal(await confirmation.evaluate(node => node === document.activeElement), true);
    await expectValues(page, 'register', values);
    assert.deepEqual(posts(fixture), []);
    await confirmation.fill(values.password);
    assert.equal(await confirmation.getAttribute('aria-invalid'), null);
    assert.equal(await page.locator('#register-error').textContent(), '');
  });
});

test('注册密码和确认密码均受浏览器最少 8 位约束，8 位可提交', async () => {
  await withFixture({}, async fixture => {
    const {page} = fixture;
    await openRegister(page);
    await fillRegistration(page, {password:'山间月光abc', confirm_password:'山间月光abc'});
    for (const name of ['password', 'confirm_password']) {
      const input = page.locator(field('register', name));
      assert.equal(await input.getAttribute('minlength'), '8');
      assert.equal(await input.evaluate(node => node.validity.tooShort), true);
    }
    await page.locator(registerSubmit).click();
    await settleUI(page);
    assert.deepEqual(posts(fixture), []);
    assert.equal(await page.locator('#register').evaluate(form => form.checkValidity()), false);
    await page.locator(field('register', 'password')).fill('山间月光abcd');
    await page.locator(registerSubmit).click();
    await settleUI(page);
    assert.deepEqual(posts(fixture), [], '确认密码不足 8 位也不能发请求');
    await page.locator(field('register', 'confirm_password')).fill('山间月光abcd');
    assert.equal(await page.locator('#register').evaluate(form => form.checkValidity()), true);
    await page.locator(registerSubmit).click();
    await page.locator('#register-done').waitFor();
    assert.equal(posts(fixture).length, 1);
    assert.equal(posts(fixture)[0].body.password, '山间月光abcd');
  });
});

test('注册 API 弱密码、409 重复和 429 限流错误可见且保留全部输入', async () => {
  await withFixture({}, async fixture => {
    const {page, handlers} = fixture;
    await openRegister(page);
    const values = await fillRegistration(page, {password:'12345678', confirm_password:'12345678'});
    const failures = [
      {status:400, message:'请勿使用 12345678 等常见弱密码'},
      {status:409, message:'该账号已存在或已提交注册申请'},
      {status:429, message:'注册请求过于频繁，请稍后再试'},
    ];
    for (const [index, failure] of failures.entries()) {
      handlers['/api/auth/register'] = () => ({status:failure.status, body:{error:{message:failure.message}}});
      await page.locator(registerSubmit).click();
      await expectError(page, '#register-error', failure.message);
      await expectEnabled(page);
      await expectValues(page, 'register', values);
      assert.equal(await page.locator('#register-error').evaluate(node => node === document.activeElement), true);
      assert.equal(posts(fixture).length, index + 1);
      assert.equal(await page.locator('#register-panel').isVisible(), true);
    }
  });
});

test('注册网络失败显示友好提示、保留输入并可成功重试', async () => {
  await withFixture({handlers:{'/api/auth/register': () => ({networkError:true})}}, async fixture => {
    const {page, handlers} = fixture;
    await openRegister(page);
    const values = await fillRegistration(page);
    await page.locator(registerSubmit).click();
    await expectError(page, '#register-error', '网络连接异常');
    await expectValues(page, 'register', values);
    await expectEnabled(page);
    handlers['/api/auth/register'] = () => ({status:201, body:registration});
    await page.locator(registerSubmit).click();
    await page.locator('#register-done').waitFor();
    assert.equal(posts(fixture).length, 2);
    await expectPasswordsEmpty(page);
  });
});

test('注册提交仅发一次请求，全部控件和返回按钮禁用以防迟到响应', async () => {
  const gate = deferred(), received = deferred();
  await withFixture({handlers:{'/api/auth/register': request => {
    received.resolve(request);
    return {status:201, body:registration, wait:gate.promise};
  }}}, async fixture => {
    const {page} = fixture;
    await openRegister(page);
    await fillRegistration(page);
    await page.locator(registerSubmit).click();
    await received.wait();
    assert.equal(await page.locator('#register').getAttribute('aria-busy'), 'true');
    assert.equal(await page.locator('.auth-form input:not(:disabled), .auth-form button:not(:disabled)').count(), 0);
    assert.match(await page.locator(registerSubmit).textContent(), /正在提交/);
    // disabled 阻止正常点击；额外派发事件验证 submitting 锁，而非仅依赖视觉禁用。
    await page.evaluate(() => {
      for (let i = 0; i < 3; i++) document.querySelector('#register').dispatchEvent(new Event('submit', {bubbles:true, cancelable:true}));
      document.querySelector('#to-login').dispatchEvent(new MouseEvent('click', {bubbles:true}));
    });
    await page.keyboard.press('Enter');
    await settleUI(page);
    assert.equal(posts(fixture).length, 1);
    assert.equal(await page.locator('#register-panel').isVisible(), true);
    assert.equal(await page.locator('#login-panel').isHidden(), true);
    gate.resolve();
    await page.locator('#register-done').waitFor();
    assert.equal(await page.locator('#register').getAttribute('aria-busy'), 'false');
    await expectEnabled(page);
    assert.equal(posts(fixture).length, 1);
  });
});

test('注册成功回登录预填账号、提示待审批、清空密码，display_name 只作为文本', async () => {
  const displayName = '<img src=x onerror="window.authXss=1">花名';
  await withFixture({handlers:{'/api/auth/register': () => ({status:201, body:{
    username:'server-normalized-account', display_name:displayName, status:'pending',
  }})}}, async fixture => {
    const {page} = fixture;
    await openRegister(page);
    await fillRegistration(page, {display_name:displayName});
    await page.locator(registerSubmit).click();
    const notice = page.locator('#register-done');
    await notice.waitFor();
    assert.equal(await notice.getAttribute('role'), 'status');
    assert.match(await notice.innerText(), /注册申请已提交.*等待审批通过后即可登录/);
    assert.ok((await notice.innerText()).includes(displayName));
    assert.equal(await notice.locator('*').count(), 0, '花名不能被解析为 HTML');
    assert.equal(await page.evaluate(() => window.authXss), undefined);
    assert.equal(await notice.evaluate(node => node === document.activeElement), true);
    assert.equal(await page.locator('#login-panel').isVisible(), true);
    assert.equal(await page.locator('#register-panel').isHidden(), true);
    await expectValues(page, 'login', {username:'server-normalized-account'});
    await expectValues(page, 'register', {username:'', display_name:''});
    await expectPasswordsEmpty(page);
    assert.deepEqual(posts(fixture).map(request => request.body), [{...registration, display_name:displayName}]);
    assert.equal(page.url(), `${fixture.origin}/login`, '待审批不能自动登录');
    assert.equal(await page.evaluate(() => H3Auth.active), false);
  });
});

test('登录原样发送含首尾空格的密码，提交期间禁用控件并成功跳转', async () => {
  const gate = deferred(), received = deferred();
  await withFixture({handlers:{'/api/auth/login': request => {
    received.resolve(request);
    return {body:session, wait:gate.promise};
  }}}, async fixture => {
    const {page} = fixture;
    const values = {username:'fixture-account', password:'  原始密码 Abc 2026  '};
    await ready(page);
    for (const [name, value] of Object.entries(values)) await page.locator(field('login', name)).fill(value);
    await page.locator(loginSubmit).click();
    const request = await received.wait();
    assert.deepEqual(request.body, values);
    assert.match(request.headers['content-type'], /application\/json/);
    assert.equal(await page.locator('#login').getAttribute('aria-busy'), 'true');
    assert.equal(await page.locator('.auth-form input:not(:disabled), .auth-form button:not(:disabled)').count(), 0);
    await page.evaluate(() => {
      document.querySelector('#login').dispatchEvent(new Event('submit', {cancelable:true}));
      document.querySelector('#to-register').dispatchEvent(new MouseEvent('click'));
    });
    await settleUI(page);
    assert.equal(posts(fixture).length, 1);
    assert.equal(await page.locator('#login-panel').isVisible(), true);
    gate.resolve();
    await expectHome(fixture);
  });
});

test('登录 401 和网络失败均保留输入、恢复提交并允许再次成功登录', async () => {
  await withFixture({}, async fixture => {
    const {page, handlers} = fixture;
    await ready(page);
    const values = {username:'fixture-account', password:'  登录重试原始密码  '};
    for (const [name, value] of Object.entries(values)) await page.locator(field('login', name)).fill(value);
    for (const [reply, message] of [
      [{status:401, body:{error:'账号或密码错误'}}, '账号或密码错误'],
      [{networkError:true}, '网络连接异常'],
    ]) {
      handlers['/api/auth/login'] = () => reply;
      await page.locator(loginSubmit).click();
      await expectError(page, '#error', message);
      await expectValues(page, 'login', values);
      await expectEnabled(page);
      assert.equal(await page.locator('#error').evaluate(node => node === document.activeElement), true);
      assert.equal(page.url(), `${fixture.origin}/login`);
    }
    handlers['/api/auth/login'] = () => ({body:session});
    await page.locator(loginSubmit).click();
    await expectHome(fixture);
    assert.deepEqual(posts(fixture).map(request => request.body), [values, values, values]);
  });
});

async function inspectPanel(page, form) {
  const geometry = await page.locator(`#${form} input, #${form} button`).evaluateAll(nodes => nodes.map(node => {
    const style = getComputedStyle(node), box = node.getBoundingClientRect();
    return {width:parseFloat(style.width), height:parseFloat(style.height), left:box.left, right:box.right, boxWidth:box.width, boxHeight:box.height};
  }));
  const viewportWidth = await page.evaluate(() => innerWidth);
  const first = geometry[0];
  for (const size of geometry) {
    assert.ok(size.height >= 44, `${form} 控件应保留足够点击高度`);
    assert.ok(size.width <= (viewportWidth <= 760 ? 440 : 400), `${form} 输入框和按钮不得随宽屏无限拉长`);
    assert.ok(Math.abs(size.height - first.height) < 0.1, `${form} 输入框和按钮 computed 高度必须一致`);
    assert.ok(Math.abs(size.width - first.width) < 0.1, `${form} 输入框和按钮 computed 宽度必须一致`);
    assert.ok(size.boxWidth > 0 && size.boxHeight > 0 && size.left >= 0 && size.right <= viewportWidth + 1, `${form} 控件不得超出横向视口`);
  }
  const overflow = await page.evaluate(() => ({
    viewport:innerWidth, document:document.documentElement.scrollWidth, body:document.body.scrollWidth,
  }));
  assert.ok(overflow.document <= overflow.viewport && overflow.body <= overflow.viewport, `${form} 横向溢出：${JSON.stringify(overflow)}`);
  const scene = await page.evaluate(() => {
    const image = document.querySelector('.auth-backdrop img');
    const layout = document.querySelector('.auth-layout');
    const layoutStyle = getComputedStyle(layout);
    return {
      viewport:{width:document.documentElement.clientWidth, height:innerHeight},
      body:document.body.getBoundingClientRect().toJSON(),
      layout:layout.getBoundingClientRect().toJSON(),
      forms:document.querySelector('.auth-forms').getBoundingClientRect().toJSON(),
      columnWidth:parseFloat(layoutStyle.gridTemplateColumns.split(' ').at(-1)),
      paddingRight:parseFloat(layoutStyle.paddingRight),
      image:image.getBoundingClientRect().toJSON(),
      fit:getComputedStyle(image).objectFit,
      mask:getComputedStyle(image).maskImage,
    };
  });
  assert.ok(Math.abs(scene.body.width - scene.viewport.width) < 1, '页面保持全宽，不能缩进固定尺寸画面');
  assert.ok(Math.abs(scene.layout.width - scene.viewport.width) < 1, '布局应随视口宽度自适应');
  assert.equal(scene.fit, 'cover', '背景等比覆盖，不拉伸变形');
  if (scene.viewport.width > 760) {
    assert.ok(scene.layout.height >= scene.viewport.height, '桌面布局应铺满视口高度');
    assert.ok(Math.abs(scene.image.width - scene.viewport.width) < 1 && Math.abs(scene.image.height - scene.viewport.height) < 1, '桌面背景必须铺满全屏');
    assert.ok(Math.abs(scene.image.left) < 1 && Math.abs(scene.image.top) < 1, '桌面背景不能留居中缩小后的边框');
    assert.equal(scene.mask, 'none', '全屏背景不应保留固定画面的边缘遮罩');
    const columnCenter = scene.layout.right - scene.paddingRight - scene.columnWidth / 2;
    assert.ok(Math.abs(scene.forms.left + scene.forms.width / 2 - columnCenter) < 1, '限宽表单应在自适应右栏内居中');
  }
  return {width:first.width, height:first.height};
}

async function inspectKeyboardFocus(page, form) {
  await page.locator(`#${form}-heading`).focus();
  const controls = page.locator(`#${form} input, #${form} button`);
  for (let index = 0; index < await controls.count(); index++) {
    await page.keyboard.press('Tab');
    const focus = await controls.nth(index).evaluate(node => {
      const style = getComputedStyle(node);
      return {active:document.activeElement === node, visible:node.matches(':focus-visible'), width:parseFloat(style.outlineWidth), style:style.outlineStyle, color:style.outlineColor, background:style.backgroundColor};
    });
    assert.equal(focus.active, true, `${form} 第 ${index + 1} 个控件必须在键盘顺序内`);
    assert.equal(focus.visible, true);
    assert.ok(focus.width >= 2 && !['none', 'hidden'].includes(focus.style), '键盘焦点必须有可见轮廓');
    assert.notEqual(focus.color, 'rgba(0, 0, 0, 0)');
    assert.notEqual(focus.color, focus.background);
  }
}

async function inspectLayout(fixture, screenshotSuffix) {
  const {page} = fixture;
  await ready(page);
  await page.evaluate(() => document.fonts.ready);
  const images = await page.locator('img').evaluateAll(nodes => nodes.map(node => ({
    src:new URL(node.src).pathname, loaded:node.complete && node.naturalWidth > 0 && node.naturalHeight > 0,
  })));
  assert.deepEqual(images.map(image => image.src).sort(), ['/auth-art.webp', '/auth-logo.png']);
  assert.ok(images.every(image => image.loaded), '背景图和 Logo 必须真实加载成功');
  const login = await inspectPanel(page, 'login');
  if (screenshotSuffix) await page.screenshot({path:`/tmp/h3card-auth-final-login-${screenshotSuffix}.png`, fullPage:true});
  await inspectKeyboardFocus(page, 'login');
  await page.keyboard.press('Enter');
  await page.locator('#register-panel').waitFor();
  const register = await inspectPanel(page, 'register');
  assert.deepEqual(register, login, '同一视口的登录和注册控件 computed 尺寸必须一致');
  const contacts = await page.locator('.auth-contacts span').evaluateAll(nodes => nodes.map(node => ({text:node.textContent, weight:getComputedStyle(node).fontWeight})));
  assert.deepEqual(contacts, [{text:'彦龙（431661）', weight:'400'}, {text:'禾尚（286633）', weight:'400'}]);
  // 完整页面截图便于主助手检查窄屏长表单，拍摄前回顶且移走焦点轮廓。
  await page.locator('#register-heading').evaluate(node => node.blur());
  await page.evaluate(() => scrollTo(0, 0));
  if (screenshotSuffix) await page.screenshot({path:`/tmp/h3card-auth-final-register-${screenshotSuffix}.png`, fullPage:true});
  await inspectKeyboardFocus(page, 'register');
  await page.locator('#to-login').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('#to-login').isVisible(), true, '短高页面仍可滚动到返回按钮');
  await page.keyboard.press('Enter');
  await page.locator('#login-panel').waitFor();
  assert.deepEqual(await inspectPanel(page, 'login'), login);
  assert.deepEqual(posts(fixture), []);
}

for (const {width, height, suffix} of [
  {width:1672, height:941, suffix:'desktop'},
  {width:1920, height:1080},
  {width:2560, height:1440, suffix:'2k'},
  {width:3440, height:1440, suffix:'ultrawide'},
  {width:3840, height:2160},
  {width:1512, height:800},
  {width:1440, height:900},
  {width:1366, height:768},
  {width:1024, height:768},
  {width:768, height:1024},
  {width:390, height:844, suffix:'390'},
  {width:320, height:740, suffix:'320'},
]) {
  test(`${width}×${height} 两表单无横向溢出、控件等大、焦点可见且图片正常`, async () => {
    await withFixture({viewport:{width, height}}, fixture => inspectLayout(fixture, suffix));
  });
}

test('同一窗口跨桌面、超宽屏和手机调整尺寸时，两表单保持全宽背景与独立限宽', async () => {
  await withFixture({}, async fixture => {
    for (const viewport of [{width:2560, height:1440}, {width:3440, height:1440}, {width:390, height:844}, {width:1920, height:1080}]) {
      await fixture.page.setViewportSize(viewport);
      await inspectLayout(fixture);
    }
  });
});

test('短高窗口及 200% 等效 CSS 视口支持两表单滚动且无横向溢出', async () => {
  // 缩小 CSS 视口模拟桌面 200% 缩放的回流；deviceScaleFactor 不是页面缩放。
  for (const viewport of [{width:1366, height:500}, {width:836, height:470}, {width:683, height:384}]) {
    await withFixture({viewport}, fixture => inspectLayout(fixture));
  }
});
