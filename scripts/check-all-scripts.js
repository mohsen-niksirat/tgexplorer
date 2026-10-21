// Parse every inline script of index.html and report which one is broken.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const os = require('os');

const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');

const re = /<script([^>]*)>([\s\S]*?)<\/script>/g;
let m;
let i = 0;
while ((m = re.exec(src)) !== null) {
  i++;
  const attrs = m[1].trim();
  const code = m[2];
  const isModule = /type="module"/.test(attrs);
  const tmp = path.join(os.tmpdir(), `tg-script-${i}.${isModule ? 'mjs' : 'js'}`);
  fs.writeFileSync(tmp, code, 'utf8');
  try {
    execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
    console.log(`script #${i} (${attrs || 'classic'}): OK (${code.length} chars)`);
  } catch (e) {
    console.log(`script #${i} (${attrs || 'classic'}): BROKEN`);
    console.log(e.stderr.toString().split('\n').slice(0, 8).join('\n'));
    // show the offending line
    const line = (e.stderr.toString().match(/tg-script-\d+\.\w+:(\d+)/) || [])[1];
    if (line) {
      const lines = code.split('\n');
      console.log('  >>> ' + lines[Number(line) - 1]);
    }
  }
}
