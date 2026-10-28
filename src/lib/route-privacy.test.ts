import assert from 'node:assert/strict';
import test from 'node:test';
import { HIDDEN_END_METERS, seesWholeRoute, zoneRadiusAtZoom0 } from './route-privacy';

test('only the owner sees the hidden ends', () => {
  const route = { hideEnds: true, ownerId: 'u1' };
  assert.equal(seesWholeRoute(route, 'u1'), true);
  assert.equal(seesWholeRoute(route, 'u2'), false);
  assert.equal(seesWholeRoute(route, null), false);
  assert.equal(seesWholeRoute({ hideEnds: true, ownerId: null }, null), false);
  assert.equal(seesWholeRoute({ hideEnds: false, ownerId: 'u1' }, null), true);
});

test('the zone circle is bigger than the hidden stretch', () => {
  const lat = 44;
  const metersPerPixelZ0 = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / 512;
  assert.ok(zoneRadiusAtZoom0(lat) * metersPerPixelZ0 > HIDDEN_END_METERS);
});
