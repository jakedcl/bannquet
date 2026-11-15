import assert from 'node:assert/strict';
import test from 'node:test';
import { formatEt, formatObservationAge } from '@/lib/mountain-weather/format-display';

test('formatEt uses America/New_York', () => {
  const label = formatEt('2026-11-15T18:30:00.000Z');
  assert.match(label, /Nov 15/);
  assert.match(label, /ET$/);
});

test('formatObservationAge', () => {
  assert.equal(formatObservationAge(null), 'observation time unknown');
  assert.equal(formatObservationAge(0), 'just now');
  assert.equal(formatObservationAge(45), '45 min ago');
  assert.equal(formatObservationAge(90), '2 hours ago');
});