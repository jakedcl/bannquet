import { cachedSourceRead, buildSourceResult } from '@/lib/mountain-weather/fetch-source';
import { freshnessFromIssued, mergeFreshness } from '@/lib/mountain-weather/freshness';
import type { NwsStationLatest } from '@/lib/mountain-weather/mansfield-types';
import { parseNwsStationLatest } from '@/lib/mountain-weather/parse/nws-station-latest';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';
import { outsideFetch } from '@/lib/outside-fetch';

const USER_AGENT = 'Bannquet-Weather-App (admin@bannquet.com)';

export function nwsStationSourceDef(stationId: string): SourceDef {
  const slug = stationId.toLowerCase();
  return {
    id: `nws-station-${slug}`,
    org: 'National Weather Service',
    kind: 'measured',
    terms: 'reuse-ok',
    url: `https://api.weather.gov/stations/${encodeURIComponent(stationId)}/observations/latest`,
    ttlSeconds: 600,
    expectedEveryHours: 1,
  };
}

const readerCache = new Map<string, () => Promise<SourceResult<NwsStationLatest>>>();

function loadFactory(stationId: string): () => Promise<SourceResult<NwsStationLatest>> {
  const def = nwsStationSourceDef(stationId);
  const url = def.url;
  return async (): Promise<SourceResult<NwsStationLatest>> => {
    try {
      const res = await outsideFetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/ld+json' },
        next: { revalidate: 0 },
      });
      const sourceUrl = res.url || url;
      if (!res.ok) throw new Error(`Station HTTP ${res.status}`);
      const text = await res.text();
      const issuedAt = res.headers.get('last-modified');
      const base = buildSourceResult({
        fetched: { ok: true, text, issuedAt, sourceUrl },
        parse: parseNwsStationLatest,
        issuedAt,
      });
      if (base.status === 'error' || !base.data) return base;
      return mergeFreshness(freshnessFromIssued(base.issuedAt, def.expectedEveryHours), base);
    } catch (err) {
      return {
        status: 'error',
        data: null,
        issuedAt: null,
        validFrom: null,
        validTo: null,
        sourceUrl: url,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };
}

export function readNwsStationLatest(stationId: string): Promise<SourceResult<NwsStationLatest>> {
  let reader = readerCache.get(stationId);
  if (!reader) {
    const def = nwsStationSourceDef(stationId);
    const load = loadFactory(stationId);
    reader = cachedSourceRead({
      cacheKey: [def.id],
      def,
      read: load,
    });
    readerCache.set(stationId, reader);
  }
  return reader();
}