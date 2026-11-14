import { buildSourceResult, cachedSourceRead, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import { freshnessFromIssued, mergeFreshness } from '@/lib/mountain-weather/freshness';
import type { NwsStationLatest } from '@/lib/mountain-weather/mansfield-types';
import { parseNwsStationLatest } from '@/lib/mountain-weather/parse/nws-station-latest';
import { stationHasReadableMeasurements } from '@/lib/mountain-weather/parse/nws-station-units';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

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
    const fetched = await fetchSourceBody(url, 8_000, {
      accept: 'application/geo+json, application/ld+json',
    });
    if (!fetched.ok && fetched.httpStatus === 404) {
      return {
        status: 'not-in-issuance',
        data: null,
        issuedAt: null,
        validFrom: null,
        validTo: null,
        sourceUrl: fetched.sourceUrl,
        error: 'No latest observation published for this station (HTTP 404)',
      };
    }
    const base = buildSourceResult({
      fetched,
      parse: parseNwsStationLatest,
      issuedAt: fetched.ok ? fetched.issuedAt : null,
    });
    if (base.status === 'error' || !base.data) return base;

    if (!stationHasReadableMeasurements(base.data.fields)) {
      return {
        ...base,
        status: 'ok',
      };
    }

    return mergeFreshness(freshnessFromIssued(base.issuedAt, def.expectedEveryHours), base);
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