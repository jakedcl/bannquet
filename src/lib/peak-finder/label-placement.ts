import { DESKTOP_LABEL_CAP, PHONE_LABEL_CAP } from './constants';
import { declutter as declutterByDistance, labelCap, labelCorners, type LabelCandidate } from './declutter';
import { projectDirection } from './projection';
import {
  labelCapForView,
  labelFontSizePx,
  labelWidthPx,
  peakImportanceScore,
} from './label-ranking';
import type { VisiblePeak } from './visibility';

export type ProjectedPeak = VisiblePeak & {
  x: number;
  y: number;
  inView: boolean;
  labelWidthPx: number;
  fontSizePx: number;
};

export type LabelPlacement = {
  labels: LabelCandidate[];
  markers: ProjectedPeak[];
};

function boxesOverlap(a: ReturnType<typeof labelCorners>, b: ReturnType<typeof labelCorners>): boolean {
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

const SLIDE_STEP_PX = 10;
const SLIDE_MAX_PX = 120;

function placeGreedy(
  candidates: readonly LabelCandidate[],
  cap: number,
  allowSlideFor: ReadonlySet<string>,
): LabelCandidate[] {
  const sorted = [...candidates].sort(
    (a, b) => peakImportanceScore(b) - peakImportanceScore(a) || a.distanceM - b.distanceM,
  );
  const placed: LabelCandidate[] = [];
  const boxes: ReturnType<typeof labelCorners>[] = [];
  for (const peak of sorted) {
    if (placed.length >= cap) break;
    const maxSlide = allowSlideFor.has(peak.name) ? SLIDE_MAX_PX : 0;
    let chosen: LabelCandidate | null = null;
    let box: ReturnType<typeof labelCorners> = [];
    for (let slide = 0; slide <= maxSlide; slide += SLIDE_STEP_PX) {
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

export function placeLabels(
  peaks: readonly VisiblePeak[],
  pose: { heading: number; pitch: number; roll: number; hfov: number },
  width: number,
  height: number,
  reserveNames: readonly string[] = [],
): LabelPlacement {
  if (width < 2 || height < 2) return { labels: [], markers: [] };
  const markers: ProjectedPeak[] = [];
  const candidates: LabelCandidate[] = [];
  for (const peak of peaks) {
    const point = projectDirection(
      peak.bearingDeg,
      peak.angleDeg,
      pose.heading,
      pose.pitch,
      pose.roll,
      pose.hfov,
      width,
      height,
    );
    if (!point.inView) continue;
    const fontSizePx = labelFontSizePx(peak.distanceM);
    const projected: ProjectedPeak = {
      ...peak,
      x: point.x,
      y: point.y,
      inView: true,
      fontSizePx,
      labelWidthPx: labelWidthPx(peak.name, fontSizePx),
    };
    markers.push(projected);
    candidates.push({
      ...projected,
      slidePx: 0,
    });
  }
  const cap = labelCapForView(width, pose.hfov, PHONE_LABEL_CAP, DESKTOP_LABEL_CAP);
  const reserve = new Set(reserveNames);
  const near = [...markers].sort((a, b) => a.distanceM - b.distanceM).slice(0, 3).map((p) => p.name);
  for (const name of near) reserve.add(name);
  const labels = placeGreedy(candidates, cap, reserve);
  return { labels, markers };
}

/** @deprecated use placeLabels — kept for tests comparing cap helper. */
export function labelsInView(
  peaks: readonly VisiblePeak[],
  pose: { heading: number; pitch: number; roll: number; hfov: number },
  width: number,
  height: number,
  reserveNames: readonly string[] = [],
): LabelCandidate[] {
  return placeLabels(peaks, pose, width, height, reserveNames).labels;
}

/** Previous distance-sorted placement (for before/after integration checks). */
export function legacyLabelsInView(
  peaks: readonly VisiblePeak[],
  pose: { heading: number; pitch: number; roll: number; hfov: number },
  width: number,
  height: number,
): LabelCandidate[] {
  if (width < 2 || height < 2) return [];
  const candidates: LabelCandidate[] = [];
  for (const peak of peaks) {
    const point = projectDirection(
      peak.bearingDeg,
      peak.angleDeg,
      pose.heading,
      pose.pitch,
      pose.roll,
      pose.hfov,
      width,
      height,
    );
    if (!point.inView) continue;
    candidates.push({
      ...peak,
      x: point.x,
      y: point.y,
      labelWidthPx: Math.max(44, peak.name.length * 7.4 + 6),
      slidePx: 0,
    });
  }
  return declutterByDistance(candidates, labelCap(width));
}

/** Exported for unit tests. */
export function placeGreedyForTests(
  candidates: readonly LabelCandidate[],
  cap: number,
  allowSlideFor: ReadonlySet<string> = new Set(),
): LabelCandidate[] {
  return placeGreedy(candidates, cap, allowSlideFor);
}
