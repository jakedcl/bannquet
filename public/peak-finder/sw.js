/* Peak Finder service worker — scoped to /peak-finder with limited passthrough elsewhere. */
const SHELL_CACHE = 'pf-shell-v2';
const ASSET_CACHE = 'pf-assets-v2';
const PRECACHE = [
  '/peak-finder',
  '/peak-finder/declination.v1.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => (key.startsWith('pf-shell-') || key.startsWith('pf-assets-')) && key !== SHELL_CACHE && key !== ASSET_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

function isPeakFinderPath(pathname) {
  return pathname === '/peak-finder' || pathname.startsWith('/peak-finder/');
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!isPeakFinderPath(url.pathname) && !url.pathname.startsWith('/_next/')) return;

  if (event.request.mode === 'navigate' && !isPeakFinderPath(url.pathname)) {
    return;
  }

  if (event.request.mode === 'navigate' && isPeakFinderPath(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((hit) => hit ?? caches.match('/peak-finder'))),
    );
    return;
  }

  if (url.pathname.startsWith('/_next/') || isPeakFinderPath(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            void caches.open(ASSET_CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((hit) => hit ?? Response.error())),
    );
  }
});
