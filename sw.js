// ============================================================
// Telegram Explorer - Service Worker
// Handles caching for offline support and PWA
// ============================================================

const CACHE_NAME = 'tgexplorer-202608241925';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
];

// Install: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
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

  // Data files (posts.js / channels.js): network first so crawls show up
  // immediately — fall back to the cached copy only when offline.
  if (url.pathname.endsWith('/posts.js') || url.pathname.endsWith('/channels.js')) {
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
