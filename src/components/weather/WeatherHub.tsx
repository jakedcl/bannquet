import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/hub/Card';
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
      <Link href={region.href} className="ui-row-press flex min-w-0 items-center gap-3 px-3 py-2 no-underline">
        {region.icon ? (
          <Image src={region.icon} alt="" width={36} height={36} unoptimized className="h-8 w-8 shrink-0 border border-ui-separator object-cover" />
        ) : (
          <span className="h-8 w-8 shrink-0 bg-ui-fill" aria-hidden="true" />
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
        <Card
          key={state.code}
          title={state.name}
          titleHref={state.href}
          action={<Link href={state.href} className="text-[0.6875rem] text-[#ffd700] no-underline">Forecasts ›</Link>}
          padded={false}
        >
          {state.regions.length === 0 ? (
            <p className="t-subhead p-3 text-ui-label-2">No regions.</p>
          ) : (
            <ul className="ui-list">
              {state.regions.map((region) => (
                <RegionRow key={region.id} region={region} />
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
