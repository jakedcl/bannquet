import assert from 'node:assert/strict';
import test from 'node:test';
import { declutter, labelCap, type LabelCandidate } from './declutter';

function label(partial: Partial<LabelCandidate> & Pick<LabelCandidate, 'name' | 'x' | 'angleDeg'>): LabelCandidate {
  return {
    lat: 44,
    lng: -74,
    elevationM: 1000,
    distanceM: 10_000,
    bearingDeg: 0,
    prominenceDeg: 1,
    y: 100,
    labelWidthPx: 48,
    ...partial,
  };
}

test('overlapping labels keep the taller one', () => {
  const kept = declutter([
    label({ name: 'Low', x: 100, angleDeg: 2 }),
    label({ name: 'High', x: 110, angleDeg: 6 }),
  ], 25);
  assert.deepEqual(kept.map((item) => item.name), ['High']);
});

test('never more than the cap', () => {
  const peaks = Array.from({ length: 10 }, (_, index) => label({
    name: `P${index}`,
    x: index * 80,
    angleDeg: 10 - index,
  }));
  const kept = declutter(peaks, 4);
  assert.equal(kept.length, 4);
  assert.deepEqual(kept.map((item) => item.name), ['P0', 'P1', 'P2', 'P3']);
});

test('phone cap is smaller than desktop', () => {
  assert.equal(labelCap(390), 25);
  assert.equal(labelCap(1280), 40);
});
