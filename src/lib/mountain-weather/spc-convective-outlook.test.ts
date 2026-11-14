import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import { parseSpcCycleToken } from '@/lib/mountain-weather/readers/spc-convective-outlook';

const SPC_BASE = 'https://www.spc.noaa.gov/products/outlook/';

test('SPC day 1/2/3 PNG URLs from live pages respond HTTP 200', async () => {
  const days = [
    { page: 'day1otlk.html', prefix: 'day1' },
    { page: 'day2otlk.html', prefix: 'day2' },
    { page: 'day3otlk.html', prefix: 'day3' },
  ] as const;
  for (const entry of days) {
    const pageUrl = `${SPC_BASE}${entry.page}`;
    const page = await fetchSourceBody(pageUrl);
    assert.equal(page.ok, true, pageUrl);
    const cycle = parseSpcCycleToken(page.text, entry.prefix);
    assert.ok(cycle, `cycle token for ${entry.page}`);
    const imageUrl = `${SPC_BASE}${entry.prefix}otlk_${cycle}.png`;
    const img = await fetchSourceBody(imageUrl);
    assert.equal(img.ok, true, imageUrl);
  }
});