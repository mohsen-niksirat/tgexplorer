// Fill in the missing translations.
//
//   node scripts/fill-i18n.js
//
// The table below holds the translations for the strings that were missing
// in ar, zh, ru, es, fr and fa.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const I18N_DIR = path.join(ROOT, 'i18n');

// key -> [ar, zh, ru, es, fr, fa]
const T = {
  tab_home: ['🏠 الرئيسية', '🏠 首页', '🏠 Главная', '🏠 Inicio', '🏠 Accueil', '🏠 خانه'],
  tab_feed: ['📸 الخلاصة', '📸 动态', '📸 Лента', '📸 Feed', '📸 Fil', '📸 فید'],
  home_empty_title: ['لا توجد قنوات مفضلة بعد', '还没有收藏频道', 'Пока нет избранных каналов', 'Aún no hay canales favoritos', 'Aucun canal favori pour le moment', 'هنوز کانال موردعلاقه‌ای ندارید'],
  home_empty_desc: ['احفظ القنوات ب ❤️ لتظهر كل منشوراتها هنا', '用 ❤️ 收藏频道，它们的帖子就会出现在这里', 'Сохраняйте каналы с помощью ❤️ — их публикации появятся здесь', 'Guarda canales con ❤️ para ver aquí todas sus publicaciones', 'Enregistrez des canaux avec ❤️ pour voir leurs publications ici', 'کانال‌ها را با ❤️ ذخیره کنید تا پست‌هایشان اینجا دیده شود'],
  home_end: ['— پایان —', '— 结束 —', '— Конец —', '— Fin —', '— Fin —', '— پایان —'],
  home_total: ['مجموع پست‌ها', '帖子总数', 'Всего постов', 'Total de publicaciones', 'Total des publications', 'مجموع پست‌ها'],
  home_today: ['امروز', '今天', 'Сегодня', 'Hoy', "Aujourd'hui", 'امروز'],
  search_live: ['🌐 جست‌وجوی زنده', '🌐 实时搜索', '🌐 Поиск в реальном времени', '🌐 Búsqueda en vivo', '🌐 Recherche en direct', '🌐 جست‌وجوی زنده'],
  search_local: ['📦 جست‌وجوی محلی', '📦 本地搜索', '📦 Локальный поиск', '📦 Búsqueda local', '📦 Recherche locale', '📦 جست‌وجوی محلی'],
  notif_on: ['🔔 الإشعارات: مفعّلة', '🔔 通知：已开启', '🔔 Уведомления: включены', '🔔 Notificaciones: activadas', '🔔 Notifications : activées', '🔔 اعلان‌ها: روشن'],
  notif_off: ['🔔 الإشعارات: متوقفة', '🔔 通知：已关闭', '🔔 Уведомления: выключены', '🔔 Notificaciones: desactivadas', '🔔 Notifications : désactivées', '🔔 اعلان‌ها: خاموش'],
  notif_enabled_toast: ['تم تفعيل الإشعارات', '已开启通知', 'Уведомления включены', 'Notificaciones activadas', 'Notifications activées', 'اعلان‌ها فعال شد'],
  notif_disabled_toast: ['تم إيقاف الإشعارات', '已关闭通知', 'Уведомления выключены', 'Notificaciones desactivadas', 'Notifications désactivées', 'اعلان‌ها غیرفعال شد'],
  notif_unsupported: ['هذا المتصفح لا يدعم الإشعارات', '此浏览器不支持通知', 'Этот браузер не поддерживает уведомления', 'Este navegador no admite notificaciones', 'Ce navigateur ne prend pas en charge les notifications', 'این مرورگر از اعلان پشتیبانی نمی‌کند'],
  notif_denied: ['تم رفض إذن الإشعارات', '通知权限被拒绝', 'Разрешение на уведомления отклонено', 'Permiso de notificaciones denegado', 'Autorisation des notifications refusée', 'اجازهٔ اعلان داده نشد'],
  backup_export: ['📥 تصدير البيانات', '📥 导出数据', '📥 Экспорт данных', '📥 Exportar datos', '📥 Exporter les données', '📥 خروجی گرفتن داده‌ها'],
  backup_import: ['📤 استيراد البيانات', '📤 导入数据', '📤 Импорт данных', '📤 Importar datos', '📤 Importer des données', '📤 وارد کردن داده‌ها'],
  backup_done: ['تم تصدير البيانات', '数据已导出', 'Данные экспортированы', 'Datos exportados', 'Données exportées', 'داده‌ها خروجی گرفته شد'],
  backup_imported: ['تم استيراد البيانات', '数据已导入', 'Данные импортированы', 'Datos importados', 'Données importées', 'داده‌ها وارد شد'],
  backup_invalid: ['ملف غير صالح', '文件无效', 'Некорректный файл', 'Archivo no válido', 'Fichier invalide', 'فایل نامعتبر'],
  suggest_channel: ['💡 اقترح قناة', '💡 建议频道', '💡 Предложить канал', '💡 Sugerir un canal', '💡 Proposer une chaîne', '💡 پیشنهاد کانال'],
  sug_bad_username: ['اسم المستخدم غير صالح', '用户名无效', 'Некорректное имя пользователя', 'Nombre de usuario no válido', 'Nom d\'utilisateur invalide', 'نام کاربری نامعتبر'],
  sug_not_channel: ['هذا ليس رابط قناة', '这不是频道链接', 'Это не ссылка на канал', 'Esto no es un enlace de canal', 'Ce n\'est pas un lien de chaîne', 'این لینک کانال نیست'],
  sug_exists: ['هذه القناة موجودة في قاعدة البيانات بالفعل', '该频道已在数据库中', 'Этот канал уже есть в базе', 'Este canal ya está en la base de datos', 'Cette chaîne est déjà dans la base', 'این کانال از قبل در دیتابیس هست'],
  sug_done: ['تم الحفظ! أنشئ مشكلة على GitHub لإرسالها', '已保存！在 GitHub 创建 issue 即可提交', 'Сохранено! Создайте issue на GitHub, чтобы отправить', '¡Guardado! Crea un issue en GitHub para enviarlo', 'Enregistré ! Créez un ticket sur GitHub pour l\'envoyer', 'ذخیره شد! برای ارسال یک issue در GitHub بسازید'],
  sug_copy: ['کپی متن پیشنهاد', '复制建议文本', 'Скопировать текст предложения', 'Copiar el texto de la sugerencia', 'Copier le texte de la suggestion', 'کپی متن پیشنهاد'],
  sug_open_issue: ['باز کردن issue در GitHub', '打开 GitHub issue', 'Открыть issue на GitHub', 'Abrir issue en GitHub', 'Ouvrir un ticket sur GitHub', 'باز کردن issue در GitHub'],
  sug_copied: ['کپی شد!', '已复制！', 'Скопировано!', '¡Copiado!', 'Copié !', 'کپی شد!'],
  latest_live: ['آخرین پست‌ها (زنده)', '最新帖子（实时）', 'Последние посты (в реальном времени)', 'Últimas publicaciones (en vivo)', 'Dernières publications (en direct)', 'آخرین پست‌ها (زنده)'],
  fetching: ['در حال دریافت...', '正在获取…', 'Загрузка…', 'Obteniendo…', 'Récupération…', 'در حال دریافت...'],
  renamed: ['✏️ فولدر تغییر نام داد', '✏️ 文件夹已重命名', '✏️ Папка переименована', '✏️ Carpeta renombrada', '✏️ Dossier renommé', '✏️ نام فولدر تغییر کرد'],
};

