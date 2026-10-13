import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_REGION, REGION_WEATHER_SECTIONS, REGIONS, getRegionWeatherSpots } from './regions';

test('the northeast regions still drive the weather pages', () => {
  assert.deepEqual(REGIONS, ['ny', 'vt', 'nh', 'me']);
  assert.equal(DEFAULT_REGION, 'ny');
  const marcy = getRegionWeatherSpots('ny').find((spot) => spot.id === 'mt-marcy');
  assert.equal(marcy?.lat, 44.1128);
  assert.equal(marcy?.lon, -73.9237);
  assert.ok(REGION_WEATHER_SECTIONS.nh[0]?.banner?.href.includes('mountwashington.org'));
});
