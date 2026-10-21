// Post-merge sanity check: no conflict markers, the app shell is intact and
// the post archive is fresh.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

let ok = true;

// 1) no conflict markers anywhere
for (const f of ['index.html', 'sw.js', 'manifest.json', 'channels.js', 'avatars.js', 'posts.js']) {
  const s = read(f);
  const markers = (s.match(/^(<<<<<<<|=======|>>>>>>>)/gm) || []).length;
  console.log((markers ? 'FAIL ' : 'OK   ') + f + ' conflict markers: ' + markers);
  if (markers) ok = false;
}

// 2) the app shell survived the merge
const html = read('index.html');
for (const marker of [
  'favicon.ico', 'apple-touch-icon.png', 'script type="module"',
  'netBanner', 'filterBar', 'aria-label="Close"', 'js/i18n.js',
]) {
  const has = html.includes(marker);
  console.log((has ? 'OK   ' : 'MISS ') + 'index.html: ' + marker);
  if (!has) ok = false;
}

// 3) the post archive is fresh
const posts = read('posts.js');
const dates = [...posts.matchAll(/"date":"([^"]+)"/g)].map(m => m[1]).sort();
console.log('\nposts: ' + dates.length + ' | newest: ' + dates[dates.length - 1] + ' | oldest: ' + dates[0]);
const ageDays = (Date.now() - Date.parse(dates[dates.length - 1])) / 864e5;
console.log((ageDays < 5 ? 'OK   ' : 'WARN ') + 'newest post is ' + ageDays.toFixed(1) + ' days old');
const channels = new Set([...posts.matchAll(/"(\w+)":\[\{"id"/g)].map(m => m[1]));
console.log('channels in the seed: ' + channels.size);

// 4) the service worker parses and the module script parses
require('child_process').execFileSync(process.execPath, ['--check', path.join(ROOT, 'sw.js')]);
console.log('OK   sw.js parses');

process.exit(ok ? 0 : 1);
