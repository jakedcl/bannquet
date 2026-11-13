import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCycleStartNy, formatMtnHourEt } from '@/lib/mountain-weather/parse/mtn-time';

test('parseCycleStartNy matches America/New_York wall clock when TZ=UTC', () => {
  const prev = process.env.TZ;
  process.env.TZ = 'UTC';
  const start = parseCycleStartNy('2026,10,13,18');
  if (prev === undefined) delete process.env.TZ;
  else process.env.TZ = prev;
  assert.ok(start);
  const hourEt = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false,
    }).format(start),
  );
  assert.equal(hourEt, 18);
  const label = formatMtnHourEt(start);
  assert.match(label, /Nov 13/);
});
