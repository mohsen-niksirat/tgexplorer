// Add the background sync to sw.js: the service worker checks the
// favourite channels for new posts and shows a local notification. No
// push server is involved - the browser wakes the worker up.
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'sw.js');
let s = fs.readFileSync(p, 'utf8');

if (s.includes('tg-check-posts')) { console.log('sw.js already has the background sync'); process.exit(0); }

// The block goes right before the push notification handler.
const ANCHOR = '// Push notifications';
if (!s.includes(ANCHOR)) { console.error('the push handler was not found'); process.exit(1); }

const BLOCK = `// ============================================================
// BACKGROUND SYNC — local notifications, no push server
// ------------------------------------------------------------
// The app tells the worker which channels to watch (the favourites).
// On a periodic sync the worker fetches the archive of every watched
// channel, compares the post ids with the ones it saw last time and
// shows a notification for the new ones.
// ============================================================
const WATCH_KEY = '/tg-watchlist';
const SEEN_KEY = '/tg-seen';

async function storeWatchlist(channels) {
  const cache = await caches.open(CACHE_NAME);
  await cache.put(WATCH_KEY, new Response(JSON.stringify(channels), {
    headers: { 'Content-Type': 'application/json' },
  }));
}

// The message channel: the app sends the list of channels to watch.
self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'watch' && Array.isArray(data.channels)) {
    event.waitUntil(storeWatchlist(data.channels));
  }
  if (data.type === 'seen' && data.seen) {
    event.waitUntil(caches.open(CACHE_NAME).then(cache =>
      cache.put(SEEN_KEY, new Response(JSON.stringify(data.seen), {
        headers: { 'Content-Type': 'application/json' },
      }))));
  }
});

// The sync itself.
async function checkWatchedChannels() {
  const cache = await caches.open(CACHE_NAME);
  const watchRes = await cache.match(WATCH_KEY);
  if (!watchRes) return;
  let channels = [];
  try { channels = await watchRes.json(); } catch (e) { return; }
  if (!channels.length) return;

  const seenRes = await cache.match(SEEN_KEY);
  let seen = {};
  try { seen = seenRes ? await seenRes.json() : {}; } catch (e) { seen = {}; }

  let changed = false;
  for (const username of channels.slice(0, 10)) {
    try {
      const res = await fetch('posts/' + encodeURIComponent(username) + '.json', { cache: 'no-store' });
      if (!res.ok) continue;
      const posts = await res.json();
      if (!Array.isArray(posts) || !posts.length) continue;

      const ids = posts.map(p => String(p.id));
      const known = new Set((seen[username] || []).map(String));
      const fresh = ids.filter(id => !known.has(id));
      // The first run only records the ids, it does not notify.
      if (known.size && fresh.length) {
        const latest = posts[0];
        await self.registration.showNotification('📬 ' + fresh.length + ' new post' + (fresh.length > 1 ? 's' : ''), {
          body: (latest && latest.text ? latest.text.slice(0, 120) : '@' + username),
          icon: 'icons/icon-192.png',
          badge: 'icons/icon-192.png',
          tag: 'tg-posts-' + username,
          data: { url: './?channel=' + username },
        });
      }
      seen[username] = ids.slice(0, 50);
      changed = true;
    } catch (e) { /* a network hiccup is not worth failing the sync for */ }
  }
  if (changed) {
    await cache.put(SEEN_KEY, new Response(JSON.stringify(seen), {
      headers: { 'Content-Type': 'application/json' },
    }));
  }
}

self.addEventListener('sync', event => {
  if (event.tag === 'tg-check-posts') {
    event.waitUntil(checkWatchedChannels());
  }
});

`;

s = s.replace(ANCHOR, BLOCK + ANCHOR);
fs.writeFileSync(p, s, 'utf8');
console.log('patched sw.js');
for (const c of ['tg-check-posts', 'checkWatchedChannels', 'storeWatchlist']) {
  console.log((s.includes(c) ? 'OK   ' : 'MISS ') + c);
}
