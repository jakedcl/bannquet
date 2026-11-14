import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

export const AIRNOW_AQI_DEF: SourceDef = {
  id: 'airnow-aqi',
  org: 'AirNow (EPA)',
  kind: 'official',
  terms: 'reuse-ok',
  url: 'https://www.airnowapi.org/aq/observation/latLong/current/',
  ttlSeconds: 3600,
  expectedEveryHours: 1,
};

export type AirNowObservation = {
  aqi: number;
  category: string;
  parameter: string;
  observedAt: string;
};

/** When AIRNOW_API_KEY is unset, returns status ok with null data (link-only UI). */
export async function readAirNowCurrent(lat: number, lon: number): Promise<SourceResult<AirNowObservation | null>> {
  const key = process.env.AIRNOW_API_KEY?.trim();
  const sourceUrl = AIRNOW_AQI_DEF.url;
  if (!key) {
    return {
      status: 'ok',
      data: null,
      issuedAt: null,
      validFrom: null,
      validTo: null,
      sourceUrl,
    };
  }
  const url = `${sourceUrl}?format=application/json&latitude=${lat}&longitude=${lon}&distance=50&API_KEY=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      return {
        status: 'error',
        data: null,
        issuedAt: null,
        validFrom: null,
        validTo: null,
        sourceUrl: res.url || url,
        error: `HTTP ${res.status}`,
      };
    }
    const rows = (await res.json()) as AirNowObservation[];
    const pm = rows.find((r) => r.parameter === 'PM2.5') ?? rows[0];
    return {
      status: 'ok',
      data: pm ?? null,
      issuedAt: pm?.observedAt ?? null,
      validFrom: null,
      validTo: null,
      sourceUrl: res.url || url,
    };
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