import { motionAllowed, type MotionPermission } from './orientation';

export type MotionHint = 'tap' | null;

/** How long to wait for real `deviceorientation` samples before marking gyro off. */
export const GYRO_VERIFY_MS = 1_500;

export function shouldAutoEnableMotion(iosPermissionRequired: boolean, sessionGranted: boolean): boolean {
  return !iosPermissionRequired || sessionGranted;
}

/** Permission API outcome only — UI "gyro on" waits for live orientation events. */
export function applyMotionPermission(
  iosPermissionRequired: boolean,
  result: MotionPermission,
  sessionGranted: boolean,
): { mayListen: boolean; hint: MotionHint; sessionGranted: boolean } {
  const granted = result === 'granted';
  const nextSession = sessionGranted || granted;
  if (result === 'denied') {
    return { mayListen: false, hint: 'tap', sessionGranted: nextSession };
  }
  if (!motionAllowed(result)) {
    return { mayListen: false, hint: iosPermissionRequired ? 'tap' : null, sessionGranted: nextSession };
  }
  return { mayListen: true, hint: null, sessionGranted: nextSession };
}
