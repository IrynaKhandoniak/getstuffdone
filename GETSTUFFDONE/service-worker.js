const CACHE_NAME = 'habitflow-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

// Install: pre-cache the app shell so the app works with zero network.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clear out old cache versions.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for page navigations (so updates show up immediately
// on the very next open), cache-first for everything else (icons, manifest,
// etc — these rarely change, so instant-from-cache is fine for them).
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const isNavigation = event.request.mode === 'navigate' ||
    event.request.destination === 'document';

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then(cached => cached || caches.match('./index.html'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // offline: fall back to whatever we have cached

      return cached || networkFetch;
    })
  );
});