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

test('map colors are red for foot, blue for biking, and orange for snow', () => {
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
