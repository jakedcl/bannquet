import assert from 'node:assert/strict';
import test from 'node:test';
import { MARCY } from './constants';
import { terrainTiles, terrariumHeight, zoomForDistance } from './tiles';

test('Terrarium decode on known pixel values', () => {
  assert.equal(terrariumHeight(128, 0, 0), 0);
  assert.equal(terrariumHeight(134, 93, 0), 1629);
  assert.equal(terrariumHeight(128, 2, 128), 2.5);
});

test('ring plan returns 58 tiles at Mount Marcy', () => {
  const tiles = terrainTiles(MARCY.lat, MARCY.lng);
  assert.equal(tiles.length, 58);
  const counts = { 11: 0, 10: 0, 9: 0, 8: 0 };
  for (const tile of tiles) counts[tile.z as 11 | 10 | 9 | 8] += 1;
  assert.deepEqual(counts, { 11: 6, 10: 18, 9: 16, 8: 18 });
});

test('closer ground uses a finer zoom', () => {
  assert.equal(zoomForDistance(1_000), 11);
  assert.equal(zoomForDistance(40_000), 10);
  assert.equal(zoomForDistance(80_000), 9);
  assert.equal(zoomForDistance(150_000), 8);
});
