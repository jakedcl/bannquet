import type { BaselineForecast } from '@/lib/mountain-weather/baseline-forecast';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
import { Notice } from '@/components/hub/Notice';
import { SourceLine, WindArrow } from '@/components/mountain-weather/kit';

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
    <section className="panel" aria-label={`${placeName} forecast summary`}>
      <h2 className="panel-bar">Forecast at a glance</h2>
      <div className="border-b border-hairline bg-surface-cream px-3.5 py-1.5 sm:px-4">
        <SourceLine
          source={
            <>
              NWS forecast for this map point, not a measured summit reading
              {gridElevation != null ? ` · grid ${gridElevation.toLocaleString('en-US')} ft` : ''}
              {placeElevationFt != null ? ` · ${placeName} ${placeElevationFt.toLocaleString('en-US')} ft` : ''}
              {result.status === 'stale' ? ' · may be out of date' : ''}
            </>
          }
        />
      </div>
      {hourly.length ? (
        <ul className="ui-list">
          {hourly.map((period) => (
            <li key={period.startTime} className="px-3.5 py-2.5 sm:px-4">
              <p className="flex items-baseline justify-between gap-3">
                <span className="text-meta font-bold">{periodTime(period.startTime)} ET</span>
                <span className="text-stat font-bold tabular-nums">{period.temperature}°F</span>
              </p>
              <p className="text-meta">{period.shortForecast || period.gridWeather || 'Forecast details unavailable'}</p>
              <p className="flex items-center gap-1 text-caption text-ink-2">
                <WindArrow from={period.windDirection} />
                Wind {[period.windDirection, period.windSpeed].filter(Boolean).join(' ') || '—'}
                {period.windGust ? ` · gust ${period.windGust}` : ''}
                {' · '}Precip {period.precipChance != null ? `${period.precipChance}%` : '—'}
              </p>
            </li>
          ))}
        </ul>
      ) : daily.length ? (
        <ul className="ui-list">
          {daily.map((period) => (
            <li key={period.startTime} className="px-3.5 py-2.5 sm:px-4">
              <p className="flex items-baseline justify-between gap-3">
                <span className="text-meta font-bold">{period.name}</span>
                <span className="text-stat font-bold tabular-nums">{period.temperature}°{period.secondaryTemp != null ? ` / ${period.secondaryTemp}°` : ''}</span>
              </p>
              <p className="text-meta">{period.shortForecast || 'Forecast details unavailable'}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-3.5">
          <Notice title="Forecast unavailable" tone="error">Check the NWS source before heading out.</Notice>
        </div>
      )}
      <div className="space-y-1 border-t border-hairline px-3.5 py-2.5 text-caption text-ink-2 sm:px-4">
        {hourly.length > 0 && daily.length > 0 ? (
          <p>
            Next days: {daily.map((period) => `${period.name} ${period.temperature}°${period.secondaryTemp != null ? `/${period.secondaryTemp}°` : ''}`).join(' · ')}
          </p>
        ) : null}
        <p>
          {hourly[0] ? `First period ${periodTime(hourly[0].startTime)} ET · ` : ''}
          <a href={result.sourceUrl || forecast?.mapUrl || 'https://forecast.weather.gov/'} target="_blank" rel="noopener noreferrer" className="font-bold underline">NWS forecast source</a>
        </p>
      </div>
    </section>
  );
}
