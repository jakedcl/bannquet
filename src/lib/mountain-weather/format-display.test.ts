import assert from 'node:assert/strict';
import test from 'node:test';
import { formatClock12, formatEt, formatObservationAge } from '@/lib/mountain-weather/format-display';

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
test('USNO 24-hour clock reads as 12-hour time', () => {
  assert.equal(formatClock12('06:46'), '6:46 AM');
  assert.equal(formatClock12('16:15'), '4:15 PM');
  assert.equal(formatClock12('00:05'), '12:05 AM');
  assert.equal(formatClock12('12:30'), '12:30 PM');
});
