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
      <p className="mb-2 border border-[#5c3a1e]/40 bg-beige/90 px-3 py-2 text-sm text-gray-800">
        This browser cannot start the interactive map (WebGL2 is unavailable). Forecasts and other
        sections below are still available.
      </p>
      {pins && pins.length > 0 ? (
        <ul className="max-h-48 overflow-y-auto border border-[#5c3a1e]/30 bg-white text-sm">
          {pins.map((pin) => (
            <li key={pin.placeId} className="border-b border-[#5c3a1e]/15 px-3 py-1.5 last:border-0">
              <Link href={pin.href} className="font-bold underline">
                {pin.title}
              </Link>
              {pin.phrase ? <span className="text-gray-700"> — {pin.phrase}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}