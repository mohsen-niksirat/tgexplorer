// Escape the strings before they are written into js/i18n.js.
//
// An apostrophe inside a single-quoted JS string breaks the file - and the
// app then fails to boot with "Unexpected identifier". The French privacy
// text had "Rien n'est envoyé." for exactly that reason.
//
// The generated format puts one assignment per line:
//
//     I18N.en.some_key='the value';
//
// so the value of an assignment is everything between the first quote and
// the last quote of that line. Escaping every apostrophe in that range
// makes the string valid again - and it is idempotent.
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'js', 'i18n.js');
const src = fs.readFileSync(p, 'utf8');

const assignmentRe = /(I18N(?:_UI)?\.[a-z]{2}\.[A-Za-z0-9_]+=)'([^'\n]*)'/g;
let fixed = 0;

const out = src.replace(assignmentRe, (m, head, value) => {
  if (!value.includes("'")) return m;
  // Unescape first, then escape exactly once.
  const plain = value.replace(/\\'/g, "'");
  fixed++;
  return head + "'" + plain.replace(/'/g, "\\'") + "'";
});

fs.writeFileSync(p, out, 'utf8');
console.log('escaped the apostrophes in ' + fixed + ' string(s)');
