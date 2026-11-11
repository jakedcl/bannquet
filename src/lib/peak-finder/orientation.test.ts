import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OneEuroFilter,
  applyHeadingDeadZone,
  compassUnsure,
  createGyroSmoother,
  magneticHeading,
  motionAllowed,
  portraitCompassHeading,
  viewHeading,
  viewPitch,
} from './orientation';

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

test('motion is allowed when granted or not applicable', () => {
  assert.equal(motionAllowed('granted'), true);
  assert.equal(motionAllowed('unsupported'), true);
  assert.equal(motionAllowed('denied'), false);
  assert.equal(motionAllowed('unavailable'), false);
});

test('portrait compass falls back when gimbal-locked', () => {
  assert.ok(Math.abs(portraitCompassHeading(120, 90, 0) - 240) < 0.01);
});

test('one euro filter smooths across the 359/0 wrap', () => {
  const filter = new OneEuroFilter(1.2, 0.01, 1, true);
  const a = filter.filter(358, 0);
  filter.filter(359, 16);
  const c = filter.filter(1, 32);
  assert.ok(c < 90 || c > 270, String(c));
  assert.ok(Math.abs(c - a) < 8, `drift ${a} to ${c}`);
});

test('heading dead zone holds still when noise is tiny', () => {
  assert.equal(applyHeadingDeadZone(10, 10.2), 10);
  assert.equal(applyHeadingDeadZone(359, 359.2), 359);
});

test('gyro smoother damps a single spike', () => {
  const smoother = createGyroSmoother();
  smoother.smooth(10, 0, 0, 0);
  smoother.smooth(80, 0, 0, 20);
  smoother.smooth(12, 0, 0, 40);
  const settled = smoother.smooth(12, 0, 0, 280);
  assert.ok(settled.magnetic < 20, String(settled.magnetic));
});

test('a poor iPhone accuracy reading is unsure', () => {
  assert.equal(compassUnsure(20, 0), true);
  assert.equal(compassUnsure(5, 0), false);
  assert.equal(compassUnsure(5, 40), true);
});
