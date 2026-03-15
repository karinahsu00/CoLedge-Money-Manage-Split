/* CoLedge Service Worker — shell/static offline caching */
const CACHE_NAME = 'coledge-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  /* Precache the app shell root */
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add('/')).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Network-first for API calls, stale-while-revalidate for everything else */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  /* Skip non-GET requests and cross-origin requests */
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  /* Skip API calls — always go to network */
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
      /* Return cached version immediately, update in background */
      return cached || networkFetch;
    })
  );
});
