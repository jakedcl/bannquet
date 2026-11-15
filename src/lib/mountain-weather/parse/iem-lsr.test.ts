import assert from 'node:assert/strict';
import test from 'node:test';
import { parseIemLsrSnowGeoJson } from '@/lib/mountain-weather/parse/iem-lsr';

const fixture = {
  type: 'FeatureCollection',
  features: [
    {
      id: 'ny-1',
      properties: {
        typetext: 'Heavy Snow',
        valid: '2025-11-10T12:00:00Z',
        city: 'Keene',
        county: 'Essex',
        state: 'NY',
        magnitude: 6,
        unit: 'in',
      },
      geometry: { coordinates: [-73.9, 44.2] },
    },
    {
      id: 'co-1',
      properties: {
        typetext: 'Snow',
        valid: '2025-11-10T11:00:00Z',
        city: 'Denver',
        county: 'Denver',
        state: 'CO',
        magnitude: 4,
        unit: 'in',
      },
      geometry: { coordinates: [-104.9, 39.7] },
    },
    {
      id: 'vt-1',
      properties: {
        typetext: 'Light Snow',
        valid: '2025-11-09T18:00:00Z',
        city: 'Stowe',
        county: 'Lamoille',
        state: 'VT',
        magnitude: 2,
        unit: 'in',
      },
      geometry: { coordinates: [-72.7, 44.5] },
    },
  ],
};

test('parseIemLsrSnowGeoJson drops out-of-region LSR states', () => {
  const rows = parseIemLsrSnowGeoJson(JSON.stringify(fixture));
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r) => r.state === 'NY' || r.state === 'VT'));
  assert.equal(rows.some((r) => r.state === 'CO'), false);
});