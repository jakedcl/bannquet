export type GlancePeriod = {
  name: string;
  startTime: string;
  endTime: string;
  temperature: number;
  isDaytime: boolean;
  precip: number | null;
  windMph: number | null;
  shortForecast: string;
  icon: string | null;
};

const HOUR = 60 * 60 * 1000;
const WINDOW = 48 * HOUR;

const SEVERITY = ['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown'];

export function fullWeekday(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'ahead';
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'America/New_York' }).format(date);
}

export function parseMph(value: string | null | undefined): number | null {
  if (!value) return null;
  const nums = value.match(/\d+(?:\.\d+)?/g);
  if (!nums || nums.length === 0) return null;
  const max = Math.max(...nums.map(Number));
  return Number.isFinite(max) ? max : null;
}

export function gustToMph(value: number, uom: string | undefined): number {
  if (uom === 'wmoUnit:m_s-1') return value * 2.23694;
  if (uom === 'wmoUnit:km_h-1') return value * 0.621371;
  return value;
}

export function maxGustMph(
  values: { validTime?: string; value?: number | null }[] | undefined,
  uom: string | undefined,
  now: Date,
): number | null {
  if (!values) return null;
  const soon = now.getTime() + WINDOW;
  let max: number | null = null;
  for (const entry of values) {
    if (entry.value == null || !entry.validTime) continue;
    const start = Date.parse(entry.validTime.split('/')[0] ?? '');
    if (Number.isNaN(start) || start >= soon || start < now.getTime() - HOUR) continue;
    const mph = gustToMph(entry.value, uom);
    max = max == null ? mph : Math.max(max, mph);
  }
  return max;
}

export function alertLabel(alerts: { event?: string; severity?: string }[]): string | null {
  const ranked = alerts.flatMap((alert) => {
    const event = alert.event?.trim() ?? '';
    if (!event) return [];
    return [{ event, severity: alert.severity ?? 'Unknown' }];
  });
  if (ranked.length === 0) return null;
  ranked.sort((a, b) => rank(a.severity) - rank(b.severity));
  return ranked[0].event;
}

function rank(severity: string): number {
  const index = SEVERITY.indexOf(severity);
  return index === -1 ? SEVERITY.length : index;
}

export function inForecastWindow(period: GlancePeriod, now: Date): boolean {
  const start = Date.parse(period.startTime);
  const end = Date.parse(period.endTime);
  if (Number.isNaN(start)) return false;
  const finish = Number.isNaN(end) ? start + 12 * HOUR : end;
  return finish > now.getTime() && start < now.getTime() + WINDOW;
}

export type DailyHighLowRow = {
  temperature: number;
  secondaryTemp?: number;
  startTime: string;
  name?: string;
  isDaytime?: boolean;
};

/** NWS daily rows store the day's high on `temperature` and that night's low on `secondaryTemp`; a leading night row is low only. */
export function dailyHighLowFromSnippets(
  rows: DailyHighLowRow[],
): { high: number | null; low: number | null } {
  const first = rows[0];
  if (!first || !Number.isFinite(first.temperature)) return { high: null, low: null };
  // A leading "Tonight" row carries only the low; the high is the next day's.
  if (first.isDaytime === false) {
    const day = rows[1];
    return { high: day && Number.isFinite(day.temperature) ? day.temperature : null, low: first.temperature };
  }
  return {
    high: first.temperature,
    low: typeof first.secondaryTemp === 'number' ? first.secondaryTemp : null,
  };
}

export function summitHighLow(periods: GlancePeriod[]): { high: number | null; low: number | null } {
  const day = periods.find((p) => p.isDaytime !== false && Number.isFinite(p.temperature));
  const night = periods.find((p) => p.isDaytime === false && Number.isFinite(p.temperature));
  return {
    high: day?.temperature ?? null,
    low: night?.temperature ?? null,
  };
}

export function maxPrecip(periods: GlancePeriod[], now: Date): number | null {
  const values = periods.filter((period) => inForecastWindow(period, now) && period.precip != null).map((period) => period.precip as number);
  if (values.length === 0) return null;
  return Math.max(...values);
}

export function maxSustainedMph(periods: GlancePeriod[], now: Date): number | null {
  const values = periods.filter((period) => inForecastWindow(period, now) && period.windMph != null).map((period) => period.windMph as number);
  if (values.length === 0) return null;
  return Math.max(...values);
}

export function windLabel(gust: number | null, sustained: number | null): string | null {
  return formatWindSummary(sustained, gust).line;
}

export function formatWindSummary(
  sustained: number | null,
  gust: number | null,
): { line: string | null; sustained: number | null; gust: number | null } {
  const s = sustained != null && sustained > 0 ? Math.round(sustained) : null;
  const g = gust != null && gust > 0 ? Math.round(gust) : null;
  if (s == null && g == null) return { line: null, sustained: s, gust: g };
  if (g != null && s != null && g > s) {
    return { line: `${s} mph sustained · gusts to ${g} mph`, sustained: s, gust: g };
  }
  if (s != null) return { line: `${s} mph sustained`, sustained: s, gust: g };
  return { line: `${g} mph gusts`, sustained: s, gust: g };
}

function spellWhen(period: GlancePeriod): string {
  const name = period.name.trim().toLowerCase();
  if (name === 'tonight' || name === 'overnight') return 'tonight';
  if (name === 'this afternoon' || name === 'this morning' || name === 'this evening' || name === 'today') return name;
  return fullWeekday(period.startTime);
}

function precipWord(forecast: string): string {
  const text = forecast.toLowerCase();
  if (text.includes('snow') || text.includes('flurr')) return 'Snow';
  if (text.includes('sleet') || text.includes('freezing rain') || text.includes('ice')) return 'Icy';
  return 'Rain';
}

export function glancePhrase(input: {
  periods: GlancePeriod[];
  maxGustMph: number | null;
  now?: Date;
}): string {
  const now = input.now ?? new Date();
  const upcoming = input.periods.filter((period) => inForecastWindow(period, now));
  const wet = upcoming.find((period) => (period.precip ?? 0) > 50);
  if (wet) return `${precipWord(wet.shortForecast)} ${spellWhen(wet)}`;
  if ((input.maxGustMph ?? 0) > 40) return 'Windy above treeline';
  const cold = upcoming.find((period) => period.temperature < 32);
  if (cold) return `Below freezing ${spellWhen(cold)}`;
  const forecast = upcoming.find((period) => period.shortForecast.trim().length > 0)?.shortForecast.trim();
  return forecast || 'Quiet for now';
}
