const CACHE = 'malaebi-player-v2.8.0';
const CORE = [
  './',
  './index.html',
  './styles.css?v=8',
  './app.js?v=8',
  './config.js?v=8',
  './api-client.js?v=8',
  './manifest.webmanifest',
  './assets/images/logo.svg',
  './assets/images/icon.svg',
  './assets/fonts/thmanyahsans-Regular.woff2',
  './assets/fonts/thmanyahsans-Light.woff2',
  './assets/fonts/thmanyahsans-Medium.woff2',
  './assets/fonts/thmanyahsans-Bold.woff2',
  './assets/fonts/thmanyahsans-Black.woff2'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).catch(() => {}));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin || new URL(req.url).pathname.startsWith('/api/')) return;
  // Network first so developer / tester always gets fresh updates
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
  );
});
