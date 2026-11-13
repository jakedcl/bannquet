import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import places from '../../../config/mountain-weather/places.json';
import bindingsJson from '../../../config/mountain-weather/source-bindings.json';
import type { PlaceSourceBinding } from '@/lib/mountain-weather/source-bindings';

const bindings = bindingsJson as { places: Record<string, PlaceSourceBinding> };
import { parseBalloonXml, pickBalloonRegion } from '@/lib/mountain-weather/parse/balloon';

const FIX = path.resolve(process.cwd(), 'src/lib/mountain-weather/fixtures');

test('balloon Champlain fixture parses wind rows and hours', () => {
  const xml = readFileSync(path.join(FIX, 'balloon-champlain-sample.xml'), 'utf8');
  const bulletin = parseBalloonXml(xml);
  const region = pickBalloonRegion(bulletin, 'the Champlain Valley of Vermont and New York');
  assert.ok(region);
  assert.equal(region.productLines.length, 2);
  assert.ok(region.rows.some((r) => r.label.startsWith('3kft Wind Spd')));
  assert.ok(region.estHours.length >= 21);
  assert.equal(region.estHours.length, region.utcHours.length);
  assert.ok(region.tafLines.length > 0);
});

test('every BTV catalog place has balloon binding with unique region titles', () => {
  const btvIds = [];
  for (const state of places.states) {
    for (const section of state.sections) {
      for (const place of section.places) {
        if (place.office === 'BTV') btvIds.push(place.id);
      }
    }
  }
  const regions = new Set();
  for (const id of btvIds) {
    const binding = bindings.places[id]?.balloon;
    assert.ok(binding, `missing balloon binding for ${id}`);
    regions.add(binding.regionMatch);
  }
  assert.equal(btvIds.length, 53);
  assert.ok(regions.size >= 4);
  assert.ok(!bindings.places['mount-monadnock']?.balloon);
  assert.ok(bindings.places['monadnock-mountain']?.balloon?.nearbyLabel);
});
