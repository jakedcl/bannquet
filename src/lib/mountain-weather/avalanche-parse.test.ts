import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  parseAvalancheMapLayer,
  parseAvalancheProduct,
} from '@/lib/mountain-weather/parse/avalanche';

const FIX = path.resolve(process.cwd(), 'src/lib/mountain-weather/fixtures');

test('MWAC map-layer off-season feature parses without implying low danger', () => {
  const layerText = JSON.stringify({
    features: [
      {
        id: 2355,
        properties: {
          name: 'Mount Washington',
          center: 'MWAC',
          off_season: true,
          danger: 'no rating',
          danger_level: -1,
          start_date: '2026-04-08T06:00:00-04:00',
          end_date: '2026-04-09T06:00:00-04:00',
        },
      },
    ],
  });
  const features = parseAvalancheMapLayer(layerText, 'MWAC');
  assert.equal(features.length, 1);
  assert.equal(features[0].offSeason, true);
  assert.equal(features[0].dangerLevel, -1);
  const bundle = parseAvalancheProduct('{}', features[0]);
  assert.equal(bundle.offSeason, true);
  assert.equal(bundle.dangerBands.length, 0);
  assert.equal(bundle.lastKnownIssued, '2026-04-09T06:00:00-04:00');
});

test('MWAC in-season product fixture parses bands and problems', () => {
  const mapLayer = {
    productId: 2355,
    zoneName: 'Presidential Range',
    centerId: 'MWAC' as const,
    centerName: 'MWAC',
    offSeason: false,
    travelAdvice: null,
    dangerLabel: 'moderate',
    dangerLevel: 2,
    link: 'https://example.com',
    startDate: null,
    endDate: null,
    state: 'NH',
  };
  const text = readFileSync(path.join(FIX, 'avalanche-mwac-sample.json'), 'utf8');
  const bundle = parseAvalancheProduct(text, mapLayer);
  assert.equal(bundle.offSeason, false);
  assert.ok(bundle.dangerBands.length >= 2);
  assert.ok(bundle.problems.length >= 1);
  assert.ok(bundle.bottomLine);
  assert.ok(bundle.weatherData);
});

test('avalanche bindings JSON lists twenty bound places', async () => {
  const bindings = (await import('../../../config/mountain-weather/avalanche-bindings.json')).default as {
    places: Record<string, unknown>;
  };
  assert.equal(Object.keys(bindings.places).length, 20);
});