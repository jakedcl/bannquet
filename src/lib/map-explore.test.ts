import assert from 'node:assert/strict';
import test from 'node:test';
import {
  emptyFilters,
  exploreData,
  filterOptions,
  itemMeta,
  matchesQuery,
  pileAt,
  pileTolerancePx,
  resultList,
  selectionFromParams,
  thumbSrc,
  toggleGroupFilter,
  toggleKindFilter,
  togglePinKindFilter,
  visibleItems,
} from './map-explore';
import type { MapFeatureCollection } from './posts';

function point(lng: number, lat: number, properties: Record<string, string | number | null>) {
  return { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [lng, lat] as [number, number] }, properties };
}

const POINTS: MapFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    point(-74, 44, { kind: 'route', title: 'Giant loop', who: 'Jake', date: '2026-10-03', activity: 'hike', trackId: 't1', href: '/routes/t1', distanceM: 8046.72 }),
    point(-74.1, 44.1, { kind: 'route', title: 'Gravel ride', who: 'Sam', date: '2026-09-01', activity: 'bike', trackId: 't2', href: '/routes/t2' }),
    point(-74.2, 44.2, { kind: 'photo', title: 'Summit', who: 'Jake', date: null, href: '/photos/p1', thumb: 'https://x.public.blob.vercel-storage.com/t.jpg' }),
    point(-74.3, 44.3, { kind: 'pin', title: 'Lean-to', who: 'Ana', date: '2026-08-01', category: 'Campsite', href: '/pins/n1' }),
    point(-74.4, 44.4, { kind: 'pin', title: 'Trailhead lot', who: 'Ana', date: '2026-07-01', category: 'Parking', href: '/pins/n2' }),
    // Duplicates and unknown kinds are dropped.
    point(-74.4, 44.4, { kind: 'pin', title: 'Trailhead lot', who: 'Ana', category: 'Parking', href: '/pins/n2' }),
    point(-74.5, 44.5, { kind: 'hidden-end', trackId: 't1' }),
  ],
};

const LINES: MapFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'LineString', coordinates: [[-74, 44], [-74.01, 44.01]] }, properties: { trackId: 't1' } },
    point(-74, 44, { kind: 'hidden-end', trackId: 't1' }),
  ],
};

const data = exploreData(POINTS, LINES);

test('exploreData turns features into typed items, once each', () => {
  assert.deepEqual(data.items.map((item) => `${item.kind}:${item.id}`), ['route:t1', 'route:t2', 'photo:p1', 'pin:n1', 'pin:n2']);
  assert.deepEqual(data.lines.get('t1'), [[-74, 44], [-74.01, 44.01]]);
  assert.equal(data.lines.size, 1);
});

test('no pills shows everything; a main pill shows only that kind', () => {
  assert.equal(visibleItems(data, emptyFilters).length, 5);
  const routes = toggleKindFilter(emptyFilters, 'route');
  assert.deepEqual(visibleItems(data, routes).map((item) => item.id), ['t1', 't2']);
  const routesAndPins = toggleKindFilter(routes, 'pin');
  assert.equal(visibleItems(data, routesAndPins).length, 4);
});

test('sub-pills narrow their group, and turning the main pill off clears them', () => {
  const foot = toggleGroupFilter(toggleKindFilter(emptyFilters, 'route'), 'foot');
  assert.deepEqual(visibleItems(data, foot).map((item) => item.id), ['t1']);
  const off = toggleKindFilter(foot, 'route');
  assert.deepEqual(off.groups, []);
  const camps = togglePinKindFilter(toggleKindFilter(emptyFilters, 'pin'), 'Campsite');
  assert.deepEqual(visibleItems(data, camps).map((item) => item.id), ['n1']);
});

