/**
 * One feels-like rule for the forecast cards and the live banner.
 * NWS wind chill only applies at 50°F or colder with wind over 3 mph.
 * Heat index only applies at 80°F or warmer. Otherwise it is the air temp.
 */
export function windChillF(tempF: number, windMph: number): number {
  if (tempF > 50 || windMph <= 3) return tempF;
  const v = Math.pow(windMph, 0.16);
  return 35.74 + 0.6215 * tempF - 35.75 * v + 0.4275 * tempF * v;
}

export function feelsLikeF({
  tempF,
  windMph,
  heatIndexF = null,
}: {
  tempF: number;
  windMph: number;
  heatIndexF?: number | null;
}): number {
  if (tempF <= 50 && windMph > 3) return Math.round(windChillF(tempF, windMph));
  if (tempF >= 80 && typeof heatIndexF === 'number' && Number.isFinite(heatIndexF)) {
    return Math.round(Math.max(tempF, heatIndexF));
  }
  return Math.round(tempF);
}

/** "15 mph" -> 15, "10 to 20 mph" -> 20 (the top of a range), 12.4 -> 12. */
export function windMphFromText(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== 'string') return 0;
  const numbers = value.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  return numbers.length > 0 ? Math.round(Math.max(...numbers)) : 0;
}

type GridEntry = { validTime?: string; value?: number | null };

function hoursIn(duration: string): number {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(duration);
  if (!match) return 0;
  return Number(match[1] ?? 0) * 24 + Number(match[2] ?? 0) + Number(match[3] ?? 0) / 60;
}

/**
 * NWS gridpoint series are ISO intervals ("2026-11-04T00:00:00+00:00/PT2H").
 * Pick the value valid right now, not the first one in the series, which can
 * be hours old. Falls back to the first value that has a number.
 */
export function gridValueAt(values: readonly GridEntry[] | undefined, now = Date.now()): number | null {
  if (!values?.length) return null;
  const current = values.find((entry) => {
    const [start, duration] = (entry.validTime ?? '').split('/');
    const startMs = Date.parse(start ?? '');
    const spanMs = hoursIn(duration ?? '') * 3_600_000;
    return Number.isFinite(startMs) && now >= startMs && now < startMs + spanMs;
  });
  const entry = current && typeof current.value === 'number' ? current : values.find((item) => typeof item.value === 'number');
  return entry && typeof entry.value === 'number' && Number.isFinite(entry.value) ? entry.value : null;
}
