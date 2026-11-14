import assert from 'node:assert/strict';
import test from 'node:test';
import { parseUsdmCountyLatest } from '@/lib/mountain-weather/parse/drought-usdm';

test('parseUsdmCountyLatest picks newest map week', () => {
  const text = JSON.stringify([
    {
      mapDate: '2025-11-04T00:00:00',
      fips: '36031',
      county: 'Essex County',
      state: 'NY',
      none: 0,
      d0: 100,
      d1: 89.15,
      d2: 1.76,
      d3: 0,
      d4: 0,
      validStart: '2025-11-04T00:00:00',
      validEnd: '2025-11-10T23:59:59',
      statisticFormatID: 1,
    },
    {
      mapDate: '2025-11-11T00:00:00',
      fips: '36031',
      county: 'Essex County',
      state: 'NY',
      none: 0,
      d0: 100,
      d1: 82.14,
      d2: 0,
      d3: 0,
      d4: 0,
      validStart: '2025-11-11T00:00:00',
      validEnd: '2025-11-17T23:59:59',
      statisticFormatID: 1,
    },
  ]);
  const row = parseUsdmCountyLatest(text, '36031');
  assert.equal(row?.mapDate, '2025-11-11');
  assert.equal(row?.dominant, 'D1');
});