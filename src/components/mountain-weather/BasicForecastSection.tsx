import Image from 'next/image';
import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import type { BaselineForecast } from '@/lib/mountain-weather/baseline-forecast';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
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
      subtitle={`${NWS_GRID_BASELINE_DEF.org} grid at ${gridElev !== null && gridElev !== undefined ? `${gridElev.toLocaleString('en-US')} ft` : 'unknown elevation'}${placeElevationFt !== null ? ` · place ${placeElevationFt.toLocaleString('en-US')} ft` : ''}${freshness}`}
    >
      <div className="space-y-3 text-sm">
        <NowPanel data={data} placeName={placeName} />
        <GridExtrasBlock data={data} />
        {data.hourlyForecast && data.hourlyForecast.length > 0 ? (
          <HourlyStrip periods={data.hourlyForecast.slice(0, 8)} />
        ) : null}
        {data.dailyForecast && data.dailyForecast.length > 0 ? (
          <DailyList periods={data.dailyForecast.slice(0, 7)} />
        ) : null}
        <p className="text-xs text-gray-700">
          Issued {formatEt(result.issuedAt ?? data.timestamp)} · checked at render ·{' '}
          <a href={data.mapUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            NWS MapClick
          </a>
        </p>
      </div>
    </CollapsibleSection>
  );
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
      <div className="text-right">
        <p className="text-xs font-bold uppercase text-gray-700">Feels like</p>
        <p className="text-xl font-bold tabular-nums">
          {data.feelsLike !== null ? `${Math.round(data.feelsLike)}°F` : '—'}
        </p>
        <p className="text-xs text-gray-700">
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

function GridExtrasBlock({ data }: { data: BaselineForecast }) {
  const g = data.gridExtras;
  if (!g) return null;
  const precip = data.precipitation !== null ? `${data.precipitation}%` : '—';
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase">Grid extras</p>
      <p>Precip chance now: <strong>{precip}</strong></p>
      <SeriesRow title="Snow level (ft)" samples={g.snowLevel} />
      <SeriesRow title="Snowfall (in)" samples={g.snowfallAmount} />
      <SeriesRow title="Ice (in)" samples={g.iceAccumulation} />
      <SeriesRow title="Ceiling (ft)" samples={g.ceilingHeight} />
    </div>
  );
}

function SeriesRow({ title, samples }: { title: string; samples: { label: string; value: number | null }[] }) {
  if (samples.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-bold">{title}</p>
      <ul className="mt-1 flex gap-1 overflow-x-auto text-xs">
        {samples.map((s) => (
          <li key={`${title}-${s.label}`} className="shrink-0 rounded border border-[#5c3a1e]/25 px-2 py-1">
            <span className="block font-bold">{s.label}</span>
            <span className="tabular-nums">{s.value !== null ? s.value : '—'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HourlyStrip({ periods }: { periods: NonNullable<BaselineForecast['hourlyForecast']> }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase">Next hours</p>
      <ul className="mt-1 flex gap-1 overflow-x-auto text-xs">
        {periods.map((p) => (
          <li key={p.startTime} className="shrink-0 rounded border border-[#5c3a1e]/25 px-2 py-1 text-center">
            <p className="font-bold">{new Date(p.startTime).toLocaleTimeString([], { hour: 'numeric' })}</p>
            <p className="text-base font-bold tabular-nums">{p.temperature}°</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DailyList({ periods }: { periods: NonNullable<BaselineForecast['dailyForecast']> }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase">7-day</p>
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
  return d.toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
