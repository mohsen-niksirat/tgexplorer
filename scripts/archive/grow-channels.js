// Grow the channel database with the candidates in scripts/candidates.txt.
//
//   node scripts/grow-channels.js            -> check the candidates
//   node scripts/grow-channels.js --add      -> check and add the live ones
//
// Every candidate is verified against t.me with the same rules as
// verify_channels.js: a channel is only added when it is a real public
// channel.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { check } = require(path.join(ROOT, 'verify_channels.js'));

const ADD = process.argv.includes('--add');
const file = path.join(__dirname, 'candidates.txt');

// The category and the language are guessed from the live title and
// description of the channel.
const CATEGORY_HINTS = [
  [/crypto|bitcoin|ethereum|blockchain|defi|solana|cardano|polkadot|binance|coin|kraken|ripple/i, 'crypto'],
  [/football|soccer|formula|motogp|ufc|nba|basketball|premier|liga|serie|manutd|chelsea|liverpool|barcelona|madrid|juve|bayern|psg|milan|inter|atleti|liverpool|newcastle|aston|brighton|tottenham|eintracht|dortmund|schalke|leipzig/i, 'sports'],
  [/gaming|steam|xbox|playstation|nintendo|minecraft|epic|rockstar|league|dota|valorant|csgo|apex|overwatch|fortnite|roblox|clash|pubg|freefire|genshin/i, 'gaming'],
  [/news|times|hindu|economist|cnbc|nbc|npr|apnews|cnn|bbc|guardian|skyn|france24|aljazeera|bloomberg|scmp|dw_|yjc|khabar|fars|isna|irna|mehr|tasnim|shabestan|varzeshi|sakhteen|roshangaran|ne|noor|motilal|persian/i, 'news'],
  [/music|spotify|youtube|film|filimo|telewebion|netflix|prime|imdb|movie|trailer|series|art|behance|dribbble|design|photo|unsplash|pixabay|giphy/i, 'entertainment'],
  [/science|nasa|space|physics|chemi|biolog|nature|quanta|scientific|astronom|physorg|medschool|harvard|mayo|nih|health/i, 'science'],
  [/learn|course|udemy|coursera|khan|free|code|school|university|education|english|vocab|grammar|book/i, 'education'],
  [/food|cook|recipe|restaurant|chef|meal|diet|trip|tour|hotel|flight|backpack|adventure/i, 'food'],
  [/podcast|rokh|radio/i, 'podcast'],
];

const guessCategory = (username, title, description) => {
  const hay = (username + ' ' + (title || '') + ' ' + (description || '')).toLowerCase();
  for (const [re, cat] of CATEGORY_HINTS) if (re.test(hay)) return cat;
  return 'tech';
};

const guessLang = (username, title, description) => {
  const hay = (username + ' ' + (title || '') + ' ' + (description || '')).toLowerCase();
  if (/[\u0600-\u06FF]/.test(hay)) return 'fa';
  return 'en';
};

