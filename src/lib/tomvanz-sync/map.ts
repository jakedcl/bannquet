import type { Activity } from '@/lib/activities';
import { lineWkt, parseGpx, trackStats, type TrackPoint } from '@/lib/gpx';
import { fittedSize } from '@/lib/photos';

const ASSET_REF_PATTERN = /^image-([a-f0-9]+)-(\d+)x(\d+)-(\w+)$/;

export function parseSanityImageRef(ref: string | null | undefined): {
  hash: string;
  width: number;
  height: number;
  ext: string;
} | null {
  if (!ref) return null;
  const match = ASSET_REF_PATTERN.exec(ref);
  if (!match) return null;
  const width = Number(match[2]);
  const height = Number(match[3]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { hash: match[1]!, width, height, ext: match[4]! };
}

export function sanityCdnImageUrl(hash: string, width: number, height: number, ext: string): string {
  const fileExt = ext === 'jpg' ? 'jpg' : ext;
  return `https://cdn.sanity.io/images/lee2r8sa/production/${hash}-${width}x${height}.${fileExt}`;
}

export function sanityImageDownloadUrl(ref: string, maxEdge: number, quality: number): string | null {
  const parsed = parseSanityImageRef(ref);
  if (!parsed) return null;
  const base = sanityCdnImageUrl(parsed.hash, parsed.width, parsed.height, parsed.ext);
  const url = new URL(base);
  url.searchParams.set('w', String(maxEdge));
  url.searchParams.set('fit', 'max');
  url.searchParams.set('fm', 'jpg');
  url.searchParams.set('q', String(quality));
  return url.toString();
}

export function photoBlobPath(imageHash: string, thumb = false): string {
  return thumb ? `tomvanz-sync/images/${imageHash}-thumb.jpg` : `tomvanz-sync/images/${imageHash}.jpg`;
}

export function photoCaption(title: string | null | undefined, note: string | null | undefined): string | null {
  const trimmedTitle = title?.trim() ?? '';
  if (trimmedTitle) return trimmedTitle;
  const trimmedNote = note?.trim() ?? '';
  return trimmedNote || null;
}

export function photoAlt(title: string | null | undefined): string {
  const trimmed = title?.trim() ?? '';
  return trimmed || 'Photo';
}

export function mapSanityActivity(value: string | null | undefined): Activity | 'skip' {
  if (value === 'bike') return 'bike';
  if (value === 'hike') return 'hike';
  if (value === 'other' || !value) return 'skip';
  return 'skip';
}

export function routePointsFromSanity(coordinatesJson: string): TrackPoint[] {
  const pairs = JSON.parse(coordinatesJson) as unknown;
  if (!Array.isArray(pairs)) throw new Error('Route coordinates were not an array.');
  const points: TrackPoint[] = [];
  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    const lng = Number(pair[0]);
    const lat = Number(pair[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    points.push({ lat, lng, ele: null });
  }
  if (points.length < 2) throw new Error('Route needs at least two points.');
  return points;
}

export function trackLineWkt(points: TrackPoint[]): string | null {
  return lineWkt(points, Math.max(points.length, 2));
}

export function fittedRenditionSize(origW: number, origH: number): { width: number; height: number } {
  return fittedSize(origW, origH, 2000);
}

export function elevGainFromGpxXml(xml: string): number | null {
  const { points } = parseGpx(xml);
  if (!points.some((point) => point.ele != null)) return null;
  return trackStats(points).elevGainM;
}

export function movingSeconds(startedAt: string | null | undefined, endedAt: string | null | undefined): number | null {
  if (!startedAt || !endedAt) return null;
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(endedAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return null;
  return Math.round((endMs - startMs) / 1000);
}

export function isPublishedSanityId(id: string): boolean {
  return !id.startsWith('drafts.') && !id.startsWith('versions.');
}