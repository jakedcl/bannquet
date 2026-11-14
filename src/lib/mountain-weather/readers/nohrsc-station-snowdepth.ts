import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import { parseNohrscStationSnowText } from '@/lib/mountain-weather/parse/nohrsc-stations';
import type { NohrscStationRow } from '@/lib/mountain-weather/parse/nohrsc-stations';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

import snapshotJson from '../../../../config/mountain-weather/snow-nohrsc-snapshot.json';

type SnapshotFile = {
  fetchedAt: string;
  sourceUrl: string;
  reportToken: string;
};

const SNAP = snapshotJson as SnapshotFile;

export const NOHRSC_STATION_SNOWDEPTH_DEF: SourceDef = {
  id: 'nohrsc-station-snowdepth-ne',
  org: 'NOHRSC',
  kind: 'measured',
  terms: 'reuse-ok',
  url: SNAP.sourceUrl,
  ttlSeconds: 1800,
  expectedEveryHours: 6,
  season: 'winter',
};

async function load(): Promise<SourceResult<NohrscStationRow[]>> {
  const url = NOHRSC_STATION_SNOWDEPTH_DEF.url;
  const fetched = await fetchSourceBody(url);
  return buildSourceResult({
    fetched,
    parse: parseNohrscStationSnowText,
    issuedAt: SNAP.fetchedAt,
  });
}

const readCached = cachedSourceRead({
  cacheKey: [NOHRSC_STATION_SNOWDEPTH_DEF.id, SNAP.reportToken],
  def: NOHRSC_STATION_SNOWDEPTH_DEF,
  read: load,
});

export function readNohrscStationSnowdepth(): Promise<SourceResult<NohrscStationRow[]>> {
  return readCached();
}