// Check that every language has every string.
//
//   node scripts/check-i18n.js
//
// English is the reference: a key that is missing in another language is a
// missing translation, and a key that no language has is a leftover.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const I18N_DIR = path.join(ROOT, 'i18n');
const LANGS = ['en', 'fa', 'ar', 'zh', 'ru', 'es', 'fr'];
const REFERENCE = 'en';

const data = {};
for (const lang of LANGS) {
  const file = path.join(I18N_DIR, lang + '.json');
  if (!fs.existsSync(file)) { console.error('missing file: i18n/' + lang + '.json'); process.exit(1); }
  data[lang] = JSON.parse(fs.readFileSync(file, 'utf8'));
}

const keysOf = (lang, group) => Object.keys(data[lang][group] || {});
const refMain = keysOf(REFERENCE, 'main');
const refUi = keysOf(REFERENCE, 'ui');
const refAll = new Set([...refMain.map(k => 'main.' + k), ...refUi.map(k => 'ui.' + k)]);

let missing = 0;
let extra = 0;

console.log('=== missing translations ===');
for (const lang of LANGS) {
  if (lang === REFERENCE) continue;
  const have = new Set([
    ...keysOf(lang, 'main').map(k => 'main.' + k),
    ...keysOf(lang, 'ui').map(k => 'ui.' + k),
  ]);
  const gaps = [...refAll].filter(k => !have.has(k));
  const surplus = [...have].filter(k => !refAll.has(k));
  missing += gaps.length;
  extra += surplus.length;
  console.log('  ' + lang + ': ' + (gaps.length ? gaps.length + ' missing' : 'complete') +
    (surplus.length ? ', ' + surplus.length + ' extra' : ''));
  if (gaps.length) console.log('     ' + gaps.join(', '));
}

// A key that English does not have is dead weight in the other files.
for (const lang of LANGS) {
  const have = new Set([
    ...keysOf(lang, 'main').map(k => 'main.' + k),
    ...keysOf(lang, 'ui').map(k => 'ui.' + k),
  ]);
  const orphans = [...have].filter(k => !refAll.has(k));
  if (orphans.length) console.log('  ' + lang + ' has ' + orphans.length + ' keys English does not have: ' + orphans.slice(0, 8).join(', '));
}

// An empty translation is as good as a missing one.
let empty = 0;
for (const lang of LANGS) {
  for (const group of ['main', 'ui']) {
    for (const [k, v] of Object.entries(data[lang][group] || {})) {
      if (typeof v !== 'string' || !v.trim()) { console.log('  empty: ' + lang + '.' + group + '.' + k); empty++; }
    }
  }
}

console.log('\n' + LANGS.length + ' languages, ' + refAll.size + ' strings, ' + missing + ' missing, ' + empty + ' empty');
if (missing || empty) {
  console.error('::error::The translations are incomplete');
  process.exit(1);
}
console.log('OK   every language has every string');
