import { unstable_cache } from 'next/cache';
import { outsideFetch } from '@/lib/outside-fetch';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

const USER_AGENT = 'Bannquet-Weather-App (admin@bannquet.com)';

type FetchOk = {
  ok: true;
  text: string;
  issuedAt: string | null;
  /** HTTP Date header when present, else fetch wall time (UTC). */
  fetchedAt?: string;
  httpStatus?: number;
  sourceUrl: string;
};
type FetchErr = { ok: false; error: string; httpStatus?: number | null; sourceUrl: string };

export async function fetchSourceBody(url: string, timeoutMs = 8_000): Promise<FetchOk | FetchErr> {
  try {
    const response = await outsideFetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json, application/geo+json, application/xml, text/plain, */*',
      },
      next: { revalidate: 0 },
    }, timeoutMs);
    const sourceUrl = response.url || url;
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}`, httpStatus: response.status, sourceUrl };
    }
    const text = await response.text();
    const issuedAt = response.headers.get('last-modified');
    const dateHdr = response.headers.get('date');
    const fetchedAt = dateHdr ? new Date(dateHdr).toISOString() : new Date().toISOString();
    return { ok: true, text, issuedAt, fetchedAt, httpStatus: response.status, sourceUrl };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      httpStatus: null,
      sourceUrl: url,
    };
  }
}

export function buildSourceResult<T>(input: {
  fetched: FetchOk | FetchErr;
  parse: (text: string) => T;
  issuedAt?: string | null;
}): SourceResult<T> {
  if (!input.fetched.ok) {
    return {
      status: 'error',
      data: null,
      issuedAt: null,
      validFrom: null,
      validTo: null,
      sourceUrl: input.fetched.sourceUrl,
      error: input.fetched.error,
    };
  }
  try {
    const data = input.parse(input.fetched.text);
    const issuedAt = input.issuedAt ?? input.fetched.issuedAt;
    return {
      status: 'ok',
      data,
      issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl: input.fetched.sourceUrl,
    };
  } catch (err) {
    return {
      status: 'error',
      data: null,
      issuedAt: input.issuedAt ?? input.fetched.issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl: input.fetched.sourceUrl,
      error: err instanceof Error ? err.message : 'Parse failed',
    };
  }
}

/** Cached parsed source; one entry per cache key (never stores raw gridpoint JSON). */
export function cachedSourceRead<T>(options: {
  cacheKey: string[];
  def: Pick<SourceDef, 'id' | 'url' | 'ttlSeconds' | 'expectedEveryHours'>;
  resolveUrl?: () => string;
  read: () => Promise<SourceResult<T>>;
}): () => Promise<SourceResult<T>> {
  return unstable_cache(
    options.read,
    options.cacheKey,
    { revalidate: options.def.ttlSeconds, tags: [options.def.id] },
  );
}
