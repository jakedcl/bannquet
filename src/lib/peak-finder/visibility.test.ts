import assert from 'node:assert/strict';
import test from 'node:test';
import { ALGONQUIN, EYE_ABOVE_TERRAIN_M, MARCY } from './constants';
import { angularDistance, apparentElevationDeg, bearingDeg, destination } from './geo';
import { castSkyline } from './skyline';
import { assessPeak, peakUnderfoot, summitInView } from './visibility';

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

test('a nearer peak still shows when a taller mountain stands behind it', () => {
  const origin = { lat: 44, lng: -74 };
  const eye = 1_000;
  const skyline = castSkyline(origin.lat, origin.lng, eye, (_lat, _lng, distance) => {
    if (distance > 18_000 && distance < 22_000) return 1_800;
    return 800;
  }, 2);
  const front = destination(origin.lat, origin.lng, 20, 8_000);
  const seen = assessPeak(origin.lat, origin.lng, eye, {
    name: 'Front ridge',
    lat: front.lat,
    lng: front.lng,
    elevationM: 1_400,
  }, skyline);
  assert.ok(seen, 'the front ridge is in view even though it is not the skyline');
});

test('the top 50 m of a summit may sit behind the ridge', () => {
  const eye = 500;
  const distance = 10_000;
  const peakElev = 1_500;
  const peakAngle = apparentElevationDeg(peakElev, eye, distance);
  const justBehind = apparentElevationDeg(peakElev + 40, eye, distance);
  const buried = apparentElevationDeg(peakElev + 200, eye, distance);
  assert.equal(summitInView(peakAngle, justBehind, distance, eye, peakElev), true);
  assert.equal(summitInView(peakAngle, buried, distance, eye, peakElev), false);
});

test('standing within 0.2 miles is on that peak', () => {
  const peaks = [
    { name: 'Mount Marcy', lat: MARCY.lat, lng: MARCY.lng, elevationM: MARCY.elevationM },
    { name: 'Gray Peak', lat: MARCY.lat, lng: MARCY.lng - 0.02, elevationM: 1_400 },
  ];
  assert.equal(peakUnderfoot(MARCY.lat, MARCY.lng, peaks)?.name, 'Mount Marcy');
  assert.equal(peakUnderfoot(MARCY.lat + 0.002, MARCY.lng, peaks)?.name, 'Mount Marcy');
  assert.equal(peakUnderfoot(MARCY.lat + 0.01, MARCY.lng, peaks), null);
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
