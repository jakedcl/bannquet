/** Server-side diagnostics for Vercel/runtime logs (no secrets). */
export function logMountainWeatherSourceError(
  sourceId: string,
  sourceUrl: string,
  message: string,
): void {
  const safeMsg = message.replace(/\s+/g, ' ').slice(0, 500);
  const safeUrl = sourceUrl.split('?')[0];
  console.error(`[mountain-weather] source error id=${sourceId} url=${safeUrl} msg=${safeMsg}`);
}