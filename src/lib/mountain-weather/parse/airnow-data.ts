import { milesBetween } from '@/lib/mountain-weather/geo-miles';

export const AIRNOW_NORTHEAST_BBOX = {
  minLon: -80,
  minLat: 40,
  maxLon: -66.5,
  maxLat: 47.6,
} as const;

export type AirNowDataRow = {
  lat: number;
  lon: number;
  utc: string;
  parameter: string;
  unit: string | null;
  aqi: number;
  category: string;
  siteName: string | null;
};

export type AirNowParameterObservation = {
  parameter: string;
  displayParameter: string;
  aqi: number;
  category: string;
  siteName: string | null;
  monitorLat: number;
  monitorLon: number;
  distanceMi: number;
  distant: boolean;
  observedAt: string;
  ageMinutes: number | null;
};

export type AirNowPlaceObservation = {
  parameters: AirNowParameterObservation[];
  /** Highest AQI among bound parameters (standard headline). */
  primary: AirNowParameterObservation | null;
};

const DISTANT_MI = 25;

const DISPLAY_PARAMETER: Record<string, string> = {
  PM25: 'PM2.5',
  OZONE: 'Ozone',
};

function normalizeParameter(raw: string): string {
  const u = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (u === 'PM2.5' || u === 'PM₂.₅' || u === 'FINE') return 'PM25';
  if (u === 'O3') return 'OZONE';
  return u;
}

const EPA_AQI_CATEGORY: Record<number, string> = {
  1: 'Good',
  2: 'Moderate',
  3: 'Unhealthy for Sensitive Groups',
  4: 'Unhealthy',
  5: 'Very Unhealthy',
  6: 'Hazardous',
};

function categoryFromNumber(value: number): string | null {
  const rounded = Math.round(value);
  return EPA_AQI_CATEGORY[rounded] ?? null;
}

function categoryLabel(raw: unknown): string {
  if (raw == null) return 'Unknown';
  if (typeof raw === 'number') return categoryFromNumber(raw) ?? String(raw);
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (/^\d+$/.test(trimmed)) {
      const named = categoryFromNumber(Number(trimmed));
      if (named) return named;
    }
    if (trimmed) return trimmed;
  }
  if (typeof raw === 'object' && raw !== null) {
    const o = raw as Record<string, unknown>;
    if (typeof o.Name === 'string' && o.Name.trim()) return o.Name.trim();
    if (typeof o.name === 'string' && o.name.trim()) return o.name.trim();
    if (typeof o.Number === 'number') {
      const named = categoryFromNumber(o.Number);
      if (named) return named;
    }
  }
  return 'Unknown';
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

export function isAirNowWebServiceError(parsed: unknown): parsed is { WebServiceError: { Message?: string }[] } {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    'WebServiceError' in parsed &&
    Array.isArray((parsed as { WebServiceError: unknown }).WebServiceError)
  );
}

export function airNowWebServiceErrorMessage(parsed: {
  WebServiceError: { Message?: string }[];
}): string {
  const first = parsed.WebServiceError[0]?.Message?.trim();
  return first || 'AirNow web service error';
}

/** Parses `/aq/data/` JSON; throws on retirement/outage envelope or invalid JSON. */
export function parseAirNowDataRows(text: string): AirNowDataRow[] {
  const parsed: unknown = JSON.parse(text);
  if (isAirNowWebServiceError(parsed)) {
    throw new Error(airNowWebServiceErrorMessage(parsed));
  }
  if (!Array.isArray(parsed)) {
    throw new Error('AirNow response was not a JSON array');
  }
  const out: AirNowDataRow[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue;
    const o = entry as Record<string, unknown>;
    const lat = pickNumber(o, ['Latitude', 'latitude']);
    const lon = pickNumber(o, ['Longitude', 'longitude']);
    const aqi = pickNumber(o, ['AQI', 'Aqi', 'aqi']);
    const utc = pickString(o, ['UTC', 'Utc', 'utc', 'DateObserved', 'dateObserved']);
    const parameter = pickString(o, ['Parameter', 'parameter']);
    if (lat == null || lon == null || aqi == null || !utc || !parameter) continue;
    const unit = pickString(o, ['Unit', 'unit']);
    const siteName = pickString(o, ['SiteName', 'siteName', 'Site', 'site']);
    const categoryRaw =
      o.Category ?? o.category ?? o.CategoryName ?? o.categoryName ?? o.AQICategory ?? o.aqiCategory;
    out.push({
      lat,
      lon,
      utc,
      parameter: normalizeParameter(parameter),
      unit,
      aqi: Math.round(aqi),
      category: categoryLabel(categoryRaw),
      siteName,
    });
  }
  return out;
}

