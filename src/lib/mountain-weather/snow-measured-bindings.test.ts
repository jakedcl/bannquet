import assert from 'node:assert/strict';
import test from 'node:test';
import bindingsJson from '../../../config/mountain-weather/snow-measured-bindings.json';
import { snowMeasuredBindingsForPlace } from '@/lib/mountain-weather/snow-measured-bindings';

const file = bindingsJson as {
  version: number;
  places: Record<
    string,
    {
      measured: {
        kind: string;
        stationId: string;
        network: string;
        distanceMi: number;
        elevationDiffFt: number | null;
        stationElevationFt: number | null;
        nohrscElevationFt?: number | null;
        epqsElevationFt?: number | null;
        elevationSource?: string;
      }[];
    }
  >;
};

test('base/valley snow stations are not more than 250 ft above catalog place', () => {
  for (const [placeId, row] of Object.entries(file.places)) {
    for (const m of row.measured) {
      if (m.kind !== 'base' && m.kind !== 'valley') continue;
      if (m.elevationDiffFt === null) continue;
      assert.ok(
        m.elevationDiffFt <= 250,
        `${placeId} ${m.stationId} ${m.kind} is ${m.elevationDiffFt} ft above place`,
      );
    }
  }
});

test('summit snow bindings are within 1 mi and 500 ft (or pinned)', () => {
  const pins = new Set(['KMWN', 'A4090', 'A3672', 'MMNV1']);
  for (const [placeId, row] of Object.entries(file.places)) {
    for (const m of row.measured) {
      if (m.kind !== 'summit') continue;
      if (pins.has(m.stationId)) continue;
      assert.ok(m.distanceMi <= 1.05, `${placeId} summit ${m.stationId} too far`);
      if (m.elevationDiffFt !== null) {
        assert.ok(
          Math.abs(m.elevationDiffFt) <= 500,
          `${placeId} summit ${m.stationId} elev diff ${m.elevationDiffFt}`,
        );
      }
    }
  }
});

test('Pinkham and Stowe do not use MWN or MMNV1 as base', () => {
  for (const placeId of ['pinkham-notch', 'stowe-town']) {
    const obs = snowMeasuredBindingsForPlace(placeId);
    for (const m of obs) {
      assert.ok(!(m.kind === 'base' && (m.stationId === 'MWN' || m.stationId === 'MMNV1')), placeId);
    }
    const mwn = obs.find((m) => m.stationId === 'MWN' || m.stationId === 'KMWN');
    if (mwn) assert.equal(mwn.kind, 'nearby-higher', placeId);
  }
});

test('Mount Mansfield measured snow uses MMNV1 as summit pin', () => {
  const obs = snowMeasuredBindingsForPlace('mount-mansfield');
  const summit = obs.find((m) => m.kind === 'summit');
  assert.ok(summit);
  assert.equal(summit?.stationId, 'MMNV1');
});

test('KMWN elevations reject low NOHRSC table heights', () => {
  for (const [placeId, row] of Object.entries(file.places)) {
    for (const m of row.measured) {
      if (m.stationId !== 'KMWN') continue;
      if (m.nohrscElevationFt == null) continue;
      if (m.nohrscElevationFt < 6000) {
        assert.ok(
          (m.stationElevationFt ?? 0) >= 6200,
          `${m.stationId} at ${placeId}: NOHRSC ${m.nohrscElevationFt} ft resolved to ${m.stationElevationFt} ft`
        );
        const src = m.elevationSource ?? '';
        assert.match(src, /EPQS|NWS metadata/);
      }
    }
  }
});