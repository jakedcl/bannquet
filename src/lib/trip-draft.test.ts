import assert from 'node:assert/strict';
import test from 'node:test';
import type { ChatCatalogItem } from './chat-view';
import { presetFromCatalog } from './trip-draft';

const PIN = '11111111-1111-4111-8111-111111111111';
const ROUTE = '22222222-2222-4222-8222-222222222222';

const catalog: ChatCatalogItem[] = [
  {
    kind: 'pin',
    id: PIN,
    label: 'Heart Lake',
    href: `/pins/${PIN}`,
    thumb: null,
    ownerId: 'u',
    ownerName: 'Ada',
  },
];

test('a new trip only keeps real ids that were asked for', () => {
  const preset = presetFromCatalog(catalog, {
    pin: [PIN, PIN, 'nope'],
    route: ROUTE,
    photo: undefined,
  });
  assert.deepEqual(preset, [
    { kind: 'pin', id: PIN, label: 'Heart Lake', thumb: null, photoUrl: null, photoThumbUrl: null },
    { kind: 'route', id: ROUTE, label: 'Route', thumb: null, photoUrl: null, photoThumbUrl: null },
  ]);
});
