import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeGridScalar } from '@/lib/mountain-weather/grid-display-units';

test('visibility wmoUnit:m converts to miles', () => {
  const mi = normalizeGridScalar(
    {
      uom: 'wmoUnit:m',
      values: [{ validTime: '2026-11-14T07:00:00+00:00/PT1H', value: 18533 }],
    },
    'visibility',
    Date.parse('2026-11-14T07:30:00+00:00'),
  );
  assert.ok(mi !== null);
  assert.ok(Math.abs(mi - 11.5) < 0.2, `expected ~11.5 mi, got ${mi}`);
});

test('temperature wmoUnit:degC converts to Fahrenheit', () => {
  const f = normalizeGridScalar(
    {
      uom: 'wmoUnit:degC',
      values: [{ validTime: '2026-11-14T07:00:00+00:00/PT1H', value: 0 }],
    },
    'temperature',
    Date.parse('2026-11-14T07:30:00+00:00'),
  );
  assert.equal(f, 32);
});

test('wind wmoUnit:km_h-1 converts to mph', () => {
  const mph = normalizeGridScalar(
    {
      uom: 'wmoUnit:km_h-1',
      values: [{ validTime: '2026-11-14T07:00:00+00:00/PT1H', value: 10 }],
    },
    'windSpeed',
    Date.parse('2026-11-14T07:30:00+00:00'),
  );
  assert.ok(mph !== null);
  assert.ok(Math.abs(mph - 6.2) < 0.05);
});

test('QPF wmoUnit:mm converts to inches', () => {
  const inches = normalizeGridScalar(
    {
      uom: 'wmoUnit:mm',
      values: [{ validTime: '2026-11-14T07:00:00+00:00/PT1H', value: 25.4 }],
    },
    'precipInches',
    Date.parse('2026-11-14T07:30:00+00:00'),
  );
  assert.ok(inches !== null);
  assert.ok(Math.abs(inches - 1) < 0.02);
});

test('relative humidity percent is pass-through', () => {
  const rh = normalizeGridScalar(
    {
      uom: 'wmoUnit:percent',
      values: [{ validTime: '2026-11-14T07:00:00+00:00/PT1H', value: 72 }],
    },
    'percent',
    Date.parse('2026-11-14T07:30:00+00:00'),
  );
  assert.equal(rh, 72);
});