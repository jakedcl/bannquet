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

export function gridElevationFt(elevation?: { value?: number | null; uom?: string } | null): number | null {
  const value = elevation?.value;
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  if (elevation?.uom === 'wmoUnit:m') return Math.round(value * 3.28084);
  if (elevation?.uom === 'wmoUnit:ft') return Math.round(value);
  return Math.round(value);
}
