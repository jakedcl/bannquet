import { distanceM } from './geo';
import { MOVE_CHECK_MS, MOVED_THRESHOLD_M } from './constants';

export type FinderPath = 'explore' | 'pick';
/** @deprecated Name kept for saved spot JSON. */
export type FinderMode = FinderPath;

export type Spot = { lat: number; lng: number };

export type LockState = {
  locked: Spot | null;
  pending: Spot | null;
};

export function movementStatus(path: FinderPath, metres: number, thresholdM = MOVED_THRESHOLD_M): { showUpdate: boolean } {
  if (path !== 'explore') return { showUpdate: false };
  return { showUpdate: metres > thresholdM };
}

/**
 * Explore locks the first GPS fix and only flags a move past the threshold.
 * Nothing recomputes until `acceptMove`. Pick a spot ignores GPS.
 */
export function noteSample(
  state: LockState,
  path: FinderPath,
  sample: Spot,
): { state: LockState; recompute: boolean; showUpdate: boolean } {
  if (path !== 'explore') return { state, recompute: false, showUpdate: false };
  if (!state.locked) {
    return { state: { locked: sample, pending: null }, recompute: true, showUpdate: false };
  }
  const metres = distanceM(state.locked.lat, state.locked.lng, sample.lat, sample.lng);
  if (metres <= MOVED_THRESHOLD_M) {
    return { state: { locked: state.locked, pending: null }, recompute: false, showUpdate: false };
  }
  return { state: { locked: state.locked, pending: sample }, recompute: false, showUpdate: true };
}

export function acceptMove(state: LockState): { state: LockState; recompute: boolean } {
  if (!state.pending) return { state, recompute: false };
  return { state: { locked: state.pending, pending: null }, recompute: true };
}

export const MOVE_CHECK_INTERVAL_MS = MOVE_CHECK_MS;
