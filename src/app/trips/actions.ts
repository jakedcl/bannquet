'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getViewer } from '@/app/sign-in/actions';
import { isActivity } from '@/lib/activities';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import {
  addPackingItem,
  claimPackingItem,
  createTrip,
  deletePackingItem,
  deleteTrip,
  linkPostToTrip,
  setPackingWeight,
  setTripGoing,
} from '@/lib/trips';

async function contributor() {
  const viewer = await getViewer();
  if (!viewer) return { error: 'Sign in to do that.', viewer: null };
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT, viewer: null };
  return { error: null, viewer };
}

export async function createTripAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const { error, viewer } = await contributor();
  if (!viewer) return { error: error ?? 'Sign in to plan a trip.' };
  const title = String(formData.get('title') ?? '').trim();
  const tripDate = String(formData.get('tripDate') ?? '').trim();
  const activity = String(formData.get('activity') ?? '');
  const trailheadName = String(formData.get('trailheadName') ?? '').trim().slice(0, 80);
  const lat = Number(formData.get('lat'));
  const lng = Number(formData.get('lng'));
  if (!title || title.length > 80) return { error: 'Give the trip a short name.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tripDate)) return { error: 'Pick a date.' };
  if (!isActivity(activity)) return { error: 'Pick what you are going to do.' };
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { error: 'Drop a pin for the trailhead.' };
  }
  let id = '';
  try {
    id = await createTrip({
      userId: viewer.id,
      title,
      tripDate,
      activity,
      trailheadName,
      lat,
      lng,
    });
  } catch {
    return { error: 'Could not save that trip. Try again in a minute.' };
  }
  redirect(`/trips/${id}`);
}

export async function toggleGoing(formData: FormData): Promise<void> {
  const { viewer } = await contributor();
  if (!viewer) return;
  const tripId = String(formData.get('tripId') ?? '');
  const going = String(formData.get('going') ?? '') === '1';
  if (!tripId) return;
  await setTripGoing(tripId, viewer.id, going);
  revalidatePath(`/trips/${tripId}`);
}

export async function toggleClaim(formData: FormData): Promise<void> {
  const { viewer } = await contributor();
  if (!viewer) return;
  const tripId = String(formData.get('tripId') ?? '');
  const itemId = String(formData.get('itemId') ?? '');
  if (!tripId || !itemId) return;
  await claimPackingItem(itemId, viewer.id);
  revalidatePath(`/trips/${tripId}`);
}

export async function saveWeight(formData: FormData): Promise<void> {
  const { viewer } = await contributor();
  if (!viewer) return;
  const tripId = String(formData.get('tripId') ?? '');
  const itemId = String(formData.get('itemId') ?? '');
  const raw = String(formData.get('ounces') ?? '').trim();
  if (!tripId || !itemId) return;
  if (raw === '') {
    await setPackingWeight(itemId, null);
  } else {
    const ounces = Number(raw);
    if (!Number.isFinite(ounces) || ounces < 0 || ounces > 500) return;
    await setPackingWeight(itemId, ounces);
  }
  revalidatePath(`/trips/${tripId}`);
}

export async function addItem(formData: FormData): Promise<void> {
  const { viewer } = await contributor();
  if (!viewer) return;
  const tripId = String(formData.get('tripId') ?? '');
  const label = String(formData.get('label') ?? '').trim().slice(0, 80);
  if (!tripId || !label) return;
  await addPackingItem(tripId, label, viewer.id);
  revalidatePath(`/trips/${tripId}`);
}

export async function deleteItem(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const { error, viewer } = await contributor();
  if (!viewer) return { error: error ?? 'Sign in to delete that.' };
  const tripId = String(formData.get('tripId') ?? '');
  const itemId = String(formData.get('itemId') ?? '');
  if (!tripId || !itemId) return { error: 'That item is missing.' };
  const ok = await deletePackingItem(itemId, { id: viewer.id, admin: viewer.role === 'admin' });
  if (!ok) return { error: 'You can only delete an item you added, or one on a trip you planned.' };
  revalidatePath(`/trips/${tripId}`);
  return {};
}

export async function deleteTripAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const { error, viewer } = await contributor();
  if (!viewer) return { error: error ?? 'Sign in to delete a trip.' };
  const id = String(formData.get('id') ?? '');
  if (!id) return { error: 'That trip is missing.' };
  const ok = await deleteTrip(id, { id: viewer.id, admin: viewer.role === 'admin' });
  if (!ok) return { error: 'You can only delete a trip you planned.' };
  revalidatePath('/trips');
  revalidatePath('/map');
  redirect('/trips');
}

export async function linkPost(formData: FormData): Promise<void> {
  const { viewer } = await contributor();
  if (!viewer) return;
  const tripId = String(formData.get('tripId') ?? '');
  const postId = String(formData.get('postId') ?? '');
  if (!tripId || !postId) return;
  await linkPostToTrip(tripId, postId, viewer.id);
  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/posts/${postId}`);
}
