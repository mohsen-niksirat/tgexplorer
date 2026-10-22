// Add a hand-picked list of candidates.
//
//   node scripts/add-verified.js
//
// The candidates were checked against t.me with the strict rules of
// verify_channels.js (a real channel, a visible subscriber count, no
// squatted or impostor page). The list is short on purpose: a curated
// database is worth more than a long one.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { check } = require(path.join(ROOT, 'verify_channels.js'));

// The channels that were checked by hand.
const PICKED = [
  'telegram',
  'stackoverflow',
  'linuxfoundation',
  'xiaomi',
  'qualcomm',
  'timesofindia',
  'juventus',
  'overwatch',
  'cooking',
];

const CATEGORY_HINTS = [
  [/crypto|bitcoin|ethereum|blockchain|defi/i, 'crypto'],
  [/football|soccer|formula|motogp|ufc|nba|basketball|juve|milan|inter|eintracht|schalke|newcastle|tottenham|aston|liverpool/i, 'sports'],
  [/overwatch|gaming|steam|xbox|playstation|nintendo|minecraft|epic|league|dota|valorant|csgo|apex|fortnite|roblox/i, 'gaming'],
  [/news|times|hindu|nbc|cnbc|economist/i, 'news'],
  [/qualcomm|xiaomi|nvidia|intel|linuxfoundation|stackoverflow|grafana|telegram|wordpress|docker|cloudflare|apple/i, 'tech'],
  [/cook|recipe|food/i, 'food'],
];

const guessCategory = (username, title, description) => {
  const hay = (username + ' ' + (title || '') + ' ' + (description || '')).toLowerCase();
  for (const [re, cat] of CATEGORY_HINTS) if (re.test(hay)) return cat;
  return 'tech';
};

const formatMembers = raw => {
  const n = parseInt(String(raw || '').replace(/[^\d]/g, ''), 10);
  if (!n || isNaN(n)) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

const esc = s => String(s == null ? '' : s)
  .replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

(async () => {
  const dbFile = path.join(ROOT, 'channels.js');
  const db = new Function(fs.readFileSync(dbFile, 'utf8') + '; return CHANNEL_DB;')();
  const known = new Set(db.map(c => c.username.toLowerCase()));

  let added = 0;
  for (const username of PICKED) {
    if (known.has(username.toLowerCase())) { console.log('skip (known): @' + username); continue; }
    const res = await check({ username }, { profile: true });
    if (res.status !== 'OK' || !res.members) {
      console.log('skip (not verified): @' + username + ' -> ' + res.status);
      continue;
    }
    const title = esc(res.title || username);
    const description = esc(res.description || title).slice(0, 200);
    const members = formatMembers(res.members);
    const category = guessCategory(username, res.title, res.description);
    const lang = /[\u0600-\u06FF]/.test(title + description) ? 'fa' : 'en';
    const entry = "  {username:'" + username + "',title:'" + title + "',members:'" + members +
      "',description:'" + description + "',tags:['" + category + "'],lang:'" + lang + "'},";

    const src = fs.readFileSync(dbFile, 'utf8');
    const m = /\]\;\s*$/.exec(src);
    if (!m) { console.error('could not find the end of CHANNEL_DB'); process.exit(1); }
    fs.writeFileSync(dbFile, src.slice(0, m.index) + '\n' + entry + src.slice(m.index), 'utf8');
    console.log('added @' + username + ' — ' + title + ' (' + members + ', ' + category + ', ' + lang + ')');
    added++;
    await new Promise(r => setTimeout(r, 250));
  }

  const after = new Function(fs.readFileSync(dbFile, 'utf8') + '; return CHANNEL_DB;')();
  console.log('\nadded ' + added + ' channels — the database now holds ' + after.length);
})();
