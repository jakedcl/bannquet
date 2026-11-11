import assert from 'node:assert/strict';
import test from 'node:test';
import type { LabelCandidate } from './declutter';
import { placeGreedyForTests } from './label-placement';
import { peakImportanceScore } from './label-ranking';

function label(partial: Partial<LabelCandidate> & Pick<LabelCandidate, 'name' | 'x' | 'y'>): LabelCandidate {
  return {
    lat: 44,
    lng: -74,
    elevationM: 1200,
    distanceM: 12_000,
    bearingDeg: 0,
    angleDeg: 3,
    prominenceDeg: 0.8,
    labelWidthPx: 72,
    slidePx: 0,
    ...partial,
  };
}

test('greedy placement keeps the more important peak when boxes overlap at slide zero', () => {
  const kept = placeGreedyForTests(
    [
      label({ name: 'Minor', x: 100, y: 120, prominenceDeg: 0.1, distanceM: 40_000 }),
      label({ name: 'Landmark', x: 108, y: 120, prominenceDeg: 2.5, distanceM: 9_000 }),
    ],
    2,
    new Set(),
  );
  assert.equal(kept.length, 1);
  assert.equal(kept[0]?.name, 'Landmark');
});

test('reserved names may slide to find a gap', () => {
  const kept = placeGreedyForTests(
    [
      label({ name: 'First', x: 100, y: 120, labelWidthPx: 80 }),
      label({ name: 'Second', x: 105, y: 120, labelWidthPx: 80 }),
    ],
    2,
    new Set(['Second']),
  );
  assert.equal(kept.length, 2);
  const second = kept.find((item) => item.name === 'Second');
  assert.ok(second);
  assert.ok(second.slidePx > 0);
});

test('importance sort breaks ties by distance', () => {
  const near = label({ name: 'Near', x: 0, y: 0, distanceM: 5_000, prominenceDeg: 1 });
  const far = label({ name: 'Far', x: 0, y: 0, distanceM: 30_000, prominenceDeg: 1 });
  assert.ok(peakImportanceScore(near) > peakImportanceScore(far));
});
