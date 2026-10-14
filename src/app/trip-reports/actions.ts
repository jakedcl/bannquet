'use server';

import { redirect } from 'next/navigation';
import { getViewer } from '@/app/sign-in/actions';
import { isActivity } from '@/lib/activities';
import { parseGpx, type TrackPoint } from '@/lib/gpx';
import { isLatLng, isPublicBlobUrl } from '@/lib/photos';
import { addProfilePhotos, addProfileTrack, createPost, type PreparedPhoto } from '@/lib/posts';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;

function cleanPhotos(raw: string): { photos: PreparedPhoto[]; error: string | null } {
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : [];
  } catch {
    return { photos: [], error: 'Those photos did not come through. Try them again.' };
  }
  if (!Array.isArray(parsed)) return { photos: [], error: 'Those photos did not come through. Try them again.' };
  if (parsed.length > 12) return { photos: [], error: 'Keep it to 12 photos.' };

  const photos: PreparedPhoto[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const url = typeof record.url === 'string' ? record.url : '';
    if (!isPublicBlobUrl(url)) return { photos: [], error: 'One photo was not stored. Try it again.' };
    const lat = typeof record.lat === 'number' ? record.lat : null;
    const lng = typeof record.lng === 'number' ? record.lng : null;
    if (lat == null || lng == null || !isLatLng(lat, lng)) {
      return { photos: [], error: 'A photo has no location. Drop a pin on the map, or remove it.' };
    }
    const source = record.source === 'exif' || record.source === 'manual' ? record.source : 'manual';
    photos.push({
      url,
      width: typeof record.width === 'number' ? record.width : 0,
      height: typeof record.height === 'number' ? record.height : 0,
      lat,
      lng,
      source,
    });
  }
  return { photos, error: null };
}

function cleanTrack(raw: string): { track: { name: string | null; points: TrackPoint[] } | null; error: string | null } {
  if (!raw.trim()) return { track: null, error: null };
  const parsed = parseGpx(raw);
  if (parsed.points.length < 2) return { track: null, error: 'That GPX file has no route in it.' };
  return { track: parsed, error: null };
}

export async function publishPost(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: 'Sign in to post.' };

  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim().slice(0, 8000);
  const tripDate = String(formData.get('tripDate') ?? '').trim();
  const activity = String(formData.get('activity') ?? '');
  if (title.length < 1 || title.length > 120) return { error: 'Add a title. Keep it under 120 characters.' };
  if (!DATE_PATTERN.test(tripDate)) return { error: 'Pick the day you went.' };
  if (!isActivity(activity)) return { error: 'Pick what you were doing.' };

  const photos = cleanPhotos(String(formData.get('photos') ?? ''));
  if (photos.error) return { error: photos.error };
  const track = cleanTrack(String(formData.get('gpxText') ?? ''));
  if (track.error) return { error: track.error };

  const taggedUserIds = formData
    .getAll('friend')
    .filter((value): value is string => typeof value === 'string' && ID_PATTERN.test(value) && value !== viewer.id);

  let id = '';
  try {
    id = await createPost({
      authorId: viewer.id,
      authorName: viewer.displayName || viewer.handle || 'Friend',
      title,
      body,
      tripDate,
      activity,
      taggedUserIds,
      track: track.track,
      photos: photos.photos,
    });
  } catch {
    return { error: 'Could not save that post. Try again in a minute.' };
  }
  redirect(`/trip-reports/${id}`);
}

export async function publishProfileTrack(
  _prev: { error?: string; saved?: true } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: true }> {
  const viewer = await getViewer();
  if (!viewer) return { error: 'Sign in to add a route.' };
  const activity = String(formData.get('activity') ?? '');
  if (!isActivity(activity)) return { error: 'Pick what you were doing.' };
  const track = cleanTrack(String(formData.get('gpxText') ?? ''));
  if (track.error || !track.track) return { error: track.error ?? 'Choose a GPX file.' };
  try {
    await addProfileTrack({ userId: viewer.id, activity, track: track.track });
  } catch {
    return { error: 'Could not save that route. Try again in a minute.' };
  }
  return { saved: true };
}

export async function publishProfilePhotos(
  _prev: { error?: string; saved?: true } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: true }> {
  const viewer = await getViewer();
  if (!viewer) return { error: 'Sign in to add a photo.' };
  const photos = cleanPhotos(String(formData.get('photos') ?? ''));
  if (photos.error) return { error: photos.error };
  if (photos.photos.length === 0) return { error: 'Choose a photo.' };
  try {
    await addProfilePhotos({ userId: viewer.id, photos: photos.photos });
  } catch {
    return { error: 'Could not save those photos. Try again in a minute.' };
  }
  return { saved: true };
}
