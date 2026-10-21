// ============================================================
// Telegram Explorer - Service Worker
// Handles caching for offline support and PWA
// ============================================================

const CACHE_NAME = 'tgexplorer-202610212143';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './channels.js',
  './avatars.js',
  './js/i18n.js',
  './js/state.js',
  './js/worker-code.js',
];

// Install: cache static assets. Data files are best-effort — a missing
// posts.js/avatars.js must not abort the whole installation (the app
// degrades to whatever is available).
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        STATIC_ASSETS.map(url =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
        )
      )
    )
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network first for API, cache first for static
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API requests: network only (don't cache)
  if (url.pathname.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // App shell (every navigation) and the manifest: network first so app
  // updates (new features) show up on refresh — no stale cached copy. The
  // root path "/" is a navigation too, so it must not fall through to the
  // cache-first branch below: that would keep serving an old index.html
  // until the cache version is bumped. Fall back to the cache only offline.
  if (event.request.mode === 'navigate'
    || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/manifest.json')) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // ES modules (js/*.js): network first, so a new deploy of a module is
  // picked up on the next load instead of being pinned to a stale cached
  // copy. Falls back to the cache when offline.
  if (url.pathname.includes('/js/') && url.pathname.endsWith('.js')) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Data files (posts.js / channels.js / avatars.js / posts/*.json):
  // network first so crawls and avatar refreshes show up immediately —
  // fall back to the cached copy only when offline.
  if (url.pathname.endsWith('/posts.js') || url.pathname.endsWith('/channels.js') || url.pathname.endsWith('/avatars.js')
    || (url.pathname.includes('/posts/') && url.pathname.endsWith('.json'))) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets: cache first, then network
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        // Update cache
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// ============================================================
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
