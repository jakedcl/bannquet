import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import places from '../../../config/mountain-weather/places.json';
import bindingsJson from '../../../config/mountain-weather/source-bindings.json';
import type { PlaceSourceBinding } from '@/lib/mountain-weather/source-bindings';
import { parseBalloonXml, pickBalloonRegion } from '@/lib/mountain-weather/parse/balloon';

const bindings = bindingsJson as { places: Record<string, PlaceSourceBinding> };

const FIX = path.resolve(process.cwd(), 'src/lib/mountain-weather/fixtures');

const NO_BALLOON_BLOCK = [
  'gunks-ridge',
  'thacher-park',
  'prospect-mountain',
  'black-mountain',
  'pillsbury-mountain',
  'blue-ridge-mountain',
  'fishing-brook-range',
  'vanderwhacker-mountain',
  'crane-mountain',
  'hadley-mountain',
  'pharaoh-mountain',
];

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

test('balloon bindings are explicit (no ALY-area or unlisted central ADK guesses)', () => {
  for (const id of NO_BALLOON_BLOCK) {
    assert.ok(!bindings.places[id]?.balloon, `${id} must not have in-page balloon binding`);
  }
  assert.ok(bindings.places['killington-peak']?.balloon?.regionMatch === 'Southern Vermont');
  assert.ok(bindings.places['mount-marcy']?.balloon?.bindReason);
  assert.ok(!bindings.places['mount-monadnock']?.balloon);

  const btvCount = places.states
    .flatMap((s) => s.sections.flatMap((sec) => sec.places))
    .filter((p) => p.office === 'BTV').length;
  const bound = Object.values(bindings.places).filter((p) => p.balloon).length;
  assert.equal(btvCount, 53);
  assert.equal(bound, 42);
});
