// ============================================================
// Telegram Explorer - Service Worker
// Handles caching for offline support and PWA
// ============================================================

const CACHE_NAME = 'tgexplorer-shell-v1';
// The watchlist/seen-post state and crawled data live in their own unversioned
// caches: `activate` purges old shell caches, while watch state and data
// survive shell deploys and are refreshed via stale-while-revalidate.
const STATE_CACHE = 'tgexplorer-state';
const DATA_CACHE = 'tgexplorer-data';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './js/i18n.js',
  './js/state.js',
  './js/worker-code.js',
  './js/compare.js',
  './js/export.js',
];
const DATA_ASSETS = [
  './channels.js',
  './posts.js',
  './avatars.js',
];

// Install: cache static shell assets and best-effort warm the data cache.
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache =>
        Promise.all(
          STATIC_ASSETS.map(url =>
            cache.add(new Request(url, { cache: 'default' })).catch(() => {})
          )
        )
      ),
      caches.open(DATA_CACHE).then(cache =>
        Promise.all(
          DATA_ASSETS.map(url =>
            cache.match(url).then(hit => hit || cache.add(new Request(url, { cache: 'default' })).catch(() => {}))
          )
        )
      ),
    ])
  );
  self.skipWaiting();
});

// Activate: clean old shell caches while preserving state and data caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== STATE_CACHE && key !== DATA_CACHE)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

function staleWhileRevalidate(event, cacheName, fallbackFn) {
  event.respondWith(
    caches.open(cacheName).then(cache =>
      cache.match(event.request).then(cached => {
        const networkPromise = fetch(event.request).then(response => {
          if (response && response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => cached || (fallbackFn ? fallbackFn() : undefined));

        if (cached) {
          event.waitUntil(networkPromise);
          return cached;
        }
        return networkPromise;
      })
    )
  );
}

// Fetch: network only for API, stale-while-revalidate for data & shell
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // API requests: network only (don't cache)
  if (url.pathname.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // App shell (navigations, index.html, manifest.json) & ES modules (js/*.js):
  // stale-while-revalidate in CACHE_NAME so repeat visits render immediately
  // without waiting for the network, while picking up updates in the background.
  if (event.request.mode === 'navigate'
    || url.pathname.endsWith('/index.html')
    || url.pathname.endsWith('/manifest.json')) {
    staleWhileRevalidate(event, CACHE_NAME, () => caches.match('./index.html'));
    return;
  }

  if (url.pathname.includes('/js/') && url.pathname.endsWith('.js')) {
    staleWhileRevalidate(event, CACHE_NAME);
    return;
  }

  // Data files (posts.js / channels.js / avatars.js / summaries.json / rss/*.xml / posts/*.json):
  // stale-while-revalidate in separate DATA_CACHE so crawls never invalidate
  // the shell cache and repeat visits don't block on data downloads.
  if (url.pathname.endsWith('/posts.js') || url.pathname.endsWith('/channels.js') || url.pathname.endsWith('/avatars.js')
    || url.pathname.endsWith('/summaries.json')
    || (url.pathname.includes('/rss/') && url.pathname.endsWith('.xml'))
    || (url.pathname.includes('/posts/') && url.pathname.endsWith('.json'))) {
    staleWhileRevalidate(event, DATA_CACHE);
    return;
  }

  // Other static assets (icons, etc.): stale-while-revalidate in CACHE_NAME
  staleWhileRevalidate(event, CACHE_NAME);
});

// ============================================================
// BACKGROUND SYNC — local notifications, no push server
// ------------------------------------------------------------
// The app tells the worker which channels to watch (the favourites).
// On a periodic sync the worker fetches the archive of every watched
// channel, compares the post ids with the ones it saw last time and
// shows a notification for the new ones.
// ============================================================
// Watchlist and seen-post state live in STATE_CACHE (declared at the top)
// so the versioned cache purge on every deploy does not wipe them.
const WATCH_KEY = '/tg-watchlist';
const SEEN_KEY = '/tg-seen';

async function storeWatchlist(channels) {
  const cache = await caches.open(STATE_CACHE);
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
    event.waitUntil(caches.open(STATE_CACHE).then(cache =>
      cache.put(SEEN_KEY, new Response(JSON.stringify(data.seen), {
        headers: { 'Content-Type': 'application/json' },
      }))));
  }
});

// The sync itself.
async function checkWatchedChannels() {
  const cache = await caches.open(STATE_CACHE);
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

// Chrome dispatches a dedicated `periodicsync` event for the registration
// made in index.html — the plain `sync` listener above never fires for it.
self.addEventListener('periodicsync', event => {
  if (event.tag === 'tg-check-posts') {
    event.waitUntil(checkWatchedChannels());
  }
});

// Push notifications
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'New update available',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || './' },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' },
    ],
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'Telegram Explorer', options)
  );
});

// Notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
