'use client';

import { useEffect, useState } from 'react';
import { WeatherData } from '@/types/weather';
import { getWeather } from '@/lib/weather';
import Image from 'next/image';
import { WeatherSpot } from '@/lib/regions';

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
          setError('Failed to load weather data');
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="font-medium text-red-600">{spot.name}</h2>
        <p className="text-sm text-red-500 mt-2">{error}</p>
      </div>
    );
  }

  if (!weather) return null;

  const windSpeedNum = parseInt(weather.windSpeed.replace(/[^0-9]/g, '')) || 0;
  const computedWindChill = windSpeedNum > 3 && weather.temperature <= 50
    ? Math.round(
      35.74 + 
        0.6215 * weather.temperature -
        35.75 * Math.pow(windSpeedNum, 0.16) +
        0.4275 * weather.temperature * Math.pow(windSpeedNum, 0.16)
      )
    : null;

  const feelsLike = weather.apparentTemperature ?? computedWindChill ?? weather.temperature;

  const visibilityMiles = weather.visibility ? weather.visibility / 5280 : null;

  const summitWind = weather.summitWind ? `${Math.round(weather.summitWind)} mph` : weather.windSpeed;
  const windGust = weather.windGust ? `${Math.round(weather.windGust)} mph` : null;
  const snowfall = weather.snowAmount !== null && weather.snowAmount !== undefined
    ? `${(Math.round(weather.snowAmount * 10) / 10).toFixed(1)} in`
    : '—';
  const visibilityLabel = visibilityMiles ? `${visibilityMiles.toFixed(1)} mi` : '—';
  const hourlyForecast = weather.hourlyForecast ?? [];
  const dailyForecast = weather.dailyForecast ?? [];

  return (
    <div className="bg-white rounded-3xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="border-b border-gray-100 bg-brand-green/5 px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900 text-base">{spot.name}</h2>
          <p className="text-xs text-gray-600 uppercase tracking-wide">Elevation {spot.elevation}ft</p>
        </div>
        {weather.icon && (
          <div className="flex-shrink-0">
            <Image 
              src={weather.icon} 
              alt={weather.conditions[0]} 
              width={48} 
              height={48} 
              className="w-12 h-12 object-contain"
            />
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="space-y-4">
          <div className="border border-gray-100 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Current</p>
                <p className="text-3xl font-bold text-brand-green leading-none">{Math.round(weather.temperature)}°F</p>
                <p className="text-sm text-gray-600 mt-1">{weather.conditions[0]}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-gray-500">Feels like</p>
                <p className="text-2xl font-semibold text-brand-green leading-none">{Math.round(feelsLike)}°F</p>
                <p className="text-sm text-gray-600 mt-1">
                  {summitWind} {weather.windDirection}
                  {windGust ? <span className="text-gray-400"> · gust {windGust}</span> : null}
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Precip chance" value={`${weather.precipitation}%`} />
            <MetricCard label="Past snowfall" value={snowfall} hint="past 24h" />
            <MetricCard label="Visibility" value={visibilityLabel} />
          </div>
          
          {hourlyForecast.length > 0 && (
            <ForecastStrip label="Next 7 hours" items={hourlyForecast.slice(0, 7)} columns={7} />
          )}

          {dailyForecast.length > 0 && (
            <ForecastStrip label="Next 7 days" items={dailyForecast.slice(0, 7)} variant="daily" columns={7} />
          )}

          {weather.hazards.length > 0 && (
            <div className="border border-brand-green/10 rounded-2xl p-4 bg-brand-green/5">
              <p className="text-sm font-semibold text-brand-green mb-2">Hazards & alerts</p>
              <ul className="space-y-2">
                {weather.hazards.map((hazard) => (
                  <li key={hazard.id} className="text-sm text-gray-800">
                    <span className="font-semibold">{hazard.event}</span>
                    {hazard.severity ? (
                      <span className="uppercase text-xs tracking-wide text-white bg-brand-green px-2 py-0.5 rounded-full ml-2">
                        {hazard.severity}
                      </span>
                    ) : null}
                    {hazard.headline ? (
                      <p className="text-gray-600 mt-1 text-sm">{hazard.headline}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
          </div>
          )}
        </div>
        
        <div className="mt-4 pt-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
          <p>
            Last updated: {new Date(weather.timestamp).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit'
            })}
          </p>
          <p>Data: <span className="text-brand-green">weather.gov</span></p>
        </div>
      </div>
    </div>
  );
} 

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
};

function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-gray-100 p-3 bg-white/60">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900 mt-1">{value}</p>
      {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
    </div>
  );
}

function formatPeriodLabel(period: NonNullable<WeatherData['hourlyForecast']>[number]) {
  if (period.name && period.name !== 'This Afternoon' && period.name !== 'Overnight') {
    return period.name;
  }
  const date = new Date(period.startTime);
  return date.toLocaleTimeString([], { hour: 'numeric' });
}

type ForecastStripProps = {
  label: string;
  items: NonNullable<WeatherData['hourlyForecast']>;
  variant?: 'hourly' | 'daily';
  columns?: number;
};

function ForecastStrip({ label, items, variant = 'hourly', columns = 4 }: ForecastStripProps) {
  const hasItems = items.length > 0;
  if (!hasItems) return null;

  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">{label}</p>
      <div className="rounded-2xl border border-gray-100 bg-white/80 overflow-hidden">
        <div className="grid divide-x divide-gray-100" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {items.map((period) => (
            <div key={`${period.startTime}-${label}`} className="flex flex-col items-start text-left py-2 px-2">
              <div className="w-full aspect-square mb-1 overflow-hidden rounded">
                {period.icon ? (
                  <Image
                    src={period.icon}
                    alt={period.shortForecast || period.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded bg-gray-100" />
                )}
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {variant === 'daily' ? period.name : formatPeriodLabel(period)}
              </p>
              {variant === 'daily' && period.secondaryTemp !== undefined ? (
                <div className="text-xs font-semibold text-gray-800 space-y-1">
                  <p>{period.temperature}°F Hi</p>
                  <p>{period.secondaryTemp}°F Lo</p>
                </div>
              ) : (
                <p className="text-sm font-semibold text-brand-green">
                  {`${period.temperature}°F`}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
