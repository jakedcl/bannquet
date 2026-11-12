import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readAttachments } from '@/lib/post-attachments';

const PIN = '11111111-1111-4111-8111-111111111111';
const ROUTE = '22222222-2222-4222-8222-222222222222';

describe('readAttachments', () => {
  it('reads pin, route, and photo ids from form fields', () => {
    const form = new FormData();
    form.append('pin', PIN);
    form.append('route', ROUTE);
    form.append('title', 'ignored');
    const items = readAttachments(form);
    assert.deepEqual(items, [
      { kind: 'pin', id: PIN },
      { kind: 'route', id: ROUTE },
    ]);
  });

  it('dedupes and caps invalid ids', () => {
    const form = new FormData();
    form.append('pin', PIN);
    form.append('pin', PIN);
    form.append('pin', 'not-a-uuid');
    assert.equal(readAttachments(form).length, 1);
  });
});
