import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPeakFinderSearch,
  hasUnrecognizedPeakFinderSearch,
  parsePeakFinderSearch,
  peakFinderHref,
  roundPeakFinderCoord,
  validPeakFinderCoord,
} from './peak-finder-url';

test('parsePeakFinderSearch handles start and modes', () => {
  assert.deepEqual(parsePeakFinderSearch(''), { kind: 'start' });
  assert.deepEqual(parsePeakFinderSearch('?'), { kind: 'start' });
  assert.deepEqual(parsePeakFinderSearch('?mode=pick'), { kind: 'pick-map' });
  assert.deepEqual(parsePeakFinderSearch('?mode=explore'), { kind: 'explore' });
  assert.deepEqual(parsePeakFinderSearch('?mode=offline'), { kind: 'offline' });
});

test('parsePeakFinderSearch reads rounded pick coordinates', () => {
  const parsed = parsePeakFinderSearch('?lat=44.123456&lng=-73.987654');
  assert.equal(parsed.kind, 'pick-view');
  if (parsed.kind === 'pick-view') {
    assert.equal(parsed.lat, 44.12346);
    assert.equal(parsed.lng, -73.98765);
  }
});

test('parsePeakFinderSearch rejects invalid coordinates and modes', () => {
  assert.deepEqual(parsePeakFinderSearch('?lat=120&lng=0'), { kind: 'start' });
  assert.deepEqual(parsePeakFinderSearch('?lat=44'), { kind: 'start' });
  assert.deepEqual(parsePeakFinderSearch('?mode=fly'), { kind: 'start' });
  assert.equal(hasUnrecognizedPeakFinderSearch('?mode=fly'), true);
  assert.equal(hasUnrecognizedPeakFinderSearch('?mode=explore'), false);
});

test('parsePeakFinderSearch reads offline area id', () => {
  assert.deepEqual(parsePeakFinderSearch('?area=abc-123'), { kind: 'area', areaId: 'abc-123' });
});

test('buildPeakFinderSearch round-trips common screens', () => {
  const pick = { kind: 'pick-view' as const, lat: 44.1, lng: -73.2 };
  const search = buildPeakFinderSearch(pick);
  assert.deepEqual(parsePeakFinderSearch(search), {
    kind: 'pick-view',
    lat: roundPeakFinderCoord(44.1),
    lng: roundPeakFinderCoord(-73.2),
  });
  assert.equal(peakFinderHref({ kind: 'explore' }), '/peak-finder?mode=explore');
});

test('validPeakFinderCoord bounds', () => {
  assert.equal(validPeakFinderCoord(44, -73), true);
  assert.equal(validPeakFinderCoord(91, 0), false);
  assert.equal(validPeakFinderCoord(0, -181), false);
});
