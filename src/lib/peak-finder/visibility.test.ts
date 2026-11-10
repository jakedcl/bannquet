import assert from 'node:assert/strict';
import test from 'node:test';
import { ALGONQUIN, EYE_ABOVE_TERRAIN_M, MARCY } from './constants';
import { angularDistance, bearingDeg, destination } from './geo';
import { castSkyline } from './skyline';
import { assessPeak } from './visibility';

test('from Keene Valley, a peak behind a nearer ridge is hidden', () => {
  const keene = { lat: 44.188, lng: -73.788 };
  const eye = 300 + EYE_ABOVE_TERRAIN_M;
  const skyline = castSkyline(keene.lat, keene.lng, eye, (lat, lng, distance) => {
    const bearing = bearingDeg(keene.lat, keene.lng, lat, lng);
    if (angularDistance(bearing, 270) < 6 && distance > 4_200 && distance < 5_800) return 1_200;
    return 220;
  }, 1);
  const hidden = destination(keene.lat, keene.lng, 270, 15_000);
  const open = destination(keene.lat, keene.lng, 0, 15_000);
  const behind = assessPeak(keene.lat, keene.lng, eye, {
    name: 'Behind the ridge',
    lat: hidden.lat,
    lng: hidden.lng,
    elevationM: 1_300,
  }, skyline);
  const clear = assessPeak(keene.lat, keene.lng, eye, {
    name: 'Open peak',
    lat: open.lat,
    lng: open.lng,
    elevationM: 1_300,
  }, skyline);
  assert.equal(behind, null);
  assert.ok(clear);
});

test('from Marcy\'s summit, Algonquin is visible', () => {
  const eye = MARCY.elevationM + EYE_ABOVE_TERRAIN_M;
  const skyline = castSkyline(MARCY.lat, MARCY.lng, eye, (_lat, _lng, distance) => {
    if (distance > 2_500 && distance < 4_200) return 1_160;
    return 900;
  }, 1);
  const seen = assessPeak(MARCY.lat, MARCY.lng, eye, {
    name: 'Algonquin Peak',
    ...ALGONQUIN,
  }, skyline);
  assert.ok(seen, 'Algonquin should clear the col');
  assert.ok(seen && seen.distanceM > 4_000 && seen.distanceM < 10_000, String(seen?.distanceM));
});
