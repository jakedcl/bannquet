'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getViewer } from '@/app/sign-in/actions';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { redirectToSignIn } from '@/lib/sign-in-redirect';
import {
  attachItemToTrip,
  createTrip,
  deleteTrip,
  detachItemFromTrip,
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
  const attachments = readAttachments(formData);
  let id = '';
  try {
    id = await createTrip({
      userId: viewer.id,
      title,
      tripDate,
      notes,
      attachments,
      admin: viewer.role === 'admin',
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
  if (!UUID.test(tripId)) return;
  await setTripGoing(tripId, viewer.id, going);
  revalidatePath(`/trips/${tripId}`);
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

function readAttachments(formData: FormData): Array<{ kind: 'pin' | 'route' | 'photo'; id: string }> {
  const out: Array<{ kind: 'pin' | 'route' | 'photo'; id: string }> = [];
  const seen = new Set<string>();
  for (const kind of ['pin', 'route', 'photo'] as const) {
    for (const value of formData.getAll(kind)) {
      if (typeof value !== 'string' || !UUID.test(value)) continue;
      const key = `${kind}:${value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ kind, id: value });
      if (out.length >= 40) return out;
    }
  }
  return out;
}

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
