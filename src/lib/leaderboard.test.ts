import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLeaderboards } from './leaderboard';

test('miles, elevation, and summits stay in their activity group', () => {
  const boards = buildLeaderboards([
    { userId: 'a', name: 'Ada', handle: 'ada', activity: 'hike', distanceM: 1000, elevGainM: 100, summits: 1 },
    { userId: 'a', name: 'Ada', handle: 'ada', activity: 'trail_run', distanceM: 500, elevGainM: 20, summits: 0 },
    { userId: 'b', name: 'Bea', handle: 'bea', activity: 'bike', distanceM: 8000, elevGainM: 40, summits: 0 },
    { userId: 'a', name: 'Ada', handle: 'ada', activity: 'ski', distanceM: 2000, elevGainM: 300, summits: 2 },
  ]);
  assert.equal(boards.foot[0]?.userId, 'a');
  assert.equal(boards.foot[0]?.distanceM, 1500);
  assert.equal(boards.foot[0]?.summits, 1);
  assert.equal(boards.bike[0]?.name, 'Bea');
  assert.equal(boards.snow[0]?.summits, 2);
  assert.equal(boards.snow.length, 1);
});
