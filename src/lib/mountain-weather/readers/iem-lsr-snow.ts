import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import type { MountainWfo } from '@/lib/mountain-weather/nws-office';
import { parseIemLsrSnowGeoJson } from '@/lib/mountain-weather/parse/iem-lsr';
import type { IemLsrSnowEvent } from '@/lib/mountain-weather/snow-types';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

function lsrDef(office: MountainWfo, sts: string, ets: string): SourceDef {
  return {
    id: `iem-${office.toLowerCase()}-lsr-snow`,
    org: 'Iowa Environmental Mesonet',
    kind: 'measured',
    terms: 'reuse-ok',
    url: `https://mesonet.agron.iastate.edu/geojson/lsr.py?wfo=${office}&sts=${sts}&ets=${ets}`,
    ttlSeconds: 1800,
    expectedEveryHours: 6,
    season: 'winter',
  };
}

function windowIso(): { sts: string; ets: string } {
  const ets = new Date();
  const sts = new Date(ets.getTime() - 14 * 24 * 60 * 60 * 1000);
  return { sts: sts.toISOString().replace(/\.\d{3}Z$/, 'Z'), ets: ets.toISOString().replace(/\.\d{3}Z$/, 'Z') };
}

const readerCache = new Map<MountainWfo, () => Promise<SourceResult<IemLsrSnowEvent[]>>>();

export function readIemLsrSnow(office: MountainWfo): Promise<SourceResult<IemLsrSnowEvent[]>> {
  let reader = readerCache.get(office);
  if (!reader) {
    const { sts, ets } = windowIso();
    const def = lsrDef(office, sts, ets);
    const load = async (): Promise<SourceResult<IemLsrSnowEvent[]>> => {
      const fetched = await fetchSourceBody(def.url);
      return buildSourceResult({ fetched, parse: parseIemLsrSnowGeoJson });
    };
    reader = cachedSourceRead({ cacheKey: [def.id, sts.slice(0, 10)], def, read: load });
    readerCache.set(office, reader);
  }
  return reader();
}

export function iemLsrSnowSourceDef(office: MountainWfo): SourceDef {
  const { sts, ets } = windowIso();
  return lsrDef(office, sts, ets);
}