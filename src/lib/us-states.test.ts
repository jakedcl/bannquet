import assert from 'node:assert/strict';
import test from 'node:test';
import { US_STATES, homeStateCode, homeStateLabel } from './us-states';

test('home state is every US state plus DC', () => {
  assert.equal(US_STATES.length, 51);
  assert.equal(new Set(US_STATES.map((state) => state.code)).size, 51);
  assert.ok(US_STATES.some((state) => state.code === 'DC' && state.name === 'District of Columbia'));
  assert.ok(US_STATES.some((state) => state.code === 'CA'));
});

test('older weather-region values map onto state names', () => {
  assert.equal(homeStateCode('ny'), 'NY');
  assert.equal(homeStateCode('VT'), 'VT');
  assert.equal(homeStateCode('New Hampshire'), 'NH');
  assert.equal(homeStateCode('maine'), 'ME');
  assert.equal(homeStateLabel('ny'), 'New York');
  assert.equal(homeStateLabel('California'), 'California');
  assert.equal(homeStateCode(''), null);
  assert.equal(homeStateCode('northeast'), null);
});
