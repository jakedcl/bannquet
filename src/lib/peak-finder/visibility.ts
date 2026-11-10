import { angleBeyond, rayAt, skylineAngle, type HeightAt, type Skyline } from './skyline';
import { apparentElevationDeg, bearingDeg, distanceM } from './geo';
import { CLOSE_ALWAYS_M, MAX_DISTANCE_M, MIN_PROMINENCE_DEG, VISIBLE_TOLERANCE_DEG } from './constants';
import type { Peak } from './peaks';

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
  const sky = skylineAngle(ray);
  if (!clearsSkyline(angle, sky)) return null;
  const prominence = angle - angleBeyond(ray, metres);
  if (!bigEnough(prominence, metres)) return null;
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
