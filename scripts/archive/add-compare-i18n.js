// Add the compare-view strings to the translations.
const fs = require('fs');
const path = require('path');

const I18N_DIR = path.join(__dirname, '..', 'i18n');
const LANGS = ['en', 'fa', 'ar', 'zh', 'ru', 'es', 'fr'];

const VALUE = {
  compare: ['⚖️ Compare', '⚖️ مقایسه', '⚖️ قارن', '⚖️ 比较', '⚖️ Сравнить', '⚖️ Comparar', '⚖️ Comparer'],
  compare_title: ['Compare channels', 'مقایسهٔ کانال‌ها', 'قارن القنوات', '比较频道', 'Сравнение каналов', 'Comparar canales', 'Comparer des chaînes'],
  compare_sub: ['Two channels, side by side', 'دو کانال، کنار هم', 'قناتان جنبًا إلى جنب', '两个频道，并排对比', 'Два канала рядом', 'Dos canales, uno al lado del otro', 'Deux chaînes, côte à côte'],
  compare_pick: ['Pick a channel to compare', 'کانالی را برای مقایسه انتخاب کنید', 'اختر قناة للمقارنة', '选择一个要比较的频道', 'Выберите канал для сравнения', 'Elige un canal para comparar', 'Choisissez une chaîne à comparer'],
};

for (const lang of LANGS) {
  const file = path.join(I18N_DIR, lang + '.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const i = LANGS.indexOf(lang);
  // The first entry belongs to the main group, the rest to the ui group.
  data.main.compare = VALUE.compare[i];
  if (!data.ui) data.ui = {};
  data.ui.compare_title = VALUE.compare_title[i];
  data.ui.compare_sub = VALUE.compare_sub[i];
  data.ui.compare_pick = VALUE.compare_pick[i];
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}
console.log('added the compare strings to ' + LANGS.length + ' languages');
