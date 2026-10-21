// Escape the strings before they are written into js/i18n.js.
//
// An apostrophe inside a single-quoted JS string breaks the file - and the
// app then fails to boot with "Unexpected identifier". The French privacy
// text had "Rien n'est envoyé." for exactly that reason.
//
// The value of an assignment runs until the next ";" that is not inside a
// string, so the scan below simply takes everything up to the next
// semicolon and escapes the apostrophes in it.
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'js', 'i18n.js');
let s = fs.readFileSync(p, 'utf8');
const before = s;

const startRe = /(I18N(?:_UI)?\.[a-z]{2}\.[A-Za-z0-9_]+=)'/g;
let out = '';
let last = 0;
let m;
let fixed = 0;

while ((m = startRe.exec(s)) !== null) {
  const valueStart = m.index + m[0].length;
  const end = s.indexOf("';", valueStart);
  if (end === -1) continue;
  const value = s.slice(valueStart, end);
  if (!value.includes("'")) continue;

  out += s.slice(last, valueStart);
  out += value.replace(/'/g, "\\'");
  last = end;
  fixed++;
  startRe.lastIndex = end;
}
out += s.slice(last);

fs.writeFileSync(p, out, 'utf8');
console.log('escaped the apostrophes in ' + fixed + ' string(s)');
console.log(before === out ? 'nothing changed' : 'the file was rewritten');
