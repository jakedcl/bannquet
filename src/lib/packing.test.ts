import assert from 'node:assert/strict';
import test from 'node:test';
import { gramsToOunces, loadPackingTemplates, ouncesToGrams, packingTemplateById } from './packing';

test('the shared packing templates cover the five kinds of days', () => {
  const templates = loadPackingTemplates();
  assert.deepEqual(templates.map((template) => template.id), ['day-hike', 'overnight', 'winter', 'bike', 'ski']);
  for (const template of templates) {
    assert.ok(template.items.length >= 6, template.id);
    assert.ok(template.items.every((item) => item.label.trim().length > 0));
  }
  assert.equal(packingTemplateById('ski')?.items.some((item) => item.label === 'Probe'), true);
  assert.equal(packingTemplateById('nope'), null);
});

test('ounces round trip through grams', () => {
  assert.equal(gramsToOunces(ouncesToGrams(32)), 32);
});
