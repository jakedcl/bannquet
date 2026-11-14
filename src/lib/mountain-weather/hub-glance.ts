import type { BaselineForecast } from '@/lib/mountain-weather/baseline-forecast';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
import {
  alertLabel,
  glancePhrase,
  maxPrecip,
  maxSustainedMph,
  parseMph,
  summitHighLow,
  windLabel,
  type GlancePeriod,
} from '@/lib/weather-glance';

export type HubGlance = {
  title: string;
  href: string;
  icon: string | null;
  high: number | null;
  low: number | null;
  precip: number | null;
  wind: string | null;
  phrase: string;
  alert: string | null;
};

function periodsFromBaseline(data: BaselineForecast): GlancePeriod[] {
  const pool = data.dailyForecast ?? [];
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
      precip: data.precipitation,
      windMph: parseMph(period.windSpeed),
      shortForecast: period.shortForecast ?? data.conditions[0] ?? '',
      icon: period.icon ?? null,
    }];
  }).slice(0, 8);
}

export function hubGlanceFromBaseline(
  result: SourceResult<BaselineForecast>,
  meta: { title: string; href: string },
  now = new Date(),
): HubGlance {
  const blank: HubGlance = {
    ...meta,
    icon: null,
    high: null,
    low: null,
    precip: null,
    wind: null,
    phrase: 'Forecast unavailable',
    alert: null,
  };
  if (result.status === 'error' || !result.data) return blank;

  const data = result.data;
  const periods = periodsFromBaseline(data);
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
  const { high, low } = summitHighLow(periods);
  return {
    ...meta,
    icon: data.icon ?? periods[0].icon,
    high,
    low,
    precip: maxPrecip(periods, now),
    wind: windLabel(gust, maxSustainedMph(periods, now)),
    phrase: glancePhrase({ periods, maxGustMph: gust, now }),
    alert,
  };
}
