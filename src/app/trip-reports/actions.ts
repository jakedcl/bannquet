'use server';

import { redirect } from 'next/navigation';
import { getViewer } from '@/app/sign-in/actions';
import { isActivity } from '@/lib/activities';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { parseGpx, type TrackPoint } from '@/lib/gpx';
import { isPinKind } from '@/lib/pin-kinds';
import { isLatLng } from '@/lib/photos';
import { addProfilePhotos, addProfileTrack, createPost, parseUploadedPhotos, type PreparedPhoto } from '@/lib/posts';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuidList(formData: FormData, name: string): string[] {
  return [...new Set(formData.getAll(name).filter((value): value is string => typeof value === 'string' && UUID_PATTERN.test(value)))];
}

function cleanPhotos(raw: string): { photos: PreparedPhoto[]; error: string | null } {
  return parseUploadedPhotos(raw);
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
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT };

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

  const pinTitle = String(formData.get('pinTitle') ?? '').trim();
  const latRaw = String(formData.get('pinLat') ?? '').trim();
  const lngRaw = String(formData.get('pinLng') ?? '').trim();
  const pinLat = Number(latRaw);
  const pinLng = Number(lngRaw);
  const pinKind = String(formData.get('pinKind') ?? 'other');
  let pin: { title: string; note: string; kind: string; lat: number; lng: number } | null = null;
  if (pinTitle) {
    if (pinTitle.length > 80) return { error: 'Keep the pin title short.' };
    if (!isPinKind(pinKind)) return { error: 'Pick a pin kind.' };
    if (!latRaw || !lngRaw || !isLatLng(pinLat, pinLng)) return { error: 'Drop the new pin on the map, or clear the pin title.' };
    pin = {
      title: pinTitle,
      note: String(formData.get('pinNote') ?? '').trim().slice(0, 500),
      kind: pinKind,
      lat: pinLat,
      lng: pinLng,
    };
  }

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
      pin,
      attachRouteIds: uuidList(formData, 'route'),
      attachPinIds: uuidList(formData, 'pin'),
      attachPhotoIds: uuidList(formData, 'photo'),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('already on a trip report')) return { error: message };
    return { error: 'Could not save that post. Try again in a minute.' };
  }
  redirect(`/posts/${id}`);
}

export async function publishProfileTrack(
  _prev: { error?: string; saved?: true } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: true; peaks?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: 'Sign in to add a route.' };
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT };
  const activity = String(formData.get('activity') ?? '');
  if (!isActivity(activity)) return { error: 'Pick what you were doing.' };
  const track = cleanTrack(String(formData.get('gpxText') ?? ''));
  if (track.error || !track.track) return { error: track.error ?? 'Choose a GPX file.' };
  try {
    await addProfileTrack({ userId: viewer.id, activity, track: track.track });
    return { saved: true };
  } catch {
    return { error: 'Could not save that route. Try again in a minute.' };
  }
}

export async function publishProfilePhotos(
  _prev: { error?: string; saved?: true } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: true }> {
  const viewer = await getViewer();
  if (!viewer) return { error: 'Sign in to add a photo.' };
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT };
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
