import { distanceM } from './geo';
import { CHUNK_DEG, MAX_DISTANCE_M, PEAKS_CACHE } from './constants';

export type Peak = {
  name: string;
  lat: number;
  lng: number;
  elevationM: number | null;
};

export type RawPeak = Peak & { source: 'osm' | 'geonames' };

/** Compact row: [name, lng×10⁴, lat×10⁴, height m or null]. Position is good to about 10 m. */
export type PeakRow = [string, number, number, number | null];

export type ChunkFile = {
  v: 1;
  id: string;
  sw: [number, number];
  peaks: PeakRow[];
};

export type PeakIndex = {
  v: 1;
  coverage: 'northeast' | 'us';
  states: string[];
  cellDeg: number;
  built: string;
  count: number;
  credits: string;
  chunks: { id: string; count: number }[];
};

export function formatCellId(swLat: number, swLng: number): string {
  const ns = swLat >= 0 ? 'n' : 's';
  const ew = swLng >= 0 ? 'e' : 'w';
  const lat = String(Math.abs(Math.trunc(swLat))).padStart(2, '0');
  const lng = String(Math.abs(Math.trunc(swLng))).padStart(3, '0');
  return `${ns}${lat}${ew}${lng}`;
}

export function chunkOrigin(lat: number, lng: number, deg = CHUNK_DEG): { lat: number; lng: number } {
  return {
    lat: Math.floor(lat / deg) * deg,
    lng: Math.floor(lng / deg) * deg,
  };
}

export function chunkId(lat: number, lng: number, deg = CHUNK_DEG): string {
  const origin = chunkOrigin(lat, lng, deg);
  return formatCellId(origin.lat, origin.lng);
}

function cellIntersects(swLat: number, swLng: number, deg: number, lat: number, lng: number, radiusM: number): boolean {
  const closestLat = Math.min(Math.max(lat, swLat), swLat + deg);
  const closestLng = Math.min(Math.max(lng, swLng), swLng + deg);
  return distanceM(lat, lng, closestLat, closestLng) <= radiusM;
}

/** 2° squares whose area comes within `radiusM` of the spot. */
export function chunksCovering(lat: number, lng: number, radiusM = MAX_DISTANCE_M, deg = CHUNK_DEG): string[] {
  const dLat = radiusM / 110_574;
  const cos = Math.cos((lat * Math.PI) / 180);
  const dLng = radiusM / (111_320 * Math.max(0.2, cos));
  const minLat = lat - dLat;
  const maxLat = lat + dLat;
  const minLng = lng - dLng;
  const maxLng = lng + dLng;
  const ids: string[] = [];
  for (let la = Math.floor(minLat / deg) * deg; la <= maxLat + 1e-9; la += deg) {
    for (let ln = Math.floor(minLng / deg) * deg; ln <= maxLng + 1e-9; ln += deg) {
      if (cellIntersects(la, ln, deg, lat, lng, radiusM)) ids.push(formatCellId(la, ln));
    }
  }
  return ids;
}

export function encodePeak(peak: Peak): PeakRow {
  return [
    peak.name,
    Math.round(peak.lng * 10_000),
    Math.round(peak.lat * 10_000),
    peak.elevationM == null ? null : Math.round(peak.elevationM),
  ];
}

export function decodePeak(row: PeakRow): Peak {
  return {
    name: row[0],
    lng: row[1] / 10_000,
    lat: row[2] / 10_000,
    elevationM: row[3],
  };
}

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function cellKey(lat: number, lng: number, size: number): string {
  return `${Math.floor(lat / size)}:${Math.floor(lng / size)}`;
}

function nearby<T extends { lat: number; lng: number }>(index: Map<string, T[]>, lat: number, lng: number, size: number): T[] {
  const latCell = Math.floor(lat / size);
  const lngCell = Math.floor(lng / size);
  const found: T[] = [];
  for (let la = latCell - 1; la <= latCell + 1; la += 1) {
    for (let ln = lngCell - 1; ln <= lngCell + 1; ln += 1) {
      const list = index.get(`${la}:${ln}`);
      if (list) found.push(...list);
    }
  }
  return found;
}

function namedNearby(index: Map<string, RawPeak[]>, name: string, lat: number, lng: number, size: number): RawPeak[] {
  const latCell = Math.floor(lat / size);
  const lngCell = Math.floor(lng / size);
  const found: RawPeak[] = [];
  for (let la = latCell - 1; la <= latCell + 1; la += 1) {
    for (let ln = lngCell - 1; ln <= lngCell + 1; ln += 1) {
      const list = index.get(`${name}@${la}:${ln}`);
      if (list) found.push(...list);
    }
  }
  return found;
}

