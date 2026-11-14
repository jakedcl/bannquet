import assert from 'node:assert/strict';
import test from 'node:test';
import bindingsJson from '../../../config/mountain-weather/station-bindings.json';
import { resolveStationElevationFt } from '@/lib/mountain-weather/station-elevation-epqs';
import {
  stationBindingForPlace,
  visibleStationBindings,
} from '@/lib/mountain-weather/station-bindings';

const bindings = bindingsJson as unknown as {
  version: number;
  ruleSummary: string;
  stations: Record<string, { network: string; nwsElevationFt?: number; epqsElevationFt?: number; elevationSource?: string }>;
  places: Record<string, { observations: { stationId: string; kind: string; network: string; distanceMi: number; elevationDiffFt: number | null; hideFromObservationsSection?: boolean }[] }>;
  audit?: { place: string; station: string; network: string; kind: string; distanceMi: number; elevationDiffFt: number | null }[];
};

test('EPQS replaces NWS elevation when metadata differs by more than 200 ft', () => {
  const r = resolveStationElevationFt(7907, 3850, 200);
  assert.equal(r.elevationFt, 3850);
  assert.equal(r.rejectedNws, true);
  assert.match(r.elevationSource, /EPQS/);
});

test('no CWOP summit bindings and summit must be within 1 mi and 500 ft', () => {
  for (const [placeId, binding] of Object.entries(bindings.places)) {
    for (const obs of binding.observations.filter((o) => !o.hideFromObservationsSection)) {
      if (obs.kind !== 'summit') continue;
      assert.ok(obs.network !== 'CWOP citizen station', `${placeId} ${obs.stationId} CWOP summit`);
      assert.ok(obs.distanceMi <= 1.05, `${placeId} summit ${obs.stationId} too far: ${obs.distanceMi} mi`);
      if (obs.elevationDiffFt !== null) {
        assert.ok(
          Math.abs(obs.elevationDiffFt) <= 500,
          `${placeId} summit ${obs.stationId} elev diff ${obs.elevationDiffFt}`,
        );
      }
    }
  }
});

test('killington and stratton are not bound to bad CWOP summits', () => {
  const kill = visibleStationBindings('killington-peak');
  assert.ok(!kill.some((o) => o.kind === 'summit' && o.stationId === 'FW8716'));
  const stratton = visibleStationBindings('stratton-mountain');
  assert.ok(!stratton.some((o) => o.kind === 'summit' && o.stationId === 'FW5837'));
});

test('marcy has no whiteface summit; cascade has nearby-higher not summit for A4090', () => {
  const marcy = visibleStationBindings('mount-marcy');
  assert.ok(!marcy.some((o) => o.kind === 'summit' && o.stationId === 'A4090'));
  const cascade = visibleStationBindings('cascade-mountain');
  const a409 = cascade.find((o) => o.stationId === 'A4090');
  if (a409) assert.equal(a409.kind, 'nearby-higher');
});

test('pinkham notch uses low base station not KMWN', () => {
  const pink = visibleStationBindings('pinkham-notch');
  assert.ok(!pink.some((o) => o.stationId === 'KMWN'));
  const hi = pink.find((o) => o.stationId === 'KHIE');
  assert.ok(hi);
  assert.equal(hi?.kind, 'base');
});

test('mount mansfield pack hides MMNV1 duplicate', () => {
  const raw = stationBindingForPlace('mount-mansfield');
  assert.ok(raw?.observations.some((o) => o.stationId === 'MMNV1' && o.hideFromObservationsSection));
});