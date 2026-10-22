// Extract the translations from js/i18n.js into one JSON file per language.
//
//   node scripts/extract-i18n.js
//
// The JSON files under i18n/ are the source of truth from then on;
// scripts/build-i18n.js generates js/i18n.js from them and
// scripts/check-i18n.js verifies that no translation is missing.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'i18n');
const LANGS = ['en', 'fa', 'ar', 'zh', 'ru', 'es', 'fr'];

const src = fs.readFileSync(path.join(ROOT, 'js', 'i18n.js'), 'utf8')
  .replace(/^\s*import[^;]+;\s*$/gm, '')
  .replace(/^\s*export\s+/gm, '');

// The module only defines things at the top level, so evaluating it is safe.
const data = new Function(src + '; return { I18N, I18N_UI };')();

fs.mkdirSync(OUT, { recursive: true });
let total = 0;
for (const lang of LANGS) {
  const main = data.I18N[lang] || {};
  const ui = data.I18N_UI[lang] || {};
  const out = { main, ui };
  const file = path.join(OUT, lang + '.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n', 'utf8');
  const n = Object.keys(main).length + Object.keys(ui).length;
  total += n;
  console.log('wrote i18n/' + lang + '.json (' + Object.keys(main).length + ' main, ' + Object.keys(ui).length + ' ui)');
}
console.log('total: ' + total + ' strings');
