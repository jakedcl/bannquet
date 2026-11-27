import { ADOPT_MAX_DISTANCE_PCT, ADOPT_MAX_START_M } from './constants';

export type AdoptPoint = { lat: number; lng: number };

function haversineMeters(a: AdoptPoint, b: AdoptPoint): number {
  const radius = 6371000;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type AdoptCandidate = AdoptPoint & {
  id: string;
  distanceM: number;
  ownerId: string;
  externalLinked: boolean;
};

/**
 * Match an existing Tom-owned route instead of inserting a duplicate.
 * Same owner, start within 200 m, distance within 3%. Never adopt another user's row.
 */
export function matchesAdoptCandidate(
  candidate: AdoptCandidate,
  incoming: AdoptPoint & { distanceM: number; ownerId: string },
): boolean {
  if (candidate.ownerId !== incoming.ownerId) return false;
  if (candidate.externalLinked) return false;
  if (candidate.distanceM <= 0 || incoming.distanceM <= 0) return false;
  const relativeDiff = Math.abs(candidate.distanceM - incoming.distanceM) / candidate.distanceM;
  if (relativeDiff > ADOPT_MAX_DISTANCE_PCT) return false;
  return haversineMeters(candidate, incoming) <= ADOPT_MAX_START_M;
}

export function pickAdoptCandidate(
  candidates: AdoptCandidate[],
  incoming: AdoptPoint & { distanceM: number; ownerId: string },
): AdoptCandidate | null {
  return candidates.find((row) => matchesAdoptCandidate(row, incoming)) ?? null;
}