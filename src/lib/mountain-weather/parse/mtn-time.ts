/** Wall-clock fields from NWS mountain DATE tags (America/New_York). */
export function parseCycleStartNy(raw: string): Date | null {
  const parts = raw.split(',').map((p) => Number(p.trim()));
  if (parts.length < 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [year, month0, day, hour] = parts;
  const month = month0 + 1;

  const TemporalApi = (globalThis as { Temporal?: { ZonedDateTime: { from: (init: Record<string, unknown>) => { epochMilliseconds: number } } } }).Temporal;
  if (TemporalApi) {
    try {
      const zdt = TemporalApi.ZonedDateTime.from({
        timeZone: 'America/New_York',
        year,
        month,
        day,
        hour,
        minute: 0,
        second: 0,
      });
      return new Date(zdt.epochMilliseconds);
    } catch {
      return null;
    }
  }

  return wallClockNewYorkToUtc(year, month, day, hour);
}

function wallClockNewYorkToUtc(year: number, month: number, day: number, hour: number): Date | null {
  const target = { year, month, day, hour };
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hour12: false,
  });

  function matches(epochMs: number): boolean {
    const parts = Object.fromEntries(fmt.formatToParts(new Date(epochMs)).map((p) => [p.type, p.value]));
    const y = Number(parts.year);
    const m = Number(parts.month);
    const d = Number(parts.day);
    let h = Number(parts.hour);
    if (h === 24) h = 0;
    return y === target.year && m === target.month && d === target.day && h === target.hour;
  }

  const guessUtc = Date.UTC(year, month - 1, day, hour, 0, 0);
  let lo = guessUtc - 16 * 3600_000;
  let hi = guessUtc + 16 * 3600_000;
  for (let i = 0; i < 48; i++) {
    const mid = Math.floor((lo + hi) / 2);
    if (matches(mid)) return new Date(mid);
    const parts = Object.fromEntries(fmt.formatToParts(new Date(mid)).map((p) => [p.type, p.value]));
    const localMs = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour) === 24 ? 0 : Number(parts.hour),
    );
    const targetMs = Date.UTC(year, month - 1, day, hour);
    if (localMs < targetMs) lo = mid + 1;
    else hi = mid;
  }
  return matches(lo) ? new Date(lo) : null;
}

export function formatMtnHourEt(time: Date): string {
  if (Number.isNaN(time.getTime())) return '—';
  return time.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function addHoursUtc(start: Date, hours: number): Date {
  return new Date(start.getTime() + hours * 3600_000);
}
