import assert from 'node:assert/strict';
import test from 'node:test';
import { orientationEventHasData } from './orientation';
import { applyMotionPermission, shouldAutoEnableMotion } from './motion-enable';

test('auto enable skips iOS permission API until the session has a grant', () => {
  assert.equal(shouldAutoEnableMotion(true, false), false);
  assert.equal(shouldAutoEnableMotion(true, true), true);
  assert.equal(shouldAutoEnableMotion(false, false), true);
});

test('applyMotionPermission allows listening without marking gyro active', () => {
  const out = applyMotionPermission(true, 'granted', false);
  assert.equal(out.mayListen, true);
  assert.equal(out.hint, null);
  assert.equal(out.sessionGranted, true);
});

test('applyMotionPermission shows tap hint when iOS permission is still needed', () => {
  const out = applyMotionPermission(true, 'unavailable', false);
  assert.equal(out.mayListen, false);
  assert.equal(out.hint, 'tap');
});

test('applyMotionPermission supports unsupported platforms without a tap hint', () => {
  const out = applyMotionPermission(false, 'unsupported', false);
  assert.equal(out.mayListen, true);
  assert.equal(out.hint, null);
});

test('orientationEventHasData requires a non-null axis reading', () => {
  assert.equal(orientationEventHasData({ alpha: null, beta: null, gamma: null }), false);
  assert.equal(orientationEventHasData({ alpha: 12, beta: null, gamma: null }), true);
});
