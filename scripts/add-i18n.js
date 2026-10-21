// Add UI strings for the 7 supported languages to js/i18n.js.
//
//   node scripts/add-i18n.js
//
// Idempotent: a key that already exists is skipped, so the script can be
// re-run after adding a language.
const fs = require('fs');
const path = require('path');

const LANGS = ['en', 'fa', 'ar', 'zh', 'ru', 'es', 'fr'];

// [key, en, fa, ar, zh, ru, es, fr]
const ROWS = [
  ['posts_per_day', '📊 Posts / day', '📊 پست در روز', '📊 المنشورات في اليوم', '📊 每日帖子', '📊 Постов в день', '📊 Publicaciones por día', '📊 Publications par jour'],
  ['total_posts', '🗂 Total posts', '🗂 مجموع پست‌ها', '🗂 إجمالي المنشورات', '🗂 帖子总数', '🗂 Всего постов', '🗂 Total de publicaciones', '🗂 Total des publications'],
  ['last_post', '🕐 Last post', '🕐 آخرین پست', '🕐 آخر منشور', '🕐 最新帖子', '🕐 Последний пост', '🕐 Última publicación', '🕐 Dernière publication'],
  ['active_days', '📅 Active days', '📅 روزهای فعال', '📅 الأيام النشطة', '📅 活跃天数', '📅 Активных дней', '📅 Días activos', '📅 Jours actifs'],
  ['content_tags', '🏷 Content tags', '🏷 برچسب‌های محتوا', '🏷 وسوم المحتوى', '🏷 内容标签', '🏷 Теги контента', '🏷 Etiquetas de contenido', '🏷 Étiquettes de contenu'],
  ['no_activity', 'No activity in this period', 'فعالیتی در این بازه نیست', 'لا يوجد نشاط في هذه الفترة', '此期间没有活动', 'Нет активности за этот период', 'Sin actividad en este periodo', 'Aucune activité sur cette période'],
  ['never', 'Never', 'هرگز', 'أبداً', '从未', 'Никогда', 'Nunca', 'Jamais'],
  ['activity_30d', '📊 Activity (30 days)', '📊 فعالیت (۳۰ روز)', '📊 النشاط (30 يوماً)', '📊 活跃度（30 天）', '📊 Активность (30 дней)', '📊 Actividad (30 días)', '📊 Activité (30 jours)'],
  ['share_link', '🔗 Share link', '🔗 اشتراک‌گذاری لینک', '🔗 مشاركة الرابط', '🔗 分享链接', '🔗 Поделиться ссылкой', '🔗 Compartir enlace', '🔗 Partager le lien'],
];

const p = path.join(__dirname, '..', 'js', 'i18n.js');
let s = fs.readFileSync(p, 'utf8');

const lines = [];
for (const row of ROWS) {
  const [key, ...values] = row;
  if (values.length !== LANGS.length) {
    console.error(`row "${key}" needs ${LANGS.length} values, got ${values.length}`);
    process.exit(1);
  }
  if (s.includes(`I18N.en.${key}=`)) {
    console.log('skip (exists): ' + key);
    continue;
  }
  lines.push(LANGS.map((l, i) => `I18N.${l}.${key}='${values[i]}'`).join(';') + ';');
}

if (!lines.length) { console.log('nothing to add'); process.exit(0); }

// Insert after the last I18N_UI assignment so the file stays readable.
const fileLines = s.split('\n');
let at = -1;
for (let i = 0; i < fileLines.length; i++) {
  if (fileLines[i].includes('I18N_UI.fr.')) at = i + 1;
}
if (at === -1) { console.error('could not find the I18N_UI block'); process.exit(1); }
fileLines.splice(at, 0, ...lines);
s = fileLines.join('\n');

fs.writeFileSync(p, s, 'utf8');
console.log('added ' + lines.length + ' keys');

let ok = true;
for (const [key] of ROWS) {
  const missing = LANGS.filter(l => !s.includes(`I18N.${l}.${key}=`));
  if (missing.length) { ok = false; console.log('MISS ' + key + ' -> ' + missing.join(',')); }
}
console.log(ok ? 'all keys present for all 7 languages' : 'FAILED');
console.log(/\uFFFD/.test(s) ? 'FAIL mojibake in the file' : 'OK   utf-8 clean');
