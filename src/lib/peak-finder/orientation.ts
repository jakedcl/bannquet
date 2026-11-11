import { angularDistance, wrap180, wrap360 } from './geo';

const DEG = Math.PI / 180;

export type OrientationReading = {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  absolute?: boolean;
  webkitCompassHeading?: number | null;
  webkitCompassAccuracy?: number | null;
};

export type Vec3 = { x: number; y: number; z: number };

/** W3C Z–X′–Y″ order: world vector from device coordinates. */
export function rotateDeviceToWorld(v: Vec3, alphaDeg: number, betaDeg: number, gammaDeg: number): Vec3 {
  const g = gammaDeg * DEG;
  const b = betaDeg * DEG;
  const a = alphaDeg * DEG;
  const x = v.x * Math.cos(g) + v.z * Math.sin(g);
  const y = v.y;
  const z = -v.x * Math.sin(g) + v.z * Math.cos(g);
  const y2 = y * Math.cos(b) - z * Math.sin(b);
  const z2 = y * Math.sin(b) + z * Math.cos(b);
  const x2 = x;
  const x3 = x2 * Math.cos(a) - y2 * Math.sin(a);
  const y3 = x2 * Math.sin(a) + y2 * Math.cos(a);
  return { x: x3, y: y3, z: z2 };
}

export type CameraPose = {
  /** Magnetic heading, degrees clockwise from north, camera forward projected on the horizon. */
  magneticHeading: number;
  /** Positive when the camera points above the horizon. */
  pitch: number;
  roll: number;
};

/**
 * Camera forward is out the back of the phone (−Z device). Earth frame: +X east, +Y north, +Z up.
 * `yawOffsetMagnetic` aligns iOS alpha with true/magnetic north from a flat compass fix (not webkit per frame).
 */
export function cameraPoseFromDevice(
  alpha: number,
  beta: number,
  gamma: number,
  screenAngle: number,
  yawOffsetMagnetic = 0,
): CameraPose {
  const back = rotateDeviceToWorld({ x: 0, y: 0, z: -1 }, alpha + screenAngle, beta, gamma);
  const screenUp = rotateDeviceToWorld({ x: 0, y: 1, z: 0 }, alpha + screenAngle, beta, gamma);
  const horizontal = Math.hypot(back.x, back.y) || 1e-6;
  const magneticHeading = wrap360(Math.atan2(back.x, back.y) * (180 / Math.PI) + yawOffsetMagnetic);
  const pitch = -Math.atan2(back.z, horizontal) * (180 / Math.PI);
  const roll = Math.atan2(screenUp.x, screenUp.y) * (180 / Math.PI);
  return { magneticHeading, pitch, roll };
}

export type YawCalibration = {
  offset: number;
  ready: boolean;
};

export function blendAngle(current: number, target: number, weight: number): number {
  return wrap360(current + weight * wrap180(target - current));
}

/** Update magnetic yaw offset from webkit only when the phone is fairly flat (never per-frame when upright). */
export function updateYawCalibration(
  state: YawCalibration,
  reading: OrientationReading,
  screenAngle: number,
  weight = 0.12,
): YawCalibration {
  const webkit = reading.webkitCompassHeading;
  const beta = reading.beta;
  const alpha = reading.alpha;
  const gamma = reading.gamma;
  if (
    typeof webkit !== 'number'
    || Number.isNaN(webkit)
    || typeof alpha !== 'number'
    || typeof beta !== 'number'
    || typeof gamma !== 'number'
  ) {
    return state;
  }
  if (beta < 25 || beta > 65 || Math.abs(gamma) > 25) return state;
  const raw = cameraPoseFromDevice(alpha, beta, gamma, screenAngle, 0).magneticHeading;
  const target = wrap360(webkit - raw);
  if (!state.ready) return { offset: target, ready: true };
  return { offset: blendAngle(state.offset, target, weight), ready: true };
}

