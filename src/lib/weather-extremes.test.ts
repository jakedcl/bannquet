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
  assert.equal(byLabel['HIGHEST WIND'].value, '40 mph, gusts 55');
  assert.equal(byLabel['HIGHEST WIND'].location, 'Washington, White Mountains');
  assert.equal(byLabel['HIGHEST TEMP'].value, '18°F');
  assert.equal(byLabel['COLDEST FEELS-LIKE'].value, '-2°F');
  assert.equal(byLabel['COLDEST FEELS-LIKE'].location, 'Washington, White Mountains');
  assert.equal(byLabel['LOWEST TEMP'], undefined);
  assert.equal(byLabel['LOWEST WIND CHILL'], undefined);
  assert.equal(byLabel['FORECAST SNOW CHANCE'], undefined);
});

test('measured extremes never include forecast snow', () => {
  const stats = extremeStatsFromSpots(spots);
  assert.equal(stats.some((stat) => stat.label === 'FORECAST SNOW CHANCE'), false);
});
