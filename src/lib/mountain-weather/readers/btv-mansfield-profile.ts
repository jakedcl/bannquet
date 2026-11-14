import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import { freshnessFromIssued, mergeFreshness } from '@/lib/mountain-weather/freshness';
import type { MansfieldProfile } from '@/lib/mountain-weather/mansfield-types';
import { parseBtvPublicProfile } from '@/lib/mountain-weather/parse/btv-profile';
import { NWS_BTV_MANSFIELD_PROFILE_DEF } from '@/lib/mountain-weather/registry';
import type { SourceResult } from '@/lib/mountain-weather/source-types';

async function load(): Promise<SourceResult<MansfieldProfile>> {
  const def = NWS_BTV_MANSFIELD_PROFILE_DEF;
  const fetched = await fetchSourceBody(def.url);
  const base = buildSourceResult({ fetched, parse: parseBtvPublicProfile, issuedAt: fetched.ok ? fetched.issuedAt : null });
  if (base.status === 'error' || !base.data) return base;
  return mergeFreshness(freshnessFromIssued(base.issuedAt, def.expectedEveryHours), base);
}

const readCached = cachedSourceRead({
  cacheKey: [NWS_BTV_MANSFIELD_PROFILE_DEF.id],
  def: NWS_BTV_MANSFIELD_PROFILE_DEF,
  read: load,
});

export async function readMansfieldProfile(): Promise<SourceResult<MansfieldProfile>> {
  return readCached();
}
