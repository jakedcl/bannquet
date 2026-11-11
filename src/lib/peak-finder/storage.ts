import { calibrationForPersistence, calibrationFromStorage } from './compass-resync';
import { CALIBRATION_KEY, DEFAULT_HFOV_DEG, LAST_KEY } from './constants';
import type { FinderMode } from './location';

export type SavedSpot = {
  lat: number;
  lng: number;
  heading: number;
  hfov: number;
  mode: FinderMode;
};

export type Calibration = {
  headingOffset: number;
  pitchOffset?: number;
  hfov: number | null;
};

function readJson<T>(key: string): T | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

export function readLast(): SavedSpot | null {
  const saved = readJson<SavedSpot>(LAST_KEY);
  if (!saved || !Number.isFinite(saved.lat) || !Number.isFinite(saved.lng)) return null;
  return saved;
}

export function writeLast(spot: SavedSpot): void {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(spot));
  } catch {
    // Private mode can refuse storage. The view still works for this visit.
  }
}

export function readCalibration(): Calibration {
  return calibrationFromStorage(readJson<Calibration>(CALIBRATION_KEY));
}

export function writeCalibration(calibration: Calibration): void {
  try {
    const hfov = calibration.hfov != null && Number.isFinite(calibration.hfov) ? calibration.hfov : null;
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify(calibrationForPersistence(hfov)));
  } catch {
    // Same as the spot: keep it for this visit if storage is blocked.
  }
}

export function initialFov(calibration: Calibration, saved: SavedSpot | null): number {
  return calibration.hfov ?? saved?.hfov ?? DEFAULT_HFOV_DEG;
}
