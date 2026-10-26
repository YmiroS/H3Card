'use strict';
// Fixtures exercise shipped documents/chunks, never a fallback to web/ or frontend/.
const assert = require('node:assert/strict');
const {readFileSync, existsSync} = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

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
      for (const match of source.matchAll(/(?:\b(?:import|export)\s*(?:[^;"'()]*?\bfrom\s*)?["']((?:\.\.?\/|\/assets\/)[\w./-]+\.(?:js|css))["']|\bimport\s*\(\s*["']((?:\.\.?\/|\/assets\/)[\w./-]+\.(?:js|css))["']|["']((?:\.\.?\/|\/)?assets\/[\w./-]+\.(?:js|css))["'])/g)) {
        const dependency = match[1] || match[2] || match[3];
        add(dependency.startsWith('assets/') ? '/' + dependency : dependency, pathname);
      }
    } else if (file.endsWith('.css')) {
      for (const match of item.body.toString('utf8').matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) add(match[1], pathname);
    }
  }
  for (const route of routes) {
    const workspace = route === '/' || route === '/login';
    assert.ok(workspace || Object.hasOwn(documentRoutes, route), 'Unknown canonical frontend route: ' + route);
    const file = path.join(root, workspace ? 'index.html' : documentRoutes[route]);
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
  return {
    files, documents,
    resource(pathname) { return documents.get(pathname) || files.get(pathname); },
    serve(req, res) {
      const item = req.method === 'GET' && this.resource(new URL(req.url, origin).pathname);
      if (!item) return false;
      res.setHeader('Content-Type', item.contentType); res.end(item.body); return true;
    },
  };
}

async function loadAlertEngine() {
  const resources = builtResources(['/monitor']);
  // Discover only through the shipped graph and import its actual ESM, including typed schema dependencies.
  const chunks = [...resources.files.entries()].filter(([url]) => /^\/assets\/monitor-alerts-[\w-]+\.js$/.test(url));
  assert.equal(chunks.length, 1, 'Expected one shipped monitor alert engine chunk');
  const [, item] = chunks[0];
  assert.doesNotMatch(item.body.toString('utf8'), /\b(?:document|H3Auth|AdminUI|MonitorAlerts)\b/,
    'Alert engine must not initialize a page, session or legacy global');
  const engine = await import(pathToFileURL(item.file).href);
  assert.equal(typeof engine.createAlertEngine, 'function', 'Built typed engine must expose createAlertEngine');
  return {create:engine.createAlertEngine};
}

module.exports = {builtResources, documentRoutes, loadAlertEngine};
