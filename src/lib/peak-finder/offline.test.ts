import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { OFFLINE_RADIUS_M } from './constants';
import {
  areaCoversPoint,
  estimateOfflineBytes,
  offlineManifestFor,
  offlinePeakChunkIds,
  offlineTerrainTileUrls,
  resolveOfflinePeakChunks,
} from './offline';
import { chunksCovering, type PeakIndex } from './peaks';
import { terrainTilesForRadius } from './tiles';

const PEAK_INDEX = JSON.parse(
  readFileSync(path.join(process.cwd(), 'public/peak-finder/peaks/index.json'), 'utf8'),
) as PeakIndex;

/** Slide Mountain, Catskills — common offline test point. */
const SLIDE = { lat: 41.998127, lng: -74.38633, name: 'Slide Mountain' };

test('100 km offline terrain tile count is smaller than the full 200 km view', () => {
  const full = terrainTilesForRadius(SLIDE.lat, SLIDE.lng, 200_000);
  const saved = terrainTilesForRadius(SLIDE.lat, SLIDE.lng, OFFLINE_RADIUS_M);
  assert.ok(saved.length < full.length);
  assert.ok(saved.length > 20);
});

test('offline manifest for Slide Mountain lists terrain and peak URLs', () => {
  const manifest = offlineManifestFor(SLIDE.lat, SLIDE.lng);
  assert.equal(manifest.terrainUrls.length, offlineTerrainTileUrls(SLIDE.lat, SLIDE.lng).length);
  assert.ok(manifest.peakUrls.includes('/peak-finder/peaks/index.json'));
  assert.ok(manifest.peakUrls.some((url) => url.includes('.v1.json')));
  assert.ok(manifest.chunkCount > 0);
  const chunks = offlinePeakChunkIds(SLIDE.lat, SLIDE.lng);
  assert.equal(manifest.chunkCount, chunks.length);
});

test('Slide Mountain 100 km offline download size estimate', () => {
  const manifest = offlineManifestFor(SLIDE.lat, SLIDE.lng);
  const bytes = estimateOfflineBytes(manifest.tileCount, manifest.chunkCount);
  assert.equal(bytes, manifest.estimatedBytes);
  // Documented ballpark for Jake (terrain ~50 tiles × 80KB + chunks + declination/index).
  assert.ok(manifest.tileCount >= 40 && manifest.tileCount <= 60, `tiles=${manifest.tileCount}`);
  assert.ok(bytes >= 4_000_000 && bytes <= 12_000_000, `~${(bytes / 1_048_576).toFixed(1)} MiB estimated`);
});

test('areaCoversPoint respects 100 km radius', () => {
  const area = { lat: SLIDE.lat, lng: SLIDE.lng, radiusM: OFFLINE_RADIUS_M };
  assert.equal(areaCoversPoint(area, SLIDE.lat, SLIDE.lng), true);
  assert.equal(areaCoversPoint(area, 40.7, -74.0), false);
});

/** Staten Island — circle touches an unpublished ocean chunk; save must still work. */
const STATEN = { lat: 40.617, lng: -74.126 };

test('Staten Island omits peak chunks that are not in the index', () => {
  const wanted = chunksCovering(STATEN.lat, STATEN.lng, OFFLINE_RADIUS_M, PEAK_INDEX.cellDeg);
  const resolved = resolveOfflinePeakChunks(STATEN.lat, STATEN.lng, PEAK_INDEX);
  const have = new Set(PEAK_INDEX.chunks.map((chunk) => chunk.id));
  const missingFromIndex = wanted.filter((id) => !have.has(id));
  assert.ok(missingFromIndex.length > 0, 'fixture expects at least one non-index cell');
  assert.ok(resolved.length < wanted.length);
  assert.equal(resolved.every((id) => have.has(id)), true);
  const manifest = offlineManifestFor(STATEN.lat, STATEN.lng, OFFLINE_RADIUS_M, resolved);
  assert.ok(manifest.peakUrls.every((url) => !url.includes(missingFromIndex[0])));
});