function monitorKey(row: AirNowDataRow): string {
  return `${row.lat.toFixed(5)},${row.lon.toFixed(5)}`;
}

function utcToInstant(utc: string): Date | null {
  const trimmed = utc.trim();
  if (!trimmed) return null;
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
  if (/T\d{2}$/.test(normalized)) {
    const d = new Date(`${normalized}:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(/:\d{2}:\d{2}$/.test(normalized) ? `${normalized}Z` : `${normalized}:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ageMinutes(utc: string, now: Date): number | null {
  const t = utcToInstant(utc);
  if (!t) return null;
  return Math.max(0, Math.round((now.getTime() - t.getTime()) / 60_000));
}

function latestPerMonitor(rows: AirNowDataRow[]): AirNowDataRow[] {
  const by = new Map<string, AirNowDataRow>();
  for (const row of rows) {
    const key = `${monitorKey(row)}|${row.parameter}`;
    const prev = by.get(key);
    if (!prev) {
      by.set(key, row);
      continue;
    }
    const a = utcToInstant(row.utc);
    const b = utcToInstant(prev.utc);
    if (a && b && a >= b) by.set(key, row);
    else if (a && !b) by.set(key, row);
  }
  return [...by.values()];
}

function pickNearestForParameter(
  rows: AirNowDataRow[],
  placeLat: number,
  placeLon: number,
  now: Date,
): AirNowParameterObservation | null {
  if (!rows.length) return null;
  const latest = latestPerMonitor(rows);
  const ranked = latest
    .map((row) => ({
      row,
      distanceMi: milesBetween(placeLat, placeLon, row.lat, row.lon),
    }))
    .sort((a, b) => a.distanceMi - b.distanceMi);
  const best = ranked[0];
  if (!best) return null;
  const parameter = best.row.parameter;
  return {
    parameter,
    displayParameter: DISPLAY_PARAMETER[parameter] ?? parameter,
    aqi: best.row.aqi,
    category: best.row.category,
    siteName: best.row.siteName,
    monitorLat: best.row.lat,
    monitorLon: best.row.lon,
    distanceMi: Math.round(best.distanceMi * 10) / 10,
    distant: best.distanceMi > DISTANT_MI,
    observedAt: utcToInstant(best.row.utc)?.toISOString() ?? best.row.utc,
    ageMinutes: ageMinutes(best.row.utc, now),
  };
}

export function pickAirNowForPlace(
  rows: AirNowDataRow[],
  placeLat: number,
  placeLon: number,
  now: Date = new Date(),
): AirNowPlaceObservation | null {
  if (!rows.length) return null;
  const byParam = new Map<string, AirNowDataRow[]>();
  for (const row of rows) {
    const list = byParam.get(row.parameter) ?? [];
    list.push(row);
    byParam.set(row.parameter, list);
  }
  const parameters: AirNowParameterObservation[] = [];
  for (const param of ['PM25', 'OZONE']) {
    const picked = pickNearestForParameter(byParam.get(param) ?? [], placeLat, placeLon, now);
    if (picked) parameters.push(picked);
  }
  if (!parameters.length) return null;
  const primary = parameters.reduce((a, b) => (b.aqi > a.aqi ? b : a), parameters[0]);
  return { parameters, primary };
}

/** Rolling UTC hour endpoints for AirNow `startDate` / `endDate` (YYYY-MM-DDTHH). */
export function airNowQueryHourRange(hoursBack: number, now: Date = new Date()): { start: string; end: string } {
  const end = new Date(now);
  const start = new Date(end.getTime() - hoursBack * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 13);
  return { start: fmt(start), end: fmt(end) };
}