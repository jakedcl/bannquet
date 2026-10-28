import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTripFields } from './trip-fields';

test('trip edits need a short name and a real date', () => {
  assert.deepEqual(cleanTripFields({ title: ' Marcy ', tripDate: '2026-11-01', notes: ' bring spikes ' }), {
    fields: { title: 'Marcy', tripDate: '2026-11-01', notes: 'bring spikes' },
  });
  assert.ok('error' in cleanTripFields({ title: '', tripDate: '2026-11-01', notes: '' }));
  assert.ok('error' in cleanTripFields({ title: 'x'.repeat(81), tripDate: '2026-11-01', notes: '' }));
  assert.ok('error' in cleanTripFields({ title: 'Marcy', tripDate: 'soon', notes: '' }));
  assert.ok('error' in cleanTripFields({ title: 'Marcy', tripDate: '2026-13-45', notes: '' }));
});
