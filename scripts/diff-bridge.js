// Compare the window bridge of HEAD with the current file and show why a
// name was dropped.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const head = execSync('git show HEAD:index.html', { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
const now = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const attrRe = /\bon(?:click|keydown|change|input|submit)\s*=\s*"([^"]*)"/g;
const winRe = /\bwindow\.([A-Za-z_$][\w$]*)\s*(?=[^\w$])/g;

function scan(s) {
  const markup = new Set();
  let m;
  while ((m = attrRe.exec(s)) !== null) {
    const fnRe = /(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g;
    let f;
    while ((f = fnRe.exec(m[1])) !== null) markup.add(f[2]);
  }
  const win = new Set();
  while ((m = winRe.exec(s)) !== null) win.add(m[1]);
  return { markup, win };
}

const h = scan(head);
const n = scan(now);

console.log('renderResults in HEAD markup set :', h.markup.has('renderResults'));
console.log('renderResults in HEAD window set :', h.win.has('renderResults'));
console.log('renderResults in now  markup set :', n.markup.has('renderResults'));
console.log('renderResults in now  window set :', n.win.has('renderResults'));
console.log('toast in HEAD markup set         :', h.markup.has('toast'));

// where does it appear?
for (const [label, s] of [['HEAD', head], ['NOW', now]]) {
  const idx = s.indexOf('renderResults');
  const hits = [];
  let i = -1;
  while ((i = s.indexOf('renderResults', i + 1)) !== -1) hits.push(i);
  console.log(`\n${label}: ${hits.length} occurrences`);
  for (const p of hits.slice(0, 12)) {
    console.log('   ...' + s.slice(Math.max(0, p - 45), p + 30).replace(/\n/g, ' '));
  }
}
