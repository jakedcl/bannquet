import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import { freshnessFromIssued, mergeFreshness } from '@/lib/mountain-weather/freshness';
import type { MansfieldSnowClimatology } from '@/lib/mountain-weather/mansfield-types';
import { parseMmnHighchartsSeries } from '@/lib/mountain-weather/parse/mmn-depth';
import { NWS_BTV_MMN_SNOW_CLIM_DEF } from '@/lib/mountain-weather/registry';
import type { SourceResult } from '@/lib/mountain-weather/source-types';

const DEPTH_URLS = {
  avg: 'https://www.weather.gov/source/btv/rec/mmn/avgdepth.xml',
  max: 'https://www.weather.gov/source/btv/rec/mmn/maxdepth.xml',
  min: 'https://www.weather.gov/source/btv/rec/mmn/mindepth.xml',
} as const;

async function load(): Promise<SourceResult<MansfieldSnowClimatology>> {
  const def = NWS_BTV_MMN_SNOW_CLIM_DEF;
  const [avgF, maxF, minF] = await Promise.all([
    fetchSourceBody(DEPTH_URLS.avg),
    fetchSourceBody(DEPTH_URLS.max),
    fetchSourceBody(DEPTH_URLS.min),
  ]);
  const issuedAt =
    [avgF, maxF, minF].find((f): f is typeof avgF & { ok: true } => f.ok && f.issuedAt !== null)?.issuedAt ?? null;
  const sourceUrl = DEPTH_URLS.avg;
  if (!avgF.ok || !maxF.ok || !minF.ok) {
    const err = [avgF, maxF, minF].find((f) => !f.ok) as { ok: false; error: string };
    return {
      status: 'error',
      data: null,
      issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl,
      error: err?.error ?? 'Snow depth climatology fetch failed',
    };
  }
  try {
    const data: MansfieldSnowClimatology = {
      avg: parseMmnHighchartsSeries(avgF.text),
      max: parseMmnHighchartsSeries(maxF.text),
      min: parseMmnHighchartsSeries(minF.text),
    };
    const base: SourceResult<MansfieldSnowClimatology> = {
      status: 'ok',
      data,
      issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl,
    };
    return mergeFreshness(freshnessFromIssued(issuedAt, def.expectedEveryHours), base);
  } catch (err) {
    return {
      status: 'error',
      data: null,
      issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

const readCached = cachedSourceRead({
  cacheKey: [NWS_BTV_MMN_SNOW_CLIM_DEF.id],
  def: NWS_BTV_MMN_SNOW_CLIM_DEF,
  read: load,
});

export async function readMansfieldSnowClimatology(): Promise<SourceResult<MansfieldSnowClimatology>> {
  return readCached();
}
