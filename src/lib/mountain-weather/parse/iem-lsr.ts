import type { IemLsrSnowEvent } from '@/lib/mountain-weather/snow-types';

type GeoJson = {
  features?: {
    id?: string;
    properties?: Record<string, unknown>;
    geometry?: { coordinates?: number[] };
  }[];
};

export function parseIemLsrSnowGeoJson(text: string): IemLsrSnowEvent[] {
  const doc = JSON.parse(text) as GeoJson;
  const out: IemLsrSnowEvent[] = [];
  for (const f of doc.features ?? []) {
    const p = f.properties ?? {};
    const typetext = String(p.typetext ?? '');
    if (!/snow/i.test(typetext)) continue;
    const coords = f.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const [lon, lat] = coords;
    const mag = typeof p.magnitude === 'number' ? p.magnitude : Number(p.magnitude);
    out.push({
      id: String(f.id ?? `${p.valid}-${p.city}`),
      valid: String(p.valid ?? ''),
      city: typeof p.city === 'string' ? p.city : null,
      county: typeof p.county === 'string' ? p.county : null,
      state: typeof p.state === 'string' ? p.state : null,
      lat,
      lon,
      magnitude: Number.isFinite(mag) ? mag : null,
      unit: typeof p.unit === 'string' ? p.unit : null,
      remark: typeof p.remark === 'string' ? p.remark : null,
    });
  }
  return out.sort((a, b) => Date.parse(b.valid) - Date.parse(a.valid));
}