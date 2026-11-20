import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceCatalog } from '@/lib/mountain-weather/source-catalog';

test('every registry feed has a plain name and tab', () => {
  const { rows, stationCount } = sourceCatalog();
  assert.ok(rows.length > 30);
  assert.ok(stationCount > 10);
  const unnamed = rows.filter((row) => row.name === row.id || row.tab === 'Other').map((row) => row.id);
  assert.deepEqual(unnamed, [], `add these to PLAIN in source-catalog.ts: ${unnamed.join(', ')}`);
});
