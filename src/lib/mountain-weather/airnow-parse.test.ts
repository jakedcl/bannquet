import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  airNowQueryHourRange,
  airNowWebServiceErrorMessage,
  isAirNowWebServiceError,
  parseAirNowDataRows,
  pickAirNowForPlace,
} from '@/lib/mountain-weather/parse/airnow-data';

const FIX = path.resolve(process.cwd(), 'src/lib/mountain-weather/fixtures');

test('parseAirNowDataRows reads verbose monitor rows', () => {
  const text = readFileSync(path.join(FIX, 'airnow-data-sample.json'), 'utf8');
  const rows = parseAirNowDataRows(text);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].siteName, 'Waterbury');
  assert.equal(rows[0].category, 'Good');
});

test('parseAirNowDataRows treats WebServiceError as outage', () => {
  const text = JSON.stringify({
    WebServiceError: [{ Message: 'This web service has been retired as of October 1, 2026' }],
  });
  assert.throws(() => parseAirNowDataRows(text), /retired/);
  const parsed = JSON.parse(text);
  assert.ok(isAirNowWebServiceError(parsed));
  assert.match(airNowWebServiceErrorMessage(parsed), /retired/);
});

test('pickAirNowForPlace chooses nearest monitor per parameter', () => {
  const text = readFileSync(path.join(FIX, 'airnow-data-sample.json'), 'utf8');
  const rows = parseAirNowDataRows(text);
  const now = new Date('2026-11-14T16:30:00Z');
  const place = pickAirNowForPlace(rows, 44.1601, -72.9288, now);
  assert.ok(place);
  assert.equal(place.parameters.length, 2);
  const pm = place.parameters.find((p) => p.parameter === 'PM25');
  assert.ok(pm);
  assert.equal(pm.siteName, 'Waterbury');
  assert.ok(pm.distanceMi < 30);
  assert.equal(pm.distant, false);
  assert.equal(pm.ageMinutes, 30);
  assert.equal(place.primary?.parameter, 'OZONE');
  assert.equal(place.primary?.aqi, 44);
});

test('pickAirNowForPlace marks monitors beyond 25 mi as distant', () => {
  const rows = parseAirNowDataRows(readFileSync(path.join(FIX, 'airnow-data-sample.json'), 'utf8'));
  const now = new Date('2026-11-14T16:30:00Z');
  const place = pickAirNowForPlace(rows, 43.9, -71.2, now);
  assert.ok(place);
  assert.ok(place.parameters.every((p) => p.distant));
});

test('categoryLabel maps EPA category numbers to names', () => {
  const text = JSON.stringify([
    {
      Latitude: 44.2,
      Longitude: -73.5,
      UTC: '2026-11-14T16:00:00',
      Parameter: 'OZONE',
      AQI: 16,
      Category: 1,
      SiteName: 'Test Peak',
    },
  ]);
  const rows = parseAirNowDataRows(text);
  assert.equal(rows[0].category, 'Good');
});

test('airNowQueryHourRange uses UTC hour buckets', () => {
  const now = new Date('2026-11-14T16:45:00Z');
  const range = airNowQueryHourRange(2, now);
  assert.equal(range.end, '2026-11-14T16');
  assert.equal(range.start, '2026-11-14T14');
});