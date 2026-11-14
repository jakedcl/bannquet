import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import { freshnessFromIssued, mergeFreshness } from '@/lib/mountain-weather/freshness';
import type { BalloonForecast } from '@/lib/mountain-weather/balloon-types';
import { parseBalloonXml } from '@/lib/mountain-weather/parse/balloon';
import { NWS_BTV_BALLOON_DEF } from '@/lib/mountain-weather/registry';
import type { SourceResult } from '@/lib/mountain-weather/source-types';

async function load(): Promise<SourceResult<BalloonForecast>> {
  const def = NWS_BTV_BALLOON_DEF;
  const fetched = await fetchSourceBody(def.url);
  const base = buildSourceResult({
    fetched,
    parse: parseBalloonXml,
    issuedAt: fetched.ok ? fetched.issuedAt : null,
  });
  if (base.status === 'error' || !base.data) return base;
  const firstIssued = base.data.regions.find((r) => r.issuanceLine)?.issuanceLine ?? base.issuedAt;
  return mergeFreshness(freshnessFromIssued(base.issuedAt ?? firstIssued, def.expectedEveryHours), base);
}

const readCached = cachedSourceRead({
  cacheKey: [NWS_BTV_BALLOON_DEF.id],
  def: NWS_BTV_BALLOON_DEF,
  read: load,
});

export async function readBtvBalloonForecast(): Promise<SourceResult<BalloonForecast>> {
  return readCached();
}
