/* MALAEBI Admin Dashboard Service Worker */
const CACHE_NAME = 'malaebi-admin-v1.1.3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css?v=1.1.3',
  './icons3d.js?v=1.1.3',
  './config.js?v=1.1.3',
  './api-client.js?v=1.1.3',
  './app.js?v=1.1.3',
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
      return fetch(event.request).then((networkRes) => {
        if (!networkRes || networkRes.status !== 200 || networkRes.type !== 'basic') {
          return networkRes;
        }
        const toCache = networkRes.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
        return networkRes;
      }).catch(() => cached);
    })
  );
});
