import Image from 'next/image';
import Link from 'next/link';
import { ChevronIcon } from '@/components/hub/Icons';
import { Pill } from '@/components/hub/Button';
import type { RegionGlance, StateGlance } from '@/lib/weather-hub';

function degrees(high: number | null, low: number | null): string {
  if (high == null && low == null) return '—';
  const hi = high == null ? '—' : `${Math.round(high)}°`;
  const lo = low == null ? '—' : `${Math.round(low)}°`;
  return `${hi} / ${lo}`;
}

function RegionRow({ region }: { region: RegionGlance }) {
  const extras = [
    region.precip == null ? null : `${Math.round(region.precip)}% precip`,
    region.wind ?? null,
  ].filter(Boolean).join(' · ');
  return (
    <li>
      <Link href={region.href} className="ui-row-press flex min-w-0 items-center gap-3 px-4 py-3 no-underline">
        {region.icon ? (
          <Image src={region.icon} alt="" width={36} height={36} unoptimized className="h-9 w-9 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="h-9 w-9 shrink-0 rounded-lg bg-ui-fill" aria-hidden="true" />
        )}
        <span className="min-w-0 flex-1">
          <span className="t-headline block truncate text-ui-label">{region.title}</span>
          <span className="t-footnote block truncate text-ui-label-2">{region.phrase}</span>
          {region.alert ? <Pill tone="warn" className="mt-1">{region.alert}</Pill> : null}
        </span>
        <span className="shrink-0 text-right">
          <span className="t-headline block tabular-nums text-ui-label">{degrees(region.high, region.low)}</span>
          {extras ? <span className="t-caption block text-ui-label-2">{extras}</span> : null}
        </span>
      </Link>
    </li>
  );
}

export function WeatherHub({ states }: { states: StateGlance[] }) {
  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      {states.map((state) => (
        <section key={state.code} aria-labelledby={`state-${state.code}`} className="ui-card min-w-0 overflow-hidden">
          <Link href={state.href} className="ui-row-press flex items-center justify-between gap-3 px-4 pb-2 pt-4 no-underline">
            <h2 id={`state-${state.code}`} className="t-title3 text-ui-label">{state.name}</h2>
            <span className="t-subhead inline-flex items-center gap-1 text-ui-accent">
              Forecasts
              <ChevronIcon className="h-3 w-2" />
            </span>
          </Link>
          {state.regions.length === 0 ? (
            <p className="t-subhead px-4 pb-4 text-ui-label-2">No regions.</p>
          ) : (
            <ul className="ui-list pb-1" style={{ ['--row-inset' as string]: '4.25rem' }}>
              {state.regions.map((region) => (
                <RegionRow key={region.id} region={region} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
