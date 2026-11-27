import assert from 'node:assert/strict';
import test from 'node:test';
import { sanityRevIsNewer } from './rev';

test('sanityRevIsNewer treats missing stored rev as stale', () => {
  assert.equal(sanityRevIsNewer(null, '2026-01-01T00:00:00Z'), true);
});

test('sanityRevIsNewer compares _updatedAt timestamps', () => {
  assert.equal(sanityRevIsNewer('2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z'), true);
  assert.equal(sanityRevIsNewer('2026-01-03T00:00:00Z', '2026-01-02T00:00:00Z'), false);
  assert.equal(sanityRevIsNewer('2026-01-02T00:00:00Z', '2026-01-02T00:00:00Z'), false);
});