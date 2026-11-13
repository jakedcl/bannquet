import { gridValueAt } from '@/lib/feels-like';
import type { GridValueSample } from '@/types/weather';

export type GridSeries = {
  values?: { validTime: string; value: number | null }[];
  uom?: string;
};

const UNIT_CONVERSIONS: Record<string, (value: number) => number> = {
  'wmoUnit:degC': (value) => (value * 9) / 5 + 32,
  'wmoUnit:km_h-1': (value) => value * 0.621371,
  'wmoUnit:m_s-1': (value) => value * 2.23694,
  'wmoUnit:m': (value) => value * 3.28084,
  'wmoUnit:mm': (value) => value * 0.0393701,
  'wmoUnit:cm': (value) => value * 0.393701,
  'wmoUnit:km': (value) => value * 0.621371,
};

export function convertGridValue(value: number, uom?: string): number {
  if (!uom) return value;
  const converter = UNIT_CONVERSIONS[uom];
  return converter ? converter(value) : value;
}

export function normalizeGridValue(series?: GridSeries, now = Date.now()): number | null {
  const value = gridValueAt(series?.values, now);
  if (value === null) return null;
  return convertGridValue(value, series?.uom);
}

/** Upcoming grid values for display; skips null entries. */
export function gridSeriesSamples(series: GridSeries | undefined, limit = 12): GridValueSample[] {
  if (!series?.values?.length) return [];
  const out: GridValueSample[] = [];
  for (const entry of series.values) {
    if (entry.value === null || entry.value === undefined) continue;
    const start = entry.validTime.split('/')[0] ?? entry.validTime;
    out.push({
      validTime: start,
      value: convertGridValue(entry.value, series.uom),
      label: formatSampleTime(start),
    });
    if (out.length >= limit) break;
  }
  return out;
}

function formatSampleTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
  });
}

export type GridWeatherLayer = {
  coverage: string | null;
  weather: string | null;
  intensity: string | null;
};

export type GridWeatherSeries = {
  values?: { validTime: string; value: GridWeatherLayer[] | null }[];
};

export type GridWeatherSample = {
  validTime: string;
  label: string;
  layers: GridWeatherLayer[];
  text: string | null;
};

export function humanizeWeatherToken(token: string | null | undefined): string | null {
  if (!token) return null;
  return token.replace(/_/g, ' ');
}

export function formatGridWeatherLayer(layer: GridWeatherLayer | null | undefined): string | null {
  if (!layer) return null;
  const parts = [layer.coverage, layer.weather, layer.intensity]
    .map(humanizeWeatherToken)
    .filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join(' ') : null;
}

function parseIntervalEndMs(validTime: string): number | null {
  const [startStr, duration] = validTime.split('/');
  const start = new Date(startStr).getTime();
  if (Number.isNaN(start)) return null;
  if (!duration?.startsWith('PT')) return start + 3600_000;
  const hours = duration.match(/(\d+)H/);
  const minutes = duration.match(/(\d+)M/);
  const ms =
    start +
    (hours ? Number(hours[1]) * 3600_000 : 0) +
    (minutes ? Number(minutes[1]) * 60_000 : 0);
  return ms;
}

export function gridWeatherAtInstant(series: GridWeatherSeries | undefined, isoStart: string): GridWeatherLayer | null {
  const t = new Date(isoStart).getTime();
  if (Number.isNaN(t) || !series?.values?.length) return null;
  for (const entry of series.values) {
    const startStr = entry.validTime.split('/')[0] ?? entry.validTime;
    const start = new Date(startStr).getTime();
    const end = parseIntervalEndMs(entry.validTime) ?? start + 3600_000;
    if (t >= start && t < end) {
      const layer = entry.value?.[0];
      return layer
        ? {
            coverage: layer.coverage ?? null,
            weather: layer.weather ?? null,
            intensity: layer.intensity ?? null,
          }
        : null;
    }
  }
  return null;
}

export function gridWeatherSeriesSamples(series: GridWeatherSeries | undefined, limit = 48): GridWeatherSample[] {
  if (!series?.values?.length) return [];
  const out: GridWeatherSample[] = [];
  for (const entry of series.values) {
    const start = entry.validTime.split('/')[0] ?? entry.validTime;
    const layers =
      entry.value?.map((layer) => ({
        coverage: layer.coverage ?? null,
        weather: layer.weather ?? null,
        intensity: layer.intensity ?? null,
      })) ?? [];
  const text = layers.map((l) => formatGridWeatherLayer(l)).filter(Boolean).join('; ') || null;
    if (!text && layers.every((l) => !l.coverage && !l.weather && !l.intensity)) continue;
    out.push({
      validTime: start,
      label: formatSampleTime(start),
      layers,
      text,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function gridElevationFt(elevation?: { value?: number | null; uom?: string } | null): number | null {
  const value = elevation?.value;
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  if (elevation?.uom === 'wmoUnit:m') return Math.round(value * 3.28084);
  if (elevation?.uom === 'wmoUnit:ft') return Math.round(value);
  return Math.round(value);
}
