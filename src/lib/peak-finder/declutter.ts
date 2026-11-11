import { DESKTOP_LABEL_CAP, PHONE_LABEL_CAP } from './constants';
import { projectDirection } from './projection';
import type { VisiblePeak } from './visibility';

export type LabelCandidate = VisiblePeak & {
  x: number;
  y: number;
  labelWidthPx: number;
  /** Extra distance, in px, the name is stepped up-right so it clears a nearer label. */
  slidePx: number;
};

/** Leader from the summit up to where the diagonal name starts. */
export const LABEL_TICK_PX = 12;
/** Height of the name before it is tilted. Matches the 13px line on screen. */
export const LABEL_BOX_HEIGHT_PX = 16;

type Point = { x: number; y: number };

export function labelCap(widthPx: number): number {
  return widthPx >= 640 ? DESKTOP_LABEL_CAP : PHONE_LABEL_CAP;
}

/**
 * Corners of the name after it is tilted 45° up and to the right.
 * The box is anchored at the top of the leader tick.
 */
const SLIDE_STEP_PX = 10;
const SLIDE_MAX_PX = 240;

export function labelCorners(peak: LabelCandidate): Point[] {
  const slide = peak.slidePx || 0;
  const anchorX = peak.x + slide * Math.SQRT1_2;
  const anchorY = peak.y - LABEL_TICK_PX - slide * Math.SQRT1_2;
  const length = peak.labelWidthPx;
  const height = LABEL_BOX_HEIGHT_PX;
  const local = [
    { x: 0, y: 0 },
    { x: length, y: 0 },
    { x: length, y: -height },
    { x: 0, y: -height },
  ];
  const cos = Math.SQRT1_2;
  const sin = -Math.SQRT1_2;
  return local.map((point) => ({
    x: anchorX + point.x * cos - point.y * sin,
    y: anchorY + point.x * sin + point.y * cos,
  }));
}

function boxesOverlap(a: readonly Point[], b: readonly Point[]): boolean {
  const polys = [a, b];
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i += 1) {
      const next = poly[(i + 1) % poly.length];
      const axisX = -(next.y - poly[i].y);
      const axisY = next.x - poly[i].x;
      let minA = Infinity;
      let maxA = -Infinity;
      let minB = Infinity;
      let maxB = -Infinity;
      for (const point of a) {
        const dot = point.x * axisX + point.y * axisY;
        if (dot < minA) minA = dot;
        if (dot > maxA) maxA = dot;
      }
      for (const point of b) {
        const dot = point.x * axisX + point.y * axisY;
        if (dot < minB) minB = dot;
        if (dot > maxB) maxB = dot;
      }
      if (maxA <= minB + 2 || maxB <= minA + 2) return false;
    }
  }
  return true;
}

/**
 * Drop a label only when its tilted box covers one already kept.
 * Nearer peaks are placed first, so a front ridge keeps its name when a
 * farther summit sits behind it. Never more than `cap`.
 */
export function declutter(peaks: readonly LabelCandidate[], cap: number): LabelCandidate[] {
  const sorted = [...peaks].sort((a, b) => a.distanceM - b.distanceM || b.angleDeg - a.angleDeg);
  const placed: LabelCandidate[] = [];
  const boxes: Point[][] = [];
  for (const peak of sorted) {
    if (placed.length >= cap) break;
    let chosen: LabelCandidate | null = null;
    let box: Point[] = [];
    for (let slide = 0; slide <= SLIDE_MAX_PX; slide += SLIDE_STEP_PX) {
      const candidate = { ...peak, slidePx: slide };
      box = labelCorners(candidate);
      if (!boxes.some((other) => boxesOverlap(box, other))) {
        chosen = candidate;
        break;
      }
    }
    if (!chosen) continue;
    placed.push(chosen);
    boxes.push(box);
  }
  return placed;
}

export function labelsInView(
  peaks: readonly VisiblePeak[],
  pose: { heading: number; pitch: number; roll: number; hfov: number },
  width: number,
  height: number,
): LabelCandidate[] {
  if (width < 2 || height < 2) return [];
  const candidates: LabelCandidate[] = [];
  for (const peak of peaks) {
    const point = projectDirection(peak.bearingDeg, peak.angleDeg, pose.heading, pose.pitch, pose.roll, pose.hfov, width, height);
    if (!point.inView) continue;
    candidates.push({
      ...peak,
      x: point.x,
      y: point.y,
      labelWidthPx: Math.max(44, peak.name.length * 7.4 + 6),
      slidePx: 0,
    });
  }
  return declutter(candidates, labelCap(width));
}
