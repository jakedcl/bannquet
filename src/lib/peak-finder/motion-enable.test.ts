import assert from 'node:assert/strict';
import test from 'node:test';
import { orientationEventHasData } from './orientation';
import {
  applyMotionPermission,
  GYRO_UNSURE_STATUS,
  MOTION_BLOCKED_STATUS,
  shouldAutoEnableMotion,
} from './motion-enable';

test('auto enable skips iOS permission API until the session has a grant', () => {
  assert.equal(shouldAutoEnableMotion(true, false), false);
  assert.equal(shouldAutoEnableMotion(true, true), true);
  assert.equal(shouldAutoEnableMotion(false, false), true);
});

test('applyMotionPermission allows listening without marking gyro active', () => {
  const out = applyMotionPermission(true, 'granted', false);
  assert.equal(out.mayListen, true);
  assert.equal(out.motionBlocked, false);
  assert.equal(out.sessionGranted, true);
});

test('applyMotionPermission reports motion blocked when permission is denied', () => {
  const out = applyMotionPermission(true, 'denied', false);
  assert.equal(out.mayListen, false);
  assert.equal(out.motionBlocked, true);
});

test('applyMotionPermission supports unsupported platforms', () => {
  const out = applyMotionPermission(false, 'unsupported', false);
  assert.equal(out.mayListen, true);
  assert.equal(out.motionBlocked, false);
});

test('status copy strings are fixed for the UI', () => {
  assert.match(GYRO_UNSURE_STATUS, /Line up button/);
  assert.match(MOTION_BLOCKED_STATUS, /Safari settings/);
});

test('orientationEventHasData requires a non-null axis reading', () => {
  assert.equal(orientationEventHasData({ alpha: null, beta: null, gamma: null }), false);
  assert.equal(orientationEventHasData({ alpha: 12, beta: null, gamma: null }), true);
});
