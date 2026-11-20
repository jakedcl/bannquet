import assert from 'node:assert/strict';
import test from 'node:test';
import { discussionHeading, formatClock12, formatEt, formatObservationAge, gridElevationNote, reflowProductText } from '@/lib/mountain-weather/format-display';

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

test('grid elevation note says how far the place is above the forecast cell', () => {
  assert.equal(
    gridElevationNote(5650, 6288, false),
    'Forecast is for 5,650 ft. The summit is 638 ft higher, so expect about 2° colder.',
  );
  assert.equal(gridElevationNote(1200, 1030, true), 'Forecast is for 1,200 ft, close to this spot (1,030 ft).');
  assert.equal(gridElevationNote(2000, 1000, true), 'Forecast is for 2,000 ft. This spot is 1,000 ft lower, so expect about 4° warmer.');
  assert.equal(gridElevationNote(null, 6288, false), null);
});

test('NWS product text reflows into paragraphs, keeping list lines', () => {
  const text = 'Gusty west winds\ncontinue tonight.\n\n- Rain Sunday\nnight.\n- Colder Tuesday.';
  assert.deepEqual(reflowProductText(text), ['Gusty west winds continue tonight.', '- Rain Sunday night.\n- Colder Tuesday.']);
});

test('discussion headings read as words', () => {
  assert.equal(discussionHeading('.KEY MESSAGES...'), 'Key messages');
  assert.equal(discussionHeading('.AVIATION /00Z FRIDAY THROUGH TUESDAY/...'), 'Aviation (00Z Friday through Tuesday)');
});

test('office codes in discussion headings stay capitalized', () => {
  assert.equal(discussionHeading('.GYX WATCHES/WARNINGS/ADVISORIES...'), 'GYX watches/warnings/advisories');
});
