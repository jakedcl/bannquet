import assert from 'node:assert/strict';
import test from 'node:test';
import { sensorCapable } from './device-capabilities';

test('sensor capability needs touch and device orientation', () => {
  assert.equal(sensorCapable({ pointerCoarse: false, maxTouchPoints: 0, hasDeviceOrientation: true }), false);
  assert.equal(sensorCapable({ pointerCoarse: true, maxTouchPoints: 0, hasDeviceOrientation: false }), false);
  assert.equal(sensorCapable({ pointerCoarse: false, maxTouchPoints: 2, hasDeviceOrientation: true }), true);
  assert.equal(sensorCapable({ pointerCoarse: true, hasDeviceOrientation: true }), true);
});
