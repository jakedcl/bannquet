import { angularDistance, wrap360 } from './geo';

export type OrientationReading = {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  absolute?: boolean;
  webkitCompassHeading?: number | null;
  webkitCompassAccuracy?: number | null;
};

/** Magnetic heading of the top of the phone, degrees clockwise from magnetic north. */
export function magneticHeading(reading: OrientationReading): number | null {
  const ios = reading.webkitCompassHeading;
  if (typeof ios === 'number' && !Number.isNaN(ios)) return wrap360(ios);
  if (reading.absolute && typeof reading.alpha === 'number' && !Number.isNaN(reading.alpha)) {
    return wrap360(360 - reading.alpha);
  }
  return null;
}

/**
 * Direction the camera view faces, degrees clockwise from true north.
 * Declination is added (west is negative). Landscape subtracts the screen angle.
 */
export function viewHeading(magnetic: number, declination: number, screenAngle: number, calibrationOffset = 0): number {
  return wrap360(magnetic + declination - screenAngle + calibrationOffset);
}

export function viewPitch(beta: number | null, gamma: number | null, screenAngle: number): number {
  const angle = ((screenAngle % 360) + 360) % 360;
  if (angle === 90) return gamma ?? 0;
  if (angle === 270) return -(gamma ?? 0);
  if (beta == null) return 0;
  return 90 - beta;
}

export function viewRoll(beta: number | null, gamma: number | null, screenAngle: number): number {
  const angle = ((screenAngle % 360) + 360) % 360;
  if (angle === 90) return (beta ?? 90) - 90;
  if (angle === 270) return 90 - (beta ?? 90);
  return gamma ?? 0;
}

export function circularMean(samples: readonly number[]): number {
  if (samples.length === 0) return 0;
  let x = 0;
  let y = 0;
  for (const sample of samples) {
    const r = (sample * Math.PI) / 180;
    x += Math.cos(r);
    y += Math.sin(r);
  }
  return wrap360((Math.atan2(y, x) * 180) / Math.PI);
}

export function pushSample(buffer: readonly number[], next: number, size = 8): number[] {
  const copy = buffer.length >= size ? buffer.slice(buffer.length - size + 1) : buffer.slice();
  copy.push(next);
  return copy;
}

/** iPhone reports accuracy in degrees. Worse than ±15°, or a jump, means line up. */
export function compassUnsure(accuracyDeg: number | null | undefined, jumpDeg: number): boolean {
  if (typeof accuracyDeg === 'number' && (accuracyDeg < 0 || accuracyDeg > 15)) return true;
  return jumpDeg > 25;
}

export type MotionPermission = 'granted' | 'denied' | 'unsupported' | 'unavailable';

export function motionAllowed(result: MotionPermission): boolean {
  return result === 'granted' || result === 'unsupported';
}

/** iOS 13+ needs a user gesture; a failed call is not the same as the user denying access. */
export async function requestMotionPermission(): Promise<MotionPermission> {
  if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') return 'unsupported';
  const ctor = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };
  if (typeof ctor.requestPermission !== 'function') return 'granted';
  try {
    const result = await ctor.requestPermission();
    return result === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

export function headingJump(previous: number | null, next: number): number {
  if (previous == null) return 0;
  return angularDistance(previous, next);
}
