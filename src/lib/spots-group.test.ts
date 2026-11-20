import assert from 'node:assert/strict';
import test from 'node:test';
import { groupSpotsByStation } from '@/components/weather/SpotsTable';
import type { ExtremeSpot } from '@/lib/weather-extremes';

const base = { state: 'Vermont', temperature: 40, minTemperature: 38, maxTemperature: 41, windChill: 38, windSpeed: 0, windGust: null, isSnowing: false } as const;

test('peaks sharing a station become one row', () => {
  const rows = groupSpotsByStation([
    { ...base, mountain: "Camel's Hump", stationId: 'WRSV1' },
    { ...base, mountain: 'Bolton', stationId: 'WRSV1' },
    { ...base, mountain: 'Mansfield', stationId: 'MMNV1' },
  ] as ExtremeSpot[]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].mountain, "Camel's Hump, Bolton");
});