/**
 * Keep every OSM peak. A GeoNames peak is dropped when an OSM peak with the same
 * name sits within 1.5 km, or any OSM peak sits within 200 m.
 * OSM peaks with the same name within 200 m collapse to the higher one.
 */
export function dedupePeaks(osm: RawPeak[], geonames: RawPeak[]): RawPeak[] {
  const kept: RawPeak[] = [];
  const fine = new Map<string, RawPeak[]>();
  const nameIndex = new Map<string, RawPeak[]>();
  const FINE = 0.002;
  const NAME = 0.02;

  const add = (peak: RawPeak) => {
    kept.push(peak);
    const fineKey = cellKey(peak.lat, peak.lng, FINE);
    const nameKey = `${normalizeName(peak.name)}@${cellKey(peak.lat, peak.lng, NAME)}`;
    const fineList = fine.get(fineKey);
    if (fineList) fineList.push(peak);
    else fine.set(fineKey, [peak]);
    const nameList = nameIndex.get(nameKey);
    if (nameList) nameList.push(peak);
    else nameIndex.set(nameKey, [peak]);
  };

  const osmSorted = [...osm].sort((a, b) => (b.elevationM ?? -1) - (a.elevationM ?? -1));
  for (const peak of osmSorted) {
    const name = normalizeName(peak.name);
    if (!name) continue;
    const same = nearby(fine, peak.lat, peak.lng, FINE).some((other) => (
      normalizeName(other.name) === name && distanceM(peak.lat, peak.lng, other.lat, other.lng) <= 200
    ));
    if (!same) add(peak);
  }

  for (const peak of geonames) {
    const name = normalizeName(peak.name);
    if (!name) continue;
    const tooClose = nearby(fine, peak.lat, peak.lng, FINE).some((other) => (
      distanceM(peak.lat, peak.lng, other.lat, other.lng) <= 200
    ));
    if (tooClose) continue;
    const nameHit = namedNearby(nameIndex, name, peak.lat, peak.lng, NAME).some((other) => (
      distanceM(peak.lat, peak.lng, other.lat, other.lng) <= 1_500
    ));
    if (nameHit) continue;
    add(peak);
  }

  return kept;
}

export function sameNameWithin(peaks: readonly Peak[], metres: number): boolean {
  const index = new Map<string, Peak[]>();
  const size = 0.002;
  for (const peak of peaks) {
    const key = cellKey(peak.lat, peak.lng, size);
    const list = index.get(key);
    if (list) list.push(peak);
    else index.set(key, [peak]);
  }
  for (const peak of peaks) {
    const name = normalizeName(peak.name);
    for (const other of nearby(index, peak.lat, peak.lng, size)) {
      if (other === peak) continue;
      if (normalizeName(other.name) !== name) continue;
      if (distanceM(peak.lat, peak.lng, other.lat, other.lng) <= metres) return true;
    }
  }
  return false;
}

export function decodeChunk(file: ChunkFile): Peak[] {
  return file.peaks.map(decodePeak);
}

async function fetchCached(url: string): Promise<Response> {
  if (typeof caches === 'undefined') {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not load ${url}`);
    return res;
  }
  const cache = await caches.open(PEAKS_CACHE);
  const hit = await cache.match(url);
  if (hit) return hit;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url}`);
  await cache.put(url, res.clone());
  return res;
}

export async function loadPeakIndex(): Promise<PeakIndex> {
  const res = await fetchCached('/peak-finder/peaks/index.json');
  return res.json() as Promise<PeakIndex>;
}

export async function loadChunks(ids: readonly string[]): Promise<Peak[]> {
  const files = await Promise.all(ids.map(async (id) => {
    const res = await fetchCached(`/peak-finder/peaks/us/${id}.v1.json`);
    const file = await res.json() as ChunkFile;
    return decodeChunk(file);
  }));
  return files.flat();
}

/** Peaks from the chunks that cover the circle, then cut to the radius. */
export async function loadPeaksAround(lat: number, lng: number, radiusM = MAX_DISTANCE_M): Promise<{
  peaks: Peak[];
  wanted: string[];
  loaded: string[];
  index: PeakIndex;
}> {
  const index = await loadPeakIndex();
  const wanted = chunksCovering(lat, lng, radiusM, index.cellDeg || CHUNK_DEG);
  const have = new Set(index.chunks.map((chunk) => chunk.id));
  const loaded = wanted.filter((id) => have.has(id));
  const peaks = (await loadChunks(loaded)).filter((peak) => distanceM(lat, lng, peak.lat, peak.lng) <= radiusM);
  return { peaks, wanted, loaded, index };
}
