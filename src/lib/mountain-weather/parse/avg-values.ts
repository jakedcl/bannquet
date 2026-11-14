import type { AvgCell } from '@/lib/mountain-weather/avg-types';

const MISSING = new Set(['', 'MM', 'NR', 'NA', 'N/A']);

export function parseAvgToken(raw: string): AvgCell {
  const v = raw.trim();
  if (MISSING.has(v)) return null;
  if (v === 'T') return 'T';
  const n = Number(v);
  if (Number.isFinite(n)) return n;
  return v;
}

export function normalizeAvgSearchKey(title: string): string {
  return title
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}
