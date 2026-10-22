// Check that modularize.js is idempotent: running it twice must not change
// the file the second time.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const run = () => execFileSync(process.execPath, [path.join(__dirname, 'modularize.js')], { cwd: ROOT, stdio: 'pipe' });

const before = fs.readFileSync(INDEX, 'utf8');
run();
const once = fs.readFileSync(INDEX, 'utf8');
run();
const twice = fs.readFileSync(INDEX, 'utf8');

if (once === twice) {
  console.log('OK   modularize.js is idempotent');
} else {
  const a = once.split('\n');
  const b = twice.split('\n');
  console.log('FAIL modularize.js is not idempotent (' + a.length + ' vs ' + b.length + ' lines)');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      console.log('  line ' + (i + 1) + ':');
      console.log('    run 1: ' + JSON.stringify(a[i]));
      console.log('    run 2: ' + JSON.stringify(b[i]));
      break;
    }
  }
  process.exit(1);
}
