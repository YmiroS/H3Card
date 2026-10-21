'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn, execFileSync} = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIRS = new Set(['server', 'web', 'worker', 'tests', 'tools', 'manifests', 'graphs', 'desktop', 'extension']);
const ROOT_FILES = new Set(['package.json', 'package-lock.json', 'pricing.json', 'requirements-controller.txt',
  'Dockerfile.controller', 'compose.controller.yml', 'start-controller.sh', 'llm.json.例子',
  '启动Windows节点.bat', '启动Windows节点_4090.bat', '启动Windows节点_A6000.bat']);

function sourceFile(relative) {
  const parts = relative.replaceAll('\\', '/').split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) return false;
  if (parts.some(part => ['data', 'node_modules', '__pycache__', '.git', '.venv'].includes(part))) return false;
  const name = parts.at(-1);
  if (name.startsWith('.env') || /\.(?:pem|key|pfx|p12|pyc|log)$/i.test(name)) return false;
  if (['llm.json', 'config.json'].includes(name) || /^worker-state.*\.json$/.test(name)) return false;
  return parts.length > 1 ? SOURCE_DIRS.has(parts[0]) : ROOT_FILES.has(name);
}

function snapshot(source, destination) {
  const tracked = execFileSync('git', ['-C', source, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    {encoding:'utf8', maxBuffer:16 * 1024 * 1024});
  const sourceRoot = fs.realpathSync(source);
  let copied = 0;
  for (const relative of new Set(tracked.split('\0').filter(sourceFile))) {
    const from = path.join(source, relative);
    if (!fs.existsSync(from)) continue;
    const stat = fs.lstatSync(from);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Not a regular source file: ${relative}`);
    const resolved = path.relative(sourceRoot, fs.realpathSync(from));
    if (resolved.startsWith('..') || path.isAbsolute(resolved)) throw new Error(`Source escapes repository: ${relative}`);
    const to = path.join(destination, relative);
    fs.mkdirSync(path.dirname(to), {recursive:true});
    fs.copyFileSync(from, to);
    copied++;
  }
  return copied;
}

function testEnvironment(root = ROOT, original = process.env) {
  const env = {...original};
  // Never inherit the running controller's configuration or credentials into the test process.
  for (const name of Object.keys(env)) {
    if ((name.startsWith('CHOUKA_') && !name.startsWith('CHOUKA_TEST_'))
      || /^(?:COMFY|COMFYUI|YOUDAO|DINGTALK|IF|IFS|LLM)_/.test(name)) delete env[name];
  }
  const embedded = path.resolve(root, '../python_embeded/python.exe');
  env.CHOUKA_TEST_PYTHON = original.CHOUKA_TEST_PYTHON
    || (fs.existsSync(embedded) ? embedded : process.platform === 'win32' ? 'python' : 'python3');
  env.CHOUKA_TEST_BROWSER = original.CHOUKA_TEST_BROWSER || 'chromium';
  env.PYTHONIOENCODING = 'utf-8';
  env.PYTHONDONTWRITEBYTECODE = '1';
  env.NODE_PATH = [path.join(root, 'node_modules'), original.NODE_PATH].filter(Boolean).join(path.delimiter);
  const cache = process.platform === 'win32' ? original.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
    : process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Caches')
    : original.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  env.PLAYWRIGHT_BROWSERS_PATH = original.PLAYWRIGHT_BROWSERS_PATH || path.join(cache, 'ms-playwright');
  return env;
}

async function run(command, args, cwd, env, logFile) {
  const log = fs.createWriteStream(logFile);
  const started = Date.now();
  return new Promise(resolve => {
    const child = spawn(command, args, {cwd, env, windowsHide:true, stdio:['ignore', 'pipe', 'pipe']});
    child.stdout.on('data', chunk => { process.stdout.write(chunk); log.write(chunk); });
    child.stderr.on('data', chunk => { process.stderr.write(chunk); log.write(chunk); });
    child.on('error', error => { console.error(error.message); log.write(`${error.stack}\n`); });
    child.on('close', (code, signal) => {
      log.end(() => resolve({code:code ?? 1, signal, seconds:(Date.now() - started) / 1000, log:logFile}));
    });
  });
}

async function main() {
  const [suite = 'all', ...files] = process.argv.slice(2);
  if (!['all', 'python', 'web'].includes(suite) || (suite === 'all' && files.length)) {
    throw new Error('Usage: node tools/run-tests.cjs all|python|web [test_file ...]');
  }
  const extension = suite === 'python' ? '.py' : '.cjs';
  for (const file of files) {
    if (!/^test_[A-Za-z0-9_]+\.(?:py|cjs)$/.test(file) || !file.endsWith(extension)
      || !fs.existsSync(path.join(ROOT, 'tests', file))) throw new Error(`Invalid test file: ${file}`);
  }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chouka-regression-'));
  const env = testEnvironment();
  if (suite !== 'python' && !env.CHOUKA_TEST_FFMPEG) {
    env.CHOUKA_TEST_FFMPEG = execFileSync(env.CHOUKA_TEST_PYTHON,
      ['-B', '-X', 'utf8', '-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],
      {encoding:'utf8', env}).trim();
  }
  const report = {revision:execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD'], {encoding:'utf8'}).trim(),
    source:'working-tree snapshot, excluding runtime data and credentials', directory,
    runtime:{node:process.version, python:env.CHOUKA_TEST_PYTHON, browser:env.CHOUKA_TEST_BROWSER,
      ffmpeg:env.CHOUKA_TEST_FFMPEG || null}, suites:{}};
  console.log(`Isolated test snapshots and logs: ${directory}`);
  for (const kind of suite === 'all' ? ['python', 'web'] : [suite]) {
    const cwd = path.join(directory, kind);
    fs.mkdirSync(cwd);
    const copied = snapshot(ROOT, cwd);
    const home = path.join(directory, `${kind}-home`), temporary = path.join(directory, `${kind}-tmp`);
    fs.mkdirSync(home);
    fs.mkdirSync(temporary);
    const local = path.join(home, 'AppData', 'Local'), roaming = path.join(home, 'AppData', 'Roaming');
    fs.mkdirSync(local, {recursive:true});
    fs.mkdirSync(roaming, {recursive:true});
    const suiteEnv = {...env, HOME:home, USERPROFILE:home, APPDATA:roaming, LOCALAPPDATA:local,
      XDG_CONFIG_HOME:path.join(home, '.config'), TMP:temporary, TEMP:temporary};
    let command, args;
    if (kind === 'python') {
      command = env.CHOUKA_TEST_PYTHON;
      const script = [
        'import sys, unittest',
        'from pathlib import Path',
        'root = Path.cwd()',
        'sys.path[:0] = [str(root), str(root / "tests")]',
        'loader = unittest.defaultTestLoader',
        'suite = loader.loadTestsFromNames([Path(p).stem for p in sys.argv[1:]]) if len(sys.argv) > 1 else loader.discover(str(root / "tests"), pattern="test_*.py")',
        'result = unittest.TextTestRunner(verbosity=2).run(suite)',
        'sys.exit(0 if result.wasSuccessful() else 1)',
      ].join('\n');
      args = ['-B', '-X', 'utf8', '-c', script, ...files];
    } else {
      command = process.execPath;
      const selected = files.length ? files : fs.readdirSync(path.join(cwd, 'tests')).filter(name => /^test_.*\.cjs$/.test(name)).sort();
      args = ['--test', '--test-concurrency=1', ...selected.map(name => path.join(cwd, 'tests', name))];
    }
    report.suites[kind] = {copied, ...await run(command, args, cwd, suiteEnv, path.join(directory, `${kind}.log`))};
    fs.writeFileSync(path.join(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  }
  console.log(`Regression report: ${path.join(directory, 'report.json')}`);
  process.exitCode = Object.values(report.suites).some(result => result.code !== 0) ? 1 : 0;
}

if (require.main === module) main().catch(error => { console.error(error.stack); process.exitCode = 1; });
module.exports = {sourceFile, snapshot, testEnvironment};
