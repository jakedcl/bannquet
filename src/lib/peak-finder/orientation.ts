import { angularDistance, wrap180, wrap360 } from './geo';

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
  if (typeof reading.alpha !== 'number' || Number.isNaN(reading.alpha)) return null;
  if (!reading.absolute) return null;
  const beta = reading.beta ?? 90;
  const gamma = reading.gamma ?? 0;
  if (beta >= 55 && beta <= 125) {
    return portraitCompassHeading(reading.alpha, beta, gamma);
  }
  return wrap360(360 - reading.alpha);
}

/**
 * Tilt-compensated compass for portrait, camera forward. Alpha alone gimbal-locks near beta=90.
 */
export function portraitCompassHeading(alpha: number, beta: number, gamma: number): number {
  const a = (alpha * Math.PI) / 180;
  const b = (beta * Math.PI) / 180;
  const sinA = Math.sin(a);
  const cosA = Math.cos(a);
  const cosB = Math.cos(b);
  if (Math.abs(cosB) < 0.12) {
    return wrap360(360 - alpha);
  }
  const heading = Math.atan2(-sinA * cosB, cosA * cosB) * (180 / Math.PI);
  const gammaFix = ((gamma % 360) + 360) % 360;
  if (gammaFix > 170 || gammaFix < 10) {
    return wrap360(heading);
  }
  return wrap360(360 - alpha);
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

function smoothingAlpha(cutoffHz: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoffHz);
  return 1 / (1 + tau / Math.max(dt, 1 / 240));
}

export class OneEuroFilter {
  private value: number | null = null;
  private derivative = 0;
  private lastSeconds: number | null = null;

  constructor(
    private readonly minCutoff: number,
    private readonly beta: number,
    private readonly dCutoff: number,
    private readonly circular: boolean,
  ) {}

  reset() {
    this.value = null;
    this.derivative = 0;
    this.lastSeconds = null;
  }

  filter(measurement: number, timeMs: number): number {
    const t = timeMs / 1000;
    if (this.value == null || this.lastSeconds == null) {
      this.value = measurement;
      this.lastSeconds = t;
      return measurement;
    }
    const dt = Math.max(1 / 240, t - this.lastSeconds);
    this.lastSeconds = t;
    const delta = this.circular ? wrap180(measurement - this.value) : measurement - this.value;
    const rate = delta / dt;
    const edAlpha = smoothingAlpha(this.dCutoff, dt);
    this.derivative = edAlpha * rate + (1 - edAlpha) * this.derivative;
    const cutoff = this.minCutoff + this.beta * Math.abs(this.derivative);
    const alpha = smoothingAlpha(cutoff, dt);
    if (this.circular) {
      this.value = wrap360(this.value + alpha * wrap180(measurement - this.value));
    } else {
      this.value += alpha * (measurement - this.value);
    }
    return this.value;
  }
}

export const GYRO_HEADING_DEAD_ZONE_DEG = 0.35;
const GYRO_TILT_DEAD_ZONE_DEG = 0.25;

export function applyHeadingDeadZone(current: number, next: number, deadZone = GYRO_HEADING_DEAD_ZONE_DEG): number {
  return Math.abs(wrap180(next - current)) < deadZone ? current : next;
}

export function applyTiltDeadZone(current: number, next: number, deadZone = GYRO_TILT_DEAD_ZONE_DEG): number {
  return Math.abs(next - current) < deadZone ? current : next;
}

export type GyroSmoother = {
  reset(): void;
  smooth(
    magnetic: number,
    pitch: number,
    roll: number,
    timeMs: number,
  ): { magnetic: number; pitch: number; roll: number };
};

export function createGyroSmoother(): GyroSmoother {
  const heading = new OneEuroFilter(0.65, 0.04, 1.2, true);
  const pitch = new OneEuroFilter(1.0, 0.03, 1.5, false);
  const roll = new OneEuroFilter(1.4, 0.02, 1.5, false);
  let headingOut = 0;
  let pitchOut = 0;
  let rollOut = 0;
  let seeded = false;
  return {
    reset() {
      heading.reset();
      pitch.reset();
      roll.reset();
      seeded = false;
    },
    smooth(magnetic, pitchDeg, rollDeg, timeMs) {
      const h = heading.filter(magnetic, timeMs);
      const p = pitch.filter(pitchDeg, timeMs);
      const r = roll.filter(rollDeg, timeMs);
      if (!seeded) {
        headingOut = h;
        pitchOut = p;
        rollOut = r;
        seeded = true;
        return { magnetic: h, pitch: p, roll: r };
      }
      headingOut = applyHeadingDeadZone(headingOut, h);
      pitchOut = applyTiltDeadZone(pitchOut, p);
      rollOut = applyTiltDeadZone(rollOut, r);
      return { magnetic: headingOut, pitch: pitchOut, roll: rollOut };
    },
  };
}
