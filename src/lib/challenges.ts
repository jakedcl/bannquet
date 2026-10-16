import adk46 from '../../config/challenges/adk46.json';
import cat3500 from '../../config/challenges/cat3500.json';
import groupsFile from '../../config/challenges/groups.json';
import me4000 from '../../config/challenges/me4000.json';
import nh48 from '../../config/challenges/nh48.json';
import vt4000 from '../../config/challenges/vt4000.json';
import type { TrackPoint } from '@/lib/gpx';

/**
 * A new challenge is a JSON file in config/challenges plus one import in this
 * file. The id is stored as text, so Colorado 14ers do not need a migration.
 * A group, such as the New England 67, points at other lists and does not copy peaks.
 */
const CHALLENGE_FILES = [cat3500, adk46, nh48, vt4000, me4000];

/** About 500 feet. Enough for tree cover and a drifted GPS, not the next peak. */
export const SUMMIT_MATCH_METERS = 152;

/** A route upload only suggests a summit the line actually passes. */
export const SUMMIT_SUGGEST_METERS = 50;

const METERS_PER_DEGREE_LAT = 111_320;

export type ChallengePeak = {
  slug: string;
  name: string;
  elevationFt: number;
  lat: number;
  lng: number;
  winter?: boolean;
  note?: string;
};

export type Challenge = {
  id: string;
  name: string;
  short: string;
  peaks: ChallengePeak[];
};

export type ChallengeGroup = {
  id: string;
  name: string;
  short: string;
  listIds: string[];
};

type ChallengeFile = {
  id: string;
  name: string;
  short: string;
  peaks: Array<ChallengePeak & { winter?: boolean; note?: string }>;
};

type GroupFile = {
  id: string;
  name: string;
  short: string;
  lists: string[];
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
    if (peak.winter != null && typeof peak.winter !== 'boolean') {
      throw new Error(`${peak.slug} has a bad winter flag.`);
    }
    if (peak.note != null && typeof peak.note !== 'string') {
      throw new Error(`${peak.slug} has a bad note.`);
    }
  }
  return {
    id: file.id,
    name: file.name,
    short: file.short,
    peaks: [...file.peaks]
      .map((peak) => ({
        slug: peak.slug,
        name: peak.name,
        elevationFt: peak.elevationFt,
        lat: peak.lat,
        lng: peak.lng,
        ...(peak.winter ? { winter: true } : {}),
        ...(peak.note ? { note: peak.note } : {}),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export function loadChallenges(): Challenge[] {
  return CHALLENGE_FILES.map((file) => asChallenge(file));
}

export function loadGroups(): ChallengeGroup[] {
  const known = new Set(loadChallenges().map((challenge) => challenge.id));
  return (groupsFile as GroupFile[]).map((group) => {
    if (!/^[a-z0-9]+$/.test(group.id)) throw new Error(`Group id ${group.id} should be simple letters and numbers.`);
    if (!group.name || !group.short) throw new Error(`Group ${group.id} needs a name.`);
    if (!Array.isArray(group.lists) || group.lists.length === 0) throw new Error(`Group ${group.id} needs lists.`);
    for (const listId of group.lists) {
      if (!known.has(listId)) throw new Error(`Group ${group.id} points at a missing list ${listId}.`);
    }
    return { id: group.id, name: group.name, short: group.short, listIds: [...group.lists] };
  });
}

export function groupPeaks(group: ChallengeGroup): Array<ChallengePeak & { listId: string }> {
  const wanted = new Set(group.listIds);
  return allPeaks().filter((peak) => wanted.has(peak.listId));
}

export function climbButtonLabel(times: number): string {
  return times > 0 ? 'I climbed this again' : 'I climbed this';
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

export function suggestSummits(
  points: TrackPoint[],
  climbed: ReadonlySet<string>,
  peaks: ChallengePeak[] = allPeaks(),
): Array<{ slug: string; name: string }> {
  const open = peaks.filter((peak) => !climbed.has(peak.slug));
  const near = new Set(peaksNearTrack(points, open, SUMMIT_SUGGEST_METERS));
  return open.filter((peak) => near.has(peak.slug)).map((peak) => ({ slug: peak.slug, name: peak.name }));
}
