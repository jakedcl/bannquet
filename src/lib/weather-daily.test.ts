import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDailyHighLow } from './weather';
import { dailyHighLowFromSnippets } from './weather-glance';
import type { ForecastPeriod } from '@/types/weather';

const period = (name: string, startTime: string, isDaytime: boolean, temperature: number) =>
  ({ name, startTime, isDaytime, temperature, windSpeed: '10 mph', shortForecast: 'Sunny' }) as unknown as ForecastPeriod;

// Mount Washington, Thu Nov 19 2026 at 8 PM ET: the forecast starts at night.
const periods = [
  period('Tonight', '2026-11-19T20:00:00-05:00', false, 29),
  period('Friday', '2026-11-20T06:00:00-05:00', true, 36),
  period('Friday Night', '2026-11-20T18:00:00-05:00', false, 23),
  period('Saturday', '2026-11-21T06:00:00-05:00', true, 38),
  period('Saturday Night', '2026-11-21T18:00:00-05:00', false, 24),
];

test('each day pairs its high with the night that follows, never the night before', () => {
  const daily = buildDailyHighLow(periods, 7);
  assert.deepEqual(
    daily.map((d) => [d.name, d.temperature, d.secondaryTemp]),
    [['Tonight', 29, undefined], ['Fri', 36, 23], ['Sat', 38, 24]],
  );
  assert.equal(daily[0].isDaytime, false);
});

test('glance high/low after dark: tonight low, tomorrow high', () => {
  assert.deepEqual(dailyHighLowFromSnippets(buildDailyHighLow(periods, 7)), { high: 36, low: 29 });
});
