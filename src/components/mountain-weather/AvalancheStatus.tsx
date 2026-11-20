import Link from 'next/link';
import { ChevronIcon } from '@/components/hub/Icons';
import { DangerBox, DANGER_NAMES } from '@/components/mountain-weather/kit';
import type { PlaceAvalancheData } from '@/lib/mountain-weather/read-place-avalanche';

/**
 * Avalanche center status for a place, one row per center, linking to the
 * full guidance on the Snow tab. Shown under the alerts on every tab while a forecast is issued.
 */
export function AvalancheStatus({
  data,
  snowHref,
  onlyIssued = false,
}: {
  data: PlaceAvalancheData | null;
  snowHref: string;
  /** Hide centers with no issued forecast (off-season); the Snow tab panel still says so. */
  onlyIssued?: boolean;
}) {
  if (!data) return null;
  const centers = data.centers.filter(
    (center) => center.data && (!onlyIssued || (center.status === 'ok' && !center.data.offSeason)),
  );
  if (!centers.length) return null;
  return (
    <section aria-label="Avalanche center status" className="space-y-2">
      {centers.map((center) => {
        const product = center.data!;
        const active = center.status === 'ok' && !product.offSeason;
        const level = active ? product.dangerLevel : null;
        const color = active ? product.dangerBands.find((band) => band.dangerLevel === product.dangerLevel)?.color ?? null : null;
        const label = active
          ? product.dangerLabel || (level ? DANGER_NAMES[level] : 'Active forecast')
          : 'No current forecast';
        return (
          <Link key={product.centerId} href={snowHref} className="panel flex items-center gap-3 px-3.5 py-2.5 no-underline">
            <DangerBox level={level && level > 0 ? level : null} color={color} />
            <span className="min-w-0 flex-1">
              <span className="block font-heading text-meta font-bold uppercase [overflow-wrap:anywhere]">Avalanche: {label}</span>
              <span className="block text-caption text-ink-2">
                {product.centerId}
                {product.zoneName ? ` · ${product.zoneName}` : ''}
                {active && product.expiresTime
                  ? ` · until ${new Date(product.expiresTime).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric' })}`
                  : ''}
              </span>
              {!active ? <span className="block text-caption text-ink-2">No issued forecast does not mean low danger.</span> : null}
            </span>
            <ChevronIcon className="h-3 w-2 shrink-0 text-brown-light" />
          </Link>
        );
      })}
    </section>
  );
}
