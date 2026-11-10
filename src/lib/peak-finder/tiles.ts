import { distanceM } from './geo';
import { MARCY, MAX_DISTANCE_M } from './constants';
import { TERRARIUM_TILES } from '@/lib/map';

export type TileId = { z: number; x: number; y: number };

/**
 * Near ground uses finer tiles. Each ring is a disk out to that distance, not a hole in the middle.
 * Zoom 12 inside 8 km is what keeps a nearby summit from looking like a stack of flat steps.
 */
export const TERRAIN_RINGS: readonly { zoom: number; radiusM: number }[] = [
  { zoom: 12, radiusM: 8_000 },
  { zoom: 11, radiusM: 10_000 },
  { zoom: 10, radiusM: 50_000 },
  { zoom: 9, radiusM: 100_000 },
  { zoom: 8, radiusM: MAX_DISTANCE_M },
];

export function terrariumUrl(tile: TileId): string {
  return TERRARIUM_TILES.replace('{z}', String(tile.z)).replace('{x}', String(tile.x)).replace('{y}', String(tile.y));
}

/** Terrarium PNG pixel: height in metres. */
export function terrariumHeight(red: number, green: number, blue: number): number {
  return red * 256 + green + blue / 256 - 32768;
}

export function lngLatToTile(lng: number, lat: number, zoom: number): TileId {
  const clamped = Math.min(85.05112878, Math.max(-85.05112878, lat));
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (clamped * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { z: zoom, x, y };
}

function mercatorLat(yNorm: number): number {
  const t = Math.PI * (1 - 2 * yNorm);
  return (Math.atan(Math.sinh(t)) * 180) / Math.PI;
}

export function tileBounds(tile: TileId): { west: number; south: number; east: number; north: number } {
  const n = 2 ** tile.z;
  return {
    west: (tile.x / n) * 360 - 180,
    east: ((tile.x + 1) / n) * 360 - 180,
    north: mercatorLat(tile.y / n),
    south: mercatorLat((tile.y + 1) / n),
  };
}

function tileHitsCircle(tile: TileId, lat: number, lng: number, radiusM: number): boolean {
  const box = tileBounds(tile);
  const closestLat = Math.min(Math.max(lat, box.south), box.north);
  const closestLng = Math.min(Math.max(lng, box.west), box.east);
  return distanceM(lat, lng, closestLat, closestLng) <= radiusM;
}

export function tilesCoveringCircle(lat: number, lng: number, radiusM: number, zoom: number): TileId[] {
  const dLat = (radiusM / EARTH_LAT_M) + 0.02;
  const cos = Math.cos((lat * Math.PI) / 180);
  const dLng = radiusM / (111_320 * Math.max(0.2, cos)) + 0.02;
  const sw = lngLatToTile(lng - dLng, lat - dLat, zoom);
  const ne = lngLatToTile(lng + dLng, lat + dLat, zoom);
  const tiles: TileId[] = [];
  for (let x = Math.min(sw.x, ne.x); x <= Math.max(sw.x, ne.x); x += 1) {
    for (let y = Math.min(sw.y, ne.y); y <= Math.max(sw.y, ne.y); y += 1) {
      const tile = { z: zoom, x, y };
      if (tileHitsCircle(tile, lat, lng, radiusM)) tiles.push(tile);
    }
  }
  return tiles;
}

const EARTH_LAT_M = 110_574;

/** Tiles for one view: fine zoom close in, coarse zoom out to 200 km. */
export function terrainTiles(lat: number, lng: number): TileId[] {
  const seen = new Set<string>();
  const tiles: TileId[] = [];
  for (const ring of TERRAIN_RINGS) {
    for (const tile of tilesCoveringCircle(lat, lng, ring.radiusM, ring.zoom)) {
      const key = `${tile.z}/${tile.x}/${tile.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      tiles.push(tile);
    }
  }
  return tiles;
}

export function zoomForDistance(distanceM: number): number {
  if (distanceM <= 8_000) return 12;
  if (distanceM <= 10_000) return 11;
  if (distanceM <= 50_000) return 10;
  if (distanceM <= 100_000) return 9;
  return 8;
}

function pixelAt(
  grids: ReadonlyMap<string, Float32Array>,
  zoom: number,
  tileX: number,
  tileY: number,
  px: number,
  py: number,
): number | null {
  let x = tileX;
  let y = tileY;
  let sx = px;
  let sy = py;
  if (sx < 0) {
    x -= 1;
    sx += 256;
  } else if (sx > 255) {
    x += 1;
    sx -= 256;
  }
  if (sy < 0) {
    y -= 1;
    sy += 256;
  } else if (sy > 255) {
    y += 1;
    sy -= 256;
  }
  if (sx < 0 || sx > 255 || sy < 0 || sy > 255) return null;
  const n = 2 ** zoom;
  x = ((x % n) + n) % n;
  if (y < 0 || y >= n) return null;
  const grid = grids.get(`${zoom}/${x}/${y}`);
  if (!grid) return null;
  return grid[sy * 256 + sx] ?? null;
}

/**
 * Height at a lat/lng. Blends the four surrounding pixels so a ridge slopes
 * instead of stepping every time the sample crosses into the next pixel.
 * Returns null when the tile under the point is missing.
 */
export function sampleTile(
  grids: ReadonlyMap<string, Float32Array>,
  lat: number,
  lng: number,
  zoom: number,
): number | null {
  const tile = lngLatToTile(lng, lat, zoom);
  if (!grids.has(`${tile.z}/${tile.x}/${tile.y}`)) return null;
  const n = 2 ** zoom;
  const fx = ((lng + 180) / 360) * n;
  const clamped = Math.min(85.05112878, Math.max(-85.05112878, lat));
  const latRad = (clamped * Math.PI) / 180;
  const fy = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
  const x = (fx - tile.x) * 256 - 0.5;
  const y = (fy - tile.y) * 256 - 0.5;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const h00 = pixelAt(grids, zoom, tile.x, tile.y, x0, y0);
  const h10 = pixelAt(grids, zoom, tile.x, tile.y, x0 + 1, y0);
  const h01 = pixelAt(grids, zoom, tile.x, tile.y, x0, y0 + 1);
  const h11 = pixelAt(grids, zoom, tile.x, tile.y, x0 + 1, y0 + 1);
  const nearest = h00 ?? h10 ?? h01 ?? h11;
  if (nearest == null) return null;
  const a = h00 ?? nearest;
  const b = h10 ?? nearest;
  const c = h01 ?? nearest;
  const d = h11 ?? nearest;
  return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty;
}

export function sampleHeight(grids: ReadonlyMap<string, Float32Array>, lat: number, lng: number, distance: number): number | null {
  const preferred = zoomForDistance(distance);
  for (const zoom of [preferred, preferred - 1, preferred + 1, 8, 9, 10, 11]) {
    if (zoom < 8 || zoom > 11) continue;
    const height = sampleTile(grids, lat, lng, zoom);
    if (height != null) return height;
  }
  return null;
}

export const MARCY_TILE_COUNT = terrainTiles(MARCY.lat, MARCY.lng).length;
