import type { NwsStationLatest } from '@/lib/mountain-weather/mansfield-types';
import { feelsLikeF } from '@/lib/feels-like';

export function stationNumericField(station: NwsStationLatest, key: string): number | null {
  const field = station.fields.find((row) => row.key === key);
  const value = field?.value;
  return typeof value === 'number' ? value : null;
}

export function observationAgeMinutes(timestamp: string | null, now = Date.now()): number | null {
  if (!timestamp) return null;
  const t = Date.parse(timestamp);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((now - t) / 60_000));
}

export function stationMeasuredScalars(station: NwsStationLatest) {
  const tempF = stationNumericField(station, 'temperature');
  const windMph = stationNumericField(station, 'windSpeed');
  const gustMph = stationNumericField(station, 'windGust');
  const windChill =
    tempF === null || windMph === null ? null : feelsLikeF({ tempF, windMph: windMph ?? 0 });
  return {
    tempF,
    windMph,
    gustMph,
    windChillF: windChill === null ? null : Math.round(windChill),
    observedAt: station.timestamp,
    ageMinutes: observationAgeMinutes(station.timestamp),
  };
}