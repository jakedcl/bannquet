import assert from 'node:assert/strict';
import test from 'node:test';
import {
  alertLabel,
  fullWeekday,
  glancePhrase,
  maxGustMph,
  parseMph,
  summitHighLow,
  dailyHighLowFromSnippets,
  formatWindSummary,
  type GlancePeriod,
} from './weather-glance';

const now = new Date('2026-10-16T16:00:00.000Z');

function period(overrides: Partial<GlancePeriod> = {}): GlancePeriod {
  return {
    name: 'Saturday',
    startTime: '2026-10-17T14:00:00.000Z',
    endTime: '2026-10-17T20:00:00.000Z',
    temperature: 48,
    isDaytime: true,
    precip: 10,
    windMph: 12,
    shortForecast: 'Partly Sunny',
    icon: null,
    ...overrides,
  };
}

test('days are spelled in full', () => {
  assert.equal(fullWeekday('2026-10-17T15:00:00.000Z'), 'Saturday');
  assert.equal(fullWeekday('2026-10-14T15:00:00.000Z'), 'Wednesday');
  const phrase = glancePhrase({
    periods: [period({ name: 'Wednesday', startTime: '2026-10-14T14:00:00.000Z', endTime: '2026-10-14T20:00:00.000Z', precip: 70 })],
    maxGustMph: null,
    now: new Date('2026-10-14T12:00:00.000Z'),
  });
  assert.equal(phrase, 'Rain Wednesday');
  assert.doesNotMatch(phrase, /\b(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b/);
});

test('rain above 50 percent within 48 hours names the day', () => {
  assert.equal(glancePhrase({
    periods: [period({ precip: 60, shortForecast: 'Showers' })],
    maxGustMph: 10,
    now,
  }), 'Rain Saturday');
  assert.equal(glancePhrase({
    periods: [period({ name: 'Tonight', startTime: '2026-10-16T22:00:00.000Z', endTime: '2026-10-17T10:00:00.000Z', precip: 80, shortForecast: 'Showers' })],
    maxGustMph: null,
    now,
  }), 'Rain tonight');
  assert.equal(glancePhrase({
    periods: [period({ precip: 50 })],
    maxGustMph: null,
    now,
  }), 'Partly Sunny');
});

test('snow and ice use their own words', () => {
  assert.equal(glancePhrase({
    periods: [period({ precip: 70, shortForecast: 'Snow Showers' })],
    maxGustMph: null,
    now,
  }), 'Snow Saturday');
  assert.equal(glancePhrase({
    periods: [period({ precip: 70, shortForecast: 'Freezing Rain' })],
    maxGustMph: null,
    now,
  }), 'Icy Saturday');
});

test('gusts above 40 mph say windy above treeline', () => {
  assert.equal(glancePhrase({
    periods: [period({ temperature: 50, precip: 0 })],
    maxGustMph: 41,
    now,
  }), 'Windy above treeline');
  assert.equal(glancePhrase({
    periods: [period({ temperature: 50, precip: 0 })],
    maxGustMph: 40,
    now,
  }), 'Partly Sunny');
});

test('a temperature under 32 says below freezing', () => {
  assert.equal(glancePhrase({
    periods: [period({
      name: 'Tonight',
      startTime: '2026-10-16T22:00:00.000Z',
      endTime: '2026-10-17T10:00:00.000Z',
      temperature: 28,
      isDaytime: false,
      precip: 0,
      shortForecast: 'Clear',
    })],
    maxGustMph: 10,
    now,
  }), 'Below freezing tonight');
  assert.equal(glancePhrase({
    periods: [period({ name: 'Saturday Night', temperature: 31, isDaytime: false, precip: 0, shortForecast: 'Clear' })],
    maxGustMph: null,
    now,
  }), 'Below freezing Saturday');
  assert.equal(glancePhrase({
    periods: [period({ temperature: 32, precip: 0 })],
    maxGustMph: null,
    now,
  }), 'Partly Sunny');
});

test('rain outranks wind, and wind outranks freezing', () => {
  assert.equal(glancePhrase({
    periods: [period({ precip: 90, temperature: 20, shortForecast: 'Rain' })],
    maxGustMph: 55,
    now,
  }), 'Rain Saturday');
  assert.equal(glancePhrase({
    periods: [period({ precip: 10, temperature: 20 })],
    maxGustMph: 55,
    now,
  }), 'Windy above treeline');
});

test('a wet period outside 48 hours is ignored', () => {
  assert.equal(glancePhrase({
    periods: [period({
      name: 'Monday',
      startTime: '2026-10-19T14:00:00.000Z',
      endTime: '2026-10-19T20:00:00.000Z',
      precip: 90,
      shortForecast: 'Showers',
    })],
    maxGustMph: null,
    now,
  }), 'Quiet for now');
});

test('summit high and low use the next day pair', () => {
  assert.deepEqual(summitHighLow([
    period({ temperature: 42 }),
    period({ name: 'Saturday Night', temperature: 28, isDaytime: false }),
  ]), { high: 42, low: 28 });
});

test('daily NWS rows use secondaryTemp for overnight low', () => {
  assert.deepEqual(
    dailyHighLowFromSnippets([
      { temperature: 25, secondaryTemp: 18, startTime: '2026-11-15T12:00:00Z' },
      { temperature: 30, secondaryTemp: 22, startTime: '2026-11-16T12:00:00Z' },
    ]),
    { high: 25, low: 18 },
  );
});

test('formatWindSummary keeps sustained and gust separate', () => {
  assert.equal(formatWindSummary(12, 25).line, 'Wind up to 12 mph, gusts to 25');
  assert.equal(formatWindSummary(12, null).line, 'Wind up to 12 mph');
  assert.equal(formatWindSummary(null, 20).line, 'Gusts to 20 mph');
});

test('summit high/low use today high and tonight low, not two daytime periods', () => {
  assert.deepEqual(summitHighLow([
    period({ name: 'Today', temperature: 23, isDaytime: true }),
    period({ name: 'Tonight', temperature: 20, isDaytime: false }),
    period({ name: 'Sunday', temperature: 18, isDaytime: true }),
  ]), { high: 23, low: 20 });
});

test('wind text and gusts become miles per hour', () => {
  assert.equal(parseMph('15 to 25 mph'), 25);
  assert.equal(parseMph(''), null);
  const gust = maxGustMph([
    { validTime: '2026-10-16T18:00:00.000Z/PT1H', value: 20 },
    { validTime: '2026-10-19T18:00:00.000Z/PT1H', value: 40 },
  ], 'wmoUnit:m_s-1', now);
  assert.ok(gust != null && gust > 44 && gust < 45);
});

test('the sharpest active alert is the label', () => {
  assert.equal(alertLabel([
    { event: 'Wind Advisory', severity: 'Minor' },
    { event: 'Winter Storm Warning', severity: 'Severe' },
  ]), 'Winter Storm Warning');
  assert.equal(alertLabel([]), null);
});
