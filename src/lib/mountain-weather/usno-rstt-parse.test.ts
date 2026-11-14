import assert from 'node:assert/strict';
import test from 'node:test';
import { parseUsnoRsttDay } from '@/lib/mountain-weather/parse/usno-rstt';

const marcyBody = {
  properties: {
    data: {
      closestphase: { day: 17, month: 11, phase: 'First Quarter', time: '06:48', year: 2026 },
      curphase: 'Waxing Crescent',
      day: 14,
      day_of_week: 'Saturday',
      fracillum: '25%',
      isdst: false,
      label: null,
      month: 11,
      moondata: [
        { phen: 'Rise', time: '11:42' },
        { phen: 'Upper Transit', time: '16:05' },
        { phen: 'Set', time: '20:34' },
      ],
      sundata: [
        { phen: 'Begin Civil Twilight', time: '06:19' },
        { phen: 'Rise', time: '06:50' },
        { phen: 'Upper Transit', time: '11:40' },
        { phen: 'Set', time: '16:30' },
        { phen: 'End Civil Twilight', time: '17:01' },
      ],
      tz: -5,
      year: 2026,
    },
  },
};

test('parseUsnoRsttDay computes Mount Marcy day length sample', () => {
  const day = parseUsnoRsttDay('2026-11-14', 'https://example.test', marcyBody);
  assert.equal(day.dayLength, '9h 40m');
  assert.equal(day.sunEvents.length, 5);
  assert.equal(day.moonEvents.length, 3);
  assert.equal(day.curphase, 'Waxing Crescent');
});