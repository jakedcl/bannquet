import assert from 'node:assert/strict';
import test from 'node:test';
import { feelsLikeF, gridValueAt, windChillF, windMphFromText } from './feels-like';

test('58°F with 23 mph wind feels like 58°F, not a wind chill', () => {
  assert.equal(feelsLikeF({ tempF: 58, windMph: 23 }), 58);
});

test('wind chill applies at 50°F or colder with wind over 3 mph', () => {
  assert.equal(feelsLikeF({ tempF: 50, windMph: 20 }), Math.round(windChillF(50, 20)));
  assert.ok(feelsLikeF({ tempF: 50, windMph: 20 }) < 50);
  assert.equal(feelsLikeF({ tempF: 20, windMph: 30 }), 1);
  assert.equal(feelsLikeF({ tempF: 30, windMph: 3 }), 30);
});

test('heat index only applies at 80°F or warmer', () => {
  assert.equal(feelsLikeF({ tempF: 70, windMph: 5, heatIndexF: 75 }), 70);
  assert.equal(feelsLikeF({ tempF: 90, windMph: 5, heatIndexF: 98 }), 98);
  assert.equal(feelsLikeF({ tempF: 90, windMph: 5, heatIndexF: null }), 90);
});

test('wind text uses the top of a range instead of gluing digits together', () => {
  assert.equal(windMphFromText('15 mph'), 15);
  assert.equal(windMphFromText('10 to 20 mph'), 20);
  assert.equal(windMphFromText(12.4), 12);
  assert.equal(windMphFromText(undefined), 0);
});

test('grid values come from the interval valid now, not the first entry', () => {
  const values = [
    { validTime: '2026-11-04T04:00:00+00:00/PT3H', value: 4 },
    { validTime: '2026-11-04T07:00:00+00:00/PT6H', value: 14 },
    { validTime: '2026-11-04T13:00:00+00:00/P1DT2H', value: 9 },
  ];
  assert.equal(gridValueAt(values, Date.parse('2026-11-04T08:30:00Z')), 14);
  assert.equal(gridValueAt(values, Date.parse('2026-11-05T10:00:00Z')), 9);
  assert.equal(gridValueAt(values, Date.parse('2026-11-09T00:00:00Z')), 4);
  assert.equal(gridValueAt([], Date.now()), null);
});
