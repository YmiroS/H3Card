'use strict';
// Fixtures exercise shipped documents/chunks, never a fallback to web/ or frontend/.
const assert = require('node:assert/strict');
const {readFileSync, existsSync} = require('node:fs');
const path = require('node:path');
const {compileFunction} = require('node:vm');

const documentRoutes = Object.freeze({
  '/controller':'admin/controller.html',
  '/admin/permissions':'admin/permissions.html',
  '/controller/costs':'admin/costs.html',
  '/controller/capacity':'admin/capacity.html',
  '/monitor':'admin/monitor.html',
});
const root = path.resolve(__dirname, '..', '..', 'web_dist');
const origin = 'http://built.fixture';
const contentType = file => ({'.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml',
  '.woff2':'font/woff2'}[path.extname(file)] || 'application/octet-stream');

function builtResources(routes) {
  const files = new Map(), documents = new Map();
  function add(url, from = '/') {
    if (/^(?:data:|blob:|#)/.test(url)) return;
    const resolved = new URL(url, origin + from);
    assert.equal(resolved.origin, origin, 'Built admin resource must be same-origin: ' + url);
    const pathname = resolved.pathname;
    if (files.has(pathname)) return;
    assert.ok(/^\/assets\/[\w./-]+$/.test(pathname) || /^\/(?:icon\.png|favicon\.png|auth-logo\.png|auth-art\.webp)$/.test(pathname),
      'Unexpected built resource reference: ' + pathname);
    const file = path.resolve(root, '.' + pathname);
    assert.ok(file.startsWith(root + path.sep), 'Built resource escapes distribution');
    assert.ok(existsSync(file), 'Missing built resource: ' + file);
    const item = {body:readFileSync(file), contentType:contentType(file), file};
    files.set(pathname, item);
    if (file.endsWith('.js')) {
      const source = item.body.toString('utf8');
      // Vite static imports/re-exports, dynamic imports and preload dependency arrays.
      for (const match of source.matchAll(/(?:\b(?:import|export)\s*(?:[^;"'()]*?\bfrom\s*)?["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']|["']((?:\.\.?\/|\/)?assets\/[^"']+\.(?:js|css))["'])/g)) {
        const dependency = match[1] || match[2] || match[3];
        add(dependency.startsWith('assets/') ? '/' + dependency : dependency, pathname);
      }
    } else if (file.endsWith('.css')) {
      for (const match of item.body.toString('utf8').matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) add(match[1], pathname);
    }
  }
  for (const route of routes) {
    assert.ok(Object.hasOwn(documentRoutes, route), 'Unknown canonical admin route: ' + route);
    const file = path.join(root, documentRoutes[route]);
    assert.ok(existsSync(file), 'Build the admin MPA into web_dist before running fixtures: ' + file);
    const html = readFileSync(file, 'utf8');
    assert.match(html, /<script\b[^>]*\btype="module"[^>]*\bsrc="\/assets\//, 'Must use a built Vite module entry');
    assert.doesNotMatch(html, /(?:src|href)=["'][^"']*(?:\/web\/|\/frontend\/|\.ts(?:["'?])|\/(?:auth|admin-shell|controller-page|costs-page|capacity-page|monitor-page|monitor-alerts)\.(?:js|css))/, 'No legacy admin assets');
    const scripts = [], styles = [];
    for (const match of html.matchAll(/<(script|link)\b[^>]*>/g)) {
      const tag = match[0], reference = tag.match(/\b(?:src|href)="([^"]+)"/);
      if (!reference) continue;
      add(reference[1], route);
      if (match[1] === 'script') scripts.push(new URL(reference[1], origin + route).pathname);
      if (/\brel="stylesheet"/.test(tag)) styles.push(new URL(reference[1], origin + route).pathname);
    }
    documents.set(route, {body:Buffer.from(html), contentType:contentType(file), file, scripts, styles});
  }
  // Runtime-created brand/account images are not necessarily literal HTML dependencies.
  for (const name of ['icon.png', 'favicon.png', 'auth-logo.png', 'auth-art.webp']) {
    if (existsSync(path.join(root, name))) add('/' + name);
  }
  function findGlobal(name) {
    const matches = [...files.entries()].filter(([url, item]) => url.endsWith('.js')
      && new RegExp('\\.' + name + '\\s*=').test(item.body.toString('utf8')));
    assert.equal(matches.length, 1, 'Expected one built chunk defining ' + name);
    const [url] = matches[0];
    assert.ok(![...documents.values()].some(document => document.scripts.includes(url)),
      name + ' must be a shared/pure chunk, not a page entry with business side effects');
    return url;
  }
  return {
    files, documents,
    resource(pathname) { return documents.get(pathname) || files.get(pathname); },
    serve(req, res) {
      const item = req.method === 'GET' && this.resource(new URL(req.url, origin).pathname);
      if (!item) return false;
      res.setHeader('Content-Type', item.contentType); res.end(item.body); return true;
    },
    globalModule:findGlobal,
    runtimeTags({shell = false, script = ''} = {}) {
      const modules = [findGlobal('H3Auth'), ...(shell ? [findGlobal('AdminUI')] : [])];
      const styles = shell ? documents.get('/controller').styles : [];
      return styles.map(url => `<link rel="stylesheet" href="${url}">`).join('')
        + `<script type="module">${modules.map(url => `import ${JSON.stringify(url)};`).join('')}\n${script}</script>`;
    },
  };
}

function loadAlertEngine() {
  const resources = builtResources(['/monitor']);
  // Discover only through the shipped monitor graph, never an unused test-only engine copy.
  const url = resources.globalModule('MonitorAlerts');
  const source = resources.files.get(url).body.toString('utf8');
  assert.doesNotMatch(source, /\b(?:document|H3Auth|AdminUI)\b|\bimport\s*(?:["'{*]|\()/,
    'Alert engine chunk must run without page/auth or module dependencies');
  // Rollup's CJS interop wrapper is initialized by its final ESM default export.
  // Translate only that checked zero-argument call to a return; keep all shipped logic intact.
  const finalExport = /\bexport\s+default\s+([A-Za-z_$][\w$]*)\(\);\s*$/;
  assert.match(source, finalExport, 'Expected a final default export invoking the pure engine wrapper');
  const executable = source.replace(finalExport, 'return $1();');
  assert.doesNotMatch(executable, /\bexport\b/, 'No other ESM exports may be stripped from the engine');
  // A scoped VM function keeps globals isolated but retains host-realm values for deepEqual.
  const sandbox = {module:{exports:{}}};
  const exported = compileFunction(executable, ['module', 'globalThis'], {filename:resources.files.get(url).file})(sandbox.module, sandbox);
  const engine = sandbox.MonitorAlerts;
  assert.equal(exported, engine, 'Default export and monitor global must expose the same shipped engine');
  assert.equal(typeof engine.create, 'function', 'Built alert engine must expose create');
  return engine;
}

module.exports = {builtResources, documentRoutes, loadAlertEngine};
