import type { SnowPhysicalElement } from '@/lib/mountain-weather/snow-types';

export type NohrscStationRow = {
  stationId: string;
  name: string;
  lat: number;
  lon: number;
  elevationFt: number | null;
  element: SnowPhysicalElement;
  reportTimeUtc: string | null;
  amountIn: number | null;
  amountDisplay: string;
  source: 'NOHRSC' | 'COCORAHS';
};

function parseElevation(raw: string): number | null {
  const m = raw.match(/([\d.]+)\s*feet/i);
  if (!m) return null;
  return Math.round(Number(m[1]));
}

function elementFrom(raw: string): SnowPhysicalElement {
  const v = raw.toLowerCase();
  if (v.includes('snowdepth')) return 'snowdepth';
  if (v.includes('snowfall')) return 'snowfall';
  return 'unknown';
}

function parseAmount(raw: string): { display: string; inches: number | null } {
  const t = raw.trim();
  if (!t) return { display: '—', inches: null };
  if (t === 'T' || /^trace$/i.test(t)) return { display: 'Trace', inches: 0 };
  const n = Number(t);
  if (Number.isFinite(n)) return { display: String(n), inches: n };
  return { display: t, inches: null };
}

function parseReportTime(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const withYear = t.includes('UTC') ? t : `${t}:00:00 UTC`;
  const d = new Date(withYear.replace(' ', 'T').replace(' UTC', 'Z'));
  if (Number.isNaN(d.getTime())) return t;
  return d.toISOString();
}

export function parseNohrscStationSnowText(text: string): NohrscStationRow[] {
  const rows: NohrscStationRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('!') || line.startsWith('Station_Id')) continue;
    const parts = line.split('|');
    if (parts.length < 9) continue;
    const [stationId, name, latS, lonS, elevS, phys, timeS, amountS, units] = parts;
    if (units?.trim().toLowerCase() !== 'in') continue;
    const lat = Number(latS);
    const lon = Number(lonS);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const { display, inches } = parseAmount(amountS ?? '');
    const source = stationId.includes('-') ? 'COCORAHS' : 'NOHRSC';
    rows.push({
      stationId: stationId.trim(),
      name: name.trim(),
      lat,
      lon,
      elevationFt: parseElevation(elevS ?? ''),
      element: elementFrom(phys ?? ''),
      reportTimeUtc: parseReportTime(timeS ?? ''),
      amountIn: inches,
      amountDisplay: display,
      source,
    });
  }
  return rows;
}

export function parseNohrscIndexRunToken(html: string): { yyyymm: string; token: string } | null {
  const m = html.match(/nsm_depth_(\d{10})_Northeast\.jpg/);
  if (!m) return null;
  const token = m[1];
  return { yyyymm: token.slice(0, 6), token };
}

export function nohrscImageUrl(layer: string, yyyymm: string, token: string): string {
  return `https://www.nohrsc.noaa.gov/snow_model/images/full/Northeast/${layer}/${yyyymm}/${layer}_${token}_Northeast.jpg`;
}