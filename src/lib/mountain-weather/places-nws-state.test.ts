import assert from 'node:assert/strict';
import test from 'node:test';
import places from '../../../config/mountain-weather/places.json';
import nwsJson from '../../../config/mountain-weather/nws-points.json';

type NwsPointsFile = {
  skipped?: Record<string, unknown>;
  points: Record<string, { county?: string; error?: string }>;
};

const nws = nwsJson as NwsPointsFile;
const SKIP = new Set(Object.keys(nws.skipped ?? {}));
const STATE_BY_CODE: Record<string, string> = { ny: 'NY', vt: 'VT', nh: 'NH', me: 'ME' };

function countyState(countyUrl: string | undefined): string | null {
  if (!countyUrl) return null;
  const m = countyUrl.match(/\/([A-Z]{2})C\d+/);
  return m?.[1] ?? null;
}

test('nws points county state matches catalog state for every place', () => {
  const mismatches: string[] = [];
  for (const state of places.states) {
    const want = STATE_BY_CODE[state.code];
    for (const section of state.sections) {
      for (const place of section.places) {
        if (SKIP.has(place.id)) continue;
        const pt = nws.points[place.id];
        assert.ok(pt, `missing nws-points for ${place.id}`);
        if (pt.error) {
          mismatches.push(`${place.id}: nws error ${pt.error}`);
          continue;
        }
        const got = countyState(pt.county);
        if (got !== want) mismatches.push(`${place.id}: catalog=${want} nwsCounty=${got ?? '?'}`);
      }
    }
  }
  assert.deepEqual(mismatches, []);
});