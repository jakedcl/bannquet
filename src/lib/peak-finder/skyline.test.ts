import assert from 'node:assert/strict';
import test from 'node:test';
import { castSkyline, skylineAngle, smoothAngles, viewProfile } from './skyline';

test('a flat plain gives a flat horizon', () => {
  const skyline = castSkyline(44, -74, 1.7, () => 0, 10);
  const angles = skyline.rays.map((ray) => skylineAngle(ray));
  const min = Math.min(...angles);
  const max = Math.max(...angles);
  assert.ok(max - min < 0.05, `${min} to ${max}`);
  assert.ok(max < 0 && max > -1, String(max));
});

test('smoothing rounds the corner of a flat step', () => {
  const stepped = Array.from({ length: 80 }, (_value, index) => Math.floor(index / 8));
  const smooth = smoothAngles(stepped, 3, false);
  assert.ok(smooth[7] > stepped[7], `before the jump ${smooth[7]}`);
  assert.ok(smooth[8] < stepped[8], `after the jump ${smooth[8]}`);
  assert.ok(Math.abs(smooth[4] - stepped[4]) < 0.05, `mid-step ${smooth[4]}`);
});

test('near-field bumps are not drawn, and a farther ridge is one clean line', () => {
  const skyline = castSkyline(44, -74, 500, (_lat, _lng, distance) => {
    if (distance < 1_800) return 500 + (Math.floor(distance / 40) % 2) * 30;
    if (distance > 18_000 && distance < 24_000) return 1_600;
    return 450;
  }, 5);
  const view = viewProfile(skyline);
  const nearSpike = skyline.rays.some((ray) => (
    ray.distanceM.some((d, i) => d < 500 && ray.angleDeg[i] > 5)
  ));
  assert.ok(nearSpike, 'fixture has steep near samples');
  assert.ok(Math.max(...view.angleDeg) > 0.5, 'a distant ridge still shapes the horizon');
  for (let i = 1; i < view.angleDeg.length; i += 1) {
    assert.ok(Math.abs(view.angleDeg[i] - view.angleDeg[i - 1]) < 0.4, `${view.angleDeg[i - 1]} to ${view.angleDeg[i]}`);
  }
  for (const layer of view.layers) {
    const distances = layer.distanceM.filter((distance) => Number.isFinite(distance));
    assert.ok(distances.every((distance) => distance >= 4_000));
    const angles = layer.angleDeg.filter((angle) => Number.isFinite(angle));
    for (let i = 1; i < angles.length; i += 1) {
      assert.ok(Math.abs(angles[i] - angles[i - 1]) < 0.35, `${angles[i - 1]} to ${angles[i]}`);
    }
  }
});

test('a ridge that sits on the horizon is left out', () => {
  const skyline = castSkyline(44, -74, 400, (_lat, _lng, distance) => {
    if (distance > 40_000 && distance < 55_000) return 2_200;
    if (distance > 4_000 && distance < 12_000) return 430 + Math.sin(distance / 280) * 35;
    return 350;
  }, 5);
  for (const layer of viewProfile(skyline).layers) {
    const angles = layer.angleDeg.filter((angle) => Number.isFinite(angle)).sort((a, b) => a - b);
    const median = angles[Math.floor(angles.length / 2)];
    assert.ok(Math.abs(median) >= 0.35, String(median));
  }
});

test('ground noise alone adds no ridge layer', () => {
  const skyline = castSkyline(44, -74, 200, (_lat, _lng, distance) => {
    if (distance < 1_500) return 190 + (Math.floor(distance / 50) % 2) * 25;
    return 180;
  }, 5);
  assert.equal(viewProfile(skyline).layers.length, 0);
});

test('a front ridge below the horizon is still drawn from a summit', () => {
  const skyline = castSkyline(44, -74, 1_600, (_lat, _lng, distance) => {
    if (distance > 6_000 && distance < 12_000) return 1_400;
    if (distance > 25_000 && distance < 35_000) return 1_500;
    return 900;
  }, 5);
  const view = viewProfile(skyline);
  const distances = view.layers.flatMap((layer) => layer.distanceM.filter((distance) => Number.isFinite(distance)));
  assert.ok(distances.some((distance) => distance >= 6_000 && distance < 15_000), 'the ridge in front is drawn');
  for (const layer of view.layers) {
    const angles = layer.angleDeg.filter((angle) => Number.isFinite(angle));
    for (let i = 1; i < angles.length; i += 1) {
      assert.ok(Math.abs(angles[i] - angles[i - 1]) < 0.35, `${angles[i - 1]} to ${angles[i]}`);
    }
  }
});

test('a ridge raises the horizon in that direction only', () => {
  const skyline = castSkyline(44, -74, 301.7, (_lat, lng, distance) => {
    const westRidge = lng < -74 && distance > 4_000 && distance < 6_000;
    return westRidge ? 1_200 : 200;
  }, 45);
  const west = skylineAngle(skyline.rays[270 / 45]);
  const north = skylineAngle(skyline.rays[0]);
  assert.ok(west > north + 5, `west ${west} north ${north}`);
});

test('near-field urban DEM spikes do not define the drawn skyline', () => {
  const skyline = castSkyline(40.64, -74.09, 8, (_lat, _lng, distance) => {
    if (distance < 2_000) {
      const bump = Math.floor(distance / 80) % 7 === 0;
      return bump ? 95 : 8;
    }
    if (distance < 12_000) return 12 + distance * 0.0004;
    return 20;
  }, 1);
  const rawSpiky = skyline.rays.some((ray) => (
    ray.distanceM.some((d, i) => d < 500 && ray.angleDeg[i] > 25)
  ));
  assert.ok(rawSpiky, 'fixture should have steep near-field samples');
  const view = viewProfile(skyline);
  const angles = view.angleDeg;
  const max = Math.max(...angles);
  const maxStep = angles.reduce((worst, angle, index) => (
    index === 0 ? worst : Math.max(worst, Math.abs(angle - angles[index - 1]))
  ), 0);
  assert.ok(max < 8, `drawn max ${max}`);
  assert.ok(maxStep < 1.5, `step ${maxStep}`);
});
