'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {buildFrontend, validateDistribution} = require('./build-frontend.cjs');

const identity = {...process.env, GIT_AUTHOR_NAME:'Release fixture', GIT_AUTHOR_EMAIL:'fixture@example.invalid',
  GIT_COMMITTER_NAME:'Release fixture', GIT_COMMITTER_EMAIL:'fixture@example.invalid',
  GIT_AUTHOR_DATE:'2026-01-01T00:00:00Z', GIT_COMMITTER_DATE:'2026-01-01T00:00:00Z'};
function git(root, ...args) {
  return execFileSync('git', ['-C', root, ...args], {encoding:'utf8', env:identity}).trim();
}
function write(root, file, content = 'fixture') {
  fs.mkdirSync(path.dirname(path.join(root, file)), {recursive:true});
  fs.writeFileSync(path.join(root, file), content);
}
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chouka release & '));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  git(root, 'init', '-q');
  const frontend = path.join(root, 'frontend');
  fs.mkdirSync(frontend);
  git(frontend, 'init', '-q');
  write(frontend, 'package.json', '{}\n');
  git(frontend, 'add', 'package.json');
  const tree = git(frontend, 'write-tree');
  const commit = git(frontend, 'commit-tree', tree, '-m', 'Release fixture');
  git(frontend, 'update-ref', 'HEAD', commit);
  git(root, 'update-index', '--add', '--cacheinfo', `160000,${commit},frontend`);
  write(root, 'web_dist/index.html', 'previous release');
  write(root, 'web_dist/assets/old.js', 'previous asset');
  write(root, 'unrelated/keep.txt', 'leave alone');
  return {root, frontend, commit};
}
const documents = ['index.html', ...['controller', 'permissions', 'costs', 'capacity', 'monitor'].map(page => `admin/${page}.html`)];
function artifacts(directory) {
  for (const document of documents) write(directory, document, '<link href="/assets/index-ABC12345.css" rel="stylesheet">'
    + '<script type="module" src="/assets/index-ABC12345.js"></script>');
  write(directory, 'assets/index-ABC12345.js', 'console.log("release");');
  write(directory, 'assets/index-ABC12345.css', 'body { color: black; }');
  for (const file of ['favicon.png', 'icon.png', 'auth-art.webp', 'auth-logo.png', 'vendor/fabric.min.js']) write(directory, file);
}
function npmStub(options = {}) {
  const calls = [];
  return {calls, runCommand(command, args, execution) {
    if (command === 'git') return execFileSync(command, args, execution);
    calls.push({command, args, execution});
    const step = args[1] === 'ci' ? 'ci' : args[2];
    if (step === options.fail) throw new Error(`stub ${step} failed`);
    if (step === 'build') {
      const out = args[args.indexOf('--outDir') + 1];
      artifacts(out);
      if (options.invalid) fs.unlinkSync(path.join(out, 'assets/index-ABC12345.js'));
      if (options.afterBuild) options.afterBuild(out);
    }
    return '';
  }};
}
function build(root, stub, extra = {}) {
  return buildFrontend({root, npmCli:path.join(root, 'fake npm-cli.js'), runCommand:stub.runCommand, ...extra});
}
function preserved(root) {
  assert.equal(fs.readFileSync(path.join(root, 'web_dist/index.html'), 'utf8'), 'previous release');
  assert.equal(fs.readFileSync(path.join(root, 'web_dist/assets/old.js'), 'utf8'), 'previous asset');
  assert.equal(fs.readFileSync(path.join(root, 'unrelated/keep.txt'), 'utf8'), 'leave alone');
  assert.deepEqual(fs.readdirSync(root).filter(name => name.startsWith('.frontend-build-')), []);
}

