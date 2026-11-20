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

test('missing wind gust stays null for JSON extremes', () => {
  const spot: ExtremeSpot = {
    mountain: 'Test',
    state: 'NY',
    temperature: 40,
    minTemperature: 40,
    maxTemperature: 40,
    windChill: 38,
    windSpeed: 10,
    windGust: null,
    isSnowing: false,
  };
  assert.equal(spot.windGust, null);
  const stats = extremeStatsFromSpots([spot]);
  assert.equal(stats[0]?.value, '10 mph');
});

test('shared valley station is attributed as one measurement', () => {
  const marcy: ExtremeSpot = { ...spots[0], stationId: 'KSLK', stationName: 'Adirondack Regional Airport', stationKind: 'valley' };
  const ampersand: ExtremeSpot = { ...marcy, mountain: 'Ampersand' };
  const stats = extremeStatsFromSpots([marcy, ampersand]);
  assert.equal(stats.length, 3);
  assert.match(stats[0].location, /Adirondack Regional Airport \(KSLK, valley station\)/);
});

test('wind and cold come from summit stations when any reported', () => {
  const valley: ExtremeSpot = { ...spots[0], mountain: 'Mansfield', windSpeed: 7, windGust: null, windChill: -10, stationId: 'KMPV', stationKind: 'valley' };
  const summit: ExtremeSpot = { ...spots[1], windSpeed: 41, windGust: null, windChill: 17, stationId: 'KMWN', stationKind: 'summit' };
  const byLabel = Object.fromEntries(extremeStatsFromSpots([valley, summit]).map((stat) => [stat.label, stat]));
  assert.equal(byLabel['HIGHEST SUMMIT WIND'].value, '41 mph');
  assert.equal(byLabel['COLDEST SUMMIT FEELS-LIKE'].value, '17°F');
  assert.equal(byLabel['HIGHEST TEMP'].value, '18°F');
});

test('with no summit station reporting, wind and cold are labeled valley', () => {
  const valley: ExtremeSpot = { ...spots[0], stationId: 'KMPV', stationKind: 'valley' };
  const labels = extremeStatsFromSpots([valley]).map((stat) => stat.label);
  assert.deepEqual(labels, ['HIGHEST VALLEY WIND', 'HIGHEST TEMP', 'COLDEST VALLEY FEELS-LIKE']);
});
