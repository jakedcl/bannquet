/**
 * fetch for outside data (NWS, NOAA, USGS, NY open data, Resend). Each call
 * gives up after `ms` so one slow source can't hold a page until the
 * function times out (fishing pages were returning 504s). Callers already
 * treat a thrown error as "data unavailable".
 */
export function outsideFetch(
  url: string | URL,
  init: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {},
  ms = 5_000,
): Promise<Response> {
  const timeout = AbortSignal.timeout(ms);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(url, { ...init, signal });
}