test('clean indexed frontend builds through Node/npm CLI with production overrides and valid artifacts', t => {
  const {root, frontend, commit} = fixture(t), stub = npmStub();
  const result = build(root, stub);
  assert.equal(result.source_commit, commit);
  assert.equal(result.destination, path.join(root, 'web_dist'));
  assert.deepEqual(stub.calls.map(call => call.args.slice(1, 3)), [['ci', '--include=dev'], ['run', 'check'], ['run', 'build']]);
  for (const call of stub.calls) {
    assert.equal(call.command, process.execPath);
    assert.equal(call.execution.cwd, frontend);
    assert.equal(call.execution.shell, undefined);
    assert.equal(call.execution.env.VITE_IF_BRIDGE_URL, 'http://127.0.0.1:8278');
  }
  const buildCall = stub.calls[2];
  assert.equal(buildCall.execution.env.NODE_ENV, 'production');
  const out = buildCall.args[buildCall.args.indexOf('--outDir') + 1];
  assert.equal(path.relative(frontend, out).startsWith(`..${path.sep}`), true);
  assert.deepEqual(validateDistribution(result.destination), ['assets/index-ABC12345.css', 'assets/index-ABC12345.js']);
  const release = JSON.parse(fs.readFileSync(path.join(result.destination, 'release.json'), 'utf8'));
  assert.equal(release.source_commit, commit);
  assert.deepEqual(release.environment, {VITE_IF_BRIDGE_URL:'http://127.0.0.1:8278'});
  assert.doesNotMatch(fs.readFileSync(path.join(result.destination, 'index.html'), 'utf8'), /release\.json/);
  assert.equal(fs.existsSync(path.join(result.destination, 'assets/old.js')), false);
  assert.equal(git(frontend, 'status', '--porcelain'), '');
  assert.equal(fs.readFileSync(path.join(root, 'unrelated/keep.txt'), 'utf8'), 'leave alone');
  assert.deepEqual(fs.readdirSync(root).filter(name => name.startsWith('.frontend-build-')), []);
});

for (const [name, ending, normalized] of [['CRLF', '\r\n', '\n'], ['CRCRLF', '\r\r\n', '\n\n']]) {
  test(`normalizes all generated ${name} documents to LF without changing hashed JS/CSS bytes`, t => {
    const {root} = fixture(t);
    const lines = ['<!doctype html>', '<link href="/assets/index-ABC12345.css" rel="stylesheet">',
      '<script src="/assets/index-ABC12345.js"></script>', ''];
    const javascript = Buffer.from('const value = 1;\r\nconsole.log(value);\r\r\n');
    const stylesheet = Buffer.from('body {\r\n  color: black;\r\r\n}\r\n');
    const stub = npmStub({afterBuild:out => {
      for (const document of documents) write(out, document, lines.join(ending));
      write(out, 'assets/index-ABC12345.js', javascript);
      write(out, 'assets/index-ABC12345.css', stylesheet);
    }});
    const {destination} = build(root, stub);
    for (const document of documents) {
      const html = fs.readFileSync(path.join(destination, document), 'utf8');
      assert.equal(html, lines.join(normalized));
      assert.equal(html.includes('\r'), false);
    }
    assert.deepEqual(fs.readFileSync(path.join(destination, 'assets/index-ABC12345.js')), javascript);
    assert.deepEqual(fs.readFileSync(path.join(destination, 'assets/index-ABC12345.css')), stylesheet);
  });
}

for (const dirty of ['tracked', 'untracked', 'staged']) {
  test(`rejects ${dirty} frontend changes before npm runs`, t => {
    const {root, frontend} = fixture(t), stub = npmStub();
    write(frontend, dirty === 'untracked' ? 'new.txt' : 'package.json', 'changed');
    if (dirty === 'staged') git(frontend, 'add', 'package.json');
    assert.throws(() => build(root, stub), /dirty/);
    assert.equal(stub.calls.length, 0);
    preserved(root);
  });
}

test('rejects an uninitialized submodule instead of falling back to the parent Git repository', t => {
  const {root, frontend} = fixture(t), stub = npmStub();
  fs.rmSync(path.join(frontend, '.git'), {recursive:true});
  assert.throws(() => build(root, stub), /uninitialized.*submodule update --init/);
  assert.equal(stub.calls.length, 0);
  preserved(root);
});

for (const indexed of ['mismatch', 'missing']) {
  test(`rejects ${indexed} parent INDEX gitlink`, t => {
    const {root} = fixture(t), stub = npmStub();
    if (indexed === 'mismatch') git(root, 'update-index', '--cacheinfo', `160000,${'1'.repeat(40)},frontend`);
    else git(root, 'update-index', '--force-remove', 'frontend');
    assert.throws(() => build(root, stub), /gitlink in parent INDEX.*git add frontend/);
    assert.equal(stub.calls.length, 0);
    preserved(root);
  });
}

for (const fail of ['ci', 'check', 'build']) {
  test(`failed npm ${fail} preserves previous distribution`, t => {
    const {root} = fixture(t), stub = npmStub({fail});
    assert.throws(() => build(root, stub), new RegExp(`stub ${fail} failed`));
    assert.equal(stub.calls.length, ['ci', 'check', 'build'].indexOf(fail) + 1);
    preserved(root);
  });
}

