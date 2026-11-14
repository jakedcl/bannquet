import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveStationElevationFt } from '@/lib/mountain-weather/station-elevation-epqs';

test('keeps NWS elevation when within tolerance of EPQS', () => {
  const r = resolveStationElevationFt(4662, 4600, 200);
  assert.equal(r.elevationFt, 4662);
  assert.equal(r.rejectedNws, false);
});

test('rejects inflated CWOP metadata elevations', () => {
  const cases = [
    { nws: 7907, epqs: 4240 },
    { nws: 7438, epqs: 2150 },
    { nws: 6562, epqs: 680 },
    { nws: 3999, epqs: 1500 },
  ];
  for (const { nws, epqs } of cases) {
    const r = resolveStationElevationFt(nws, epqs, 200);
    assert.equal(r.elevationFt, epqs);
    assert.equal(r.rejectedNws, true);
  }
});