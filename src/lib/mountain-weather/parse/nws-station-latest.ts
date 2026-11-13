import type { NwsStationField, NwsStationLatest } from '@/lib/mountain-weather/mansfield-types';

const FIELD_LABELS: Record<string, string> = {
  temperature: 'Temperature',
  dewpoint: 'Dewpoint',
  windDirection: 'Wind direction',
  windSpeed: 'Wind speed',
  windGust: 'Wind gust',
  barometricPressure: 'Barometric pressure',
  seaLevelPressure: 'Sea level pressure',
  visibility: 'Visibility',
  maxTemperatureLast24Hours: 'Max temperature (24 h)',
  minTemperatureLast24Hours: 'Min temperature (24 h)',
  precipitationLastHour: 'Precipitation (1 h)',
  precipitationLast3Hours: 'Precipitation (3 h)',
  precipitationLast6Hours: 'Precipitation (6 h)',
  relativeHumidity: 'Relative humidity',
  windChill: 'Wind chill',
  heatIndex: 'Heat index',
  cloudLayers: 'Cloud layers',
  elevation: 'Sensor elevation',
};

function unitLabel(unitCode: string | undefined): string | null {
  if (!unitCode) return null;
  const map: Record<string, string> = {
    'wmoUnit:degC': '°C',
    'wmoUnit:degF': '°F',
    'wmoUnit:km_h-1': 'km/h',
    'wmoUnit:m_s-1': 'm/s',
    'wmoUnit:Pa': 'Pa',
    'wmoUnit:m': 'm',
    'wmoUnit:mm': 'mm',
    'wmoUnit:percent': '%',
    'wmoUnit:degree_(angle)': '°',
  };
  return map[unitCode] ?? unitCode.replace('wmoUnit:', '');
}

export function parseNwsStationLatest(jsonText: string): NwsStationLatest {
  const doc = JSON.parse(jsonText) as {
    properties?: Record<string, unknown>;
  };
  const p = doc.properties;
  if (!p) throw new Error('Invalid station observation JSON');

  const fields: NwsStationField[] = [];
  for (const [key, val] of Object.entries(p)) {
    if (key.startsWith('@') || key === 'station' || key === 'stationId' || key === 'stationName') continue;
    if (key === 'timestamp' || key === 'rawMessage' || key === 'textDescription' || key === 'icon') continue;
    if (key === 'presentWeather' && Array.isArray(val) && val.length === 0) continue;
    if (typeof val !== 'object' || val === null || !('value' in val)) continue;
    const entry = val as { value: unknown; unitCode?: string; qualityControl?: string };
    const value =
      entry.value === null || entry.value === undefined
        ? null
        : typeof entry.value === 'number' || typeof entry.value === 'string'
          ? entry.value
          : JSON.stringify(entry.value);
    if (value === null && (entry.qualityControl === 'Z' || entry.qualityControl === 'z')) continue;
    fields.push({
      key,
      label: FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').trim(),
      value,
      unit: unitLabel(entry.unitCode),
      qualityControl: entry.qualityControl ?? null,
    });
  }

  return {
    stationId: String(p.stationId ?? ''),
    stationName: typeof p.stationName === 'string' ? p.stationName : null,
    timestamp: typeof p.timestamp === 'string' ? p.timestamp : null,
    fields,
  };
}
