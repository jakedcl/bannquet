import assert from 'node:assert/strict';
import test from 'node:test';
import { compassUnsure, magneticHeading, viewHeading, viewPitch } from './orientation';

test('iPhone heading plus declination gives true north', () => {
  const magnetic = magneticHeading({ alpha: null, beta: 90, gamma: 0, webkitCompassHeading: 0 });
  assert.equal(magnetic, 0);
  const truth = viewHeading(magnetic ?? 0, -13.1, 0, 0);
  assert.ok(Math.abs(truth - 346.9) < 0.05, String(truth));
});

test('Android heading is 360 minus alpha', () => {
  const magnetic = magneticHeading({ alpha: 90, beta: 90, gamma: 0, absolute: true });
  assert.equal(magnetic, 270);
  const truth = viewHeading(magnetic ?? 0, -13, 0, 0);
  assert.equal(truth, 257);
});

test('landscape rotation subtracts the screen angle', () => {
  const portrait = viewHeading(10, -13, 0, 0);
  const landscape = viewHeading(10, -13, 90, 0);
  assert.equal(landscape, (portrait - 90 + 360) % 360);
});

test('upright portrait looks at the horizon', () => {
  assert.equal(viewPitch(90, 0, 0), 0);
  assert.equal(viewPitch(60, 0, 0), 30);
});

test('a poor iPhone accuracy reading is unsure', () => {
  assert.equal(compassUnsure(20, 0), true);
  assert.equal(compassUnsure(5, 0), false);
  assert.equal(compassUnsure(5, 40), true);
});
