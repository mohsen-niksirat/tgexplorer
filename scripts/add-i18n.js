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
  ['psr_summary', '{0} matches in {1} channels', '{0} نتیجه در {1} کانال', '{0} نتيجة في {1} قناة', '{0} 条结果，来自 {1} 个频道', '{0} совпадений в {1} каналах', '{0} coincidencias en {1} canales', '{0} résultats dans {1} chaînes'],
  ['psr_deep', '🔍 Search the full archive', '🔍 جست‌وجو در کل آرشیو', '🔍 ابحث في الأرشيف الكامل', '🔍 搜索完整归档', '🔍 Искать во всём архиве', '🔍 Buscar en el archivo completo', '🔍 Rechercher dans les archives'],
  ['psr_deep_progress', '⏳ Searching {0}/{1}…', '⏳ در حال جست‌وجو {0}/{1}…', '⏳ جارٍ البحث {0}/{1}…', '⏳ 正在搜索 {0}/{1}…', '⏳ Поиск {0}/{1}…', '⏳ Buscando {0}/{1}…', '⏳ Recherche {0}/{1}…'],
  ['psr_empty', 'No post mentions this', 'هیچ پستی به این موضوع اشاره نکرده', 'لا يوجد منشور يذكر هذا', '没有帖子提到此内容', 'Ни один пост не упоминает это', 'Ninguna publicación lo menciona', 'Aucune publication ne le mentionne'],
  ['psr_empty_desc', 'Try another word, or search the full archive', 'کلمهٔ دیگری را امتحان کنید یا کل آرشیو را بگردید', 'جرّب كلمة أخرى أو ابحث في الأرشيف الكامل', '换一个词，或搜索完整归档', 'Попробуйте другое слово или ищите во всём архиве', 'Prueba otra palabra o busca en el archivo completo', 'Essayez un autre mot ou cherchez dans les archives'],
  ['psr_placeholder', 'Search inside posts…', 'جست‌وجو در متن پست‌ها…', 'ابحث داخل المنشورات…', '搜索帖子内容…', 'Искать в постах…', 'Buscar dentro de las publicaciones…', 'Rechercher dans les publications…'],
  ['psr_mode_channels', '🔎 Channels', '🔎 کانال‌ها', '🔎 القنوات', '🔎 频道', '🔎 Каналы', '🔎 Canales', '🔎 Chaînes'],
  ['psr_mode_posts', '💬 Posts', '💬 پست‌ها', '💬 المنشورات', '💬 帖子', '💬 Посты', '💬 Publicaciones', '💬 Publications'],
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
