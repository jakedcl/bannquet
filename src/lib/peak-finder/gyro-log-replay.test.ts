import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import fixture from './fixtures/gyrolog-iphone-trimmed.json';
import { projectDirection } from './projection';
import { clampGyroViewPitch, deviceCameraPose } from './orientation';

type FixtureSample = {
  step: string | null;
  alpha: number;
  beta: number;
  gamma: number;
  screenAngle: number;
  yawOffset: number;
  expectHeading?: number;
  expectPitch?: number;
};

type Fixture = { samples: FixtureSample[] };

const data = fixture as Fixture;

function median(nums: number[]): number {
  if (nums.length === 0) return NaN;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function stepHeadings(step: string): number[] {
  return data.samples
    .filter((s) => s.step === step)
    .map((s) => deviceCameraPose(
      { alpha: s.alpha, beta: s.beta, gamma: s.gamma },
      s.screenAngle,
      { offset: s.yawOffset, ready: true },
    ))
    .filter((p): p is NonNullable<typeof p> => p != null)
    .map((p) => p.magneticHeading);
}

function stepPitches(step: string): number[] {
  return data.samples
    .filter((s) => s.step === step)
    .map((s) => deviceCameraPose(
      { alpha: s.alpha, beta: s.beta, gamma: s.gamma },
      s.screenAngle,
      { offset: s.yawOffset, ready: true },
    ))
    .filter((p): p is NonNullable<typeof p> => p != null)
    .map((p) => clampGyroViewPitch(p.pitch));
}

test('positive view pitch moves the horizon down on screen', () => {
  const width = 390;
  const height = 700;
  const atHorizon = projectDirection(0, 0, 0, 0, 0, 68, width, height).y;
  const lookingUp = projectDirection(0, 0, 0, 45, 0, 68, width, height).y;
  const lookingDown = projectDirection(0, 0, 0, -45, 0, 68, width, height).y;
  assert.ok(lookingUp > atHorizon);
  assert.ok(lookingDown < atHorizon);
});

test('iPhone log replay: upright headings stay on north and east', () => {
  assert.ok(Math.abs(median(stepHeadings('Upright N')) - 11) < 3);
  assert.ok(Math.abs(median(stepHeadings('Upright E')) - 98) < 3);
});

test('iPhone log replay: sky and ground pitches have opposite signs', () => {
  const sky = stepPitches('Tilt up');
  const ground = stepPitches('Tilt down');
  assert.ok(Math.max(...sky) > 70, 'sky pitch should reach strongly positive');
  assert.ok(Math.min(...ground) < -70, 'ground pitch should reach strongly negative');
  assert.ok(median(sky.filter((p) => p > 20)) > 45, 'committed sky samples stay positive');
});

test('iPhone log replay: roll keeps heading within a few degrees', () => {
  const headings = stepHeadings('Roll');
  assert.ok(headings.length > 5);
  const span = Math.max(...headings) - Math.min(...headings);
  assert.ok(span < 5, `span ${span}`);
});

test('trimmed fixture file is present', () => {
  const file = path.join(import.meta.dirname, 'fixtures/gyrolog-iphone-trimmed.json');
  assert.ok(fs.statSync(file).size > 1000);
});
