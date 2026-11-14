import assert from 'node:assert/strict';
import test from 'node:test';
import bindingsJson from '../../../config/mountain-weather/avalanche-bindings.json';
import placeCoords from '../../../config/mountain-weather/place-coordinates.json';
import {
  avalancheMapLayerGeometry,
  placeInsideAvalancheCenter,
} from '@/lib/mountain-weather/avalanche-polygon';
import type { AvalancheCenterId } from '@/lib/mountain-weather/avalanche-types';

const bindings = bindingsJson as {
  version: number;
  exceptions: Record<string, { centers: AvalancheCenterId[]; bindReason: string }>;
  pipAudit: Record<AvalancheCenterId, string[]>;
  places: Record<string, { centers: AvalancheCenterId[]; bindReason: string }>;
};

const coords = placeCoords as { places: Record<string, { lat: number; lon: number }> };

const EXCEPTION_IDS = new Set(Object.keys(bindings.exceptions));

function expectedBindings(): Map<string, AvalancheCenterId[]> {
  const expected = new Map<string, AvalancheCenterId[]>();
  for (const [placeId, c] of Object.entries(coords.places)) {
    const centers: AvalancheCenterId[] = [];
    if (placeInsideAvalancheCenter('MWAC', c.lon, c.lat)) centers.push('MWAC');
    if (placeInsideAvalancheCenter('NYSAC', c.lon, c.lat)) centers.push('NYSAC');
    if (centers.length) expected.set(placeId, centers);
  }
  for (const [placeId, row] of Object.entries(bindings.exceptions)) {
    expected.set(placeId, row.centers);
  }
  return expected;
}

test('cached map-layer geometry includes MWAC and NYSAC polygons', () => {
  const g = avalancheMapLayerGeometry();
  assert.ok(g.centers.MWAC?.geometry);
  assert.ok(g.centers.NYSAC?.geometry);
  assert.ok(g.fetchedAt);
});

test('bindings match point-in-polygon plus documented exceptions', () => {
  const expected = expectedBindings();
  assert.deepEqual(new Set(Object.keys(bindings.places)), new Set(expected.keys()));

  for (const [placeId, row] of Object.entries(bindings.places)) {
    const want = expected.get(placeId);
    assert.ok(want, `unexpected binding for ${placeId}`);
    assert.deepEqual([...row.centers].sort(), [...want].sort(), placeId);
    const c = coords.places[placeId];
    assert.ok(c, placeId);
    for (const centerId of row.centers) {
      const inside = placeInsideAvalancheCenter(centerId, c.lon, c.lat);
      if (EXCEPTION_IDS.has(placeId) && bindings.exceptions[placeId]?.centers.includes(centerId)) {
        if (!inside) {
          assert.match(row.bindReason, /outside|exception|trailhead/i, placeId);
        }
        continue;
      }
      assert.ok(inside, `${placeId} bound to ${centerId} but outside polygon`);
    }
  }
});

test('every place inside a center polygon is bound (none missing)', () => {
  const bound = new Set(Object.keys(bindings.places));
  for (const [placeId, c] of Object.entries(coords.places)) {
    for (const centerId of ['MWAC', 'NYSAC'] as const) {
      if (placeInsideAvalancheCenter(centerId, c.lon, c.lat)) {
        assert.ok(bound.has(placeId), `${placeId} inside ${centerId} but unbound`);
        assert.ok(
          bindings.places[placeId].centers.includes(centerId),
          `${placeId} missing ${centerId} center`,
        );
      }
    }
  }
});

test('NYSAC excludes lyon, debar, st-regis, mount-arab per polygon audit', () => {
  for (const id of ['lyon-mountain', 'debar-mountain', 'st-regis-mountain', 'mount-arab']) {
    assert.equal(bindings.places[id], undefined, id);
  }
});

test('MWAC includes crawford-notch and pinkham exception', () => {
  assert.ok(bindings.places['crawford-notch']?.centers.includes('MWAC'));
  assert.ok(bindings.places['pinkham-notch']?.centers.includes('MWAC'));
  assert.ok(EXCEPTION_IDS.has('pinkham-notch'));
});