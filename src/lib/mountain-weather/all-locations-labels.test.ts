import assert from 'node:assert/strict';
import { test } from 'node:test';

import { allLocationsSourceLinkLabel } from '@/lib/mountain-weather/all-locations-labels';

test('allLocationsSourceLinkLabel uses short office names', () => {
  assert.equal(allLocationsSourceLinkLabel('GYX'), 'Gray climate records');
  assert.equal(allLocationsSourceLinkLabel('CAR'), 'Caribou climate records');
  assert.equal(allLocationsSourceLinkLabel(undefined), 'NWS allLocations feed');
});