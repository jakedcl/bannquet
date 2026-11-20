import assert from 'node:assert/strict';
import test from 'node:test';
import { tidyLabel } from '@/lib/mountain-weather/page-sources';

test('all-caps product labels read in title case; mixed case is untouched', () => {
  assert.equal(tidyLabel('PRESIDENTIAL RANGE FORECAST AREA/MOUNT WASHINGTON (6,288 FT)'), 'Presidential Range Forecast Area/Mount Washington (6,288 ft)');
  assert.equal(tidyLabel('Mount Adams'), 'Mount Adams');
  assert.equal(tidyLabel(null), null);
});
