export type DeviceHints = {
  pointerCoarse?: boolean;
  maxTouchPoints?: number;
  hasDeviceOrientation?: boolean;
};

/**
 * Phone-class sensors: coarse touch plus device orientation. Viewport width is not
 * used. A narrow desktop window must not get the camera or gyro chrome.
 */
export function sensorCapable(hints: DeviceHints): boolean {
  const touch = hints.pointerCoarse === true || (hints.maxTouchPoints ?? 0) > 0;
  const motion = hints.hasDeviceOrientation === true;
  return touch && motion;
}

export function readSensorCapable(): boolean {
  if (typeof window === 'undefined') return false;
  const pointerCoarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;
  const hasDeviceOrientation = typeof DeviceOrientationEvent !== 'undefined';
  return sensorCapable({ pointerCoarse, maxTouchPoints, hasDeviceOrientation });
}

/** Side-by-side map versus stacked full-screen map, from layout only. */
export function stackLayout(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 1023px)').matches;
}
