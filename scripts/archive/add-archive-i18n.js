// Add the "last 90 days" label to the translations.
const fs = require('fs');
const path = require('path');

const I18N_DIR = path.join(__dirname, '..', 'i18n');
const LANGS = ['en', 'fa', 'ar', 'zh', 'ru', 'es', 'fr'];

const VALUE = {
  en: '📊 Activity (90 days)',
  fa: '📊 فعالیت (۹۰ روز)',
  ar: '📊 النشاط (90 يوماً)',
  zh: '📊 活跃度（90 天）',
  ru: '📊 Активность (90 дней)',
  es: '📊 Actividad (90 días)',
  fr: '📊 Activité (90 jours)',
};

for (const lang of LANGS) {
  const file = path.join(I18N_DIR, lang + '.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data.ui) data.ui = {};
  data.ui.activity_90d = VALUE[lang];
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}
console.log('added activity_90d to ' + LANGS.length + ' languages');
