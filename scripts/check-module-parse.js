// Extract the inline module from index.html and run the JS parser on it,
// so the error is reported with the real line number.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const m = src.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!m) { console.error('module block not found'); process.exit(1); }

const code = m[1]
  .replace(/^\s*import\s+[^;]+;\s*$/gm, '')
  .replace(/^\s*export\s+/gm, '');

const tmp = path.join(require('os').tmpdir(), 'tg-module-check.mjs');
fs.writeFileSync(tmp, code, 'utf8');

try {
  execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
  console.log('the inline module parses cleanly');
} catch (e) {
  console.log(e.stderr.toString().split('\n').slice(0, 12).join('\n'));
  process.exit(1);
}