export function deviceCameraPose(
  reading: OrientationReading,
  screenAngle: number,
  calibration: YawCalibration,
): CameraPose | null {
  if (
    typeof reading.alpha !== 'number'
    || Number.isNaN(reading.alpha)
    || typeof reading.beta !== 'number'
    || Number.isNaN(reading.beta)
    || typeof reading.gamma !== 'number'
    || Number.isNaN(reading.gamma)
  ) {
    return null;
  }
  const offset = calibration.ready ? calibration.offset : 0;
  return cameraPoseFromDevice(reading.alpha, reading.beta, reading.gamma, screenAngle, offset);
}

/** @deprecated Use deviceCameraPose; kept for a few legacy call sites in tests. */
export function magneticHeading(reading: OrientationReading): number | null {
  const pose = deviceCameraPose(reading, 0, { offset: 0, ready: false });
  return pose?.magneticHeading ?? null;
}

/** Direction the camera view faces, degrees clockwise from true north. */
export function viewHeading(magnetic: number, declination: number, screenAngle: number, calibrationOffset = 0): number {
  return wrap360(magnetic + declination - screenAngle + calibrationOffset);
}

/** @deprecated Use cameraPoseFromDevice pitch. */
export function viewPitch(beta: number | null, gamma: number | null, screenAngle: number): number {
  if (beta == null || gamma == null) return 0;
  return cameraPoseFromDevice(0, beta, gamma, screenAngle).pitch;
}

/** @deprecated Use cameraPoseFromDevice roll. */
export function viewRoll(beta: number | null, gamma: number | null, screenAngle: number): number {
  if (beta == null || gamma == null) return 0;
  return cameraPoseFromDevice(0, beta, gamma, screenAngle).roll;
}

export function circularMean(samples: readonly number[]): number {
  if (samples.length === 0) return 0;
  let x = 0;
  let y = 0;
  for (const sample of samples) {
    const r = sample * DEG;
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

export function compassUnsure(accuracyDeg: number | null | undefined, jumpDeg: number): boolean {
  if (typeof accuracyDeg === 'number' && (accuracyDeg < 0 || accuracyDeg > 15)) return true;
  return jumpDeg > 25;
}

export type MotionPermission = 'granted' | 'denied' | 'unsupported' | 'unavailable';

export function motionAllowed(result: MotionPermission): boolean {
  return result === 'granted' || result === 'unsupported';
}

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
export const GYRO_HEADING_MAX_JUMP_DEG = 30;

export function applyHeadingDeadZone(current: number, next: number, deadZone = GYRO_HEADING_DEAD_ZONE_DEG): number {
  return Math.abs(wrap180(next - current)) < deadZone ? current : next;
}

export function applyTiltDeadZone(current: number, next: number, deadZone = GYRO_TILT_DEAD_ZONE_DEG): number {
  return Math.abs(next - current) < deadZone ? current : next;
}

export function guardHeadingJump(current: number, next: number, spikeFrames: number): { heading: number; spikeFrames: number } {
  const jump = Math.abs(wrap180(next - current));
  if (jump <= GYRO_HEADING_MAX_JUMP_DEG) return { heading: next, spikeFrames: 0 };
  const sustained = spikeFrames + 1;
  if (sustained >= 3) return { heading: next, spikeFrames: 0 };
  return { heading: current, spikeFrames: sustained };
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
  let spikeFrames = 0;
  let seeded = false;
  return {
    reset() {
      heading.reset();
      pitch.reset();
      roll.reset();
      seeded = false;
      spikeFrames = 0;
    },
    smooth(magnetic, pitchDeg, rollDeg, timeMs) {
      let h = heading.filter(magnetic, timeMs);
      const p = pitch.filter(pitchDeg, timeMs);
      const r = roll.filter(rollDeg, timeMs);
      if (!seeded) {
        headingOut = h;
        pitchOut = p;
        rollOut = r;
        seeded = true;
        return { magnetic: h, pitch: p, roll: r };
      }
      const guarded = guardHeadingJump(headingOut, h, spikeFrames);
      h = guarded.heading;
      spikeFrames = guarded.spikeFrames;
      headingOut = applyHeadingDeadZone(headingOut, h);
      pitchOut = applyTiltDeadZone(pitchOut, p);
      rollOut = applyTiltDeadZone(rollOut, r);
      return { magnetic: headingOut, pitch: pitchOut, roll: rollOut };
    },
  };
}
