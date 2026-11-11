import { DEFAULT_HFOV_DEG } from './constants';
import type { VisiblePeak } from './visibility';

/**
 * Higher = more deserving of a on-screen name.
 * Uses skyline prominence (cheap proxy for topo prominence), nearness, and elevation.
 */
export function peakImportanceScore(peak: VisiblePeak): number {
  const prominence = Math.max(0, peak.prominenceDeg);
  const near = 1 / (1 + peak.distanceM / 30_000);
  const elev = Math.min(1.2, peak.elevationM / 1_600);
  return prominence * 6 + near * 2.2 + elev * 0.8;
}

/** Pinch zoom in (narrower FOV) allows more labels; wide view stays sparse. */
export function labelCapForView(widthPx: number, hfovDeg: number, phoneCap: number, desktopCap: number): number {
  const base = widthPx >= 640 ? desktopCap : phoneCap;
  const zoom = Math.min(2.4, Math.max(0.45, DEFAULT_HFOV_DEG / Math.max(12, hfovDeg)));
  return Math.max(4, Math.round(base * zoom));
}

export function labelFontSizePx(distanceM: number): number {
  const t = Math.min(1, Math.max(0, (90_000 - distanceM) / 85_000));
  return Math.round(10 + t * 4);
}

export function labelFontWeight(distanceM: number): number {
  return distanceM < 25_000 ? 700 : distanceM < 55_000 ? 650 : 600;
}

export function labelOpacity(distanceM: number): number {
  const t = Math.min(1, Math.max(0, (100_000 - distanceM) / 95_000));
  return 0.68 + t * 0.32;
}

export function labelWidthPx(name: string, fontSizePx: number): number {
  return Math.max(36, name.length * (fontSizePx * 0.56) + 8);
}
