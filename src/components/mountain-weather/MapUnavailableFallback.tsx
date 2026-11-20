import Link from 'next/link';
import type { PlaceMapPin } from '@/lib/mountain-weather/map-types';

export function MapUnavailableFallback({
  pins,
  className,
}: {
  pins?: PlaceMapPin[];
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-2 border border-hairline bg-surface-cream px-3 py-2 text-sm text-ink">
        This browser cannot start the interactive map (WebGL2 is unavailable). Forecasts and other
        sections below are still available.
      </p>
      {pins && pins.length > 0 ? (
        <ul className="max-h-48 overflow-y-auto border border-hairline bg-white text-sm">
          {pins.map((pin) => (
            <li key={pin.placeId} className="border-b border-hairline px-3 py-1.5 last:border-0">
              <Link href={pin.href} className="font-bold underline">
                {pin.title}
              </Link>
              {pin.phrase ? <span className="text-ink-2"> — {pin.phrase}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}