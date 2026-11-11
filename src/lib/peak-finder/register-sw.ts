import { PEAK_FINDER_SW_SCOPE, PEAK_FINDER_SW_URL } from './sw-routing';

const LEGACY_SW = '/peak-finder/sw.js';

export function registerPeakFinderServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!window.isSecureContext) return;
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      const script = registration.active?.scriptURL ?? registration.installing?.scriptURL ?? '';
      if (script.includes(LEGACY_SW)) void registration.unregister();
    }
  });
  void navigator.serviceWorker
    .register(PEAK_FINDER_SW_URL, { scope: PEAK_FINDER_SW_SCOPE, updateViaCache: 'none' })
    .catch(() => {
      /* Offline peak data still works from Cache Storage if SW install fails */
    });
}
