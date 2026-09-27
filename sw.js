
const CACHE_NAME = 'washer-log-v1.2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Bypass Google Script API - always network
  if (req.url.includes('script.google.com') || req.url.includes('googleapis')) {
    return;
  }
  // For CDN resources, use stale-while-revalidate
  if (req.url.includes('cdn.tailwindcss.com') || req.url.includes('chart.js') || req.url.includes('googleapis.com')) {
    e.respondWith(
      caches.open(CACHE_NAME).then(cache => 
        fetch(req).then(res => {
          cache.put(req, res.clone());
          return res;
        }).catch(() => cache.match(req))
      )
    );
    return;
  }
  // For app shell, cache-first
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return res;
      }).catch(() => {
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
