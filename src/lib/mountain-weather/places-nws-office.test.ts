import assert from 'node:assert/strict';
import test from 'node:test';
import places from '../../../config/mountain-weather/places.json';
import nwsJson from '../../../config/mountain-weather/nws-points.json';

type NwsPointsFile = {
  skipped?: Record<string, { reason: string }>;
  points: Record<string, { cwa: string }>;
};

const nws = nwsJson as NwsPointsFile;
const SKIP = new Set(Object.keys(nws.skipped ?? {}));

test('places.json office matches committed nws-points.cwa (except skipped)', () => {
  const mismatches: string[] = [];
  for (const state of places.states) {
    for (const section of state.sections) {
      for (const place of section.places) {
        if (SKIP.has(place.id)) continue;
        const pt = nws.points[place.id];
        assert.ok(pt?.cwa, `missing nws-points for ${place.id}`);
        if (place.office !== pt.cwa) mismatches.push(`${place.id}: places=${place.office} nws=${pt.cwa}`);
      }
    }
  }
  assert.deepEqual(mismatches, []);
});
