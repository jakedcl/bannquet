import geometryJson from '../../../config/mountain-weather/avalanche-map-layer-geometry.json';
import type { AvalancheCenterId } from '@/lib/mountain-weather/avalanche-types';

type LonLat = [number, number];

type GeometryFile = {
  version: number;
  fetchedAt: string;
  centers: Record<
    AvalancheCenterId,
    {
      productId: number;
      properties: { name: string; state: string | null };
      geometry: { type: string; coordinates: unknown };
    }
  >;
};

const GEOM = geometryJson as GeometryFile;

/** Ray-cast point-in-polygon for a single outer ring (GeoJSON lon, lat). */
export function pointInPolygonRing(lon: number, lat: number, ring: LonLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointInGeoJsonGeometry(lon: number, lat: number, geometry: { type: string; coordinates: unknown }): boolean {
  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates as LonLat[][];
    return pointInPolygonRing(lon, lat, rings[0]);
  }
  if (geometry.type === 'MultiPolygon') {
    const polys = geometry.coordinates as LonLat[][][];
    return polys.some((poly) => pointInPolygonRing(lon, lat, poly[0]));
  }
  return false;
}

export function avalancheGeometryFetchedAt(): string {
  return GEOM.fetchedAt;
}

export function placeInsideAvalancheCenter(centerId: AvalancheCenterId, lon: number, lat: number): boolean {
  const entry = GEOM.centers[centerId];
  if (!entry) return false;
  return pointInGeoJsonGeometry(lon, lat, entry.geometry);
}

export function avalancheMapLayerGeometry() {
  return GEOM;
}