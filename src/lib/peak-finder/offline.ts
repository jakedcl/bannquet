import {
  CHUNK_DEG,
  OFFLINE_AVG_CHUNK_BYTES,
  OFFLINE_AVG_TILE_BYTES,
  OFFLINE_RADIUS_M,
  PEAKS_CACHE,
  TERRAIN_CACHE,
} from './constants';
import { distanceM } from './geo';
import { chunksCovering, loadPeakIndex, loadPeaksAround, type PeakIndex } from './peaks';
import { terrainTilesForRadius, terrariumUrl } from './tiles';

export type OfflineAreaRecord = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
  savedAt: string;
  terrainUrls: string[];
  peakUrls: string[];
};

export function offlinePeakChunkIds(lat: number, lng: number, radiusM = OFFLINE_RADIUS_M, deg = CHUNK_DEG): string[] {
  return chunksCovering(lat, lng, radiusM, deg);
}

export function offlineTerrainTileUrls(lat: number, lng: number, radiusM = OFFLINE_RADIUS_M): string[] {
  return terrainTilesForRadius(lat, lng, radiusM).map(terrariumUrl);
}

export function estimateOfflineBytes(tileCount: number, chunkCount: number, extraBytes = 120_000): number {
  return tileCount * OFFLINE_AVG_TILE_BYTES + chunkCount * OFFLINE_AVG_CHUNK_BYTES + extraBytes;
}

export function formatOfflineSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function areaCoversPoint(area: Pick<OfflineAreaRecord, 'lat' | 'lng' | 'radiusM'>, lat: number, lng: number): boolean {
  return distanceM(area.lat, area.lng, lat, lng) <= area.radiusM;
}

/** Peak chunk ids that exist in the published index (ocean / empty cells are omitted). */
export function resolveOfflinePeakChunks(
  lat: number,
  lng: number,
  index: PeakIndex,
  radiusM = OFFLINE_RADIUS_M,
): string[] {
  const wanted = chunksCovering(lat, lng, radiusM, index.cellDeg || CHUNK_DEG);
  const have = new Set(index.chunks.map((chunk) => chunk.id));
  return wanted.filter((id) => have.has(id));
}

export function offlineManifestFor(
  lat: number,
  lng: number,
  radiusM = OFFLINE_RADIUS_M,
  peakChunkIds?: readonly string[],
): { terrainUrls: string[]; peakUrls: string[]; tileCount: number; chunkCount: number; estimatedBytes: number } {
  const terrainUrls = offlineTerrainTileUrls(lat, lng, radiusM);
  const chunkIds = peakChunkIds ? [...peakChunkIds] : offlinePeakChunkIds(lat, lng, radiusM);
  const peakUrls = [
    '/peak-finder/peaks/index.json',
    '/peak-finder/declination.v1.json',
    ...chunkIds.map((id) => `/peak-finder/peaks/us/${id}.v1.json`),
  ];
  return {
    terrainUrls,
    peakUrls,
    tileCount: terrainUrls.length,
    chunkCount: chunkIds.length,
    estimatedBytes: estimateOfflineBytes(terrainUrls.length, chunkIds.length),
  };
}

const DOWNLOAD_CONCURRENCY = 4;

async function mapPool<T>(items: readonly T[], size: number, run: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await run(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, () => worker()));
}

async function putUrls(
  cache: Cache,
  urls: readonly string[],
  onDone: (n: number) => void,
  options?: { skipFailed?: boolean },
): Promise<void> {
  let finished = 0;
  await mapPool(urls, DOWNLOAD_CONCURRENCY, async (url) => {
    const hit = await cache.match(url);
    if (!hit) {
      const res = await fetch(url, { mode: url.startsWith('http') ? 'cors' : 'same-origin' });
      if (!res.ok) {
        if (options?.skipFailed) {
          finished += 1;
          onDone(finished);
          return;
        }
        throw new Error(`Could not download ${url}`);
      }
      await cache.put(url, res);
    }
    finished += 1;
    onDone(finished);
  });
}

export type DownloadProgress = { done: number; total: number };

export async function requestOfflinePersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function downloadOfflineData(
  lat: number,
  lng: number,
  onProgress: (state: DownloadProgress) => void,
  radiusM = OFFLINE_RADIUS_M,
): Promise<{ terrainUrls: string[]; peakUrls: string[] }> {
  if (typeof caches === 'undefined') throw new Error('Cache Storage is not available in this browser.');
  await requestOfflinePersistence();
  const index = await loadPeakIndex();
  const chunkIds = resolveOfflinePeakChunks(lat, lng, index, radiusM);
  const manifest = offlineManifestFor(lat, lng, radiusM, chunkIds);
  const total = manifest.terrainUrls.length + manifest.peakUrls.length;
  let done = 0;
  const tick = () => onProgress({ done, total });
  tick();
  const terrainCache = await caches.open(TERRAIN_CACHE);
  const peaksCache = await caches.open(PEAKS_CACHE);
  try {
    await putUrls(terrainCache, manifest.terrainUrls, (n) => {
      done = n;
      tick();
    }, { skipFailed: true });
    await putUrls(peaksCache, manifest.peakUrls, (n) => {
      done = manifest.terrainUrls.length + n;
      tick();
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/quota|storage|space/i.test(message)) {
      throw new Error('Not enough storage for this download. Remove an older saved area or free space on the device.');
    }
    throw error;
  }
  return { terrainUrls: manifest.terrainUrls, peakUrls: manifest.peakUrls };
}

export function defaultAreaName(lat: number, lng: number): string {
  return `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;
}

export async function suggestAreaName(lat: number, lng: number): Promise<string> {
  try {
    const { peaks } = await loadPeaksAround(lat, lng, 80_000);
    if (peaks.length === 0) return defaultAreaName(lat, lng);
    let nearest = peaks[0];
    let best = distanceM(lat, lng, nearest.lat, nearest.lng);
    for (const peak of peaks) {
      const d = distanceM(lat, lng, peak.lat, peak.lng);
      if (d < best) {
        best = d;
        nearest = peak;
      }
    }
    return `Near ${nearest.name}`;
  } catch {
    return defaultAreaName(lat, lng);
  }
}

export async function offlineManifestResolved(
  lat: number,
  lng: number,
  radiusM = OFFLINE_RADIUS_M,
): Promise<ReturnType<typeof offlineManifestFor>> {
  const index = await loadPeakIndex();
  const chunkIds = resolveOfflinePeakChunks(lat, lng, index, radiusM);
  return offlineManifestFor(lat, lng, radiusM, chunkIds);
}
