import { readFileSync } from 'node:fs';

type Ring = number[][];
type Geometry = { type: string; coordinates: unknown };

export type StateLand = {
  name: string;
  bbox: { west: number; south: number; east: number; north: number };
  polygons: Ring[][];
};

const SKIP = new Set(['Puerto Rico']);

export function loadStates(file: string): StateLand[] {
  const data = JSON.parse(readFileSync(file, 'utf8')) as {
    features: { properties: { name?: string }; geometry: Geometry }[];
  };
  return data.features.flatMap((feature) => {
    const name = feature.properties.name ?? '';
    if (!name || SKIP.has(name)) return [];
    const polygons = polygonsOf(feature.geometry);
    if (polygons.length === 0) return [];
    let west = Infinity;
    let south = Infinity;
    let east = -Infinity;
    let north = -Infinity;
    for (const polygon of polygons) {
      for (const [lng, lat] of polygon[0] ?? []) {
        west = Math.min(west, lng);
        east = Math.max(east, lng);
        south = Math.min(south, lat);
        north = Math.max(north, lat);
      }
    }
    return [{ name, bbox: { west, south, east, north }, polygons }];
  });
}

function polygonsOf(geometry: Geometry): Ring[][] {
  if (geometry.type === 'Polygon') return [geometry.coordinates as Ring[]];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates as Ring[][];
  return [];
}

function ringHas(ring: Ring, lng: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = (yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function polygonHas(polygon: Ring[], lng: number, lat: number): boolean {
  let inside = false;
  for (const ring of polygon) {
    if (ringHas(ring, lng, lat)) inside = !inside;
  }
  return inside;
}

/**
 * The outline file is simplified and drops islands and inlets. A peak that sits
 * just off that line still counts when a nearby sample (about 40 km) lands in a state.
 * Montreal is much farther than that, so it stays out.
 */
export function stateNear(states: readonly StateLand[], lng: number, lat: number): string | null {
  const direct = stateAt(states, lng, lat);
  if (direct) return direct;
  for (const step of [0.08, 0.18, 0.28, 0.4]) {
    const offsets = [
      [step, 0], [-step, 0], [0, step], [0, -step],
      [step, step], [step, -step], [-step, step], [-step, -step],
    ];
    for (const [dx, dy] of offsets) {
      const hit = stateAt(states, lng + dx, lat + dy);
      if (hit) return hit;
    }
  }
  return null;
}

export function stateAt(states: readonly StateLand[], lng: number, lat: number): string | null {
  for (const state of states) {
    const box = state.bbox;
    if (lng < box.west || lng > box.east || lat < box.south || lat > box.north) continue;
    if (state.polygons.some((polygon) => polygonHas(polygon, lng, lat))) return state.name;
  }
  return null;
}

export const NORTHEAST = new Set([
  'New York',
  'New Jersey',
  'Pennsylvania',
  'Connecticut',
  'Rhode Island',
  'Massachusetts',
  'Vermont',
  'New Hampshire',
  'Maine',
]);

export const NORTHEAST_CODES = new Set(['NY', 'NJ', 'PA', 'CT', 'RI', 'MA', 'VT', 'NH', 'ME']);
