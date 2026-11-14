import { unstable_cache } from 'next/cache';
import { nwsApiFetch } from '@/lib/nws-api-fetch';
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
    const detail = err instanceof Error ? err.message : String(err);
    return {
      status: 'error',
      data: null,
      issuedAt: input.issuedAt ?? input.fetched.issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl: input.fetched.sourceUrl,
      error: `Source data could not be parsed: ${detail}`,
    };
  }
}

class CachedSourceReadError<T> extends Error {
  constructor(public result: SourceResult<T>) {
    super(result.error ?? 'source read error');
    this.name = 'CachedSourceReadError';
  }
}

const ERROR_RESULT_CACHE_TTL_MS = 60_000;
const errorResultCache = new Map<string, { expires: number; result: SourceResult<unknown> }>();

/** Cached parsed source; one entry per cache key (never stores raw gridpoint JSON). */
export function cachedSourceRead<T>(options: {
  cacheKey: string[];
  def: Pick<SourceDef, 'id' | 'url' | 'ttlSeconds' | 'expectedEveryHours'>;
  resolveUrl?: () => string;
  read: () => Promise<SourceResult<T>>;
}): () => Promise<SourceResult<T>> {
  const cacheKeyStr = options.cacheKey.join('|');
  const cachedSuccess = unstable_cache(
    async () => {
      const result = await options.read();
      if (result.status === 'error') {
        throw new CachedSourceReadError(result);
      }
      if (result.status === 'not-in-issuance') {
        return result;
      }
      return result;
    },
    options.cacheKey,
    { revalidate: options.def.ttlSeconds, tags: [options.def.id] },
  );

  return async (): Promise<SourceResult<T>> => {
    const cachedErr = errorResultCache.get(cacheKeyStr);
    if (cachedErr && cachedErr.expires > Date.now()) {
      return cachedErr.result as SourceResult<T>;
    }

    try {
      const result = await cachedSuccess();
      errorResultCache.delete(cacheKeyStr);
      return result;
    } catch (err) {
      if (err instanceof CachedSourceReadError) {
        errorResultCache.set(cacheKeyStr, {
          expires: Date.now() + ERROR_RESULT_CACHE_TTL_MS,
          result: err.result,
        });
        return err.result;
      }
      const fresh = await options.read();
      if (fresh.status === 'error') {
        errorResultCache.set(cacheKeyStr, {
          expires: Date.now() + ERROR_RESULT_CACHE_TTL_MS,
          result: fresh,
        });
      }
      return fresh;
    }
  };
}
