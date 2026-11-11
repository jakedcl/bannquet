import type { YawCalibration } from './orientation';
import type { Calibration } from './storage';

export const FRESH_YAW_CALIBRATION: YawCalibration = { offset: 0, ready: false };

/** Session line-up offsets (not loaded from storage on boot). */
export function clearedLineUpOffsets(): { headingOffset: number; pitchOffset: number } {
  return { headingOffset: 0, pitchOffset: 0 };
}

/** What we restore after a full page load: FOV only. */
export function calibrationFromStorage(saved: Calibration | null): Calibration {
  const hfov = saved?.hfov != null && Number.isFinite(saved.hfov) ? saved.hfov : null;
  return { headingOffset: 0, pitchOffset: 0, hfov };
}

/** What we write to `localStorage` — never persist line-up offsets. */
export function calibrationForPersistence(hfov: number | null): Calibration {
  return { headingOffset: 0, pitchOffset: 0, hfov };
}

export function shouldResyncOnVisibility(visibilityState: DocumentVisibilityState): boolean {
  return visibilityState === 'visible';
}
