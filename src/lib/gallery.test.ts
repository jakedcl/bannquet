import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanHandle, encodeCursor, parseCursor } from './gallery';

test('gallery cursors round-trip and reject junk', () => {
  const cursor = { at: '2026-10-28T14:00:00.123Z', id: '0f5c42a0-0000-4000-8000-000000000001' };
  assert.deepEqual(parseCursor(encodeCursor(cursor)), cursor);
  assert.equal(parseCursor(''), null);
  assert.equal(parseCursor('yesterday~abc'), null);
  assert.equal(parseCursor(`not-a-date~${cursor.id}`), null);
  assert.equal(parseCursor(`${cursor.at}~${cursor.id}~x`), null);
});

test('the member filter only takes a plain handle', () => {
  assert.equal(cleanHandle('jkiddf'), 'jkiddf');
  assert.equal(cleanHandle(' tom_vans '), 'tom_vans');
  assert.equal(cleanHandle("x' or 1=1"), null);
  assert.equal(cleanHandle(''), null);
});
