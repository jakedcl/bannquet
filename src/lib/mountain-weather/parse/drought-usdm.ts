import type { CountyDroughtRow } from '@/lib/mountain-weather/ground-access-types';

type ApiRow = {
  mapDate: string;
  fips: string;
  county: string;
  state: string;
  none: number;
  d0: number;
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  validStart: string;
  validEnd: string;
};

function worstCategory(row: ApiRow): CountyDroughtRow['dominant'] {
  if (row.d4 > 0) return 'D4';
  if (row.d3 > 0) return 'D3';
  if (row.d2 > 0) return 'D2';
  if (row.d1 > 0) return 'D1';
  if (row.d0 > 0) return 'D0';
  return 'None';
}

export function parseUsdmCountyLatest(text: string, fips: string): CountyDroughtRow | null {
  const rows = JSON.parse(text) as ApiRow[];
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => Date.parse(b.mapDate) - Date.parse(a.mapDate));
  const row = sorted.find((r) => r.fips === fips) ?? sorted[0];
  if (!row) return null;
  return {
    fips: row.fips,
    county: row.county,
    state: row.state,
    validStart: row.validStart.slice(0, 10),
    validEnd: row.validEnd.slice(0, 10),
    mapDate: row.mapDate.slice(0, 10),
    dominant: worstCategory(row),
    nonePct: row.none,
    d0Pct: row.d0,
    d1Pct: row.d1,
    d2Pct: row.d2,
    d3Pct: row.d3,
    d4Pct: row.d4,
  };
}