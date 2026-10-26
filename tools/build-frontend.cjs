'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const PRODUCTION_ENV = {
  VITE_ADMIN_BASE_URL:'/',
  VITE_IF_BRIDGE_URL:'http://127.0.0.1:8278',
};

function frontendCommit(root, runCommand) {
  const frontend = path.join(root, 'frontend');
  const git = (cwd, args) => runCommand('git', ['-C', cwd, ...args],
    {encoding:'utf8', stdio:['ignore', 'pipe', 'pipe'], windowsHide:true}).trim();
  try {
    if (!fs.existsSync(path.join(frontend, '.git'))
      || fs.realpathSync(git(frontend, ['rev-parse', '--show-toplevel'])) !== fs.realpathSync(frontend)) {
      throw new Error('not a separate Git checkout');
    }
  } catch (error) {
    throw new Error('Frontend submodule is uninitialized. Run git submodule update --init -- frontend.', {cause:error});
  }
  const commit = git(frontend, ['rev-parse', '--verify', 'HEAD']);
  if (git(frontend, ['status', '--porcelain=v1', '--untracked-files=all', '--ignore-submodules=none'])) {
    throw new Error('Frontend submodule is dirty. Commit or remove frontend changes before building a release.');
  }
  const entry = git(root, ['ls-files', '--stage', '--', 'frontend']);
  const match = /^160000 ([a-f0-9]{40,64}) 0\tfrontend$/.exec(entry);
  if (!match || match[1] !== commit) {
    throw new Error(`Frontend gitlink in parent INDEX must match HEAD ${commit}. Run git add frontend before building.`);
  }
  return commit;
}

function npmCliPath() {
  const bin = path.dirname(fs.realpathSync(process.execPath));
  const candidates = [process.env.npm_execpath,
    path.join(bin, 'node_modules/npm/bin/npm-cli.js'),
    path.resolve(bin, '../lib/node_modules/npm/bin/npm-cli.js')];
  const cli = candidates.find(file => file && path.basename(file) === 'npm-cli.js'
    && fs.existsSync(file) && fs.statSync(file).isFile());
  if (!cli) throw new Error('Cannot locate npm-cli.js. Install Node.js with npm and run npm run build:frontend.');
  return cli;
}

function validateDistribution(directory) {
  const root = fs.realpathSync(directory);
  function regularFile(relative) {
    const file = path.resolve(directory, relative);
    const resolved = path.relative(root, fs.realpathSync(file));
    if (resolved.startsWith('..') || path.isAbsolute(resolved) || !fs.lstatSync(file).isFile()) {
      throw new Error(`Distribution requires a regular file inside its directory: ${relative}`);
    }
    return file;
  }
  const index = fs.readFileSync(regularFile('index.html'), 'utf8');
  const assets = [];
  for (const tag of index.matchAll(/<(script|link)\b[^>]*>/gi)) {
    const attribute = tag[1].toLowerCase() === 'script' ? 'src' : 'href';
    const reference = new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']+)["']`, 'i').exec(tag[0]);
    if (!reference) continue;
    const url = reference[1];
    if (/^(?:[a-z]+:|\/\/)/i.test(url)) throw new Error(`Non-local distribution asset: ${url}`);
    const relative = decodeURIComponent(url.split(/[?#]/)[0]).replace(/^\//, '');
    regularFile(relative);
    if (/^assets\/.+[-.][A-Za-z0-9_-]{6,}\.(?:js|css)$/.test(relative)) assets.push(relative);
  }
  if (!assets.some(file => file.endsWith('.js'))) throw new Error('Distribution index must reference a hashed JavaScript asset.');
  return assets;
}

function buildFrontend({root = ROOT, runCommand = execFileSync, npmCli, rename = fs.renameSync} = {}) {
  const commit = frontendCommit(root, runCommand);
  const destination = path.join(root, 'web_dist');
  if (fs.existsSync(destination) && !fs.lstatSync(destination).isDirectory()) {
    throw new Error('Refusing to replace web_dist: expected a real directory, not a file or symlink.');
  }
  const cli = npmCli || npmCliPath();
  const workspace = fs.mkdtempSync(path.join(root, '.frontend-build-'));
  const staging = path.join(workspace, 'dist');
  const backup = path.join(workspace, 'previous-web_dist');
  let keepBackup = false;
  try {
    const env = {...process.env, ...PRODUCTION_ENV};
    const npm = (args, extraEnv = {}) => runCommand(process.execPath, [cli, ...args],
      {cwd:path.join(root, 'frontend'), env:{...env, ...extraEnv}, stdio:'inherit', windowsHide:true});
    npm(['ci', '--include=dev']);
    npm(['run', 'check'], {NODE_ENV:'test'});
    npm(['run', 'build', '--', '--outDir', staging, '--emptyOutDir', '--base', '/'], {NODE_ENV:'production'});
    if (frontendCommit(root, runCommand) !== commit) throw new Error('Frontend HEAD changed during the build; release not installed.');
    const index = path.join(staging, 'index.html');
    if (!fs.lstatSync(index).isFile()) throw new Error('Distribution requires a regular index.html file.');
    // Vite can mix CRLF and CRCRLF on Windows. Normalize only HTML, never fingerprinted assets.
    fs.writeFileSync(index, fs.readFileSync(index, 'utf8').replace(/\r\n?/g, '\n'));
    const assets = validateDistribution(staging);
    // Build provenance only. The HTTP service must serve index/assets, never this metadata file.
    fs.writeFileSync(path.join(staging, 'release.json'), JSON.stringify({
      source_commit:commit, source_directory:'frontend', environment:PRODUCTION_ENV,
    }, null, 2) + '\n', {flag:'wx'});
    const previous = fs.existsSync(destination);
    if (previous) rename(destination, backup);
    try {
      rename(staging, destination);
    } catch (error) {
      if (previous) {
        try { rename(backup, destination); }
        catch (rollbackError) {
          keepBackup = true;
          throw new Error(`Release replacement and rollback failed. Previous web_dist preserved at ${backup}: ${rollbackError.message}`, {cause:error});
        }
      }
      throw error;
    }
    console.log(`Frontend ${commit} -> ${destination} (${assets.length} hashed entry assets)`);
    return {source_commit:commit, destination, assets};
  } finally {
    // Only remove our own mkdtemp directory. Preserve the old release if rollback was blocked.
    if (!keepBackup) fs.rmSync(workspace, {recursive:true, force:true});
  }
}

if (require.main === module) {
  try { buildFrontend(); }
  catch (error) { console.error(`Frontend release failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = {buildFrontend, validateDistribution};
