import type { NwsStationLatest } from '@/lib/mountain-weather/mansfield-types';
import { feelsLikeF } from '@/lib/feels-like';
import {
  isPlaceholderStationName,
  stationFieldTempF,
  stationFieldWindMph,
} from '@/lib/mountain-weather/parse/nws-station-units';

export function observationAgeMinutes(timestamp: string | null, now = Date.now()): number | null {
  if (!timestamp) return null;
  const t = Date.parse(timestamp);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((now - t) / 60_000));
}

function feelsLikeFromStation(station: NwsStationLatest): number | null {
  const chill = stationFieldTempF(station.fields, 'windChill');
  if (chill !== null) return chill;
  const heat = stationFieldTempF(station.fields, 'heatIndex');
  if (heat !== null) return heat;
  const tempF = stationFieldTempF(station.fields, 'temperature');
  const windMph = stationFieldWindMph(station.fields, 'windSpeed');
  if (tempF === null) return null;
  if (windMph === null) return tempF;
  return Math.round(feelsLikeF({ tempF, windMph }));
}

export function stationHasPlaceholderName(station: NwsStationLatest): boolean {
  if (isPlaceholderStationName(station.stationName)) return true;
  return false;
}

export function stationObservationStale(
  timestamp: string | null,
  expectedEveryHours = 1,
  now = Date.now(),
): boolean {
  const age = observationAgeMinutes(timestamp, now);
  if (age === null) return true;
  return age > expectedEveryHours * 2 * 60;
}

export function stationMeasuredScalars(station: NwsStationLatest) {
  const tempF = stationFieldTempF(station.fields, 'temperature');
  const windMph = stationFieldWindMph(station.fields, 'windSpeed');
  const gustMph = stationFieldWindMph(station.fields, 'windGust');
  const windChillF = feelsLikeFromStation(station);
  return {
    tempF,
    windMph,
    gustMph,
    windChillF,
    observedAt: station.timestamp,
    ageMinutes: observationAgeMinutes(station.timestamp),
  };
}