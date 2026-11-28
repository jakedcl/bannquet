import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { trackStats, type TrackPoint } from '@/lib/gpx';
import { distanceM } from '@/lib/peak-finder/geo';
import { decodeTerrariumPng } from '@/lib/terrain/decode-terrarium';
import { lngLatToTile, sampleTile, terrariumUrl, type TileId } from '@/lib/peak-finder/tiles';

export type LatLng = { lat: number; lng: number };

/** Terrarium zoom 12 ≈ 20–30 m ground spacing in the Northeast (44°N). */
export const TERRAIN_ELEV_ZOOM = 12;

/** Sample interval along stored lines; matches terrain pixel scale at {@link TERRAIN_ELEV_ZOOM}. */
export const TERRAIN_ELEV_SPACING_M = 25;

/** Cap so long routes do not download unbounded tiles. */
export const TERRAIN_ELEV_POINT_CAP = 12_000;

const TERRAIN_TILE_CONCURRENCY = 4;

export function parseLineStringWkt(wkt: string): LatLng[] {
  const body = wkt.replace(/^SRID=\d+;/i, '').trim();
  const match = body.match(/^LINESTRING\s*\(([\s\S]*)\)\s*$/i);
  if (!match?.[1]) throw new Error('Expected a 2D LINESTRING WKT');
  const coords: LatLng[] = [];
  for (const pair of match[1].split(',')) {
    const parts = pair.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const lng = Number(parts[0]);
    const lat = Number(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    coords.push({ lat, lng });
  }
  if (coords.length < 2) throw new Error('LINESTRING needs at least two coordinates');
  return coords;
}

/**
 * Place vertices every `spacingM` along a 2D line (great-circle segments), keeping endpoints.
 * Best for sparse polylines (typical saved member routes).
 */
export function densifyLine(
  coords: LatLng[],
  spacingM = TERRAIN_ELEV_SPACING_M,
  maxPoints = TERRAIN_ELEV_POINT_CAP,
): LatLng[] {
  if (coords.length < 2) return [...coords];
  const out: LatLng[] = [coords[0]!];
  for (let index = 1; index < coords.length && out.length < maxPoints; index += 1) {
    const a = coords[index - 1]!;
    const b = coords[index]!;
    const segLen = distanceM(a.lat, a.lng, b.lat, b.lng);
    if (segLen <= 0) continue;
    const steps = Math.max(1, Math.ceil(segLen / spacingM));
    for (let step = 1; step <= steps && out.length < maxPoints; step += 1) {
      if (step === steps && index === coords.length - 1) {
        out.push(b);
        break;
      }
      const t = step / steps;
      out.push({
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t,
      });
    }
  }
  const end = coords[coords.length - 1]!;
  const last = out[out.length - 1];
  if (!last || last.lat !== end.lat || last.lng !== end.lng) {
    if (out.length < maxPoints) out.push(end);
  }
  return out;
}

function pointAlong(coords: LatLng[], targetM: number): LatLng {
  let walked = 0;
  for (let index = 1; index < coords.length; index += 1) {
    const a = coords[index - 1]!;
    const b = coords[index]!;
    const segLen = distanceM(a.lat, a.lng, b.lat, b.lng);
    if (walked + segLen >= targetM) {
      const t = segLen === 0 ? 0 : (targetM - walked) / segLen;
      return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
    }
    walked += segLen;
  }
  return coords[coords.length - 1]!;
}

/**
 * Even spacing along path length — does not stop early on dense inputs (Tomvanz lines).
 */
export function resampleLine(
  coords: LatLng[],
  spacingM = TERRAIN_ELEV_SPACING_M,
  maxPoints = TERRAIN_ELEV_POINT_CAP,
): LatLng[] {
  if (coords.length < 2) return [...coords];
  let totalM = 0;
  for (let index = 1; index < coords.length; index += 1) {
    const a = coords[index - 1]!;
    const b = coords[index]!;
    totalM += distanceM(a.lat, a.lng, b.lat, b.lng);
  }
  if (totalM <= 0) return [coords[0]!, coords[coords.length - 1]!];
  const bySpacing = Math.floor(totalM / spacingM) + 1;
  const count = Math.min(maxPoints, Math.max(2, bySpacing));
  if (count === 2) return [coords[0]!, coords[coords.length - 1]!];
  const stepM = totalM / (count - 1);
  const out: LatLng[] = [];
  for (let sample = 0; sample < count; sample += 1) {
    out.push(pointAlong(coords, Math.min(totalM, sample * stepM)));
  }
  return out;
}

export function prepareLineSamples(
  coords: LatLng[],
  spacingM = TERRAIN_ELEV_SPACING_M,
  maxPoints = TERRAIN_ELEV_POINT_CAP,
): LatLng[] {
  if (coords.length < 2) return [...coords];
  let totalM = 0;
  for (let index = 1; index < coords.length; index += 1) {
    const a = coords[index - 1]!;
    const b = coords[index]!;
    totalM += distanceM(a.lat, a.lng, b.lat, b.lng);
  }
  const avgSpacing = totalM / (coords.length - 1);
  if (avgSpacing <= spacingM * 1.25) return resampleLine(coords, spacingM, maxPoints);
  return densifyLine(coords, spacingM, maxPoints);
}

export function tilesForLine(coords: LatLng[], zoom = TERRAIN_ELEV_ZOOM): TileId[] {
  const seen = new Set<string>();
  const tiles: TileId[] = [];
  for (const point of coords) {
    const tile = lngLatToTile(point.lng, point.lat, zoom);
    const key = `${tile.z}/${tile.x}/${tile.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tiles.push(tile);
  }
  return tiles;
}

/** One-pass moving average; softens Terrarium pixel steps before the 2 m gain threshold. */
export function smoothElevations(points: TrackPoint[], window = 3): TrackPoint[] {
  if (window < 2 || points.length < window) return points;
  const half = Math.floor(window / 2);
  return points.map((point, index) => {
    if (point.ele == null) return point;
    let sum = 0;
    let count = 0;
    for (let offset = -half; offset <= half; offset += 1) {
      const neighbor = points[index + offset];
      if (!neighbor || neighbor.ele == null) continue;
      sum += neighbor.ele;
      count += 1;
    }
    if (count === 0) return point;
    return { ...point, ele: sum / count };
  });
}

export type TerrariumGridStore = ReadonlyMap<string, Float32Array>;

export class TerrariumTileCache {
  readonly grids = new Map<string, Float32Array>();
  private readonly inflight = new Map<string, Promise<Float32Array>>();
  private readonly diskDir: string | undefined;

  constructor(options?: { diskDir?: string }) {
    this.diskDir = options?.diskDir;
    if (this.diskDir) mkdirSync(this.diskDir, { recursive: true });
  }

  private tileFile(tile: TileId): string | undefined {
    if (!this.diskDir) return undefined;
    return join(this.diskDir, `${tile.z}-${tile.x}-${tile.y}.png`);
  }

  private async fetchTile(tile: TileId): Promise<Float32Array> {
    const key = `${tile.z}/${tile.x}/${tile.y}`;
    const cached = this.grids.get(key);
    if (cached) return cached;

    const existing = this.inflight.get(key);
    if (existing) return existing;

    const work = (async () => {
      const file = this.tileFile(tile);
      let buf: Buffer;
      if (file && existsSync(file)) {
        buf = readFileSync(file);
      } else {
        const response = await fetch(terrariumUrl(tile));
        if (!response.ok) throw new Error(`Terrarium ${key} HTTP ${response.status}`);
        buf = Buffer.from(await response.arrayBuffer());
        if (file) writeFileSync(file, buf);
      }
      const grid = decodeTerrariumPng(buf);
      this.grids.set(key, grid);
      this.inflight.delete(key);
      return grid;
    })();
    this.inflight.set(key, work);
    return work;
  }

  async loadTiles(tiles: TileId[]): Promise<void> {
    let cursor = 0;
    async function worker(cache: TerrariumTileCache) {
      while (cursor < tiles.length) {
        const tile = tiles[cursor];
        cursor += 1;
        if (!tile) continue;
        await cache.fetchTile(tile);
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(TERRAIN_TILE_CONCURRENCY, tiles.length || 1) }, () => worker(this)),
    );
  }
}

export type ElevGainFromTerrainOptions = {
  spacingM?: number;
  zoom?: number;
  maxPoints?: number;
  smoothWindow?: number;
  cache?: TerrariumTileCache;
};

function samplePoints(coords: LatLng[], grids: TerrariumGridStore, zoom: number): TrackPoint[] {
  const points: TrackPoint[] = [];
  for (const coord of coords) {
    const ele = sampleTile(grids, coord.lat, coord.lng, zoom);
    points.push({ lat: coord.lat, lng: coord.lng, ele });
  }
  return points;
}

/**
 * Estimate climb for a stored 2D line by densifying, sampling AWS Terrarium at {@link TERRAIN_ELEV_ZOOM},
 * and running the same {@link trackStats} hysteresis as GPX uploads.
 */
export async function elevGainFromTerrainLine(
  wkt: string,
  options: ElevGainFromTerrainOptions = {},
): Promise<number> {
  const spacingM = options.spacingM ?? TERRAIN_ELEV_SPACING_M;
  const zoom = options.zoom ?? TERRAIN_ELEV_ZOOM;
  const maxPoints = options.maxPoints ?? TERRAIN_ELEV_POINT_CAP;
  const smoothWindow = options.smoothWindow ?? 3;
  const cache = options.cache ?? new TerrariumTileCache({ diskDir: '/tmp/bannquet-terrain-tiles' });

  const line = parseLineStringWkt(wkt);
  const densified = prepareLineSamples(line, spacingM, maxPoints);
  const tiles = tilesForLine(densified, zoom);
  await cache.loadTiles(tiles);

  let points = samplePoints(densified, cache.grids, zoom);
  if (smoothWindow >= 2) points = smoothElevations(points, smoothWindow);
  return trackStats(points).elevGainM;
}