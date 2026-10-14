import adk46 from '../../config/challenges/adk46.json';
import nh48 from '../../config/challenges/nh48.json';
import type { TrackPoint } from '@/lib/gpx';

/**
 * A new challenge is a JSON file in config/challenges plus one import in this
 * file. The id is stored as text, so Colorado 14ers do not need a migration.
 */
const CHALLENGE_FILES = [adk46, nh48];

/** About 500 feet. Enough for tree cover and a drifted GPS, not the next peak. */
export const SUMMIT_MATCH_METERS = 152;

const METERS_PER_DEGREE_LAT = 111_320;

export type ChallengePeak = {
  slug: string;
  name: string;
  elevationFt: number;
  lat: number;
  lng: number;
};

export type Challenge = {
  id: string;
  name: string;
  short: string;
  peaks: ChallengePeak[];
};

type ChallengeFile = {
  id: string;
  name: string;
  short: string;
  peaks: ChallengePeak[];
};

function asChallenge(file: ChallengeFile): Challenge {
  if (!/^[a-z0-9]+$/.test(file.id)) throw new Error(`Challenge id ${file.id} should be simple letters and numbers.`);
  if (!file.name || !file.short) throw new Error(`Challenge ${file.id} needs a name.`);
  if (file.peaks.length === 0) throw new Error(`Challenge ${file.id} has no peaks.`);
  const slugs = new Set<string>();
  for (const peak of file.peaks) {
    if (!peak.slug.startsWith(`${file.id}_`)) throw new Error(`${peak.slug} should start with ${file.id}_`);
    if (slugs.has(peak.slug)) throw new Error(`Duplicate peak ${peak.slug}`);
    slugs.add(peak.slug);
    if (peak.lat < -90 || peak.lat > 90 || peak.lng < -180 || peak.lng > 180) {
      throw new Error(`${peak.slug} is not a real coordinate.`);
    }
    if (!Number.isFinite(peak.elevationFt) || peak.elevationFt < 1000) {
      throw new Error(`${peak.slug} is missing an elevation.`);
    }
  }
  return {
    id: file.id,
    name: file.name,
    short: file.short,
    peaks: [...file.peaks].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export function loadChallenges(): Challenge[] {
  return CHALLENGE_FILES.map((file) => asChallenge(file));
}

export function allPeaks(): Array<ChallengePeak & { listId: string }> {
  return loadChallenges().flatMap((challenge) =>
    challenge.peaks.map((peak) => ({ ...peak, listId: challenge.id })),
  );
}

export function challengeProgress(total: number, climbed: number): { total: number; climbed: number; complete: boolean } {
  const safeTotal = Math.max(0, total);
  const safeClimbed = Math.max(0, Math.min(safeTotal, climbed));
  return { total: safeTotal, climbed: safeClimbed, complete: safeTotal > 0 && safeClimbed >= safeTotal };
}

function distanceToSegmentMeters(
  point: { lat: number; lng: number },
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
): number {
  const lat0 = (((start.lat + end.lat) / 2) * Math.PI) / 180;
  const kx = METERS_PER_DEGREE_LAT * Math.cos(lat0);
  const ky = METERS_PER_DEGREE_LAT;
  const bx = (end.lng - start.lng) * kx;
  const by = (end.lat - start.lat) * ky;
  const px = (point.lng - start.lng) * kx;
  const py = (point.lat - start.lat) * ky;
  const len2 = bx * bx + by * by;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / len2));
  return Math.hypot(px - bx * t, py - by * t);
}

export function peaksNearTrack(
  points: TrackPoint[],
  peaks: ChallengePeak[],
  radiusM = SUMMIT_MATCH_METERS,
): string[] {
  if (points.length === 0 || peaks.length === 0) return [];
  const matched: string[] = [];
  for (const peak of peaks) {
    let nearest = Number.POSITIVE_INFINITY;
    if (points.length === 1) {
      const only = points[0];
      if (only) nearest = distanceToSegmentMeters(peak, only, only);
    } else {
      for (let index = 1; index < points.length; index += 1) {
        const start = points[index - 1];
        const end = points[index];
        if (!start || !end) continue;
        nearest = Math.min(nearest, distanceToSegmentMeters(peak, start, end));
        if (nearest <= radiusM) break;
      }
    }
    if (nearest <= radiusM) matched.push(peak.slug);
  }
  return matched;
}
