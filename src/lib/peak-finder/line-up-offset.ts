/** User line-up tweak on top of gyro or static pitch (degrees). */
export const LINE_UP_PITCH_OFFSET_MAX_DEG = 15;

export function clampLineUpPitchOffset(offsetDeg: number): number {
  return Math.min(LINE_UP_PITCH_OFFSET_MAX_DEG, Math.max(-LINE_UP_PITCH_OFFSET_MAX_DEG, offsetDeg));
}

/** Combine sensor pitch with a stored line-up offset without changing sensor math. */
export function applyLineUpPitchOffset(basePitchDeg: number, pitchOffsetDeg: number): number {
  return Math.min(35, Math.max(-20, basePitchDeg + pitchOffsetDeg));
}
