/** URL path is a Peak Finder app route (incl. query string handled separately). */
export function isPeakFinderPath(pathname: string): boolean {
  return pathname === '/peak-finder' || pathname.startsWith('/peak-finder/');
}

/**
 * Service worker scope prefix match (simplified URL path rules).
 * Explains why scope `/peak-finder/` does not control `/peak-finder`.
 */
export function pathMatchesScope(pathname: string, scopePath: string): boolean {
  if (scopePath === '/') return true;
  if (scopePath.endsWith('/')) return pathname.startsWith(scopePath);
  return pathname === scopePath || pathname.startsWith(`${scopePath}/`);
}

export function canCacheNavigationResponse(status: number, responseType: string, redirected: boolean): boolean {
  return status >= 200 && status < 300 && responseType === 'basic' && !redirected;
}

export type SwFetchMode = 'peak-finder-navigate' | 'peak-finder-asset' | 'next-static' | 'ignore';

export function classifyServiceWorkerFetch(pathname: string, mode: string): SwFetchMode {
  if (mode === 'navigate') {
    return isPeakFinderPath(pathname) ? 'peak-finder-navigate' : 'ignore';
  }
  if (pathname.startsWith('/_next/')) return 'next-static';
  if (isPeakFinderPath(pathname)) return 'peak-finder-asset';
  return 'ignore';
}

/** Same-origin paths that must never go through the Peak Finder service worker. */
export const SW_PASSTHROUGH_PATHS = ['/maplibre-gl-worker.mjs'] as const;

export function isServiceWorkerPassthrough(pathname: string): boolean {
  if (SW_PASSTHROUGH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return true;
  }
  return pathname === '/map' || pathname.startsWith('/map/');
}

export function shouldServiceWorkerIntercept(
  pathname: string,
  mode: string,
  peakFinderClient: boolean,
): boolean {
  if (isServiceWorkerPassthrough(pathname)) return false;
  const kind = classifyServiceWorkerFetch(pathname, mode);
  if (kind === 'ignore') return false;
  if (kind === 'next-static') return peakFinderClient;
  return true;
}

export const PEAK_FINDER_SW_URL = '/sw-peak-finder.js';
export const PEAK_FINDER_SW_SCOPE = '/';
