import assert from 'node:assert/strict';
import test from 'node:test';
import { photoMatchesRouteLink } from './photo-route-match';

const line: Array<[number, number]> = [[-73.9, 44.1], [-73.89, 44.11], [-73.88, 44.12]];

test('photo route match requires the same owner', () => {
  assert.equal(
    photoMatchesRouteLink({
      photoUserId: 'a',
      trackUserId: 'b',
      takenAt: '2026-06-01T12:30:00.000Z',
      startedAt: '2026-06-01T12:00:00.000Z',
      endedAt: '2026-06-01T14:00:00.000Z',
      lat: 44.105,
      lng: -73.895,
      line,
    }),
    false,
  );
  assert.equal(
    photoMatchesRouteLink({
      photoUserId: 'a',
      trackUserId: 'a',
      takenAt: '2026-06-01T12:30:00.000Z',
      startedAt: '2026-06-01T12:00:00.000Z',
      endedAt: '2026-06-01T14:00:00.000Z',
      lat: 44.105,
      lng: -73.895,
      line,
    }),
    true,
  );
});

test('photo route match skips when times are missing', () => {
  assert.equal(
    photoMatchesRouteLink({
      photoUserId: 'a',
      trackUserId: 'a',
      takenAt: null,
      startedAt: '2026-06-01T12:00:00.000Z',
      endedAt: '2026-06-01T14:00:00.000Z',
      lat: 44.105,
      lng: -73.895,
      line,
    }),
    false,
  );
});