test('the search finds by title, person and pin kind, but never filters the map', () => {
  const item = data.items[0]!;
  assert.ok(matchesQuery(item, 'giant'));
  assert.ok(matchesQuery(item, 'jake LOOP'));
  assert.ok(!matchesQuery(item, 'sam'));
  const state = { ...emptyFilters, query: 'campsite' };
  assert.deepEqual(resultList(data, state).map((row) => row.id), ['n1']);
  assert.equal(visibleItems(data, state).length, 5);
});

test('results are newest first with undated items last', () => {
  assert.deepEqual(resultList(data, emptyFilters).map((row) => row.id), ['t1', 't2', 'n1', 'n2', 'p1']);
});

test('filter options only offer sub-pills when there is a choice', () => {
  const options = filterOptions(data);
  assert.deepEqual(options.kinds, ['route', 'photo', 'pin']);
  assert.deepEqual(options.groups.map((group) => group.group), ['foot', 'bike']);
  assert.deepEqual(options.pinKinds, ['Campsite', 'Parking']);
});

test('meta line, thumbnails and share links', () => {
  assert.equal(itemMeta(data.items[0]!), 'Hike · Jake · Oct 3, 2026 · 5.0 mi');
  assert.equal(thumbSrc({ thumb: 'https://t', image: 'https://i' }), 'https://t');
  assert.equal(thumbSrc({ thumb: null, image: 'https://i/a b.jpg' }, 64), '/_next/image?url=https%3A%2F%2Fi%2Fa%20b.jpg&w=64&q=70');
  assert.equal(thumbSrc({ thumb: null, image: null }), null);
  assert.deepEqual(selectionFromParams({ track: 't1' }), { kind: 'route', id: 't1', fly: true });
  assert.deepEqual(selectionFromParams({ pin: 'n1' }), { kind: 'pin', id: 'n1', fly: true });
  assert.equal(selectionFromParams({}), null);
});

test('a pile is the tapped item plus whatever is drawn on top of it', () => {
  const pile = pileAt(
    { x: 100, y: 100 },
    { kind: 'photo', id: 'p1' },
    [
      { kind: 'photo', id: 'p1', x: 100, y: 100 },
      { kind: 'photo', id: 'p2', x: 110, y: 95 },
      { kind: 'route', id: 't1', x: 85, y: 115 },
      { kind: 'pin', id: 'n1', x: 140, y: 100 },
    ],
    pileTolerancePx(10),
  );
  assert.deepEqual(pile.map((item) => item.id), ['p1', 'p2', 't1']);
  assert.equal(pileTolerancePx(15), 8);
});

test('photos along a route are the ones near its line, in order from the start', async () => {
  const { photosAlongRoute, metersToLine } = await import('./map-explore');
  const line: [number, number][] = [[-74, 44], [-73.99, 44], [-73.98, 44]];
  assert.ok(metersToLine(-73.99, 44.001, line) > 100 && metersToLine(-73.99, 44.001, line) < 120);
  const pts: MapFeatureCollection = {
    type: 'FeatureCollection',
    features: [
      point(-74, 44, { kind: 'route', title: 'R', trackId: 'r', href: '/routes/r' }),
      point(-73.981, 44.0005, { kind: 'photo', title: 'End', href: '/photos/b', thumb: 'https://t/b' }),
      point(-73.999, 44.0005, { kind: 'photo', title: 'Start', href: '/photos/a', thumb: 'https://t/a' }),
      point(-73.99, 44.05, { kind: 'photo', title: 'Far', href: '/photos/c', thumb: 'https://t/c' }),
      point(-73.99, 44, { kind: 'pin', title: 'No photo', href: '/pins/n' }),
    ],
  };
  const lns: MapFeatureCollection = {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: line }, properties: { trackId: 'r' } }],
  };
  assert.deepEqual(photosAlongRoute(exploreData(pts, lns), 'r').map((item) => item.title), ['Start', 'End']);
});

test('the pan limit is everything plus a wide margin', async () => {
  const { panLimit } = await import('./map-explore');
  assert.equal(panLimit([]), null);
  assert.deepEqual(panLimit([[-74, 44], [-73, 45]]), [[-80, 40], [-67, 49]]);
});
