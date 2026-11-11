import { TERRAIN_CACHE, TERRAIN_CACHE_CAP_BYTES } from './constants';
import { terrariumHeight, terrariumUrl, type TileId } from './tiles';

const ORDER_URL = 'https://peak-finder.local/terrain-order';
const AVG_TILE_BYTES = 80_000;
const MAX_TILES = Math.floor(TERRAIN_CACHE_CAP_BYTES / AVG_TILE_BYTES);

async function readOrder(cache: Cache): Promise<string[]> {
  const hit = await cache.match(ORDER_URL);
  if (!hit) return [];
  const data = await hit.json() as { urls?: unknown };
  return Array.isArray(data.urls) ? data.urls.filter((url): url is string => typeof url === 'string') : [];
}

async function writeOrder(cache: Cache, urls: string[]): Promise<void> {
  await cache.put(ORDER_URL, new Response(JSON.stringify({ urls }), {
    headers: { 'Content-Type': 'application/json' },
  }));
}

async function trim(cache: Cache, urls: string[]): Promise<string[]> {
  const next = urls.slice();
  while (next.length > MAX_TILES) {
    const oldest = next.shift();
    if (oldest) await cache.delete(oldest);
  }
  return next;
}

export async function loadTerrariumTile(tile: TileId): Promise<Float32Array> {
  const url = terrariumUrl(tile);
  let blob: Blob;
  if (typeof caches === 'undefined') {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`Tile ${tile.z}/${tile.x}/${tile.y} failed`);
    blob = await res.blob();
  } else {
    const cache = await caches.open(TERRAIN_CACHE);
    let cached = await cache.match(url);
    if (!cached) {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(`Tile ${tile.z}/${tile.x}/${tile.y} failed`);
      await cache.put(url, res.clone());
      const order = await readOrder(cache);
      order.push(url);
      await writeOrder(cache, await trim(cache, order));
      cached = res;
    }
    blob = await cached.blob();
  }
  return decodeTerrarium(blob);
}

export async function decodeTerrarium(blob: Blob): Promise<Float32Array> {
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not decode a terrain tile.');
  ctx.drawImage(bitmap, 0, 0);
  const image = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  const heights = new Float32Array(bitmap.width * bitmap.height);
  const data = image.data;
  for (let i = 0, p = 0; i < heights.length; i += 1, p += 4) {
    heights[i] = terrariumHeight(data[p], data[p + 1], data[p + 2]);
  }
  bitmap.close();
  return heights;
}
