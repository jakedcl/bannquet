import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import { parseUsdmCountyLatest } from '@/lib/mountain-weather/parse/drought-usdm';
import type { CountyDroughtRow } from '@/lib/mountain-weather/ground-access-types';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

export const USDM_COUNTY_DROUGHT_DEF: SourceDef = {
  id: 'usdm-county-drought',
  org: 'U.S. Drought Monitor (NDMC/USDA/NOAA)',
  kind: 'official',
  terms: 'reuse-ok',
  url: 'https://usdmdataservices.unl.edu/api/CountyStatistics/GetDroughtSeverityStatisticsByAreaPercent',
  ttlSeconds: 86_400,
  expectedEveryHours: 168,
};

const readers = new Map<string, () => Promise<SourceResult<CountyDroughtRow | null>>>();

function urlFor(fips: string) {
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);
  const fmt = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  return `${USDM_COUNTY_DROUGHT_DEF.url}?aoi=${fips}&StatisticsType=1&startDate=${fmt(start)}&endDate=${fmt(end)}`;
}

function readerFor(fips: string) {
  let reader = readers.get(fips);
  if (!reader) {
    const sourceUrl = urlFor(fips);
    reader = cachedSourceRead({
      cacheKey: ['usdm-county', fips],
      def: USDM_COUNTY_DROUGHT_DEF,
      read: async () =>
        buildSourceResult({
          fetched: await fetchSourceBody(sourceUrl),
          parse: (text) => parseUsdmCountyLatest(text, fips),
        }),
    });
    readers.set(fips, reader);
  }
  return reader;
}

export function readUsdmCountyDrought(fips: string): Promise<SourceResult<CountyDroughtRow | null>> {
  return readerFor(fips)();
}