const LANGS = ['ar', 'zh', 'ru', 'es', 'fr', 'fa'];
const ORDER = { ar: 0, zh: 1, ru: 2, es: 3, fr: 4, fa: 5 };

// The group of a key comes from the English file - a key that is missing in
// the target language is not in it at all.
const ref = JSON.parse(fs.readFileSync(path.join(I18N_DIR, 'en.json'), 'utf8'));
const groupOf = key => {
  if (ref.main[key] !== undefined) return 'main';
  if (ref.ui[key] !== undefined) return 'ui';
  return null;
};

let filled = 0;
for (const lang of LANGS) {
  const file = path.join(I18N_DIR, lang + '.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [key, values] of Object.entries(T)) {
    const group = groupOf(key);
    if (!group) { console.error('the key ' + key + ' does not exist in English'); process.exit(1); }
    if (data[group][key]) continue;   // already translated
    const value = values[ORDER[lang]];
    if (!value) { console.error('no ' + lang + ' translation for ' + key); process.exit(1); }
    data[group][key] = value;
    filled++;
  }
  // Keep the same order as English so the diffs stay readable.
  const order = (group) => {
    const ref = Object.keys(JSON.parse(fs.readFileSync(path.join(I18N_DIR, 'en.json'), 'utf8'))[group]);
    const own = Object.keys(data[group]);
    const sorted = ref.filter(k => own.includes(k));
    for (const k of own) if (!sorted.includes(k)) sorted.push(k);
    const out = {};
    for (const k of sorted) out[k] = data[group][k];
    data[group] = out;
  };
  order('main');
  order('ui');
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}
console.log('filled ' + filled + ' translations');
