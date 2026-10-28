'use server';

import { redirect } from 'next/navigation';
import { getViewer } from '@/app/sign-in/actions';
import { isActivity } from '@/lib/activities';
import { suggestSummits } from '@/lib/challenges';
import { packTrack, unpackTrack, type PackedTrack } from '@/lib/gpx';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { redirectToSignIn } from '@/lib/sign-in-redirect';
import { addProfilePhotos, addProfileTrack, parseUploadedPhotos, type PreparedPhoto } from '@/lib/posts';
import { cleanRouteNotes, cleanRouteTitle, routeTitle } from '@/lib/route-title';
import { climbedPeakSlugs } from '@/lib/summits';
import type { DraftItem } from '@/lib/trip-draft';

type SummitSuggestion = { slug: string; name: string };

async function summitsOnTrack(userId: string, track: PackedTrack): Promise<SummitSuggestion[]> {
  try {
    const climbed = await climbedPeakSlugs(userId);
    return suggestSummits(track.points, climbed);
  } catch (err) {
    console.error('Summit suggestions did not load', err);
    return [];
  }
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

export async function publishProfileTrack(
  _prev: { error?: string; saved?: true; created?: DraftItem[]; suggestions?: SummitSuggestion[]; continueTo?: string } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: true; created?: DraftItem[]; suggestions?: SummitSuggestion[]; continueTo?: string }> {
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
  const suggestions = await summitsOnTrack(viewer.id, track.track);
  const next = String(formData.get('next') ?? '');
  const continueTo = next === 'existing'
    ? `/routes/${id}?addTrip=1`
    : next === 'new'
      ? `/upload?kind=trip&route=${id}`
      : undefined;
  if (formData.get('inline') === '1') return { created, suggestions };
  if (continueTo && suggestions.length === 0) redirect(continueTo);
  return { saved: true, created, suggestions, continueTo };
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
  let saved: Array<{ id: string; url: string; thumbUrl: string | null }> = [];
  try {
    saved = await addProfilePhotos({ userId: viewer.id, photos: photos.photos });
  } catch {
    return { error: 'Could not save those photos. Try again in a minute.' };
  }
  if (saved.length === 0) return { error: 'Choose a photo.' };
  const created: DraftItem[] = saved.map((photo) => ({
    kind: 'photo',
    id: photo.id,
    label: 'Photo',
    thumb: photo.thumbUrl ?? photo.url,
    photoUrl: photo.url,
    photoThumbUrl: photo.thumbUrl,
  }));
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
