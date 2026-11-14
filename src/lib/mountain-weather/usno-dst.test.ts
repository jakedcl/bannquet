import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import { normalizeUsnoClock } from '@/lib/mountain-weather/parse/usno-rstt';

const MARCY = '44.1126,-73.9235';
const BASE = 'https://aa.usno.navy.mil/api/rstt/oneday';

async function sunriseFor(date: string): Promise<string> {
  const url = `${BASE}?date=${date}&coords=${MARCY}&tz=-5&dst=true`;
  const res = await fetchSourceBody(url);
  assert.equal(res.ok, true, url);
  const body = JSON.parse(res.text) as { properties?: { data?: { sundata?: { phen: string; time: string }[] } } };
  const rise = body.properties?.data?.sundata?.find((r) => r.phen === 'Rise')?.time;
  assert.ok(rise);
  return normalizeUsnoClock(rise).clock;
}

test('USNO Mount Marcy sunrise uses DST in July and standard time in November', async () => {
  const july = await sunriseFor('2026-07-01');
  const november = await sunriseFor('2026-11-14');
  assert.equal(july, '05:16');
  assert.equal(november, '06:50');
});