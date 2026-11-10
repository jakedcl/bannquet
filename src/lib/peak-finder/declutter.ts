import { DESKTOP_LABEL_CAP, LABEL_MIN_GAP_PX, PHONE_LABEL_CAP } from './constants';
import type { VisiblePeak } from './visibility';

export type LabelCandidate = VisiblePeak & {
  x: number;
  y: number;
  labelWidthPx: number;
};

export function labelCap(widthPx: number): number {
  return widthPx >= 1024 ? DESKTOP_LABEL_CAP : PHONE_LABEL_CAP;
}

/**
 * Keep labels at least one label-width apart. When two would overlap, the one
 * that sits higher above the horizon stays. Never more than `cap`.
 */
export function declutter(peaks: readonly LabelCandidate[], cap: number, minGapPx = LABEL_MIN_GAP_PX): LabelCandidate[] {
  const sorted = [...peaks].sort((a, b) => b.angleDeg - a.angleDeg || a.distanceM - b.distanceM);
  const placed: LabelCandidate[] = [];
  for (const peak of sorted) {
    if (placed.length >= cap) break;
    const gap = Math.max(minGapPx, peak.labelWidthPx);
    const crowded = placed.some((other) => {
      const need = Math.max(gap, other.labelWidthPx);
      return Math.abs(other.x - peak.x) < need;
    });
    if (!crowded) placed.push(peak);
  }
  return placed;
}
