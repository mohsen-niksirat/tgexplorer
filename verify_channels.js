// ============================================================
// verify_channels.js — check that every channel in channels.js
// actually exists as a PUBLIC CHANNEL on Telegram
// Usage: node verify_channels.js
//   - OK     : real public channel
//   - USER   : username exists but is a user/bot, not a channel
//   - MISSING: no public channel with this username
// ============================================================
const fs = require('fs');
const src = fs.readFileSync('channels.js', 'utf8');
const fn = new Function(src + '; return CHANNEL_DB;');
const db = fn();

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function check(ch) {
  const url = 'https://t.me/s/' + encodeURIComponent(ch.username);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en' }, redirect: 'follow' });
    if (!r.ok) return { ch, status: 'FAIL', reason: 'HTTP ' + r.status };
    const html = await r.text();
    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    if (!html.includes('tgme_page')) return { ch, status: 'FAIL', reason: 'not a public channel page' };
    if (/^Telegram: Contact/i.test(title.trim())) return { ch, status: 'USER', reason: '"' + title.slice(0, 60) + '"' };
    return { ch, status: 'OK', reason: '"' + title.slice(0, 60) + '"' };
  } catch (e) {
    return { ch, status: 'ERR', reason: 'network: ' + e.message };
  }
}

(async () => {
  console.log('Checking ' + db.length + ' channels on t.me...\n');
  const counts = { OK: 0, USER: 0, FAIL: 0, ERR: 0 };
  const bad = [];
  for (const ch of db) {
    const res = await check(ch);
    counts[res.status]++;
    const mark = { OK: '  OK  ', USER: ' USER ', FAIL: ' FAIL ', ERR: ' ERR  ' }[res.status];
    console.log(mark + ' @' + ch.username.padEnd(22) + res.reason);
    if (res.status !== 'OK') bad.push(res);
    await new Promise(r => setTimeout(r, 300));
  }
  console.log('\n=== RESULT: ' + counts.OK + ' OK, ' + counts.USER + ' user, ' + counts.FAIL + ' missing, ' + counts.ERR + ' network error ===');
  if (bad.length) {
    console.log('\nChannels to fix/remove from channels.js:');
    bad.forEach(b => console.log('  - ' + b.ch.username + '  [' + b.status + '] ' + b.reason));
  }
  process.exit(counts.FAIL + counts.USER > 0 ? 1 : 0);
})();
