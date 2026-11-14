import { cachedSourceRead, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import type { NwsAlertsBundle, NwsAlertSummary } from '@/lib/mountain-weather/map-types';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

export const NWS_ALERTS_ACTIVE_NE_DEF: SourceDef = {
  id: 'nws-alerts-active-ne',
  org: 'National Weather Service',
  kind: 'official',
  terms: 'reuse-ok',
  url: 'https://api.weather.gov/alerts/active',
  ttlSeconds: 300,
  expectedEveryHours: 1,
};

const STATES = ['NY', 'VT', 'NH', 'ME'] as const;

type GeoFeature = {
  id?: string;
  geometry?: { type: string; coordinates?: unknown };
  properties?: {
    id?: string;
    event?: string;
    severity?: string;
    headline?: string;
    ends?: string;
    areaDesc?: string;
    geocode?: { UGC?: string[]; SAME?: string[] };
  };
};

function alertCentroid(geometry: GeoFeature['geometry']): { lat: number; lon: number } | null {
  if (!geometry) return null;
  if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
    const [lon, lat] = geometry.coordinates as number[];
    if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
  }
  return null;
}

function featureInStates(feature: GeoFeature): boolean {
  const ugc = feature.properties?.geocode?.UGC ?? [];
  return ugc.some((code) => STATES.some((st) => code.startsWith(st)));
}

function summaryFromFeature(feature: GeoFeature): NwsAlertSummary {
  const props = feature.properties ?? {};
  return {
    id: props.id ?? feature.id ?? `${props.event ?? 'alert'}-${props.geocode?.SAME?.[0] ?? feature.id ?? 'unknown'}`,
    event: props.event ?? 'Alert',
    severity: props.severity ?? null,
    headline: props.headline ?? null,
    ends: props.ends ?? null,
    areaDesc: props.areaDesc ?? null,
  };
}

function parseAlerts(text: string): NwsAlertsBundle {
  const body = JSON.parse(text) as { features?: GeoFeature[] };
  const alerts: NwsAlertSummary[] = [];
  const mapPins: NwsAlertsBundle['mapPins'] = [];
  const seen = new Set<string>();
  for (const feature of body.features ?? []) {
    if (!featureInStates(feature)) continue;
    const summary = summaryFromFeature(feature);
    if (seen.has(summary.id)) continue;
    seen.add(summary.id);
    alerts.push(summary);
    const center = alertCentroid(feature.geometry);
    if (center) mapPins.push({ ...summary, lat: center.lat, lon: center.lon });
  }
  return { alerts, mapPins };
}

async function loadAlerts(): Promise<SourceResult<NwsAlertsBundle>> {
  const parts = await Promise.all(
    STATES.map((state) => fetchSourceBody(`https://api.weather.gov/alerts/active?area=${state}`)),
  );
  const okParts = parts.filter((p): p is Extract<typeof p, { ok: true }> => p.ok);
  if (okParts.length === 0) {
    const err = parts.find((p) => !p.ok);
    return {
      status: 'error',
      data: null,
      issuedAt: null,
      validFrom: null,
      validTo: null,
      sourceUrl: NWS_ALERTS_ACTIVE_NE_DEF.url,
      error: err && !err.ok ? err.error : 'No alert feeds responded',
    };
  }
  const mergedAlerts: NwsAlertSummary[] = [];
  const mergedPins: NwsAlertsBundle['mapPins'] = [];
  const seen = new Set<string>();
  let issuedAt: string | null = null;
  for (const part of okParts) {
    if (part.issuedAt && !issuedAt) issuedAt = part.issuedAt;
    const chunk = parseAlerts(part.text);
    for (const row of chunk.alerts) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      mergedAlerts.push(row);
    }
    for (const pin of chunk.mapPins) {
      if (!mergedPins.some((p) => p.id === pin.id)) mergedPins.push(pin);
    }
  }
  return {
    status: 'ok',
    data: { alerts: mergedAlerts, mapPins: mergedPins },
    issuedAt,
    validFrom: null,
    validTo: null,
    sourceUrl: NWS_ALERTS_ACTIVE_NE_DEF.url,
  };
}

const readCached = cachedSourceRead({
  cacheKey: [NWS_ALERTS_ACTIVE_NE_DEF.id],
  def: NWS_ALERTS_ACTIVE_NE_DEF,
  read: loadAlerts,
});

export async function readNwsAlertsActiveNe(): Promise<SourceResult<NwsAlertsBundle>> {
  return readCached();
}