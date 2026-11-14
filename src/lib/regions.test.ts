import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_REGION, REGIONS, REGION_MAP_CONFIG } from './regions';

test('weather region catalog loads', () => {
  assert.ok(REGIONS.includes('ny'));
  assert.ok(REGIONS.includes('nh'));
  assert.equal(DEFAULT_REGION, 'ny');
  assert.ok(REGION_MAP_CONFIG.nh.center.length === 2);
});