import type { BaselineForecast } from '@/lib/mountain-weather/baseline-forecast';
import type { SourceResult } from '@/lib/mountain-weather/source-types';

function periodTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function ForecastAtAGlance({
  result,
  placeName,
  placeElevationFt,
}: {
  result: SourceResult<BaselineForecast>;
  placeName: string;
  placeElevationFt: number | null;
}) {
  const forecast = result.data;
  const hourly = forecast?.hourlyForecast?.slice(0, 3) ?? [];
  const daily = forecast?.dailyForecast?.slice(0, 3) ?? [];
  const gridElevation = forecast?.gridExtras?.elevationFt;

  return (
    <section className="retro-box border-[#5c3a1e] bg-beige/80 p-4" aria-label={`${placeName} forecast summary`}>
      <h2 className="text-lg font-bold uppercase tracking-wide">Forecast at a glance</h2>
      <p className="mt-1 text-xs text-gray-700">
        NWS forecast for this map point, not a measured summit reading
        {gridElevation != null ? ` · grid elevation ${gridElevation.toLocaleString('en-US')} ft` : ''}
        {placeElevationFt != null ? ` · ${placeName} catalog elevation ${placeElevationFt.toLocaleString('en-US')} ft` : ''}
        {result.status === 'stale' ? ' · forecast may be out of date' : ''}
      </p>
      {hourly.length ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {hourly.map((period) => (
            <li key={period.startTime} className="border border-[#5c3a1e]/25 bg-white/60 p-2 text-sm">
              <p className="font-bold">{periodTime(period.startTime)} ET · {period.temperature}°F</p>
              <p>{period.shortForecast || period.gridWeather || 'Forecast details unavailable'}</p>
              <p className="text-xs text-gray-700">
                Wind {[period.windDirection, period.windSpeed].filter(Boolean).join(' ') || '—'}
                {period.windGust ? ` · gust ${period.windGust}` : ''}
                {' · '}Precip {period.precipChance != null ? `${period.precipChance}%` : '—'}
              </p>
            </li>
          ))}
        </ul>
      ) : daily.length ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {daily.map((period) => (
            <li key={period.startTime} className="border border-[#5c3a1e]/25 bg-white/60 p-2 text-sm">
              <p className="font-bold">{period.name} · {period.temperature}°{period.secondaryTemp != null ? ` / ${period.secondaryTemp}°` : ''}</p>
              <p>{period.shortForecast || 'Forecast details unavailable'}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm font-bold">Forecast unavailable. Check the NWS source before heading out.</p>
      )}
      {hourly.length > 0 && daily.length > 0 ? (
        <p className="mt-2 text-xs text-gray-700">
          Next days: {daily.map((period) => `${period.name} ${period.temperature}°${period.secondaryTemp != null ? `/${period.secondaryTemp}°` : ''}`).join(' · ')}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-gray-700">
        {hourly[0] ? `First period ${periodTime(hourly[0].startTime)} ET · ` : ''}
        <a href={result.sourceUrl || forecast?.mapUrl || 'https://forecast.weather.gov/'} target="_blank" rel="noopener noreferrer" className="font-bold underline">NWS forecast source</a>
      </p>
    </section>
  );
}
