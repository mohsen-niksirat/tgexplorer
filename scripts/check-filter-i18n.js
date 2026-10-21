// Verify the advanced-filter i18n keys exist for all 7 languages.
const fs = require('fs');
const path = require('path');

const s = fs.readFileSync(path.join(__dirname, '..', 'js', 'i18n.js'), 'utf8');
const langs = ['en', 'fa', 'ar', 'zh', 'ru', 'es', 'fr'];
const keys = ['filters', 'share_filters', 'clear_filters', 'by_activity', 'filter_channels', 'filter_none'];

let ok = true;
for (const k of keys) {
  const missing = langs.filter(l => !s.includes(`I18N_UI.${l}.${k}=`));
  console.log((missing.length ? 'MISS ' : 'OK   ') + k + (missing.length ? ' -> missing: ' + missing.join(',') : ''));
  if (missing.length) ok = false;
}

// The Persian strings must not be mojibake.
const fa = s.slice(s.indexOf("I18N_UI.fa.filters="), s.indexOf("I18N_UI.fa.filters=") + 120);
console.log('\nfa sample: ' + fa);
console.log(/\uFFFD/.test(fa) ? 'FAIL mojibake' : 'OK   utf-8 clean');
process.exit(ok ? 0 : 1);
