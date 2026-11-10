import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { MARCY } from './constants';
import { declinationAt, declinationCellId, type DeclinationTable } from './declination';
import { chunksCovering, dedupePeaks, decodeChunk, normalizeName, sameNameWithin, type ChunkFile, type PeakIndex, type RawPeak } from './peaks';

const root = path.join(process.cwd(), 'public/peak-finder');

function raw(partial: Partial<RawPeak> & Pick<RawPeak, 'name' | 'lat' | 'lng' | 'source'>): RawPeak {
  return { elevationM: 500, ...partial };
}

test('Mount Marcy loads the eight chunks its 200 km circle actually crosses', () => {
  const ids = chunksCovering(MARCY.lat, MARCY.lng);
  assert.deepEqual(ids, [
    'n42w078', 'n42w076', 'n42w074', 'n42w072',
    'n44w078', 'n44w076', 'n44w074', 'n44w072',
  ]);
});

test('a spot that straddles three latitude bands loads about 12 chunks, and never more than 16', () => {
  const ids = chunksCovering(45, -73.92);
  assert.equal(ids.length, 12);
  assert.ok(chunksCovering(70, -150).length <= 16);
});

test('GeoNames drops when the name matches within 1.5 km or any peak is within 200 m', () => {
  const osm = [
    raw({ name: 'Mount Marcy', lat: 44.1128, lng: -73.9239, source: 'osm', elevationM: 1629 }),
    raw({ name: 'Phelps', lat: 44.13, lng: -73.9, source: 'osm' }),
  ];
  const geonames = [
    raw({ name: 'Mount Marcy', lat: 44.12, lng: -73.93, source: 'geonames', elevationM: 1600 }),
    raw({ name: 'Different', lat: 44.113, lng: -73.924, source: 'geonames' }),
    raw({ name: 'Haystack', lat: 44.2, lng: -73.8, source: 'geonames' }),
  ];
  const kept = dedupePeaks(osm, geonames);
  const names = kept.map((peak) => peak.name).sort();
  assert.deepEqual(names, ['Haystack', 'Mount Marcy', 'Phelps']);
  assert.equal(kept.filter((peak) => peak.name === 'Mount Marcy')[0]?.source, 'osm');
});

test('same name within 200 m collapses', () => {
  const osm = [
    raw({ name: 'Bald Peak', lat: 44, lng: -74, source: 'osm', elevationM: 800 }),
    raw({ name: 'Bald Peak', lat: 44.001, lng: -74, source: 'osm', elevationM: 900 }),
  ];
  const kept = dedupePeaks(osm, []);
  assert.equal(kept.length, 1);
  assert.equal(kept[0]?.elevationM, 900);
  assert.equal(normalizeName('Mount  Marcy!'), 'mount marcy');
});

test('shipped peaks stay in the US chunks, with no same-name pair inside 200 m', () => {
  const index = JSON.parse(readFileSync(path.join(root, 'peaks/index.json'), 'utf8')) as PeakIndex;
  assert.ok(index.count >= 15_000, String(index.count));
  assert.equal(index.cellDeg, 2);
  const peaks = readdirSync(path.join(root, 'peaks/us'))
    .filter((name) => name.endsWith('.v1.json'))
    .flatMap((name) => decodeChunk(JSON.parse(readFileSync(path.join(root, 'peaks/us', name), 'utf8')) as ChunkFile));
  assert.equal(peaks.length, index.count);
  const montreal = peaks.filter((peak) => peak.lat > 45.4 && peak.lat < 45.6 && peak.lng > -73.7 && peak.lng < -73.4);
  assert.equal(montreal.length, 0);
  if (index.coverage === 'northeast') {
    const outside = peaks.filter((peak) => peak.lat > 47.7 || peak.lat < 38.5 || peak.lng < -81 || peak.lng > -66.5);
    assert.equal(outside.length, 0, `outside the Northeast: ${outside[0]?.name ?? ''}`);
  }
  assert.equal(sameNameWithin(peaks, 200), false);
});

test('declination at Marcy is about 13 degrees west', () => {
  const table = JSON.parse(readFileSync(path.join(root, 'declination.v1.json'), 'utf8')) as DeclinationTable;
  assert.equal(declinationCellId(MARCY.lat, MARCY.lng), 'n44w074');
  const value = declinationAt(table, MARCY.lat, MARCY.lng);
  assert.ok(value != null && value < -12 && value > -15, String(value));
  const pittsburgh = declinationAt(table, 40.44, -79.99);
  const katahdin = declinationAt(table, 45.9, -68.92);
  assert.ok(pittsburgh != null && pittsburgh < -8 && pittsburgh > -11, String(pittsburgh));
  assert.ok(katahdin != null && katahdin < -14 && katahdin > -17, String(katahdin));
  assert.equal(table.model, 'WMM2025');
});
