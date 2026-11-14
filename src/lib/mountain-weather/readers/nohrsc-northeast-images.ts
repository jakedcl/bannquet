import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import { nohrscImageUrl, parseNohrscIndexRunToken } from '@/lib/mountain-weather/parse/nohrsc-stations';
import type { SnowImageAsset } from '@/lib/mountain-weather/snow-types';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

export const NOHRSC_NE_INDEX_DEF: SourceDef = {
  id: 'nohrsc-northeast-index',
  org: 'NOHRSC',
  kind: 'measured',
  terms: 'reuse-ok',
  url: 'https://www.nohrsc.noaa.gov/nsa/index.html?region=Northeast',
  ttlSeconds: 3600,
  expectedEveryHours: 6,
  season: 'winter',
};

const LAYERS: { id: string; layer: string; label: string }[] = [
  { id: 'nohrsc-depth', layer: 'nsm_depth', label: 'Modeled snow depth' },
  { id: 'nohrsc-swe', layer: 'nsm_swe', label: 'Modeled SWE' },
  { id: 'nohrsc-swe-24', layer: 'nsm_swe_change_24hr', label: '24h SWE change' },
  { id: 'nohrsc-melt-24', layer: 'nsm_melt_24hr', label: '24h melt' },
];

async function load(): Promise<SourceResult<SnowImageAsset[]>> {
  const fetched = await fetchSourceBody(NOHRSC_NE_INDEX_DEF.url);
  return buildSourceResult({
    fetched,
    parse: (html) => {
      const run = parseNohrscIndexRunToken(html);
      if (!run) return [];
      return LAYERS.map((row) => ({
        id: row.id,
        label: row.label,
        url: nohrscImageUrl(row.layer, run.yyyymm, run.token),
        org: 'NOHRSC',
        validTimeLabel: run.token.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3 $4 UTC'),
      }));
    },
  });
}

const readCached = cachedSourceRead({
  cacheKey: [NOHRSC_NE_INDEX_DEF.id],
  def: NOHRSC_NE_INDEX_DEF,
  read: load,
});

export function readNohrscNortheastImages(): Promise<SourceResult<SnowImageAsset[]>> {
  return readCached();
}