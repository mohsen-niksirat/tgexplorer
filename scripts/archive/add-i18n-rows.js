// Add the rows for "show more channels" and "share page" to add-i18n.js.
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'add-i18n.js');
let s = fs.readFileSync(p, 'utf8');

const rows = [
  "  ['show_more_channels', 'Show more channels', 'نمایش کانال‌های بیشتر', 'عرض المزيد من القنوات', '显示更多频道', 'Показать больше каналов', 'Mostrar más canales', 'Afficher plus de chaînes'],",
  "  ['share_page', '📄 Share page', '📄 صفحهٔ اشتراک', '📄 صفحة المشاركة', '📄 分享页面', '📄 Страница публикации', '📄 Página para compartir', '📄 Page de partage'],",
];

const missing = rows.filter(r => !s.includes(r.split(',')[0].trim()));
if (!missing.length) { console.log('the rows are already there'); process.exit(0); }

const i = s.lastIndexOf('];');
if (i < 0) { console.error('no "];" found'); process.exit(1); }
s = s.slice(0, i) + missing.join('\n') + '\n' + s.slice(i);
fs.writeFileSync(p, s, 'utf8');
console.log('added ' + missing.length + ' row(s) to add-i18n.js');
