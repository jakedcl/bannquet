import { gridValueAt } from '@/lib/feels-like';
import type { GridSeries } from '@/lib/grid-series';

export type GridScalarKind =
  | 'temperature'
  | 'visibility'
  | 'ceilingHeight'
  | 'windSpeed'
  | 'lengthFeet'
  | 'precipInches'
  | 'percent'
  | 'passThrough';

function convertScalar(value: number, uom: string | undefined, kind: GridScalarKind): number {
  if (kind === 'percent' || kind === 'passThrough') return value;
  if (kind === 'temperature') {
    if (uom === 'wmoUnit:degC') return (value * 9) / 5 + 32;
    return value;
  }
  if (kind === 'visibility') {
    if (uom === 'wmoUnit:m') return value / 1609.344;
    if (uom === 'wmoUnit:km') return value * 0.621371;
    if (uom === 'wmoUnit:ft') return value / 5280;
    return value;
  }
  if (kind === 'ceilingHeight' || kind === 'lengthFeet') {
    if (uom === 'wmoUnit:m') return value * 3.28084;
    return value;
  }
  if (kind === 'windSpeed') {
    if (uom === 'wmoUnit:km_h-1') return value * 0.621371;
    if (uom === 'wmoUnit:m_s-1') return value * 2.23694;
    return value;
  }
  if (kind === 'precipInches') {
    if (uom === 'wmoUnit:mm') return value * 0.0393701;
    if (uom === 'wmoUnit:cm') return value * 0.393701;
    return value;
  }
  return value;
}

export function normalizeGridScalar(
  series: GridSeries | undefined,
  kind: GridScalarKind,
  now = Date.now(),
): number | null {
  const value = gridValueAt(series?.values, now);
  if (value === null) return null;
  return convertScalar(value, series?.uom, kind);
}

export function gridSeriesSamplesForKind(
  series: GridSeries | undefined,
  kind: GridScalarKind,
  limit = 12,
): { validTime: string; value: number; label: string }[] {
  if (!series?.values?.length) return [];
  const out: { validTime: string; value: number; label: string }[] = [];
  for (const entry of series.values) {
    if (entry.value === null || entry.value === undefined) continue;
    const start = entry.validTime.split('/')[0] ?? entry.validTime;
    const date = new Date(start);
    const label = Number.isNaN(date.getTime())
      ? start
      : date.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
        });
    out.push({
      validTime: start,
      value: convertScalar(entry.value, series.uom, kind),
      label,
    });
    if (out.length >= limit) break;
  }
  return out;
}