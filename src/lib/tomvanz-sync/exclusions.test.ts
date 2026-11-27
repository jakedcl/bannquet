import assert from 'node:assert/strict';
import test from 'node:test';
import { earlySyncGate } from './sync-one';

test('earlySyncGate skips draft ids and excluded Sanity docs', () => {
  assert.deepEqual(earlySyncGate('drafts.foo', false), {
    outcome: 'skipped',
    detail: 'Draft or version id.',
  });
  assert.deepEqual(earlySyncGate('live-id', true), { outcome: 'excluded' });
  assert.equal(earlySyncGate('live-id', false), null);
});