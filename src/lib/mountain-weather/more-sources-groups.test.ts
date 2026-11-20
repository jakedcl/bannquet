import assert from 'node:assert/strict';
import test from 'node:test';
import { findMountainPlaceCatalogEntry } from '@/lib/mountain-weather/places';
import { moreSourcesForPlace, moreSourcesForState } from '@/lib/mountain-weather/more-sources';

test('every source link appears once on a place page', () => {
  const place = findMountainPlaceCatalogEntry('mount-washington');
  assert.ok(place);
  const groups = moreSourcesForPlace(place.state, place.sectionId, place);
  const hrefs = Object.values(groups).flat().map((l) => l.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
});

test('every source link appears once on a state page', () => {
  const hrefs = Object.values(moreSourcesForState('ny')).flat().map((l) => l.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
});
