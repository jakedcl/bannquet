import { RAY_STEP_DEG } from './constants';
import { distanceM } from './geo';
import type { WorkerIn, WorkerOut } from './payload';
import { castSkyline, viewProfile, type Skyline } from './skyline';
import { loadTerrariumTile } from './tile-cache';
import { sampleHeight, terrainTiles } from './tiles';
import { eyeHeightM, ON_SUMMIT_M, peakUnderfoot, raiseSummit, visiblePeaks } from './visibility';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerIn>) => void) | null;
  postMessage: (message: WorkerOut) => void;
};

function pack(
  skyline: Skyline,
  eyeM: number,
  peaks: ReturnType<typeof visiblePeaks>,
  onSummit: { name: string; elevationM: number } | null,
) {
  const drawn = viewProfile(skyline);
  return {
    eyeM,
    stepDeg: skyline.stepDeg,
    angleDeg: drawn.angleDeg,
    distanceM: drawn.distanceM,
    layers: drawn.layers,
    peaks,
    onSummit,
  };
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
  const eyeM = eyeHeightM(message.lat, message.lng, (lat, lng) => sampleHeight(grids, lat, lng, 0));
  const skyline = castSkyline(message.lat, message.lng, eyeM, heightAt, RAY_STEP_DEG);
  const raised = message.peaks.flatMap((peak) => {
    const metres = distanceM(message.lat, message.lng, peak.lat, peak.lng);
    const next = raiseSummit(peak, (lat, lng) => sampleHeight(grids, lat, lng, metres));
    return next ? [next] : [];
  });
  const underfoot = peakUnderfoot(message.lat, message.lng, message.peaks);
  const raisedHere = underfoot
    ? raiseSummit(underfoot, (lat, lng) => sampleHeight(grids, lat, lng, 0))
    : null;
  const onSummit = raisedHere ? { name: raisedHere.name, elevationM: raisedHere.elevationM } : null;
  const peaks = visiblePeaks(message.lat, message.lng, eyeM, raised, skyline).filter((peak) => {
    if (!onSummit || peak.name !== onSummit.name) return true;
    return peak.distanceM > ON_SUMMIT_M + 40;
  });
  scope.postMessage({ type: 'result', payload: pack(skyline, eyeM, peaks, onSummit) });
}
