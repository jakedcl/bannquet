import Image from 'next/image';
import Link from 'next/link';
import { Pill } from '@/components/hub/Button';
import type { HubGlance } from '@/lib/mountain-weather/hub-glance';

function degrees(high: number | null, low: number | null): string {
  if (high == null && low == null) return '—';
  const hi = high == null ? '—' : `${Math.round(high)}°`;
  const lo = low == null ? '—' : `${Math.round(low)}°`;
  return `${hi} / ${lo}`;
}

export function WeatherGlanceRow({ glance }: { glance: HubGlance & { id?: string } }) {
  const extras = [
    glance.precip == null ? null : `${Math.round(glance.precip)}% precip`,
    glance.wind ?? null,
  ].filter(Boolean).join(' · ');
  return (
    <li>
      <Link href={glance.href} className="ui-row-press flex min-w-0 items-center gap-3 px-3 py-2 no-underline">
        {glance.icon ? (
          <Image src={glance.icon} alt="" width={36} height={36} unoptimized className="h-8 w-8 shrink-0 border border-ui-separator object-cover" />
        ) : (
          <span className="h-8 w-8 shrink-0 bg-ui-fill" aria-hidden="true" />
        )}
        <span className="min-w-0 flex-1">
          <span className="t-headline block truncate text-ui-label">{glance.title}</span>
          <span className="t-footnote block break-words text-ui-label-2 sm:truncate">{glance.phrase}</span>
          {glance.alert ? <Pill tone="warn" className="mt-1">{glance.alert}</Pill> : null}
        </span>
        <span className="shrink-0 text-right">
          <span className="t-headline block tabular-nums text-ui-label">{degrees(glance.high, glance.low)}</span>
          {extras ? <span className="t-caption block text-ui-label-2">{extras}</span> : null}
        </span>
      </Link>
    </li>
  );
}

export function WeatherGlanceList({ items }: { items: Array<HubGlance & { id?: string }> }) {
  if (items.length === 0) return <p className="t-subhead p-3 text-ui-label-2">Nothing to show.</p>;
  return (
    <ul className="ui-list">
      {items.map((item, index) => (
        <WeatherGlanceRow key={item.id ?? `${item.href}-${index}`} glance={item} />
      ))}
    </ul>
  );
}
