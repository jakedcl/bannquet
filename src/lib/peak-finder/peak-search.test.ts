import assert from 'node:assert/strict';
import test from 'node:test';
import { searchPeaks } from './peak-search';
import type { Peak } from './peaks';

function peak(name: string, lat = 44, lng = -74, elevationM: number | null = 1000): Peak {
  return { name, lat, lng, elevationM };
}

test('peak name search prefers exact and prefix matches, then elevation', () => {
  const peaks = [
    peak('Mount Washington', 44, -71, 1917),
    peak('Washington Monument', 38, -77, 170),
    peak('Mount Marcy', 44.11, -73.92, 1629),
    peak('Little Washington', 44, -72, 400),
  ];
  assert.deepEqual(searchPeaks(peaks, 'washington', 4).map((p) => p.name), [
    'Mount Washington',
    'Little Washington',
    'Washington Monument',
  ]);
  assert.deepEqual(searchPeaks(peaks, 'mount marcy', 1).map((p) => p.name), ['Mount Marcy']);
});
