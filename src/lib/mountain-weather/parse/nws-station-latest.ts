import type { NwsStationField, NwsStationLatest } from '@/lib/mountain-weather/mansfield-types';
import { nwsObservationProperties } from '@/lib/mountain-weather/parse/nws-observation-properties';

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
  presentWeather: 'Present weather',
  rawMessage: 'Raw message',
  textDescription: 'Text description',
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

function formatObservationValue(val: unknown): number | string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number' || typeof val === 'string') return val;
  if (Array.isArray(val)) return JSON.stringify(val);
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

export function parseNwsStationLatest(jsonText: string): NwsStationLatest {
  const doc = JSON.parse(jsonText) as Record<string, unknown>;
  const p = nwsObservationProperties(doc);
  if (!p.stationId && !p.timestamp && Object.keys(p).length < 3) {
    throw new Error('Invalid station observation JSON (missing observation properties)');
  }

  const fields: NwsStationField[] = [];
  for (const [key, val] of Object.entries(p)) {
    if (key.startsWith('@') || key === 'station' || key === 'stationId' || key === 'stationName') continue;
    if (key === 'timestamp' || key === 'icon') continue;

    if (key === 'presentWeather') {
      if (Array.isArray(val) && val.length > 0) {
        fields.push({
          key,
          label: FIELD_LABELS[key] ?? key,
          value: JSON.stringify(val),
          unit: null,
          qualityControl: null,
          qcFailed: false,
        });
      }
      continue;
    }

    if (typeof val !== 'object' || val === null || !('value' in val)) continue;
    const entry = val as { value: unknown; unitCode?: string; qualityControl?: string };
    const qc = entry.qualityControl ?? null;
    const qcFailed = (qc === 'Z' || qc === 'z') && (entry.value === null || entry.value === undefined);
    const value = formatObservationValue(entry.value);
    fields.push({
      key,
      label: FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').trim(),
      value,
      unit: unitLabel(entry.unitCode),
      qualityControl: qc,
      qcFailed,
    });
  }

  return {
    stationId: String(p.stationId ?? ''),
    stationName: typeof p.stationName === 'string' ? p.stationName : null,
    timestamp: typeof p.timestamp === 'string' ? p.timestamp : null,
    fields,
  };
}

/** Older reports may fill a missing field only if they are this close to the newest report. */
const BACKFILL_WINDOW_MS = 3 * 60 * 60 * 1000;

/**
 * Parse `/stations/{id}/observations?limit=N` (newest reports first). The newest report is the
 * base; any field it lacks (or that failed QC) is filled from the newest earlier report within
 * three hours that has it, with `observedAt` set so the page can show that reading's own time.
 * `/observations/latest` drops QC-flagged values entirely, which blanked KMWN's temp and wind.
 */
export function parseNwsStationRecent(jsonText: string): NwsStationLatest {
  const doc = JSON.parse(jsonText) as { features?: unknown };
  if (!Array.isArray(doc.features)) return parseNwsStationLatest(jsonText);
  const reports = (doc.features as Record<string, unknown>[])
    .map((feature) => parseNwsStationLatest(JSON.stringify(feature)))
    .filter((r) => r.timestamp)
    .sort((a, b) => Date.parse(b.timestamp!) - Date.parse(a.timestamp!));
  if (reports.length === 0) throw new Error('No observations published for this station');

  const [newest, ...older] = reports;
  const newestMs = Date.parse(newest.timestamp!);
  const hasValue = (f: NwsStationField | undefined) =>
    Boolean(f) && f!.value !== null && f!.value !== '' && !f!.qcFailed;

  const fields = newest.fields.map((field) => {
    if (hasValue(field)) return field;
    for (const report of older) {
      if (newestMs - Date.parse(report.timestamp!) > BACKFILL_WINDOW_MS) break;
      const earlier = report.fields.find((f) => f.key === field.key);
      if (hasValue(earlier)) return { ...earlier!, observedAt: report.timestamp };
    }
    return field;
  });
  return { ...newest, fields };
}
