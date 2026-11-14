import type { NwsStationField } from '@/lib/mountain-weather/mansfield-types';

const MEASUREMENT_KEYS = new Set([
  'temperature',
  'dewpoint',
  'windDirection',
  'windSpeed',
  'windGust',
  'barometricPressure',
  'seaLevelPressure',
  'visibility',
  'maxTemperatureLast24Hours',
  'minTemperatureLast24Hours',
  'precipitationLastHour',
  'precipitationLast3Hours',
  'precipitationLast6Hours',
  'relativeHumidity',
  'windChill',
  'heatIndex',
  'elevation',
]);

export function isPlaceholderStationName(name: string | null | undefined): boolean {
  const n = (name ?? '').trim();
  return /^crew\s+\d+/i.test(n);
}

export function stationHasReadableMeasurements(fields: NwsStationField[]): boolean {
  return fields.some(
    (f) =>
      MEASUREMENT_KEYS.has(f.key) &&
      !f.qcFailed &&
      f.value !== null &&
      f.value !== undefined &&
      f.value !== '',
  );
}

function toFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

function numericFieldValue(field: NwsStationField | undefined): number | null {
  if (!field || field.qcFailed) return null;
  if (field.value === null || field.value === undefined || field.value === '') return null;
  const num = typeof field.value === 'number' ? field.value : Number(field.value);
  return Number.isFinite(num) ? num : null;
}

/** Raw NWS quantity in °F for extremes / ticker (null when missing). */
export function stationFieldTempF(fields: NwsStationField[], key: string): number | null {
  const field = fields.find((row) => row.key === key);
  const num = numericFieldValue(field);
  if (num === null || !field) return null;
  if (field.unit === '°C') return Math.round(toFahrenheit(num));
  if (field.unit === '°F') return Math.round(num);
  return Math.round(num);
}

/** Raw NWS quantity in mph (null when missing; 0 is a real calm wind). */
export function stationFieldWindMph(fields: NwsStationField[], key: 'windSpeed' | 'windGust'): number | null {
  const field = fields.find((row) => row.key === key);
  const num = numericFieldValue(field);
  if (num === null || !field) return null;
  if (field.unit === 'km/h') return Math.round(num * 0.621371);
  if (field.unit === 'm/s') return Math.round(num * 2.23694);
  return Math.round(num);
}

export function stationFieldByKey(fields: NwsStationField[], key: string): NwsStationField | undefined {
  return fields.find((row) => row.key === key);
}

function formatNumber(value: number, decimals = 1): string {
  const rounded = Number(value.toFixed(decimals));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(decimals);
}

/** Display NWS wmoUnit quantities in US customary for the UI. */
export function formatStationFieldDisplay(field: NwsStationField): string {
  if (field.value === null || field.value === undefined || field.value === '') {
    return 'no reading in last report';
  }
  if (typeof field.value === 'string' && field.value.startsWith('[')) {
    return field.value;
  }
  const num = typeof field.value === 'number' ? field.value : Number(field.value);
  if (!Number.isFinite(num)) {
    return String(field.value);
  }

  const unit = field.unit;
  switch (field.key) {
    case 'visibility':
      if (unit === 'm') return `${formatNumber(num / 1609.344)} mi`;
      if (unit === 'km') return `${formatNumber(num * 0.621371)} mi`;
      return `${formatNumber(num)}${unit ? ` ${unit}` : ''}`;
    case 'windSpeed':
    case 'windGust':
      if (unit === 'km/h') return `${formatNumber(num * 0.621371)} mph`;
      if (unit === 'm/s') return `${formatNumber(num * 2.23694)} mph`;
      return `${formatNumber(num)}${unit ? ` ${unit}` : ''}`;
    case 'temperature':
    case 'dewpoint':
    case 'windChill':
    case 'heatIndex':
    case 'maxTemperatureLast24Hours':
    case 'minTemperatureLast24Hours':
      if (unit === '°C') return `${formatNumber(toFahrenheit(num))} °F`;
      return `${formatNumber(num)}${unit ? ` ${unit}` : ''}`;
    case 'barometricPressure':
    case 'seaLevelPressure':
      if (unit === 'Pa') return `${formatNumber(num / 3386.39, 2)} inHg`;
      return `${formatNumber(num)}${unit ? ` ${unit}` : ''}`;
    case 'precipitationLastHour':
    case 'precipitationLast3Hours':
    case 'precipitationLast6Hours':
      if (unit === 'mm') return `${formatNumber(num * 0.0393701, 2)} in`;
      return `${formatNumber(num)}${unit ? ` ${unit}` : ''}`;
    case 'relativeHumidity':
      return unit === '%' ? `${formatNumber(num, 0)}%` : `${formatNumber(num)}${unit ? ` ${unit}` : ''}`;
    case 'elevation':
      if (unit === 'm') return `${formatNumber(num * 3.28084, 0)} ft`;
      return `${formatNumber(num)}${unit ? ` ${unit}` : ''}`;
    default:
      return `${formatNumber(num)}${unit ? ` ${unit}` : ''}`;
  }
}