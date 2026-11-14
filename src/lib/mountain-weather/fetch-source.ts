import { unstable_cache } from 'next/cache';
import { nwsApiFetch } from '@/lib/nws-api-fetch';
import { logMountainWeatherSourceError } from '@/lib/mountain-weather/log-source-error';
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

export async function fetchSourceBody(
  url: string,
  timeoutMs = 8_000,
  options?: { accept?: string },
): Promise<FetchOk | FetchErr> {
  try {
    const response = await nwsApiFetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: options?.accept ?? 'application/json, application/geo+json, application/xml, text/plain, */*',
      },
      next: { revalidate: 0 },
    }, timeoutMs);
    const sourceUrl = response.url || url;
    if (!response.ok) {
      const errMsg = `HTTP ${response.status}`;
      logMountainWeatherSourceError('fetch', sourceUrl, errMsg);
      return { ok: false, error: errMsg, httpStatus: response.status, sourceUrl };
    }
    const text = await response.text();
    const issuedAt = response.headers.get('last-modified');
    const dateHdr = response.headers.get('date');
    const fetchedAt = dateHdr ? new Date(dateHdr).toISOString() : new Date().toISOString();
    return { ok: true, text, issuedAt, fetchedAt, httpStatus: response.status, sourceUrl };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logMountainWeatherSourceError('fetch', url, errMsg);
    return {
      ok: false,
      error: errMsg,
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
    const detail = err instanceof Error ? err.message : String(err);
    const errMsg = `Source data could not be parsed: ${detail}`;
    logMountainWeatherSourceError('parse', input.fetched.sourceUrl, errMsg);
    return {
      status: 'error',
      data: null,
      issuedAt: input.issuedAt ?? input.fetched.issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl: input.fetched.sourceUrl,
      error: errMsg,
    };
  }
}

class SourceCacheSkip<T> extends Error {
  constructor(readonly result: SourceResult<T>) {
    super('mwx-cache-skip');
    this.name = 'SourceCacheSkip';
  }
}

/** Cached parsed source; one entry per cache key (never stores raw gridpoint JSON). */
export function cachedSourceRead<T>(options: {
  cacheKey: string[];
  def: Pick<SourceDef, 'id' | 'url' | 'ttlSeconds' | 'expectedEveryHours'>;
  resolveUrl?: () => string;
  read: () => Promise<SourceResult<T>>;
}): () => Promise<SourceResult<T>> {
  const cacheKey = ['mwx-ok-cache-v1', ...options.cacheKey];
  const compute = async (): Promise<SourceResult<T>> => {
    const result = await options.read();
    if (result.status === 'error' && result.error) {
      logMountainWeatherSourceError(options.def.id, result.sourceUrl ?? options.def.url, result.error);
      throw new SourceCacheSkip(result);
    }
    return result;
  };
  const cached = unstable_cache(compute, cacheKey, {
    revalidate: options.def.ttlSeconds,
    tags: [options.def.id],
  });
  return async (): Promise<SourceResult<T>> => {
    try {
      return await cached();
    } catch (err) {
      if (err instanceof SourceCacheSkip) return err.result;
      throw err;
    }
  };
}
