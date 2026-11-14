import assert from 'node:assert/strict';
import test from 'node:test';
import bindingsJson from '../../../config/mountain-weather/station-bindings.json';
import places from '../../../config/mountain-weather/places.json';
import {
  stationBindingForPlace,
  stationMeta,
  visibleStationBindings,
} from '@/lib/mountain-weather/station-bindings';

const bindings = bindingsJson as {
  ruleSummary: string;
  stations: Record<string, { office: string | null; state: string | null; elevationFt: number | null }>;
  places: Record<string, { observations: { stationId: string; kind: string; bindReason: string }[] }>;
};

test('station meta exists for every bound station', () => {
  for (const [placeId, binding] of Object.entries(bindings.places)) {
    for (const obs of binding.observations) {
      const meta = bindings.stations[obs.stationId];
      assert.ok(meta, `${placeId} → ${obs.stationId} missing station meta`);
      assert.ok(meta.office, `${obs.stationId} missing WFO`);
      assert.ok(meta.state, `${obs.stationId} missing state`);
    }
  }
});

test('mount washington uses KMWN summit; marcy has no distant summit substitute', () => {
  const wash = bindings.places['mount-washington'];
  assert.ok(wash?.observations.some((o) => o.stationId === 'KMWN' && o.kind === 'summit'));
  const marcy = bindings.places['mount-marcy'];
  assert.ok(marcy);
  assert.ok(!marcy.observations.some((o) => o.kind === 'summit' && o.stationId === 'A4090'));
  assert.ok(marcy.observations.some((o) => o.stationId === 'KSLK'));
});

test('mansfield summit hidden from observations section (pack holds MMNV1)', () => {
  const raw = stationBindingForPlace('mount-mansfield');
  assert.ok(raw?.observations.some((o) => o.stationId === 'MMNV1' && o.hideFromObservationsSection));
  const visible = visibleStationBindings('mount-mansfield');
  assert.ok(!visible.some((o) => o.stationId === 'MMNV1'));
  assert.ok(visible.some((o) => o.stationId === 'KMPV'));
});

test('registry-backed bindings resolve via station-bindings module', () => {
  const kmwn = stationMeta('KMWN');
  assert.ok(kmwn?.elevationFt && kmwn.elevationFt > 6000);
  const total = places.states.flatMap((s) => s.sections.flatMap((sec) => sec.places)).length;
  assert.equal(total, 90);
  const withSection = Object.keys(bindings.places).length;
  assert.ok(withSection > 0);
  assert.ok(bindings.ruleSummary.includes('900 ft'));
});