import assert from 'node:assert/strict';
import test from 'node:test';
import { gestureModeFor, toggleLiningUp } from './explore-gestures';

test('adjust mode wins over gyro follow', () => {
  assert.equal(
    gestureModeFor({ showSkyline: true, liningUp: true, gyroOn: true, screen: 'explore' }),
    'adjust',
  );
});

test('gyro on explore turns gestures off when not lining up', () => {
  assert.equal(
    gestureModeFor({ showSkyline: true, liningUp: false, gyroOn: true, screen: 'explore' }),
    'off',
  );
});

test('pick-view keeps pan when gyro is on', () => {
  assert.equal(
    gestureModeFor({ showSkyline: true, liningUp: false, gyroOn: true, screen: 'pick-view' }),
    'pan',
  );
});

test('line-up toggle flips state', () => {
  assert.equal(toggleLiningUp(false), true);
  assert.equal(toggleLiningUp(true), false);
});
