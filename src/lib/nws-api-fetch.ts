import { outsideFetch } from '@/lib/outside-fetch';

const USER_AGENT = 'Bannquet-Weather-App (admin@bannquet.com)';
const MAX_CONCURRENT = 5;
const MAX_RETRIES = 3;
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

let inFlight = 0;
const waitQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (inFlight < MAX_CONCURRENT) {
    inFlight += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waitQueue.push(() => {
      inFlight += 1;
      resolve();
    });
  });
}

function releaseSlot(): void {
  inFlight -= 1;
  const next = waitQueue.shift();
  if (next) next();
}

function isWeatherGov(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'api.weather.gov' || host.endsWith('.weather.gov');
  } catch {
    return false;
  }
}

function backoffMs(attempt: number): number {
  return Math.min(8_000, 500 * 2 ** attempt);
}

export async function nwsApiFetch(
  url: string | URL,
  init: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {},
  timeoutMs = 8_000,
): Promise<Response> {
  if (!isWeatherGov(String(url))) {
    return outsideFetch(url, init, timeoutMs);
  }

  const headers = new Headers(init.headers);
  if (!headers.has('User-Agent')) headers.set('User-Agent', USER_AGENT);

  await acquireSlot();
  try {
    let lastRes: Response | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const res = await outsideFetch(url, { ...init, headers }, timeoutMs);
      lastRes = res;
      if (res.ok || !RETRY_STATUSES.has(res.status) || attempt === MAX_RETRIES) {
        return res;
      }
      await new Promise((r) => setTimeout(r, backoffMs(attempt)));
    }
    return lastRes!;
  } finally {
    releaseSlot();
  }
}