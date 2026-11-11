import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OneEuroFilter,
  applyHeadingDeadZone,
  cameraPoseFromDevice,
  compassUnsure,
  createGyroSmoother,
  deviceCameraPose,
  guardHeadingJump,
  motionAllowed,
  updateYawCalibration,
  viewHeading,
} from './orientation';

test('upright portrait cardinals match compass directions', () => {
  assert.ok(Math.abs(cameraPoseFromDevice(0, 90, 0, 0).magneticHeading - 0) < 0.05);
  assert.ok(Math.abs(cameraPoseFromDevice(270, 90, 0, 0).magneticHeading - 90) < 0.05);
  assert.ok(Math.abs(cameraPoseFromDevice(180, 90, 0, 0).magneticHeading - 180) < 0.05);
  assert.ok(Math.abs(cameraPoseFromDevice(90, 90, 0, 0).magneticHeading - 270) < 0.05);
});

test('tilting toward sky raises pitch and toward ground lowers it', () => {
  const horizon = cameraPoseFromDevice(0, 90, 0, 0).pitch;
  const sky = cameraPoseFromDevice(273, 170, 2, 0).pitch;
  const ground = cameraPoseFromDevice(285, 10, 1, 0).pitch;
  assert.ok(Math.abs(horizon) < 0.5, String(horizon));
  assert.ok(sky > 70 && sky < 90, `sky ${sky}`);
  assert.ok(ground < -70 && ground > -90, `ground ${ground}`);
});

test('a small roll changes heading slightly, not ~180°', () => {
  const center = cameraPoseFromDevice(0, 90, 0, 0).magneticHeading;
  const left = cameraPoseFromDevice(0, 90, 15, 0).magneticHeading;
  const right = cameraPoseFromDevice(0, 90, -15, 0).magneticHeading;
  assert.ok(Math.abs(wrap(left - center)) < 25, `left ${left} vs ${center}`);
  assert.ok(Math.abs(wrap(right - center)) < 25, `right ${right} vs ${center}`);
});

function wrap(delta: number): number {
  const m = delta % 360;
  return m > 180 ? m - 360 : m < -180 ? m + 360 : m;
}

test('near-flat phone keeps a modest look pitch', () => {
  const pose = cameraPoseFromDevice(45, 80, 0, 0);
  assert.ok(Math.abs(pose.pitch) < 15, String(pose.pitch));
});

test('iOS yaw offset from webkit applies only when flat', () => {
  const flat = { alpha: 0, beta: 40, gamma: 0, webkitCompassHeading: 340 };
  const cal = updateYawCalibration({ offset: 0, ready: false }, flat, 0);
  assert.equal(cal.ready, true);
  const upright = deviceCameraPose({ alpha: 0, beta: 90, gamma: 0, webkitCompassHeading: 120 }, 0, cal);
  assert.ok(upright);
  assert.ok(Math.abs(upright.magneticHeading - 340) < 1, String(upright.magneticHeading));
});

test('iPhone heading plus declination gives true north after flat fix', () => {
  const flat = { alpha: 0, beta: 40, gamma: 0, webkitCompassHeading: 0 };
  const cal = updateYawCalibration({ offset: 0, ready: false }, flat, 0);
  const pose = deviceCameraPose(flat, 0, cal);
  assert.ok(pose);
  const truth = viewHeading(pose.magneticHeading, -13.1, 0, 0);
  assert.ok(Math.abs(truth - 346.9) < 0.05, String(truth));
});

test('Android absolute upright uses the device matrix', () => {
  const pose = deviceCameraPose({ alpha: 90, beta: 90, gamma: 0, absolute: true }, 0, { offset: 0, ready: false });
  assert.ok(pose);
  assert.equal(pose.magneticHeading, 270);
  assert.equal(viewHeading(pose.magneticHeading, -13, 0, 0), 257);
});

test('landscape display adds to alpha before rotation', () => {
  const portrait = cameraPoseFromDevice(10, 90, 0, 0).magneticHeading;
  const landscape = cameraPoseFromDevice(10, 90, 0, 90).magneticHeading;
  assert.ok(Math.abs(wrap(landscape - portrait + 90)) < 2, `${portrait} vs ${landscape}`);
});

test('motion is allowed when granted or not applicable', () => {
  assert.equal(motionAllowed('granted'), true);
  assert.equal(motionAllowed('unsupported'), true);
  assert.equal(motionAllowed('denied'), false);
  assert.equal(motionAllowed('unavailable'), false);
});

test('one euro filter smooths across the 359/0 wrap', () => {
  const filter = new OneEuroFilter(1.2, 0.01, 1, true);
  const a = filter.filter(358, 0);
  filter.filter(359, 16);
  const c = filter.filter(1, 32);
  assert.ok(Math.abs(c - a) < 8, `drift ${a} to ${c}`);
});

test('heading dead zone holds still when noise is tiny', () => {
  assert.equal(applyHeadingDeadZone(10, 10.2), 10);
  assert.equal(applyHeadingDeadZone(359, 359.2), 359);
});

test('heading jump guard rejects a single spike', () => {
  const once = guardHeadingJump(10, 200, 0);
  assert.equal(once.heading, 10);
  assert.equal(once.spikeFrames, 1);
  const sustained = guardHeadingJump(10, 200, 2);
  assert.equal(sustained.heading, 200);
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
