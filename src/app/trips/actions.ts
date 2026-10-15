'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getViewer } from '@/app/sign-in/actions';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { redirectToSignIn } from '@/lib/sign-in-redirect';
import {
  addPackingItem,
  attachItemToTrip,
  claimPackingItem,
  createTrip,
  deletePackingItem,
  deleteTrip,
  detachItemFromTrip,
  linkPostToTrip,
  setPackingWeight,
  setTripGoing,
} from '@/lib/trips';

async function contributor() {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT, viewer: null };
  return { error: null, viewer };
}

export async function createTripAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const { error, viewer } = await contributor();
  if (!viewer) return { error: error ?? 'Sign in to add a trip.' };
  const title = String(formData.get('title') ?? '').trim();
  const tripDate = String(formData.get('tripDate') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim().slice(0, 4000);
  if (!title || title.length > 80) return { error: 'Give the trip a short name.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tripDate)) return { error: 'Pick a date.' };
  let id = '';
  try {
    id = await createTrip({
      userId: viewer.id,
      title,
      tripDate,
      notes,
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function itemKind(value: string): 'pin' | 'route' | 'photo' | null {
  if (value === 'pin' || value === 'route' || value === 'photo') return value;
  return null;
}

export async function attachToTripAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const { error, viewer } = await contributor();
  if (!viewer) return { error: error ?? 'Sign in to add that to a trip.' };
  const kind = itemKind(String(formData.get('kind') ?? ''));
  const entityId = String(formData.get('entityId') ?? '');
  const tripId = String(formData.get('tripId') ?? '');
  if (!kind || !UUID.test(entityId) || !UUID.test(tripId)) return { error: 'Pick a trip.' };
  const result = await attachItemToTrip({
    tripId,
    kind,
    entityId,
    actorId: viewer.id,
    admin: viewer.role === 'admin',
  });
  if (result === 'forbidden') return { error: 'You can only attach your own pins, routes, and photos.' };
  if (result === 'missing') return { error: 'That item is missing.' };
  revalidatePath(`/trips/${tripId}`);
  revalidatePath('/map');
  redirect(kind === 'route' ? `/routes/${entityId}` : kind === 'pin' ? `/pins/${entityId}` : `/photos/${entityId}`);
}

export async function detachFromTripAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const { error, viewer } = await contributor();
  if (!viewer) return { error: error ?? 'Sign in to remove that.' };
  const kind = itemKind(String(formData.get('kind') ?? ''));
  const entityId = String(formData.get('entityId') ?? '');
  const tripId = String(formData.get('tripId') ?? '');
  if (!kind || !UUID.test(entityId) || !UUID.test(tripId)) return { error: 'That item is missing.' };
  const ok = await detachItemFromTrip({
    tripId,
    kind,
    entityId,
    actorId: viewer.id,
    admin: viewer.role === 'admin',
  });
  if (!ok) return { error: 'You can only remove your own pins, routes, and photos.' };
  revalidatePath(`/trips/${tripId}`);
  redirect(kind === 'route' ? `/routes/${entityId}` : kind === 'pin' ? `/pins/${entityId}` : `/photos/${entityId}`);
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
