/* Peak Finder service worker — scope /, only Peak Finder shell + assets while on /peak-finder. */
const SHELL_CACHE = 'pf-shell-v4';
const ASSET_CACHE = 'pf-assets-v4';
const SHELL_URL = '/peak-finder';

function isPeakFinderPath(pathname) {
  return pathname === '/peak-finder' || pathname.startsWith('/peak-finder/');
}

function passthroughPath(pathname) {
  return (
    pathname === '/maplibre-gl-worker.mjs'
    || pathname === '/map'
    || pathname.startsWith('/map/')
  );
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

async function peakFinderClientActive() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  return clients.some((client) => {
    try {
      return isPeakFinderPath(new URL(client.url).pathname);
    } catch {
      return false;
    }
  });
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
  if (passthroughPath(url.pathname)) return;

  const pfPath = isPeakFinderPath(url.pathname);

  if (event.request.mode === 'navigate') {
    if (!pfPath) return;
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request, { credentials: 'include' });
          if (canCacheNavigation(response)) {
            const cache = await caches.open(SHELL_CACHE);
            await cache.put(SHELL_URL, response.clone());
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

  event.respondWith(
    (async () => {
      const onPeakFinder = await peakFinderClientActive();
      const nextChunk = url.pathname.startsWith('/_next/');
      if (!pfPath && !(nextChunk && onPeakFinder)) {
        return fetch(event.request);
      }
      try {
        const response = await fetch(event.request);
        if (response.ok && response.type === 'basic') {
          const cache = await caches.open(nextChunk ? ASSET_CACHE : SHELL_CACHE);
          await cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        const cache = await caches.open(nextChunk ? ASSET_CACHE : SHELL_CACHE);
        const hit = await cache.match(event.request);
        if (hit) return hit;
        return fetch(event.request);
      }
    })(),
  );
});
