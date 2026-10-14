import assert from 'node:assert/strict';
import test from 'node:test';
import { ACTIVITIES, MAP_GROUPS, mapColorForActivity, pickMostDoneActivity, sortLoggedActivities } from './activities';

test('every activity belongs to one map group', () => {
  const seen = new Map<string, string>();
  for (const [group, meta] of Object.entries(MAP_GROUPS)) {
    for (const activity of meta.activities) {
      assert.equal(seen.has(activity), false, `${activity} is in more than one group`);
      seen.set(activity, group);
    }
  }
  assert.deepEqual([...seen.keys()].sort(), [...ACTIVITIES].sort());
});

test('the on-foot group keeps its internal id and a readable label', () => {
  assert.equal(MAP_GROUPS.foot.label, 'On foot');
});

test('map colors are red for on foot, blue for biking, and orange for snow', () => {
  assert.equal(mapColorForActivity('hike'), '#c0392b');
  assert.equal(mapColorForActivity('walk'), mapColorForActivity('hike'));
  assert.equal(mapColorForActivity('run'), mapColorForActivity('hike'));
  assert.equal(mapColorForActivity('trail_run'), mapColorForActivity('hike'));
  assert.equal(mapColorForActivity('bike'), '#1f4e9c');
  assert.equal(mapColorForActivity('ski'), '#e67e22');
  assert.equal(mapColorForActivity('snowboard'), mapColorForActivity('ski'));
  for (const color of Object.values(MAP_GROUPS).map((group) => group.color)) {
    assert.notEqual(color.toLowerCase(), '#2d5016');
  }
});

test('most-done activity follows upload counts, then the latest day', () => {
  assert.equal(pickMostDoneActivity([]), null);
  assert.equal(pickMostDoneActivity([
    { activity: 'hike', count: 2, latest: '2026-01-01' },
    { activity: 'bike', count: 3, latest: '2025-01-01' },
  ])?.activity, 'bike');
  assert.equal(pickMostDoneActivity([
    { activity: 'ski', count: 2, latest: '2026-02-01' },
    { activity: 'hike', count: 2, latest: '2026-03-01' },
  ])?.activity, 'hike');
  assert.equal(pickMostDoneActivity([
    { activity: 'snowboard', count: 1, latest: '2026-01-01' },
    { activity: 'bike', count: 1, latest: '2026-01-01' },
  ])?.activity, 'bike');
});

test('logged activities stay in count order', () => {
  assert.deepEqual(sortLoggedActivities([
    { activity: 'hike', count: 1, latest: '2026-01-01' },
    { activity: 'ski', count: 4, latest: '2026-01-02' },
    { activity: 'bike', count: 2, latest: '2026-01-03' },
    { activity: 'walk', count: 0, latest: '2026-01-04' },
  ]).map((row) => row.activity), ['ski', 'bike', 'hike']);
});
