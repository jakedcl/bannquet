import { outsideFetch } from '@/lib/outside-fetch';

const USER_AGENT = 'Bannquet-Weather-App (admin@bannquet.com)';
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 2;

function isWeatherGov(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'api.weather.gov' || host.endsWith('.weather.gov');
  } catch {
    return false;
  }
}

function backoffMs(attempt: number): number {
  return Math.min(4_000, 400 * 2 ** attempt);
}

/**
 * NWS fetches with User-Agent and limited retry on 429/5xx.
 * No global concurrency queue — parallel reads rely on unstable_cache and stay within serverless time limits.
 */
export async function nwsApiFetch(
  url: string | URL,
  init: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {},
  timeoutMs = 8_000,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has('User-Agent')) headers.set('User-Agent', USER_AGENT);

  const run = () => outsideFetch(url, { ...init, headers }, timeoutMs);

  if (!isWeatherGov(String(url))) {
    return run();
  }

  let lastRes: Response | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await run();
    lastRes = res;
    if (res.ok || !RETRY_STATUSES.has(res.status) || attempt === MAX_RETRIES) {
      return res;
    }
    await new Promise((r) => setTimeout(r, backoffMs(attempt)));
  }
  return lastRes!;
}