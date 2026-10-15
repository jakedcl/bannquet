'use server';

import { redirect } from 'next/navigation';
import { getViewer } from '@/app/sign-in/actions';
import { isActivity, type Activity } from '@/lib/activities';
import { packTrack, unpackTrack, type PackedTrack } from '@/lib/gpx';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { redirectToSignIn } from '@/lib/sign-in-redirect';
import { isPinKind } from '@/lib/pin-kinds';
import { isLatLng } from '@/lib/photos';
import { isPostKind, type PostKind } from '@/lib/post-kinds';
import { addProfilePhotos, addProfileTrack, parseUploadedPhotos, type PreparedPhoto } from '@/lib/posts';
import { cleanRouteNotes, cleanRouteTitle, routeTitle } from '@/lib/route-title';
import type { DraftItem } from '@/lib/trip-draft';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuidList(formData: FormData, name: string): string[] {
  return [...new Set(formData.getAll(name).filter((value): value is string => typeof value === 'string' && UUID_PATTERN.test(value)))];
}

function cleanPhotos(raw: string, skipLocation = false): { photos: PreparedPhoto[]; error: string | null } {
  return parseUploadedPhotos(raw, { requireLocation: !skipLocation });
}

function readTrack(formData: FormData): { track: PackedTrack | null; error: string | null } {
  const packed = String(formData.get('trackJson') ?? '');
  if (packed.trim()) return unpackTrack(packed);
  const raw = String(formData.get('gpxText') ?? '').trim();
  if (!raw) return { track: null, error: null };
  const track = packTrack(raw);
  if (!track) return { track: null, error: 'That GPX file has no route in it.' };
  return { track, error: null };
}

function readPostFields(formData: FormData): {
  error?: string;
  fields?: {
    postKind: PostKind;
    title: string;
    body: string;
    tripDate: string | null;
    activity: Activity | null;
    photos: PreparedPhoto[];
    track: PackedTrack | null;
  };
} {
  const postKindRaw = String(formData.get('postKind') ?? 'trip_report');
  if (!isPostKind(postKindRaw)) return { error: 'Pick Trip or General.' };
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim().slice(0, 8000);
  if (title.length < 1 || title.length > 120) return { error: 'Add a title. Keep it under 120 characters.' };

  const photos = cleanPhotos(String(formData.get('photos') ?? ''), postKindRaw === 'general');
  if (photos.error) return { error: photos.error };

  if (postKindRaw === 'general') {
    return {
      fields: {
        postKind: postKindRaw,
        title,
        body,
        tripDate: null,
        activity: null,
        photos: photos.photos,
        track: null,
      },
    };
  }

  const tripDate = String(formData.get('tripDate') ?? '').trim();
  const activity = String(formData.get('activity') ?? '');
  if (!DATE_PATTERN.test(tripDate)) return { error: 'Pick the day you went.' };
  if (!isActivity(activity)) return { error: 'Pick what you were doing.' };
  const track = readTrack(formData);
  if (track.error) return { error: track.error };
  return {
    fields: {
      postKind: postKindRaw,
      title,
      body,
      tripDate,
      activity,
      photos: photos.photos,
      track: track.track,
    },
  };
}

export async function publishPost(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT };

  return { error: 'Write that on a trip instead.' };
}

export async function savePostEdits(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT };
  return { error: 'Write that on a trip instead.' };
}

export async function publishProfileTrack(
  _prev: { error?: string; saved?: true; created?: DraftItem[] } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: true; created?: DraftItem[] }> {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT };
  const activity = String(formData.get('activity') ?? '');
  if (!isActivity(activity)) return { error: 'Pick what you were doing.' };
  const track = readTrack(formData);
  if (track.error || !track.track) return { error: track.error ?? 'Choose a GPX file.' };
  const title = cleanRouteTitle(String(formData.get('title') ?? ''));
  const notes = cleanRouteNotes(String(formData.get('notes') ?? ''));
  let id = '';
  try {
    id = await addProfileTrack({ userId: viewer.id, activity, track: track.track, title, notes });
  } catch {
    return { error: 'Could not save that route. Try again in a minute.' };
  }
  const created: DraftItem[] = [{ kind: 'route', id, label: routeTitle(title), thumb: null }];
  if (formData.get('inline') === '1') return { created };
  const next = String(formData.get('next') ?? '');
  if (next === 'existing') redirect(`/routes/${id}?addTrip=1`);
  if (next === 'new') redirect(`/upload?kind=trip&route=${id}`);
  return { saved: true };
}

export async function publishProfilePhotos(
  _prev: { error?: string; saved?: true; created?: DraftItem[] } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: true; created?: DraftItem[] }> {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT };
  const photos = cleanPhotos(String(formData.get('photos') ?? ''));
  if (photos.error) return { error: photos.error };
  if (photos.photos.length === 0) return { error: 'Choose a photo.' };
  let saved: Array<{ id: string; url: string }> = [];
  try {
    saved = await addProfilePhotos({ userId: viewer.id, photos: photos.photos });
  } catch {
    return { error: 'Could not save those photos. Try again in a minute.' };
  }
  if (saved.length === 0) return { error: 'Choose a photo.' };
  const created: DraftItem[] = saved.map((photo) => ({ kind: 'photo', id: photo.id, label: 'Photo', thumb: photo.url }));
  if (formData.get('inline') === '1') return { created };
  const next = String(formData.get('next') ?? '');
  const first = saved[0];
  if (next === 'existing' && first) redirect(`/photos/${first.id}?addTrip=1`);
  if (next === 'new') {
    const params = new URLSearchParams({ kind: 'trip' });
    for (const photo of saved) params.append('photo', photo.id);
    redirect(`/upload?${params.toString()}`);
  }
  return { saved: true };
}
