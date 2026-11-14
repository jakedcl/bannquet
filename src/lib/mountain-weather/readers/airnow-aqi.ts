import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import {
  AIRNOW_NORTHEAST_BBOX,
  airNowQueryHourRange,
  parseAirNowDataRows,
  pickAirNowForPlace,
  type AirNowDataRow,
  type AirNowPlaceObservation,
} from '@/lib/mountain-weather/parse/airnow-data';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

export const AIRNOW_AQI_DEF: SourceDef = {
  id: 'airnow-aqi',
  org: 'AirNow (EPA)',
  kind: 'official',
  terms: 'reuse-ok',
  url: 'https://www.airnowapi.org/aq/data/',
  ttlSeconds: 3600,
  expectedEveryHours: 1,
};

export type { AirNowPlaceObservation, AirNowParameterObservation } from '@/lib/mountain-weather/parse/airnow-data';

const DATA_BASE = 'https://www.airnowapi.org/aq/data/';

function airNowDataUrl(key: string): string {
  const { start, end } = airNowQueryHourRange(2);
  const bbox = [
    AIRNOW_NORTHEAST_BBOX.minLon,
    AIRNOW_NORTHEAST_BBOX.minLat,
    AIRNOW_NORTHEAST_BBOX.maxLon,
    AIRNOW_NORTHEAST_BBOX.maxLat,
  ].join(',');
  const params = new URLSearchParams({
    startDate: start,
    endDate: end,
    parameters: 'PM25,OZONE',
    BBOX: bbox,
    dataType: 'A',
    format: 'application/json',
    verbose: '1',
    monitorType: '0',
    includerawconcentrations: '0',
    API_KEY: key,
  });
  return `${DATA_BASE}?${params.toString()}`;
}

let northeastReader: (() => Promise<SourceResult<AirNowDataRow[]>>) | null = null;

function northeastBundledReader(key: string): () => Promise<SourceResult<AirNowDataRow[]>> {
  if (!northeastReader) {
    northeastReader = cachedSourceRead({
      cacheKey: ['airnow-northeast-bbox'],
      def: AIRNOW_AQI_DEF,
      read: async () => {
        const url = airNowDataUrl(key);
        return buildSourceResult({
          fetched: await fetchSourceBody(url),
          parse: parseAirNowDataRows,
        });
      },
    });
  }
  return northeastReader;
}

/** When AIRNOW_API_KEY is unset, returns status ok with null data (link-only UI). */
export async function readAirNowCurrent(
  lat: number,
  lon: number,
): Promise<SourceResult<AirNowPlaceObservation | null>> {
  const key = process.env.AIRNOW_API_KEY?.trim();
  if (!key) {
    return {
      status: 'ok',
      data: null,
      issuedAt: null,
      validFrom: null,
      validTo: null,
      sourceUrl: AIRNOW_AQI_DEF.url,
    };
  }
  const bundle = await northeastBundledReader(key)();
  if (bundle.status === 'error') {
    return {
      status: 'error',
      data: null,
      issuedAt: bundle.issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl: AIRNOW_AQI_DEF.url,
      error: bundle.error,
    };
  }
  const rows = bundle.data ?? [];
  const picked = pickAirNowForPlace(rows, lat, lon);
  const issuedAt =
    picked?.parameters.reduce<string | null>((latest, row) => {
      if (!latest || row.observedAt > latest) return row.observedAt;
      return latest;
    }, null) ??
    bundle.issuedAt ??
    null;
  return {
    status: 'ok',
    data: picked,
    issuedAt,
    validFrom: null,
    validTo: null,
    sourceUrl: AIRNOW_AQI_DEF.url,
  };
}