'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

function filesUnder(directory) {
  return fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Source must not be a symlink: ${file}`);
    return entry.isDirectory() ? filesUnder(file) : [file];
  });
}

function checkWeb(root) {
  const web = path.join(root, 'web');
  let checked = 0;
  const errors = [];
  const check = (label, source) => {
    const result = spawnSync(process.execPath, ['--check', '-'], {input:source, encoding:'utf8'});
    checked++;
    if (result.error || result.status !== 0) errors.push(`${label}\n${result.error || result.stderr}`);
  };
  for (const file of filesUnder(web)) {
    if (!/\.(?:js|html)$/.test(file)) continue;
    const source = fs.readFileSync(file, 'utf8');
    const label = path.relative(root, file);
    if (file.endsWith('.js')) { check(label, source); continue; }
    for (const [index, match] of [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].entries()) {
      const attrs = match[1];
      const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
      if (src) {
        if (/^(?:https?:)?\/\//i.test(src)) continue;
        const clean = src.split(/[?#]/, 1)[0];
        const target = path.resolve(clean.startsWith('/') ? web : path.dirname(file), clean.replace(/^\//, ''));
        const relative = path.relative(web, target);
        if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.existsSync(target)) {
          errors.push(`${label}: missing or outside-web script ${src}`);
        }
      } else {
        const type = /\btype\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
        if (!type || /^(?:text\/javascript|application\/javascript|module)$/i.test(type)) {
          check(`${label} inline script ${index + 1}`, match[2]);
        }
      }
    }
  }
  return {checked, errors};
}

if (require.main === module) {
  const result = checkWeb(path.resolve(__dirname, '..'));
  for (const error of result.errors) console.error(error);
  console.log(`Checked ${result.checked} JavaScript sources and HTML script references.`);
  process.exitCode = result.errors.length ? 1 : 0;
}
module.exports = {checkWeb};
