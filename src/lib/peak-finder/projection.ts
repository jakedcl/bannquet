import { wrap180 } from './geo';
import { DEFAULT_HFOV_DEG } from './constants';

/**
 * Peak Finder view convention (heading/pitch → screen pixels):
 * - **Heading** (true north, ° CW): bearing deltas map linearly with `hfovDeg` across viewport width (1° = width/hfov).
 * - **Pitch** (° above horizon, from `cameraPoseFromDevice`): peak
 *   elevation `angleDeg` minus `pitchDeg` gives vertical offset; positive pitch increases screen Y so the horizon
 *   moves down (camera looking up, more sky). Vertical scale uses `verticalFov(hfov, width, height)` (1° = height/vfov).
 * - **Roll** (view roll from `cameraPoseFromDevice`): rotates projected points about the viewport center so the
 *   drawn horizon stays level with the real world (phone roll clockwise ⇒ negative roll here, skyline CCW).
 */
export type ScreenPoint = { x: number; y: number; inView: boolean };

export function verticalFov(hfovDeg: number, width: number, height: number): number {
  if (width <= 0) return hfovDeg;
  const half = Math.tan((hfovDeg * Math.PI) / 360);
  return (2 * Math.atan(half * (height / width)) * 180) / Math.PI;
}

export function projectDirection(
  bearingDeg: number,
  angleDeg: number,
  headingDeg: number,
  pitchDeg: number,
  rollDeg: number,
  hfovDeg: number,
  width: number,
  height: number,
): ScreenPoint {
  const dx = wrap180(bearingDeg - headingDeg);
  const dy = angleDeg - pitchDeg;
  const vfov = verticalFov(hfovDeg, width, height);
  let x = width / 2 + (dx / hfovDeg) * width;
  let y = height / 2 - (dy / vfov) * height;
  if (rollDeg) {
    const rad = (rollDeg * Math.PI) / 180;
    const cx = x - width / 2;
    const cy = y - height / 2;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    x = width / 2 + cx * cos - cy * sin;
    y = height / 2 + cx * sin + cy * cos;
  }
  const inView = x >= -width * 0.05 && x <= width * 1.05 && y >= -height * 0.2 && y <= height * 1.05;
  return { x, y, inView };
}

export function projectSkylineX(bearingDeg: number, headingDeg: number, hfovDeg: number, width: number): number {
  return width / 2 + (wrap180(bearingDeg - headingDeg) / hfovDeg) * width;
}

export const DEFAULT_FOV = DEFAULT_HFOV_DEG;
