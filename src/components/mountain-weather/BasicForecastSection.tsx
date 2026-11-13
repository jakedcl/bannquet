import Image from 'next/image';
import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import type { BaselineForecast } from '@/lib/mountain-weather/baseline-forecast';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
import type { ForecastSnippet, GridValueSample } from '@/types/weather';
import { NWS_GRID_BASELINE_DEF } from '@/lib/mountain-weather/registry';

export function BasicForecastSection({
  result,
  placeName,
  placeElevationFt,
}: {
  result: SourceResult<BaselineForecast>;
  placeName: string;
  placeElevationFt: number | null;
}) {
  if (result.status === 'error' || !result.data) {
    return (
      <CollapsibleSection title="Basic forecast" subtitle={`Source: ${NWS_GRID_BASELINE_DEF.org} (unavailable)`}>
        <p className="text-sm font-bold">{result.error ?? 'Forecast did not load.'}</p>
      </CollapsibleSection>
    );
  }

  const data = result.data;
  const freshness = result.status === 'stale' ? ' · stale' : '';
  const gridElev = data.gridExtras?.elevationFt;

  return (
    <CollapsibleSection
      title="Basic forecast"
      subtitle={`${NWS_GRID_BASELINE_DEF.org} grid at ${gridElev !== null && gridElev !== undefined ? `${gridElev.toLocaleString('en-US')} ft` : 'unknown elevation'}${placeElevationFt !== null ? ` · catalog ${placeElevationFt.toLocaleString('en-US')} ft` : ''}${freshness}`}
    >
      <div className="space-y-4 text-sm">
        <NowPanel data={data} placeName={placeName} />
        <ObsGrid data={data} />
        <GridExtrasBlock data={data} />
        {data.hourlyForecast && data.hourlyForecast.length > 0 ? (
          <HourlyTable periods={data.hourlyForecast} />
        ) : null}
        {data.forecastPeriods && data.forecastPeriods.length > 0 ? (
          <PeriodNarratives periods={data.forecastPeriods} />
        ) : null}
        {data.dailyForecast && data.dailyForecast.length > 0 ? (
          <DailyList periods={data.dailyForecast.slice(0, 7)} />
        ) : null}
        <p className="text-xs text-gray-700">
          {data.timestamp ? (
            <>Hourly period start {formatEt(data.timestamp)} · </>
          ) : (
            <>No current hourly start time from NWS · </>
          )}
          checked at render ·{' '}
          <a href={data.mapUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            NWS MapClick
          </a>
        </p>
      </div>
    </CollapsibleSection>
  );
}

function fmtScalar(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${Math.round(value)}${suffix}`;
}

function NowPanel({ data, placeName }: { data: BaselineForecast; placeName: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border border-[#5c3a1e]/30 bg-white/60 p-3">
      <div>
        <p className="text-xs font-bold uppercase text-gray-700">Now · {placeName}</p>
        <p className="font-[family-name:var(--font-heading)] text-3xl font-bold tabular-nums">
          {data.temperature !== null ? `${Math.round(data.temperature)}°F` : '—'}
        </p>
        <p>{data.conditions[0] ?? '—'}</p>
      </div>
      <div className="text-right text-xs">
        <p>
          <span className="font-bold uppercase text-gray-700">Feels like </span>
          {data.feelsLike !== null ? `${Math.round(data.feelsLike)}°F` : '—'}
        </p>
        <p>
          <span className="font-bold">Wind chill </span>
          {fmtScalar(data.windChill, '°F')}
          <span className="mx-1">·</span>
          <span className="font-bold">Heat index </span>
          {fmtScalar(data.heatIndex, '°F')}
          <span className="mx-1">·</span>
          <span className="font-bold">Apparent </span>
          {fmtScalar(data.apparentTemperature, '°F')}
        </p>
        <p className="mt-1">
          {data.windSpeed ?? '—'} {data.windDirection ?? ''}
          {data.windGust !== null ? ` · gusts ${Math.round(data.windGust)} mph` : ''}
        </p>
      </div>
      {data.icon ? (
        <Image src={data.icon} alt="" width={40} height={40} unoptimized className="h-10 w-10 border border-[#5c3a1e]/30" />
      ) : null}
    </div>
  );
}

function ObsGrid({ data }: { data: BaselineForecast }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Relative humidity', value: fmtScalar(data.relativeHumidity, '%') },
    { label: 'Visibility', value: fmtScalar(data.visibility, ' mi') },
    { label: 'Dewpoint', value: fmtScalar(data.dewpoint, '°F') },
    { label: 'Sky cover', value: fmtScalar(data.skyCover, '%') },
    { label: 'PoP (current hour)', value: fmtScalar(data.precipitation, '%') },
    { label: 'QPF (grid now)', value: qpfLabel(data.quantitativePrecipitation) },
    { label: 'Thunder probability', value: fmtScalar(data.probabilityOfThunderstorm, '%') },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="border border-[#5c3a1e]/20 px-2 py-1 text-xs">
          <span className="font-bold uppercase text-gray-700">{row.label}</span>
          <span className="ml-2 tabular-nums">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function qpfLabel(inches: number | null | undefined): string {
  if (inches === null || inches === undefined || !Number.isFinite(inches)) return '—';
  return `${inches.toFixed(2)} in`;
}

function GridExtrasBlock({ data }: { data: BaselineForecast }) {
  const g = data.gridExtras;
  if (!g) return null;
  return (
    <CollapsibleSection title="Grid time series" subtitle="NWS gridpoint samples" defaultOpen={false}>
      <div className="space-y-2 text-xs">
        <SeriesRow title="Dewpoint (°F)" samples={g.dewpoint} />
        <SeriesRow title="Sky cover (%)" samples={g.skyCover} />
        <SeriesRow title="QPF (in)" samples={g.quantitativePrecipitation} format={(v) => (v !== null ? v.toFixed(2) : '—')} />
        <SeriesRow title="Thunder probability (%)" samples={g.probabilityOfThunderstorm} />
        <SeriesRow title="Snow level (ft)" samples={g.snowLevel} />
        <SeriesRow title="Snowfall (in)" samples={g.snowfallAmount} />
        <SeriesRow title="Ice (in)" samples={g.iceAccumulation} />
        <SeriesRow title="Ceiling (ft)" samples={g.ceilingHeight} />
      </div>
    </CollapsibleSection>
  );
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
  const fmt = format ?? ((v: number | null) => (v !== null ? String(v) : '—'));
  return (
    <div>
      <p className="font-bold">{title}</p>
      <ul className="mt-1 flex gap-1 overflow-x-auto">
        {samples.map((s) => (
          <li key={`${title}-${s.label}`} className="shrink-0 rounded border border-[#5c3a1e]/25 px-2 py-1">
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
    <CollapsibleSection title="Hourly forecast" subtitle={`${periods.length} periods from NWS`} defaultOpen>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-[#5c3a1e]/30 text-xs">
          <thead className="bg-white/70">
            <tr className="text-left uppercase tracking-wide">
              <th className="px-2 py-1">Time</th>
              <th className="px-2 py-1">Temp</th>
              <th className="px-2 py-1">Wind</th>
              <th className="px-2 py-1">Gust</th>
              <th className="px-2 py-1">PoP</th>
              <th className="px-2 py-1">Forecast</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.startTime} className="border-t border-[#5c3a1e]/15">
                <td className="whitespace-nowrap px-2 py-1 font-bold">{formatEt(p.startTime)}</td>
                <td className="px-2 py-1 tabular-nums">{p.temperature}°</td>
                <td className="px-2 py-1">
                  {[p.windDirection, p.windSpeed].filter(Boolean).join(' ') || '—'}
                </td>
                <td className="px-2 py-1">{p.windGust ?? '—'}</td>
                <td className="px-2 py-1 tabular-nums">
                  {p.precipChance !== null && p.precipChance !== undefined ? `${p.precipChance}%` : '—'}
                </td>
                <td className="px-2 py-1">{p.shortForecast ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsibleSection>
  );
}

function PeriodNarratives({ periods }: { periods: ForecastSnippet[] }) {
  return (
    <CollapsibleSection title="7-day periods" subtitle="NWS detailed text" defaultOpen={false}>
      <ul className="space-y-2 text-xs">
        {periods.map((p) => (
          <li key={`${p.name}-${p.startTime}`} className="border-b border-[#5c3a1e]/15 pb-2">
            <p className="font-bold">
              {p.name}
              <span className="ml-2 font-normal tabular-nums text-gray-700">
                {p.temperature}°{p.isDaytime === false ? ' (night)' : ''}
              </span>
            </p>
            {p.shortForecast ? <p className="text-gray-800">{p.shortForecast}</p> : null}
            {p.detailedForecast ? (
              <details className="mt-1">
                <summary className="cursor-pointer font-bold">Detailed forecast</summary>
                <p className="mt-1 whitespace-pre-wrap text-gray-900">{p.detailedForecast}</p>
              </details>
            ) : null}
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  );
}

function DailyList({ periods }: { periods: NonNullable<BaselineForecast['dailyForecast']> }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase">7-day highs / lows</p>
      <ul className="mt-1 space-y-1 text-xs">
        {periods.map((p) => (
          <li key={p.startTime} className="flex justify-between gap-2 border-b border-[#5c3a1e]/15 py-1">
            <span className="font-bold">{p.name}</span>
            <span className="tabular-nums">{p.temperature}°{p.secondaryTemp !== undefined ? ` / ${p.secondaryTemp}°` : ''}</span>
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
