import Link from 'next/link';
import type { ReactNode } from 'react';
import { Window } from '@/components/retro/Window';
import { formatAge, formatEastern, type FieldState, type GaugeView } from '@/lib/fishing/readings';
import { getWeather } from '@/lib/weather';
import type { WeatherData } from '@/types/weather';

const UNAVAILABLE = 'Data unavailable';

function blank(state: FieldState): string {
  return state === 'not-measured' ? 'Not measured' : 'No current reading';
}

function shown(state: FieldState, value: string | null): string {
  return state === 'value' && value ? value : blank(state);
}

function Metric({ label, value, note }: { label: string; value: string; note?: string | null }) {
  return (
    <div className="retro-box-inset min-w-0 bg-white px-2 py-2" title={note ?? undefined}>
      <p className="break-words text-xs font-bold uppercase leading-tight">{label}</p>
      <p className="break-words text-sm font-bold">{value}</p>
    </div>
  );
}

export function GaugeSpot({
  gauge,
  now,
  forecast,
}: {
  gauge: GaugeView;
  now: number;
  forecast: ReactNode;
}) {
  const place = [gauge.region, gauge.county, gauge.state].filter(Boolean).join(' · ');
  const updated = gauge.updatedAt
    ? formatAge(gauge.updatedAt, now) ?? formatEastern(gauge.updatedAt) ?? '—'
    : '—';

  return (
    <Window title={gauge.name}>
      <p className="mb-4 break-words text-sm">
        <Link href="/fishing" className="font-bold underline">Fishing</Link>
        {place ? ` · ${place}` : ''}
      </p>
      <div className="mb-4 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric label="Flow" value={shown(gauge.flowState, gauge.flow)} note={gauge.flowNote} />
        <Metric label="24h" value={gauge.trend ?? '—'} />
        <Metric label="Gauge height" value={shown(gauge.heightState, gauge.height)} note={gauge.heightNote} />
        <Metric label="Water temp" value={shown(gauge.tempState, gauge.temp)} note={gauge.tempNote} />
        <Metric label="Updated" value={updated} note={gauge.updatedAt ? formatEastern(gauge.updatedAt) : null} />
        <Metric label="Status" value={gauge.status ?? '—'} />
      </div>
      {forecast}
      <p className="mt-3 text-sm">
        <a href={gauge.usgsHref} target="_blank" rel="noopener noreferrer" className="font-bold underline">
          USGS
        </a>
      </p>
    </Window>
  );
}

export async function GaugeForecast({ gauge }: { gauge: GaugeView }) {
  if (gauge.lat == null || gauge.lon == null) {
    return (
      <p className="text-sm font-bold">
        {gauge.name} has no coordinates from USGS, so there is no forecast point.
      </p>
    );
  }

  let weather: WeatherData;
  try {
    weather = await getWeather(gauge.lat, gauge.lon);
  } catch {
    console.error('Forecast did not load');
    return <p className="text-sm font-bold">{UNAVAILABLE}</p>;
  }

  const periods = weather.forecastPeriods ?? [];
  const nws = `https://forecast.weather.gov/MapClick.php?lat=${gauge.lat}&lon=${gauge.lon}`;

  return (
    <section className="min-w-0 max-w-full space-y-2 border border-border-gray bg-beige/40 px-3 py-2">
      <h2 className="text-sm font-bold uppercase">Forecast</h2>
      <p className="break-words text-sm">
        {typeof weather.temperature === 'number' ? `Air ${weather.temperature}°F` : 'Air temperature missing'}
        {weather.windSpeed ? ` · Wind ${weather.windSpeed}` : ''}
        {weather.windDirection ? ` ${weather.windDirection}` : ''}
        {typeof weather.windGust === 'number' ? ` · Gust ${Math.round(weather.windGust)} mph` : ''}
        {weather.conditions[0] ? ` · ${weather.conditions[0]}` : ''}
      </p>
      {periods.length > 0 ? (
        <ul className="flex w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-1">
          {periods.map((period) => (
            <li key={period.startTime} className="w-28 shrink-0 bg-white px-2 py-1 text-xs">
              <span className="block font-bold">{periodLabel(period.name)}</span>
              <span className="block">{typeof period.temperature === 'number' ? `${period.temperature}°` : '—'}</span>
              <span className="block truncate">{period.windSpeed || '—'}</span>
              <span className="block truncate text-gray-700">{period.shortForecast || '—'}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm">The forecast did not include periods.</p>
      )}
      <a href={nws} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-bold underline">
        National Weather Service forecast
      </a>
    </section>
  );
}

function periodLabel(name: string): string {
  const trimmed = name.trim();
  if (/^tonight$/i.test(trimmed)) return 'Tonight';
  if (/^this afternoon$/i.test(trimmed)) return 'Today';
  if (/^this morning$/i.test(trimmed)) return 'Morning';
  if (/^this evening$/i.test(trimmed)) return 'Evening';
  if (/^overnight$/i.test(trimmed)) return 'Overnight';
  const match = trimmed.match(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)( Night)?$/i);
  if (!match) return trimmed;
  const short = match[1].slice(0, 3);
  const day = short.charAt(0).toUpperCase() + short.slice(1).toLowerCase();
  return match[2] ? `${day} night` : day;
}
