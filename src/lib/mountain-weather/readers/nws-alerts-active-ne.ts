import { cachedSourceRead, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import type { NwsAlertsBundle, NwsAlertSummary } from '@/lib/mountain-weather/map-types';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';
import { colorForAlertEvent } from '@/lib/mountain-weather/alert-map-colors';
import { polygonsFromGeometry, readNwsZoneGeometry } from '@/lib/mountain-weather/readers/nws-zone-geometry';

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
  geometry?: GeoJSON.Geometry | null;
  properties?: {
    id?: string;
    event?: string;
    severity?: string;
    headline?: string;
    ends?: string;
    onset?: string;
    effective?: string;
    expires?: string;
    areaDesc?: string;
    geocode?: { UGC?: string[]; SAME?: string[] };
  };
};

function featureInStates(feature: GeoFeature): boolean {
  const ugc = feature.properties?.geocode?.UGC ?? [];
  return ugc.some((code) => STATES.some((st) => code.startsWith(st)));
}

function summaryFromFeature(feature: GeoFeature): NwsAlertSummary {
  const props = feature.properties ?? {};
  return {
    id: props.id ?? feature.id ?? `${props.event ?? 'alert'}-${props.geocode?.SAME?.[0] ?? 'unknown'}`,
    event: props.event ?? 'Alert',
    severity: props.severity ?? null,
    headline: props.headline ?? null,
    ends: props.ends ?? props.expires ?? null,
    areaDesc: props.areaDesc ?? null,
    effective: props.effective ?? null,
    expires: props.expires ?? props.ends ?? null,
    onset: props.onset ?? null,
  };
}

function validLabel(summary: NwsAlertSummary): string {
  const from = summary.effective ?? summary.onset;
  const to = summary.expires ?? summary.ends;
  if (from && to) return `${from} – ${to}`;
  if (from) return `from ${from}`;
  if (to) return `until ${to}`;
  return 'Valid times not published';
}

function geometryIsDrawable(geometry: GeoJSON.Geometry | null | undefined): geometry is GeoJSON.Polygon | GeoJSON.MultiPolygon {
  return geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon';
}

async function geometryForFeature(feature: GeoFeature): Promise<GeoJSON.Polygon | GeoJSON.MultiPolygon | GeoJSON.Point | null> {
  const geometry = feature.geometry ?? null;
  if (geometryIsDrawable(geometry)) return geometry;
  if (geometry?.type === 'Point') return geometry;

  const zones = [...new Set(feature.properties?.geocode?.UGC ?? [])].filter((z) => /^[A-Z]{2}[CZ]/.test(z));
  if (zones.length === 0) return null;

  const polygons: GeoJSON.Polygon[] = [];
  for (const zoneId of zones) {
    const res = await readNwsZoneGeometry(zoneId);
    if (res.status === 'ok' && res.data) polygons.push(...polygonsFromGeometry(res.data));
  }
  if (polygons.length === 0) return null;
  if (polygons.length === 1) return polygons[0];
  return { type: 'MultiPolygon', coordinates: polygons.map((p) => p.coordinates) };
}

async function enrichFeatures(features: GeoFeature[]): Promise<GeoJSON.FeatureCollection> {
  const out: GeoJSON.Feature[] = [];
  for (const feature of features) {
    const summary = summaryFromFeature(feature);
    const geometry = await geometryForFeature(feature);
    if (!geometry) continue;
    out.push({
      type: 'Feature',
      id: summary.id,
      properties: {
        ...summary,
        color: colorForAlertEvent(summary.event),
        validLabel: validLabel(summary),
      },
      geometry,
    });
  }
  return { type: 'FeatureCollection', features: out };
}

function legendFromFeatures(features: GeoJSON.Feature[]): Array<{ event: string; color: string }> {
  const seen = new Map<string, string>();
  for (const f of features) {
    const event = String(f.properties?.event ?? 'Alert');
  const color = String(f.properties?.color ?? colorForAlertEvent(event));
    if (!seen.has(event)) seen.set(event, color);
  }
  return [...seen.entries()].map(([event, color]) => ({ event, color }));
}

function parseSummaries(text: string): NwsAlertSummary[] {
  const body = JSON.parse(text) as { features?: GeoFeature[] };
  const alerts: NwsAlertSummary[] = [];
  const seen = new Set<string>();
  for (const feature of body.features ?? []) {
    if (!featureInStates(feature)) continue;
    const summary = summaryFromFeature(feature);
    if (seen.has(summary.id)) continue;
    seen.add(summary.id);
    alerts.push(summary);
  }
  return alerts;
}

function rawFeatures(text: string): GeoFeature[] {
  const body = JSON.parse(text) as { features?: GeoFeature[] };
  return (body.features ?? []).filter(featureInStates);
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
  const raw: GeoFeature[] = [];
  const seen = new Set<string>();
  let issuedAt: string | null = null;
  for (const part of okParts) {
    if (part.issuedAt && !issuedAt) issuedAt = part.issuedAt;
    for (const row of parseSummaries(part.text)) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      mergedAlerts.push(row);
    }
    for (const feature of rawFeatures(part.text)) {
      const id = summaryFromFeature(feature).id;
      if (raw.some((f) => summaryFromFeature(f).id === id)) continue;
      raw.push(feature);
    }
  }

  const mapGeoJson = await enrichFeatures(raw);
  return {
    status: 'ok',
    data: {
      alerts: mergedAlerts,
      mapGeoJson,
      legend: legendFromFeatures(mapGeoJson.features),
    },
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