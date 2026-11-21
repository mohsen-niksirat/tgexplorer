// Fix the placeholders that were never filled in: a translation whose value
// is identical to its key means nobody translated it.
const fs = require('fs');
const path = require('path');

const I18N_DIR = path.join(__dirname, '..', 'i18n');

const FIXES = {
  en: { main: { members: '👥 Members' } },
};

for (const [lang, groups] of Object.entries(FIXES)) {
  const file = path.join(I18N_DIR, lang + '.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [group, entries] of Object.entries(groups)) {
    for (const [key, value] of Object.entries(entries)) {
      if (data[group][key] === key) {
        console.log('fixed ' + lang + '.' + group + '.' + key + ': "' + key + '" -> "' + value + '"');
        data[group][key] = value;
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}
