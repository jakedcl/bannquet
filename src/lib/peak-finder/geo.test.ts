import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDirection } from './format';
import { apparentElevationDeg, bearingDeg, curvatureDropM, distanceM, wrap180, wrap360 } from './geo';

test('distance of one degree of latitude is about 111 km', () => {
  const metres = distanceM(40, -74, 41, -74);
  assert.ok(metres > 110_000 && metres < 112_000, String(metres));
});

test('bearing due north and due east', () => {
  assert.ok(bearingDeg(40, -74, 41, -74) < 0.2);
  const east = bearingDeg(40, -74, 40, -73);
  assert.ok(Math.abs(east - 90) < 0.5, String(east));
});

test('curvature drop at 200 km is about 3.1 km, or 2.7 km after refraction', () => {
  const raw = curvatureDropM(200_000, 0);
  const bent = curvatureDropM(200_000);
  assert.ok(Math.abs(raw - 3140) < 20, String(raw));
  assert.ok(Math.abs(bent - 2730) < 20, String(bent));
  assert.ok(bent < raw);
});

test('a higher point looks up and a lower point looks down', () => {
  const up = apparentElevationDeg(2000, 500, 10_000);
  const down = apparentElevationDeg(0, 500, 10_000);
  assert.ok(up > 5, String(up));
  assert.ok(down < 0, String(down));
});

test('a direction reads like NNE 23°', () => {
  assert.equal(formatDirection(23), 'NNE 23°');
  assert.equal(formatDirection(0), 'N 0°');
});

test('angles wrap', () => {
  assert.equal(wrap360(-10), 350);
  assert.equal(wrap180(270), -90);
});
