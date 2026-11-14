import assert from 'node:assert/strict';
import test from 'node:test';
import { compassTimestampToEtLabel, parseCompassEssXml } from '@/lib/mountain-weather/parse/compass-c2c';

const SAMPLE = `<status xmlns="http://its.gov/c2c_icd"><essData><net id="NewHampshire"><ess id="1374"><name>Test RWIS</name><lat>42753950</lat><lon>-71221000</lon><roadSurfaceCond>Dry</roadSurfaceCond><airTemp>-10</airTemp><timestamp>2026-11-14T07:29:00-05:00</timestamp></ess></net></essData></status>`;

test('parseCompassEssXml reads micro-degree coords', () => {
  const rows = parseCompassEssXml(SAMPLE);
  assert.equal(rows.length, 1);
  assert.ok(Math.abs(rows[0].lat - 42.75395) < 0.0001);
  assert.ok(Math.abs(rows[0].lon - -71.221) < 0.0001);
});

test('compassTimestampToEtLabel treats offset as local, not UTC', () => {
  const out = compassTimestampToEtLabel('2026-07-01T12:00:00-04:00');
  assert.ok(out.etLabel?.includes('Jul'));
  assert.match(out.note, /offset-local/);
});