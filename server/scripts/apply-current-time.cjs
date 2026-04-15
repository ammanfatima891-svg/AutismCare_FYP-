/**
 * Replaces zero-arg `new Date()` and `Date.now()` with getCurrentTime() / getCurrentTimeMs()
 * and injects the correct `require()` for `server/src/utils/time.js`.
 *
 * Run: node server/scripts/apply-current-time.cjs
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const SKIP = new Set(['time.js']);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.isFile() && ent.name.endsWith('.js')) out.push(p);
  }
  return out;
}

function requirePath(fromFile) {
  const rel = path.relative(path.dirname(fromFile), path.join(SRC, 'utils', 'time.js'));
  const posix = rel.split(path.sep).join('/');
  if (!posix.startsWith('.')) return `./${posix}`;
  return posix;
}

function injectRequire(content, reqPath) {
  if (/require\([^)]*utils\/time['"]\)|require\([^)]*'\.\/time['"]\)/.test(content)) return content;
  const line = `const { getCurrentTime, getCurrentTimeMs } = require('${reqPath}');\n`;
  let s = content;
  if (s.startsWith('#!')) {
    const nl = s.indexOf('\n');
    return s.slice(0, nl + 1) + line + s.slice(nl + 1);
  }
  const strict = /^(['"])use strict\1;\r?\n/;
  const m = s.match(strict);
  if (m) return s.slice(0, m[0].length) + line + s.slice(m[0].length);
  return line + s;
}

function main() {
  const files = walk(SRC).filter((f) => !SKIP.has(path.basename(f)));
  let changed = 0;
  for (const file of files) {
    let s = fs.readFileSync(file, 'utf8');
    const orig = s;
    s = s.replace(/\bDate\.now\(\)/g, 'getCurrentTimeMs()');
    s = s.replace(/\bnew Date\(\s*\)/g, 'getCurrentTime()');
    if (s === orig) continue;
    const needs =
      s.includes('getCurrentTime()') ||
      s.includes('getCurrentTimeMs()') ||
      s.includes('getCurrentTime,') ||
      s.includes('getCurrentTimeMs,');
    if (!needs) continue;
    const reqPath = requirePath(file);
    s = injectRequire(s, reqPath);
    fs.writeFileSync(file, s, 'utf8');
    changed += 1;
    console.log('updated', path.relative(SRC, file));
  }
  console.log('done, files touched:', changed);
}

main();
