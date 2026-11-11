import { angleBefore, angleBeyond, rayAt, type HeightAt, type Skyline } from './skyline';
import { apparentElevationDeg, bearingDeg, curvatureDropM, distanceM } from './geo';
import { CLOSE_ALWAYS_M, MAX_DISTANCE_M, MIN_PROMINENCE_DEG, VISIBLE_TOLERANCE_DEG } from './constants';
import type { Peak } from './peaks';

/** Highest ground within this radius stands in for a summit dot that missed the high point. */
export const SUMMIT_SNAP_M = 130;
const SUMMIT_SNAP_STEP_M = 32;
/** Terrain this close to the summit is the peak itself, not a ridge in front of it. */
export const SUMMIT_SELF_M = 300;
/**
 * The true cairn can sit this far behind a ridge and the peak still counts.
 * That is the top of the mountain, about 30–50 m, plus a little tile noise.
 */
export const SUMMIT_SLACK_M = 58;
/** About 0.2 miles. Inside this, the observer is on the peak. */
export const ON_SUMMIT_M = 322;
export const EYE_CLEARANCE_M = 2;
export const EYE_SNAP_M = 10;

const LAT_M = 110_574;

export function offsetPoint(lat: number, lng: number, northM: number, eastM: number): { lat: number; lng: number } {
  const lat2 = lat + northM / LAT_M;
  const lng2 = lng + eastM / (111_320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return { lat: lat2, lng: lng2 };
}

/** Eye height: the highest ground within a few meters, plus about 2 m. */
export function eyeHeightM(lat: number, lng: number, sample: (lat: number, lng: number) => number | null): number {
  let best = sample(lat, lng) ?? 0;
  for (const north of [-EYE_SNAP_M, 0, EYE_SNAP_M]) {
    for (const east of [-EYE_SNAP_M, 0, EYE_SNAP_M]) {
      if (north === 0 && east === 0) continue;
      const point = offsetPoint(lat, lng, north, east);
      const height = sample(point.lat, point.lng);
      if (height != null && height > best) best = height;
    }
  }
  return best + EYE_CLEARANCE_M;
}

/**
 * Move a summit dot onto the highest terrain within about 130 m, and keep
 * whichever is higher of that sample and the stored elevation.
 */
export function raiseSummit<T extends Peak>(
  peak: T,
  sample: (lat: number, lng: number) => number | null,
): (T & { elevationM: number }) | null {
  let bestLat = peak.lat;
  let bestLng = peak.lng;
  let bestTerrain = sample(peak.lat, peak.lng);
  for (let north = -SUMMIT_SNAP_M; north <= SUMMIT_SNAP_M; north += SUMMIT_SNAP_STEP_M) {
    for (let east = -SUMMIT_SNAP_M; east <= SUMMIT_SNAP_M; east += SUMMIT_SNAP_STEP_M) {
      if (north * north + east * east > SUMMIT_SNAP_M * SUMMIT_SNAP_M) continue;
      const point = offsetPoint(peak.lat, peak.lng, north, east);
      const height = sample(point.lat, point.lng);
      if (height == null) continue;
      if (bestTerrain == null || height > bestTerrain) {
        bestTerrain = height;
        bestLat = point.lat;
        bestLng = point.lng;
      }
    }
  }
  const stored = peak.elevationM;
  const elevationM = stored == null
    ? bestTerrain
    : bestTerrain == null
      ? stored
      : Math.max(stored, bestTerrain);
  if (elevationM == null || !Number.isFinite(elevationM)) return null;
  return { ...peak, lat: bestLat, lng: bestLng, elevationM };
}

/** Nearest named peak within about 0.2 miles, using the stored summit dot. */
export function peakUnderfoot(
  lat: number,
  lng: number,
  peaks: readonly Peak[],
): (Peak & { elevationM: number }) | null {
  let best: (Peak & { elevationM: number }) | null = null;
  let bestDistance = ON_SUMMIT_M;
  for (const peak of peaks) {
    if (peak.elevationM == null || !Number.isFinite(peak.elevationM)) continue;
    const metres = distanceM(lat, lng, peak.lat, peak.lng);
    if (metres <= bestDistance) {
      best = { ...peak, elevationM: peak.elevationM };
      bestDistance = metres;
    }
  }
  return best;
}

/**
 * True when the upper part of the mountain clears ridges in front of it.
 * A taller peak behind it does not hide it. A ridge that buries more than the
 * top ~50 m does.
 */
/** How many meters of the summit sit behind the ridge in front. Negative means the summit clears. */
export function burialM(
  occluderAngleDeg: number,
  distance: number,
  eyeM: number,
  peakElevM: number,
): number {
  if (occluderAngleDeg < -80) return -peakElevM;
  const ridgeAtPeak = eyeM + curvatureDropM(distance) + Math.tan((occluderAngleDeg * Math.PI) / 180) * distance;
  return ridgeAtPeak - peakElevM;
}

export function summitInView(
  peakAngleDeg: number,
  occluderAngleDeg: number,
  distance: number,
  eyeM: number,
  peakElevM: number,
): boolean {
  if (peakAngleDeg >= occluderAngleDeg) return true;
  return burialM(occluderAngleDeg, distance, eyeM, peakElevM) <= SUMMIT_SLACK_M;
}

export type VisiblePeak = Peak & {
  elevationM: number;
  distanceM: number;
  bearingDeg: number;
  angleDeg: number;
  prominenceDeg: number;
};

export function clearsSkyline(peakAngleDeg: number, skylineDeg: number, tolerance = VISIBLE_TOLERANCE_DEG): boolean {
  return peakAngleDeg >= skylineDeg - tolerance;
}

export function bigEnough(prominenceDeg: number, metres: number): boolean {
  return metres <= CLOSE_ALWAYS_M || prominenceDeg >= MIN_PROMINENCE_DEG;
}

export function assessPeak(
  originLat: number,
  originLng: number,
  eyeM: number,
  peak: Peak & { elevationM: number },
  skyline: Skyline,
): VisiblePeak | null {
  const metres = distanceM(originLat, originLng, peak.lat, peak.lng);
  if (metres < 30 || metres > MAX_DISTANCE_M) return null;
  const bearing = bearingDeg(originLat, originLng, peak.lat, peak.lng);
  const angle = apparentElevationDeg(peak.elevationM, eyeM, metres);
  const ray = rayAt(skyline, bearing);
  const occluder = angleBefore(ray, metres, SUMMIT_SELF_M);
  if (!summitInView(angle, occluder, metres, eyeM, peak.elevationM)) return null;
  const prominence = angle - angleBeyond(ray, metres);
  return {
    ...peak,
    elevationM: peak.elevationM,
    distanceM: metres,
    bearingDeg: bearing,
    angleDeg: angle,
    prominenceDeg: prominence,
  };
}

export function visiblePeaks(
  originLat: number,
  originLng: number,
  eyeM: number,
  peaks: readonly (Peak & { elevationM: number })[],
  skyline: Skyline,
): VisiblePeak[] {
  const visible: VisiblePeak[] = [];
  for (const peak of peaks) {
    const assessed = assessPeak(originLat, originLng, eyeM, peak, skyline);
    if (assessed) visible.push(assessed);
  }
  return visible;
}

/** Fill missing heights from the terrain sampler. Peaks the sampler can't see are dropped. */
export function withTerrainHeights(peaks: readonly Peak[], heightAt: HeightAt): (Peak & { elevationM: number })[] {
  const out: (Peak & { elevationM: number })[] = [];
  for (const peak of peaks) {
    if (peak.elevationM != null) {
      out.push({ ...peak, elevationM: peak.elevationM });
      continue;
    }
    const sampled = heightAt(peak.lat, peak.lng, 0);
    if (Number.isFinite(sampled)) out.push({ ...peak, elevationM: sampled });
  }
  return out;
}
