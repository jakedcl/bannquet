import assert from 'node:assert/strict';
import test from 'node:test';
import { OFFLINE_RADIUS_M } from './constants';
import { boxFitsViewport, offlineSaveBounds } from './offline-area-picker-map';

test('offline save bounds span about 2× radius in degrees at mid-latitude', () => {
  const lat = 41.99;
  const lng = -74.39;
  const b = offlineSaveBounds(lat, lng, OFFLINE_RADIUS_M);
  const latSpan = b.north - b.south;
  const lngSpan = b.east - b.west;
  assert.ok(latSpan > 1.5 && latSpan < 2.2);
  assert.ok(lngSpan > 1.5 && lngSpan < 2.5);
  assert.equal(b.west < lng && b.east > lng, true);
  assert.equal(b.south < lat && b.north > lat, true);
});

test('boxFitsViewport respects padding', () => {
  assert.equal(boxFitsViewport(100, 100, 200, 200, 24), true);
  assert.equal(boxFitsViewport(200, 100, 200, 200, 24), false);
  assert.equal(boxFitsViewport(100, 200, 200, 200, 24), false);
});
