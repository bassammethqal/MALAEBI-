/* MALAEBI Venue Ops Service Worker */
const CACHE_NAME = 'malaebi-venue-ops-v1.1.1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css?v=1.1.1',
  './config.js?v=1.1.1',
  './api-client.js?v=1.1.1',
  './app.js?v=1.1.1',
  './manifest.webmanifest',
  './assets/images/logo.svg',
  './assets/images/icon.svg',
  './assets/fonts/thmanyahsans-Regular.woff2',
  './assets/fonts/thmanyahsans-Medium.woff2',
  './assets/fonts/thmanyahsans-Bold.woff2',
  './assets/fonts/thmanyahsans-Black.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Bypass caching for API requests
  if (url.pathname.includes('/api/v1/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
