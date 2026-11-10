import assert from 'node:assert/strict';
import test from 'node:test';
import { castSkyline, skylineAngle } from './skyline';

test('a flat plain gives a flat horizon', () => {
  const skyline = castSkyline(44, -74, 1.7, () => 0, 10);
  const angles = skyline.rays.map((ray) => skylineAngle(ray));
  const min = Math.min(...angles);
  const max = Math.max(...angles);
  assert.ok(max - min < 0.05, `${min} to ${max}`);
  assert.ok(max < 0 && max > -1, String(max));
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
