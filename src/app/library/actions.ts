'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getViewer } from '@/app/sign-in/actions';
import { deletePhoto, deleteRoute, updatePhotoCaption, updateRouteTitle } from '@/lib/library';
import { cleanRouteNotes, cleanRouteTitle } from '@/lib/route-title';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { safeNextPath } from '@/lib/sign-in-next';
import { redirectToSignIn } from '@/lib/sign-in-redirect';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safePath(value: FormData, fallback: string): string {
  return safeNextPath(String(value.get('returnTo') ?? '')) ?? fallback;
}

async function actor() {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT, viewer: null };
  return { error: null, viewer };
}

export async function updateRouteTitleAction(
  _prev: { error?: string; saved?: true } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: true }> {
  const who = await actor();
  if (!who.viewer) return { error: who.error ?? 'Sign in to edit a route.' };
  const id = String(formData.get('id') ?? '');
  if (!UUID.test(id)) return { error: 'That route is missing.' };
  const title = cleanRouteTitle(String(formData.get('title') ?? ''));
  const notes = cleanRouteNotes(String(formData.get('notes') ?? ''));
  const hideEnds = formData.get('hideEnds') === 'on';
  const ok = await updateRouteTitle(id, title, notes, who.viewer, hideEnds);
  if (!ok) return { error: 'You can only edit your own routes.' };
  revalidatePath(`/routes/${id}`);
  revalidatePath('/map');
  return { saved: true };
}

export async function updatePhotoCaptionAction(
  _prev: { error?: string; saved?: true } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: true }> {
  const who = await actor();
  if (!who.viewer) return { error: who.error ?? 'Sign in to edit a photo.' };
  const id = String(formData.get('id') ?? '');
  if (!UUID.test(id)) return { error: 'That photo is missing.' };
  const caption = String(formData.get('caption') ?? '').replace(/\s+/g, ' ').trim().slice(0, 200) || null;
  const ok = await updatePhotoCaption(id, caption, who.viewer);
  if (!ok) return { error: 'You can only edit your own photos.' };
  revalidatePath(`/photos/${id}`);
  revalidatePath('/photos');
  return { saved: true };
}

export async function deleteRouteAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const who = await actor();
  if (!who.viewer) return { error: who.error ?? 'Sign in to delete a route.' };
  const id = String(formData.get('id') ?? '');
  if (!UUID.test(id)) return { error: 'That route is missing.' };
  const ok = await deleteRoute(id, who.viewer);
  if (!ok) return { error: 'You can only delete your own routes.' };
  revalidatePath('/map');
  redirect(safePath(formData, who.viewer.handle ? `/user/${who.viewer.handle}` : '/'));
}

export async function deletePhotoAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const who = await actor();
  if (!who.viewer) return { error: who.error ?? 'Sign in to delete a photo.' };
  const id = String(formData.get('id') ?? '');
  if (!UUID.test(id)) return { error: 'That photo is missing.' };
  const ok = await deletePhoto(id, who.viewer);
  if (!ok) return { error: 'You can only delete your own photos.' };
  revalidatePath('/map');
  redirect(safePath(formData, who.viewer.handle ? `/user/${who.viewer.handle}` : '/'));
}

