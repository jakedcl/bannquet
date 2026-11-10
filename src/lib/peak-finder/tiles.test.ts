import assert from 'node:assert/strict';
import test from 'node:test';
import { MARCY } from './constants';
import { lngLatToTile, sampleHeight, sampleTile, terrainTiles, terrariumHeight, zoomForDistance } from './tiles';

test('Terrarium decode on known pixel values', () => {
  assert.equal(terrariumHeight(128, 0, 0), 0);
  assert.equal(terrariumHeight(134, 93, 0), 1629);
  assert.equal(terrariumHeight(128, 2, 128), 2.5);
});

test('ring plan adds a close zoom-12 ring at Mount Marcy', () => {
  const tiles = terrainTiles(MARCY.lat, MARCY.lng);
  const counts: Record<number, number> = { 12: 0, 11: 0, 10: 0, 9: 0, 8: 0 };
  for (const tile of tiles) counts[tile.z] += 1;
  assert.deepEqual(counts, { 12: 10, 11: 6, 10: 18, 9: 16, 8: 18 });
  assert.equal(tiles.length, 68);
});

test('closer ground uses a finer zoom', () => {
  assert.equal(zoomForDistance(1_000), 12);
  assert.equal(zoomForDistance(9_000), 11);
  assert.equal(zoomForDistance(40_000), 10);
  assert.equal(zoomForDistance(80_000), 9);
  assert.equal(zoomForDistance(150_000), 8);
});

test('close samples prefer the zoom 12 tile', () => {
  const fine = lngLatToTile(MARCY.lng, MARCY.lat, 12);
  const coarse = lngLatToTile(MARCY.lng, MARCY.lat, 11);
  const fineGrid = new Float32Array(256 * 256).fill(1_600);
  const coarseGrid = new Float32Array(256 * 256).fill(100);
  const grids = new Map([
    [`${fine.z}/${fine.x}/${fine.y}`, fineGrid],
    [`${coarse.z}/${coarse.x}/${coarse.y}`, coarseGrid],
  ]);
  assert.equal(sampleHeight(grids, MARCY.lat, MARCY.lng, 0), 1_600);
});

test('a sample between two pixels lands between their heights', () => {
  const zoom = 11;
  const lat = 44;
  const lng = -74;
  const tile = lngLatToTile(lng, lat, zoom);
  const n = 2 ** zoom;
  const fx = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const fy = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
  const x = (fx - tile.x) * 256 - 0.5;
  const y = (fy - tile.y) * 256 - 0.5;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const grid = new Float32Array(256 * 256);
  grid[y0 * 256 + x0] = 100;
  grid[y0 * 256 + x0 + 1] = 300;
  grid[(y0 + 1) * 256 + x0] = 100;
  grid[(y0 + 1) * 256 + x0 + 1] = 300;
  const height = sampleTile(new Map([[`${tile.z}/${tile.x}/${tile.y}`, grid]]), lat, lng, zoom);
  const expected = 100 * (1 - tx) + 300 * tx;
  assert.ok(height != null && Math.abs(height - expected) < 0.02, `${height} vs ${expected}`);
});
