export type TrackPoint = {
  lat: number;
  lng: number;
  ele: number | null;
};

const POINT_PATTERN = /<(trkpt|rtept)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
const LAT_PATTERN = /\blat="([^"]+)"/i;
const LON_PATTERN = /\blon="([^"]+)"/i;
const ELE_PATTERN = /<ele>([^<]+)<\/ele>/i;

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function numberOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseGpx(xml: string): { name: string | null; points: TrackPoint[] } {
  const trackName = xml.match(/<trk\b[^>]*>[\s\S]*?<name>([^<]*)<\/name>/i);
  const anyName = xml.match(/<name>([^<]*)<\/name>/i);
  const name = decodeXml(trackName?.[1] ?? anyName?.[1] ?? '') || null;
  const points: TrackPoint[] = [];

  for (const match of xml.matchAll(POINT_PATTERN)) {
    const attrs = match[2] ?? '';
    const body = match[3] ?? '';
    const lat = numberOrNull(attrs.match(LAT_PATTERN)?.[1]);
    const lng = numberOrNull(attrs.match(LON_PATTERN)?.[1]);
    if (lat == null || lng == null) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    const ele = numberOrNull(body.match(ELE_PATTERN)?.[1] ?? undefined);
    points.push({ lat, lng, ele });
  }

  return { name, points };
}

function haversineMeters(a: TrackPoint, b: TrackPoint): number {
  const radius = 6371000;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Ignore bumps under 2 meters so a jittery GPS does not invent a climb. */
export function trackStats(points: TrackPoint[]): { distanceM: number; elevGainM: number } {
  let distanceM = 0;
  let elevGainM = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current) continue;
    distanceM += haversineMeters(previous, current);
    if (previous.ele == null || current.ele == null) continue;
    const climb = current.ele - previous.ele;
    if (climb >= 2) elevGainM += climb;
  }
  return { distanceM: Math.round(distanceM), elevGainM: Math.round(elevGainM) };
}

export function simplifyTrack<T>(points: T[], maxPoints: number): T[] {
  if (maxPoints < 2 || points.length <= maxPoints) return points;
  const last = points.length - 1;
  const step = last / (maxPoints - 1);
  const kept: T[] = [];
  for (let index = 0; index < maxPoints; index += 1) {
    const point = points[Math.min(last, Math.round(index * step))];
    if (point !== undefined && (kept.length === 0 || kept[kept.length - 1] !== point)) kept.push(point);
  }
  const end = points[last];
  if (end !== undefined && kept[kept.length - 1] !== end) kept.push(end);
  return kept;
}

export function lineWkt(points: TrackPoint[], maxPoints = 800): string | null {
  const simplified = simplifyTrack(points, maxPoints);
  if (simplified.length < 2) return null;
  const body = simplified.map((point) => `${point.lng} ${point.lat}`).join(',');
  return `SRID=4326;LINESTRING(${body})`;
}

/** Points kept for the map line. The full file is only used to measure distance and climb. */
export const PACKED_TRACK_POINTS = 800;

export type PackedTrack = {
  name: string | null;
  points: TrackPoint[];
  distanceM: number;
  elevGainM: number;
};

/**
 * A watch GPX is mostly XML and sensor tags. The save action only needs the
 * line and the totals, and the action body is capped at 1 MB.
 */
export function packTrack(xml: string): PackedTrack | null {
  const parsed = parseGpx(xml);
  if (parsed.points.length < 2) return null;
  const stats = trackStats(parsed.points);
  const name = parsed.name?.slice(0, 160) || null;
  return {
    name,
    points: simplifyTrack(parsed.points, PACKED_TRACK_POINTS),
    distanceM: stats.distanceM,
    elevGainM: stats.elevGainM,
  };
}

export function unpackTrack(raw: string): { track: PackedTrack | null; error: string | null } {
  if (!raw.trim()) return { track: null, error: null };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { track: null, error: 'That route could not be read.' };
  }
  if (!value || typeof value !== 'object') return { track: null, error: 'That route could not be read.' };
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.points) || record.points.length < 2 || record.points.length > PACKED_TRACK_POINTS) {
    return { track: null, error: 'That GPX file has no route in it.' };
  }
  const points: TrackPoint[] = [];
  for (const item of record.points) {
    if (!item || typeof item !== 'object') return { track: null, error: 'That route could not be read.' };
    const point = item as Record<string, unknown>;
    const lat = typeof point.lat === 'number' ? point.lat : Number.NaN;
    const lng = typeof point.lng === 'number' ? point.lng : Number.NaN;
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      return { track: null, error: 'That route could not be read.' };
    }
    let ele: number | null = null;
    if (point.ele != null) {
      if (typeof point.ele !== 'number' || !Number.isFinite(point.ele)) {
        return { track: null, error: 'That route could not be read.' };
      }
      ele = point.ele;
    }
    points.push({ lat, lng, ele });
  }
  const distanceM = typeof record.distanceM === 'number' ? Math.round(record.distanceM) : trackStats(points).distanceM;
  const elevGainM = typeof record.elevGainM === 'number' ? Math.round(record.elevGainM) : trackStats(points).elevGainM;
  if (!Number.isFinite(distanceM) || distanceM < 0 || distanceM > 2_000_000) {
    return { track: null, error: 'That route could not be read.' };
  }
  if (!Number.isFinite(elevGainM) || elevGainM < 0 || elevGainM > 100_000) {
    return { track: null, error: 'That route could not be read.' };
  }
  const name = typeof record.name === 'string' ? record.name.trim().slice(0, 160) || null : null;
  return { track: { name, points, distanceM, elevGainM }, error: null };
}

export function formatMiles(meters: number): string {
  const miles = meters / 1609.344;
  return `${miles.toFixed(miles >= 10 ? 0 : 1)} mi`;
}

export function formatFeetGain(meters: number): string {
  const feet = Math.round(meters * 3.28084);
  return `${feet.toLocaleString('en-US')} ft up`;
}
