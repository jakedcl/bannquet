import { EYE_ABOVE_TERRAIN_M, RAY_STEP_DEG } from './constants';
import type { WorkerIn, WorkerOut } from './payload';
import { ridgesOnRay, castSkyline, skylineAngle, skylineDistance, type Skyline } from './skyline';
import { loadTerrariumTile } from './tile-cache';
import { sampleHeight, terrainTiles } from './tiles';
import { visiblePeaks, withTerrainHeights } from './visibility';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerIn>) => void) | null;
  postMessage: (message: WorkerOut) => void;
};

function pack(skyline: Skyline, eyeM: number, peaks: ReturnType<typeof visiblePeaks>) {
  const angleDeg = skyline.rays.map((ray) => skylineAngle(ray));
  const distanceM = skyline.rays.map((ray) => skylineDistance(ray));
  const layers = [0, 1, 2].map(() => ({
    angleDeg: Array<number>(skyline.rays.length).fill(Number.NaN),
    distanceM: Array<number>(skyline.rays.length).fill(Number.NaN),
  }));
  skyline.rays.forEach((ray, index) => {
    const skyDistance = skylineDistance(ray);
    const extras = ridgesOnRay(ray)
      .filter((hit) => Math.abs(hit.distanceM - skyDistance) > 800)
      .sort((a, b) => a.distanceM - b.distanceM);
    extras.slice(0, 3).forEach((hit, layer) => {
      layers[layer].angleDeg[index] = hit.angleDeg;
      layers[layer].distanceM[index] = hit.distanceM;
    });
  });
  return { eyeM, stepDeg: skyline.stepDeg, angleDeg, distanceM, layers, peaks };
}

async function mapPool<T>(items: readonly T[], size: number, run: (item: T, index: number) => Promise<void>): Promise<void> {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await run(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, () => worker()));
}

scope.onmessage = (event) => {
  const message = event.data;
  if (message.type !== 'build') return;
  void build(message).catch((error: unknown) => {
    const text = error instanceof Error ? error.message : 'The skyline failed.';
    scope.postMessage({ type: 'error', message: text });
  });
};

async function build(message: WorkerIn): Promise<void> {
  const tiles = terrainTiles(message.lat, message.lng);
  const grids = new Map<string, Float32Array>();
  let loaded = 0;
  let failed = 0;
  scope.postMessage({ type: 'progress', loaded: 0, total: tiles.length, stage: 'Loading terrain' });
  await mapPool(tiles, 6, async (tile) => {
    try {
      const heights = await loadTerrariumTile(tile);
      grids.set(`${tile.z}/${tile.x}/${tile.y}`, heights);
    } catch {
      failed += 1;
    } finally {
      loaded += 1;
      if (loaded % 2 === 0 || loaded === tiles.length) {
        scope.postMessage({ type: 'progress', loaded, total: tiles.length, stage: 'Loading terrain' });
      }
    }
  });
  if (grids.size === 0) {
    scope.postMessage({ type: 'error', message: 'The terrain did not load. Check the connection and try again.' });
    return;
  }
  if (failed > tiles.length / 2) {
    scope.postMessage({ type: 'error', message: 'Too many terrain tiles failed. Check the connection and try again.' });
    return;
  }
  scope.postMessage({ type: 'progress', loaded: tiles.length, total: tiles.length, stage: 'Drawing the skyline' });
  const heightAt = (lat: number, lng: number, distance: number) => sampleHeight(grids, lat, lng, distance) ?? 0;
  const eyeM = (sampleHeight(grids, message.lat, message.lng, 0) ?? 0) + EYE_ABOVE_TERRAIN_M;
  const skyline = castSkyline(message.lat, message.lng, eyeM, heightAt, RAY_STEP_DEG);
  const peaks = visiblePeaks(message.lat, message.lng, eyeM, withTerrainHeights(message.peaks, heightAt), skyline);
  scope.postMessage({ type: 'result', payload: pack(skyline, eyeM, peaks) });
}
