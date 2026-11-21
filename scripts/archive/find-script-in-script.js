// Find "<script" inside the inline scripts — the HTML parser treats it as
// the start of a "script data double escaped" state, so the first
// </script> no longer ends the element.
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');

const re = /<script([^>]*)>([\s\S]*?)<\/script>/g;
let m;
let i = 0;
while ((m = re.exec(src)) !== null) {
  i++;
  const code = m[2];
  const hits = [];
  code.split('\n').forEach((l, n) => {
    if (/<script/i.test(l)) hits.push({ line: n + 1, text: l.trim().slice(0, 140) });
  });
  if (hits.length) {
    console.log('script #' + i + ' (' + (m[1].trim() || 'classic') + ') contains "<script":');
    hits.forEach(h => console.log('   line ' + h.line + ': ' + h.text));
  }
}
if (i === 0) console.log('no inline scripts found');
