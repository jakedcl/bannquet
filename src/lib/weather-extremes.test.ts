import assert from 'node:assert/strict';
import test from 'node:test';
import { extremeStatsFromSpots, type ExtremeSpot } from './weather-extremes';

const spots: ExtremeSpot[] = [
  {
    mountain: 'Marcy',
    state: 'Adirondacks',
    temperature: 18,
    minTemperature: 10,
    maxTemperature: 22,
    windChill: 4,
    windSpeed: 20,
    windGust: 35,
    isSnowing: true,
  },
  {
    mountain: 'Washington',
    state: 'White Mountains',
    temperature: 12,
    minTemperature: 8,
    maxTemperature: 30,
    windChill: -2,
    windSpeed: 40,
    windGust: 55,
    isSnowing: false,
  },
];

test('live conditions pick the same extremes the banner scrolls', () => {
  const stats = extremeStatsFromSpots(spots);
  const byLabel = Object.fromEntries(stats.map((stat) => [stat.label, stat]));
  assert.equal(byLabel['HIGHEST WIND'].value, '55mph');
  assert.equal(byLabel['HIGHEST WIND'].location, 'Washington, White Mountains');
  assert.equal(byLabel['HIGHEST TEMP'].value, '30°F');
  assert.equal(byLabel['LOWEST TEMP'].value, '8°F');
  assert.equal(byLabel['LOWEST TEMP'].location, 'Washington, White Mountains');
  assert.equal(byLabel['LOWEST WIND CHILL'].value, '-2°F');
  assert.equal(byLabel['SNOWING NOW'].value, 'Marcy');
});

test('a dry set of spots leaves snow off the banner', () => {
  const stats = extremeStatsFromSpots(spots.map((spot) => ({ ...spot, isSnowing: false })));
  assert.equal(stats.some((stat) => stat.label === 'SNOWING NOW'), false);
});
