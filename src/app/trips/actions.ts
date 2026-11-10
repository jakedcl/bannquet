'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireContributor } from '@/lib/contributor';
import { findMemberByAuthId } from '@/lib/auth/members';
import { safeNextPath } from '@/lib/sign-in-next';
import { insertNotification } from '@/lib/notifications';
import { attachToTripBlockedMessage } from '@/lib/trip-join';
import {
  emailTripJoinApproved,
  emailTripJoinDeclined,
  emailTripJoinRequested,
} from '@/lib/trip-join-mail';
import { cleanTripFields } from '@/lib/trip-fields';
import {
  approveTripJoinRequest,
  attachItemToTrip,
  createTrip,
  declineTripJoinRequest,
  deleteTrip,
  detachItemFromTrip,
  getTripBrief,
  getTripMemberRsvp,
  leaveTrip,
  requestToJoinTrip,
  updateTrip,
} from '@/lib/trips';

async function contributor() {
  const who = await requireContributor();
  if (!who.ok) return { error: who.error, viewer: null };
  return { error: null, viewer: who.viewer };
}

export async function createTripAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const { error, viewer } = await contributor();
  if (!viewer) return { error: error ?? 'Sign in to add a trip.' };
  const parsed = cleanTripFields({ title: formData.get('title'), tripDate: formData.get('tripDate'), notes: formData.get('notes') });
  if ('error' in parsed) return { error: parsed.error };
  const { title, tripDate, notes } = parsed.fields;
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

/** The organizer or an admin. The organizer stays the same. */
export async function updateTripAction(
  _prev: { error?: string; saved?: true } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: true }> {
  const { error, viewer } = await contributor();
  if (!viewer) return { error: error ?? 'Sign in to edit a trip.' };
  const id = String(formData.get('id') ?? '');
  if (!UUID.test(id)) return { error: 'That trip is missing.' };
  const parsed = cleanTripFields({ title: formData.get('title'), tripDate: formData.get('tripDate'), notes: formData.get('notes') });
  if ('error' in parsed) return { error: parsed.error };
  const ok = await updateTrip({ id, ...parsed.fields, actor: { id: viewer.id, admin: viewer.role === 'admin' } });
  if (!ok) return { error: 'You can only edit your own trips.' };
  revalidatePath(`/trips/${id}`);
  revalidatePath('/trips');
  return { saved: true };
}

export async function requestTripJoinAction(formData: FormData): Promise<void> {
  const { viewer } = await contributor();
  if (!viewer) return;
  const tripId = String(formData.get('tripId') ?? '');
  if (!UUID.test(tripId)) return;
  const result = await requestToJoinTrip(tripId, viewer.id);
  if (result !== 'ok') {
    revalidatePath(`/trips/${tripId}`);
    return;
  }
  const brief = await getTripBrief(tripId);
  const requester = await findMemberByAuthId(viewer.id);
  const requesterName = requester?.displayName || requester?.handle || 'Someone';
  if (brief?.createdBy) {
    void insertNotification({
      userId: brief.createdBy,
      kind: 'trip_join_request',
      title: 'Trip join request',
      body: `${requesterName} requested to join ${brief.title}.`,
      href: `/trips/${tripId}`,
      tripId,
    }).catch(() => {});
    void emailTripJoinRequested({
      organizerId: brief.createdBy,
      requesterName,
      tripTitle: brief.title,
      tripId,
    }).catch(() => {});
  }
  revalidatePath(`/trips/${tripId}`);
}

export async function leaveTripAction(formData: FormData): Promise<void> {
  const { viewer } = await contributor();
  if (!viewer) return;
  const tripId = String(formData.get('tripId') ?? '');
  if (!UUID.test(tripId)) return;
  await leaveTrip(tripId, viewer.id);
  revalidatePath(`/trips/${tripId}`);
}

export async function approveTripJoinAction(formData: FormData): Promise<void> {
  const { viewer } = await contributor();
  if (!viewer) return;
  const tripId = String(formData.get('tripId') ?? '');
  const requesterId = String(formData.get('requesterId') ?? '');
  if (!UUID.test(tripId) || !requesterId) return;
  const result = await approveTripJoinRequest({
    tripId,
    requesterId,
    actor: { id: viewer.id, admin: viewer.role === 'admin' },
  });
  if (result !== 'ok') {
    revalidatePath(`/trips/${tripId}`);
    return;
  }
  const brief = await getTripBrief(tripId);
  if (brief) {
    void insertNotification({
      userId: requesterId,
      kind: 'trip_join_approved',
      title: 'Request approved',
      body: `You are going on ${brief.title}.`,
      href: `/trips/${tripId}`,
      tripId,
    }).catch(() => {});
    void emailTripJoinApproved({ requesterId, tripTitle: brief.title, tripId }).catch(() => {});
  }
  revalidatePath(`/trips/${tripId}`);
}

export async function declineTripJoinAction(formData: FormData): Promise<void> {
  const { viewer } = await contributor();
  if (!viewer) return;
  const tripId = String(formData.get('tripId') ?? '');
  const requesterId = String(formData.get('requesterId') ?? '');
  if (!UUID.test(tripId) || !requesterId) return;
  const result = await declineTripJoinRequest({
    tripId,
    requesterId,
    actor: { id: viewer.id, admin: viewer.role === 'admin' },
  });
  if (result !== 'ok') {
    revalidatePath(`/trips/${tripId}`);
    return;
  }
  const brief = await getTripBrief(tripId);
  if (brief) {
    void insertNotification({
      userId: requesterId,
      kind: 'trip_join_declined',
      title: 'Request declined',
      body: `Your request to join ${brief.title} was declined.`,
      href: `/trips/${tripId}`,
      tripId,
    }).catch(() => {});
    void emailTripJoinDeclined({ requesterId, tripTitle: brief.title, tripId }).catch(() => {});
  }
  revalidatePath(`/trips/${tripId}`);
}

export async function deleteTripAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const { error, viewer } = await contributor();
  if (!viewer) return { error: error ?? 'Sign in to delete a trip.' };
  const id = String(formData.get('id') ?? '');
  if (!UUID.test(id)) return { error: 'That trip is missing.' };
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
  if (result === 'not_member') {
    const membership = await getTripMemberRsvp(tripId, viewer.id);
    return { error: attachToTripBlockedMessage(membership) };
  }
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
  if (!ok) return { error: 'Only an admin or the person who attached it can remove that.' };
  revalidatePath(`/trips/${tripId}`);
  const back = safeNextPath(String(formData.get('returnTo') ?? ''));
  if (back) redirect(back);
  redirect(kind === 'route' ? `/routes/${entityId}` : kind === 'pin' ? `/pins/${entityId}` : `/photos/${entityId}`);
}
