import assert from 'node:assert/strict';
import test from 'node:test';
import { freshnessFromIssued, mergeFreshness } from '@/lib/mountain-weather/freshness';

test('freshness marks old issuances stale when past twice the expected cadence', () => {
  const issued = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
  assert.equal(freshnessFromIssued(issued, 3), 'stale');
});

test('freshness stays ok inside twice the expected cadence', () => {
  const issued = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  assert.equal(freshnessFromIssued(issued, 3), 'ok');
});

test('mergeFreshness upgrades ok to stale without dropping data', () => {
  const merged = mergeFreshness('stale', { status: 'ok', data: { x: 1 } });
  assert.equal(merged.status, 'stale');
  assert.deepEqual(merged.data, { x: 1 });
});
