/** ngTMDD / NTCIP ESS: temperatures are integer tenths of °C. */

export type DecodedQuantity = {
  raw: number | null;
  display: string | null;
  note: string;
};

function tmddTempTenthsC(raw: unknown): DecodedQuantity {
  const n = Number(raw);
  if (!Number.isFinite(n)) return { raw: null, display: null, note: 'Missing' };
  const c = n / 10;
  const f = (c * 9) / 5 + 32;
  return {
    raw: n,
    display: `${f.toFixed(1)}°F (${c.toFixed(1)}°C raw ${n})`,
    note: 'TMDD tenths °C (ngTMDD / NTCIP 1204 metric)',
  };
}

/** Visibility in XML appears as meters (e.g. 20000 = 20 km). */
function tmddVisibilityMeters(raw: unknown): DecodedQuantity {
  const n = Number(raw);
  if (!Number.isFinite(n)) return { raw: null, display: null, note: 'Missing' };
  const mi = n / 1609.344;
  return {
    raw: n,
    display: `${mi.toFixed(1)} mi (${n} m)`,
    note: 'Meters in C2C ESS',
  };
}

/** Barometric pressure tenths of hPa (e.g. 9987 → 998.7 hPa). */
function tmddPressureTenthsHpa(raw: unknown): DecodedQuantity {
  const n = Number(raw);
  if (!Number.isFinite(n)) return { raw: null, display: null, note: 'Missing' };
  const hpa = n / 10;
  const inHg = hpa * 0.02953;
  return {
    raw: n,
    display: `${hpa.toFixed(1)} hPa (${inHg.toFixed(2)} inHg)`,
    note: 'Tenths of hPa',
  };
}

/**
 * NE Compass Vaisala Navigator windSpeed in the sampled feed is whole mph (2–40 range).
 * We show the raw integer with unit mph unless QC suggests otherwise.
 */
function compassWindMph(raw: unknown): DecodedQuantity {
  const n = Number(raw);
  if (!Number.isFinite(n)) return { raw: null, display: null, note: 'Missing' };
  return {
    raw: n,
    display: `${n} mph`,
    note: 'Whole mph in NE Compass essData (Vaisala Navigator)',
  };
}

function tmddPrecipRate(raw: unknown): DecodedQuantity {
  const n = Number(raw);
  if (!Number.isFinite(n)) return { raw: null, display: null, note: 'Missing' };
  return {
    raw: n,
    display: `${n} (XML precipRate units)`,
    note: 'Raw precipRate; verify against ICD when non-zero',
  };
}

export type CompassEssFields = {
  airTemp: DecodedQuantity;
  pavementTemp: DecodedQuantity;
  dewPoint: DecodedQuantity;
  subsurfaceTemp: DecodedQuantity;
  visibility: DecodedQuantity;
  barometricPressure: DecodedQuantity;
  windSpeed: DecodedQuantity;
  precipRate: DecodedQuantity;
};

export function decodeCompassEssFields(row: Record<string, unknown>): CompassEssFields {
  return {
    airTemp: tmddTempTenthsC(row.airTemp),
    pavementTemp: tmddTempTenthsC(row.pavementTemp),
    dewPoint: tmddTempTenthsC(row.dewPoint),
    subsurfaceTemp: tmddTempTenthsC(row.subsurfaceTemp),
    visibility: tmddVisibilityMeters(row.visibility),
    barometricPressure: tmddPressureTenthsHpa(row.barometricPressure),
    windSpeed: compassWindMph(row.windSpeed),
    precipRate: tmddPrecipRate(row.precipRate),
  };
}

export function tmddAirTempFahrenheit(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const c = n / 10;
  return Math.round(((c * 9) / 5 + 32) * 10) / 10;
}