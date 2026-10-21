'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {sourceFile, snapshot, testEnvironment} = require('./run-tests.cjs');
const {checkWeb} = require('./check-web.cjs');

function temporary(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chouka-tooling-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  return root;
}

function write(root, name, content) {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), {recursive:true});
  fs.writeFileSync(file, content);
}

test('test snapshots exclude runtime files, credentials and path escapes', () => {
  for (const file of ['data/auth.db', 'server/data/jobs.json', 'web/node_modules/a.js', '.env.controller',
    'llm.json', 'worker/config.json', 'worker/worker-state.json', 'server/private.key',
    'web/../../llm.json', '/web/app.js', 'server/__pycache__/app.pyc', 'unknown/file.js', '']) {
    assert.equal(sourceFile(file), false, file);
  }
  for (const file of ['web/features/task-panel.js', 'server/projects.py', 'tests/test_project.py',
    'tools/run-tests.cjs', 'manifests/cards.json', 'package-lock.json']) assert.equal(sourceFile(file), true, file);
});

test('snapshot includes uncommitted source but never copies local runtime data', t => {
  const root = temporary(t), source = path.join(root, 'source'), target = path.join(root, 'snapshot');
  fs.mkdirSync(source);
  execFileSync('git', ['init', '-q', source]);
  write(source, 'web/app.js', 'original');
  execFileSync('git', ['-C', source, 'add', 'web/app.js']);
  write(source, 'web/app.js', 'edited');
  write(source, 'server/new.py', 'new code');
  write(source, 'data/auth.db', 'do not copy');
  write(source, 'worker/config.json', 'do not copy');
  write(source, '.env.controller', 'do not copy');
  assert.equal(snapshot(source, target), 2);
  assert.equal(fs.readFileSync(path.join(target, 'web/app.js'), 'utf8'), 'edited');
  assert.equal(fs.readFileSync(path.join(target, 'server/new.py'), 'utf8'), 'new code');
  assert.equal(fs.existsSync(path.join(target, 'data')), false);
  assert.equal(fs.existsSync(path.join(target, 'worker')), false);
});

test('test environment removes controller configuration and keeps explicit test choices', () => {
  const original = {PATH:'tools', CHOUKA_EXECUTION_MODE:'controller', CHOUKA_AUTH_DB:'production.db',
    CHOUKA_ENROLLMENT_TOKEN:'secret', CHOUKA_LOCAL_TEST:'1', COMFY_HTTP:'production', YOUDAO_APP_SECRET:'secret',
    CHOUKA_TEST_PYTHON:'test-python', CHOUKA_TEST_BROWSER:'msedge', CHOUKA_TEST_FFMPEG:'test-ffmpeg'};
  const env = testEnvironment(__dirname, original);
  for (const key of ['CHOUKA_EXECUTION_MODE', 'CHOUKA_AUTH_DB', 'CHOUKA_ENROLLMENT_TOKEN',
    'CHOUKA_LOCAL_TEST', 'COMFY_HTTP', 'YOUDAO_APP_SECRET']) assert.equal(env[key], undefined);
  assert.equal(env.CHOUKA_TEST_PYTHON, 'test-python');
  assert.equal(env.CHOUKA_TEST_BROWSER, 'msedge');
  assert.equal(env.CHOUKA_TEST_FFMPEG, 'test-ffmpeg');
  assert.equal(original.CHOUKA_AUTH_DB, 'production.db');
});

test('web checks parse scripts and validate nested script references', t => {
  const root = temporary(t);
  write(root, 'web/index.html', '<script src="/features/a.js?v=1"></script><script>const x = 1;</script>');
  write(root, 'web/features/a.js', 'const a = 1;');
  assert.deepEqual(checkWeb(root), {checked:2, errors:[]});
  write(root, 'web/index.html', '<script src="/missing.js"></script><script src="../outside.js"></script><script>const = ;</script>');
  const result = checkWeb(root);
  assert.equal(result.errors.length, 3);
  assert.match(result.errors[0], /missing/);
  assert.match(result.errors[1], /outside-web/);
  assert.match(result.errors[2], /SyntaxError/);
});
