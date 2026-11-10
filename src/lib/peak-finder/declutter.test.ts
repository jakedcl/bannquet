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
    slidePx: 0,
    ...partial,
  };
}

test('overlapping labels keep the taller one in place', () => {
  const kept = declutter([
    label({ name: 'Low', x: 100, angleDeg: 2, distanceM: 10_000 }),
    label({ name: 'High', x: 110, angleDeg: 6, distanceM: 10_000 }),
  ], 25);
  const high = kept.find((item) => item.name === 'High');
  const low = kept.find((item) => item.name === 'Low');
  assert.ok(high);
  assert.equal(high.slidePx, 0);
  if (low) assert.ok(low.slidePx > 0);
});

test('a nearer peak stays put when a farther summit would cover it', () => {
  const kept = declutter([
    label({ name: 'Far summit', x: 100, y: 160, angleDeg: 8, distanceM: 30_000, labelWidthPx: 80 }),
    label({ name: 'Front ridge', x: 112, y: 160, angleDeg: 1, distanceM: 6_000, labelWidthPx: 80 }),
  ], 25);
  const front = kept.find((item) => item.name === 'Front ridge');
  const far = kept.find((item) => item.name === 'Far summit');
  assert.ok(front);
  assert.equal(front.slidePx, 0);
  assert.ok(far);
  assert.ok(far.slidePx > 0);
});

test('tilted labels that sit beside each other both stay', () => {
  const kept = declutter([
    label({ name: 'Left', x: 40, y: 200, angleDeg: 3, distanceM: 8_000 }),
    label({ name: 'Right', x: 130, y: 200, angleDeg: 4, distanceM: 12_000 }),
  ], 25);
  assert.deepEqual(kept.map((item) => item.name).sort(), ['Left', 'Right']);
});

test('a peak on a nearer ridge keeps a label under a higher one', () => {
  const kept = declutter([
    label({ name: 'Skyline', x: 100, y: 80, angleDeg: 4 }),
    label({ name: 'Front', x: 108, y: 180, angleDeg: 1 }),
  ], 25);
  assert.deepEqual(kept.map((item) => item.name).sort(), ['Front', 'Skyline']);
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
  assert.equal(labelCap(390), 40);
  assert.equal(labelCap(980), 80);
});
