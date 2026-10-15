'use server';

import { redirect } from 'next/navigation';
import { getViewer } from '@/app/sign-in/actions';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { redirectToSignIn } from '@/lib/sign-in-redirect';
import { isLatLng } from '@/lib/photos';
import { createPin, deletePin, updatePin } from '@/lib/pins';
import { isPinKind, type PinKind } from '@/lib/pin-kinds';
import { parseUploadedPhotos, type PreparedPhoto } from '@/lib/posts';

const PIN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function placedPoint(formData: FormData, photos: PreparedPhoto[]): { lat: number; lng: number } | null {
  const lat = Number(String(formData.get('lat') ?? '').trim());
  const lng = Number(String(formData.get('lng') ?? '').trim());
  if (isLatLng(lat, lng)) return { lat, lng };
  const photo = photos.find((item) => item.lat != null && item.lng != null && isLatLng(item.lat, item.lng));
  if (photo?.lat != null && photo.lng != null) return { lat: photo.lat, lng: photo.lng };
  return null;
}

type PinFields = {
  title: string;
  note: string;
  kind: PinKind;
  point: { lat: number; lng: number };
  photos: PreparedPhoto[];
};

function pinFields(formData: FormData): { error: string } | { fields: PinFields } {
  const title = String(formData.get('title') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim().slice(0, 2000);
  const kind = String(formData.get('kind') ?? '');
  if (title.length < 1 || title.length > 120) return { error: 'Add a title. Keep it under 120 characters.' };
  if (!isPinKind(kind)) return { error: 'Pick a category.' };
  const photos = parseUploadedPhotos(String(formData.get('photos') ?? ''), { requireLocation: false });
  if (photos.error) return { error: photos.error };
  const point = placedPoint(formData, photos.photos);
  if (!point) return { error: 'Drop the pin on the map, use your location, or add a photo that has one.' };
  return { fields: { title, note, kind, point, photos: photos.photos } };
}

async function contributor() {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT, viewer: null };
  return { error: null, viewer };
}

export async function createPinAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const who = await contributor();
  if (!who.viewer) return { error: who.error ?? 'Sign in to drop a pin.' };
  const parsed = pinFields(formData);
  if ('error' in parsed) return { error: parsed.error };
  let id = '';
  try {
    id = await createPin({
      userId: who.viewer.id,
      title: parsed.fields.title,
      note: parsed.fields.note,
      kind: parsed.fields.kind,
      lat: parsed.fields.point.lat,
      lng: parsed.fields.point.lng,
      photos: parsed.fields.photos,
    });
  } catch {
    return { error: 'Could not save that pin. Try again in a minute.' };
  }
  redirect(`/pins/${id}`);
}

export async function updatePinAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const who = await contributor();
  if (!who.viewer) return { error: who.error ?? 'Sign in to edit a pin.' };
  const id = String(formData.get('id') ?? '').trim();
  if (!PIN_ID.test(id)) return { error: 'That pin is missing.' };
  const parsed = pinFields(formData);
  if ('error' in parsed) return { error: parsed.error };
  const removePhotoIds = formData
    .getAll('removePhoto')
    .filter((value): value is string => typeof value === 'string' && PIN_ID.test(value));
  let saved = false;
  try {
    saved = await updatePin({
      id,
      userId: who.viewer.id,
      title: parsed.fields.title,
      note: parsed.fields.note,
      kind: parsed.fields.kind,
      lat: parsed.fields.point.lat,
      lng: parsed.fields.point.lng,
      photos: parsed.fields.photos,
      removePhotoIds,
    });
  } catch {
    return { error: 'Could not save that pin. Try again in a minute.' };
  }
  if (!saved) return { error: 'You can only edit your own pins.' };
  redirect(`/pins/${id}`);
}

export async function deletePinAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const who = await contributor();
  if (!who.viewer) return { error: who.error ?? 'Sign in to delete a pin.' };
  const id = String(formData.get('id') ?? '').trim();
  if (!PIN_ID.test(id)) return { error: 'That pin is missing.' };
  let removed = false;
  try {
    removed = await deletePin(id, { id: who.viewer.id, admin: who.viewer.role === 'admin' });
  } catch {
    return { error: 'Could not delete that pin. Try again in a minute.' };
  }
  if (!removed) return { error: 'You can only delete your own pins.' };
  redirect(who.viewer.handle ? `/user/${who.viewer.handle}` : '/');
}
