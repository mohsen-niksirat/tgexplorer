// Check that the generated i18n module resolves the strings of every
// language (the runtime lookup and the placeholder substitution).
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'i18n.js'), 'utf8')
  .replace(/^\s*import[^;]+;\s*$/gm, '')
  .replace(/^\s*export\s+/gm, '');

const LANGS = ['en', 'fa', 'ar', 'zh', 'ru', 'es', 'fr'];
const KEYS = ['sug_done', 'notif_on', 'backup_export', 'tab_home', 'tab_feed', 'home_total',
  'renamed', 'share_page', 'filters', 'privacy_title', 'no_tracking', 'members',
  'psr_summary', 'show_more_channels', 'net_offline', 'by_activity'];

let ok = true;
for (const lang of LANGS) {
  const m = new Function('const state={lang:' + JSON.stringify(lang) + '};' + src +
    '; return {I18N,I18N_UI,t};')();
  const missing = KEYS.filter(k => m.t(k) === k);
  if (missing.length) { ok = false; console.log('  MISS ' + lang + ': ' + missing.join(', ')); }
}
console.log(ok ? 'OK   every language resolves the sample strings' : 'FAILED');

// The placeholder substitution still works.
const m = new Function('const state={lang:"en"};' + src + '; return {t};')();
const sample = m.t('psr_summary', 7, 3);
console.log('the placeholder substitution: ' + JSON.stringify(sample));
if (sample.includes('{0}') || sample.includes('{1}')) {
  console.error('FAIL the placeholders were not replaced');
  process.exit(1);
}
console.log('OK   the placeholders are replaced');
