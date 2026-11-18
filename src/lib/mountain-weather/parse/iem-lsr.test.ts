import assert from 'node:assert/strict';
import test from 'node:test';
import { parseIemLsrSnowGeoJson } from '@/lib/mountain-weather/parse/iem-lsr';
import { localSnowReports } from '@/lib/mountain-weather/local-snow-reports';

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
      id: 'pa-1',
      properties: {
        typetext: 'Snow',
        valid: '2025-11-10T10:00:00Z',
        city: 'Seven Springs',
        county: 'Somerset',
        state: 'PA',
        magnitude: 3,
        unit: 'in',
      },
      geometry: { coordinates: [-79.3, 40.02] },
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
  assert.ok(rows.every((r) => ['NY', 'VT'].includes(r.state ?? '')));
  assert.equal(rows.some((r) => r.state === 'CO'), false);
  assert.equal(rows.some((r) => r.state === 'PA'), false);
});

test('place reports exclude distant events and duplicate IDs while retaining nearby events', () => {
  const near = { id: 'one', valid: '2026-11-15T12:00:00Z', city: 'Keene', county: 'Essex', state: 'NY', lat: 44.2, lon: -73.9, magnitude: 6, unit: 'in', remark: null };
  const rows = localSnowReports([
    { ...near, id: 'other-feed-id' },
    { ...near, lat: 42.6, lon: -75.1, city: 'Otsego' },
    near,
    { ...near, id: 'bad-coordinates', lat: 999 },
    { ...near, id: 'old', valid: '2026-10-01T12:00:00Z' },
  ], { lat: 44.1, lon: -73.9 }, Date.parse('2026-11-16T12:00:00Z'));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].city, 'Keene');
  assert.ok((rows[0].distanceMi ?? Infinity) < 35);
  assert.deepEqual(localSnowReports([], { lat: 44.1, lon: -73.9 }), []);
});
