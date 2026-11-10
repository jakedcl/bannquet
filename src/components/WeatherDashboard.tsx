'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card } from '@/components/hub/Card';
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
      <Card title={spot.name} aria-label={spot.name}>
        <p className="t-footnote text-ui-label-2">{elevation(spot)}</p>
        <div className="mt-3 space-y-2" aria-busy="true">
          <div className="skeleton-bar w-1/3" />
          <div className="skeleton-bar w-2/3" />
          <div className="skeleton-bar w-1/2" />
        </div>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card title={spot.name} aria-label={spot.name}>
        <p className="t-subhead font-bold">{error ?? 'The forecast did not load.'}</p>
      </Card>
    );
  }

  const feelsLike = weather.feelsLike;
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
    <Card
      title={spot.name}
      aria-label={spot.name}
      action={weather.icon ? (
        <Image
          src={weather.icon}
          alt={weather.conditions[0] || spot.name}
          width={24}
          height={24}
          unoptimized
          className="h-6 w-6 border border-white/40 object-cover"
        />
      ) : null}
      bodyClassName="space-y-3"
    >
      <div className="ui-inset flex flex-wrap items-end justify-between gap-x-6 gap-y-2 p-3">
        <div className="min-w-0">
          <p className="t-eyebrow">Now · {elevation(spot)}</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-4xl font-bold leading-none tabular-nums">{Math.round(weather.temperature)}°F</p>
          <p className="t-subhead mt-1 break-words">{weather.conditions[0]}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="t-eyebrow">Feels like</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{Math.round(feelsLike)}°F</p>
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
        <div className="space-y-1">
          <p className="t-eyebrow">Next 7 hours</p>
          <ul className="ui-scroll-x flex gap-1.5 overflow-x-auto">
            {hourlyForecast.slice(0, 7).map((period) => (
              <li key={period.startTime} className="ui-tile w-[4.25rem] shrink-0 px-1.5 py-1.5 text-center">
                <p className="t-caption font-bold text-ui-label-2">{hourLabel(period)}</p>
                <p className="t-headline tabular-nums">{period.temperature}°</p>
                <p className="t-caption truncate text-ui-label-2">{period.windSpeed || '—'}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {dailyForecast.length > 0 ? (
        <div className="space-y-1">
          <p className="t-eyebrow">Next 7 days</p>
          <ul className="ui-inset ui-list">
            {dailyForecast.slice(0, 7).map((period) => (
              <li key={period.startTime} className="flex items-center gap-3 px-2.5 py-1.5">
                <span className="t-footnote w-[5.25rem] shrink-0 font-bold">{period.name}</span>
                <span className="t-footnote min-w-0 flex-1 truncate text-ui-label-2">{period.shortForecast || '—'}</span>
                <span className="t-footnote shrink-0 font-bold tabular-nums">
                  {period.temperature}°
                  {period.secondaryTemp !== undefined ? <span className="font-normal text-ui-label-2"> / {period.secondaryTemp}°</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {weather.hazards.length > 0 ? (
        <div className="ui-inset space-y-2 p-3">
          <p className="t-eyebrow">Hazards</p>
          <ul className="space-y-2">
            {weather.hazards.map((hazard) => (
              <li key={hazard.id} className="min-w-0">
                <p className="t-subhead flex flex-wrap items-center gap-2 font-bold">
                  {hazard.event}
                  {hazard.severity ? (
                    <span className="retro-button-yellow inline-block px-2 py-1 text-xs uppercase">{hazard.severity}</span>
                  ) : null}
                </p>
                {hazard.headline ? <p className="t-footnote mt-0.5 break-words text-ui-label-2">{hazard.headline}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="t-footnote text-ui-label-2">
        Updated {updated}.{' '}
        <a href={nws} target="_blank" rel="noopener noreferrer" className="font-bold text-brand-green underline">
          weather.gov
        </a>
      </p>
    </Card>
  );
}

function elevation(spot: WeatherSpot): string {
  return `${Number(spot.elevation).toLocaleString('en-US')} ft`;
}

function hourLabel(period: ForecastSnippet): string {
  return new Date(period.startTime).toLocaleTimeString([], { hour: 'numeric' });
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="ui-tile min-w-0 px-2.5 py-2">
      <p className="t-eyebrow break-words">{label}</p>
      <p className="t-headline break-words tabular-nums">{value}</p>
    </div>
  );
}
