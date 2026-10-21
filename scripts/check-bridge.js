// List the bridge names that are NOT defined as a function/const in the
// module body — assigning an undefined identifier throws a ReferenceError.
const fs = require('fs');
const path = require('path');

const s = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const bridgeMatch = s.match(/Object\.assign\(window, \{([\s\S]*?)\}\);/);
const names = bridgeMatch[1]
  .split('\n')
  .map(l => l.trim().replace(/,$/, ''))
  .filter(l => l && !l.startsWith('//'));

const body = s.slice(0, bridgeMatch.index);

// Names imported from the ES modules are defined too.
const imported = new Set();
for (const mm of body.matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
  for (const part of mm[1].split(',')) {
    const name = part.trim().split(/\s+as\s+/).pop().trim();
    if (name) imported.add(name);
  }
}

const missing = [];
for (const n of names) {
  if (imported.has(n)) continue;
  const esc = n.replace(/\$/g, '\\$');
  const re = new RegExp('(^|[^\\w$.])' + esc + '\\s*(=[^=]|function\\s+' + esc + '\\s*\\(|\\()', 'm');
  if (!re.test(body)) missing.push(n);
}
console.log('bridge entries:', names.length);
console.log(missing.length ? 'missing (' + missing.length + '):\n  ' + missing.join('\n  ')
                           : 'all bridge names are defined');
