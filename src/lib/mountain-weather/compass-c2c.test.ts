import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCompassEssXml, resolveCompassTimestamp } from '@/lib/mountain-weather/parse/compass-c2c';
import { tmddAirTempFahrenheit } from '@/lib/mountain-weather/parse/compass-ess-units';

const SAMPLE = `<status xmlns="http://its.gov/c2c_icd"><essData><net id="NewHampshire"><ess id="1374"><name>Test RWIS</name><lat>42753950</lat><lon>-71221000</lon><roadSurfaceCond>Dry</roadSurfaceCond><airTemp>-10</airTemp><pavementTemp>2</pavementTemp><timestamp>2026-11-14T07:29:00-05:00</timestamp></ess></net></essData></status>`;

test('parseCompassEssXml reads micro-degree coords', () => {
  const rows = parseCompassEssXml(SAMPLE);
  assert.equal(rows.length, 1);
  assert.ok(Math.abs(rows[0].lat - 42.75395) < 0.0001);
  assert.ok(Math.abs(rows[0].lon - -71.221) < 0.0001);
});

test('airTemp -10 is tenths °C (−1.0 °C ≈ 30.2 °F)', () => {
  assert.equal(tmddAirTempFahrenheit(-10), 30.2);
});

test('resolveCompassTimestamp uses clock-as-UTC when labeled time is far in the future', () => {
  const fetchAt = new Date('2026-11-14T07:35:00.000Z');
  const out = resolveCompassTimestamp('2026-11-14T07:29:00-05:00', fetchAt, false);
  assert.equal(out.interpretation, 'unconfirmed');
  assert.ok(out.etLabel?.includes('2:29'));
  assert.match(out.note, /clock-as-UTC|30 min/);
});

test('resolveCompassTimestamp rejects unfixable future stamps', () => {
  const fetchAt = new Date('2026-11-14T07:35:00.000Z');
  const out = resolveCompassTimestamp('2030-01-01T12:00:00-05:00', fetchAt, false);
  assert.equal(out.interpretation, 'rejected-future');
  assert.equal(out.instant, null);
});