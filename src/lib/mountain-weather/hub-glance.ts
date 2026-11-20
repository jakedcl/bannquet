import type { BaselineForecast } from '@/lib/mountain-weather/baseline-forecast';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
import {
  alertLabel,
  dailyHighLowFromSnippets,
  glancePhrase,
  maxPrecip,
  maxSustainedMph,
  parseMph,
  summitHighLow,
  windLabel,
  type GlancePeriod,
} from '@/lib/weather-glance';

const SUMMARY_WINDOW = 'next 48 hours';

export type HubGlance = {
  title: string;
  href: string;
  icon: string | null;
  high: number | null;
  low: number | null;
  precip: number | null;
  wind: string | null;
  /** Plain label for the precip/wind window (NWS daily or hourly periods). */
  windowLabel: string;
  phrase: string;
  alert: string | null;
  /** Optional line naming the NWS grid anchor summit when relevant. */
  representativeNote?: string | null;
};

function periodsFromDaily(data: BaselineForecast): GlancePeriod[] {
  const pool = data.dailyForecast ?? [];
  return pool.flatMap((period) => {
    if (!period.startTime || typeof period.temperature !== 'number') return [];
    const end = new Date(period.startTime);
    end.setHours(end.getHours() + 12);
    const rows: GlancePeriod[] = [
      {
        name: period.name,
        startTime: period.startTime,
        endTime: end.toISOString(),
        temperature: period.temperature,
        isDaytime: period.isDaytime !== false,
        precip: period.precipChance ?? null,
        windMph: parseMph(period.windSpeed),
        shortForecast: period.shortForecast ?? '',
        icon: period.icon ?? null,
      },
    ];
    if (typeof period.secondaryTemp === 'number') {
      const nightStart = new Date(period.startTime);
      nightStart.setHours(nightStart.getHours() + 12);
      rows.push({
        name: `${period.name} night`,
        startTime: nightStart.toISOString(),
        endTime: new Date(nightStart.getTime() + 12 * 60 * 60 * 1000).toISOString(),
        temperature: period.secondaryTemp,
        isDaytime: false,
        precip: period.precipChance ?? null,
        windMph: parseMph(period.windSpeed),
        shortForecast: period.secondaryForecast ?? period.shortForecast ?? '',
        icon: null,
      });
    }
    return rows;
  }).slice(0, 12);
}

function periodsFromForecastPeriods(data: BaselineForecast): GlancePeriod[] {
  const pool = data.forecastPeriods ?? data.hourlyForecast ?? [];
  return pool.flatMap((period) => {
    if (!period.startTime || typeof period.temperature !== 'number') return [];
    const end = new Date(period.startTime);
    end.setHours(end.getHours() + (period.isDaytime === false ? 12 : 12));
    return [{
      name: period.name,
      startTime: period.startTime,
      endTime: end.toISOString(),
      temperature: period.temperature,
      isDaytime: period.isDaytime ?? true,
      precip: period.precipChance ?? null,
      windMph: parseMph(period.windSpeed),
      shortForecast: period.shortForecast ?? '',
      icon: period.icon ?? null,
    }];
  }).slice(0, 8);
}

export function hubGlanceFromBaseline(
  result: SourceResult<BaselineForecast>,
  meta: { title: string; href: string; representativeNote?: string | null },
  now = new Date(),
): HubGlance {
  const blank: HubGlance = {
    ...meta,
    icon: null,
    high: null,
    low: null,
    precip: null,
    wind: null,
    windowLabel: SUMMARY_WINDOW,
    phrase: 'Forecast unavailable',
    alert: null,
    representativeNote: meta.representativeNote ?? null,
  };
  if (result.status === 'error' || !result.data) return blank;

  const data = result.data;
  const periods =
    (data.dailyForecast?.length ? periodsFromDaily(data) : periodsFromForecastPeriods(data));
  const alert = alertLabel(
    data.hazards.map((hazard) => ({ event: hazard.event, severity: hazard.severity })),
  );
  const gust = data.windGust != null ? data.windGust : null;
  if (periods.length === 0) {
    return {
      ...blank,
      icon: data.icon ?? null,
      phrase: data.conditions[0] ?? blank.phrase,
      alert,
      wind: windLabel(gust, parseMph(data.windSpeed)),
    };
  }

  const { high, low } =
    data.dailyForecast?.length
      ? dailyHighLowFromSnippets(data.dailyForecast)
      : summitHighLow(periods);

  return {
    ...meta,
    icon: data.icon ?? periods[0].icon,
    high,
    low,
    precip: maxPrecip(periods, now),
    wind: windLabel(gust, maxSustainedMph(periods, now)),
    windowLabel: SUMMARY_WINDOW,
    phrase: glancePhrase({ periods, maxGustMph: gust, now }),
    alert,
    representativeNote: meta.representativeNote ?? null,
  };
}