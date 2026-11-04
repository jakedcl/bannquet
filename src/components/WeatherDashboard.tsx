'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card } from '@/components/hub/Card';
import { Pill } from '@/components/hub/Button';
import { getWeather } from '@/lib/weather';
import type { WeatherSpot } from '@/lib/regions';
import type { ForecastSnippet, WeatherData } from '@/types/weather';

type WeatherDashboardProps = {
  spot: WeatherSpot;
};

export default function WeatherDashboard({ spot }: WeatherDashboardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchWeather() {
      try {
        const data = await getWeather(spot.lat, spot.lon);
        if (mounted) {
          setWeather(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError('The forecast did not load.');
          console.error(err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchWeather();
    return () => { mounted = false; };
  }, [spot.lat, spot.lon]);

  const nws = `https://forecast.weather.gov/MapClick.php?lat=${spot.lat}&lon=${spot.lon}`;

  if (loading) {
    return (
      <Card aria-label={spot.name}>
        <SpotHeading spot={spot} />
        <div className="mt-4 space-y-3" aria-busy="true">
          <div className="h-12 w-32 animate-pulse rounded-xl bg-ui-fill" />
          <div className="h-16 animate-pulse rounded-xl bg-ui-fill" />
          <div className="h-24 animate-pulse rounded-xl bg-ui-fill" />
        </div>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card aria-label={spot.name}>
        <SpotHeading spot={spot} />
        <p className="t-subhead mt-3 text-ui-label-2">{error ?? 'The forecast did not load.'}</p>
      </Card>
    );
  }

  const feelsLike = weather.heatIndex ?? weather.windChill ?? weather.apparentTemperature ?? weather.temperature;
  const visibilityMiles = weather.visibility ? weather.visibility / 5280 : null;
  const summitWind = weather.summitWind ? `${Math.round(weather.summitWind)} mph` : weather.windSpeed;
  const windGust = weather.windGust ? `${Math.round(weather.windGust)} mph` : null;
  const visibilityLabel = visibilityMiles ? `${visibilityMiles.toFixed(1)} mi` : '—';
  const humidity = weather.relativeHumidity !== null && weather.relativeHumidity !== undefined
    ? `${Math.round(weather.relativeHumidity)}%`
    : '—';
  const hourlyForecast = weather.hourlyForecast ?? [];
  const dailyForecast = weather.dailyForecast ?? [];
  const updated = new Date(weather.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <Card aria-label={spot.name} className="space-y-4">
      <SpotHeading
        spot={spot}
        icon={weather.icon ? (
          <Image
            src={weather.icon}
            alt={weather.conditions[0] || spot.name}
            width={48}
            height={48}
            unoptimized
            className="h-12 w-12 rounded-xl object-cover"
          />
        ) : null}
      />

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <p className="text-[3.5rem] font-semibold leading-none tracking-[-0.04em] tabular-nums">{Math.round(weather.temperature)}°</p>
          <p className="t-subhead mt-1.5 break-words text-ui-label-2">{weather.conditions[0]}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="t-footnote text-ui-label-2">Feels like</p>
          <p className="t-title3 tabular-nums">{Math.round(feelsLike)}°</p>
          <p className="t-footnote break-words text-ui-label-2">
            {summitWind} {weather.windDirection}
            {windGust ? ` · gusts ${windGust}` : ''}
          </p>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-3 gap-2">
        <Metric label="Precip" value={`${weather.precipitation}%`} />
        <Metric label="Humidity" value={humidity} />
        <Metric label="Visibility" value={visibilityLabel} />
      </div>

      {hourlyForecast.length > 0 ? (
        <div className="space-y-1.5">
          <p className="t-eyebrow px-0.5">Hourly</p>
          <ul className="ui-scroll-x -mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
            {hourlyForecast.slice(0, 7).map((period) => (
              <li key={period.startTime} className="w-[4.5rem] shrink-0 rounded-xl bg-ui-surface-2 px-2 py-2.5 text-center">
                <p className="t-caption text-ui-label-2">{hourLabel(period)}</p>
                <p className="t-headline mt-1 tabular-nums">{period.temperature}°</p>
                <p className="t-caption mt-0.5 truncate text-ui-label-2">{period.windSpeed || '—'}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {dailyForecast.length > 0 ? (
        <div className="space-y-1.5">
          <p className="t-eyebrow px-0.5">7-day</p>
          <ul className="ui-list overflow-hidden rounded-xl bg-ui-surface-2" style={{ ['--row-inset' as string]: '0.75rem' }}>
            {dailyForecast.slice(0, 7).map((period) => (
              <li key={period.startTime} className="flex items-center gap-3 px-3 py-2">
                <span className="t-subhead w-[5.5rem] shrink-0 font-semibold">{period.name}</span>
                <span className="t-footnote min-w-0 flex-1 truncate text-ui-label-2">{period.shortForecast || '—'}</span>
                <span className="t-subhead shrink-0 tabular-nums">
                  {period.temperature}°
                  {period.secondaryTemp !== undefined ? <span className="text-ui-label-2"> / {period.secondaryTemp}°</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {weather.hazards.length > 0 ? (
        <div className="space-y-2 rounded-xl bg-ui-warn-bg p-3">
          <p className="t-eyebrow !text-ui-warn">Hazards</p>
          <ul className="space-y-2">
            {weather.hazards.map((hazard) => (
              <li key={hazard.id} className="min-w-0">
                <p className="t-subhead flex flex-wrap items-center gap-2 font-semibold">
                  {hazard.event}
                  {hazard.severity ? <Pill tone="warn">{hazard.severity}</Pill> : null}
                </p>
                {hazard.headline ? <p className="t-footnote mt-0.5 break-words text-ui-label-2">{hazard.headline}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="t-caption text-ui-label-2">
        Updated {updated} ·{' '}
        <a href={nws} target="_blank" rel="noopener noreferrer" className="text-ui-accent no-underline hover:underline">
          weather.gov
        </a>
      </p>
    </Card>
  );
}

function hourLabel(period: ForecastSnippet): string {
  return new Date(period.startTime).toLocaleTimeString([], { hour: 'numeric' });
}

function SpotHeading({ spot, icon = null }: { spot: WeatherSpot; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="t-headline text-ui-label">{spot.name}</h3>
        <p className="t-footnote text-ui-label-2">{Number(spot.elevation).toLocaleString('en-US')} ft</p>
      </div>
      {icon}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-ui-surface-2 px-3 py-2.5">
      <p className="t-caption break-words text-ui-label-2">{label}</p>
      <p className="t-headline break-words tabular-nums">{value}</p>
    </div>
  );
}
