import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyLineUpPitchOffset,
  clampLineUpPitchOffset,
  LINE_UP_PITCH_OFFSET_MAX_DEG,
} from './line-up-offset';

test('line-up pitch offset clamps to +/-15°', () => {
  assert.equal(clampLineUpPitchOffset(0), 0);
  assert.equal(clampLineUpPitchOffset(LINE_UP_PITCH_OFFSET_MAX_DEG), 15);
  assert.equal(clampLineUpPitchOffset(-LINE_UP_PITCH_OFFSET_MAX_DEG), -15);
  assert.equal(clampLineUpPitchOffset(40), 15);
  assert.equal(clampLineUpPitchOffset(-99), -15);
});

test('line-up pitch offset stacks on base pitch and respects view limits', () => {
  assert.equal(applyLineUpPitchOffset(5, 10), 15);
  assert.equal(applyLineUpPitchOffset(5, -8), -3);
  assert.equal(applyLineUpPitchOffset(30, 10), 35);
  assert.equal(applyLineUpPitchOffset(-15, -10), -20);
});
