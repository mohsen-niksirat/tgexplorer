// Parse the inline module exactly as the browser does (imports included) so
// the real syntax error is reported.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const m = src.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!m) { console.error('module block not found'); process.exit(1); }

const tmp = path.join(require('os').tmpdir(), 'tg-module-real.mjs');
fs.writeFileSync(tmp, m[1], 'utf8');

try {
  execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
  console.log('the inline module parses cleanly');
} catch (e) {
  console.log(e.stderr.toString().split('\n').slice(0, 10).join('\n'));
  process.exit(1);
}
