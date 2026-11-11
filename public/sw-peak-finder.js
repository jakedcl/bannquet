/* Peak Finder service worker — site root script, scope /. Only handles Peak Finder + its assets. */
const SHELL_CACHE = 'pf-shell-v3';
const ASSET_CACHE = 'pf-assets-v3';
const SHELL_URL = '/peak-finder';

function isPeakFinderPath(pathname) {
  return pathname === '/peak-finder' || pathname.startsWith('/peak-finder/');
}

function canCacheNavigation(response) {
  return response.ok && response.type === 'basic' && !response.redirected;
}

async function shellFallback(request) {
  const cache = await caches.open(SHELL_CACHE);
  return (
    (await cache.match(request, { ignoreSearch: true }))
    ?? (await cache.match(SHELL_URL, { ignoreSearch: true }))
    ?? (await cache.match(request.url.split('?')[0], { ignoreSearch: true }))
  );
}

async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  const request = new Request(SHELL_URL, { credentials: 'include' });
  const existing = await cache.match(request, { ignoreSearch: true });
  if (existing) return;
  const response = await fetch(request, { credentials: 'include' });
  if (canCacheNavigation(response)) {
    await cache.put(SHELL_URL, response.clone());
    await cache.put(request, response.clone());
  }
  await cache.add(new Request('/peak-finder/declination.v1.json', { credentials: 'same-origin' })).catch(() => {});
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const pfPath = isPeakFinderPath(url.pathname);
  if (event.request.mode === 'navigate') {
    if (!pfPath) return;
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request, { credentials: 'include' });
          if (canCacheNavigation(response)) {
            const cache = await caches.open(SHELL_CACHE);
            const copy = response.clone();
            await cache.put(SHELL_URL, copy);
            await cache.put(event.request, response.clone());
          }
          return response;
        } catch {
          const hit = await shellFallback(event.request);
          if (hit) return hit;
          return Response.error();
        }
      })(),
    );
    return;
  }

  if (!pfPath && !url.pathname.startsWith('/_next/')) return;

  if (pfPath || url.pathname.startsWith('/_next/')) {
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
