import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import bindings from '../../../config/mountain-weather/bulletin-bindings.json';
import { bulletinOfficesForSection, bulletinOfficesForState } from '@/lib/mountain-weather/read-scope-bulletins';
import { parseAfdProduct } from '@/lib/mountain-weather/parse/afd';
import { parseNwsDiscussionSections } from '@/lib/mountain-weather/parse/nws-discussion';

const FIX = path.resolve(process.cwd(), 'src/lib/mountain-weather/fixtures');

test('AFD sample keeps every dot section including discussion blocks', () => {
  const text = readFileSync(path.join(FIX, 'afd-btv-sample.txt'), 'utf8');
  const parsed = parseAfdProduct(text, 'test-id');
  assert.ok(parsed.sections.length >= 3);
  assert.ok(parsed.sections.some((s) => /DISCUSSION|MESSAGES|CHANGED/i.test(s.title)));
  const discussion = parsed.sections.find((s) => /DISCUSSION/i.test(s.title));
  assert.ok(discussion && discussion.body.length > 200);
});

test('discussion parser preserves bodies across && delimiters', () => {
  const sample = `.ONE...\nLine A\n\n&&\n\n.TWO...\nLine B\n`;
  const { sections } = parseNwsDiscussionSections(sample);
  assert.equal(sections.length, 2);
  assert.match(sections[0].body, /Line A/);
  assert.match(sections[1].body, /Line B/);
});

test('gunks and thacher bulletin office is ALY; NY and VT states have no whole-area bulletin', () => {
  assert.equal(bindings.places['gunks-ridge'].office, 'ALY');
  assert.equal(bindings.places['thacher-park'].office, 'ALY');
  assert.equal(bindings.states.ny, null);
  assert.equal(bindings.states.vt, null);
  assert.equal(bindings.states.me, null);
  assert.ok(bindings.unboundScopes['central-southern-adirondacks']);
});

test('mixed states and sections enumerate every covering WFO', () => {
  assert.deepEqual(bulletinOfficesForState('ny'), ['BTV', 'ALY']);
  assert.deepEqual(bulletinOfficesForState('vt'), ['BTV', 'ALY']);
  assert.deepEqual(bulletinOfficesForState('me'), ['GYX', 'CAR']);
  assert.deepEqual(bulletinOfficesForState('nh'), ['GYX']);
  assert.deepEqual(bulletinOfficesForSection('ny', 'central-southern-adirondacks'), ['BTV', 'ALY']);
  assert.deepEqual(bulletinOfficesForSection('vt', 'southern-greens'), ['BTV', 'ALY']);
  assert.deepEqual(bulletinOfficesForSection('ny', 'adirondack-high-peaks'), ['BTV']);
});