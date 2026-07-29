const CACHE_NAME = 'bnn-cache-v7';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for navigation/API, stale-while-revalidate for assets.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // API requests: network only (always want fresh data)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Never let a cached HTML shell hide new metadata, bundles, or favicon links.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put('/', response.clone());
          }
          return response;
        } catch {
          const cached = await caches.match('/');
          if (cached) return cached;
          return new Response(
            '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"><title>BNN - Offline</title></head><body style="background:#0a0a0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h1>BNN</h1><p>You are offline. Please check your connection.</p></div></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
      })()
    );
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const fetched = fetch(request).then((response) => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(() => {
        // Offline fallback: return cached version or a basic offline page
        if (cached) return cached;
        return cached;
      });

      return cached || fetched;
    })
  );
});
