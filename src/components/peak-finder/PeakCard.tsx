'use client';

import { formatDirection, formatFeet, formatMiles } from '@/lib/peak-finder/format';
import type { VisiblePeak } from '@/lib/peak-finder/visibility';

export function PeakCard({
  peak,
  dock,
  anchor,
  onClose,
}: {
  peak: VisiblePeak;
  dock: 'bottom' | 'float';
  anchor: { x: number; y: number } | null;
  onClose: () => void;
}) {
  const style = dock === 'float' && anchor
    ? {
      left: `clamp(7rem, ${anchor.x}px, calc(100% - 7rem))`,
      top: `clamp(0.5rem, ${anchor.y + 12}px, calc(100% - 8rem))`,
    }
    : undefined;
  return (
    <div
      role="dialog"
      aria-label={peak.name}
      className={
        dock === 'bottom'
          ? 'pointer-events-auto absolute inset-x-2 bottom-28 z-30 retro-box bg-white p-3 text-[#1a1a1a]'
          : 'pointer-events-auto absolute z-30 w-56 -translate-x-1/2 retro-box bg-white p-3 text-[#1a1a1a]'
      }
      style={style}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold text-[#2d5016]">{peak.name}</h2>
          <p className="mt-1 text-sm font-bold">
            {formatFeet(peak.elevationM)} · {formatMiles(peak.distanceM)} · {formatDirection(peak.bearingDeg)}
          </p>
        </div>
        <button type="button" onClick={onClose} className="retro-button min-h-11 shrink-0 px-3 text-xs">
          Close
        </button>
      </div>
    </div>
  );
}
