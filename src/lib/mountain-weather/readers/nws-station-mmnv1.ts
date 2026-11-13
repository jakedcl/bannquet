import { cachedSourceRead, buildSourceResult } from '@/lib/mountain-weather/fetch-source';
import { freshnessFromIssued, mergeFreshness } from '@/lib/mountain-weather/freshness';
import type { NwsStationLatest } from '@/lib/mountain-weather/mansfield-types';
import { parseNwsStationLatest } from '@/lib/mountain-weather/parse/nws-station-latest';
import { NWS_STATION_MMNV1_DEF } from '@/lib/mountain-weather/registry';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
import { outsideFetch } from '@/lib/outside-fetch';

const USER_AGENT = 'Bannquet-Weather-App (admin@bannquet.com)';

async function load(): Promise<SourceResult<NwsStationLatest>> {
  const def = NWS_STATION_MMNV1_DEF;
  const url = def.url;
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
}

const readCached = cachedSourceRead({
  cacheKey: [NWS_STATION_MMNV1_DEF.id],
  def: NWS_STATION_MMNV1_DEF,
  read: load,
});

export async function readMmnv1Latest(): Promise<SourceResult<NwsStationLatest>> {
  return readCached();
}
