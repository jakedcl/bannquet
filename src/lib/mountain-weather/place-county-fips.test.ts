import assert from 'node:assert/strict';
import test from 'node:test';
import { countyFipsForPlace } from '@/lib/mountain-weather/place-county-fips';

test('mount marcy resolves Essex county FIPS', () => {
  assert.equal(countyFipsForPlace('mount-marcy'), '36031');
});