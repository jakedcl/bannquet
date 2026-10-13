import assert from 'node:assert/strict';
import test from 'node:test';
import { ACTIVITIES, MAP_GROUPS, mapColorForActivity } from './activities';

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

test('map colors collapse to foot and wheels/snow', () => {
  const colors = new Set(ACTIVITIES.map((activity) => mapColorForActivity(activity)));
  assert.deepEqual([...colors].sort(), ['#1f4e9c', '#2d5016']);
  assert.equal(mapColorForActivity('hike'), mapColorForActivity('trail_run'));
  assert.equal(mapColorForActivity('bike'), mapColorForActivity('snowboard'));
});
