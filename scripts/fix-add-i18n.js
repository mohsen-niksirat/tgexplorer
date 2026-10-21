// Fix add-i18n.js: the two rows ended up inside the "lines" array instead
// of the "ROWS" array, and repair js/i18n.js with them in the right place.
const fs = require('fs');
const path = require('path');

const ROWS = [
  "  ['show_more_channels', 'Show more channels', 'نمایش کانال‌های بیشتر', 'عرض المزيد من القنوات', '显示更多频道', 'Показать больше каналов', 'Mostrar más canales', 'Afficher plus de chaînes'],",
  "  ['share_page', '📄 Share page', '📄 صفحهٔ اشتراک', '📄 صفحة المشاركة', '📄 分享页面', '📄 Страница публикации', '📄 Página para compartir', '📄 Page de partage'],",
];

// --- 1) repair add-i18n.js ---------------------------------------------------
const p = path.join(__dirname, 'add-i18n.js');
let s = fs.readFileSync(p, 'utf8');

// Remove the misplaced rows (the ones inside the "lines" array).
for (const row of ROWS) {
  const key = row.split(',')[0].trim();
  const wrong = 'const lines = [' + row;
  if (s.includes(wrong)) {
    s = s.replace(wrong, 'const lines = [');
    console.log('removed the misplaced ' + key + ' from the lines array');
  }
  // Also remove a leftover bare copy.
  s = s.split('\n').filter(l => !l.trim().startsWith(key + ',') && !l.trim().startsWith(key + ',')).join('\n');
}

// Insert the rows into the ROWS array.
const rowsStart = s.indexOf('const ROWS = [');
if (rowsStart === -1) { console.error('the ROWS array was not found'); process.exit(1); }
const rowsEnd = s.indexOf('];', rowsStart);
if (rowsEnd === -1) { console.error('the end of the ROWS array was not found'); process.exit(1); }
const block = s.slice(rowsStart, rowsEnd);
const missing = ROWS.filter(r => !block.includes(r.split(',')[0].trim()));
if (missing.length) {
  s = s.slice(0, rowsEnd) + '\n' + missing.join('\n') + '\n' + s.slice(rowsEnd);
  console.log('added ' + missing.length + ' row(s) to the ROWS array');
}
fs.writeFileSync(p, s, 'utf8');

// --- 2) rebuild js/i18n.js --------------------------------------------------
const i18nPath = path.join(__dirname, '..', 'js', 'i18n.js');
let i18n = fs.readFileSync(i18nPath, 'utf8');
// Drop the broken raw lines.
i18n = i18n.split('\n').filter(l => !/^(show_more_channels|share_page),/.test(l)).join('\n');
fs.writeFileSync(i18nPath, i18n, 'utf8');
console.log('cleaned js/i18n.js');
