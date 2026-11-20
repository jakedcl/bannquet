import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import { SourceErrorNote } from '@/components/mountain-weather/SourceErrorNote';
import { HourlyStrip, ReadingGrid, ReadingTile, SourceReceipt, WindArrow } from '@/components/mountain-weather/kit';
import type { BaselineForecast } from '@/lib/mountain-weather/baseline-forecast';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
import type { ForecastSnippet, GridValueSample } from '@/types/weather';
import { NWS_GRID_BASELINE_DEF } from '@/lib/mountain-weather/registry';

/*
 * The NWS gridpoint forecast for a place, as the Forecast tab's panels:
 * right now, the next 48 hours, the 7-day forecast and the grid details.
 * Each panel takes the same baseline result.
 */

type Baseline = SourceResult<BaselineForecast>;

/** Receipt for a panel built from the NWS gridpoint forecast. */
function GridReceipt({ result, product }: { result: Baseline; product: string }) {
  return (
    <SourceReceipt
      org={NWS_GRID_BASELINE_DEF.org}
      product={product}
      at={result.issuedAt}
      verb="updated"
      status={result.status}
      expectedEveryHours={NWS_GRID_BASELINE_DEF.expectedEveryHours}
      href={result.sourceUrl}
      extra={
        result.data?.mapUrl ? (
          <a href={result.data.mapUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            NWS forecast page ›
          </a>
        ) : null
      }
    />
  );
}

function gridLine(result: Baseline, placeElevationFt: number | null): string {
  const gridElev = result.data?.gridExtras?.elevationFt;
  return `${NWS_GRID_BASELINE_DEF.org} grid at ${gridElev != null ? `${gridElev.toLocaleString('en-US')} ft` : 'unknown elevation'}${placeElevationFt != null ? ` · place ${placeElevationFt.toLocaleString('en-US')} ft` : ''}${result.status === 'stale' ? ' · stale' : ''}`;
}

/** Shown in place of the panels when the grid did not load. */
export function BaselineError({ result }: { result: Baseline }) {
  if (result.status !== 'error' && result.data) return null;
  return (
    <CollapsibleSection title="NWS forecast" subtitle={`${NWS_GRID_BASELINE_DEF.org} (unavailable)`}>
      <SourceErrorNote label="NWS forecast" href={result.sourceUrl ?? NWS_GRID_BASELINE_DEF.url} />
    </CollapsibleSection>
  );
}

/** Right now, from the forecast grid (not a measurement). */
export function ForecastNowPanel({ result, placeElevationFt }: { result: Baseline; placeElevationFt: number | null }) {
  const data = result.data;
  if (!data) return null;
  return (
    <CollapsibleSection title="Right now (forecast)" subtitle={gridLine(result, placeElevationFt)}>
      <ReadingGrid>
        <ReadingTile
          label="Temp"
          value={data.temperature !== null ? `${Math.round(data.temperature)}°F` : '—'}
          sub={data.conditions[0] ?? undefined}
        />
        <ReadingTile
          label="Feels like"
          value={data.feelsLike !== null ? `${Math.round(data.feelsLike)}°F` : '—'}
          sub={`Wind chill ${fmtScalar(data.windChill, '°')} · heat index ${fmtScalar(data.heatIndex, '°')} · apparent ${fmtScalar(data.apparentTemperature, '°')}`}
        />
        <ReadingTile
          label="Wind"
          value={
            <span className="inline-flex items-center gap-1">
              <WindArrow from={data.windDirection} className="h-4 w-4" />
              {[data.windDirection, data.windSpeed].filter(Boolean).join(' ') || '—'}
            </span>
          }
          sub={data.windGust !== null ? `Gusts ${Math.round(data.windGust)} mph` : undefined}
        />
        <ReadingTile label="Humidity" value={fmtScalar(data.relativeHumidity, '%')} />
        <ReadingTile label="Visibility" value={fmtScalar(data.visibility, ' mi')} />
        <ReadingTile label="Dewpoint" value={fmtScalar(data.dewpoint, '°F')} />
        <ReadingTile label="Sky cover" value={fmtScalar(data.skyCover, '%')} />
        <ReadingTile label="Precip chance" value={fmtScalar(data.precipitation, '%')} sub="This hour" />
        <ReadingTile label="Precip amount" value={qpfLabel(data.quantitativePrecipitation)} sub="Grid now" />
        <ReadingTile label="Thunder" value={fmtScalar(data.probabilityOfThunderstorm, '%')} sub="Chance" />
      </ReadingGrid>
      <GridReceipt result={result} product="Gridpoint forecast, this hour" />
    </CollapsibleSection>
  );
}

/** The next 48 hours strip, with every hour behind "All hours". */
export function Next48Panel({ result }: { result: Baseline }) {
  const periods = result.data?.hourlyForecast ?? [];
  if (periods.length === 0) return null;
  return (
    <section className="panel">
      <h2 className="panel-bar">Next 48 hours</h2>
      <div className="space-y-3 px-3.5 py-3 sm:px-4">
        <HourlyStrip periods={periods} />
        <CollapsibleSection title={`All ${periods.length} hours`} subtitle="Every hour from NWS, with grid weather" defaultOpen={false}>
          <HourlyTable periods={periods} />
        </CollapsibleSection>
        <GridReceipt result={result} product="Hourly forecast, shown in 3-hour steps" />
      </div>
    </section>
  );
}

/** 7-day highs and lows, then each named period with its full text. */
export function SevenDayPanel({ result }: { result: Baseline }) {
  const daily = result.data?.dailyForecast?.slice(0, 7) ?? [];
  const periods = result.data?.forecastPeriods ?? [];
  if (daily.length === 0 && periods.length === 0) return null;
  return (
    <CollapsibleSection title="7-day forecast" subtitle="NWS forecast periods">
      <div className="space-y-3">
        {daily.length ? <DailyList periods={daily} /> : null}
        {periods.length ? <PeriodNarratives periods={periods} /> : null}
      </div>
      <GridReceipt result={result} product="7-day forecast" />
    </CollapsibleSection>
  );
}

function fmtScalar(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${Math.round(value)}${suffix}`;
}

function qpfLabel(inches: number | null | undefined): string {
  if (inches === null || inches === undefined || !Number.isFinite(inches)) return '—';
  return `${inches.toFixed(2)} in`;
}

/** Every grid series NWS publishes for the point (collapsed). */
export function GridDetailsPanel({ result }: { result: Baseline }) {
  const g = result.data?.gridExtras;
  if (!g) return null;
  return (
    <CollapsibleSection title="Grid details" subtitle="NWS gridpoint series: dewpoint, sky, precip, snow level, snowfall, ice, ceiling" defaultOpen={false}>
      <div className="space-y-3 text-caption">
        <SeriesRow title="Dewpoint (°F)" samples={g.dewpoint} />
        <SeriesRow title="Sky cover (%)" samples={g.skyCover} />
        <SeriesRow title="QPF (in)" samples={g.quantitativePrecipitation} format={(v) => (v !== null ? v.toFixed(2) : '—')} />
        <SeriesRow title="Thunder probability (%)" samples={g.probabilityOfThunderstorm} />
        <SeriesRow title="Snow level (ft)" samples={g.snowLevel} />
        <SeriesRow title="Snowfall (in)" samples={g.snowfallAmount} />
        <SeriesRow title="Ice (in)" samples={g.iceAccumulation} />
        <SeriesRow title="Ceiling (ft)" samples={g.ceilingHeight} />
      </div>
      <GridReceipt result={result} product="Gridpoint data" />
    </CollapsibleSection>
  );
}

/** Grid values arrive with float noise (ceiling 100.0000032 ft): whole numbers from 100 up, one decimal below. */
export function gridNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 100) return Math.round(value).toLocaleString('en-US');
  return String(Math.round(value * 10) / 10);
}

function SeriesRow({
  title,
  samples,
  format,
}: {
  title: string;
  samples: GridValueSample[];
  format?: (value: number | null) => string;
}) {
  if (samples.length === 0) return null;
  const fmt = format ?? gridNumber;
  return (
    <div>
      <p className="font-bold">{title}</p>
      <ul className="ui-scroll-x mt-1 flex gap-1 overflow-x-auto">
        {samples.map((s) => (
          <li key={`${title}-${s.label}`} className="tile shrink-0 px-2 py-1">
            <span className="block font-bold">{s.label}</span>
            <span className="tabular-nums">{fmt(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HourlyTable({ periods }: { periods: NonNullable<BaselineForecast['hourlyForecast']> }) {
  return (
      <div className="well overflow-x-auto">
        <table className="min-w-full text-caption">
          <thead className="bg-surface-gray">
            <tr className="text-left text-tag uppercase tracking-label">
              <th className="px-2 py-1">Time</th>
              <th className="px-2 py-1">Temp</th>
              <th className="px-2 py-1">Wind</th>
              <th className="px-2 py-1">Gust</th>
              <th className="px-2 py-1">PoP</th>
              <th className="px-2 py-1">Grid weather</th>
              <th className="px-2 py-1">Forecast</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.startTime} className="border-t border-hairline">
                <td className="whitespace-nowrap px-2 py-1 font-bold">{formatEt(p.startTime)}</td>
                <td className="px-2 py-1 tabular-nums">{p.temperature}°</td>
                <td className="px-2 py-1">
                  {[p.windDirection, p.windSpeed].filter(Boolean).join(' ') || '—'}
                </td>
                <td className="px-2 py-1">{p.windGust ?? '—'}</td>
                <td className="px-2 py-1 tabular-nums">
                  {p.precipChance !== null && p.precipChance !== undefined ? `${p.precipChance}%` : '—'}
                </td>
                <td className="px-2 py-1">{p.gridWeather ?? '—'}</td>
                <td className="px-2 py-1">{p.shortForecast ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
  );
}

function PeriodNarratives({ periods }: { periods: ForecastSnippet[] }) {
  return (
      <ul className="ui-list">
        {periods.map((p) => (
          <li key={`${p.name}-${p.startTime}`} className="py-2.5">
            <p className="flex items-baseline justify-between gap-3">
              <span className="font-heading text-meta font-bold uppercase">{p.name}</span>
              <span className="text-heading font-bold tabular-nums">
                {p.temperature}°{p.isDaytime === false ? <span className="text-caption font-normal text-ink-2"> low</span> : null}
              </span>
            </p>
            {p.shortForecast ? <p className="text-meta">{p.shortForecast}</p> : null}
            {p.detailedForecast ? <p className="mt-1 whitespace-pre-wrap text-caption text-ink-2">{p.detailedForecast}</p> : null}
          </li>
        ))}
      </ul>
  );
}

function DailyList({ periods }: { periods: NonNullable<BaselineForecast['dailyForecast']> }) {
  return (
    <div>
      <p className="text-tag font-bold uppercase tracking-label text-ink-2">Highs and lows</p>
      <ul className="ui-scroll-x mt-1 flex gap-1.5 overflow-x-auto">
        {periods.map((p) => (
          <li key={p.startTime} className="tile flex min-w-20 shrink-0 flex-col items-center px-2.5 py-1.5 text-caption">
            <span className="font-bold">{p.name}</span>
            <span className="tabular-nums">
              {p.isDaytime === false ? `${p.temperature}° low` : `${p.temperature}°${p.secondaryTemp !== undefined ? ` / ${p.secondaryTemp}°` : ''}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatEt(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
