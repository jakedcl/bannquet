import Image from 'next/image';
import Link from 'next/link';
import { Tag } from '@/components/hub/Button';
import type { HubGlance } from '@/lib/mountain-weather/hub-glance';

function degrees(high: number | null, low: number | null): string {
  if (high == null && low == null) return '—';
  const hi = high == null ? '—' : `${Math.round(high)}°`;
  const lo = low == null ? '—' : `${Math.round(low)}°`;
  return `${hi} / ${lo}`;
}

export function WeatherGlanceRow({ glance }: { glance: HubGlance & { id?: string } }) {
  const extras = [
    glance.precip == null ? null : `${Math.round(glance.precip)}% chance of precip`,
    glance.wind ?? null,
  ].filter(Boolean).join(' · ');
  return (
    <li>
      <Link href={glance.href} className="ui-row-press flex min-h-16 min-w-0 items-center gap-3 px-3.5 py-2.5 no-underline">
        {glance.icon ? (
          <Image src={glance.icon} alt="" width={36} height={36} unoptimized className="h-9 w-9 shrink-0 rounded-tag object-cover squircle" />
        ) : (
          <span className="h-9 w-9 shrink-0 rounded-tag bg-surface-gray" aria-hidden="true" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-meta font-bold uppercase text-ink [overflow-wrap:anywhere]">{glance.title}</span>
          <span className="block text-caption text-ink-2 [overflow-wrap:anywhere]">{glance.phrase}</span>
          {glance.representativeNote ? (
            <span className="block text-caption text-ink-3">{glance.representativeNote}</span>
          ) : null}
          {extras || glance.windowLabel ? (
            <span className="block text-caption text-ink-3 [overflow-wrap:anywhere]">
              {[extras, glance.windowLabel].filter(Boolean).join(' · ')}
            </span>
          ) : null}
          {glance.alert ? <Tag kind="warn" className="mt-1">{glance.alert}</Tag> : null}
        </span>
        <span className="shrink-0 self-start pt-0.5 text-right">
          <span className="block text-heading font-bold tabular-nums text-ink">{degrees(glance.high, glance.low)}</span>
          {glance.high != null || glance.low != null ? (
            <span className="block text-caption text-ink-3">high / low</span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}

export function WeatherGlanceList({ items }: { items: Array<HubGlance & { id?: string }> }) {
  if (items.length === 0) return <p className="p-3.5 text-meta text-ink-2">No places to show.</p>;
  return (
    <ul className="ui-list">
      {items.map((item, index) => (
        <WeatherGlanceRow key={item.id ?? `${item.href}-${index}`} glance={item} />
      ))}
    </ul>
  );
}
