import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_HFOV_DEG } from './constants';
import { labelCapForView, peakImportanceScore } from './label-ranking';
import type { VisiblePeak } from './visibility';

function peak(partial: Partial<VisiblePeak> & Pick<VisiblePeak, 'name'>): VisiblePeak {
  return {
    lat: 44.1,
    lng: -73.9,
    elevationM: 1400,
    distanceM: 20_000,
    bearingDeg: 270,
    angleDeg: 2,
    prominenceDeg: 0.5,
    ...partial,
  };
}

test('importance favors prominence and nearness over far small bumps', () => {
  const marcy = peak({ name: 'Mount Marcy', elevationM: 1600, prominenceDeg: 2.1, distanceM: 8_000 });
  const bump = peak({ name: 'Bump', elevationM: 900, prominenceDeg: 0.1, distanceM: 45_000 });
  assert.ok(peakImportanceScore(marcy) > peakImportanceScore(bump));
});

test('narrower field of view raises the label cap', () => {
  const wide = labelCapForView(390, DEFAULT_HFOV_DEG, 40, 80);
  const zoomed = labelCapForView(390, DEFAULT_HFOV_DEG / 2, 40, 80);
  assert.ok(zoomed > wide);
});
