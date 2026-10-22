// Add a verified channel to channels.js.
//
//   node scripts/add-channel.js <username> <title> <lang> <category> [description]
//
// The entry is appended to the end of the CHANNEL_DB array, so the
// formatting of the existing entries is untouched.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const [username, title, lang, category, description] = process.argv.slice(2);

if (!username || !title || !lang || !category) {
  console.error('usage: node scripts/add-channel.js <username> <title> <lang> <category> [description]');
  process.exit(1);
}

if (!/^[A-Za-z0-9_]{5,32}$/.test(username)) {
  console.error('"' + username + '" is not a valid Telegram username');
  process.exit(1);
}

const file = path.join(ROOT, 'channels.js');
const src = fs.readFileSync(file, 'utf8');

// Do not add it twice.
const db = new Function(src + '; return CHANNEL_DB;')();
if (db.some(c => c.username.toLowerCase() === username.toLowerCase())) {
  console.error('@' + username + ' is already in the database');
  process.exit(1);
}

// The category has to be one the app knows.
const CATEGORIES = ['tech', 'news', 'crypto', 'entertainment', 'science', 'gaming', 'music',
  'art', 'sports', 'education', 'meme', 'food', 'travel', 'photography', 'podcast', 'cinema'];
if (!CATEGORIES.includes(category)) {
  console.error('"' + category + '" is not a known category (' + CATEGORIES.join(', ') + ')');
  process.exit(1);
}

const esc = s => String(s == null ? '' : s)
  .replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ').trim();

const entry = "  {username:'" + esc(username) + "',title:'" + esc(title) +
  "',members:'0',description:'" + esc(description || title) +
  "',tags:['" + esc(category) + "'],lang:'" + esc(lang) + "'},";

// The array ends with "];", possibly followed by a newline.
const m = /\]\;\s*$/.exec(src);
if (!m) { console.error('could not find the end of CHANNEL_DB'); process.exit(1); }
const at = m.index;

const out = src.slice(0, at) + '\n' + entry + src.slice(at);
fs.writeFileSync(file, out, 'utf8');

// Check the result.
const check = new Function(fs.readFileSync(file, 'utf8') + '; return CHANNEL_DB;')();
const added = check.find(c => c.username === username);
console.log('added @' + username + ' (' + added.title + ', ' + added.lang + ', ' + added.tags.join(',') + ')');
console.log('the database now holds ' + check.length + ' channels');
