import { milesBetween } from '@/lib/mountain-weather/geo-miles';
import type { IemLsrSnowEvent } from '@/lib/mountain-weather/snow-types';

export const LOCAL_SNOW_RADIUS_MI = 35;

export function localSnowReports(
  reports: IemLsrSnowEvent[],
  place: { lat: number; lon: number },
  now = Date.now(),
): IemLsrSnowEvent[] {
  const seen = new Set<string>();
  return reports.flatMap((report) => {
    const time = Date.parse(report.valid);
    if (!Number.isFinite(time) || time > now + 60 * 60 * 1000 || time < now - 14 * 86400000) return [];
    if (!Number.isFinite(report.lat) || !Number.isFinite(report.lon) || Math.abs(report.lat) > 90 || Math.abs(report.lon) > 180) return [];
    const distanceMi = milesBetween(place.lat, place.lon, report.lat, report.lon);
    if (distanceMi > LOCAL_SNOW_RADIUS_MI) return [];
    const key = [report.valid, report.city?.trim().toLowerCase(), report.county?.trim().toLowerCase(), report.state, report.magnitude, report.unit, report.lat.toFixed(2), report.lon.toFixed(2)].join('|');
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ ...report, distanceMi: Math.round(distanceMi * 10) / 10 }];
  }).sort((a, b) => (a.distanceMi ?? Infinity) - (b.distanceMi ?? Infinity) || Date.parse(b.valid) - Date.parse(a.valid));
}
