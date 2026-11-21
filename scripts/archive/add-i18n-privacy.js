// Add the privacy-section UI strings to js/i18n.js.
// Run once: node scripts/add-i18n-privacy.js
const fs = require('fs');
const path = require('path');

const LANGS = ['en', 'fa', 'ar', 'zh', 'ru', 'es', 'fr'];

const ROWS = [
  ['no_tracking', 'No tracking', 'بدون ردیابی', 'بدون تتبع', '无追踪', 'Без слежки', 'Sin rastreo', 'Sans suivi'],
  ['privacy_title', 'Your data stays on your device', 'داده‌های شما روی دستگاه خودتان می‌ماند', 'بياناتك تبقى على جهازك', '您的数据只留在您的设备上', 'Ваши данные остаются на вашем устройстве', 'Tus datos se quedan en tu dispositivo', 'Vos données restent sur votre appareil'],
  ['privacy_local', '📱 Saved locally', '📱 ذخیرهٔ محلی', '📱 محفوظ محلياً', '📱 本地保存', '📱 Локально', '📱 Guardado localmente', '📱 Enregistré localement'],
  ['privacy_local_desc', 'favourites, folders, settings and filters are stored in this browser\'s localStorage. Nothing is uploaded.', 'علاقه‌مندی‌ها، فولدرها، تنظیمات و فیلترها در localStorage همین مرورگر ذخیره می‌شوند. چیزی آپلود نمی‌شود.', 'المفضلة والمجلدات والإعدادات تحفظ في localStorage لهذا المتصفح. لا يتم رفع أي شيء.', '收藏夹、文件夹、设置和筛选条件都保存在此浏览器的 localStorage 中，不会上传任何内容。', 'Избранное, папки, настройки и фильтры хранятся в localStorage этого браузера. Ничего не отправляется.', 'Tus favoritos, carpetas, ajustes y filtros se guardan en el localStorage de este navegador. No se sube nada.', 'Vos favoris, dossiers, réglages et filtres sont stockés dans le localStorage de ce navigateur. Rien n\'est envoyé.'],
  ['privacy_worker', '☁️ Worker (optional)', '☁️ ورکر (اختیاری)', '☁️ الوسيط (اختياري)', '☁️ Worker（可选）', '☁️ Worker (необязательно)', '☁️ Worker (opcional)', '☁️ Worker (facultatif)'],
  ['privacy_worker_desc', 'if you connect your own Cloudflare Worker, only your search queries and the channels you open are sent to it. The Worker keeps a short-lived cache; it never stores your favourites.', 'اگر ورکر خودتان را وصل کنید، فقط جست‌وجوها و کانال‌هایی که باز می‌کنید به آن ارسال می‌شود. ورکر فقط یک کش کوتاه‌مدت دارد و علاقه‌مندی‌های شما را ذخیره نمی‌کند.', 'عند ربط وسيطك الخاص، ترسل إليه فقط عمليات البحث والقنوات التي تفتحها. يحتفظ الوسيط بذاكرة مؤقتة قصيرة ولا يخزن مفضلاتك.', '如果连接你自己的 Cloudflare Worker，只有搜索词和你打开的频道会被发送给它。Worker 只保留一个短期缓存，绝不存储你的收藏。', 'Если вы подключите свой Cloudflare Worker, ему отправляются только поисковые запросы и открытые каналы. Worker хранит недолгий кэш и никогда не сохраняет ваше избранное.', 'Si conectas tu propio Cloudflare Worker, solo se le envían tus búsquedas y los canales que abres. El Worker guarda una caché breve y nunca almacena tus favoritos.', 'Si vous connectez votre propre Worker Cloudflare, seules vos recherches et les canaux que vous ouvrez lui sont envoyés. Le Worker garde un cache court et ne conserve jamais vos favoris.'],
  ['privacy_analytics', '📊 Analytics', '📊 تحلیل کاربرد', '📊 التحليلات', '📊 统计分析', '📊 Аналитика', '📊 Analítica', '📊 Statistiques'],
  ['privacy_analytics_desc', 'the page views are counted by Cloudflare Web Analytics (if the site is hosted there). No cookies, no fingerprinting, no third-party trackers.', 'بازدیدهای صفحه توسط Cloudflare Web Analytics شمرده می‌شود (اگر سایت روی Cloudflare باشد). هیچ کوکی، اثر انگشت یا ردیاب شخص ثالث وجود ندارد.', 'تحسب مشاهدات الصفحة بواسطة Cloudflare Web Analytics (إذا كان الموقع مستضافا هناك). لا ملفات تعريف ارتباط ولا بصمات ولا أدوات تتبع خارجية.', '页面浏览量由 Cloudflare Web Analytics 统计（如果站点托管在 Cloudflare）。没有 Cookie、没有指纹识别、没有第三方追踪器。', 'Просмотры страниц считаются Cloudflare Web Analytics (если сайт размещён там). Ни cookie, ни снятия отпечатка, ни сторонних трекеров.', 'Las visitas se cuentan con Cloudflare Web Analytics (si el sitio está alojado allí). Sin cookies, sin huellas y sin rastreadores de terceros.', 'Les pages vues sont comptées par Cloudflare Web Analytics (si le site y est hébergé). Aucun cookie, aucun pistage, aucun traceur tiers.'],
  ['privacy_read_more', 'Read the details →', 'جزئیات بیشتر ←', 'اقرأ التفاصيل ←', '查看详情 →', 'Подробнее →', 'Ver los detalles →', 'En savoir plus →'],
];

const p = path.join(__dirname, '..', 'js', 'i18n.js');
let s = fs.readFileSync(p, 'utf8');

const lines = [];
for (const [key, ...values] of ROWS) {
  if (values.length !== LANGS.length) {
    console.error(`row "${key}" needs ${LANGS.length} values, got ${values.length}`);
    process.exit(1);
  }
  if (s.includes(`I18N.en.${key}=`)) { console.log('skip (exists): ' + key); continue; }
  lines.push(LANGS.map((l, i) => `I18N.${l}.${key}='${values[i]}'`).join(';') + ';');
}

if (!lines.length) { console.log('nothing to add'); process.exit(0); }

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
