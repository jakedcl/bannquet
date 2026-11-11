const SW_URL = '/peak-finder/sw.js';

export function registerPeakFinderServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  const secure = window.isSecureContext;
  if (!secure) return;
  void navigator.serviceWorker.register(SW_URL, { scope: '/peak-finder/', updateViaCache: 'none' }).catch(() => {
    /* Optional — offline still works from Cache Storage without SW shell */
  });
}
