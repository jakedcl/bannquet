'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Window } from '@/components/retro/Window';
import { LoadingLines } from '@/components/ui/LoadingLines';
import { getWeather } from '@/lib/weather';
import type { WeatherSpot } from '@/lib/regions';
import { ForecastStrip } from '@/components/ui/ForecastStrip';
import type { WeatherData } from '@/types/weather';

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
  const icon = weather?.icon ? (
    <Image
      src={weather.icon}
      alt={weather.conditions[0] || spot.name}
      width={28}
      height={28}
      unoptimized
      className="h-7 w-7 object-contain"
    />
  ) : null;

  if (loading) {
    return (
      <Window title={spot.name}>
        <LoadingLines label="Loading the forecast." />
      </Window>
    );
  }

  if (error || !weather) {
    return (
      <Window title={spot.name}>
        <p className="text-sm font-bold">{error ?? 'The forecast did not load.'}</p>
      </Window>
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
    <Window title={spot.name} action={icon}>
      <div className="space-y-3">
        <p className="text-sm">Elevation {spot.elevation} ft</p>
        <div className="retro-box-inset min-w-0 bg-white p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase">Current</p>
              <p className="text-sm font-bold">{Math.round(weather.temperature)}°F</p>
              <p className="break-words text-sm">{weather.conditions[0]}</p>
            </div>
            <div className="min-w-0 sm:text-right">
              <p className="text-xs font-bold uppercase">Feels like</p>
              <p className="text-sm font-bold">{Math.round(feelsLike)}°F</p>
              <p className="break-words text-sm">
                {summitWind} {weather.windDirection}
                {windGust ? ` · gust ${windGust}` : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-3 gap-2">
          <Metric label="Precip chance" value={`${weather.precipitation}%`} />
          <Metric label="Humidity" value={humidity} />
          <Metric label="Visibility" value={visibilityLabel} />
        </div>
        <ForecastStrip label="Next 7 hours" items={hourlyForecast.slice(0, 7)} />
        <ForecastStrip label="Next 7 days" items={dailyForecast.slice(0, 7)} variant="daily" />
        {weather.hazards.length > 0 ? (
          <div className="retro-box-inset bg-white p-3">
            <p className="mb-2 text-sm font-bold uppercase">Hazards</p>
            <ul className="space-y-2">
              {weather.hazards.map((hazard) => (
                <li key={hazard.id} className="min-w-0 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{hazard.event}</span>
                    {hazard.severity ? (
                      <span className="retro-button-yellow inline-block rounded-none px-2 py-0.5 text-xs uppercase">
                        {hazard.severity}
                      </span>
                    ) : null}
                  </div>
                  {hazard.headline ? <p className="mt-1 break-words text-sm">{hazard.headline}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="text-sm">
          Updated {updated}.{' '}
          <a href={nws} target="_blank" rel="noopener noreferrer" className="font-bold underline">
            weather.gov
          </a>
        </p>
      </div>
    </Window>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="retro-box-inset min-w-0 bg-white px-2 py-2">
      <p className="break-words text-xs font-bold uppercase leading-tight">{label}</p>
      <p className="break-words text-sm font-bold">{value}</p>
    </div>
  );
}

