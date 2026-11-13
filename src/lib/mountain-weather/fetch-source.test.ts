import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSourceResult } from '@/lib/mountain-weather/fetch-source';

test('buildSourceResult isolates fetch failures', () => {
  const result = buildSourceResult({
    fetched: { ok: false, error: 'HTTP 503', sourceUrl: 'https://example.test' },
    parse: () => ({ value: 1 }),
  });
  assert.equal(result.status, 'error');
  assert.equal(result.data, null);
  assert.equal(result.error, 'HTTP 503');
});

test('buildSourceResult isolates parse failures', () => {
  const result = buildSourceResult({
    fetched: { ok: true, text: 'bad', issuedAt: null, sourceUrl: 'https://example.test' },
    parse: () => {
      throw new Error('bad xml');
    },
  });
  assert.equal(result.status, 'error');
  assert.match(result.error ?? '', /bad xml/);
});

test('buildSourceResult returns parsed data on success', () => {
  const result = buildSourceResult({
    fetched: { ok: true, text: '{"a":1}', issuedAt: 'Wed, 01 Jan 2025 00:00:00 GMT', sourceUrl: 'https://example.test' },
    parse: () => ({ a: 1 }),
  });
  assert.equal(result.status, 'ok');
  assert.deepEqual(result.data, { a: 1 });
});
