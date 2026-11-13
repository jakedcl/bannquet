import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import { freshnessFromIssued, mergeFreshness } from '@/lib/mountain-weather/freshness';
import type { MansfieldHyd } from '@/lib/mountain-weather/mansfield-types';
import { parseMansfieldHydXml } from '@/lib/mountain-weather/parse/mansfield-hyd';
import { NWS_BTV_MANSFIELD_HYD_DEF } from '@/lib/mountain-weather/registry';
import type { SourceResult } from '@/lib/mountain-weather/source-types';

async function load(): Promise<SourceResult<MansfieldHyd>> {
  const def = NWS_BTV_MANSFIELD_HYD_DEF;
  const fetched = await fetchSourceBody(def.url);
  const base = buildSourceResult({
    fetched,
    parse: parseMansfieldHydXml,
    issuedAt: fetched.ok ? fetched.issuedAt : null,
  });
  if (base.status === 'error' || !base.data) return base;
  const status = base.data.seasonalOff ? 'seasonal-off' : base.status;
  return mergeFreshness(freshnessFromIssued(base.issuedAt, def.expectedEveryHours), { ...base, status });
}

const readCached = cachedSourceRead({
  cacheKey: [NWS_BTV_MANSFIELD_HYD_DEF.id],
  def: NWS_BTV_MANSFIELD_HYD_DEF,
  read: load,
});

export async function readMansfieldHyd(): Promise<SourceResult<MansfieldHyd>> {
  return readCached();
}
