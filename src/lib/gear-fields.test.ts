import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanGearFields } from './gear';

test('gear edits tidy the name and category', () => {
  assert.deepEqual(cleanGearFields('  Bear   can ', ' Food '), { name: 'Bear can', category: 'Food' });
  assert.deepEqual(cleanGearFields('Stove', '   '), { name: 'Stove', category: null });
  assert.equal(cleanGearFields(' x ', 'Food'), null);
});
