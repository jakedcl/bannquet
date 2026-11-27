import {
  inPhotoLinkWindow,
  minDistanceToPolylineMeters,
  ROUTE_PHOTO_NEAR_METERS,
} from '@/lib/route-photo-link';

export type PhotoRouteMatchInput = {
  photoUserId: string | null;
  takenAt: string | null;
  lat: number | null;
  lng: number | null;
  trackUserId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  /** Full route coordinates for distance check (lng, lat). */
  line: Array<[number, number]>;
};

/** Same owner, time window, and within `ROUTE_PHOTO_NEAR_METERS` of the full line. */
export function photoMatchesRouteLink(input: PhotoRouteMatchInput): boolean {
  if (!input.photoUserId || !input.trackUserId || input.photoUserId !== input.trackUserId) return false;
  if (!input.takenAt || !input.startedAt || !input.endedAt) return false;
  if (input.lat == null || input.lng == null) return false;
  if (!inPhotoLinkWindow(input.takenAt, input.startedAt, input.endedAt)) return false;
  const dist = minDistanceToPolylineMeters(input.lat, input.lng, input.line);
  return dist <= ROUTE_PHOTO_NEAR_METERS;
}