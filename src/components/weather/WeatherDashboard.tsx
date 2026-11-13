import Image from 'next/image';
import { Card } from '@/components/hub/Card';
import { getWeather } from '@/lib/weather';
import type { WeatherSpot } from '@/lib/regions';
import type { ForecastSnippet, WeatherData } from '@/types/weather';

type WeatherDashboardProps = {
  spot: WeatherSpot;
  /** When set (server path), skip fetching and render this snapshot. */
  weather?: WeatherData | null;
  error?: string | null;
};

export default async function WeatherDashboard({ spot, weather: preset, error: presetError }: WeatherDashboardProps) {
  let weather = preset ?? null;
  let error = presetError ?? null;
  if (preset === undefined) {
    try {
      weather = await getWeather(spot.lat, spot.lon);
    } catch (err) {
      error = 'The forecast did not load.';
      console.error(err);
    }
  }

  const nws = `https://forecast.weather.gov/MapClick.php?lat=${spot.lat}&lon=${spot.lon}`;

  if (error || !weather) {
    return (
      <Card title={spot.name} aria-label={spot.name}>
        <p className="t-subhead font-bold">{error ?? 'The forecast did not load.'}</p>
      </Card>
    );
  }

  return <WeatherDashboardBody spot={spot} weather={weather} nws={nws} />;
}

export function WeatherDashboardBody({
  spot,
  weather,
  nws,
}: {
  spot: WeatherSpot;
  weather: WeatherData;
  nws: string;
}) {
  const feelsLike = weather.feelsLike;
  const visibilityMiles = weather.visibility ? weather.visibility / 5280 : null;
  const summitWind = weather.summitWind !== null && weather.summitWind !== undefined
    ? `${Math.round(weather.summitWind)} mph`
    : weather.windSpeed;
  const windGust = weather.windGust !== null && weather.windGust !== undefined
    ? `${Math.round(weather.windGust)} mph`
    : null;
  const visibilityLabel = visibilityMiles !== null ? `${visibilityMiles.toFixed(1)} mi` : '—';
  const humidity = weather.relativeHumidity !== null && weather.relativeHumidity !== undefined
    ? `${Math.round(weather.relativeHumidity)}%`
    : '—';
  const precipLabel = weather.precipitation !== null && weather.precipitation !== undefined
    ? `${weather.precipitation}%`
    : '—';
  const hourlyForecast = weather.hourlyForecast ?? [];
  const dailyForecast = weather.dailyForecast ?? [];
  const updated = new Date(weather.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const gridElevation = weather.gridExtras?.elevationFt;

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
          <p className="mt-1 font-[family-name:var(--font-heading)] text-4xl font-bold leading-none tabular-nums">
            {weather.temperature !== null ? `${Math.round(weather.temperature)}°F` : '—'}
          </p>
          <p className="t-subhead mt-1 break-words">{weather.conditions[0] ?? '—'}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="t-eyebrow">Feels like</p>
          <p className="mt-1 text-xl font-bold tabular-nums">
            {feelsLike !== null ? `${Math.round(feelsLike)}°F` : '—'}
          </p>
          <p className="t-footnote break-words text-ui-label-2">
            {summitWind ?? '—'} {weather.windDirection ?? ''}
            {windGust ? ` · gusts ${windGust}` : ''}
          </p>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-3 gap-2">
        <Metric label="Precip chance" value={precipLabel} />
        <Metric label="Humidity" value={humidity} />
        <Metric label="Visibility" value={visibilityLabel} />
      </div>

      <GridExtrasPanel weather={weather} gridElevation={gridElevation ?? null} />

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

function GridExtrasPanel({ weather, gridElevation }: { weather: WeatherData; gridElevation: number | null }) {
  const extras = weather.gridExtras;
  if (!extras) return null;
  const hasSeries = extras.snowLevel.length > 0
    || extras.snowfallAmount.length > 0
    || extras.iceAccumulation.length > 0
    || extras.ceilingHeight.length > 0;
  if (!hasSeries && gridElevation === null) return null;

  return (
    <div className="ui-inset space-y-2 p-3">
      <p className="t-eyebrow">
        NWS grid forecast
        {gridElevation !== null ? ` · ${gridElevation.toLocaleString('en-US')} ft grid elevation` : ''}
      </p>
      <GridSeriesTable title="Snow level" unit="ft" samples={extras.snowLevel} />
      <GridSeriesTable title="Snowfall" unit="in" samples={extras.snowfallAmount} />
      <GridSeriesTable title="Ice" unit="in" samples={extras.iceAccumulation} />
      <GridSeriesTable title="Ceiling" unit="ft" samples={extras.ceilingHeight} />
    </div>
  );
}

function GridSeriesTable({
  title,
  unit,
  samples,
}: {
  title: string;
  unit: string;
  samples: { label: string; value: number | null }[];
}) {
  if (samples.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="t-footnote font-bold">{title}</p>
      <ul className="ui-scroll-x flex gap-1.5 overflow-x-auto text-xs">
        {samples.map((sample) => (
          <li key={`${title}-${sample.label}`} className="ui-tile min-w-[4.5rem] shrink-0 px-1.5 py-1 text-center">
            <p className="font-bold text-ui-label-2">{sample.label}</p>
            <p className="tabular-nums">{sample.value !== null ? `${Math.round(sample.value)} ${unit}` : '—'}</p>
          </li>
        ))}
      </ul>
    </div>
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