// 1234567 -> "1.2M", like the rest of the database.
const formatMembers = raw => {
  const n = parseInt(String(raw || '').replace(/[^\d]/g, ''), 10);
  if (!n || isNaN(n)) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

// A squatted, parked or impostor channel. Telegram sells usernames
// and parks them, and those pages look like a channel with subscribers.
const SQUAT_PATTERNS = [
  /for\s+sale/i,
  /usernames?\b/i,
  /names?\s*[•·|]/i,
  /\bog_names\b/i,
  /fragment\.com\/username/i,
  /\[\s*fake\s*\]/i,
  /\bscam\b/i,
  /\bclone\b/i,
  /\bbet365\b|\bbetting\b/i,
  /^test\b/i,
  /\bowner\s*@/i,
  /\bdm\s*:/i,
];

// A title that mixes Cyrillic and Latin letters is a homograph.
const isHomograph = title => {
  const t = String(title || '');
  return /[\u0400-\u04FF]/.test(t) && /[A-Za-z]/.test(t);
};

const looksSquat = (title, description) => {
  const hay = (title || '') + ' — ' + (description || '');
  return SQUAT_PATTERNS.some(re => re.test(hay)) || isHomograph(title);
};

// Below this many subscribers a channel is not worth listing.
const MIN_MEMBERS = 100;

(async () => {
  const raw = fs.readFileSync(file, 'utf8');
  const candidates = raw.split('\n')
    .map(l => l.trim().split('#')[0].trim())
    .filter(l => l && /^[A-Za-z0-9_]{4,32}$/.test(l));
  const unique = [...new Set(candidates)];

  const db = new Function(fs.readFileSync(path.join(ROOT, 'channels.js'), 'utf8') + '; return CHANNEL_DB;')();
  const known = new Set(db.map(c => c.username.toLowerCase()));
  const todo = unique.filter(u => !known.has(u.toLowerCase()));

  console.log('candidates: ' + unique.length + ' | already in the database: ' + (unique.length - todo.length) +
    ' | to check: ' + todo.length + '\n');

  const live = [];
  const dead = [];
  let errors = 0;

  for (const username of todo) {
    const res = await check({ username }, { profile: true });
    if (res.status === 'OK' && !res.members) {
      // A channel without a visible subscriber count could be a personal
      // account that took the username - too risky for the database.
      dead.push(username);
      console.log('  HIDE  @' + username.padEnd(22) + 'no visible subscriber count');
    } else if (res.status === 'OK' && looksSquat(res.title, res.description)) {
      dead.push(username);
      console.log('  SQAT  @' + username.padEnd(22) + (res.title || '').slice(0, 50));
    } else if (res.status === 'OK' && parseInt(res.members, 10) < MIN_MEMBERS) {
      dead.push(username);
      console.log('  SMALL @' + username.padEnd(22) + res.members + ' subscribers');
    } else if (res.status === 'OK') {
      live.push(res);
      console.log('  OK    @' + username.padEnd(22) + (res.title || '').slice(0, 50));
    } else if (res.status === 'ERR') {
      errors++;
      console.log('  ERR   @' + username.padEnd(22) + 'network error');
    } else {
      dead.push(username);
      console.log('  ' + res.status.padEnd(5) + ' @' + username.padEnd(22) + (res.reason || '').slice(0, 50));
    }
    await new Promise(r => setTimeout(r, 250));
  }

  console.log('\n=== ' + live.length + ' live, ' + dead.length + ' dead, ' + errors + ' network errors ===');
  console.log('live: ' + live.map(l => l.ch.username).join(', '));

  if (!ADD) {
    console.log('\n(run with --add to add them to channels.js)');
    return;
  }
  if (!live.length) {
    console.log('nothing to add');
    return;
  }

  const added = [];
  for (const res of live) {
    const username = res.ch.username;
    const title = (res.title || username).replace(/'/g, "\\'");
    const description = (res.description || title).replace(/'/g, "\\'").replace(/\s+/g, ' ').slice(0, 200);
    const members = formatMembers(res.members);
    const category = guessCategory(username, res.title, res.description);
    const lang = guessLang(username, res.title, res.description);
    const entry = "  {username:'" + username + "',title:'" + title + "',members:'" + members +
      "',description:'" + description + "',tags:['" + category + "'],lang:'" + lang + "'},";

    const file2 = path.join(ROOT, 'channels.js');
    const src = fs.readFileSync(file2, 'utf8');
    // The array ends with "];", possibly followed by a newline.
    const m = /\]\;\s*$/.exec(src);
    if (!m) { console.error('could not find the end of CHANNEL_DB'); process.exit(1); }
    const at = m.index;
    fs.writeFileSync(file2, src.slice(0, at) + '\n' + entry + src.slice(at), 'utf8');
    added.push(username);
  }

  const after = new Function(fs.readFileSync(path.join(ROOT, 'channels.js'), 'utf8') + '; return CHANNEL_DB;')();
  console.log('\nadded ' + added.length + ' channels - the database now holds ' + after.length);
})();