test('a successful command with missing hashed output is not published', t => {
  const {root} = fixture(t), stub = npmStub({invalid:true});
  assert.throws(() => build(root, stub), /ENOENT/);
  preserved(root);
});

for (const file of [...documents.slice(1), 'favicon.png', 'icon.png', 'auth-art.webp', 'auth-logo.png', 'vendor/fabric.min.js']) {
  test(`missing ${file} prevents publication and preserves the previous release`, t => {
    const {root} = fixture(t);
    const stub = npmStub({afterBuild:out => fs.unlinkSync(path.join(out, file))});
    assert.throws(() => build(root, stub), /ENOENT/);
    preserved(root);
  });
}

for (const reference of ['/auth.js', '/admin-shell.css', 'https://example.invalid/page.js', '/assets/missing-ABC12345.js']) {
  test(`admin entry rejects invalid resource ${reference} before publication`, t => {
    const {root} = fixture(t);
    const stub = npmStub({afterBuild:out => {
      if (reference.startsWith('/') && !reference.startsWith('/assets/')) write(out, reference.slice(1), 'legacy');
      write(out, 'admin/permissions.html', `<script src="${reference}"></script>`);
    }});
    assert.throws(() => build(root, stub), /legacy source reference|Non-local|ENOENT/);
    preserved(root);
  });
}

test('frontend changes during a build prevent publication', t => {
  const {root, frontend} = fixture(t);
  const stub = npmStub({afterBuild:() => write(frontend, 'package.json', 'changed during build')});
  assert.throws(() => build(root, stub), /dirty/);
  preserved(root);
});

test('failed installation rename rolls back the previous distribution', t => {
  const {root} = fixture(t), stub = npmStub();
  const rename = (from, to) => {
    if (path.basename(from) === 'dist') throw new Error('stub rename failed');
    fs.renameSync(from, to);
  };
  assert.throws(() => build(root, stub, {rename}), /stub rename failed/);
  preserved(root);
});

test('blocked rollback keeps the previous release in its owned backup directory', t => {
  const {root} = fixture(t), stub = npmStub();
  const rename = (from, to) => {
    if (path.basename(from) !== 'web_dist') throw new Error('stub destination blocked');
    fs.renameSync(from, to);
  };
  assert.throws(() => build(root, stub, {rename}), /Previous web_dist preserved at/);
  const workspaces = fs.readdirSync(root).filter(name => name.startsWith('.frontend-build-'));
  assert.equal(workspaces.length, 1);
  const backup = path.join(root, workspaces[0], 'previous-web_dist');
  assert.equal(fs.readFileSync(path.join(backup, 'index.html'), 'utf8'), 'previous release');
  assert.equal(fs.readFileSync(path.join(root, 'unrelated/keep.txt'), 'utf8'), 'leave alone');
});

test('refuses to replace a non-directory web_dist before invoking npm', t => {
  const {root} = fixture(t), stub = npmStub();
  fs.rmSync(path.join(root, 'web_dist'), {recursive:true});
  write(root, 'web_dist', 'unrelated file');
  assert.throws(() => build(root, stub), /Refusing to replace web_dist/);
  assert.equal(stub.calls.length, 0);
  assert.equal(fs.readFileSync(path.join(root, 'web_dist'), 'utf8'), 'unrelated file');
});

test('first release works without an existing web_dist', t => {
  const {root} = fixture(t), stub = npmStub();
  fs.rmSync(path.join(root, 'web_dist'), {recursive:true});
  build(root, stub);
  assert.equal(validateDistribution(path.join(root, 'web_dist')).length, 2);
});

test('artifact validation rejects a directory index, unhashed entry and escaping reference', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chouka-artifacts-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  fs.mkdirSync(path.join(root, 'index.html'));
  assert.throws(() => validateDistribution(root), /regular file/);
  fs.rmdirSync(path.join(root, 'index.html'));
  write(root, 'index.html', '<script src="/assets/main.js"></script>');
  write(root, 'assets/main.js', 'entry');
  assert.throws(() => validateDistribution(root), /hashed JavaScript/);
  write(root, 'outside.js', 'must not be served');
  write(root, 'dist/index.html', '<script src="../outside.js"></script>');
  assert.throws(() => validateDistribution(path.join(root, 'dist')), /regular file inside its directory/);
});
