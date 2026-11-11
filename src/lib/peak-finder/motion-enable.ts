import { motionAllowed, type MotionPermission } from './orientation';

/** How long to wait for real `deviceorientation` samples before marking gyro off. */
export const GYRO_VERIFY_MS = 1_500;

export const GYRO_UNSURE_STATUS =
  'The gyro is unsure. If things seem off, use the Line up button.';

export const MOTION_BLOCKED_STATUS =
  'Motion is blocked. Reload the page or allow Motion & Orientation in Safari settings.';

export function shouldAutoEnableMotion(iosPermissionRequired: boolean, sessionGranted: boolean): boolean {
  return !iosPermissionRequired || sessionGranted;
}

/** Permission API outcome only — UI "gyro on" waits for live orientation events. */
export function applyMotionPermission(
  _iosPermissionRequired: boolean,
  result: MotionPermission,
  sessionGranted: boolean,
): { mayListen: boolean; motionBlocked: boolean; sessionGranted: boolean } {
  const granted = result === 'granted';
  const nextSession = sessionGranted || granted;
  if (result === 'denied') {
    return { mayListen: false, motionBlocked: true, sessionGranted: nextSession };
  }
  if (!motionAllowed(result)) {
    return { mayListen: false, motionBlocked: false, sessionGranted: nextSession };
  }
  return { mayListen: true, motionBlocked: false, sessionGranted: nextSession };
}
