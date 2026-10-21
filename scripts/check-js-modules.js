// Syntax-check the ES modules under js/ by copying them to .mjs files
// (node --check cannot parse ESM in a .js file).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const os = require('os');

const JS_DIR = path.join(__dirname, '..', 'js');
let ok = true;
for (const file of fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js'))) {
  const tmp = path.join(os.tmpdir(), 'tg-check-' + file.replace(/\.js$/, '.mjs'));
  fs.writeFileSync(tmp, fs.readFileSync(path.join(JS_DIR, file), 'utf8'), 'utf8');
  try {
    execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
    console.log('OK   js/' + file);
  } catch (e) {
    ok = false;
    console.log('FAIL js/' + file);
    console.log(e.stderr.toString().split('\n').slice(0, 8).join('\n'));
  }
}
process.exit(ok ? 0 : 1);
