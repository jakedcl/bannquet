import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calibrationForPersistence,
  calibrationFromStorage,
  clearedLineUpOffsets,
  FRESH_YAW_CALIBRATION,
  shouldResyncOnVisibility,
} from './compass-resync';

test('clearedLineUpOffsets zeroes heading and pitch offsets', () => {
  assert.deepEqual(clearedLineUpOffsets(), { headingOffset: 0, pitchOffset: 0 });
});

test('calibrationFromStorage ignores stored line-up offsets', () => {
  const boot = calibrationFromStorage({
    headingOffset: 42,
    pitchOffset: -8,
    hfov: 55,
  });
  assert.equal(boot.headingOffset, 0);
  assert.equal(boot.pitchOffset, 0);
  assert.equal(boot.hfov, 55);
});

test('calibrationFromStorage handles missing save', () => {
  assert.deepEqual(calibrationFromStorage(null), {
    headingOffset: 0,
    pitchOffset: 0,
    hfov: null,
  });
});

test('calibrationForPersistence never stores line-up offsets', () => {
  assert.deepEqual(calibrationForPersistence(48), {
    headingOffset: 0,
    pitchOffset: 0,
    hfov: 48,
  });
});

test('FRESH_YAW_CALIBRATION resets yaw learning state', () => {
  assert.deepEqual(FRESH_YAW_CALIBRATION, { offset: 0, ready: false });
});

test('shouldResyncOnVisibility only when visible', () => {
  assert.equal(shouldResyncOnVisibility('visible'), true);
  assert.equal(shouldResyncOnVisibility('hidden'), false);
});
